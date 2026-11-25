import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getMetadataForPath } from '../seoConfig.ts';
import { getApprovedPageMetadata } from '../src/seo/local-metadata.ts';
import { contactText } from '../components/contact/contactTranslations.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const languages = ['de', 'en', 'es', 'pt', 'it', 'fr'];
const cache = path.join(root, 'node_modules/.cache');
mkdirSync(cache, { recursive: true });
const temporary = mkdtempSync(path.join(cache, 'contact-render-test-'));
let render;
try {
  const outfile = path.join(temporary, 'render.cjs');
  await build({
    stdin: { contents: `import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {ContactContent} from './components/KontaktPage.tsx';export const render=language=>renderToStaticMarkup(React.createElement(ContactContent,{language,onNavigate:()=>{}}));`, resolveDir: root, loader: 'tsx' },
    outfile, bundle: true, platform: 'node', format: 'cjs', packages: 'external', loader: { '.css': 'empty' }, logLevel: 'warning',
  });
  render = createRequire(import.meta.url)(outfile).render;
} finally { rmSync(temporary, { recursive: true, force: true }); }

test('Contact initial HTML keeps verified contact information and localized calculator links without map JavaScript', () => {
  for (const language of languages) {
    const html = render(language);
    assert.equal((html.match(/<h1\b/g) || []).length, 1, language);
    assert.equal((html.match(/id="kraken-contact-real"/g) || []).length, 1, language);
    assert.match(html, /Seewadelstrasse 3/);
    assert.match(html, /8203 Schaffhausen/);
    assert.match(html, /href="tel:\+41774505705"/);
    assert.match(html, /href="mailto:kai@krakenpfm.ch"/);
    assert.match(html, /09:00/);
    assert.match(html, /19:00/);
    assert.match(html, /Europe\/Zurich/);
    assert.match(html, new RegExp(`/quote\\?lang=${language}`));
    assert.ok(html.includes(contactText(language, 'Konzeptbilder · keine Fotos des Standorts')), language);
    assert.match(html, /Properties &amp; Facilities Management/);
    assert.match(html, /swisstopo/);
    assert.match(html, /OpenStreetMap/);
    assert.match(html, /openrouteservice/);
    assert.doesNotMatch(html, /<iframe|data:image\/|(?:CHF|EUR)\s*\d/);
    assert.ok(html.includes(contactText(language, 'Näher dran.')), language);
    assert.ok(html.includes(contactText(language, 'Persönlich für Sie da.')), language);
  }
});

test('Contact metadata follows all six locales and keeps a single public canonical', () => {
  for (const language of [...languages, 'de-CH']) {
    const meta = getMetadataForPath(`/kontakt?lang=${language}`);
    assert.equal(meta.title, getApprovedPageMetadata('/kontakt', language).title);
    assert.equal(meta.h1, `${contactText(language, 'Näher dran.')} ${contactText(language, 'Persönlich für Sie da.')}`);
    assert.equal(meta.canonical, 'https://krakenpfm.ch/kontakt');
    assert.equal(meta.pageType, 'kontakt');
    assert.deepEqual(meta.hreflangs, []);
    assert.match(meta.description, /09:00/);
    assert.match(meta.description, /19:00/);
    assert.doesNotMatch(meta.description, /(?:CHF|EUR)\s*\d|GPS/);
    if (!language.startsWith('de')) assert.notEqual(meta.title, getMetadataForPath('/kontakt', 'de').title);
  }
  assert.equal(getMetadataForPath('/kontakt?hl=es').title, getMetadataForPath('/kontakt', 'es').title);
  assert.equal(getMetadataForPath('/kontakt/', 'fr').canonical, 'https://krakenpfm.ch/kontakt');
});

test('the supplied route data preserves independent examples in both directions', () => {
  const data = JSON.parse(readFileSync(path.join(root, 'public/kraken-contact/data/contact-map-data.json'), 'utf8'));
  assert.deepEqual(data.destinations.map(destination => destination.id), ['schaffhausen', 'neuhausen', 'rheinfall']);
  for (const destination of data.destinations) {
    for (const route of Object.values(destination.routes)) {
      assert.ok(Number.isFinite(route.distance_m) && route.distance_m > 0);
      assert.ok(Number.isFinite(route.duration_s) && route.duration_s > 0);
      assert.equal(route.geometry.type, 'LineString');
      assert.ok(route.geometry.coordinates.length > 1);
    }
    assert.notEqual(destination.routes.outbound.distance_m, destination.routes.inbound.distance_m);
  }
  assert.match(data.routing.note, /Precomputed route examples/);
  assert.match(data.routing.map_data, /OpenStreetMap/);
  assert.match(data.map.attribution, /swisstopo/);
});
