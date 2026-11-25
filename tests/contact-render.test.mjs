import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getMetadataForPath } from '../seoConfig.ts';
import { getApprovedPageMetadata } from '../src/seo/local-metadata.ts';
import { getContactCopy } from '../src/contact/contact-copy.ts';
import { getPageSeo } from '../src/seo/metadata.ts';
import { homeText } from '../components/home/homeTranslations.ts';
import { publicHref } from '../src/routing/site-paths.ts';

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

const escape = value => value.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#x27;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
test('redesigned contact renders native enquiry, coverage and direct destinations in six languages', () => {
  for (const language of languages) {
    const html = render(language), copy=getContactCopy(language);
    assert.equal((html.match(/<h1\b/g)||[]).length,1);
    for(const text of [copy.hero.title,copy.hero.intro,copy.hero.hours,copy.person.name,copy.person.role,...copy.faqs.flatMap(faq=>[faq.question,faq.answer])])assert.ok(html.includes(escape(text)),language+': '+text);
    assert.match(html,/href="tel:\+41774505705"/);
    assert.match(html,/href="https:\/\/wa.me\/41774505705"/);
    assert.match(html,/href="mailto:kai@krakenpfm.ch"/);
    assert.ok(html.includes('href="'+publicHref('/quote',language)+'"'));
    assert.ok(html.includes('href="'+publicHref('/gdpr',language)+'"'));
    assert.ok(html.indexOf('contact-message-section')<html.indexOf('kr-contact-coverage'));
    assert.ok(html.indexOf('contact-intro-hours')<html.indexOf('contact-message-section'));
    assert.match(html,/coverage-region\.svg/);
    assert.match(html,/swisstopo/);
    assert.match(html,/name="postalCode"/);
    const phone=html.match(/<input[^>]*name="phone"[^>]*>/)?.[0];
    assert.ok(phone&&!phone.includes('required'));
    assert.doesNotMatch(html,/contact-(?:exterior|interior|marker)\.webp|Europe\/Zurich|kr-result|kr-geography|kr-gallery|<iframe|data:image\/|(?:CHF|EUR)\s*\d|name="subject"|contact-response-time/);
  }
});

test('contact production canonicals, alternates and metadata follow the selected language', () => {
  for(const language of languages){
    const path=publicHref('/kontakt',language),meta=getPageSeo(path,language),copy=getContactCopy(language);
    assert.equal(meta.canonical,'https://krakenpfm.ch'+path);
    assert.equal(meta.title,copy.meta.title);
    assert.equal(meta.h1,copy.hero.title);
    assert.equal(meta.hreflangs.length,7);
    assert.ok(meta.hreflangs.some(alt=>alt.lang==='x-default'));
  }
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
