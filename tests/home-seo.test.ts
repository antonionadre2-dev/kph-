import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { getMetadataForPath } from '../seoConfig.ts';
import { getPageSeo } from '../src/seo/metadata.ts';
import { publicHref } from '../src/routing/site-paths.ts';
import { getApprovedPageMetadata } from '../src/seo/local-metadata.ts';
import { homeText, normalizeHomeLanguage } from '../components/home/homeTranslations.ts';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('the approved homepage exposes each translated page at its own public canonical', () => {
  for (const language of ['de', 'de-CH', 'en', 'es', 'fr', 'it', 'pt']) {
    const metadata = getPageSeo('/?lang=' + language, language);
    const locale = normalizeHomeLanguage(language);
    const approved = getApprovedPageMetadata('/', locale)!;
    assert.equal(metadata.title, approved.title);
    assert.equal(metadata.description, approved.description);
    assert.equal(getMetadataForPath('/?lang=' + language).title, metadata.title);
    assert.equal(metadata.canonical, 'https://krakenpfm.ch' + publicHref('/',locale));
    assert.equal(metadata.pageType, 'home');
    assert.equal(metadata.h1, homeText(locale, 'Umzugsreinigung Zürich'));
    assert.equal(metadata.h2, homeText(locale, 'Reinigung und kleine Umzüge in Zürich, Schaffhausen und Winterthur.'));
    assert.equal(metadata.bodyText, metadata.description);
    assert.equal(metadata.hreflangs.length, 7);
    assert.ok(metadata.hreflangs.some(item => item.lang === metadata.language && item.href === metadata.canonical));
    assert.match(metadata.description, /Zürich|Zurich|Zúrich|Zurique|Zurigo/);
    assert.match(metadata.description, /Schaffhausen|Schaffhouse|Sciaffusa/);
    assert.match(metadata.description, /Winterthur|Winterthour/);
    if (!['de', 'de-CH'].includes(language)) {
      assert.notEqual(metadata.title, getApprovedPageMetadata('/', 'de')!.title);
      assert.notEqual(metadata.description, getApprovedPageMetadata('/', 'de')!.description);
      assert.notEqual(metadata.h1, 'Umzugsreinigung Zürich');
    }
  }
  assert.equal(getMetadataForPath('/?hl=es').title, getMetadataForPath('/', 'es').title);
  assert.equal(getMetadataForPath('/', 'de-CH').title, getApprovedPageMetadata('/', 'de')!.title);
});

test('calculator metadata follows the integrated design and informational routes retain their canonicals', () => {
  const quote = getPageSeo('/quote?lang=es', 'es');
  assert.equal(quote.title, 'Calcule limpieza y mudanza | Calculador de Kraken');
  assert.equal(quote.canonical, 'https://krakenpfm.ch/es/offerte');
  assert.equal(quote.pageType, 'consultation');
  assert.equal(getPageSeo('/quote-demo', 'es').canonical, 'https://krakenpfm.ch/es/quote-demo');
  assert.equal(getPageSeo('/quote-demo', 'es').pageType, 'calculator-demo');
  assert.equal(getPageSeo('/quote-demo', 'es').indexable, false);
  const about = getPageSeo('/about', 'en');
  assert.equal(about.title, 'About Kraken: Antonio, our team & Kai | Kraken PFM');
  assert.equal(about.canonical, 'https://krakenpfm.ch/en/ueber-uns');
  assert.equal(getPageSeo('/ueber-kraken', 'en').canonical, about.canonical);
});

test('the initial HTML exposes the approved five services without fabricated prices, ratings or opening hours', () => {
  const json = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
  assert.ok(json);
  const business = JSON.parse(json);
  assert.equal(business.url, 'https://krakenpfm.ch/');
  assert.equal(business.email, 'kai@krakenpfm.ch');
  assert.deepEqual(business.areaServed.map((city: { name: string }) => city.name), ['Zürich', 'Schaffhausen', 'Winterthur']);
  assert.deepEqual(business.hasOfferCatalog.itemListElement.map((offer: { itemOffered: { name: string } }) => offer.itemOffered.name), [
    'Fensterreinigung', 'Umzugsreinigung', 'Regelmässige Reinigung', 'Grundreinigung', 'Kleine Umzüge',
  ]);
  assert.doesNotMatch(json, /"(?:priceRange|price|lowPrice|highPrice|aggregateRating|ratingValue|review|openingHours)"/);
  assert.match(html, /<html lang="de-CH">/);
  assert.match(html, /href="\/offerte\?service=end"/);
  assert.match(html, /<h1[^>]*>Umzugsreinigung Zürich/);
  assert.doesNotMatch(html, /rel="preload"[^>]+hero-room-day-v4\.webp/);
  assert.doesNotMatch(html, /imagen-google-ai-compatible-(?:mobile|desktop)\.webp/);
  assert.doesNotMatch(html, /Bändigen Sie das Chaos|All-in-One Lösung/);
});
