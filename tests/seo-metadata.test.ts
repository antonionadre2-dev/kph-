import test from 'node:test';
import assert from 'node:assert/strict';
import { publicHref } from '../src/routing/site-paths.ts';
import { getPublicPriceOffers } from '../src/booking/publicPricing.ts';
import { getPageSeo, normalizeCanonicalPath, serializeStructuredData } from '../src/seo/metadata.ts';
import { INDEXABLE_PATHS } from '../src/seo/crawl-policy.ts';
import { SITE_IDENTITY } from '../src/seo/site-identity.ts';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LocalBusinessSchema, ServiceSchema } from '../components/SchemaComponents.tsx';
import { getLocalSeoDescriptor } from '../src/seo/local-content.ts';

test('reviewed public routes have stable metadata, one business identity and canonical graph links', () => {
  assert.equal(INDEXABLE_PATHS.length, 24);
  for (const pathname of INDEXABLE_PATHS) {
    const meta = getPageSeo(pathname);
    assert.equal(meta.canonical, SITE_IDENTITY.origin + pathname);
    assert.equal(meta.robots, 'index, follow');
    assert.equal(meta.indexable, true);
    assert.equal(meta.language, 'de-CH');
    assert.ok(meta.title && meta.description && meta.h1, pathname);
    const local = getLocalSeoDescriptor(pathname);
    if (local) {
      assert.equal(meta.title, local.title);
      assert.equal(meta.h1, local.h1);
      assert.equal(meta.description, local.description);
    }
    assert.equal(meta.structuredData.filter(item => item['@type'] === 'LocalBusiness').length, 1);
    const page = meta.structuredData.find(item => ['WebPage', 'AboutPage', 'ContactPage'].includes(String(item['@type'])));
    assert.equal(page?.url, meta.canonical);
    assert.equal(page?.description, meta.description);
    assert.deepEqual(page?.isPartOf, { '@id': SITE_IDENTITY.origin + '/#website' });
  }
});

test('canonical aliases converge without language or private query values', () => {
  const cases = [
    ['/imprint/', '/impressum'], ['/ueber-kraken', '/ueber-uns'], ['/ABOUT/', '/ueber-uns'],
    ['/services', '/leistungen'], ['/contacto', '/kontakt'],
    ['/services/zuerich/window-cleaning/', '/fensterreinigung/zuerich'],
    ['/seo/zuerich/window-cleaning', '/fensterreinigung/zuerich'],
    ['/reinigung-zuerich-window-cleaning', '/fensterreinigung/zuerich'],
  ];
  for (const [source, target] of cases) {
    assert.equal(normalizeCanonicalPath(source + '?lang=fr&booking=private#fragment'), target);
    assert.equal(getPageSeo(source + '?lang=fr&booking=private').canonical, SITE_IDENTITY.origin + publicHref(target,'fr'));
  }
  assert.equal(getPageSeo('/quote-demo?lang=es').canonical, SITE_IDENTITY.origin + '/es/quote-demo');
});

test('private, unverified and unsupported URLs cannot inherit public indexing or schema', () => {
  for (const pathname of [
    '/login', '/register', '/dashboard', '/customer-access', '/quote-demo', '/reviews', '/commercial-quote',
    '/quote?booking=private', '/quote?draft=private', '/quote?access=private', '/quote?payment=private',
    '/services/zurich/gardening', '/reinigung/missing-municipality',
    '/commercial', '/blog', '/missing-route',
  ]) {
    const meta = getPageSeo(pathname);
    assert.equal(meta.robots, 'noindex, follow', pathname);
    assert.equal(meta.indexable, false, pathname);
    assert.deepEqual(meta.structuredData, [], pathname);
    assert.deepEqual(meta.hreflangs, [], pathname);
  }
});

test('business schema uses the published daily contact hours and truthful linked service catalog', () => {
  for (const language of ['de', 'en', 'es', 'pt', 'it', 'fr']) {
    const meta = getPageSeo('/leistungen?lang=' + language);
    const business = meta.structuredData.find(item => item['@type'] === 'LocalBusiness')!;
    assert.equal(business.name, SITE_IDENTITY.shortName);
    assert.equal(business.telephone, '+41774505705');
    assert.equal(business.email, 'kai@krakenpfm.ch');
    const hours = business.openingHoursSpecification as { dayOfWeek: string[]; opens: string; closes: string }[];
    assert.equal(hours[0].dayOfWeek.length, 7);
    assert.equal(hours[0].opens, '09:00');
    assert.equal(hours[0].closes, '19:00');
    const catalog = business.hasOfferCatalog as { itemListElement: { name: string; url: string }[] };
    assert.equal(catalog.itemListElement.length, 5);
    const servicesUrl = SITE_IDENTITY.origin + publicHref('/leistungen',language);
    assert.ok(catalog.itemListElement.every(service => service.url.startsWith(servicesUrl + '#')));
    assert.doesNotMatch(JSON.stringify(meta.structuredData), /ratingValue|reviewCount|aggregateRating|offerCount|lowPrice|sameAs/);
    if (language !== 'de') assert.notEqual(catalog.itemListElement[0].name, 'Fensterreinigung');
    assert.equal(meta.canonical, servicesUrl);
    assert.equal(meta.hreflangs.length, 7);
  }
});

