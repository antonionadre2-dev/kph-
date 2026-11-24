import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { prepareVercelOutput } from '../scripts/prepare-vercel-output.mjs';
import { INDEXABLE_PATHS } from '../src/seo/crawl-policy.ts';
import { seoFragmentName } from '../src/seo/render-contract.ts';

const languages = ['de', 'en', 'es', 'pt', 'it', 'fr'];
const seoNames = languages.flatMap(language => [
  ...INDEXABLE_PATHS.map(pathname => seoFragmentName(pathname, language)),
  `seo-shell-${language}.html`,
]);

function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), 'kraken-output-'));
  const write = (name, contents) => { const target = path.join(root, name); mkdirSync(path.dirname(target), { recursive: true }); writeFileSync(target, contents); };
  write('.vercel/output/config.json', JSON.stringify({ version: 3, routes: [{ handle: 'filesystem' }, { src: '/(.*)', dest: '/' }] }));
  write('.vercel/output/functions/index.func/.vc-config.json', JSON.stringify({ runtime: 'nodejs24.x', handler: 'server.js', framework: { slug: 'express' }, filePathMap: { 'dist/index.html': 'dist/index.html' } }));
  write('.vercel/output/functions/index.func/server.js', 'EXISTING_FUNCTION');
  write('dist/index.html', '<html><script src="/assets/index-a1b2.js"></script><link href="/assets/index-c3d4.css" rel="stylesheet"></html>');
  for (const language of languages) for (const kind of ['services','about','why','contact']) write(`dist/${kind}-content-${language}.html`, kind.toUpperCase() + '_' + language);
  for (const name of seoNames) write(`dist/${name}`, 'SSR_' + name);
  write('dist/assets/index-a1b2.js', 'BUILT_JS'); write('public/assets/index-a1b2.js', 'BUILT_JS');
  write('dist/assets/index-c3d4.css', 'BUILT_CSS'); write('public/assets/index-c3d4.css', 'BUILT_CSS');
  write('public/assets/index-a1b2.js.map', 'PRIVATE_MAP');
  write('public/untracked-private.json', 'PRIVATE_UNTRACKED');
  write('public/.env.production', 'PRIVATE_ENV');
  write('public/archive.zip', 'PRIVATE_ARCHIVE');
  write('public/error.log', 'PRIVATE_LOG');
  write('public/stats.html', 'PRIVATE_STATS');
  write('public/server.cjs', 'PRIVATE_NODE_BUNDLE');
  for (const name of ['seo-page-home-de.html', 'seo-shell-de.html', 'about-content-de.html']) write(`public/${name}`, 'PRIVATE_RUNTIME_FRAGMENT');
  const home = ['hero-room-day-v4.webp', ...Array.from({ length: 13 }, (_, i) => `approved-${i}.webp`), 'services-hero-v5.webp', 'service-windows-v5.webp', 'service-end-v5.webp', 'service-regular-v5.webp', 'service-deep-v5.webp', 'service-moving-v6.webp'];
  const trackedPublicFiles = home.map(name => 'public/home-approved/assets/' + name);
  for (const name of trackedPublicFiles) write(name, name);
  trackedPublicFiles.push('public/.env.production', 'public/archive.zip', 'public/error.log', 'public/stats.html', 'public/server.cjs');
  trackedPublicFiles.push('public/seo-page-home-de.html', 'public/seo-shell-de.html', 'public/about-content-de.html');
  return { root, write, trackedPublicFiles };
}

