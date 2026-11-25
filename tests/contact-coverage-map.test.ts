import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { COVERAGE_MAP, COVERAGE_MAP_SOUTH, COVERAGE_MOBILE_VIEW, COVERAGE_REGIONS, projectCoverageCoordinate } from '../components/contact/coverage-geography';
import { publicHref } from '../src/routing/site-paths';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const svg = readFileSync(path.join(root, 'public/kraken-contact/assets/coverage-region.svg'), 'utf8');
const source = JSON.parse(readFileSync(path.join(root, 'public/kraken-contact/data/coverage-region-source.json'), 'utf8'));

test('region positions use the supplied WGS84 coordinates and preserve north/east orientation', () => {
  assert.deepEqual(COVERAGE_REGIONS.map(region => [...region.coordinates]), [[8.548064, 47.381934], [8.724130, 47.505640], [8.632998, 47.706003]]);
  const [zurich, winterthur, schaffhausen] = COVERAGE_REGIONS.map(region => projectCoverageCoordinate(region.coordinates));
  assert.ok(schaffhausen.y < winterthur.y && winterthur.y < zurich.y);
  assert.ok(zurich.x < schaffhausen.x && schaffhausen.x < winterthur.x);
  for (const point of [zurich, winterthur, schaffhausen]) {
    assert.ok(point.x > 110 && point.x < COVERAGE_MAP.width - 110);
    assert.ok(point.y > 40 && point.y < COVERAGE_MAP.height - 60);
  }
  const nw = projectCoverageCoordinate([COVERAGE_MAP.west, COVERAGE_MAP.north]);
  const se = projectCoverageCoordinate([COVERAGE_MAP.east, COVERAGE_MAP_SOUTH]);
  assert.ok(Math.abs(nw.x) < 1e-8 && Math.abs(nw.y) < 1e-8);
  assert.ok(Math.abs(se.x - COVERAGE_MAP.width) < 1e-8 && Math.abs(se.y - COVERAGE_MAP.height) < 1e-8);
});

function pathCoordinates(id: string) {
  const content = svg.match(new RegExp(`<path id="${id}"[^>]* d="([^"]*)"`))?.[1];
  assert.ok(content, `${id} layer exists`);
  return [...content.matchAll(/M([^M]+)/g)].map(match => [...match[1].matchAll(/(?:L)?(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g)].map(point => [Number(point[1]), Number(point[2])]));
}
function inside([x, y]: number[], ring: number[][]) {
  let result = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [ax, ay] = ring[i], [bx, by] = ring[j];
    if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) result = !result;
  }
  return result;
}
test('the actual local asset places Zürichsee southeast of Zürich and the Rhine near Schaffhausen', () => {
  const lakes = pathCoordinates('water-areas');
  const lakePoint = projectCoverageCoordinate([8.554, 47.35]);
  const zurich = projectCoverageCoordinate(COVERAGE_REGIONS[0].coordinates);
  assert.ok(lakePoint.x > zurich.x && lakePoint.y > zurich.y);
  assert.ok(lakes.reduce((inWater, ring) => inside([lakePoint.x, lakePoint.y], ring) !== inWater, false), 'Zürichsee reference point is inside real source water geometry');
  const riverPoint = projectCoverageCoordinate([8.64, 47.695]);
  const rivers = pathCoordinates('rivers');
  assert.ok(rivers.some(line => line.some(([x, y]) => Math.hypot(x - riverPoint.x, y - riverPoint.y) < 12)), 'Rhine geometry is present near Schaffhausen');
});

test('the rendered Zürichsee remains visibly blue above the landcover', async () => {
  const { default: sharp } = await import('sharp');
  const { data, info } = await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const point = projectCoverageCoordinate([8.555, 47.34]);
  const offset = (Math.round(point.y) * info.width + Math.round(point.x)) * info.channels;
  const [red, green, blue, alpha] = data.subarray(offset, offset + 4);
  assert.equal(alpha, 255);
  assert.ok(blue > green && green > red && blue - red > 50, `the lake is rendered in blue, not obscured by terrain: ${red},${green},${blue}`);
});