test('every reviewed translation has its own canonical, reciprocal alternates and localized graph URLs', () => {
  for (const pathname of INDEXABLE_PATHS) {
    const expected = ['de', 'en', 'es', 'pt', 'it', 'fr'].map(language => ({
      lang: language === 'de' ? 'de-CH' : language,
      href: SITE_IDENTITY.origin + publicHref(pathname,language),
    }));
    expected.push({ lang: 'x-default', href: SITE_IDENTITY.origin + pathname });
    for (const alternate of expected) {
      const meta = getPageSeo(alternate.href);
      assert.equal(meta.indexable, true, alternate.href);
      assert.equal(meta.canonical, alternate.href, alternate.href);
      assert.deepEqual(meta.hreflangs, expected, alternate.href);
      const page = meta.structuredData.find(item => ['WebPage', 'AboutPage', 'ContactPage'].includes(String(item['@type'])))!;
      assert.equal(page.url, alternate.href);
      assert.equal(page['@id'], alternate.href + '#webpage');
      const business = meta.structuredData.find(item => item['@type'] === 'LocalBusiness')!;
      assert.equal(business['@id'], SITE_IDENTITY.origin + '/#business');
      assert.equal(business.url, SITE_IDENTITY.origin + '/');
      const site = meta.structuredData.find(item => item['@type'] === 'WebSite')!;
      assert.equal(site['@id'], SITE_IDENTITY.origin + '/#website');
      assert.equal(site.url, SITE_IDENTITY.origin + publicHref('/',alternate.lang === 'x-default' ? 'de' : alternate.lang));
    }
  }
});

test('locale aliases and harmless selection queries canonicalize without leaking other parameters', () => {
  assert.equal(getPageSeo('/?lang=de-CH&utm_source=example').canonical, SITE_IDENTITY.origin + '/');
  assert.equal(getPageSeo('/leistungen?hl=pt').canonical, SITE_IDENTITY.origin + '/pt/leistungen');
  assert.equal(getPageSeo('/services?lang=en').canonical, SITE_IDENTITY.origin + '/en/leistungen');
  assert.equal(getPageSeo('/quote?lang=fr&service=windows&utm_campaign=example').canonical, SITE_IDENTITY.origin + '/fr/offerte');
  for (const key of ['booking', 'draft', 'access', 'accessToken', 'token', 'payment', 'guide', 'oobCode']) {
    const meta = getPageSeo(`/quote?lang=en&${key}=private-capability`);
    assert.equal(meta.indexable, false, key);
    assert.deepEqual(meta.hreflangs, [], key);
    assert.deepEqual(meta.structuredData, [], key);
    assert.doesNotMatch(meta.canonical, /private-capability/);
  }
});

test('service schema describes the page and uses the single business reference', () => {
  const meta = getPageSeo('/services/zurich/window-cleaning', 'en');
  const service = meta.structuredData.find(item => item['@type'] === 'Service')!;
  assert.equal(service.url, meta.canonical);
  assert.equal(service.description, meta.description);
  assert.deepEqual(service.provider, { '@id': SITE_IDENTITY.origin + '/#business' });
  assert.deepEqual(service.areaServed, { '@type': 'City', name: 'Zürich' });
  assert.equal((service.offers as {price:string}).price, (getPublicPriceOffers().find(offer=>offer.service==='windows')!.minimumCents!/100).toFixed(2));
  assert.doesNotMatch(meta.title + meta.description, /CHF|Meisterklasse|Masterclass|100%/);
});

test('structured data serialization preserves values while preventing script termination', () => {
  const value = { text: '</script><script>alert("x")</script>&\u2028\u2029' };
  const serialized = serializeStructuredData(value);
  assert.doesNotMatch(serialized, /[<>&\u2028\u2029]/);
  assert.deepEqual(JSON.parse(serialized), value);
});

test('legacy schema components retain the verified identity and never turn price hints into offers', () => {
  const businessHtml = renderToStaticMarkup(React.createElement(LocalBusinessSchema, { citiesServed: ['Zürich'] }));
  const business = JSON.parse(businessHtml.match(/<script[^>]*>([\s\S]*?)<\/script>/)![1]);
  assert.equal(business['@id'], SITE_IDENTITY.origin + '/#business');
  assert.equal(business.name, SITE_IDENTITY.shortName);
  assert.equal(business.openingHoursSpecification[0].dayOfWeek.length, 7);
  assert.equal(business.openingHoursSpecification[0].opens, '09:00');
  assert.equal(business.openingHoursSpecification[0].closes, '19:00');
  assert.equal(business.geo, undefined);
  assert.equal(business.sameAs, undefined);
  const serviceHtml = renderToStaticMarkup(React.createElement(ServiceSchema, {
    cityName: 'Zürich', serviceName: 'Reinigung', priceFrom: 45, description: 'Agreed scope </script>',
  }));
  const service = JSON.parse(serviceHtml.match(/<script[^>]*>([\s\S]*?)<\/script>/)![1]);
  assert.equal(service.description, 'Agreed scope </script>');
  assert.equal(service.offers, undefined);
  assert.deepEqual(service.provider, { '@id': SITE_IDENTITY.origin + '/#business' });
});