test('prebuilt preparation repairs absent generated bundles, validates hashes and leaves the Express function and HTML unchanged', () => {
  const { root, trackedPublicFiles, write } = fixture();
  try {
    write('.vercel/output/static/stats.html', 'UNSAFE_OLD_OUTPUT');
    const config = readFileSync(path.join(root, '.vercel/output/config.json'), 'utf8');
    const template = readFileSync(path.join(root, 'dist/index.html'), 'utf8');
    const result = prepareVercelOutput(root, { trackedPublicFiles });
    assert.equal(result.homeAssets, 20);
    assert.equal(result.htmlBundleReferences, 2);
    assert.equal(result.generatedBundles, 2);
    assert.equal(result.sha256Verified, 22);
    assert.equal(result.seoPageFragments, 144);
    assert.equal(result.seoShellFragments, 6);
    assert.equal(result.runtimeHtmlFilesVerified, 175);
    assert.equal(result.missing, 0);
    assert.equal(readFileSync(path.join(root, '.vercel/output/static/assets/index-a1b2.js'), 'utf8'), 'BUILT_JS');
    for (const filename of ['untracked-private.json', '.env.production', 'archive.zip', 'error.log', 'stats.html', 'server.cjs', 'assets/index-a1b2.js.map', 'seo-page-home-de.html', 'seo-shell-de.html', 'about-content-de.html']) {
      assert.equal(existsSync(path.join(root, '.vercel/output/static', filename)), false, filename);
    }
    assert.equal(readFileSync(path.join(root, '.vercel/output/config.json'), 'utf8'), config);
    assert.equal(readFileSync(path.join(root, 'dist/index.html'), 'utf8'), template);
    assert.equal(readFileSync(path.join(root, '.vercel/output/functions/index.func/dist/index.html'), 'utf8'), template);
    assert.equal(readFileSync(path.join(root, '.vercel/output/functions/index.func/server.js'), 'utf8'), 'EXISTING_FUNCTION');
    for (const name of seoNames) {
      assert.equal(readFileSync(path.join(root, '.vercel/output/functions/index.func/dist', name), 'utf8'), readFileSync(path.join(root, 'dist', name), 'utf8'), name);
    }
    assert.equal(prepareVercelOutput(root, { trackedPublicFiles, verifyOnly: true }).missing, 0);
    write('.vercel/output/static/assets/index-a1b2.js', 'CHANGED');
    assert.throws(() => prepareVercelOutput(root, { trackedPublicFiles, verifyOnly: true }), /Missing or changed CDN file/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('preflight rejects missing CDN bundles and stale Vite copies before publication', () => {
  const { root, trackedPublicFiles, write } = fixture();
  try {
    write('.vercel/output/static/placeholder.txt', 'NO_BUNDLES');
    assert.throws(() => prepareVercelOutput(root, { trackedPublicFiles, verifyOnly: true }), /Missing or changed CDN file/);
    write('public/assets/index-a1b2.js', 'STALE');
    assert.throws(() => prepareVercelOutput(root, { trackedPublicFiles }), /not the current Vite build/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('preflight rejects a catch-all before filesystem routing and an incomplete approved home', () => {
  const { root, trackedPublicFiles, write } = fixture();
  try {
    write('.vercel/output/config.json', JSON.stringify({ version: 3, routes: [{ src: '/(.*)', dest: '/' }, { handle: 'filesystem' }] }));
    assert.throws(() => prepareVercelOutput(root, { trackedPublicFiles }), /filesystem routing must precede/);
    write('.vercel/output/config.json', JSON.stringify({ version: 3, routes: [{ handle: 'filesystem' }, { src: '/(.*)', dest: '/' }] }));
    assert.throws(() => prepareVercelOutput(root, { trackedPublicFiles: trackedPublicFiles.slice(1) }), /all 14 approved home assets/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('preflight rejects JavaScript functions retaining TypeScript import extensions', () => {
  const { root, trackedPublicFiles, write } = fixture();
  try {
    write('.vercel/output/functions/index.func/server.js', 'import { metadata } from "./seoConfig.ts";');
    assert.throws(() => prepareVercelOutput(root, { trackedPublicFiles }), /still imports TypeScript/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('preflight requires every localized SEO page and shell before changing prepared output', () => {
  const { root, trackedPublicFiles, write } = fixture();
  try {
    const name = seoFragmentName('/services/winterthur/moving-furniture', 'fr');
    write('.vercel/output/static/existing.txt', 'UNCHANGED_UNTIL_PREFLIGHT_PASSES');
    rmSync(path.join(root, 'dist', name));
    assert.throws(() => prepareVercelOutput(root, { trackedPublicFiles }), new RegExp(`Missing or invalid built HTML: ${name}`));
    assert.equal(readFileSync(path.join(root, '.vercel/output/static/existing.txt'), 'utf8'), 'UNCHANGED_UNTIL_PREFLIGHT_PASSES');
    write('dist/' + name, 'RESTORED');
    rmSync(path.join(root, 'dist/seo-shell-pt.html'));
    assert.throws(() => prepareVercelOutput(root, { trackedPublicFiles }), /Missing or invalid built HTML: seo-shell-pt\.html/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('verify-only rejects missing or changed localized SEO fragments without repairing them', () => {
  const { root, trackedPublicFiles, write } = fixture();
  try {
    prepareVercelOutput(root, { trackedPublicFiles });
    const name = seoFragmentName('/services/zurich/window-cleaning', 'it');
    const bundled = path.join(root, '.vercel/output/functions/index.func/dist', name);
    rmSync(bundled);
    assert.throws(() => prepareVercelOutput(root, { trackedPublicFiles, verifyOnly: true }), /Missing or changed function HTML: dist\/seo-page-services-zurich-window-cleaning-it\.html/);
    assert.equal(existsSync(bundled), false);
    write('.vercel/output/functions/index.func/dist/' + name, readFileSync(path.join(root, 'dist', name), 'utf8'));
    write('.vercel/output/functions/index.func/dist/seo-shell-es.html', 'STALE_SHELL');
    assert.throws(() => prepareVercelOutput(root, { trackedPublicFiles, verifyOnly: true }), /Missing or changed function HTML: dist\/seo-shell-es\.html/);
    assert.equal(readFileSync(path.join(root, '.vercel/output/functions/index.func/dist/seo-shell-es.html'), 'utf8'), 'STALE_SHELL');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('preflight validates frontend assets referenced only by SEO fragments', () => {
  const { root, trackedPublicFiles, write } = fixture();
  try {
    write('dist/' + seoFragmentName('/einsatzgebiete', 'en'), '<link rel="stylesheet" href="/assets/missing-local.css">');
    assert.throws(() => prepareVercelOutput(root, { trackedPublicFiles }), /unpublished frontend file: assets\/missing-local\.css/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
