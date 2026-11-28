import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { IMPRESSUM_LANGUAGES, getImpressumDocument, impressumLanguage } from '../src/legal/impressum-document.ts';
import { getGDPRTranslation } from '../components/legal/privacy.ts';
import { businessHoursLongLabel } from '../src/config/business-hours.mjs';

const sha256 = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
// The supplied descriptor permits only these six literal changes to liabilityP1.
const privacyChanges = {
  de: {
    before: 'Kontaktieren Sie Kraken vor der Buchung, wenn Sie Fragen zum Leistungsumfang, zu Abgabebedingungen, zur Versicherung oder zu den Bedingungen Ihrer Anfrage haben.',
    after: 'Kontaktieren Sie Kraken vor der Buchung, wenn Sie Fragen zum Leistungsumfang, zu Abgabebedingungen oder zu den Bedingungen Ihrer Anfrage haben.',
    removed: ', zur Versicherung',
  },
  en: {
    before: 'Contact Kraken before booking if you need clarification about the service scope, handover conditions, insurance or the terms that apply to your request.',
    after: 'Contact Kraken before booking if you need clarification about the service scope, handover conditions or the terms that apply to your request.',
    removed: ', insurance',
  },
  es: {
    before: 'Contacte con Kraken antes de contratar si necesita aclarar el alcance del servicio, las condiciones de entrega, el seguro o las condiciones aplicables a su solicitud.',
    after: 'Contacte con Kraken antes de contratar si necesita aclarar el alcance del servicio, las condiciones de entrega o las condiciones aplicables a su solicitud.',
    removed: ', el seguro',
  },
  fr: {
    before: 'Contactez Kraken avant de réserver pour clarifier les prestations, les conditions de remise, l’assurance ou les conditions applicables à votre demande.',
    after: 'Contactez Kraken avant de réserver pour clarifier les prestations, les conditions de remise ou les conditions applicables à votre demande.',
    removed: ', l’assurance',
  },
  it: {
    before: 'Contatti Kraken prima di prenotare per chiarimenti sulle prestazioni, sulle condizioni di consegna, sull’assicurazione o sulle condizioni applicabili alla richiesta.',
    after: 'Contatti Kraken prima di prenotare per chiarimenti sulle prestazioni, sulle condizioni di consegna o sulle condizioni applicabili alla richiesta.',
    removed: ', sull’assicurazione',
  },
  pt: {
    before: 'Contacte a Kraken antes de contratar para esclarecer o âmbito do serviço, as condições de entrega, o seguro ou as condições aplicáveis ao pedido.',
    after: 'Contacte a Kraken antes de contratar para esclarecer o âmbito do serviço, as condições de entrega ou as condições aplicáveis ao pedido.',
    removed: ', o seguro',
  },
} as const;

test('the legal notice is the entire supplied six-language source, copied without content or formatting changes', async () => {
  const raw = await readFile(new URL('../src/legal/impressum-copy.json', import.meta.url));
  assert.equal(sha256(raw), 'baef4d9fa28c74ab1cae0827bbc8f27ee6df75f1c8002798fef1e50266393210');
  const source = JSON.parse(raw.toString('utf8'));
  assert.deepEqual(Object.keys(source.locales), ['de', 'en', 'es', 'fr', 'it', 'pt']);
  const documents = IMPRESSUM_LANGUAGES.map(language => getImpressumDocument(language));
  assert.deepEqual(documents.map(doc => [doc.language, doc.title, doc.date]), [
    ['de', 'Impressum', '27. November 2026'],
    ['en', 'Legal notice', '27 November 2026'],
    ['es', 'Aviso legal', '27 de noviembre de 2026'],
    ['fr', 'Mentions légales', '27 novembre 2026'],
    ['it', 'Note legali', '27 novembre 2026'],
    ['pt', 'Aviso legal', '27 de novembro de 2026'],
  ]);
  assert.deepEqual(documents.map(doc => doc.sections.map(section => section.id)), Array(6).fill(['company', 'register', 'contact', 'liability', 'links', 'copyright', 'more']));
  for (const doc of documents) {
    const { language, common, ...locale } = doc;
    assert.deepEqual(common, source.common, language + ': no business details were altered');
    assert.deepEqual(locale, source.locales[language], language + ': no legal paragraphs or controls were dropped');
  }
});

