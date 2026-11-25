import assert from 'node:assert/strict';
import test from 'node:test';
import { injectPageSeo, escapeSeoHtml } from '../src/seo/html.ts';
import { getPageSeo } from '../src/seo/metadata.ts';

const template = '<html lang="de-CH"><head><title>Old title</title><meta name="description" content="Old"><meta property="og:url" content="https://krakenpfm.ch/"><meta name="robots" content="index, follow"><link rel="canonical" href="https://invalid.example"><script type="application/ld+json">{"@type":"AggregateRating","ratingValue":"5"}</script></head><body><main>Actual content</main></body></html>';

test('HTTP metadata matches the actual local page, with escaped attributes and one canonical/schema', () => {
  const path = '/services/zurich/window-cleaning?lang=fr';
  const meta = getPageSeo(path);
  const html = injectPageSeo(template, path);
  assert.ok(html.includes(`<title>${escapeSeoHtml(meta.title)}</title>`));
  assert.ok(html.includes(`name="description" content="${escapeSeoHtml(meta.description)}"`));
  assert.ok(html.includes(`property="og:url" content="${meta.canonical}"`));
  assert.ok(html.includes(`rel="canonical" href="${meta.canonical}"`));
  assert.equal((html.match(/rel="canonical"/g) || []).length, 1);
  assert.equal((html.match(/type="application\/ld\+json"/g) || []).length, 1);
  assert.match(html, /<html lang="fr"/);
  assert.doesNotMatch(html, /AggregateRating|invalid\.example|Old title/);
  assert.ok(html.includes('<main>Actual content</main>'));
  assert.equal(meta.canonical, 'https://krakenpfm.ch/fr/fensterreinigung/zuerich');
  const alternates = [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)">/g)].map(([, lang, href]) => ({ lang, href }));
  assert.deepEqual(alternates, meta.hreflangs);
  assert.equal(alternates.length, 7);
  assert.equal(injectPageSeo(html, path), html);
});

test('saved booking and account pages cannot acquire an indexable head or leak capabilities into schema', () => {
  for (const path of ['/quote?booking=private-example', '/quote?draft=private-example', '/customer-access?oobCode=private-example', '/login', '/quote-demo']) {
    const html = injectPageSeo(template, path, 'es');
    assert.match(html, /name="robots" content="noindex, follow"/);
    const schema = JSON.parse(html.match(/<script id="kraken-page-schema" type="application\/ld\+json">([\s\S]*?)<\/script>/)![1]);
    assert.deepEqual(schema['@graph'], []);
    assert.doesNotMatch(html, /hreflang=/);
    assert.doesNotMatch(html, /private-example/);
  }
});

test('language switches replace stale alternate links with the same reciprocal set as SSR', () => {
  const old = template.replace('</head>', '<link rel="alternate" hreflang="xx" href="https://invalid.example/"></head>');
  const html = injectPageSeo(old, '/leistungen?lang=es');
  assert.doesNotMatch(html, /invalid\.example|hreflang="xx"/);
  const links = [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)">/g)].map(([, lang, href]) => ({ lang, href }));
  assert.deepEqual(links, getPageSeo('/leistungen?lang=fr').hreflangs);
  assert.ok(html.includes('rel="canonical" href="https://krakenpfm.ch/es/leistungen"'));
});

test('SEO text cannot terminate attributes or inject HTML', () => {
  assert.equal(escapeSeoHtml('"</title><script>&\''), '&quot;&lt;/title&gt;&lt;script&gt;&amp;&#39;');
  const html = injectPageSeo(template, '/?lang=de');
  assert.match(html, /Umzugsreinigung Zürich/);
  assert.doesNotMatch(html, /og:locale" content="(?:en_US|es_ES|pt_PT|fr_FR|it_IT)/);
});
