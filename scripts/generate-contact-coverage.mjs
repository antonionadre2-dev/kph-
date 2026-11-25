/** One-time/offline cartographic preparation; never imported by the application.
 * Run with `node --import tsx scripts/generate-contact-coverage.mjs`.
 * Cached source tiles are read locally; --refresh deliberately downloads them again.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodeSwissTile, mergeVectorLayers } from '../components/contact/contact-vector-data.js';
import { COVERAGE_MAP, COVERAGE_MAP_SOUTH, COVERAGE_MOBILE_VIEW, COVERAGE_REGIONS, projectCoverageCoordinate } from '../components/contact/coverage-geography.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'public/kraken-contact/assets/coverage-region.svg');
const mobileOutput = path.join(root, 'public/kraken-contact/assets/coverage-region-mobile.svg');
const provenance = path.join(root, 'public/kraken-contact/data/coverage-region-source.json');
const cache = path.join(root, '.cache/contact-coverage');
const attribution = '© swisstopo, © FDFA, © FOEN, © FOCP, © SAC, © Naturefriends Switzerland, © opentransportdata.swiss';
const terms = 'https://www.geo.admin.ch/en/vector-tiles-service-available-services-and-data';
const zoom = 10;
const tileX = longitude => Math.floor((longitude + 180) / 360 * 2 ** zoom);
const tileY = latitude => Math.floor((1 - Math.asinh(Math.tan(latitude * Math.PI / 180)) / Math.PI) / 2 * 2 ** zoom);
const tiles = [];
for (let y = tileY(COVERAGE_MAP.north); y <= tileY(COVERAGE_MAP_SOUTH); y++) {
  for (let x = tileX(COVERAGE_MAP.west); x <= tileX(COVERAGE_MAP.east); x++) {
    tiles.push({ z: zoom, x, y, key: `${zoom}/${x}/${y}`, url: `https://vectortiles.geo.admin.ch/tiles/ch.swisstopo.base.vt/v1.0.0/${zoom}/${x}/${y}.pbf` });
  }
}
if (tiles.length > 20) throw new Error('Unexpectedly large map download.');
await mkdir(cache, { recursive: true });
const sources = [];
const decoded = [];
// Sequential requests keep the once-only preparation well below FSDI fair-use limits.
for (const tile of tiles) {
  const filename = path.join(cache, tile.key.replaceAll('/', '-') + '.pbf');
  let bytes;
  if (!process.argv.includes('--refresh')) bytes = await readFile(filename).catch(error => { if (error.code !== 'ENOENT') throw error; });
  if (!bytes) {
    const response = await fetch(tile.url, { signal: AbortSignal.timeout(20_000) });
    if (!response.ok) throw new Error(`Source tile ${tile.key}: HTTP ${response.status}`);
    bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.byteLength > 2 * 1024 * 1024) throw new Error('Unexpectedly large source tile.');
    await writeFile(filename, bytes);
  }
  sources.push({ url: tile.url, sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.byteLength });
  decoded.push(decodeSwissTile(bytes, tile));
}
const layers = mergeVectorLayers(decoded);
const number = value => Number(value.toFixed(1));
const projected = coordinate => {
  const point = projectCoverageCoordinate(coordinate);
  return [point.x, point.y];
};
// Subpixel Douglas–Peucker simplification preserves the source geography while
// avoiding shipping the original MVT coordinates or a GIS library to visitors.
function simplify(points, tolerance = .35) {
  if (points.length <= 2) return points;
  const last = points.length - 1;
  const [ax, ay] = points[0];
  const [bx, by] = points[last];
  const dx = bx - ax, dy = by - ay;
  let farthest = tolerance * tolerance, index = -1;
  for (let i = 1; i < last; i++) {
    const [px, py] = points[i];
    const t = dx || dy ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy))) : 0;
    const distance = (px - ax - dx * t) ** 2 + (py - ay - dy * t) ** 2;
    if (distance > farthest) { farthest = distance; index = i; }
  }
  return index < 0 ? [points[0], points[last]] : [...simplify(points.slice(0, index + 1), tolerance).slice(0, -1), ...simplify(points.slice(index), tolerance)];
}
function clipSegment([ax, ay], [bx, by]) {
  const dx = bx - ax, dy = by - ay;
  let from = 0, to = 1;
  for (const [p, q] of [[-dx, ax], [dx, COVERAGE_MAP.width - ax], [-dy, ay], [dy, COVERAGE_MAP.height - ay]]) {
    if (!p && q < 0) return null;
    if (!p) continue;
    const ratio = q / p;
    if (p < 0) from = Math.max(from, ratio); else to = Math.min(to, ratio);
    if (from > to) return null;
  }
  return [[ax + from * dx, ay + from * dy], [ax + to * dx, ay + to * dy]];
}
function clipRing(points) {
  let clipped = points;
  const edges = [
    { inside: ([x]) => x >= 0, intersect: (a, b) => [0, a[1] + (b[1] - a[1]) * -a[0] / (b[0] - a[0])] },
    { inside: ([x]) => x <= COVERAGE_MAP.width, intersect: (a, b) => [COVERAGE_MAP.width, a[1] + (b[1] - a[1]) * (COVERAGE_MAP.width - a[0]) / (b[0] - a[0])] },
    { inside: ([, y]) => y >= 0, intersect: (a, b) => [a[0] + (b[0] - a[0]) * -a[1] / (b[1] - a[1]), 0] },
    { inside: ([, y]) => y <= COVERAGE_MAP.height, intersect: (a, b) => [a[0] + (b[0] - a[0]) * (COVERAGE_MAP.height - a[1]) / (b[1] - a[1]), COVERAGE_MAP.height] },
  ];
  for (const edge of edges) {
    const input = clipped; clipped = [];
    if (!input.length) break;
    let previous = input.at(-1);
    for (const current of input) {
      const a = edge.inside(previous), b = edge.inside(current);
      if (a !== b) clipped.push(edge.intersect(previous, current));
      if (b) clipped.push(current);
      previous = current;
    }
  }
  return clipped;
}
const encodePoints = points => points.map(([x, y], index) => `${index ? 'L' : 'M'}${number(x)} ${number(y)}`).join('');
function linePath(coordinates, closed = false) {
  const points = simplify(coordinates.map(projected));
  if (points.length < 2) return '';
  if (closed) {
    const ring = clipRing(points);
    const area = Math.abs(ring.reduce((sum, point, i) => {
      const next = ring[(i + 1) % ring.length];
      return sum + point[0] * next[1] - next[0] * point[1];
    }, 0)) / 2;
    return ring.length > 2 && area > .3 ? encodePoints(ring) + 'Z' : '';
  }
  const lines = [];
  for (let i = 1; i < points.length; i++) {
    const segment = clipSegment(points[i - 1], points[i]);
    if (!segment) continue;
    const last = lines.at(-1);
    if (last && Math.hypot(last.at(-1)[0] - segment[0][0], last.at(-1)[1] - segment[0][1]) < .001) last.push(segment[1]);
    else lines.push(segment);
  }
  return lines.map(encodePoints).join('');
}
function geometryPath({ type, coordinates }) {
  if (type === 'LineString') return linePath(coordinates);
  if (type === 'MultiLineString') return coordinates.map(line => linePath(line)).join('');
  if (type === 'Polygon') return coordinates.map(ring => linePath(ring, true)).join('');
  if (type === 'MultiPolygon') return coordinates.flatMap(polygon => polygon.map(ring => linePath(ring, true))).join('');
  return '';
}
const isLine = geometry => geometry.type.endsWith('LineString');
const groupedPath = (features, accept = () => true) => features.filter(accept).map(feature => geometryPath(feature.geometry)).join('');
const land = groupedPath(layers.land);
const lakes = groupedPath(layers.water, feature => !isLine(feature.geometry));
const rivers = groupedPath(layers.water, feature => isLine(feature.geometry) && feature.class === 'river');
const streams = groupedPath(layers.water, feature => isLine(feature.geometry) && feature.class !== 'river');
const roadClasses = ['motorway', 'trunk'];
const roads = groupedPath(layers.roads, feature => roadClasses.includes(feature.class));
const xml = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const chosenLabels = new Set(['Bülach', 'Frauenfeld', 'Eglisau', 'Andelfingen', 'Dübendorf']);
const occupied = [];
const places = layers.labels.filter(label => label.kind === 'place' && chosenLabels.has(label.name)).flatMap(label => {
  const point = projectCoverageCoordinate(label.coordinates);
  if (point.x < 45 || point.x > COVERAGE_MAP.width - 60 || point.y < 35 || point.y > COVERAGE_MAP.height - 30) return [];
  if (occupied.some(other => Math.hypot(other.x - point.x, other.y - point.y) < 60)) return [];
  if (COVERAGE_REGIONS.some(region => {
    const marker = projectCoverageCoordinate(region.coordinates);
    return Math.abs(marker.x - point.x) < 130 && Math.abs(marker.y - point.y) < 55;
  })) return [];
  occupied.push(point);
  return `<text x="${number(point.x)}" y="${number(point.y)}">${xml(label.name)}</text>`;
}).join('');
const frame = `M0 0H${COVERAGE_MAP.width}V${COVERAGE_MAP.height}H0Z`;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${COVERAGE_MAP.width}" height="${COVERAGE_MAP.height}" viewBox="0 0 ${COVERAGE_MAP.width} ${COVERAGE_MAP.height}"><title>Zürich · Winterthur · Schaffhausen</title><desc>North-up Web Mercator geography from swisstopo vector data. Static regional map, not a boundary of service coverage. ${xml(attribution)}</desc><defs><clipPath id="map"><path d="${frame}"/></clipPath></defs><g clip-path="url(#map)"><path fill="#edf3e4" d="${frame}"/><path id="landcover" fill="#cbdcb7" fill-rule="nonzero" d="${land}"/><path id="water-areas" fill="#9bcfe8" fill-rule="nonzero" d="${lakes}"/><g fill="none" stroke-linecap="round" stroke-linejoin="round"><path id="streams" stroke="#c7dfdf" stroke-width=".75" d="${streams}"/><path id="rivers" stroke="#96c9dc" stroke-width="2.7" d="${rivers}"/><path id="major-roads" stroke="#dfe6d6" stroke-width="2.9" d="${roads}"/><use href="#major-roads" stroke="#ffffff" stroke-width="1.5"/></g><g fill="#61795f" font-family="Manrope,Arial,sans-serif" font-size="11" text-anchor="middle" paint-order="stroke" stroke="#f0f5e8" stroke-width="3" stroke-linejoin="round">${places}</g></g></svg>`;
const mobileSvg = svg.replace(`width="${COVERAGE_MAP.width}" height="${COVERAGE_MAP.height}" viewBox="0 0 ${COVERAGE_MAP.width} ${COVERAGE_MAP.height}"`, `width="${COVERAGE_MOBILE_VIEW.width}" height="${COVERAGE_MOBILE_VIEW.height}" viewBox="${COVERAGE_MOBILE_VIEW.x} ${COVERAGE_MOBILE_VIEW.y} ${COVERAGE_MOBILE_VIEW.width} ${COVERAGE_MOBILE_VIEW.height}"`);
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, svg);
await writeFile(mobileOutput, mobileSvg);
const report = {
  generated: new Date().toISOString().slice(0, 10),
  description: 'Processed static swisstopo base vectors. No simulated terrain, route, radius, service polygon, office or live data.',
  attribution,
  terms,
  ogdTerms: 'https://www.swisstopo.admin.ch/en/terms-of-use-free-geodata-and-geoservices',
  documentation: 'https://docs.geo.admin.ch/visualize-data/vector-tiles.html',
  bounds: [COVERAGE_MAP.west, COVERAGE_MAP_SOUTH, COVERAGE_MAP.east, COVERAGE_MAP.north],
  projection: 'Web Mercator; north up; equal x/y scale',
  viewport: [COVERAGE_MAP.width, COVERAGE_MAP.height],
  mobileCrop: { ...COVERAGE_MOBILE_VIEW, note: 'A true SVG viewBox crop of the same projected geometry; no stretching or moved coordinates.' },
  simplification: 'Douglas–Peucker, maximum deviation 0.35 SVG units; coordinates rounded to 0.1 SVG unit.',
  layers: { land: layers.land.length, waterAreas: layers.water.filter(feature => !isLine(feature.geometry)).length, rivers: layers.water.filter(feature => isLine(feature.geometry) && feature.class === 'river').length, roads: layers.roads.filter(feature => roadClasses.includes(feature.class)).length },
  sources,
  asset: { path: '/kraken-contact/assets/coverage-region.svg', bytes: Buffer.byteLength(svg), sha256: createHash('sha256').update(svg).digest('hex') },
  mobileAsset: { path: '/kraken-contact/assets/coverage-region-mobile.svg', bytes: Buffer.byteLength(mobileSvg), sha256: createHash('sha256').update(mobileSvg).digest('hex') },
};
await mkdir(path.dirname(provenance), { recursive: true });
await writeFile(provenance, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ output: path.relative(root, output), bytes: Buffer.byteLength(svg), tiles: tiles.length, layers: report.layers }));
