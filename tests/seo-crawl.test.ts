import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { BASE_URL } from '../seoConfig.ts';
import { INDEXABLE_PATHS, isIndexablePath, isPrivatePath, isPrivateUrl, renderRobotsTxt } from '../src/seo/crawl-policy.ts';
import { getPageSeo } from '../src/seo/metadata.ts';
import { generateSitemap, getSitemapUrls, renderSitemap } from '../scripts/generate-sitemap.mjs';

// Evaluate the generated robots groups using longest matching user agent/rule.
// This deliberately reads the public artifact instead of the policy constants.
function crawlAllowed(robots: string, agent: string, target: string): boolean {
  const groups: { agents: string[]; rules: { allow: boolean; value: string }[] }[] = [];
  let group = { agents: [] as string[], rules: [] as { allow: boolean; value: string }[] };
  for (const line of robots.split('\n')) {
    const match = line.replace(/#.*/, '').match(/^\s*(User-agent|Allow|Disallow):\s*(.*?)\s*$/i);
    if (!match) continue;
    const [, key, value] = match;
    if (key.toLowerCase() === 'user-agent') {
      if (group.rules.length) { groups.push(group); group = { agents: [], rules: [] }; }
      group.agents.push(value.toLowerCase());
    } else {
      group.rules.push({ allow: key.toLowerCase() === 'allow', value });
    }
  }
  if (group.agents.length) groups.push(group);
  const scored = groups.map(entry => ({
    ...entry, score: Math.max(...entry.agents.map(value => value === '*' ? 0 : agent.toLowerCase().includes(value) ? value.length : -1)),
  }));
  const score = Math.max(...scored.map(entry => entry.score));
  const matching = scored.filter(entry => entry.score === score).flatMap(entry => entry.rules).filter(rule => {
    const expression = rule.value.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replaceAll('*', '.*');
    return rule.value && new RegExp(`^${expression}`).test(target);
  }).sort((a, b) => b.value.length - a.value.length || Number(b.allow) - Number(a.allow));
  return matching[0]?.allow ?? true;
}

test('search crawlers can access public pages and assets while private workflows stay excluded', () => {
  const robots = readFileSync(new URL('../public/robots.txt', import.meta.url), 'utf8');
  assert.equal(robots, renderRobotsTxt(BASE_URL));
  for (const agent of ['Googlebot', 'Bingbot', 'OAI-SearchBot', 'ChatGPT-User', 'GPTBot']) {
    for (const route of [...INDEXABLE_PATHS, '/quote?lang=en', '/assets/app.js', '/kraken-og-1200x630.jpg']) {
      assert.equal(crawlAllowed(robots, agent, route), true, `${agent}: ${route}`);
    }
    for (const route of ['/api/booking/create', '/api/customer/config', '/api/recovery/drafts/abc', '/login', '/dashboard', '/admin', '/register', '/auth/callback', '/quote-demo', '/customer-access?lang=de', '/recovery/unsubscribe?draft=abc', '/commercial-quote', '/reviews', '/review-invite', '/reviewsvip', '/dejar-opinion', '/quote?booking=abc', '/quote?lang=en&draft=abc', '/quote?payment=success', '/quote?guide=saved', '/?lang=de&access=secret']) {
      assert.equal(crawlAllowed(robots, agent, route), false, `${agent}: ${route}`);
    }
  }
  assert.match(robots, /User-agent: OAI-SearchBot\n/);
  assert.doesNotMatch(robots, /^User-agent: GPTBot\s*$/m);
  assert.equal((robots.match(/^Sitemap: /gm) || []).length, 1);
  assert.match(robots, /Sitemap: https:\/\/krakenpfm\.ch\/sitemap\.xml\n$/);
});

test('the public calculator introduction and private capability URLs have distinct indexing policies', () => {
  assert.equal(isPrivatePath('/quote'), false);
  assert.equal(isPrivateUrl('/quote?lang=de-CH'), false);
  assert.equal(isPrivateUrl('/quote-demo?lang=de'), true);
  for (const key of ['booking', 'draft', 'access', 'accessToken', 'token', 'payment', 'guide', 'oobCode']) {
    assert.equal(isPrivateUrl(`/quote?lang=en&${key}=private`), true, key);
    assert.equal(getPageSeo(`/quote?lang=en&${key}=private`).indexable, false, key);
  }
  assert.equal(isPrivatePath('/API/customer'), true);
  assert.equal(isPrivatePath('/%61pi/customer'), true);
  assert.equal(isPrivateUrl('/customer-access?oobCode=secret'), true);
  assert.equal(isPrivateUrl('https://krakenpfm.ch/recovery/unsubscribe?draft=abc'), true);
});

test('the sitemap contains unique reviewed canonical routes that agree with response metadata', () => {
  const urls = getSitemapUrls();
  assert.equal(urls.length, 24);
  assert.equal(new Set(urls).size, urls.length);
  assert.equal(urls.filter(url => new URL(url).pathname.startsWith('/services/')).length, 15);
  for (const url of urls) {
    const parsed = new URL(url);
    assert.equal(parsed.origin, BASE_URL);
    assert.equal(parsed.search, '');
    assert.equal(parsed.hash, '');
    assert.equal(isIndexablePath(parsed.pathname), true);
    assert.equal(isPrivateUrl(url), false);
    const metadata = getPageSeo(parsed.pathname, 'de');
    assert.equal(metadata.indexable, true, parsed.pathname);
    assert.equal(metadata.canonical, url);
    assert.doesNotMatch(metadata.robots, /noindex/i);
  }
  const xml = readFileSync(new URL('../public/sitemap.xml', import.meta.url), 'utf8');
  assert.equal(xml, renderSitemap());
  assert.deepEqual([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]), urls);
  assert.doesNotMatch(xml, /lastmod|priority|changefreq|hreflang|\?lang=|\/quote-demo|\/services\/neuhausen\//);
});

test('sitemap generation rejects unknown, duplicate, alias, private and unreviewed routes', () => {
  for (const route of ['/missing-page', '/quote-demo', '/quote?booking=private', '/quote#draft', '/ueber-kraken', '/services', '/services/zurich/pest-control', '/reinigung/thayngen']) {
    assert.throws(() => renderSitemap([route]), /public canonical path|differs from its canonical|must be indexable/, route);
  }
  assert.throws(() => renderSitemap(['/', '/']), /Duplicate/);
});

test('generation and stale-file checking use the same reviewed manifest', () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'kraken-seo-crawl-'));
  try {
    mkdirSync(path.join(root, 'public'));
    mkdirSync(path.join(root, 'dist'));
    assert.deepEqual(generateSitemap(root, { includeDist: true }), getSitemapUrls());
    assert.equal(readFileSync(path.join(root, 'dist/sitemap.xml'), 'utf8'), renderSitemap());
    assert.equal(readFileSync(path.join(root, 'dist/robots.txt'), 'utf8'), renderRobotsTxt(BASE_URL));
    assert.doesNotThrow(() => generateSitemap(root, { check: true, includeDist: true }));
    writeFileSync(path.join(root, 'public/sitemap.xml'), '<urlset/>');
    assert.throws(() => generateSitemap(root, { check: true }), /sitemap.xml is stale/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
