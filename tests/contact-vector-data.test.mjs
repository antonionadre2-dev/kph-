import test from 'node:test';
import assert from 'node:assert/strict';
import { PbfWriter } from 'pbf';
import { SWISS_VECTOR_BOUNDS, viewportTiles, decodeSwissTile, mergeVectorLayers } from '../components/contact/contact-vector-data.js';

// A tiny standards-compliant MVT fixture: real wire format and published layer
// names/classes, with deterministic geometry. Tests never call a tile provider.
function fixture() {
  const point = [9, 4096, 4096];
  const line = [9, 0, 0, 10, 8192, 8192];
  const polygon = [9, 0, 0, 26, 8192, 0, 0, 8192, 8191, 0, 15];
  const layers = [
    { name: 'landcover', type: 3, properties: { class: 'wood', subclass: 'forest' }, geometry: polygon },
    { name: 'landuse', type: 3, properties: { class: 'cemetery' }, geometry: polygon },
    { name: 'water', type: 3, properties: { class: 'river' }, geometry: polygon },
    { name: 'waterway', type: 2, properties: { class: 'stream', name: 'Durach' }, geometry: line },
    { name: 'building', type: 3, properties: {}, geometry: polygon },
    { name: 'transportation', type: 2, properties: { class: 'transit' }, geometry: line },
    { name: 'place', type: 1, properties: { class: 'town', name: 'Schaffhausen', 'name:latin': 'Schaffhausen', rank: 5 }, geometry: point },
    { name: 'water_name', type: 1, properties: { class: 'lake', name: 'Untersee' }, geometry: point },
    { name: 'transportation_name', type: 2, properties: { class: 'primary', name: 'Bahnhofstrasse' }, geometry: line },
  ];
  const writer = new PbfWriter();
  for (const layer of layers) writer.writeMessage(3, (value, pbf) => {
    const entries = Object.entries(value.properties);
    pbf.writeStringField(1, value.name);
    pbf.writeMessage(2, (_unused, feature) => {
      feature.writeVarintField(1, 1);
      feature.writePackedVarint(2, entries.flatMap((_entry, index) => [index, index]));
      feature.writeVarintField(3, value.type);
      feature.writePackedVarint(4, value.geometry);
    }, null);
    for (const [key] of entries) pbf.writeStringField(3, key);
    for (const [, property] of entries) pbf.writeMessage(4, (item, field) => {
      if (typeof item === 'number') field.writeVarintField(4, item);
      else field.writeStringField(1, item);
    }, property);
    pbf.writeVarintField(5, 4096);
    pbf.writeVarintField(15, 2);
  }, layer);
  return writer.finish();
}

function projection(bounds, scale) {
  return {
    scale: () => scale,
    invert: ([x, y]) => [bounds[0] + x / 1000 * (bounds[2] - bounds[0]), bounds[3] - y / 1000 * (bounds[3] - bounds[1])],
  };
}
const longitude = (x, z) => x / 2 ** z * 360 - 180;
const latitude = (y, z) => Math.atan(Math.sinh(Math.PI * (1 - 2 * y / 2 ** z))) * 180 / Math.PI;

test('a Swiss-wide viewport lowers tile resolution to a finite complete visible coverage', () => {
  const tiles = viewportTiles(projection([5.9, 45.7, 10.6, 47.9], 512 * 2 ** 14 / (2 * Math.PI)), 1000, 1000);
  assert.ok(tiles.length > 0 && tiles.length <= 16);
  assert.equal(new Set(tiles.map(tile => tile.key)).size, tiles.length);
  const zoom = tiles[0].z;
  assert.ok(zoom < 14);
  for (const tile of tiles) {
    assert.equal(tile.z, zoom);
    assert.equal(tile.key, `${tile.z}/${tile.x}/${tile.y}`);
    assert.equal(tile.url, `https://vectortiles.geo.admin.ch/tiles/ch.swisstopo.base.vt/v1.0.0/${tile.key}.pbf`);
    assert.ok(Number.isInteger(tile.x) && tile.x >= 0 && tile.x < 2 ** zoom);
    assert.ok(Number.isInteger(tile.y) && tile.y >= 0 && tile.y < 2 ** zoom);
  }
  assert.ok(longitude(Math.min(...tiles.map(tile => tile.x)), zoom) <= 5.9);
  assert.ok(longitude(Math.max(...tiles.map(tile => tile.x)) + 1, zoom) >= 10.6);
  assert.ok(latitude(Math.min(...tiles.map(tile => tile.y)), zoom) >= 47.9);
  assert.ok(latitude(Math.max(...tiles.map(tile => tile.y)) + 1, zoom) <= 45.7);
});

test('tile selection covers a close Swiss destination and respects official bounds and zoom limits', () => {
  const tiles = viewportTiles(projection([8.61, 47.69, 8.67, 47.73], 512 * 2 ** 16 / (2 * Math.PI)), 1000, 1000);
  assert.ok(tiles.length > 0 && tiles.length <= 16);
  assert.equal(tiles[0].z, 14);
  const country = viewportTiles(projection([-180, -85, 180, 85], 512 * 2 ** 14 / (2 * Math.PI)), 1000, 1000);
  assert.ok(country.length > 0 && country.length <= 16);
  assert.ok(longitude(Math.min(...country.map(tile => tile.x)), country[0].z) > -180);
  assert.deepEqual(viewportTiles(projection([-78, 38, -77, 40], 100000), 1000, 1000), []);
  assert.deepEqual(viewportTiles(projection(SWISS_VECTOR_BOUNDS, 100000), 0, 1000), []);
  assert.deepEqual(viewportTiles({ scale: () => NaN, invert: () => [8, 47] }, 100, 100), []);
});

