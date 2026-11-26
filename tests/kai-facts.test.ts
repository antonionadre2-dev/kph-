import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { getTermsTranslation } from '../components/legal/terms.ts';
import { bookingText } from '../src/booking/uiCopy.ts';
import { getKaiFact, getKaiFaqs, KAI_CONTACT, KAI_FACT_TOPICS } from '../src/kai/facts.ts';
import { getHomeFaqs, getServicePageFaqs } from '../src/seo/page-faqs.ts';

const languages = ['de', 'en', 'es', 'pt', 'it', 'fr'] as const;

test('extracting shared policy paragraphs preserves every section and metadata of the six existing AGB documents', () => {
  // SHA256 of each complete JSON document captured before the content-only extraction.
  const before = {
    de: 'fb8c0cce1f315936423953a9b8af9b34d31e70ee1ef1fbdf8af9a44da1d018a6',
    en: '182db970a2b14c952af1fbf6561a167b8eff43d034071bda47c1ea2823a155a6',
    es: '4a33ad3b3092d543f0836e9da398ffe97e1f67947439046c4f15b29d2b9e4742',
    pt: '256493f841fa6e67960be3fa984b6feca611b7d7f64a1006f2ea99c38ea771cc',
    it: '24c9664c174b509e19c461e2dc66c1f1c12990b9cd1aaef8695248da6e636a40',
    fr: '5b636549ec19abc76302bbf389fb1b0db0122c5ab9c8ea57ef64b9c2816ea9f0',
  };
  for (const language of languages) {
    const document = getTermsTranslation(language);
    assert.equal(document.sections.length, 17);
    assert.equal(createHash('sha256').update(JSON.stringify(document)).digest('hex'), before[language], language);
  }
});

test('Kai and FAQs reuse the actual six-language legal guarantee and cancellation conditions', () => {
  for (const language of languages) {
    const sections = getTermsTranslation(language).sections;
    const guarantee = sections.find(section => section.title.startsWith('8.'))!.content;
    const cancellation = sections.find(section => section.title.startsWith('6.'))!.content;
    assert.ok(getKaiFact('guarantee', language).answer.includes(guarantee), language);
    assert.equal(getKaiFact('cancellation', language).answer, cancellation, language);
    const faqs = getHomeFaqs(language);
    for (const topic of KAI_FACT_TOPICS) assert.ok(faqs.some(faq => faq.answer === getKaiFact(topic, language).answer), `${language}: ${topic}`);
  }
});

test('payment facts take the actual methods and deposit sentence from the terms, without a duplicate policy', () => {
  for (const language of languages) {
    const sections = getTermsTranslation(language).sections;
    const methods = sections.find(section => section.title.startsWith('5.'))!.content.split(/(?<=[.!?])\s+/).slice(0, 2).join(' ');
    const deposit = sections.find(section => section.title.startsWith('2.'))!.content.split(/(?<=[.!?])\s+/).find(sentence => /Anzahlung|deposit|anticipo|sinal|acconto|acompte/i.test(sentence))!;
    const answer = getKaiFact('payment', language).answer;
    assert.equal(answer, `${methods} ${deposit}`);
    assert.ok(answer.includes('Payrexx'));
    assert.match(answer, /15\s?%/);
  }
});

test('included end-of-tenancy scope comes from the calculator copy in every language', () => {
  for (const language of languages) {
    assert.equal(getKaiFact('included', language, 'end').answer, bookingText(language, 'eotIncluded'));
    assert.ok(getServicePageFaqs('end', language).some(faq => faq.answer === getKaiFact('included', language, 'end').answer));
  }
});

test('unknown insurance, exact team, availability and duration always offer personal contact without invented cover', () => {
  for (const language of languages) {
    for (const topic of ['insurance', 'team', 'availability', 'duration'] as const) {
      const result = getKaiFact(topic, language);
      assert.equal(result.contact, true, `${language}: ${topic}`);
      assert.ok(result.answer.length > 20);
      assert.doesNotMatch(result.answer, /10[’'., ]?000[’'., ]?000|10\s*(?:Mio|million|millones)|\b24\/7\b/);
    }
    assert.ok(getKaiFact('insurance', language).answer.includes(getTermsTranslation(language).sections.find(section => section.title.startsWith('12.'))!.content));
  }
  assert.equal(getKaiFact('duration', 'de').answer, 'Das klären wir gern persönlich.');
  assert.equal(getKaiFact('vat', 'de').answer, 'Es wird keine Mehrwertsteuer verrechnet.');
});

test('common facts have explicit six-language questions and approved public contact links', () => {
  for (const language of languages) {
    assert.equal(getKaiFaqs(language).length, KAI_FACT_TOPICS.length);
    assert.ok(getKaiFaqs(language).every(faq => faq.question.length > 10 && faq.answer.length > 10));
    if (language !== 'de') assert.notEqual(getKaiFaqs(language)[0].question, getKaiFaqs('de')[0].question);
  }
  assert.equal(KAI_CONTACT.telephone, 'tel:+41774505705');
  assert.equal(KAI_CONTACT.whatsapp, 'https://wa.me/41774505705');
  assert.equal(KAI_CONTACT.email, 'kai@krakenpfm.ch');
  const homeSource = readFileSync(new URL('../components/home/ApprovedHome.tsx', import.meta.url), 'utf8');
  assert.match(homeSource, /getHomeFaqs\(homeLanguage\)\.map/);
});
