import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { publicHref, pathLanguage, parseSitePath } from '../src/routing/site-paths.ts';
import { getRouteDisposition, PUBLIC_BASE_PATHS } from '../src/routing/route-policy.ts';
import { getSitemapUrls } from '../scripts/generate-sitemap.mjs';
import { getPageSeo } from '../src/seo/metadata.ts';
import { getPublicPriceOffers } from '../src/booking/publicPricing.ts';
import { calculatePrice, defaultSelection } from '../src/booking/pricing.ts';
import { pricingConfig } from '../src/booking/pricingConfig.ts';

test('old language and service URLs redirect in one hop while opaque context and fragments survive', () => {
  const cases = [
    ['/index.html?lang=fr', '/fr/'],
    ['/quote?lang=es&service=end&booking=a%2Bb%26c#resume=opaque', '/es/offerte?service=end&booking=a%2Bb%26c#resume=opaque'],
    ['/about?hl=fr&utm=a&utm=b#story-london', '/fr/ueber-uns?utm=a&utm=b#story-london'],
    ['/services/zurich/end-of-tenancy?lang=it', '/it/umzugsreinigung/zuerich'],
    ['/reinigung/opfikon?lang=en', '/en/reinigung/region-zuerich'],
    ['/reinigung/neuhausen-am-rheinfall', '/reinigung/kanton-schaffhausen'],
    ['/es/quote?lang=en', '/es/offerte'], ['/en', '/en/'], ['/de/offerte', '/offerte'],
  ];
  for (const [old, current] of cases) {
    assert.deepEqual(getRouteDisposition(old), { status: 301, location: current });
    assert.equal(getRouteDisposition(current).status, 200, current);
  }
  assert.equal(publicHref('/quote?service=end&draft=a%2Bb#resume', 'pt'), '/pt/offerte?service=end&draft=a%2Bb#resume');
  assert.equal(publicHref('/api/booking?token=a%2Bb', 'fr'), '/api/booking?token=a%2Bb');
  assert.throws(() => publicHref('https://other.example/offerte', 'en'));
});

test('historical sitemap and router inventory has no unhandled URL or redirect chain', () => {
  const csv = readFileSync(new URL('../docs/ROUTE_MIGRATION.csv', import.meta.url), 'utf8').trim().split('\n').slice(1);
  assert.ok(csv.length >= 700);
  for (const line of csv) {
    const columns = [...line.matchAll(/"((?:[^"]|"")*)"/g)].map(match => match[1].replaceAll('""', '"'));
    const [source, destination, status] = columns;
    const disposition = getRouteDisposition(source);
    assert.equal(disposition.status, Number(status), source);
    assert.notEqual(disposition.status, 404, source);
    if (disposition.status === 301) {
      assert.equal(disposition.location, destination, source);
      assert.equal(getRouteDisposition(destination).status, 200, destination);
    }
  }
  for (const removed of ['/commercial', '/services/zurich/gardening', '/fr/services/winterthur/property-managers', '/reinigung-zurich-gutter-cleaning']) {
    assert.equal(getRouteDisposition(removed).status, 410, removed);
  }
  for (const unconfirmed of ['/quote-demo', '/commercial-quote']) {
    assert.equal(getRouteDisposition(unconfirmed).status, 200);
    assert.equal(getPageSeo(unconfirmed).indexable, false);
  }
});

test('144 current URLs are 200 canonical, language-prefixed, reciprocal and free of legacy parameters', () => {
  assert.equal(PUBLIC_BASE_PATHS.length, 24);
  const urls = getSitemapUrls(); assert.equal(urls.length, 144);
  for (const url of urls) {
    assert.equal(new URL(url).search, '');
    assert.equal(getRouteDisposition(url).status, 200, url);
    const meta = getPageSeo(url);
    assert.equal(meta.canonical, url); assert.equal(meta.hreflangs.length, 7);
    assert.ok(meta.hreflangs.some(item => item.lang === 'x-default' && pathLanguage(item.href) === null));
    assert.equal(meta.language, pathLanguage(url) || 'de-CH');
    assert.equal(parseSitePath(url).pathname, new URL(publicHref(url, 'de'), 'https://krakenpfm.ch').pathname);
  }
});

test('service offers use calculator amounts and genuine visible FAQs, excluding provisional moving prices and invented ratings', () => {
  for (const language of ['de', 'en', 'es', 'pt', 'it', 'fr']) for (const city of ['zuerich', 'schaffhausen', 'winterthur']) {
    const meta = getPageSeo(publicHref('/umzugsreinigung/' + city, language));
    const service = meta.structuredData.find(item => item['@type'] === 'Service')!;
    const faq = meta.structuredData.find(item => item['@type'] === 'FAQPage')!;
    assert.equal((service.offers as unknown[]).length, 5);
    assert.equal((faq.mainEntity as unknown[]).length, 4);
    assert.doesNotMatch(JSON.stringify(meta.structuredData), /AggregateRating|Review|ratingValue/);
    const windows = getPageSeo(publicHref('/fensterreinigung/' + city, language)).structuredData.find(item => item['@type'] === 'Service')!;
    assert.equal((windows.offers as {price: string}).price, (getPublicPriceOffers().find(offer => offer.service === 'windows')!.minimumCents! / 100).toFixed(2));
    const moving = getPageSeo(publicHref('/kleinumzug/' + city, language)).structuredData.find(item => item['@type'] === 'Service')!;
    const expectedMoving = [
      ...([1, 2] as const).map(team => calculatePrice({ ...defaultSelection('moving'), mode: 'hourly', team, estimatedHours: pricingConfig.moving.hourly.teams[team].minimumHours })),
      ...pricingConfig.moving.fixed.tiers.filter(tier => tier.priceType === 'fixed').map(tier => calculatePrice({ ...defaultSelection('moving'), mode: 'fixed', rooms: tier.rooms, distanceKm: pricingConfig.moving.fixed.maxDistanceKm })),
    ];
    const offers = moving.offers as { price: string; priceCurrency: string }[];
    assert.equal(offers.length, 4);
    assert.deepEqual(offers.map(offer => offer.price), ['250.00', '495.00', '540.00', '790.00']);
    assert.deepEqual(offers.map(offer => offer.price), expectedMoving.map(quote => (quote.totalCents! / 100).toFixed(2)));
    assert.ok(offers.every(offer => offer.priceCurrency === pricingConfig.currency));
    const provisional = pricingConfig.moving.fixed.tiers.find(tier => tier.priceType === 'from')!;
    const requestOnly = calculatePrice({ ...defaultSelection('moving'), mode: 'fixed', rooms: provisional.rooms, distanceKm: pricingConfig.moving.fixed.maxDistanceKm });
    assert.equal(requestOnly.totalCents, null);
    assert.equal(requestOnly.depositBasisCents, null);
    assert.equal(offers.some(offer => offer.price === (provisional.priceCents / 100).toFixed(2)), false);
    assert.doesNotMatch(JSON.stringify(moving), /AggregateRating|Review|ratingValue/);
  }
});
