import { cpSync, existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { renderServicesHtml } from './render-services.mjs';
import { renderAboutHtml } from './render-about.mjs';
import { renderContactHtml } from './render-contact.mjs';
import { renderSeoHtml } from './render-seo.mjs';

/** Source-mode Express builds have omitted this app's generated Vite assets in production. */
export function assertVercelBuildMode(env = process.env) {
  if (env.VERCEL && env.KRAKEN_PREBUILT_BUILD !== '1') {
    throw new Error('Unverified Vercel source build blocked. This Express/Vite app requires a locally prepared prebuilt artifact. Use scripts/make-vercel-prebuilt.mjs, then verify scripts/prepare-vercel-output.mjs --verify. No deployment was performed.');
  }
}

// Vercel's native Express integration serves public/ from its CDN, while the
// function reads dist/*.html for the existing route-specific SEO response.
export function publishVercelAssets(root) {
  const assets = path.join(root, 'dist/assets');
  if (!existsSync(assets) || !existsSync(path.join(root, 'dist/index.html'))) {
    throw new Error('Build the frontend before preparing Vercel assets.');
  }
  if (existsSync(path.join(root, 'public/index.html'))) {
    throw new Error('public/index.html would bypass Express SEO. Keep the template in dist.');
  }
  rmSync(path.join(root, 'dist/stats.html'), { force: true });
  rmSync(path.join(root, 'public/assets'), { recursive: true, force: true });
  cpSync(assets, path.join(root, 'public/assets'), {
    recursive: true,
    filter: source => !/\.(?:map|cjs)$/i.test(source) && path.basename(source) !== 'stats.html'
  });
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  assertVercelBuildMode();
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const sitemap = spawnSync(process.execPath, ['--import', 'tsx', path.join(root, 'scripts/generate-sitemap.mjs')], { cwd: root, stdio: 'inherit' });
  if (sitemap.error) throw sitemap.error;
  if (sitemap.status !== 0) process.exit(sitemap.status || 1);
  // Never feed a previous generated CDN bundle back into Vite's public copy.
  rmSync(path.join(root, 'public/assets'), { recursive: true, force: true });
  const result = spawnSync(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), 'build'], {
    cwd: root,
    env: process.env,
    stdio: 'inherit'
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
  await renderServicesHtml(root);
  await renderAboutHtml(root);
  await renderContactHtml(root);
  await renderSeoHtml(root);
  publishVercelAssets(root);
  console.log('Vercel ready: frontend public/assets on CDN; dist/*.html for Express. No Node bundle, stats or source maps published.');
}
