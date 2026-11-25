import { request } from 'node:http';
import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const origin = new URL(process.argv[2] || 'http://127.0.0.1:3019');
assert.ok(['127.0.0.1', 'localhost'].includes(origin.hostname), 'This check is for a local preview only');
const repository = fileURLToPath(new URL('..', import.meta.url)).replace(/\/$/, '');
const checked = [];
const call = (path, headers = {}) => new Promise((resolve, reject) => {
  const req = request({ hostname: origin.hostname, port: origin.port, path, headers: { Host: 'krakenpfm.ch', ...headers } }, res => {
    let body = ''; res.setEncoding('utf8'); res.on('data', part => body += part);
    res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
  }); req.on('error', reject); req.end();
});
const security = response => {
  assert.equal(response.headers['x-powered-by'], undefined);
  assert.equal(response.headers['x-content-type-options'], 'nosniff');
  assert.equal(response.headers['x-frame-options'], 'SAMEORIGIN');
  assert.equal(response.headers['referrer-policy'], 'no-referrer');
  assert.match(response.headers['content-security-policy'], /frame-ancestors 'self'/);
  assert.match(response.headers['content-security-policy-report-only'], /default-src 'self'/);
  assert.ok(response.headers['permissions-policy']);
};
const sitemap = await call('/sitemap.xml');
assert.equal(sitemap.status, 200);
const locations = [...sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
assert.equal(locations.length, 144);
assert.equal(new Set(locations).size, locations.length);
for (const url of locations) {
  const path = new URL(url).pathname;
  const response = await call(path); assert.equal(response.status, 200, path); security(response);
  assert.equal((response.body.match(/<h1\b/g) || []).length, 1, path + ' has one H1');
  assert.ok(response.body.includes('rel="canonical" href="' + url + '"'), path + ' canonical');
  assert.equal((response.body.match(/hreflang=/g) || []).length, 7, path + ' alternates');
  assert.match(response.body, /hreflang="x-default" href="https:\/\/krakenpfm.ch\//);
  assert.match(response.body, /name="robots" content="index, follow"/);
  const publicText = response.body.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '').replace(/<[^>]+>/g, ' ');
  assert.doesNotMatch(publicText, /Facility Management|Hauswartung|Hausbetreuung|Immobilienverwaltung|Hochdruckreinigung|Precision Media Quote|Clientes B2B|servicios inmobiliarios|GAV-konform|\bBasel\b/i, path + ' obsolete public offer');
  const schemaText = response.body.match(/<script id="kraken-page-schema" type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
  const schema = JSON.parse(schemaText); assert.ok(Array.isArray(schema['@graph']));
  assert.ok(!schemaText.includes('AggregateRating')); assert.ok(!schemaText.includes('"@type":"Review"'));
  const localBusiness = schema['@graph'].filter(item => item['@type'] === 'LocalBusiness');
  assert.equal(localBusiness.length, 1, path + ' one office');
  assert.equal(localBusiness[0].address.streetAddress, 'Seewadelstrasse 3');
  checked.push({ path, status: response.status, canonical: url, alternates: 7, schemaNodes: schema['@graph'].length });
}
const inventory = readFileSync(repository + '/docs/ROUTE_MIGRATION.csv', 'utf8').trim().split('\n').slice(1).map(row => row.slice(1, -1).split('","'));
const counts = {};
for (const [source, destination, status] of inventory) {
  const response = await call(source); assert.equal(response.status, Number(status), source);
  if (status === '301') assert.equal(response.headers.location, destination, source);
  if (status === '410') assert.equal(response.headers['x-robots-tag'], 'noindex, follow', source);
  counts[status] = (counts[status] || 0) + 1;
}
for (const language of ['', '/en', '/es', '/pt', '/it', '/fr']) for (const page of ['/impressum', '/terms', '/gdpr']) {
  const response = await call(language + page); assert.equal(response.status, 200); security(response);
  assert.equal((response.body.match(/<h1\b/g) || []).length, 1);
}
for (const path of ['/es/login', '/fr/register', '/dashboard', '/offerte?booking=opaque', '/en/customer-access', '/quote-demo', '/commercial-quote']) {
  const response = await call(path); assert.equal(response.status, 200, path);
  assert.equal(response.headers['x-robots-tag'], 'noindex, follow');
  assert.match(response.body, /name="robots" content="noindex, follow"/);
}
const forbidden = await call('/api/health', { Origin: 'https://other.example' }); assert.equal(forbidden.status, 403);
const allowed = await call('/api/health', { Origin: 'https://krakenpfm.ch' }); assert.equal(allowed.headers['access-control-allow-origin'], 'https://krakenpfm.ch');
const securityFile = await call('/.well-known/security.txt'); assert.equal(securityFile.status, 200); assert.match(securityFile.body, /Contact: mailto:kai@krakenpfm.ch/);
const home = await call('/');
const bootstrap=home.body.match(/<script type="module" id="kraken-home-start" src="([^"]+)" data-entry="([^"]+)"/);
assert.ok(bootstrap, 'Home starts its interactive layer after the server-rendered paint');
assert.doesNotMatch(home.body,/rel="modulepreload"/);
const imageHintAt=home.body.search(/imagesrcset=/i);
assert.ok(imageHintAt>=0 && imageHintAt<home.body.indexOf('rel="stylesheet"'), 'Responsive hero discovery precedes CSS');
const sourceSets = [...home.body.matchAll(/\b(?:srcset|imagesrcset)="([^"]+)"/gi)]
  .flatMap(match => match[1].split(',').map(source => source.trim().split(/\s+/)[0]));
const assets = [...new Set([
  ...[...home.body.matchAll(/(?:src|href)="(\/(?:media|fonts|assets)\/[^"?#]+)"/g)].map(match => match[1]),
  ...sourceSets.filter(source => /^\/(?:media|fonts|assets)\//.test(source)),
  bootstrap[2],
])];
for (const path of assets) {
  const response = await call(path); assert.equal(response.status, 200, path);
  assert.match(response.headers['cache-control'], /immutable/, path);
  if(path.endsWith('.avif')) assert.match(response.headers['content-type'], /image\/avif/);
}
for (const path of ['/seo-page-home-de.html', '/server.cjs', '/private-key.pem', '/assets/unpublished.js.map']) assert.equal((await call(path)).status, 404, path);
assert.equal((await call('/unknown-kraken-preview-route')).status, 404);
const localHome = await call('/', { Host: origin.host }); assert.equal(localHome.headers['x-robots-tag'], 'noindex, nofollow');
assert.match(localHome.body, /name="robots" content="noindex, nofollow"/);
const result = { checkedAt: new Date().toISOString(), origin: origin.origin, productionWasNotRequested: true, canonicalPages: checked.length, legalPages: 18, historicalRoutes: inventory.length, historicalStatuses: counts, immutableAssets: assets.length, security: 'passed', cors: 'passed', schemas: 'passed', privateNoindex: 'passed', previewNoindex: 'passed', pages: checked };
if (process.argv[3]) writeFileSync(process.argv[3], JSON.stringify(result, null, 2));
console.log(JSON.stringify({ ...result, pages: undefined }, null, 2));
