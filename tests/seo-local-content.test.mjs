import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getLocalSeoDescriptor, LOCAL_CITIES, LOCAL_SERVICES, localHref } from '../src/seo/local-content.ts';
import { localText, localTranslationSources } from '../src/seo/local-translations.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cache = path.join(root, 'node_modules/.cache');
mkdirSync(cache, { recursive: true });
const temporary = mkdtempSync(path.join(cache, 'local-seo-test-'));
const languages = ['de', 'en', 'es', 'pt', 'it', 'fr'];
let render;
try {
  const outfile = path.join(temporary, 'render.cjs');
  await build({
    stdin: { contents: `import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {LocalSeoContent} from './components/LocalSeoContent.tsx';import {resolveLocalSeoRoute} from './src/seo/local-content.ts';export const render=(pathname,language)=>renderToStaticMarkup(React.createElement(LocalSeoContent,{route:resolveLocalSeoRoute(pathname),language}));`, resolveDir: root, loader: 'tsx' },
    outfile, bundle: true, platform: 'node', format: 'cjs', packages: 'external', loader: { '.css': 'empty' }, logLevel: 'warning',
  });
  render = createRequire(import.meta.url)(outfile).render;
} finally { rmSync(temporary, { recursive: true, force: true }); }

const indexedPaths = ['/einsatzgebiete', ...LOCAL_CITIES.flatMap(city => [city.regionPath, ...LOCAL_SERVICES.map(service => `/services/${city.id}/${service.id}`)])];

test('all 19 local landing pages expose substantive, factual HTML before JavaScript', () => {
  for (const pathname of indexedPaths) {
    const descriptor = getLocalSeoDescriptor(pathname, 'de');
    const html = render(pathname, 'de');
    assert.equal(descriptor.indexable, true, pathname);
    assert.equal((html.match(/<h1\b/g) || []).length, 1, pathname);
    assert.ok(html.includes(descriptor.h1), pathname);
    assert.match(html, /1–4/);
    assert.match(html, /Seewadelstrasse 3/);
    assert.match(html, /8203 Schaffhausen/);
    assert.match(html, /href="tel:\+41774505705"/);
    assert.match(html, /href="mailto:kai@krakenpfm.ch"/);
    assert.match(html, /09:00–19:00/);
    assert.doesNotMatch(html, /(?:CHF|EUR)\s*\d|99\.4%|zertifizier|GAV-konform|CO2|10 Millionen|Abnahmegarantie|offerCount|AggregateOffer/);
    assert.doesNotMatch(html, /<script|<button|Reaktionszeit|Schweizer Meisterklasse/);
    assert.ok(html.replace(/<[^>]+>/g, ' ').length > 1800, pathname);
  }
});

test('service selections and language survive native calculator links without browser storage', () => {
  for (const language of languages) {
    for (const service of LOCAL_SERVICES) {
      const html = render(`/services/zurich/${service.id}`, language);
      assert.ok(html.includes(localText(language, service.description)), language + ': ' + service.id);
      const quoteLinks = [...html.matchAll(/href="(\/quote[^"#]*)"/g)].map(match => new URL(match[1].replaceAll('&amp;', '&'), 'https://krakenpfm.ch'));
      assert.ok(quoteLinks.length >= 2);
      for (const url of quoteLinks) {
        assert.equal(url.searchParams.get('lang'), language);
        assert.equal(url.searchParams.get('service'), service.calculatorService);
      }
      assert.doesNotMatch(html, /localStorage|kraken_consultation_data/);
    }
  }
});

test('region hubs contain real service fragments and crawlable paths for the confirmed cities', () => {
  for (const city of LOCAL_CITIES) {
    const html = render(city.regionPath, 'en');
    for (const service of LOCAL_SERVICES) {
      assert.ok(html.includes(`id="${service.id}"`), city.id + ': ' + service.id);
      assert.ok(html.includes(`href="#${service.id}"`));
      assert.ok(html.includes(`/services/${city.id}/${service.id}?lang=en`));
    }
    assert.match(html, /href="\/einsatzgebiete\?lang=en"/);
    assert.match(html, /href="\/leistungen\?lang=en"/);
  }
  assert.equal(localHref('/leistungen#kleine-umzuege', 'fr'), '/leistungen?lang=fr#kleine-umzuege');
});

test('secondary municipalities and obsolete service routes request confirmation without inventing local availability', () => {
  for (const pathname of ['/reinigung/neuhausen-am-rheinfall', '/reinigung/stein-am-rhein', '/services/neuhausen/window-cleaning', '/services/zurich/pest-control']) {
    const descriptor = getLocalSeoDescriptor(pathname, 'en');
    const html = render(pathname, 'en');
    assert.equal(descriptor.indexable, false, pathname);
    assert.match(html, /This location page does not confirm an available appointment/);
    assert.doesNotMatch(html, /(?:CHF|EUR)\s*\d|certified|guarantee|local crew|branch|office in/i);
    for (const service of LOCAL_SERVICES) assert.ok(html.includes(`id="${service.id}"`));
  }
});

test('all local planning and FAQ copy has six complete language variants', () => {
  assert.equal(new Set(localTranslationSources).size, localTranslationSources.length);
  for (const source of localTranslationSources) {
    for (const language of languages) {
      assert.ok(localText(language, source).trim(), language + ': ' + source);
      if (language !== 'de' && source !== 'Region') assert.notEqual(localText(language, source), source, language + ': ' + source);
    }
  }
  const moving = render('/services/schaffhausen/moving-furniture', 'en');
  for (const dimension of ['255.5 cm', '177.5 cm', '140.6 cm', '139 cm']) assert.ok(moving.includes(dimension));
  assert.match(moving, /Door openings, furniture measurements and packing affect what fits/);
  assert.doesNotMatch(moving, /guaranteed capacity|one trip guaranteed/i);
});
