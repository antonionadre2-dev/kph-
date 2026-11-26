import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { calculatePrice, defaultSelection, END_OF_TENANCY_TIERS, REGULAR_MINIMUM_HOURS } from '../src/booking/pricing.ts';
import { getMovingTariffs, getPublicPriceOffers } from '../src/booking/publicPricing.ts';
import { publicEndPriceRules, publicPriceText } from '../src/booking/publicPricingCopy.ts';
import { pricingConfig } from '../src/booking/pricingConfig.ts';
import { getPageSeo } from '../src/seo/metadata.ts';
import { getEndOfTenancyOfferRows } from '../src/seo/end-of-tenancy-metadata.ts';
import { homeText } from '../components/home/homeTranslations.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bundle = await build({
  stdin: { contents: `
    import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';
    import {I18nProvider} from './i18n.ts';
    import PublicPriceGuide from './components/PublicPriceGuide.tsx';
    import ApprovedHome from './components/home/ApprovedHome.tsx';
    import {ServicesContent} from './components/services/ApprovedServices.tsx';
    import {SelectedServicePrice} from './components/SelectedServicePrice.tsx';
    import {EndOfTenancyLanding} from './components/EndOfTenancyLanding.tsx';
    export const renderPrice=language=>renderToStaticMarkup(<PublicPriceGuide language={language}/>);
    export const renderHome=language=>renderToStaticMarkup(<I18nProvider initialLanguage={language}><ApprovedHome onNavigate={()=>{}}/></I18nProvider>);
    export const renderServices=language=>renderToStaticMarkup(<ServicesContent language={language}/>);
    export const renderMoving=language=>renderToStaticMarkup(<SelectedServicePrice service="moving" language={language}/>);
    export const renderEnd=language=>renderToStaticMarkup(<EndOfTenancyLanding cityId="zuerich" language={language}/>);
  `, resolveDir: root, loader: 'tsx' },
  bundle: true, platform: 'node', format: 'cjs', packages: 'external', write: false,
  loader: { '.css': 'empty' }, logLevel: 'warning',
});
const module = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);
const { renderPrice, renderHome, renderServices, renderMoving, renderEnd } = module.exports;
const languages = ['de', 'en', 'es', 'pt', 'it', 'fr'];
const decode = value => value.replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'");

test('published starting prices come from valid calculator selections, including the one-off deep cleaning minimum', () => {
  const offers = getPublicPriceOffers();
  assert.deepEqual(offers.map(offer => offer.service), ['regular', 'windows', 'end', 'deep', 'moving']);
  for (const offer of offers) {
    assert.deepEqual(offer.quote, calculatePrice(offer.selection));
    assert.equal(offer.minimumCents, offer.quote.totalCents);
  }
  const regular = offers.find(offer => offer.service === 'regular');
  assert.equal(regular.selection.frequency, 'weekly');
  assert.equal(regular.minimumHours, REGULAR_MINIMUM_HOURS.weekly);
  assert.equal(regular.hourlyRateCents, 4000);
  assert.equal(regular.minimumCents, 10000);
  assert.throws(() => calculatePrice({ ...regular.selection, hours: regular.minimumHours - .25 }));
  const deep = offers.find(offer => offer.service === 'deep');
  assert.equal(deep.selection.service, 'regular');
  assert.equal(deep.selection.frequency, 'once');
  assert.equal(deep.minimumHours, pricingConfig.regular.deep.minimumHours);
  assert.equal(deep.hourlyRateCents, 4400);
  assert.equal(deep.minimumCents, 13200);
  assert.throws(() => calculatePrice({ ...deep.selection, hours: deep.minimumHours - .25 }));
  const windows = offers.find(offer => offer.service === 'windows');
  assert.equal(windows.minimumCents, 12000);
  assert.equal(windows.hourlyRateCents, null);
  const end = offers.find(offer => offer.service === 'end');
  assert.equal(end.selection.mode, 'fixed');
  assert.equal(end.selection.propertyType, 'apartment');
  assert.equal(end.selection.rooms, END_OF_TENANCY_TIERS[0].rooms);
  assert.equal(end.selection.areaM2, END_OF_TENANCY_TIERS[0].maxAreaM2);
  assert.equal(end.minimumCents, 45000);
  assert.equal(end.selection.bathrooms, 1);
  const moving = offers.find(offer => offer.service === 'moving');
  assert.equal(moving.minimumCents, 25000);
  assert.equal(moving.hourlyRateCents, 9500);
  assert.equal(moving.minimumHours, 2);
  assert.equal(moving.quote.priceType, 'estimate');
  assert.equal(moving.quote.manualReviewReasons.length, 0);
});

