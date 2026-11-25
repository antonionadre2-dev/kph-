import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { renderEmail, chf, safeUrl } from '../src/render.mjs';
import { demoData } from '../src/demo-data.mjs';
import { languages, labels } from '../src/labels.mjs';
import { emailArtwork } from '../src/artwork.mjs';
import { createHash } from 'node:crypto';

const catalogs = Object.fromEntries(await Promise.all(languages.map(async language => [
  language,
  JSON.parse(await readFile(new URL(`../content/catalog.${language}.json`, import.meta.url), 'utf8'))
])));
const ids = Object.keys(catalogs.de);
test('every email uses a different existing image, including its actual bytes', async () => {
  assert.deepEqual(Object.keys(emailArtwork).sort(), [...ids].sort());
  const hashes = new Set();
  for (const id of ids) {
    const name = emailArtwork[id].file;
    const bytes = await readFile(new URL(`../assets/${name}`, import.meta.url));
    assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `${id}: PNG image`);
    assert.ok(bytes.length > 1000, `${id}: complete artwork`);
    hashes.add(createHash('sha256').update(bytes).digest('hex'));
    const result = renderEmail(id, demoData(id), { catalogs });
    assert.ok(result.html.includes(`/assets/${name}`), `${id}: correct artwork in email`);
    assert.doesNotMatch(result.html, /kai-help\.png|kai-savings\.png|service-(windows|end|regular|deep|moving)\.jpg/);
  }
  assert.equal(hashes.size, 30, 'No renamed copies of the same image');
});
const previewOptions = { catalogs };
const productionOptions = {
  catalogs,
  mode: 'production',
  assetBaseUrl: 'https://assets.example.com/kraken-emails',
  brand: { privacyUrl: 'https://example.com/privacy' }
};

// Synthetic test fixture only. No network, real recipient or delivery adapter is used.
function productionFixture(id, language = 'de', service = 'end') {
  const data = demoData(id, language, service);
  data.event = { id: `fixture-event-${id}`, type: catalogs[language][id].event };
  data.links = {
    primary: `https://example.com/customer/${id}?token=fixture-only`,
    secondary: 'https://example.com/customer/help',
    unsubscribe: 'https://example.com/email/unsubscribe?token=fixture-only'
  };
  data.expiresAt = '2099-12-04T08:15:00Z';
  return data;
}
function live(id, data = productionFixture(id), options = {}) {
  return renderEmail(id, data, { ...productionOptions, ...options });
}

// This verifies actual generated output, including token coverage and translated modules.
test('all 180 preview emails render with complete personalised content', () => {
  assert.equal(ids.length, 30);
  assert.equal(languages.length, 6);
  for (const language of languages) {
    assert.deepEqual(Object.keys(catalogs[language]).sort(), [...ids].sort());
    for (const id of ids) {
      const data = demoData(id, language);
      const result = renderEmail(id, data, previewOptions);
      const context = `${language}/${id}`;
      assert.equal(result.preview, true, context);
      assert.equal(result.language, language, context);
      assert.equal(result.eventType, catalogs[language][id].event, context);
      assert.ok(result.subject.length > 0, context);
      assert.ok(result.preheader.length > 0, context);
      assert.match(result.html, new RegExp(`<html lang="${language}">`), context);
      assert.ok(result.html.includes('Laura'), context);
      assert.ok(result.text.includes('Laura'), context);
      assert.ok(result.html.includes('Seewadelstrasse 3'), context);
      assert.ok(result.html.includes('kai@krakenpfm.ch'), context);
      assert.ok(result.html.includes('+41 77 450 57 05'), context);
      assert.ok(result.html.includes('Properties &amp; Facilities'), context);
      assert.doesNotMatch(result.html + result.text + result.subject + result.preheader, /\{\{\w+\}\}|\[object Object\]|\bundefined\b|\bNaN\b/, context);
      assert.ok(Buffer.byteLength(result.html, 'utf8') < 90_000, `${context} HTML must remain compact enough for email`);
      assert.equal(result.html.includes('>Instagram</a>'), false, `${context}: no unconfigured Instagram link`);
    }
  }
});