test('MVT decode restores palette classes and real longitude/latitude coordinates for D3', () => {
  const layers = decodeSwissTile(fixture(), { z: 13, x: 4292, y: 2857 });
  assert.equal(layers.land.length, 2);
  assert.equal(layers.land[0].class, 'wood');
  assert.equal(layers.land[0].properties.class, 'wood');
  assert.equal(layers.water.length, 2);
  assert.deepEqual(layers.water.map(feature => feature.geometry.type), ['Polygon', 'LineString']);
  assert.equal(layers.buildings.length, 1);
  assert.equal(layers.buildings[0].class, 'building');
  assert.equal(layers.roads.length, 1);
  assert.equal(layers.roads[0].class, 'rail');
  assert.equal(layers.roads[0].properties.class, 'rail');
  const place = layers.labels.find(label => label.kind === 'place');
  assert.equal(place.name, 'Schaffhausen');
  assert.equal(place.rank, 5);
  assert.ok(place.coordinates[0] > 8.61 && place.coordinates[0] < 8.66);
  assert.ok(place.coordinates[1] > 47.69 && place.coordinates[1] < 47.73);
  assert.ok(layers.labels.some(label => label.name === 'Durach' && label.kind === 'water'));
  assert.ok(layers.labels.some(label => label.name === 'Bahnhofstrasse' && label.kind === 'road'));
  assert.deepEqual(decodeSwissTile(fixture().buffer, { z: 13, x: 4292, y: 2857 }), layers);
});

test('decoding rejects oversized bytes and impossible tile coordinates before reading geometry', () => {
  for (const bytes of [new Uint8Array(), new Uint8Array(2 * 1024 * 1024 + 1), 'not protobuf']) {
    assert.throws(() => decodeSwissTile(bytes, { z: 13, x: 4292, y: 2857 }), /Invalid vector tile bytes/);
  }
  for (const tile of [{ z: 15, x: 1, y: 1 }, { z: 1, x: 2, y: 0 }, { z: 1, x: -1, y: 0 }, { z: 1, x: 0, y: 0.5 }]) {
    assert.throws(() => decodeSwissTile(fixture(), tile), /Invalid vector tile coordinates/);
  }
});

test('merging keeps adjacent clipped geometry and deduplicates labels only at matching positions', () => {
  const layers = decodeSwissTile(fixture(), { z: 13, x: 4292, y: 2857 });
  const merged = mergeVectorLayers([layers, layers, { land: [], water: [], buildings: [], roads: [{ type: 'Feature', class: 'minor', properties: { class: 'minor' }, geometry: { type: 'LineString', coordinates: [] } }], labels: [
    { ...layers.labels[1], coordinates: [8.69, 47.71] },
  ] }]);
  assert.equal(merged.buildings.length, layers.buildings.length * 2);
  assert.equal(merged.roads.length, 3);
  assert.equal(merged.roads[0].class, 'minor');
  assert.equal(merged.labels.length, layers.labels.length + 1);
  assert.equal(merged.labels.filter(label => label.name === 'Schaffhausen').length, 2);
  assert.equal(layers.buildings.length, 1);
});

test('dense regional tiles can contain more than 40,000 source roads without flooding regional rendering', () => {
  const writer = new PbfWriter();
  writer.writeMessage(3, (_unused, layer) => {
    layer.writeStringField(1, 'transportation');
    // Street detail legitimately exists in low-zoom Swiss tiles. The final
    // arterial must survive selection even when it occurs after all detail.
    for (let index = 0; index < 40_001; index++) layer.writeMessage(2, (value, feature) => {
      feature.writePackedVarint(2, [0, value]);
      feature.writeVarintField(3, 2);
      feature.writePackedVarint(4, [9, 0, 0, 10, 8192, 8192]);
    }, index === 40_000 ? 1 : 0);
    layer.writeStringField(3, 'class');
    for (const value of ['minor', 'primary']) layer.writeMessage(4, (item, property) => property.writeStringField(1, item), value);
    layer.writeVarintField(5, 4096);
    layer.writeVarintField(15, 2);
  }, null);
  const bytes = writer.finish();
  assert.ok(bytes.byteLength < 2 * 1024 * 1024);
  const regional = decodeSwissTile(bytes, { z: 10, x: 536, y: 358 });
  assert.equal(regional.roads.length, 1);
  assert.equal(regional.roads[0].class, 'primary');
  const detailed = decodeSwissTile(bytes, { z: 13, x: 4292, y: 2857 });
  assert.equal(detailed.roads.length, 40_000);
  assert.equal(detailed.roads[0].class, 'primary');
  assert.equal(detailed.roads.filter(feature => feature.class === 'minor').length, 39_999);
});
