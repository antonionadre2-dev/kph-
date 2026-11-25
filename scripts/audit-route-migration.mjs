import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { getRouteDisposition, RETIRED_PAGE_PATHS, RETIRED_SERVICE_SLUGS } from '../src/routing/route-policy.ts';
import { ROUTE_MUNICIPALITIES } from '../src/routing/municipalities.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8' });
const commits = git(['log', 'd299da3', '--format=%H', '--', 'public/sitemap.xml']).trim().split('\n').filter(Boolean);
const inventory = new Map();
for (const commit of commits) {
  const xml = git(['show', `${commit}:public/sitemap.xml`]);
  for (const match of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const url = new URL(match[1].replaceAll('&amp;', '&'));
    inventory.set(url.pathname + url.search, 'historical sitemap');
  }
}
// Explicit routable aliases in the former router are included even if absent from a sitemap.
for (const place of ROUTE_MUNICIPALITIES) inventory.set('/reinigung/' + place.slug, 'former municipality router');
for (const city of ['schaffhausen', 'zurich', 'zuerich', 'winterthur', 'neuhausen', 'stein-am-rhein']) {
  for (const service of [...RETIRED_SERVICE_SLUGS, 'end-of-tenancy', 'daily-cleaning', 'deep-cleaning', 'moving-furniture', 'window-cleaning']) {
    inventory.set(`/services/${city}/${service}`, 'former service router');
    inventory.set(`/seo/${city}/${service}`, 'former service alias');
    inventory.set(`/reinigung-${city}-${service}`, 'former German service alias');
  }
}
for (const alias of ['/about', '/ueber-kraken', '/our-story', '/quote', '/consultation', '/contact', '/contacto', '/services', '/imprint', '/reinigung/uhwiesen', ...RETIRED_PAGE_PATHS]) inventory.set(alias, 'former static router');
const rows = [...inventory].map(([source, evidence]) => ({ source, evidence, ...getRouteDisposition(source) })).sort((a, b) => a.source.localeCompare(b.source));
const csv = records => 'old_url,new_url,status,evidence\n' + records.map(row => [row.source, row.location || '', row.status, row.evidence].map(value => '"' + String(value).replaceAll('"', '""') + '"').join(',')).join('\n') + '\n';
writeFileSync(path.join(root, 'docs/ROUTE_MIGRATION.csv'), csv(rows));
writeFileSync(path.join(root, 'docs/URL_REMOVALS.csv'), csv(rows.filter(row => row.status === 410)));
const unmatched = rows.filter(row => row.status === 404);
console.log(JSON.stringify({ historicalSitemapCommits: commits.length, inventoried: rows.length, redirected: rows.filter(row => row.status === 301).length, removed: rows.filter(row => row.status === 410).length, retained: rows.filter(row => row.status === 200).length, unmatched: unmatched.map(row => row.source) }, null, 2));