test('all template and language combinations accept a fully configured synthetic production fixture', () => {
  for (const language of languages) {
    for (const id of ids) {
      const result = live(id, productionFixture(id, language));
      const context = `${language}/${id}`;
      assert.equal(result.preview, false, context);
      assert.equal(result.eventType, catalogs[language][id].event, context);
      assert.match(result.html, /https:\/\/assets\.example\.com\/kraken-emails\/kraken-logo\.png/, context);
      assert.match(result.html, /href="https:\/\/example\.com\/privacy"/, context);
      assert.doesNotMatch(result.html, /href="#preview-|src="\.\.\//, context);
      assert.doesNotMatch(result.subject, /[\r\n]/, context);
    }
  }
});

test('original fixtures are explicitly synthetic and stay unchanged during rendering', () => {
  for (const id of ids) {
    const data = demoData(id);
    const before = structuredClone(data);
    assert.equal(data.customer.email, 'laura@example.com');
    assert.equal(data.reference, 'KRA-DEMO-2048');
    assert.equal(data.event.type, 'DEMONSTRATION_ONLY');
    assert.ok(data.event.id.startsWith('DEMO-'));
    assert.ok(data.links.primary.startsWith('#preview-'));
    renderEmail(id, data, previewOptions);
    assert.deepEqual(data, before);
    assert.throws(() => live(id, data), /matching persisted server event/i);
  }
});

test('client names and notes are escaped in HTML while plaintext remains readable', () => {
  const data = demoData('booking_confirmed', 'en');
  data.customer.firstName = 'Laura <img src=x onerror="alert(1)"> & "Meier"';
  data.customerNote = 'Access <svg onload="alert(2)"> & door 4';
  const result = renderEmail('booking_confirmed', data, previewOptions);
  assert.ok(result.html.includes('Laura &lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; &quot;Meier&quot;'));
  assert.ok(result.html.includes('Access &lt;svg onload=&quot;alert(2)&quot;&gt; &amp; door 4'));
  assert.doesNotMatch(result.html, /<img src=x|<svg onload=/);
  assert.ok(result.text.includes(data.customer.firstName));
  assert.ok(result.text.includes(data.customerNote));
});

test('header injection is rejected before rendering customer email', () => {
  const data = demoData('quote_saved');
  data.customer.firstName = 'Laura\r\nBcc: unexpected@example.com';
  assert.throws(() => renderEmail('quote_saved', data, previewOptions), /Invalid first name/i);
  const altered = structuredClone(catalogs);
  altered.de.quote_saved.subject = 'Hello\r\nBcc: unexpected@example.com';
  assert.throws(() => renderEmail('quote_saved', demoData('quote_saved'), { catalogs: altered }), /Header injection/i);
});

test('production URLs reject executable, relative, insecure and credentialed destinations', () => {
  const invalid = [
    'javascript:alert(1)', 'data:text/html,<script>alert(1)</script>',
    'http://example.com/pay', '//example.com/pay', '../pay', '#preview-action',
    'https://user:password@example.com/pay', 'https://example.com/pay\r\nX-Test: value'
  ];
  for (const value of invalid) {
    assert.throws(() => safeUrl(value), /URL|protocol/i, value);
    const data = productionFixture('booking_confirmed');
    data.links.primary = value;
    assert.throws(() => live('booking_confirmed', data), /URL|protocol/i, value);
  }
  assert.equal(safeUrl('https://example.com/pay?token=fixture-only'), 'https://example.com/pay?token=fixture-only');
  assert.equal(safeUrl('mailto:kai@krakenpfm.ch', { allowMail: true }), 'mailto:kai@krakenpfm.ch');
  assert.equal(safeUrl('tel:+41774505705', { allowMail: true }), 'tel:+41774505705');
  assert.throws(() => safeUrl('mailto:kai@krakenpfm.ch'), /protocol/i);
});

test('production requires HTTPS assets, a privacy URL, a valid recipient and a matching persisted event', () => {
  assert.throws(() => live('quote_saved', productionFixture('quote_saved'), { assetBaseUrl: '../assets' }), /HTTPS/i);
  assert.throws(() => live('quote_saved', productionFixture('quote_saved'), { brand: { privacyUrl: null } }), /privacy/i);
  for (const malformed of ['not-an-email', 'laura@example.com\nBcc:test@example.com']) {
    const data = productionFixture('quote_saved');
    data.customer.email = malformed;
    assert.throws(() => live('quote_saved', data), /recipient/i);
  }
  const missingEvent = productionFixture('quote_saved');
  delete missingEvent.event;
  assert.throws(() => live('quote_saved', missingEvent), /persisted server event/i);
  const wrongEvent = productionFixture('deposit_received');
  wrongEvent.event.type = catalogs.de.booking_confirmed.event;
  assert.throws(() => live('deposit_received', wrongEvent), /persisted server event/i);
});

test('consented follow-ups require consent and an unsubscribe link, with one-click headers', () => {
  for (const id of ['quote_reminder_1', 'quote_reminder_2', 'review_requested']) {
    const kind = catalogs.de[id].kind;
    const data = productionFixture(id);
    data.consent[kind] = false;
    assert.throws(() => live(id, data), /consent/i);
    data.consent[kind] = true;
    delete data.links.unsubscribe;
    assert.throws(() => live(id, data), /unsubscribe/i);
    data.links.unsubscribe = 'https://example.com/email/unsubscribe?token=fixture-only';
    const result = live(id, data);
    assert.equal(result.headers['List-Unsubscribe'], '<https://example.com/email/unsubscribe?token=fixture-only>');
    assert.equal(result.headers['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click');
    assert.ok(result.html.includes(labels.de.unsubscribe));
  }
  const receipt = live('payment_received');
  assert.equal(receipt.headers['List-Unsubscribe'], undefined);
  assert.equal(receipt.headers['List-Unsubscribe-Post'], undefined);
});

test('a preferred date cannot masquerade as a confirmed appointment', () => {
  for (const id of ['booking_confirmed','booking_updated','appointment_reminder','team_on_the_way','recurring_visit']) {
    const data = productionFixture(id);
    data.appointment.status = 'requested';
    assert.throws(() => live(id, data), /confirmed appointment/i, id);
  }
  const proposed = productionFixture('reschedule_proposed');
  proposed.appointment.status = 'confirmed';
  assert.throws(() => live('reschedule_proposed', proposed), /proposed appointment/i);
  const request = productionFixture('request_received');
  request.appointment.status = 'confirmed';
  assert.throws(() => live('request_received', request), /confirmation template/i);
});

test('receipts are emitted only for settled payments and consistent deposit/full balances', () => {
  for (const id of ['deposit_received','payment_received']) {
    for (const status of ['unpaid','pending','failed','refund_accepted']) {
      const data = productionFixture(id);
      data.paymentStatus = status;
      assert.throws(() => live(id, data), /settled payment/i, `${id}/${status}`);
    }
  }
  const deposit = productionFixture('deposit_received');
  deposit.pricing.paidRappen = deposit.pricing.totalRappen;
  assert.throws(() => live('deposit_received', deposit), /deposit snapshot/i);
  const full = productionFixture('payment_received');
  full.pricing.paidRappen -= 100;
  assert.throws(() => live('payment_received', full), /fully paid snapshot/i);
  for (const id of ['deposit_received','payment_received']) {
    const data = productionFixture(id);
    delete data.pricing;
    assert.throws(() => live(id, data), /financial snapshot/i);
  }
});

test('pending, failed and refunded messages require their matching verified status', () => {
  for (const id of ['payment_pending','payment_failed','refund_issued']) {
    const data = productionFixture(id);
    data.paymentStatus = 'unpaid';
    assert.throws(() => live(id, data), /verified|refund/i);
  }
  const refund = productionFixture('refund_issued');
  refund.pricing.refundRappen = 0;
  assert.throws(() => live('refund_issued', refund), /refund/i);
});

test('money is rendered from integer rappen without losing cents or subtracting VAT twice', () => {
  assert.equal(chf(56000, 'de'), 'CHF 560.00');
  assert.equal(chf(8400, 'de'), 'CHF 84.00');
  assert.equal(chf(1, 'de'), 'CHF 0.01');
  assert.equal(chf(8400, 'es'), 'CHF 84,00');
  for (const bad of [-1, 1.1, NaN, Infinity, '8400', Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => chf(bad), /integer rappen/i);
  }
  const deposit = live('deposit_received', productionFixture('deposit_received', 'en'));
  assert.match(deposit.text, /Total: CHF 560\.00/);
  assert.match(deposit.text, /This payment: CHF 84\.00/);
  assert.match(deposit.text, /Paid so far: CHF 84\.00/);
  assert.match(deposit.text, /Remaining balance: CHF 476\.00/);
  assert.match(deposit.text, /VAT — not VAT registered: CHF 0\.00/);
  const fullData = productionFixture('payment_received', 'en');
  fullData.pricing.transactionRappen = 47600; // Final payment after the earlier CHF 84 deposit.
  const full = live('payment_received', fullData);
  assert.match(full.text, /This payment: CHF 476\.00/);
  assert.match(full.text, /Paid so far: CHF 560\.00/);
  assert.match(full.text, /Remaining balance: CHF 0\.00/);
  const quote = live('quote_ready');
  assert.match(quote.html, /CHF 45\.36/); // Hypothetical 8.1% on the same CHF 560 net base.
  assert.match(quote.html, /CHF 560\.00/);
  assert.doesNotMatch(quote.html, /CHF 514\.64/);
});

test('financial snapshots reject negative money, overpayment, other currencies and unsupported VAT status', () => {
  for (const change of [
    { totalRappen: -1 }, { paidRappen: 56001 }, { currency: 'EUR' }, { vatRappen: 1 },
    { transactionRappen: 0.1 }, { refundRappen: -1 }
  ]) {
    const data = productionFixture('deposit_received');
    Object.assign(data.pricing, change);
    assert.throws(() => live('deposit_received', data), /rappen|Overpayment|CHF|VAT/i);
  }
  assert.throws(() => live('deposit_received', productionFixture('deposit_received'), {
    brand: { privacyUrl: 'https://example.com/privacy', vatStatus: 'registered' }
  }), /VAT/i);
});

test('service-sensitive content uses relevant preparation, room details and moving routes', () => {
  const windows = renderEmail('appointment_reminder', demoData('appointment_reminder','es','windows'), previewOptions);
  assert.ok(windows.html.includes('Limpieza de ventanas'));
  assert.equal(windows.text.includes('Habitaciones:'), false);
  const moving = renderEmail('moving_guide', demoData('moving_guide','en'), previewOptions);
  assert.ok(moving.text.includes('Winterthur → Schaffhausen'));
  assert.equal(moving.text.includes('Rooms:'), false);
  assert.throws(() => renderEmail('moving_guide', { ...demoData('moving_guide'), service: 'windows' }, previewOptions), /relevant service/i);
  assert.throws(() => renderEmail('recurring_visit', { ...demoData('recurring_visit'), service: 'end' }, previewOptions), /regular cleaning/i);
});

test('appointment times use Zurich local time in winter and summer', () => {
  for (const start of ['2026-12-04T08:00:00Z','2026-07-04T07:00:00Z']) {
    const data = productionFixture('booking_confirmed','en');
    data.appointment.start = start;
    const result = live('booking_confirmed', data);
    assert.match(result.text, /09:00/);
    assert.doesNotMatch(result.text, /08:00|07:00/);
  }
});

test('staff-specific messages require real questions, an answer or a completed resolution', () => {
  for (const [id, field, expected] of [
    ['details_required', 'openQuestions', /missing information/i],
    ['support_reply', 'staffReply', /staff reply/i],
    ['issue_resolved', 'resolution', /completed resolution/i],
    ['magic_link', 'expiresAt', /login expiry/i]
  ]) {
    const data = productionFixture(id);
    delete data[field];
    assert.throws(() => live(id, data), expected);
  }
});

// Privacy regression: authentication emails should carry only authentication context.
test('account access omits unrelated home and billing details', () => {
  const data = productionFixture('magic_link', 'en');
  data.rooms = 'ROOM-PRIVATE-SENTINEL';
  data.areaM2 = 'AREA-PRIVATE-SENTINEL';
  data.address = 'ADDRESS-PRIVATE-SENTINEL';
  data.customerNote = 'NOTE-PRIVATE-SENTINEL';
  const result = live('magic_link', data);
  assert.doesNotMatch(result.html + result.text, /ROOM-PRIVATE-SENTINEL|AREA-PRIVATE-SENTINEL|ADDRESS-PRIVATE-SENTINEL|NOTE-PRIVATE-SENTINEL/);
  assert.equal(result.text.includes('Total: CHF'), false);
  assert.equal(result.text.includes('Paid so far:'), false);
});

test('receipts reject transactions larger than the payments actually recorded', () => {
  for (const id of ['deposit_received','payment_received']) {
    const data = productionFixture(id);
    data.pricing.transactionRappen = data.pricing.paidRappen + 1;
    assert.throws(() => live(id, data), /snapshot|transaction|payment/i, id);
  }
});

test('rendered authentication expiry and requested payment are explicit to the client', () => {
  const access = live('magic_link', productionFixture('magic_link','en'));
  assert.match(access.text, /Valid until: 4 December 2099 · 09:15/);
  assert.ok(access.html.includes('4 December 2099'));
  const payment = live('payment_requested', productionFixture('payment_requested','en'));
  assert.ok(payment.text.includes(`${labels.en.requestedPayment}: CHF 84.00`));
  assert.match(payment.text, /Total: CHF 560\.00/);
});

test('the actual questions, reply and resolution appear in both HTML and plaintext', () => {
  for (const [id, field, value] of [
    ['details_required','openQuestions',['Which doorbell should we use?']],
    ['support_reply','staffReply','Your access instructions are now saved.'],
    ['issue_resolved','resolution','The agreed follow-up cleaning is complete.']
  ]) {
    const data = productionFixture(id,'en');
    data[field] = value;
    const result = live(id,data);
    const expected = Array.isArray(value) ? value[0] : value;
    assert.ok(result.html.includes(expected), `${id}: HTML`);
    assert.ok(result.text.includes(expected), `${id}: plaintext`);
  }
});

test('completed, cancelled and approved-quote messages cannot assert an earlier status', () => {
  for (const id of ['service_completed','review_requested']) {
    const data = productionFixture(id);
    data.appointment.status = 'confirmed';
    assert.throws(() => live(id,data), /completed service/i);
  }
  const cancelled = productionFixture('cancellation_confirmed');
  cancelled.appointment.status = 'requested';
  assert.throws(() => live('cancellation_confirmed',cancelled), /cancellation/i);
  const quote = productionFixture('quote_ready');
  quote.quoteApproved = false;
  assert.throws(() => live('quote_ready',quote), /approved quote/i);
  const balance = productionFixture('balance_due');
  balance.pricing.paidRappen = balance.pricing.totalRappen;
  assert.throws(() => live('balance_due',balance), /outstanding balance/i);
});