test('optional materials and extras are excluded from the advertised base, then included by the same engine when chosen', () => {
  for (const offer of getPublicPriceOffers().filter(item => item.selection.service === 'regular')) {
    assert.equal(offer.selection.materials, false);
    assert.equal(offer.selection.oven, false);
    assert.equal(offer.selection.fridge, false);
    assert.equal(offer.selection.ironingHours, 0);
    const materials = calculatePrice({ ...offer.selection, materials: true });
    assert.ok(materials.totalCents > offer.minimumCents);
    assert.equal(materials.totalCents, offer.minimumCents + materials.lines.find(line => line.id === 'regular-materials').totalCents);
  }
  const windows = getPublicPriceOffers().find(offer => offer.service === 'windows');
  const largerWindowOrder = calculatePrice({ ...defaultSelection('windows'), standard: 20 });
  assert.ok(largerWindowOrder.totalCents > windows.minimumCents);
  const end = getPublicPriceOffers().find(offer => offer.service === 'end');
  assert.ok(calculatePrice({ ...end.selection, bathrooms: 2 }).totalCents > end.minimumCents);
});

test('price guide renders real prices, conditions and language-preserving native calculator links in all six languages', () => {
  const titles = new Set();
  for (const language of languages) {
    const html = renderPrice(language);
    titles.add(publicPriceText(language, 'title'));
    assert.ok(html.includes(publicPriceText(language, 'title')));
    assert.ok(html.includes(publicPriceText(language, 'included')));
    assert.doesNotMatch(html, /\{(?:price|hours|rooms|area|bathrooms)\}|<iframe|7[,.]5\s*%/);
    const cards = [...html.matchAll(/<article[^>]*data-public-price-service="([^"]+)"[^>]*>([\s\S]*?)<\/article>/g)];
    assert.equal(cards.length, 5);
    for (const [service, body] of cards.map(([, service, body]) => [service, body])) {
      const offer = getPublicPriceOffers().find(item => item.service === service);
      assert.ok(body.includes(homeText(language, offer.title)));
      const link = new URL(decode(body.match(/href="([^"]+)"/)[1]), 'https://krakenpfm.ch');
      assert.equal(link.pathname, (language === 'de' ? '' : '/' + language) + '/offerte');
      assert.equal(link.searchParams.get('lang'), null);
      assert.equal(link.searchParams.get('service'), service);
      assert.ok(body.includes(homeText(language, service === 'end' ? 'Umzugsreinigung berechnen' : 'Offerte berechnen')));
      assert.ok(body.includes(publicPriceText(language, 'vat')));
      if (service === 'moving') {
        assert.ok(body.includes(publicPriceText(language, 'movingHour')));
        assert.ok(body.includes('95'));
        assert.ok(body.includes('250'));
        assert.ok(body.includes('60'));
      } else {
        const amount = offer.hourlyRateCents ?? offer.minimumCents;
        const formatted = new Intl.NumberFormat(language === 'de' ? 'de-CH' : language, { style: 'currency', currency: 'CHF', currencyDisplay: 'code', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount / 100);
        assert.ok(body.includes(formatted), language + ': ' + service);
      }
    }
  }
  assert.equal(titles.size, 6);
});

test('public moving rows derive from executable engine selections and provisional prices never become payable totals', () => {
  const tariffs = getMovingTariffs();
  assert.deepEqual(tariffs.hourly.map(row => [row.hourlyRateCents, row.minimumHours, row.quote.totalCents]), [[9500, 2, 25000], [14500, 3, 49500]]);
  assert.deepEqual(tariffs.fixed.map(row => [row.rooms, row.priceCents, row.priceType, row.quote.totalCents]), [[1.5, 54000, 'fixed', 54000], [2.5, 79000, 'fixed', 79000], [3.5, 115000, 'from', null]]);
  for (const row of [...tariffs.hourly, ...tariffs.fixed]) assert.deepEqual(row.quote, calculatePrice(row.selection));
  assert.equal(tariffs.travelCents, pricingConfig.moving.travelCents);
});

test('all six visible moving tables include minimums, travel, fixed-price restrictions, extras, combo and VAT wording', () => {
  for (const language of languages) {
    const html = renderMoving(language), clean = decode(html.replace(/<[^>]+>/g, ' '));
    assert.equal((html.match(/<table/g) || []).length, 3);
    for (const key of ['vat', 'oneMover', 'twoMovers', 'reviewFixed', 'extraHelper', 'travel', 'stairs', 'wardrobe', 'disposal', 'boxes', 'comboTitle']) assert.ok(clean.includes(publicPriceText(language, key, { floor: '1' })), `${language}:${key}`);
    assert.match(clean, /95/); assert.match(clean, /145/); assert.match(clean, /540/); assert.match(clean, /790/);
    assert.doesNotMatch(html, /\{(?:price|hours|rooms|area|travel|distance|small|large|minutes|deposit)\}/);
    const fromRow = html.match(/<tr[^>]*data-price-type="from"[^>]*>([\s\S]*?)<\/tr>/)[1];
    assert.ok(decode(fromRow).includes(publicPriceText(language, 'reviewFixed')));
  }
});

test('end-of-tenancy pages and structured data use new area caps and the same room-only excess rule', () => {
  for (const language of languages) {
    const html = decode(renderEnd(language));
    const rows = getEndOfTenancyOfferRows(language);
    assert.deepEqual(rows.map(row => row.maxAreaM2), [50, 75, 100, 125, 150]);
    assert.ok(html.includes(publicEndPriceRules(language)));
    assert.ok(html.includes(publicPriceText(language, 'vat')));
    assert.doesNotMatch(html, /\{(?:rate|excess|rooms)\}/);
    const seo = getPageSeo('/umzugsreinigung/zuerich', language), service = seo.structuredData.find(node => node['@type'] === 'Service');
    assert.deepEqual(service.offers.map(offer => offer.price), rows.map(row => (row.priceCents / 100).toFixed(2)));
    assert.ok(JSON.stringify(seo.structuredData).includes(publicEndPriceRules(language)));
    assert.ok(seo.description.includes('450'));
  }
});

test('moving SEO publishes only actual minima/fixed offers, with dynamic priceRange and translated conditions', () => {
  for (const language of languages) {
    const seo = getPageSeo('/kleinumzug/zuerich', language), service = seo.structuredData.find(node => node['@type'] === 'Service');
    assert.ok(seo.description.includes('95')); assert.ok(seo.description.includes('60'));
    assert.deepEqual(service.offers.map(offer => offer.price), ['250.00', '495.00', '540.00', '790.00']);
    assert.equal(service.offers.some(offer => offer.price === '1150.00'), false);
    assert.equal(service.offers[0].priceSpecification.price, '95.00');
    assert.equal(service.offers[0].eligibleDuration.minValue, 2);
    assert.ok(service.offers.every(offer => offer.description.includes(publicPriceText(language, 'vat'))));
    const business = seo.structuredData.find(node => node['@type'] === 'LocalBusiness');
    assert.ok(business.priceRange.includes('95.00')); assert.ok(business.priceRange.includes('250.00'));
  }
});

test('homepage and services expose the shared price guide, with a direct hero CTA before the weather control', () => {
  for (const language of languages) {
    const home = renderHome(language);
    const services = renderServices(language);
    assert.ok(home.includes('id="home-prices-title"'));
    assert.ok(services.includes('id="services-prices-title"'));
    assert.equal((home.match(/data-public-price-service=/g) || []).length, 5);
    assert.equal((services.match(/data-public-price-service=/g) || []).length, 5);
    const action = home.match(/<a class="[^"]*hero-primary-action[^"]*" href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
    assert.ok(action);
    assert.ok(action[2].includes(homeText(language, 'Umzugsreinigung berechnen')));
    assert.ok(home.indexOf('hero-primary-action') < home.indexOf('id="sceneOpen"'));
    const url = new URL(decode(action[1]), 'https://krakenpfm.ch');
    assert.equal(url.pathname, (language === 'de' ? '' : '/' + language) + '/offerte');
    assert.equal(url.searchParams.get('lang'), null);
    assert.equal(url.searchParams.get('service'), 'end');
  }
});
