import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Jimp } from 'jimp';
import {
  catalogs, TEMPLATE_REVISION, emailLanguages, emailArtwork, labels,
  brandForLanguage, prepareCollectionEnvelope, snapshotEmailLanguage,
} from '../integrations/email-collection/index.mjs';
// Fictional fixtures are deliberately test-only; live modules never import them.
import { demoData } from '../reference/kraken-emails/src/demo-data.mjs';

const origin = 'https://kraken.example';
const ids = Object.keys(catalogs.de);
function fixture(templateId = 'quote_saved', language = 'es', service = 'end') {
  const renderData = demoData(templateId, language, service);
  const eventId = `synthetic-event-${templateId}`;
  const recipientIdentity = 'synthetic-contact-1';
  renderData.customer = { ...renderData.customer, id: recipientIdentity, email: 'client@example.test' };
  renderData.event = { id: eventId, type: catalogs[language][templateId].event };
  delete renderData.links;
  const notification = {
    id: `synthetic-notification-${templateId}`,
    eventId, eventType: catalogs[language][templateId].event,
    entityId: 'synthetic-booking-1', recipientIdentity,
    recipientEmail: renderData.customer.email,
    templateId, templateRevision: TEMPLATE_REVISION,
    languageSnapshot: snapshotEmailLanguage({ selectedLanguage: language }),
    renderData,
  };
  const links = {
    primary: `${origin}/quote?booking=synthetic-booking-1&lang=${language}#access=synthetic-access-token`,
    secondary: `${origin}/kontakt?lang=${language}`,
    unsubscribe: `${origin}/recovery/unsubscribe?draft=synthetic-draft-1&lang=${language}#token=synthetic-unsubscribe-token`,
  };
  return { notification, links };
}

