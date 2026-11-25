import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { readFileSync, existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { publicHref, pathLanguage } from '../src/routing/site-paths.ts';
import { calculatorCta } from '../src/home/cta.ts';
import { getRegionalPageMetadata } from '../src/seo/regional-metadata.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const languages = ['de', 'en', 'es', 'pt', 'it', 'fr'];
const locales = Object.fromEntries(languages.map(language => [language, JSON.parse(readFileSync(path.join(root, `src/seo/regions/${language}.json`), 'utf8'))]));
const cache = path.join(root, 'node_modules/.cache');
mkdirSync(cache, { recursive: true });
const temporary = mkdtempSync(path.join(cache, 'regional-content-test-'));
let render;
try {
  const outfile = path.join(temporary, 'render.cjs');
  await build({
    stdin: { contents: `import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {LocalSeoContent} from './components/LocalSeoContent.tsx';import {resolveLocalSeoRoute} from './src/seo/local-content.ts';export const render=(pathname,language)=>renderToStaticMarkup(React.createElement(LocalSeoContent,{route:resolveLocalSeoRoute(pathname),language}));`, resolveDir: root, loader: 'tsx' },
    outfile, bundle: true, platform: 'node', format: 'cjs', packages: 'external', loader: { '.css': 'empty' }, logLevel: 'warning',
  });
  render = createRequire(import.meta.url)(outfile).render;
} finally { rmSync(temporary, { recursive: true, force: true }); }
const escapeHtml = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#x27;');
function publicCopy(page) {
  return [page.eyebrow, page.h1, ...page.intro, ...page.heroFacts, page.servicesTitle, page.servicesIntro,
    ...page.services.flatMap(item => [item.title, item.body]), page.planning.title, page.planning.intro,
    ...page.planning.steps.flatMap(item => [item.title, item.body]), page.why.title, page.why.body,
    ...page.why.points.flatMap(item => [item.title, item.body]), page.localResourcesTitle,
    ...page.localResources.flatMap(item => [item.label, item.description]), page.faqTitle,
    ...page.faqs.flatMap(item => [item.question, item.answer]), page.closing.title, page.closing.body];
}

test('the three distinct approved German articles retain every source field', () => {
  const source = JSON.parse(readFileSync(path.join(root, 'reference/local-seo-footer/content/locations.de.json'), 'utf8'));
  source.pages[0].why.body = source.pages[0].why.body.replace('Sie brauchen keine umfangreiche Hausbetreuung zu buchen, wenn Sie eine konkrete Aufgabe abgeben möchten.', 'Auch einzelne Reinigungsaufgaben und kleine Aufträge sind willkommen.');
  assert.deepEqual(locales.de, source.pages);
  assert.equal(new Set(locales.de.map(page => page.intro[0])).size, 3);
  assert.equal(new Set(locales.de.map(page => page.planning.title)).size, 3);
});

test('all 18 regional articles expose complete translated copy and matching metadata before JavaScript', () => {
  for (const language of languages) {
    for (const [index, page] of locales[language].entries()) {
      const html = render(page.slug, language);
      assert.equal((html.match(/<h1\b/g) || []).length, 1, `${language} ${page.id}`);
      assert.ok(html.includes(escapeHtml(page.h1)));
      for (const source of publicCopy(page)) assert.ok(html.includes(escapeHtml(source)), `${language}/${page.id}: ${source}`);
      const approved = locales.de[index];
      assert.equal(page.id, approved.id);
      assert.equal(page.slug, approved.slug);
      assert.deepEqual(page.services.map(item => item.id), approved.services.map(item => item.id));
      assert.deepEqual(page.localResources.map(({ url, sourceId }) => ({ url, sourceId })), approved.localResources.map(({ url, sourceId }) => ({ url, sourceId })));
      if (language !== 'de') publicCopy(page).forEach((text, field) => assert.notEqual(text, publicCopy(approved)[field], `${language}/${page.id} untranslated field ${field}`));
      const metadata = getRegionalPageMetadata(page.slug, language);
      assert.deepEqual({ title: metadata.title, description: metadata.description, h1: metadata.h1 }, { title: page.seo.title, description: page.seo.description, h1: page.h1 });
      assert.deepEqual(metadata.faqs, page.faqs);
      assert.equal((html.match(/type="checkbox"/g) || []).length, 4);
      assert.match(html, /<progress[^>]*value="0"/);
      assert.match(html, /Europe\/Zurich/);
      assert.doesNotMatch(html, /data-calculator|data-service=|localStorage|<iframe|<script|city=|offerCount|AggregateOffer/);
      for (const source of html.matchAll(/src="([^"]+)"/g)) assert.ok(existsSync(path.join(root, 'public', source[1])), source[1]);
    }
  }
});

test('regional service links use existing calculator keys and chosen language in real native hrefs', () => {
  const calculatorKeys = ['windows', 'end', 'regular', 'deep', 'moving'];
  const serviceIds = ['window-cleaning', 'end-of-tenancy', 'daily-cleaning', 'deep-cleaning', 'moving-furniture'];
  for (const language of languages) for (const page of locales[language]) {
    const html = render(page.slug, language);
    const quoteLinks = [...html.matchAll(/href="([^"]*)"/g)].map(match => new URL(match[1].replaceAll('&amp;', '&'), 'https://krakenpfm.ch')).filter(url => url.pathname.endsWith('/offerte'));
    for (const url of quoteLinks) assert.equal(pathLanguage(url.href) || 'de', language);
    assert.deepEqual(quoteLinks.map(url => url.searchParams.get('service')).filter(Boolean).sort(), calculatorKeys.toSorted());
    for (const id of serviceIds) {
      assert.ok(html.includes(`href="#${id}"`));
      assert.match(html, new RegExp(`<details[^>]*id="${id}"`));
      assert.ok(html.includes(publicHref(`/services/${page.id === 'zuerich' ? 'zurich' : page.id}/${id}`, language)));
    }
    for (const resource of page.localResources) assert.ok(html.includes(`href="${escapeHtml(resource.url)}"`));
  }
});

test('the area index links all three real regions and all fifteen preserved service routes in six languages', () => {
  for (const language of languages) {
    const html = render('/einsatzgebiete', language);
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
    for (const page of locales[language]) {
      assert.ok(html.includes(publicHref(page.slug, language)));
      for (const service of page.services) assert.ok(html.includes(escapeHtml(service.title)));
    }
    const serviceIds = { windows: 'window-cleaning', moveout: 'end-of-tenancy', regular: 'daily-cleaning', deep: 'deep-cleaning', moving: 'moving-furniture' };
    for (const page of locales[language]) for (const service of page.services) assert.ok(html.includes(publicHref(`/services/${page.id === 'zuerich' ? 'zurich' : page.id}/${serviceIds[service.id]}`, language)));
    assert.match(html, /Seewadelstrasse 3/);
    assert.match(html, /8203 Schaffhausen/);
    assert.match(html, /href="tel:\+41774505705"/);
    assert.match(html, /href="mailto:kai@krakenpfm.ch"/);
  }
});

// Native destinations retain their existing service and locale while their action copy is unified.
test('all regional, coverage and service calculator links share the approved CTA catalogue',()=>{
  for(const language of languages) {
    const paths=['/einsatzgebiete',...locales[language].map(page=>page.slug),'/services/zurich/end-of-tenancy','/services/winterthur/deep-cleaning'];
    for(const pathname of paths) {
      const html=render(pathname,language).replace(/<section[^>]*class="[^"]*local-seo-price-plan[^"]*"[\s\S]*?<\/section>/g,'');
      const links=[...html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)];
      const calculatorLinks=links.map(([,href,label])=>({url:new URL(href.replaceAll('&amp;','&'),'https://krakenpfm.ch'),label})).filter(({url})=>url.pathname.endsWith('/offerte'));
      assert.ok(calculatorLinks.length>0);
      for(const {url,label} of calculatorLinks) {
        const visible=label.replace(/<[^>]*>/g,'').replace(/\s*→\s*$/,'').trim();
        assert.equal(visible,escapeHtml(calculatorCta(language,url.searchParams.get('service')||undefined)),pathname+' '+language);
      }
    }
  }
});
