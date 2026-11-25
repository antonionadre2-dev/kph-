import test from 'node:test';
import assert from 'node:assert/strict';
import { CONTACT_LANGUAGES, CONTACT_FORM_KEYS, getContactCopy, normalizeContactLanguage } from '../src/contact/contact-copy.ts';
import { CONTACT_SETTINGS, getContactResponseTime } from '../src/contact/settings.ts';
import { getPageSeo, serializeStructuredData } from '../src/seo/metadata.ts';
import { getMetadataForPath } from '../seoConfig.ts';
import { getApprovedPageMetadata } from '../src/seo/local-metadata.ts';
import { publicHref } from '../src/routing/site-paths.ts';

const strings = (value: unknown): string[] => typeof value === 'string' ? [value]
  : Array.isArray(value) ? value.flatMap(strings)
  : value && typeof value === 'object' ? Object.values(value).flatMap(strings) : [];

test('new contact source provides complete localized copy, services and optional telephone in six languages', () => {
  const titles = new Set<string>();
  const faqTitles = new Set<string>();
  const formTitles = new Set<string>();
  for (const language of CONTACT_LANGUAGES) {
    const copy = getContactCopy(language);
    assert.deepEqual(Object.keys(copy.form).sort(), [...CONTACT_FORM_KEYS].sort());
    assert.ok(strings(copy).every(value => value.trim().length > 0), language);
    assert.equal(copy.faqs.length, 5);
    assert.equal(new Set(copy.faqs.map(faq => faq.question)).size, 5);
    assert.equal(copy.person.name, 'Antonio Gomes');
    assert.equal(copy.person.initials, 'AG');
    assert.match(copy.hero.hours, /09:00–19:00/);
    assert.ok(copy.form.phoneRequired && copy.form.optional);
    assert.ok(['serviceWindows','serviceEnd','serviceRegular','serviceDeep','serviceMoving','serviceUnsure'].every(key => copy.form[key as keyof typeof copy.form]));
    assert.doesNotMatch(strings(copy).join('\n'), /Europe\/Zurich|contact-(?:exterior|interior|marker)|OSRM|openrouteservice|swisstopo|09:00–17:00|08:00–18:00|24\/7|100\s*%/i);
    if (language !== 'de') {
      assert.notEqual(copy.hero.title, getContactCopy('de').hero.title);
      assert.notEqual(copy.form.invalidMessage, getContactCopy('de').form.invalidMessage);
      assert.notEqual(copy.form.error, getContactCopy('de').form.error);
      assert.notEqual(copy.form.phoneRequired, getContactCopy('de').form.phoneRequired);
    }
    titles.add(copy.hero.title); faqTitles.add(copy.faqTitle); formTitles.add(copy.form.title);
  }
  assert.equal(titles.size, 6);
  assert.equal(faqTitles.size, 6);
  assert.equal(formTitles.size, 6);
  assert.doesNotMatch(strings(getContactCopy('de')).join(' '), /ß/);
  assert.equal(getContactCopy('de').hero.eyebrow, 'KONTAKT ZU KRAKEN');
  assert.equal(getContactCopy('de').hero.title, 'Wir kommen zu Ihnen.');
  assert.equal(getContactCopy('de').hero.intro, 'Reinigung und kleine Umzüge. Persönlich für Sie da.');
  assert.equal(getContactCopy('de').hero.calculate, 'Service berechnen');
});

test('language aliases are normalized without prototype access or accidental fallback content', () => {
  for (const [input, expected] of [['de-CH','de'],[' EN_gb ','en'],['es-ES','es'],['fr-CH','fr'],['it-CH','it'],['pt-PT','pt']]) {
    assert.equal(normalizeContactLanguage(input), expected);
    assert.equal(getContactCopy(input), getContactCopy(expected));
  }
  for (const input of ['__proto__','constructor','xx',null,{},42]) assert.equal(getContactCopy(input), getContactCopy('de'));
});

test('response deadline remains unconfigured in every locale without default promises', () => {
  assert.deepEqual(CONTACT_SETTINGS.responseTime, {});
  for (const language of CONTACT_LANGUAGES) assert.equal(getContactResponseTime(language), '');
  assert.equal(getContactResponseTime('de-CH'), '');
});

test('contact metadata and FAQ graph share the exact visible copy with one business identity', () => {
  for (const language of CONTACT_LANGUAGES) {
    const copy = getContactCopy(language);
    const href = publicHref('/kontakt', language);
    const metadata = getPageSeo(href);
    const direct = getMetadataForPath('/kontakt', language);
    const approved = getApprovedPageMetadata('/kontakt', language)!;
    for (const source of [metadata, direct, approved]) {
      assert.equal(source.title, copy.meta.title);
      assert.equal(source.description, copy.meta.description);
      assert.equal(source.h1, copy.hero.title);
    }
    assert.equal(metadata.indexable, true);
    assert.equal(metadata.robots, 'index, follow');
    assert.equal(metadata.canonical, 'https://krakenpfm.ch' + href);
    assert.equal(metadata.hreflangs.length, 7);
    const page = metadata.structuredData.filter(node => node['@type'] === 'ContactPage');
    const faq = metadata.structuredData.filter(node => node['@type'] === 'FAQPage');
    assert.equal(page.length, 1);
    assert.equal(faq.length, 1);
    assert.equal(page[0].name, copy.meta.title);
    assert.equal(page[0].url, metadata.canonical);
    assert.deepEqual(page[0].about, { '@id': 'https://krakenpfm.ch/#business' });
    assert.deepEqual(faq[0].mainEntity, copy.faqs.map(item => ({ '@type': 'Question', name: item.question, acceptedAnswer: { '@type': 'Answer', text: item.answer } })));
    assert.equal(metadata.structuredData.filter(node => node['@type'] === 'LocalBusiness').length, 1);
    assert.doesNotMatch(serializeStructuredData(metadata.structuredData), /aggregateRating|reviewCount|ratingValue|department|branchCode/);
    assert.deepEqual(getPageSeo('/contacto?lang=' + language).structuredData.find(node => node['@type'] === 'FAQPage'), faq[0]);
  }
});
