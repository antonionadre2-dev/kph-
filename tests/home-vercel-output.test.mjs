import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { prepareVercelOutput } from '../scripts/prepare-vercel-output.mjs';
import { INDEXABLE_PATHS } from '../src/seo/crawl-policy.ts';
import { LEGAL_DOCUMENT_PATHS, seoFragmentName } from '../src/seo/render-contract.ts';

const languages = ['de', 'en', 'es', 'pt', 'it', 'fr'];
const seoNames = languages.flatMap(language => [
  ...INDEXABLE_PATHS.map(pathname => seoFragmentName(pathname, language)),
  ...LEGAL_DOCUMENT_PATHS.map(pathname => seoFragmentName(pathname, language)),
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
  // Minimal accepted archive plus its two public downloads. The full app has six locales per version.
  const termsManifest = {currentVersion:'fixture-v2',versions:{'fixture-v2':{de:{documentUrl:'/legal/terms/fixture-v2/de.json',pdfUrl:'/legal/terms/fixture-v2/de.pdf'}}}};
  write('src/legal/terms-manifest.json',JSON.stringify(termsManifest));
  for(const extension of ['json','pdf']){const filename=`public/legal/terms/fixture-v2/de.${extension}`;write(filename,`TERMS_${extension}`);trackedPublicFiles.push(filename);}
  return { root, write, trackedPublicFiles, termsManifest };
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
    assert.equal(result.sha256Verified, 24);
    assert.equal(result.legalTermsFilesVerified, 2);
    assert.equal(readFileSync(path.join(root,'.vercel/output/static/legal/terms/fixture-v2/de.pdf'),'utf8'),'TERMS_pdf');
    assert.equal(result.seoPageFragments, 150);
    assert.equal(result.legalDocumentFragments, 18);
    assert.equal(result.seoShellFragments, 6);
    assert.equal(result.runtimeHtmlFilesVerified, 199);
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
    assert.throws(() => prepareVercelOutput(root, { trackedPublicFiles, verifyOnly: true }), /Missing or changed function HTML: dist\/seo-page-fensterreinigung-zuerich-it\.html/);
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

test('preflight rejects missing legal content before publication', () => {
  const { root, trackedPublicFiles } = fixture();
  try {
    rmSync(path.join(root, 'dist', seoFragmentName('/terms', 'es')));
    assert.throws(() => prepareVercelOutput(root, { trackedPublicFiles }), /Missing or invalid built HTML: seo-page-terms-es\.html/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('security.txt is published without exposing other hidden files', () => {
  const { root, trackedPublicFiles, write } = fixture();
  try {
    write('public/.well-known/security.txt', 'Contact: mailto:kai@krakenpfm.ch\n');
    write('public/.well-known/private.json', 'PRIVATE');
    const files = [...trackedPublicFiles, 'public/.well-known/security.txt', 'public/.well-known/private.json'];
    prepareVercelOutput(root, { trackedPublicFiles: files });
    assert.equal(readFileSync(path.join(root, '.vercel/output/static/.well-known/security.txt'), 'utf8'), 'Contact: mailto:kai@krakenpfm.ch\n');
    assert.equal(existsSync(path.join(root, '.vercel/output/static/.well-known/private.json')), false);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('the verified frontend manifest cannot be omitted or changed after packaging',()=>{
  const {root,trackedPublicFiles,write}=fixture();
  try{
    prepareVercelOutput(root,{trackedPublicFiles});
    const filename=path.join(root,'.vercel/output/frontend-asset-manifest.json');
    const manifest=readFileSync(filename,'utf8');assert.equal(JSON.parse(manifest).assets.length,2);
    write('.vercel/output/frontend-asset-manifest.json','{}\n');
    assert.throws(()=>prepareVercelOutput(root,{trackedPublicFiles,verifyOnly:true}),/changed frontend asset manifest/);
    rmSync(filename);assert.throws(()=>prepareVercelOutput(root,{trackedPublicFiles,verifyOnly:true}),/changed frontend asset manifest/);
  }finally{rmSync(root,{recursive:true,force:true});}
});

test('new untracked terms downloads fail before any static or function output mutation',()=>{
 const {root,write,trackedPublicFiles,termsManifest}=fixture();
 try{
  termsManifest.currentVersion='fixture-v3';termsManifest.versions['fixture-v3']={es:{documentUrl:'/legal/terms/fixture-v3/es.json',pdfUrl:'/legal/terms/fixture-v3/es.pdf'}};
  write('src/legal/terms-manifest.json',JSON.stringify(termsManifest));
  write('public/legal/terms/fixture-v3/es.json','NEW_UNTRACKED_DOCUMENT');write('public/legal/terms/fixture-v3/es.pdf','NEW_UNTRACKED_PDF');
  write('.vercel/output/static/existing.txt','KEEP_EXISTING_STATIC');
  const bundled=path.join(root,'.vercel/output/functions/index.func/dist/index.html');
  assert.equal(existsSync(bundled),false);
  for(const verifyOnly of [false,true])assert.throws(()=>prepareVercelOutput(root,{trackedPublicFiles,verifyOnly}),/unpublished legal file: \/legal\/terms\/fixture-v3\/es\.json/);
  assert.equal(readFileSync(path.join(root,'.vercel/output/static/existing.txt'),'utf8'),'KEEP_EXISTING_STATIC');assert.equal(existsSync(bundled),false);assert.equal(existsSync(path.join(root,'.vercel/output/frontend-asset-manifest.json')),false);
  // Tracking only one half still cannot publish a broken PDF link.
  const partial=[...trackedPublicFiles,'public/legal/terms/fixture-v3/es.json'];
  assert.throws(()=>prepareVercelOutput(root,{trackedPublicFiles:partial}),/unpublished legal file: \/legal\/terms\/fixture-v3\/es\.pdf/);
  const complete=[...partial,'public/legal/terms/fixture-v3/es.pdf'];
  assert.equal(prepareVercelOutput(root,{trackedPublicFiles:complete}).legalTermsFilesVerified,4);
  assert.equal(readFileSync(path.join(root,'.vercel/output/static/legal/terms/fixture-v3/es.pdf'),'utf8'),'NEW_UNTRACKED_PDF');
 }finally{rmSync(root,{recursive:true,force:true});}
});

test('every manifest download needs a real source and a canonical publishable terms path',()=>{
 for(const extension of ['json','pdf']){
  const {root,write,trackedPublicFiles}=fixture();
  try{
   write('.vercel/output/static/existing.txt','KEEP_EXISTING_STATIC');
   rmSync(path.join(root,`public/legal/terms/fixture-v2/de.${extension}`));
   assert.throws(()=>prepareVercelOutput(root,{trackedPublicFiles}),new RegExp(`Missing or invalid terms source: /legal/terms/fixture-v2/de\\.${extension}`));
   assert.equal(readFileSync(path.join(root,'.vercel/output/static/existing.txt'),'utf8'),'KEEP_EXISTING_STATIC');
  }finally{rmSync(root,{recursive:true,force:true});}
 }
 const {root,write,trackedPublicFiles,termsManifest}=fixture();
 try{
  termsManifest.versions['fixture-v2'].de.pdfUrl='/legal/terms/../private.pdf';write('src/legal/terms-manifest.json',JSON.stringify(termsManifest));
  assert.throws(()=>prepareVercelOutput(root,{trackedPublicFiles}),/Invalid terms manifest pdfUrl/);
 }finally{rmSync(root,{recursive:true,force:true});}
});
