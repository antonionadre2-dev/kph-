import test from 'node:test';
import assert from 'node:assert/strict';
import { createLiveRouteSession } from '../components/contact/contact-route-logic.js';
import { createSwissBasemap, normaliseVectorFeature } from '../components/contact/contact-basemap.js';

const address = { id: 'address-1', label: 'Bahnhofstrasse 1, 8001 Zürich', coordinates: [8.5403, 47.3769], kind: 'address' };
const postcode = { id: 'postcode-1', label: '8001 Zürich', coordinates: [8.5403, 47.3769], kind: 'postcode' };
const liveRoute = (distance = 52000) => ({ distance_m: distance, duration_s: 3900,
  geometry: { type: 'LineString', coordinates: [[8.655662, 47.699447], [8.5403, 47.3769]] } });
const deferred = () => { let resolve; let reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const nextTurn = () => new Promise(resolve => setImmediate(resolve));

test('live search always requires candidate selection and reverse travel requests a separate route', async () => {
  const requests = []; const updates = [];
  const session = createLiveRouteSession({ routingAvailable: true,
    search: async () => [address], route: async (candidate, direction) => {
      requests.push({ candidate, direction }); return liveRoute(direction === 'outbound' ? 52000 : 54000);
    }, onChange: state => updates.push(state) });
  await session.find('8001');
  assert.equal(session.snapshot().status, 'candidates');
  assert.equal(requests.length, 0, 'even one result is not silently treated as an exact address');
  await session.select(address);
  assert.equal(session.snapshot().route.distance_m, 52000);
  session.setDirection('inbound');
  assert.equal(session.snapshot().route, null, 'old metrics clear while reverse route is pending');
  await nextTurn();
  assert.equal(session.snapshot().route.distance_m, 54000);
  assert.deepEqual(requests.map(request => request.direction), ['outbound', 'inbound']);
  assert.ok(updates.some(state => state.status === 'searching'));
  assert.ok(updates.some(state => state.status === 'routing'));
  session.destroy();
});

test('editing aborts pending requests and stale geocoding/route results cannot restore earlier data', async () => {
  const searches = []; const routes = [];
  const session = createLiveRouteSession({ routingAvailable: true,
    search: (query, signal) => { const pending = deferred(); searches.push({ query, signal, ...pending }); return pending.promise; },
    route: (candidate, direction, signal) => { const pending = deferred(); routes.push({ candidate, direction, signal, ...pending }); return pending.promise; },
    onChange() {} });
  const first = session.find('Zürich'); const second = session.find('8001');
  assert.equal(searches[0].signal.aborted, true);
  searches[1].resolve([postcode]); await second;
  searches[0].resolve([address]); await first;
  assert.deepEqual(session.snapshot().candidates, [postcode]);
  const selected = session.select(postcode);
  session.edit('Unknown road 51');
  assert.equal(routes[0].signal.aborted, true);
  assert.equal(session.snapshot().selected, null);
  session.setDirection('inbound');
  routes[0].resolve(liveRoute()); await selected;
  assert.equal(session.snapshot().query, 'Unknown road 51');
  assert.equal(session.snapshot().route, null);
  assert.equal(session.snapshot().status, 'idle');
  session.destroy();
});

test('missing routing configuration, no-route, service errors and empty search remain explicit', async () => {
  let calls = 0;
  const noKey = createLiveRouteSession({ routingAvailable: false, search: async () => [postcode],
    route: async () => { calls++; return liveRoute(); }, onChange() {} });
  await noKey.select(postcode);
  assert.equal(noKey.snapshot().errorCode, 'not_configured');
  assert.equal(noKey.snapshot().selected.kind, 'postcode');
  assert.equal(noKey.snapshot().route, null);
  assert.equal(calls, 0);
  noKey.destroy();
  for (const code of ['no_route', 'unavailable', 'rate_limited']) {
    const session = createLiveRouteSession({ routingAvailable: true,
      search: async () => [], route: async () => { throw Object.assign(new Error(code), { code }); }, onChange() {} });
    await session.find('Not found'); assert.equal(session.snapshot().status, 'empty');
    await session.select(address); assert.equal(session.snapshot().errorCode, code);
    assert.equal(session.snapshot().route, null); session.destroy();
  }
});

test('language restart restores selected candidates by fetching again and destroy prevents late writes', async () => {
  const pending = deferred(); const updates = []; let signal;
  const session = createLiveRouteSession({ routingAvailable: true, initial: { query: postcode.label, direction: 'inbound', selected: postcode, route: liveRoute() },
    search: async () => [], route: (_candidate, _direction, abortSignal) => { signal = abortSignal; return pending.promise; }, onChange: state => updates.push(state) });
  session.restore();
  assert.equal(session.snapshot().status, 'routing');
  assert.equal(session.snapshot().route, null, 'a cached pending/old route is never reused');
  session.destroy(); const count = updates.length;
  assert.equal(signal.aborted, true);
  pending.resolve(liveRoute()); await nextTurn();
  assert.equal(updates.length, count);
  const unknown = createLiveRouteSession({ routingAvailable: true, initial: { query: 'Unknown 32', direction: 'inbound' },
    search: async () => { throw Error('unexpected search'); }, route: async () => { throw Error('unexpected route'); }, onChange() {} });
  unknown.restore();
  assert.equal(unknown.snapshot().query, 'Unknown 32'); assert.equal(unknown.snapshot().route, null);
  unknown.destroy();
});

import { PbfWriter } from 'pbf';
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

class RenderNode {
  constructor(tag, parent = null) { this.tag = tag; this.parent = parent; this.attrs = new Map(); this.children = []; }
  getBBox() { return { x: Number(this.attrs.get('x')) - 20, y: Number(this.attrs.get('y')) - 10, width: 40, height: 12 }; }
}
class RenderSelection {
  constructor(nodes, parent = null, selector = null) { this.nodes = nodes; this.parent = parent; this.selector = selector; }
  append(tag) { const children = this.nodes.map(parent => { const child = new RenderNode(tag, parent); parent.children.push(child); return child; }); return new RenderSelection(children); }
  attr(name, value) { this.nodes.forEach(node => { const actual = typeof value === 'function' ? value(node.data) : value; actual === null ? node.attrs.delete(name) : node.attrs.set(name, actual); }); return this; }
  selectAll(selector) { const children = this.nodes.flatMap(node => node.children.filter(child => selector === '*' || child.tag === selector)); return new RenderSelection(children, this.nodes[0], selector); }
  data(data) { this.incoming = data; return this; }
  join(tag) {
    this.parent.children = this.parent.children.filter(node => this.selector !== '*' && node.tag !== this.selector);
    const children = this.incoming.map(data => { const node = new RenderNode(tag, this.parent); node.data = data; this.parent.children.push(node); return node; });
    return new RenderSelection(children);
  }
  text(value) { this.nodes.forEach(node => { node.textContent = value; }); return this; }
  node() { return this.nodes[0]; }
  remove() { this.nodes.forEach(node => { if (node.parent) node.parent.children = node.parent.children.filter(child => child !== node); }); return this; }
}
function mapProjection(bounds, width = 600, height = 800) {
  const projection = ([longitude, latitude]) => [(longitude - bounds[0]) / (bounds[2] - bounds[0]) * width, (bounds[3] - latitude) / (bounds[3] - bounds[1]) * height];
  projection.invert = ([x, y]) => [bounds[0] + x / width * (bounds[2] - bounds[0]), bounds[3] - y / height * (bounds[3] - bounds[1])];
  projection.scale = () => width / ((bounds[2] - bounds[0]) * Math.PI / 180);
  return projection;
}
function renderer() {
  const node = new RenderNode('svg');
  const requests = []; const timers = new Map(); let timerId = 0;
  const d3 = { geoArea: () => 1, geoPath: () => () => 'M0,0L1,1' };
  const view = { setTimeout(callback) { timers.set(++timerId, callback); return timerId; }, clearTimeout(id) { timers.delete(id); },
    fetch(url, options) { const request = deferred(); requests.push({ url, signal: options.signal, ...request }); return request.promise; } };
  const polygon = { class: 'wood', geometry: { type: 'Polygon', coordinates: [[[8.6, 47.7], [8.61, 47.7], [8.61, 47.71], [8.6, 47.7]]] } };
  const status = {};
  const options = { rootLayer: new RenderSelection([node]), d3, view, status,
    initialLayers: { land: [polygon], water: [polygon], roads: [{ class: 'minor', geometry: { type: 'LineString', coordinates: [[8.6, 47.7], [8.61, 47.71]] } }], buildings: [polygon], labels: [] },
    initialBounds: [8.59, 47.65, 8.7, 47.73] };
  const flatten = parent => [parent, ...parent.children.flatMap(flatten)];
  const response = bytes => ({ ok: true, status: 200, headers: { get() { return null; } }, arrayBuffer: async () => bytes });
  const resolveRequests = async (start = 0) => {
    let offset = start;
    for (let turns = 0; turns < 10; turns++) {
      const batch = requests.slice(offset); offset = requests.length;
      batch.forEach(request => request.resolve(response(fixture())));
      await nextTurn();
      if (requests.length === offset) break;
    }
  };
  return { node, requests, timers, options, status, flatten, response, resolveRequests };
}

test('local vector map restores the original palette without network images and owns one removable layer', () => {
  const f = renderer();
  const map = createSwissBasemap(f.options);
  map.schedule(mapProjection([8.60, 47.66, 8.69, 47.72]), 600, 800, true);
  assert.equal(f.requests.length, 0, 'the supplied local map remains exact inside its bounds');
  const nodes = f.flatten(f.node);
  assert.equal(nodes.filter(node => node.attrs.has('data-kraken-vector-basemap')).length, 1);
  assert.equal(nodes.some(node => node.tag === 'image'), false, 'the map is native vector geometry');
  for (const colour of ['#d7e5de', '#bbd6e5', '#cdd8df', '#fbfdfe']) assert.ok(nodes.some(node => node.attrs.get('fill') === colour || node.attrs.get('stroke') === colour), colour);
  map.destroy(); map.destroy();
  assert.equal(f.node.children.length, 0);
  const second = createSwissBasemap(f.options);
  assert.equal(f.flatten(f.node).filter(node => node.attrs.has('data-kraken-vector-basemap')).length, 1);
  second.destroy();
});

test('polygon and multipolygon winding normalise without mutating source coordinates', () => {
  const first = [[[0, 0], [1, 0], [1, 1], [0, 0]]];
  const second = [[[2, 2], [3, 2], [3, 3], [2, 2]]];
  const feature = { type: 'Feature', properties: { class: 'wood' }, geometry: { type: 'MultiPolygon', coordinates: [first, second] } };
  const before = structuredClone(feature);
  const result = normaliseVectorFeature(feature, { geoArea: () => 8 });
  assert.deepEqual(feature, before);
  assert.deepEqual(result.geometry.coordinates, [first.map(ring => ring.slice().reverse()), second.map(ring => ring.slice().reverse())]);
});

test('vector loads are bounded, atomic and abort stale coverage before rendering a new viewport', async () => {
  const f = renderer(); const map = createSwissBasemap(f.options);
  map.schedule(mapProjection([8.50, 47.34, 8.58, 47.40]), 600, 800, true);
  assert.ok(f.requests.length > 0 && f.requests.length <= 4);
  assert.equal(f.node.children[0].attrs.get('display'), 'none');
  const old = f.requests.slice();
  map.schedule(mapProjection([7.40, 46.92, 7.48, 46.98]), 600, 800);
  assert.ok(old.every(request => request.signal.aborted));
  map.schedule(mapProjection([7.42, 46.92, 7.50, 46.98]), 600, 800);
  assert.equal(f.timers.size, 1);
  const start = f.requests.length;
  const callback = [...f.timers.values()][0]; f.timers.clear(); callback();
  await f.resolveRequests(start);
  assert.ok(f.requests.length - start <= 16);
  assert.equal(f.node.children[0].attrs.has('display'), false);
  assert.equal(f.status.hidden, true);
  old.forEach(request => request.resolve(f.response(fixture()))); await nextTurn();
  assert.equal(f.status.hidden, true, 'late earlier coverage cannot replace the accepted viewport');
  assert.ok(f.flatten(f.node).filter(node => node.tag === 'path').length < 30, 'geometry is grouped by class instead of one DOM node per feature');
  map.destroy(); assert.equal(f.node.children.length, 0);
});

test('partial or oversized vector failures hide outside coverage and cleanup cancels timers and requests', async () => {
  const f = renderer(); const map = createSwissBasemap(f.options);
  map.schedule(mapProjection([8.50, 47.34, 8.58, 47.40]), 600, 800, true);
  f.requests[0].resolve({ ok: true, headers: { get() { return String(3 * 1024 * 1024); } } });
  await nextTurn();
  assert.equal(f.node.children[0].attrs.get('display'), 'none');
  assert.match(f.status.textContent, /nicht geladen/);
  assert.ok(f.requests.every(request => request.signal.aborted));
  map.schedule(mapProjection([7.42, 46.92, 7.50, 46.98]), 600, 800);
  assert.equal(f.timers.size, 1);
  map.destroy(); assert.equal(f.timers.size, 0);
  assert.equal(f.node.children.length, 0);
});

