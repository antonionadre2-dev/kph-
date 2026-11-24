import { VectorTile } from '@mapbox/vector-tile';
import { PbfReader } from 'pbf';

/** Published bounds and zoom range of ch.swisstopo.base.vt/v1.0.0. */
export const SWISS_VECTOR_BOUNDS = Object.freeze([3.57, 44.18, 13.66, 48.88]);
const TILE_BASE = 'https://vectortiles.geo.admin.ch/tiles/ch.swisstopo.base.vt/v1.0.0';
const MAX_TILES = 16;
const MAX_BYTES = 2 * 1024 * 1024;
const MAX_RAW_FEATURES = 120_000;
const MAX_SELECTED_FEATURES = 40_000;
const emptyLayers = () => ({ land: [], water: [], buildings: [], roads: [], labels: [] });
const finitePoint = point => Array.isArray(point) && point.length >= 2 && Number.isFinite(point[0]) && Number.isFinite(point[1]);
const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
const tileX = (longitude, zoom) => (longitude + 180) / 360 * 2 ** zoom;
const tileY = (latitude, zoom) => (1 - Math.asinh(Math.tan(latitude * Math.PI / 180)) / Math.PI) / 2 * 2 ** zoom;

/** Fetch only the visible Swiss coverage, adapting resolution to a bounded tile budget. */
export function viewportTiles(projection, width, height) {
  if (typeof projection?.invert !== 'function' || typeof projection?.scale !== 'function'
    || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return [];
  const scale = projection.scale();
  if (!Number.isFinite(scale) || scale <= 0) return [];
  const corners = [[0, 0], [width, 0], [0, height], [width, height]].map(point => projection.invert(point));
  if (!corners.every(finitePoint)) return [];
  const west = Math.max(SWISS_VECTOR_BOUNDS[0], Math.min(...corners.map(point => point[0])));
  const south = Math.max(SWISS_VECTOR_BOUNDS[1], Math.min(...corners.map(point => point[1])));
  const east = Math.min(SWISS_VECTOR_BOUNDS[2], Math.max(...corners.map(point => point[0])));
  const north = Math.min(SWISS_VECTOR_BOUNDS[3], Math.max(...corners.map(point => point[1])));
  if (west >= east || south >= north) return [];
  let zoom = clamp(Math.floor(Math.log2(2 * Math.PI * scale / 512)), 0, 14);
  let extent;
  while (true) {
    const maximum = 2 ** zoom - 1;
    extent = {
      minX: clamp(Math.floor(tileX(west, zoom)), 0, maximum),
      maxX: clamp(Math.floor(tileX(east, zoom) - 1e-9), 0, maximum),
      minY: clamp(Math.floor(tileY(north, zoom)), 0, maximum),
      maxY: clamp(Math.floor(tileY(south, zoom) - 1e-9), 0, maximum),
    };
    extent.maxX = Math.max(extent.minX, extent.maxX);
    extent.maxY = Math.max(extent.minY, extent.maxY);
    if ((extent.maxX - extent.minX + 1) * (extent.maxY - extent.minY + 1) <= MAX_TILES || zoom === 0) break;
    zoom--;
  }
  const tiles = [];
  for (let y = extent.minY; y <= extent.maxY; y++) for (let x = extent.minX; x <= extent.maxX; x++) {
    const key = `${zoom}/${x}/${y}`;
    tiles.push({ z: zoom, x, y, key, url: `${TILE_BASE}/${key}.pbf` });
  }
  return tiles;
}

function roadClass(value) {
  const source = String(value ?? '');
  if (/^(rail|transit)(?:_|$)/.test(source)) return 'rail';
  for (const name of ['motorway', 'trunk', 'primary', 'secondary', 'tertiary']) {
    if (source === name || source.startsWith(name + '_')) return name;
  }
  return ['minor', 'service', 'residential', 'living_street', 'unclassified', 'road', 'street', 'track', 'footway', 'path'].includes(source) ? 'minor' : null;
}

function woodClass(properties) {
  return ['wood', 'forest', 'scrub'].includes(properties.class)
    || ['forest', 'wood', 'loose_forest', 'scrub', 'woody_plant'].includes(properties.subclass) ? 'wood' : properties.class || 'grass';
}

function labelPoint(geometry) {
  if (geometry.type === 'Point') return geometry.coordinates;
  if (geometry.type === 'MultiPoint') return geometry.coordinates[0];
  const lines = geometry.type === 'LineString' ? [geometry.coordinates]
    : geometry.type === 'MultiLineString' ? geometry.coordinates : [];
  const longest = lines.reduce((selected, line) => line.length > selected.length ? line : selected, []);
  return longest[Math.floor(longest.length / 2)];
}

const nameOf = properties => {
  const value = properties['name:latin'] || properties.name || properties.ref;
  return typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 160) : '';
};