test('static map retains source attribution, reproducible provenance and no external runtime content', () => {
  assert.equal(source.asset.sha256, createHash('sha256').update(svg).digest('hex'));
  assert.equal(source.asset.bytes, Buffer.byteLength(svg));
  assert.ok(source.asset.bytes < 650_000, 'a bounded vector asset replaces the live map engine');
  assert.equal(source.projection, 'Web Mercator; north up; equal x/y scale');
  assert.deepEqual(source.bounds, [COVERAGE_MAP.west, COVERAGE_MAP_SOUTH, COVERAGE_MAP.east, COVERAGE_MAP.north]);
  assert.ok(source.sources.length > 0 && source.sources.length <= 20);
  assert.ok(source.sources.every((tile: { url: string; sha256: string }) => /^https:\/\/vectortiles\.geo\.admin\.ch\/tiles\/ch\.swisstopo\.base\.vt\/v1\.0\.0\/10\/\d+\/\d+\.pbf$/.test(tile.url) && /^[a-f0-9]{64}$/.test(tile.sha256)));
  assert.match(svg, /© swisstopo/);
  assert.doesNotMatch(svg, /<script|<foreignObject|<image|onload=|href="https?:/i);
});

test('phone art direction is a true crop of the same geography, with exact regional anchors', () => {
  const mobile = readFileSync(path.join(root, 'public/kraken-contact/assets/coverage-region-mobile.svg'), 'utf8');
  assert.equal(source.mobileAsset.sha256, createHash('sha256').update(mobile).digest('hex'));
  assert.deepEqual(source.mobileCrop, { ...COVERAGE_MOBILE_VIEW, note: 'A true SVG viewBox crop of the same projected geometry; no stretching or moved coordinates.' });
  assert.equal(mobile.slice(mobile.indexOf('<title>')), svg.slice(svg.indexOf('<title>')));
  for (const region of COVERAGE_REGIONS) {
    const point = projectCoverageCoordinate(region.coordinates);
    assert.ok(point.x > COVERAGE_MOBILE_VIEW.x + 50 && point.x < COVERAGE_MOBILE_VIEW.x + COVERAGE_MOBILE_VIEW.width - 50);
    assert.ok(point.y > 55 && point.y < COVERAGE_MOBILE_VIEW.height - 55);
  }
});

test('six languages render native regional links and supplied accessible copy without a map service', async () => {
  const cache = path.join(root, 'node_modules/.cache');
  mkdirSync(cache, { recursive: true });
  const temporary = mkdtempSync(path.join(cache, 'coverage-render-'));
  try {
    const outfile = path.join(temporary, 'render.cjs');
    await build({ stdin: { contents: `import React from 'react';import{renderToStaticMarkup}from'react-dom/server';import{ContactCoverageMap}from'./components/contact/ContactCoverageMap.tsx';export const render=(language,labels)=>renderToStaticMarkup(React.createElement(ContactCoverageMap,{language,labels}));`, resolveDir: root, loader: 'tsx' }, outfile, bundle: true, platform: 'node', format: 'cjs', packages: 'external', loader: { '.css': 'empty' }, logLevel: 'warning' });
    const render = createRequire(import.meta.url)(outfile).render;
    for (const language of ['de', 'en', 'es', 'fr', 'it', 'pt']) {
      const labels = { eyebrow: `eyebrow ${language}`, title: `heading ${language}`, subtitle: `subtitle ${language}`, note: `note ${language}`, regionsLabel: `regions ${language}`, accessibleLabel: `map ${language}` };
      const html = render(language, labels);
      assert.match(html, new RegExp(`alt="map ${language}"`));
      assert.match(html, new RegExp(`aria-label="regions ${language}"`));
      for (const region of COVERAGE_REGIONS) {
        assert.equal(html.split(`href="${publicHref(region.path, language)}"`).length - 1, 2, `${language} native marker and region-list link`);
      }
      assert.equal((html.match(/data-coverage-region=/g) || []).length, 3);
      assert.doesNotMatch(html, /<button|<iframe|<script|data-service|data-calculator|mapbox|openrouteservice|geolocation|OSRM/);
      assert.match(html, /© swisstopo/);
    }
  } finally { rmSync(temporary, { recursive: true, force: true }); }
});
