import test from 'node:test';
import assert from 'node:assert/strict';
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
    ['/imprint/', '/impressum'], ['/ueber-kraken', '/about'], ['/ABOUT/', '/about'],
    ['/services', '/leistungen'], ['/contacto', '/kontakt'],
    ['/services/zuerich/window-cleaning/', '/services/zurich/window-cleaning'],
    ['/seo/zuerich/window-cleaning', '/services/zurich/window-cleaning'],
    ['/reinigung-zuerich-window-cleaning', '/services/zurich/window-cleaning'],
  ];
  for (const [source, target] of cases) {
    assert.equal(normalizeCanonicalPath(source + '?lang=fr&booking=private#fragment'), target);
    assert.equal(getPageSeo(source + '?lang=fr&booking=private').canonical, SITE_IDENTITY.origin + target);
  }
  assert.equal(getPageSeo('/quote-demo?lang=es').canonical, SITE_IDENTITY.origin + '/quote');
});

test('private, unverified and unsupported URLs cannot inherit public indexing or schema', () => {
  for (const pathname of [
    '/login', '/register', '/dashboard', '/customer-access', '/quote-demo', '/reviews', '/commercial-quote',
    '/quote?booking=private', '/quote?draft=private', '/quote?access=private', '/quote?payment=private',
    '/services/neuhausen/window-cleaning', '/services/zurich/gardening', '/reinigung/schaffhausen',
    '/commercial', '/blog', '/missing-route',
  ]) {
    const meta = getPageSeo(pathname);
    assert.equal(meta.robots, 'noindex, follow', pathname);
    assert.equal(meta.indexable, false, pathname);
    assert.deepEqual(meta.structuredData, [], pathname);
  }
});

test('business schema uses the published daily contact hours and truthful linked service catalog', () => {
  for (const language of ['de', 'en', 'es', 'pt', 'it', 'fr']) {
    const meta = getPageSeo('/leistungen?lang=' + language);
    const business = meta.structuredData.find(item => item['@type'] === 'LocalBusiness')!;
    assert.equal(business.name, SITE_IDENTITY.name);
    assert.equal(business.telephone, '+41774505705');
    assert.equal(business.email, 'kai@krakenpfm.ch');
    const hours = business.openingHoursSpecification as { dayOfWeek: string[]; opens: string; closes: string }[];
    assert.equal(hours[0].dayOfWeek.length, 7);
    assert.equal(hours[0].opens, '09:00');
    assert.equal(hours[0].closes, '19:00');
    const catalog = business.hasOfferCatalog as { itemListElement: { name: string; url: string }[] };
    assert.equal(catalog.itemListElement.length, 5);
    assert.ok(catalog.itemListElement.every(service => service.url.startsWith(SITE_IDENTITY.origin + '/leistungen#')));
    assert.doesNotMatch(JSON.stringify(meta.structuredData), /ratingValue|reviewCount|aggregateRating|offerCount|lowPrice|priceCurrency|sameAs|GeoCoordinates/);
    if (language !== 'de') assert.notEqual(catalog.itemListElement[0].name, 'Fensterreinigung');
    assert.equal(meta.canonical, SITE_IDENTITY.origin + '/leistungen');
    assert.deepEqual(meta.hreflangs, []);
  }
});

test('service schema describes the page and uses the single business reference', () => {
  const meta = getPageSeo('/services/zurich/window-cleaning', 'en');
  const service = meta.structuredData.find(item => item['@type'] === 'Service')!;
  assert.equal(service.url, meta.canonical);
  assert.equal(service.description, meta.description);
  assert.deepEqual(service.provider, { '@id': SITE_IDENTITY.origin + '/#business' });
  assert.deepEqual(service.areaServed, { '@type': 'City', name: 'Zürich' });
  assert.equal(service.offers, undefined);
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
  assert.equal(business.name, SITE_IDENTITY.name);
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