test('business identity and Italian IDI, Spanish legal form and Portuguese contact title retain the approved wording', () => {
  const de = getImpressumDocument('de'), it = getImpressumDocument('it');
  assert.deepEqual(de.common, {
    companyName: 'Kraken Properties and Facilities Management Gomes Mendes',
    owner: 'Antonio Nadre Gomes Mendes', address: 'Seewadelstrasse 3, 8203 Schaffhausen',
    uid: 'CHE-435.882.969', uidUrl: 'https://www.uid.admin.ch/Detail.aspx?uid_id=CHE-435.882.969',
    email: 'kai@krakenpfm.ch', phone: '+41 77 450 57 05', phoneHref: 'tel:+41774505705', updatedAt: '2026-11-27',
  });
  assert.equal(it.sections.find(section => section.id === 'register')!.uidLabel, 'IDI / numero d’impresa');
  assert.equal(it.sections.find(section => section.id === 'register')!.uidLinkText, 'IDI CHE-435.882.969');
  assert.equal(getImpressumDocument('es').sections[0].rows![1].value, 'Empresa individual');
  assert.equal(getImpressumDocument('pt').sections.find(section => section.id === 'contact')!.title, 'Informações de contacto');
  assert.match(de.sections.find(section => section.id === 'register')!.paragraphs![1], /unter CHF 100'000/);
  assert.deepEqual(de.sections.find(section => section.id === 'more')!.links!.map(link => link.path), ['/gdpr', '/terms']);
});

test('unknown locale inputs cannot select object prototypes, and document data cannot be mutated across renders', () => {
  assert.equal(getImpressumDocument(' es-ES '), getImpressumDocument('es'));
  assert.equal(getImpressumDocument('IT-ch'), getImpressumDocument('it'));
  for (const input of ['__proto__', 'constructor', 'nl', null, undefined, {}, ['es']]) assert.equal(getImpressumDocument(input), getImpressumDocument('de'));
  assert.equal(impressumLanguage('FR-ca'), 'fr');
  const doc = getImpressumDocument('de');
  assert.ok(Object.isFrozen(doc));
  assert.ok(Object.isFrozen(doc.common));
  assert.ok(Object.isFrozen(doc.sections[0].rows![0]));
  assert.throws(() => { doc.common.owner = 'Altered owner'; }, TypeError);
  assert.equal(getImpressumDocument('de').common.owner, 'Antonio Nadre Gomes Mendes');
});

test('privacy changes allow only the six exact insurance removals and the shared contact hours in introP1', async () => {
  const current = await readFile(new URL('../components/legal/privacy.ts', import.meta.url), 'utf8');
  // Normalize only the subsequently authorized hours refactor: one exact import
  // and one helper interpolation in each locale's introP1. The existing whole-file
  // hashes still guard every surrounding word, paragraph, import and clause.
  const hoursImport = "import { businessHoursLongLabel } from '../../src/config/business-hours.mjs';\n";
  assert.ok(current.startsWith(hoursImport), 'shared-hours import is the only new leading import');
  assert.equal(current.split(hoursImport).length - 1, 1);
  let hoursRestored = current.replace(hoursImport, '');
  const previousHours = {
    de: 'Montag bis Sonntag, 09:00–19:00 Uhr (Europe/Zurich)',
    en: 'Monday to Sunday, 09:00–19:00 (Europe/Zurich)',
    es: 'de lunes a domingo, 09:00–19:00 (Europe/Zurich)',
    pt: 'de segunda a domingo, 09:00–19:00 (Europe/Zurich)',
    it: 'da lunedì a domenica, 09:00–19:00 (Europe/Zurich)',
    fr: 'du lundi au dimanche, 09:00–19:00 (Europe/Zurich)',
  } as const;
  const introPrefix = '    "introP1": ';
  for (const [language, before] of Object.entries(previousHours)) {
    const interpolation = `\${businessHoursLongLabel('${language}')}`;
    assert.equal(current.split(interpolation).length - 1, 1, language + ': exactly one shared-hours interpolation');
    const line = current.split('\n').find(value => value.includes(interpolation))!;
    assert.ok(line.startsWith(introPrefix + '`') && line.endsWith('`,'), language + ': helper is confined to introP1');
    const content = line.slice(introPrefix.length + 1, -2).replace(interpolation, before);
    assert.equal(content.includes('${'), false, language + ': no other interpolation was introduced');
    hoursRestored = hoursRestored.replace(line, introPrefix + JSON.stringify(content) + ',');
    assert.ok(getGDPRTranslation(language).introP1.includes(businessHoursLongLabel(language)), language + ': rendered hours use the shared configuration');
  }
  let restored = hoursRestored;
  for (const [language, change] of Object.entries(privacyChanges)) {
    assert.equal(getGDPRTranslation(language).liabilityP1, change.after);
    assert.equal(current.split(change.after).length - 1, 1, language + ': exactly one corrected literal');
    assert.equal(current.includes(change.before), false, language + ': previous phrase is absent');
    assert.equal(change.before.replace(change.removed, ''), change.after, language + ': no other sentence rewrite');
    restored = restored.replace(change.after, change.before);
  }
  // Original editable privacy.ts at f9346d1. Reversing only the explicitly
  // permitted changes must reproduce the original bytes in their entirety.
  assert.equal(sha256(restored), '09e8cb47f8162bc6165f26d1eecf51cd993c7d3ed9a5b280512b2d1732343b10');
  assert.equal(sha256(hoursRestored), 'ba06fcf944b452c792c5a581d5a29738fbb8bcc3da92c7bd587cef7222528314');
});