/** Return normal GeoJSON for the existing D3 renderer, without any map engine. */
export function decodeSwissTile(bytes, tile) {
  const input = bytes instanceof Uint8Array ? bytes : bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : null;
  if (!input || !input.byteLength || input.byteLength > MAX_BYTES) throw new TypeError('Invalid vector tile bytes.');
  if (!tile || !Number.isInteger(tile.z) || tile.z < 0 || tile.z > 14
    || !Number.isInteger(tile.x) || tile.x < 0 || tile.x >= 2 ** tile.z
    || !Number.isInteger(tile.y) || tile.y < 0 || tile.y >= 2 ** tile.z) throw new TypeError('Invalid vector tile coordinates.');
  const decoded = new VectorTile(new PbfReader(input));
  const output = emptyLayers();
  let processed = 0;
  let selected = 0;
  function features(layerName, receive, passes = [() => true]) {
    const layer = decoded.layers[layerName];
    if (!layer) return;
    if (!Number.isInteger(layer.length) || layer.length < 0 || processed + layer.length > MAX_RAW_FEATURES) throw new RangeError('Vector tile feature limit exceeded.');
    processed += layer.length;
    for (const accept of passes) for (let index = 0; index < layer.length; index++) {
      if (selected >= MAX_SELECTED_FEATURES) break;
      const source = layer.feature(index);
      const properties = source.properties || {};
      if (accept(properties)) receive(source, properties, () => source.toGeoJSON(tile.x, tile.y, tile.z));
    }
  }
  function append(target, feature, className) {
    if (selected >= MAX_SELECTED_FEATURES) return;
    selected++;
    // The top-level class keeps compatibility with the original compact map rows.
    const normalized = { ...feature, class: className, properties: { ...feature.properties, class: className } };
    output[target].push(normalized);
  }
  function appendLabel(label) {
    if (selected >= MAX_SELECTED_FEATURES) return;
    selected++;
    output.labels.push(label);
  }
  for (const layer of ['landcover', 'landuse']) features(layer, (source, properties, convert) => {
    if (source.type !== 3) return;
    if (layer === 'landuse' && !['cemetery', 'park', 'recreation', 'recreation_ground', 'pitch', 'golf_course', 'allotments'].includes(properties.class)) return;
    append('land', convert(), woodClass(properties));
  });
  features('water', (source, properties, convert) => {
    if (source.type === 3) append('water', convert(), properties.class || 'water');
  });
  features('waterway', (source, properties, convert) => {
    if (source.type !== 2 || ['riverbank', 'shoreline', 'shoreline_changing_level'].includes(properties.class)) return;
    const feature = convert();
    append('water', feature, properties.class || 'stream');
    const name = nameOf(properties);
    const coordinates = labelPoint(feature.geometry);
    if (name && finitePoint(coordinates)) appendLabel({ name, kind: 'water', class: properties.class || 'river', rank: 8, coordinates });
  });
  features('building', (source, properties, convert) => {
    if (source.type === 3) append('buildings', convert(), properties.class || 'building');
  });
  features('transportation', (source, properties, convert) => {
    const className = roadClass(properties.class);
    if (source.type === 2 && className) append('roads', convert(), className);
  }, tile.z < 12
    ? [properties => roadClass(properties.class) !== 'minor']
    : [properties => roadClass(properties.class) !== 'minor', properties => roadClass(properties.class) === 'minor']);
  for (const [layer, kind] of [['place', 'place'], ['water_name', 'water'], ['transportation_name', 'road']]) {
    features(layer, (source, properties, convert) => {
      const name = nameOf(properties);
      if (!name || (kind === 'place' && source.type !== 1)
        || (kind === 'road' && (!roadClass(properties.class) || roadClass(properties.class) === 'rail'
          || (tile.z < 12 && roadClass(properties.class) === 'minor')))) return;
      const coordinates = labelPoint(convert().geometry);
      if (!finitePoint(coordinates)) return;
      appendLabel({ name, kind, class: properties.class || kind,
        rank: typeof properties.rank === 'number' && Number.isFinite(properties.rank) ? properties.rank : kind === 'place' ? 10 : kind === 'water' ? 8 : 20,
        coordinates });
    });
  }
  return output;
}

/** Keep clipped geometry from each tile; only duplicate label positions are removed. */
export function mergeVectorLayers(tileLayers) {
  const output = emptyLayers();
  const labels = new Set();
  for (const layers of tileLayers) {
    if (!layers) continue;
    for (const kind of ['land', 'water', 'buildings', 'roads']) if (Array.isArray(layers[kind])) output[kind].push(...layers[kind]);
    for (const label of layers.labels || []) {
      if (!label || !finitePoint(label.coordinates) || typeof label.name !== 'string' || !label.name) continue;
      const key = `${label.name}:${label.coordinates[0].toFixed(5)},${label.coordinates[1].toFixed(5)}`;
      if (labels.has(key)) continue;
      labels.add(key);
      output.labels.push(label);
    }
  }
  const order = { minor: 0, rail: 1, tertiary: 2, secondary: 3, primary: 4, trunk: 5, motorway: 6 };
  output.roads.sort((left, right) => (order[left.class ?? left.properties?.class] ?? 0) - (order[right.class ?? right.properties?.class] ?? 0));
  output.labels.sort((left, right) => (left.rank ?? 20) - (right.rank ?? 20));
  return output;
}
