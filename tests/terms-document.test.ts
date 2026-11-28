import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { CURRENT_TERMS_VERSION, TERMS_LANGUAGES, getTermsDocument, getTermsClause, termsDocumentText, termsSectionText } from '../src/legal/terms-document.ts';
import { getTermsPolicy, TERMS_POLICY_SOURCE_HASHES, TERMS_POLICY_VERSION } from '../src/legal/terms-policy.ts';
import { PUBLIC_POLICY_CONTENT, END_OF_TENANCY_INCLUDED } from '../src/kai/policyContent.ts';

const source = new URL('../src/legal/versions/kraken-agb-2026-11-28-v3/', import.meta.url);
const normalize = (text: string) => text.replace(/^#{1,2}\s+/gm, '').replace(/^- /gm, '').replace(/\s+/g, ' ').trim();
const numberTokens = (text: string) => text.match(/\b\d+(?:[.']\d+)*/g) || [];

test('v3 clause4 preserves the exact newly supplied German payment terms and the new refund remedy',()=>{
  const supplied=`4.1 Der gesamte Preis ist vor dem Einsatz zu bezahlen. Nach der Auftragsbestätigung erhalten Sie den Zahlungslink. Der Betrag ist innert 3 Tagen nach der Bestätigung zahlbar, spätestens 48 Stunden vor Arbeitsbeginn; bei kurzfristigen Aufträgen sofort nach der Bestätigung. Sie zahlen online über Payrexx, per Banküberweisung oder QR-Rechnung; massgebend ist der Zahlungseingang.
4.2 Geht die Zahlung nicht rechtzeitig ein, kann Kraken den Termin nach einer Erinnerung wieder freigeben. Ohne Zahlungseingang beginnt Kraken nicht mit der Arbeit.
4.3 Bei Arbeiten nach Aufwand zahlen Sie den im Rechner ausgewiesenen Richtpreis im Voraus. Mehraufwand stellt Kraken nach dem Einsatz in Rechnung, zahlbar innert 7 Tagen. Dauert der Einsatz kürzer als geschätzt, erstattet Kraken die Differenz bis zur Mindestdauer.
4.4 Regelmässige Reinigungen werden monatlich im Voraus bezahlt.
4.5 Bei Zahlungsverzug mit nachträglich gestellten Rechnungen schulden Sie 5 % Verzugszins pro Jahr. Die erste Erinnerung ist kostenlos; die zweite Mahnung kostet CHF 20, die dritte CHF 50. Notwendige Inkassokosten gehen zu Ihren Lasten.
4.6 Rückerstattungen erfolgen innert 10 Tagen auf dem ursprünglichen Zahlungsweg.`;
  assert.equal(normalize(getTermsClause('de',4)),normalize(supplied));
  assert.equal(getTermsDocument('de').sections[3].title,'4. Zahlung vor dem Einsatz');
  assert.equal(getTermsClause('de',9,9),'9.9 Kann Kraken die Nachreinigung nicht innert der vereinbarten Frist ausführen, erstattet Kraken den Preisanteil der beanstandeten Arbeiten.');
  assert.doesNotMatch(termsDocumentText(getTermsDocument('de')),/Anzahlung|Restbetrag|15\s*%/);
});

test('the complete German document is literally the supplied AGB_DE, apart from markup and whitespace', async () => {
  const archived = new URL('../src/legal/versions/kraken-agb-2026-11-26-v2/', import.meta.url);
  const original = await readFile(new URL('de.md', archived), 'utf8');
  // SHA of the owner's INICIO_AGB_DE..FIN_AGB_DE block, with a terminal newline.
  assert.equal(createHash('sha256').update(original).digest('hex'), '20a0f536da4c7f7a0605cf67c5aaa520a20c245c8315944b2661584eb5e07cac');
  assert.equal(normalize(termsDocumentText(JSON.parse(await readFile(new URL('de.json', archived), 'utf8')))), normalize(original));
  assert.doesNotMatch(termsDocumentText(getTermsDocument('de')), /INICIO_AGB_DE|FIN_AGB_DE/);
});

test('all five complete translations preserve every numbered clause, numerical value and list item', () => {
  const german = getTermsDocument('de');
  for (const language of TERMS_LANGUAGES) {
    const doc = getTermsDocument(language);
    assert.equal(doc.language, language);
    assert.equal(doc.version, CURRENT_TERMS_VERSION);
    assert.equal(doc.sections.length, 17);
    assert.equal(doc.contact, german.contact);
    assert.ok(doc.dateLabel.includes('2026'));
    assert.equal(Boolean(doc.translationNotice), language !== 'de');
    for (const [index, section] of doc.sections.entries()) {
      assert.equal(section.number, index + 1);
      assert.match(section.title, new RegExp('^' + (index + 1) + '\\. [^0-9]'));
      assert.deepEqual(section.blocks.map(block => block.type === 'list' ? block.items.length : 'paragraph'),
        german.sections[index].blocks.map(block => block.type === 'list' ? block.items.length : 'paragraph'), language + ':' + section.number + ' structure');
      assert.deepEqual(numberTokens(section.title + ' ' + termsSectionText(section)),
        numberTokens(german.sections[index].title + ' ' + termsSectionText(german.sections[index])), language + ':' + section.number + ' numbers');
      assert.ok(termsSectionText(section).trim());
      if (language !== 'de') assert.notEqual(termsSectionText(section), termsSectionText(german.sections[index]));
    }
  }
});

test('subclause extraction retains associated lists and unnumbered exceptions', () => {
  const cancellation = getTermsClause('de', 7, 2);
  assert.match(cancellation, /bis 48 Stunden vorher: kostenlos/);
  assert.match(cancellation, /weniger als 48 und bis 12 Stunden vorher: 50 %/);
  assert.match(cancellation, /weniger als 12 Stunden vorher.*100 %/);
  assert.match(cancellation, /bestätigte Richtpreis als vereinbarter Preis/);
  assert.match(cancellation, /Der bezahlte Betrag wird angerechnet/);
  assert.doesNotMatch(cancellation, /Verschiebung/);
  assert.match(getTermsClause('de', 7, 3), /bis 24 Stunden.*Ersatztermin/);
  assert.throws(() => getTermsClause('de', 18), RangeError);
  assert.throws(() => getTermsClause('de', 9, 999), RangeError);
});

test('shared guarantees and payment summaries come from the exact immutable clauses', async () => {
  assert.equal(TERMS_POLICY_VERSION, CURRENT_TERMS_VERSION);
  for (const language of TERMS_LANGUAGES) {
    const doc = getTermsDocument(language), policy = getTermsPolicy(language);
    const plain = (text: string) => text.replace(/^\d+\.\d+\s+/gm, '');
    assert.equal(policy.guarantee, termsSectionText(doc.sections[8], { stripNumbering: true }));
    assert.equal(policy.guaranteeScope, plain(getTermsClause(language, 9, 1)));
    assert.equal(policy.deposit, plain(getTermsClause(language, 4, 1)));
    assert.equal(policy.prepayment, plain(getTermsClause(language, 4, 1)));
    assert.equal(policy.payment, [1,2,3,4,6].map(number=>plain(getTermsClause(language,4,number))).join('\n\n'));
    assert.equal(policy.materials, plain(getTermsClause(language, 6, 3)));
    assert.equal(policy.preparation, termsSectionText(doc.sections[5], { stripNumbering: true }));
    assert.equal(policy.rescheduling, plain(getTermsClause(language, 7, 3)));
    assert.equal(policy.cancellation, [1, 2, 4].map(number => plain(getTermsClause(language, 7, number))).join('\n\n'));
    assert.equal(PUBLIC_POLICY_CONTENT[language], policy);
    assert.ok(END_OF_TENANCY_INCLUDED[language].endsWith(policy.guaranteeScope));
    const raw = await readFile(new URL(language + '.json', source), 'utf8');
    assert.equal(createHash('sha256').update(raw).digest('hex'), TERMS_POLICY_SOURCE_HASHES[language]);
  }
  assert.equal(getTermsPolicy('de').insurance, 'Das klären wir gern persönlich.');
  assert.equal(getTermsPolicy('de').team, 'Antonio, bei Bedarf mit Helfern.');
  assert.doesNotMatch(getTermsPolicy('de').insurance, /Versicherungsnachweis|Deckung|versichert/i);
  const entry = await readFile(new URL('../src/legal/terms-policy.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(entry, /from ['"].*(?:terms-document|versions\/)/);
  execFileSync(process.execPath, ['scripts/generate-terms-policy.mjs', '--check'], { cwd: fileURLToPath(new URL('..', import.meta.url)), stdio: 'pipe' });
});

test('locale fallback is safe, documents are frozen, and unknown versions cannot silently become current', () => {
  assert.equal(getTermsDocument('de-CH'), getTermsDocument('de'));
  assert.equal(getTermsDocument('__proto__'), getTermsDocument('de'));
  assert.equal(getTermsPolicy('__proto__'), getTermsPolicy('de'));
  assert.equal(getTermsPolicy('EN-gb'), getTermsPolicy('en'));
  assert.throws(() => getTermsDocument('es', 'some-other-version'), RangeError);
  assert.ok(Object.isFrozen(getTermsDocument('de')));
  assert.ok(Object.isFrozen(getTermsDocument('de').sections[8].blocks));
  assert.ok(Object.isFrozen(getTermsPolicy('es')));
});
