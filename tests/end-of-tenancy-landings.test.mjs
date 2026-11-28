import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { calculatePrice, defaultSelection, END_OF_TENANCY_TIERS } from '../src/booking/pricing.ts';
import { getEndOfTenancyMetadata, getEndOfTenancyOfferRows } from '../src/seo/end-of-tenancy-metadata.ts';
import { getEndOfTenancyIntro } from '../src/seo/end-of-tenancy-copy.ts';
import { getPublicPriceOffers } from '../src/booking/publicPricing.ts';
import { publicHref } from '../src/routing/site-paths.ts';
import { LOCAL_SERVICES } from '../src/seo/local-content.ts';
import { localText } from '../src/seo/local-translations.ts';
import {publicPolicyContent} from '../src/kai/policyContent.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const languages = ['de', 'en', 'es', 'pt', 'it', 'fr'];
const cityIds = ['zurich', 'schaffhausen', 'winterthur'];
const bundled = await build({
  stdin: { contents: `import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {LocalSeoContent} from './components/LocalSeoContent.tsx';export const render=(cityId,language,serviceId='end-of-tenancy')=>renderToStaticMarkup(<LocalSeoContent route={{kind:'service',cityId,serviceId}} language={language}/>);`, resolveDir: root, loader: 'tsx' },
  bundle: true, platform: 'node', format: 'cjs', packages: 'external', write: false, loader: { '.css': 'empty' }, logLevel: 'warning',
});
const mod = { exports: {} };
new Function('require', 'module', 'exports', bundled.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports);
const { render } = mod.exports;
const escaped = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#x27;');
const money = (cents, locale) => new Intl.NumberFormat(locale === 'de' ? 'de-CH' : locale, { style: 'currency', currency: 'CHF', currencyDisplay: 'code', minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);

test('all advertised apartment tiers and Offer prices are calculated by the booking engine', () => {
  for (const language of languages) {
    const rows = getEndOfTenancyOfferRows(language);
    assert.equal(rows.length, END_OF_TENANCY_TIERS.length);
    rows.forEach((row, index) => {
      const tier = END_OF_TENANCY_TIERS[index];
      assert.deepEqual(row.selection, { ...defaultSelection('endOfTenancy'), rooms: tier.rooms, areaM2: tier.maxAreaM2 });
      const quote = calculatePrice(row.selection);
      assert.equal(row.priceCents, quote.totalCents);
      assert.equal(row.price, (quote.totalCents / 100).toFixed(2));
      assert.equal(row.priceCurrency, quote.currency);
      assert.equal(row.pricingVersion, quote.pricingVersion);
      assert.equal(row.selection.heavySoiling, false);
      assert.equal(row.selection.bathrooms, 1);
    });
  }
  const source = readFileSync(path.join(root, 'src/seo/end-of-tenancy-copy.ts'), 'utf8') + readFileSync(path.join(root, 'components/EndOfTenancyLanding.tsx'), 'utf8');
  assert.doesNotMatch(source, /(?:CHF|priceCents:)\s*\d/);
});

test('18 city/language landings have unique visible copy, all FAQ answers, current AGB conditions and native preselection', () => {
  const germanIntro = cityIds.map(city => getEndOfTenancyIntro(city, 'de').join(' '));
  assert.equal(new Set(germanIntro).size, 3);
  for (const language of languages) for (const cityId of cityIds) {
    const metadata = getEndOfTenancyMetadata(cityId, language);
    const html = render(cityId, language);
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
    assert.ok(html.includes(escaped(metadata.h1)));
    for (const intro of getEndOfTenancyIntro(cityId, language)) assert.ok(html.includes(escaped(intro)));
    for (const faq of metadata.faqs) {
      assert.ok(html.includes(escaped(faq.question)));
      assert.ok(html.includes(escaped(faq.answer)));
    }
    const guarantee = publicPolicyContent(language).guarantee;
    assert.ok(html.includes(escaped(guarantee)), `AGB source mismatch: ${cityId}/${language}`);
    const prices = getEndOfTenancyOfferRows(language);
    for (const price of prices) assert.ok(html.includes(escaped(money(price.priceCents, language))));
    const hrefs = [...html.matchAll(/href="([^"]*)"/g)].map(match => match[1].replaceAll('&amp;', '&'));
    const quoteLinks = hrefs.filter(href => new URL(href, 'https://krakenpfm.ch').pathname.endsWith('/offerte'));
    assert.ok(quoteLinks.length >= 3);
    for (const href of quoteLinks) assert.equal(href, publicHref('/quote?service=end', language));
    assert.ok(html.includes(`href="${publicHref('/terms', language)}"`));
    assert.match(html, /Seewadelstrasse 3/);
    assert.match(html, /8203 Schaffhausen/);
    assert.match(html, /09:00–19:00/);
    assert.doesNotMatch(html, /localStorage|data-calculator|data-service=|AggregateRating|100%|10 Millionen|<iframe|weather|seasons-window/);
    assert.ok(html.replace(/<[^>]+>/g, ' ').length > 6500);
  }
  assert.deepEqual(getEndOfTenancyMetadata('zurich', 'de'), getEndOfTenancyMetadata('zuerich', 'de'));
  assert.equal(getEndOfTenancyMetadata('invented-office', 'de'), null);
});

test('Zurich addresses access, Verwaltung, official districts and request-only surrounding municipalities', () => {
  const html = render('zurich', 'de');
  assert.ok(html.includes('<h1 id="eot-title">Was kostet eine Umzugsreinigung in Zürich?</h1>'));
  for (const keyword of ['Endreinigung', 'Wohnungsabgabe', 'Verwaltung', 'Festpreis', 'Reinigungsfirma', 'Kosten', 'Lift', 'Kloten', 'Opfikon', 'Uster']) assert.ok(html.includes(keyword), keyword);
  for (let district = 1; district <= 12; district++) assert.ok(html.includes(`Kreis ${district}</li>`));
  assert.ok(html.includes('href="https://www.stadt-zuerich.ch/kreise-und-quartiere"'));
  assert.ok(html.includes('Die Einsatzmöglichkeit und Ihren Termin bestätigen wir nach Prüfung Ihrer Angaben.'));
});

test('the remaining twelve service pages retain their useful copy and show only calculator-derived prices', () => {
  for (const city of cityIds) for (const service of LOCAL_SERVICES.filter(item => item.id !== 'end-of-tenancy')) {
    const offer = getPublicPriceOffers().find(item => item.service === service.calculatorService);
    for (const language of languages) {
      const html = render(city, language, service.id);
      assert.ok(html.includes(escaped(localText(language, service.description))), `${city}/${service.id}/${language}`);
      assert.ok(html.includes(`data-public-price-service="${service.calculatorService}"`));
      if (offer.minimumCents !== null) assert.ok(html.includes(escaped(money(offer.hourlyRateCents ?? offer.minimumCents, language))));
      else assert.equal(service.calculatorService, 'moving');
      assert.doesNotMatch(html, /<img[^>]*class="local-seo-hero-image"[^>]*alt=""/);
    }
  }
});
