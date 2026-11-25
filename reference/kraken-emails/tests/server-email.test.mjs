import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { prepareServerEmail } from '../src/server-email.mjs';
import { demoData } from '../src/demo-data.mjs';
import { languages, labels } from '../src/labels.mjs';

const catalogs = Object.fromEntries(await Promise.all(languages.map(async language => [
  language, JSON.parse(await readFile(new URL(`../content/catalog.${language}.json`, import.meta.url), 'utf8'))
])));
const options = {
  catalogs,
  brand: { name: 'Kraken PFM', email: 'team@example.com', replyToEmail: 'help@example.com', privacyUrl: 'https://example.com/privacy' },
  assetBaseUrl: 'https://assets.example.com/kraken'
};

// Synthetic test records only. The adapter has no transport or database client.
function request(templateId = 'booking_confirmed', language = 'es') {
  const renderData = demoData(templateId, language);
  renderData.customer.id = 'customer-fixture-1';
  renderData.event = { id: `event-fixture-${templateId}`, type: catalogs[language][templateId].event };
  return {
    templateId,
    notificationSnapshot: {
      id: `notification-fixture-${templateId}`,
      eventId: renderData.event.id,
      eventType: renderData.event.type,
      entityId: 'booking-fixture-1',
      recipientIdentity: renderData.customer.id,
      recipientEmail: renderData.customer.email,
      templateId,
      templateRevision: '1.2.0',
      languageSnapshot: { language, source: 'selected', version: 1 },
      renderData
    },
    links: {
      primary: `https://example.com/customer/booking?lang=${language}&token=fixture-only&signature=unchanged`,
      secondary: `https://example.com/customer/help?lang=${language}`,
      unsubscribe: 'https://example.com/unsubscribe?token=fixture-only'
    }
  };
}

test('server adapter uses the saved selection in all six languages, with the configured sender', () => {
  for (const language of languages) {
    const input = request('booking_confirmed', language);
    input.notificationSnapshot.renderData.language = language === 'de' ? 'es' : 'de';
    const result = prepareServerEmail(input, options);
    assert.equal(result.language, language);
    assert.equal(result.headers['Content-Language'], language);
    assert.match(result.html, new RegExp(`<html lang="${language}">`));
    assert.ok(result.text.includes(`${labels[language].hello} Laura,`));
    assert.equal(result.to, 'laura@example.com');
    assert.deepEqual(result.from, { name: 'Kraken PFM', email: 'team@example.com' });
    assert.equal(result.replyTo, 'help@example.com');
    assert.doesNotMatch(result.html, /#preview-|VORSCHAU · BEISPIELDATEN|data:image/);
  }
});

test('a payment notification does not obtain its language from a later browser or webhook value', () => {
  const input = request('payment_received', 'pt');
  input.notificationSnapshot.renderData.language = 'not-a-supported-browser-value';
  const result = prepareServerEmail(input, options);
  assert.equal(result.language, 'pt');
  assert.ok(result.html.includes('Obrigado'));
  assert.equal(result.notificationId, input.notificationSnapshot.id);
});

test('missing or corrupted persisted language fails instead of silently sending German', () => {
  assert.throws(() => prepareServerEmail(), /notificationSnapshot/);
  const input = request();
  delete input.notificationSnapshot.languageSnapshot;
  assert.throws(() => prepareServerEmail(input, options), /snapshot/);
  input.notificationSnapshot.languageSnapshot = { language: 'xx', source: 'selected', version: 1 };
  assert.throws(() => prepareServerEmail(input, options), /supported language/);
  input.notificationSnapshot.languageSnapshot = { language: 'es', source: 'untrusted-webhook', version: 1 };
  assert.throws(() => prepareServerEmail(input, options), /persisted version-1/);
});

test('conflicting recipients, event or entity identifiers cannot be silently overwritten', () => {
  const cases = [
    input => { input.notificationSnapshot.renderData.customer.email = 'someone-else@example.com'; },
    input => { input.notificationSnapshot.renderData.customer.id = 'other-person'; },
    input => { input.notificationSnapshot.renderData.customerId = 'other-person'; },
    input => { input.notificationSnapshot.renderData.event.id = 'other-event'; },
    input => { input.notificationSnapshot.renderData.event.type = 'other.event'; },
    input => { input.notificationSnapshot.renderData.entityId = 'other-booking'; },
    input => { input.notificationSnapshot.renderData.templateId = 'payment_received'; },
    input => { input.templateId = 'payment_received'; },
    input => { input.notificationSnapshot.emailLanguage = 'fr'; }
  ];
  for (const alter of cases) {
    const input = request(); alter(input);
    assert.throws(() => prepareServerEmail(input, options), /conflicts/);
  }
});

test('idempotency identifies the persisted notification, independently of language and template revision', () => {
  const first = request('booking_confirmed', 'es');
  const changed = request('booking_confirmed', 'fr');
  changed.notificationSnapshot.templateRevision = '2.0.0';
  const a = prepareServerEmail(first, options);
  const b = prepareServerEmail(changed, options);
  assert.equal(a.idempotencyKey, b.idempotencyKey);
  assert.notEqual(a.language, b.language);
  assert.notEqual(a.subject, b.subject);
  assert.notEqual(a.templateRevision, b.templateRevision);
  changed.notificationSnapshot.id = 'notification-fixture-new';
  assert.notEqual(a.idempotencyKey, prepareServerEmail(changed, options).idempotencyKey);
});

test('fresh links replace old preview links without rewriting a signature or mutating the source record', () => {
  const input = request();
  input.links.primary += `&signedPayload=${'a'.repeat(600)}`;
  const before = structuredClone(input);
  const result = prepareServerEmail(input, options);
  assert.ok(result.html.includes('token=fixture-only&amp;signature=unchanged'));
  assert.ok(result.text.includes(input.links.primary));
  assert.deepEqual(input, before);
  delete input.links;
  assert.throws(() => prepareServerEmail(input, options), /links/);
});

test('server adapter preserves production payment, booking and reminder-consent gates', () => {
  const payment = request('payment_received');
  payment.notificationSnapshot.renderData.paymentStatus = 'pending';
  assert.throws(() => prepareServerEmail(payment, options), /settled payment/);
  const booking = request('booking_confirmed');
  booking.notificationSnapshot.renderData.appointment.status = 'requested';
  assert.throws(() => prepareServerEmail(booking, options), /confirmed appointment/);
  const reminder = request('quote_reminder_1');
  reminder.notificationSnapshot.renderData.consent.reminder_consented = false;
  assert.throws(() => prepareServerEmail(reminder, options), /consent/);
});

test('sender and notification identity reject header injection and accidental recipient lists', () => {
  const input = request();
  for (const id of ['', 'notification\r\nBcc:test@example.com', 'notification/with/slashes']) {
    input.notificationSnapshot.id = id;
    assert.throws(() => prepareServerEmail(input, options), /notificationSnapshot.id/);
  }
  for (const email of ['one@example.com,two@example.com', 'bad\nBcc:x@example.com']) {
    const copy = request(); copy.notificationSnapshot.recipientEmail = email;
    assert.throws(() => prepareServerEmail(copy, options), /recipientEmail/);
  }
  assert.throws(() => prepareServerEmail(request(), { ...options, brand: { ...options.brand, name: 'Kraken\r\nBcc: test@example.com' } }), /brand.name/);
  assert.throws(() => prepareServerEmail(request(), { ...options, brand: { privacyUrl: 'https://example.com/privacy' } }), /brand.name/);
});
