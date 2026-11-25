import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { I18nProvider, useTranslation } from '../i18n.ts';
import { languageFromSearch, languageSelectionUrl, localizedNavigationUrl, normalizeSiteLanguage, resolveSiteLanguage, restoredLanguageUrl } from '../src/locale.ts';
import { publicHref, pathLanguage } from '../src/routing/site-paths.ts';
import { getPageSeo } from '../src/seo/metadata.ts';

test('URL language and hl override saved preferences, including homepage and regional aliases', () => {
  for (const language of ['de', 'en', 'fr', 'it', 'es', 'pt'] as const) {
    assert.equal(resolveSiteLanguage({ search: `?lang=${language}`, saved: 'de-CH' }), language);
    assert.equal(resolveSiteLanguage({ search: `?hl=${language}`, saved: 'de-CH' }), language);
  }
  assert.equal(resolveSiteLanguage({ search: '?lang=invalid&hl=fr-CH', saved: 'es' }), 'fr');
  assert.equal(resolveSiteLanguage({ search: '?lang=DE-ch', saved: 'es' }), 'de-CH');
  assert.equal(resolveSiteLanguage({ saved: 'pt', browserLanguage: 'de-CH' }), 'pt');
  assert.equal(resolveSiteLanguage({ browserLanguage: 'de-DE' }), 'de');
  assert.equal(resolveSiteLanguage(), 'de-CH');
  assert.equal(normalizeSiteLanguage('constructor'), null);
  assert.equal(normalizeSiteLanguage('https://example.com'), null);
});

test('language choice preserves unrelated query and hash, and removes a stale hl alias', () => {
  const next = languageSelectionUrl('https://krakenpfm.ch/?hl=de&utm_source=referral#leistungen', 'es');
  const url = new URL(next, 'https://krakenpfm.ch');
  assert.equal(url.pathname, '/es/');
  assert.equal(pathLanguage(url.href), 'es');
  assert.equal(url.searchParams.has('hl'), false);
  assert.equal(url.searchParams.get('utm_source'), 'referral');
  assert.equal(url.hash, '#leistungen');
});

test('restored language matches the visible URL and metadata while preserving booking data and explicit choices', () => {
  const origin = 'https://krakenpfm.ch';
  const source = new URL('/quote?service=windows&draft=test%2Bdraft%26value&booking=b1&utm_source=a&utm_source=b#resume=opaque', origin);
  for (const language of ['en', 'es', 'fr', 'it', 'pt'] as const) {
    const resolved = resolveSiteLanguage({ search: source.search, saved: language });
    const restored = new URL(restoredLanguageUrl(source.href, resolved)!, origin);
    assert.equal(restored.pathname, publicHref('/offerte', language));
    assert.equal(restored.hash, source.hash);
    assert.equal(pathLanguage(restored.href), language);
    for (const key of new Set(source.searchParams.keys())) {
      assert.deepEqual(restored.searchParams.getAll(key), source.searchParams.getAll(key), key);
    }
    const visible = getPageSeo(restored.pathname + restored.search);
    const selected = getPageSeo(source.pathname + source.search, language);
    assert.equal(visible.title, selected.title);
    assert.equal(visible.canonical, selected.canonical);
    assert.equal(visible.language, selected.language);
    assert.equal(restoredLanguageUrl(restored.href, language), null);
    const publicSource = origin + '/einsatzgebiete?service=windows&utm_source=a#regions';
    const publicRestored = new URL(restoredLanguageUrl(publicSource, language)!, origin);
    const publicMeta = getPageSeo(publicRestored.href);
    assert.equal(publicMeta.canonical, origin + publicHref('/einsatzgebiete', language));
    assert.equal(publicMeta.title, getPageSeo('/einsatzgebiete', language).title);
    assert.equal(publicRestored.searchParams.get('service'), 'windows');
    assert.equal(publicRestored.hash, '#regions');
  }
  for (const query of ['?lang=es', '?hl=fr', '?lang=de-CH', '?lang=EN-us', '?lang=es&hl=fr']) {
    assert.equal(restoredLanguageUrl(origin + '/about' + query + '#story-kraken', 'pt'), null, query);
  }
  assert.equal(restoredLanguageUrl(source.href, 'de'), null);
  assert.equal(restoredLanguageUrl(source.href, 'de-CH'), null);
});

test('booking and recovery context stays on its route during navigation', () => {
  const source = 'https://krakenpfm.ch/quote?lang=es&booking=b1&draft=d1&guide=1&payment=success&utm_source=test#resume=opaque';
  const next = new URL(localizedNavigationUrl('/kontakt', source, 'es'), 'https://krakenpfm.ch');
  for (const key of ['booking', 'draft', 'guide', 'payment']) assert.equal(next.searchParams.has(key), false);
  assert.equal(next.searchParams.get('utm_source'), 'test');
  assert.equal(pathLanguage(next.href), 'es');
  assert.equal(next.hash, '');
  assert.match(languageSelectionUrl(source, 'fr'), /#resume=opaque$/);
});

test('calculator navigation carries the active locale even without storage and merges target queries once', () => {
  for (const language of ['de', 'en', 'fr', 'it', 'es', 'pt'] as const) {
    const route = localizedNavigationUrl('/quote', 'https://krakenpfm.ch/?lang=de-CH#leistungen', language);
    assert.equal(route, publicHref('/offerte', language));
    assert.equal(pathLanguage(route) || 'de', language);
  }
  const merged = new URL(localizedNavigationUrl('/quote?step=2&service=moving#details', 'https://krakenpfm.ch/?hl=de&step=1&utm=a&utm=b', 'fr'), 'https://krakenpfm.ch');
  assert.equal(merged.pathname, '/fr/offerte');
  assert.equal(pathLanguage(merged.href), 'fr');
  assert.equal(merged.searchParams.get('step'), '2');
  assert.equal(merged.searchParams.get('service'), 'moving');
  assert.deepEqual(merged.searchParams.getAll('utm'), ['a', 'b']);
  assert.equal(merged.searchParams.has('hl'), false);
  assert.equal(merged.hash, '#details');
  assert.equal(localizedNavigationUrl('/quote?lang=it', 'https://krakenpfm.ch/?lang=es', 'fr'), '/it/offerte');
  assert.throws(() => localizedNavigationUrl('//other.example/quote', 'https://krakenpfm.ch/', 'es'));
});

test('provider starts in the homepage URL language even when storage access is blocked', () => {
  const previousWindow = globalThis.window;
  const Probe = () => React.createElement('span', null, useTranslation().language);
  try {
    globalThis.window = {
      location: { pathname: '/', search: '?lang=es' },
      get localStorage() { throw new Error('Storage blocked'); }
    } as unknown as Window & typeof globalThis;
    assert.match(renderToString(React.createElement(I18nProvider, null, React.createElement(Probe))), />es<\/span>/);
    globalThis.window = {
      location: { pathname: '/', search: '' },
      localStorage: { getItem: () => 'fr' }
    } as unknown as Window & typeof globalThis;
    assert.match(renderToString(React.createElement(I18nProvider, null, React.createElement(Probe))), />fr<\/span>/);
  } finally { globalThis.window = previousWindow; }
});
