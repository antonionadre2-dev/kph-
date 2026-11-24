import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BASE_URL, isRouteValid } from '../seoConfig.ts';
import { getPageSeo } from '../src/seo/metadata.ts';
import { INDEXABLE_PATHS, isPrivatePath, renderRobotsTxt } from '../src/seo/crawl-policy.ts';

// Promote a route only after its public content and canonical have been reviewed.
// A routable legacy location/service combination is not automatically a useful page.
export const SITEMAP_PATHS = INDEXABLE_PATHS;

const rootPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const escapeXml = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');

/** @param {readonly string[]} paths */
export function getSitemapUrls(paths = SITEMAP_PATHS) {
  const urls = paths.map(route => {
    if (route.includes('?') || route.includes('#') || !isRouteValid(route) || isPrivatePath(route)) {
      throw new Error(`Sitemap route must be a public canonical path: ${route}`);
    }
    const metadata = getPageSeo(route, 'de');
    const canonical = new URL(metadata.canonical);
    if (canonical.origin !== BASE_URL || canonical.pathname !== route || canonical.search || canonical.hash) {
      throw new Error(`Sitemap route differs from its canonical URL: ${route}`);
    }
    if (metadata.indexable === false || metadata.noindex === true || /noindex/i.test(metadata.robots || '')) {
      throw new Error(`Sitemap route must be indexable: ${route}`);
    }
    return canonical.href;
  });
  if (new Set(urls).size !== urls.length) throw new Error('Duplicate sitemap canonical URL.');
  return urls;
}

/** @param {readonly string[]} paths */
export function renderSitemap(paths = SITEMAP_PATHS) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...getSitemapUrls(paths).map(url => `  <url><loc>${escapeXml(url)}</loc></url>`),
    '</urlset>',
    '',
  ].join('\n');
}

/** Regenerate public files before Vite copies them, or verify them with --check. */
export function generateSitemap(root = rootPath, { check = false, includeDist = false } = {}) {
  const files = { 'sitemap.xml': renderSitemap(), 'robots.txt': renderRobotsTxt(BASE_URL) };
  for (const directory of ['public', ...(includeDist && existsSync(path.join(root, 'dist')) ? ['dist'] : [])]) {
    for (const [filename, content] of Object.entries(files)) {
      const output = path.join(root, directory, filename);
      if (check) {
        if (!existsSync(output) || readFileSync(output, 'utf8') !== content) {
          throw new Error(`${directory}/${filename} is stale. Run node --import tsx scripts/generate-sitemap.mjs.`);
        }
      } else {
        writeFileSync(output, content, 'utf8');
      }
    }
  }
  return getSitemapUrls();
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes('--check');
  const urls = generateSitemap(rootPath, { check });
  console.log(`${check ? 'Verified' : 'Generated'} robots.txt and sitemap.xml (${urls.length} reviewed canonical URLs).`);
}