test('all 180 production messages retain their catalog, illustration, signature and complete footer', () => {
  assert.equal(ids.length, 30);
  for (const language of emailLanguages) {
    assert.deepEqual(Object.keys(catalogs[language]), ids);
    for (const id of ids) {
      const { notification, links } = fixture(id, language);
      const email = prepareCollectionEnvelope(notification, links, origin);
      assert.equal(email.language, language);
      assert.equal(email.to, 'client@example.test');
      assert.deepEqual(email.from, { name: 'Kraken PFM', email: 'kai@krakenpfm.ch' });
      assert.equal(email.replyTo, 'kai@krakenpfm.ch');
      assert.equal(email.headers['Content-Language'], language);
      assert.equal(email.idempotencyKey, `kraken-email:${notification.id}`);
      assert.match(email.html, new RegExp(`<html lang="${language}">`));
      assert.ok(email.html.includes(`${origin}/kraken-emails/assets/${emailArtwork[id].file}`));
      assert.ok(email.html.includes('/kraken-emails/assets/kraken-logo.png'));
      assert.ok(email.html.includes(catalogs[language][id].signature.replaceAll('&', '&amp;')));
      assert.ok(email.text.includes(catalogs[language][id].signature));
      assert.ok(email.html.includes(`${origin}/gdpr?lang=${language}`));
      assert.ok(email.text.includes(`${origin}/gdpr?lang=${language}`));
      assert.ok(email.text.includes('Seewadelstrasse 3'));
      assert.ok(email.text.includes(labels[language].hours));
      assert.ok(email.text.includes(labels[language].timezone));
      assert.match(email.html, /mailto:kai@krakenpfm\.ch/);
      assert.match(email.html, /tel:\+41774505705/);
      const consented = ['reminder_consented', 'feedback_consented'].includes(catalogs[language][id].kind);
      assert.ok(email.text.includes(consented ? labels[language].reasonMarketing : ['quote_saved', 'magic_link', 'moving_guide'].includes(id) ? labels[language].reasonRequested : labels[language].reasonTransaction));
      assert.equal(email.headers['List-Unsubscribe-Post'], undefined);
      if (consented) assert.equal(email.headers['List-Unsubscribe'], `<${links.unsubscribe}>`);
      assert.doesNotMatch(email.subject + email.html + email.text, /\{\{\w+\}\}|\[object Object\]|#preview|BEISPIELDATEN|DATOS DE EJEMPLO|\uFFFD/);
      assert.ok(Buffer.byteLength(email.html) < 102_400, `${id}/${language} exceeds Gmail clipping threshold`);
    }
  }
});

test('email-only saved quotes omit unknown names and locations in six languages', () => {
  for (const language of emailLanguages) {
    for (const id of ['quote_saved', 'quote_reminder_1', 'quote_reminder_2']) {
      const { notification, links } = fixture(id, language);
      delete notification.renderData.customer.firstName;
      delete notification.renderData.customer.lastName;
      delete notification.renderData.city;
      const email = prepareCollectionEnvelope(notification, links, origin);
      assert.ok(email.text.startsWith({de:'Guten Tag,',en:'Hello,',es:'Hola,',fr:'Bonjour,',it:'Buongiorno,',pt:'Olá,'}[language]));
      assert.doesNotMatch(email.subject + email.html + email.text, /Laura|Meier|\b(?:undefined|null)\b|\{\{firstName\}\}|\{\{city\}\}/);
      assert.ok(!email.subject.includes('client@example.test'));
      assert.ok(!email.html.includes('in undefined'));
    }
  }
});

test('Spanish collection uses the approved formal voice and service name', () => {
  const copy = JSON.stringify(catalogs.es) + JSON.stringify(labels.es);
  assert.doesNotMatch(copy, /\b(tú|tu|tus|ti|te|contigo|puedes|tienes|quieres|prefieres|recibirás|tendrás|ayudarte|hacerte|coméntanoslo|cuente bancaria)\b/i);
  const { notification, links } = fixture('booking_confirmed', 'es');
  const email = prepareCollectionEnvelope(notification, links, origin);
  assert.match(email.text, /Limpieza de fin de alquiler/);
  assert.match(email.text, /Su cita/);
  assert.doesNotMatch(email.text, /fin de contrato/);
});

test('stored language wins over later render data and regional input is normalized', () => {
  const { notification, links } = fixture('deposit_received', 'es');
  notification.languageSnapshot = snapshotEmailLanguage({ selectedLanguage: 'es-ES' });
  notification.renderData.language = 'de';
  const email = prepareCollectionEnvelope(notification, links, origin);
  assert.equal(email.language, 'es');
  assert.match(email.subject, /Pago recibido/);
  assert.ok(email.text.includes(links.primary));
  for (const invalid of [undefined, null, { language: 'es', source: 'selected', version: 2 }, { language: 'nl', source: 'selected', version: 1 }]) {
    assert.throws(() => prepareCollectionEnvelope({ ...notification, languageSnapshot: invalid }, links, origin));
  }
  assert.throws(() => prepareCollectionEnvelope({ ...notification, templateRevision: 'unknown' }, links, origin), /revision/);
});

test('missing or mismatched dynamic translations fail instead of sending mixed copy', () => {
  const { notification, links } = fixture('booking_confirmed', 'es', 'regular');
  for (const field of ['frequency', 'extras', 'serviceScope']) {
    const value = field === 'extras' ? { de: ['Backofen'] } : { de: 'Wöchentlich' };
    assert.throws(() => prepareCollectionEnvelope({ ...notification, renderData: { ...notification.renderData, [field]: value } }, links, origin), new RegExp(`Missing es translation for ${field}`));
  }
  for (const [id, field] of [['support_reply', 'staffReply'], ['issue_resolved', 'resolution'], ['details_required', 'openQuestions']]) {
    const value = fixture(id, 'es');
    value.notification.renderData.staffContentLanguage = 'de';
    assert.throws(() => prepareCollectionEnvelope(value.notification, value.links, origin), /must match/);
    delete value.notification.renderData.staffContentLanguage;
    value.notification.renderData[field] = field === 'openQuestions' ? { es: ['¿Cómo accederemos al apartamento?'] } : { es: 'Hemos revisado su indicación.' };
    assert.equal(prepareCollectionEnvelope(value.notification, value.links, origin).language, 'es');
  }
});

test('renderer does not turn unverified financial or scheduling states into success', () => {
  for (const id of ['deposit_received', 'payment_received']) {
    const { notification, links } = fixture(id, 'es');
    notification.renderData.paymentStatus = 'pending';
    assert.throws(() => prepareCollectionEnvelope(notification, links, origin), /settled/);
  }
  const { notification, links } = fixture('booking_confirmed', 'es');
  notification.renderData.appointment.status = 'requested';
  assert.throws(() => prepareCollectionEnvelope(notification, links, origin), /confirmed/);
});

test('brand origin and authorized links reject unsafe schemes without mutating valid signed links', () => {
  const { notification, links } = fixture('quote_saved', 'es');
  for (const bad of ['http://kraken.example', 'https://user:password@kraken.example', 'https://kraken.example/path', 'https://kraken.example/?token=value', 'https://kraken.example/#token']) {
    assert.throws(() => brandForLanguage('es', bad));
  }
  assert.throws(() => prepareCollectionEnvelope(notification, { ...links, primary: 'javascript:alert(1)' }, origin), /URL|protocol/);
  const signed = 'https://payment.example/checkout?signature=synthetic-signed-value&locale=de';
  const email = prepareCollectionEnvelope(notification, { ...links, primary: signed }, origin);
  assert.ok(email.text.includes(signed));
  assert.ok(!email.text.includes(signed + '&lang=es'));
});

test('all original illustrations and the logo are valid decoded PNGs with unique artwork per template', async () => {
  const assets = new URL('../public/kraken-emails/assets/', import.meta.url);
  const names = readdirSync(assets);
  assert.equal(names.length, 31);
  assert.equal(new Set(Object.values(emailArtwork).map(art => art.file)).size, 30);
  const hashes = new Set();
  for (const name of names) {
    const bytes = readFileSync(new URL(name, assets));
    assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    const original = readFileSync(new URL(`../reference/kraken-emails/assets/${name}`, import.meta.url));
    assert.deepEqual(bytes, original, name);
    const decoded = await Jimp.read(bytes);
    assert.ok(decoded.bitmap.width > 100 && decoded.bitmap.height > 100, name);
    if (name.startsWith('email-')) hashes.add(createHash('sha256').update(bytes).digest('hex'));
  }
  assert.equal(hashes.size, 30);
});
