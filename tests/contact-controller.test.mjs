import test from 'node:test';
import assert from 'node:assert/strict';
import { mountKrakenContact } from '../components/contact/contact-controller.js';
import { exampleRoute, findExampleDestination } from '../components/contact/contact-route-logic.js';

const route = (distance_m, duration_s) => ({ distance_m, duration_s,
  geometry: { type: 'LineString', coordinates: [[8.65, 47.69], [8.64, 47.68]] } });
const destinations = [
  { label: 'Bahnhof Schaffhausen', address: 'Bahnhofstrasse 29, Schaffhausen', coordinates: [8.63, 47.69], routes: { outbound: route(2200, 360), inbound: route(2600, 420) } },
  { label: 'Bahnhof Neuhausen', address: 'Neuhausen am Rheinfall', coordinates: [8.62, 47.68], routes: { outbound: route(3900, 480), inbound: route(4100, 540) } },
  { label: 'Rheinfall', address: 'Rheinfallquai, Neuhausen', coordinates: [8.61, 47.67], routes: { outbound: route(5600, 600), inbound: route(6100, 660) } },
];

class Node {
  nodeType = 1; attributes = new Map(); listeners = new Map(); queries = new Map(); dataset = {};
  children = []; style = {}; value = ''; hidden = false; disabled = false; inert = false; isConnected = true;
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  removeAttribute(name) { this.attributes.delete(name); }
  toggleAttribute(name, force = !this.attributes.has(name)) { force ? this.setAttribute(name, '') : this.removeAttribute(name); }
  querySelector(selector) { const value = this.queries.get(selector); return Array.isArray(value) ? value[0] : value ?? null; }
  querySelectorAll(selector) { const value = this.queries.get(selector); return value ? Array.isArray(value) ? value : [value] : []; }
  addEventListener(type, listener) { if (!this.listeners.has(type)) this.listeners.set(type, new Set()); this.listeners.get(type).add(listener); }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  fire(type, event = {}) { for (const callback of this.listeners.get(type) ?? []) callback({ target: this, currentTarget: this, preventDefault() {}, ...event }); }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children = nodes; }
  focus() { this.ownerDocument.activeElement = this; }
  contains(element) { return this.children.includes(element); }
  closest(selector) {
    if (selector === 'button[data-candidate-index]' && this.dataset.candidateIndex !== undefined) return this;
    if (selector === 'button[data-destination-index]' && this.dataset.destinationIndex !== undefined) return this;
    return null;
  }
  getBoundingClientRect() { return { x: 0, y: 0, width: 700, height: 800 }; }
  getTotalLength() { return 100; }
  getPointAtLength(length) { return { x: length, y: length }; }
  getBBox() { return { x: 20, y: 100, width: 10, height: 10 }; }
  remove() { this.removed = true; }
}

function fixture({ reduced = false, customDestinations = destinations } = {}) {
  const frames = new Map(); let nextFrame = 0; const nodes = []; const selections = []; const observers = [];
  const view = new Node();
  const media = new Node(); media.matches = reduced;
  view.matchMedia = () => media;
  view.requestAnimationFrame = callback => { frames.set(++nextFrame, callback); return nextFrame; };
  view.cancelAnimationFrame = id => frames.delete(id);
  view.clearTimeout = () => {};
  view.ResizeObserver = class { constructor(callback) { this.callback = callback; this.connected = false; observers.push(this); } observe() { this.connected = true; } disconnect() { this.connected = false; } };
  const doc = new Node(); doc.defaultView = view;
  const make = () => { const node = new Node(); node.ownerDocument = doc; nodes.push(node); return node; };
  doc.createElement = make; doc.createTextNode = text => ({ textContent: text });
  const root = make(); root.clientWidth = 1100;
  const selectors = ['.kr-map', '.kr-contact', '.kr-geography', '.kr-search input', '.kr-search > button',
    '.kr-suggestions', '.kr-address-error', '.kr-result', '.kr-distance', '.kr-duration', '.kr-result-direction',
    '.kr-office-marker', '.kr-travel-marker', '.kr-route-player', '.kr-play-icon', '.kr-pause-icon',
    '.kr-route-player > span', '.kr-gallery-panel', '.kr-gallery-close', '.kr-gallery-cover',
    '.kr-gallery-stage', '.kr-gallery-stage .kr-scene-image', '[data-map-action="in"]', '[data-map-action="out"]',
    '.kr-map-help', '.kr-quote', '.kr-search-status', '.kr-precision-note', '.kr-selected-marker', '.kr-basemap-status'];
  const elements = Object.fromEntries(selectors.map(selector => { const node = make(); root.queries.set(selector, node); return [selector, node]; }));
  elements['.kr-selected-marker'].queries.set('span', make());
  elements['.kr-search input'].value = 'Rheinfall';
  const directionButtons = ['outbound', 'inbound'].map(direction => { const node = make(); node.dataset.direction = direction; return node; });
  const placeButtons = destinations.map((_, i) => { const node = make(); node.dataset.place = String(i); return node; });
  const galleryButtons = ['exterior', 'interior'].map(key => { const node = make(); node.dataset.gallery = key; return node; });
  root.queries.set('[data-direction]', directionButtons); root.queries.set('[data-place]', placeButtons);
  root.queries.set('[data-gallery]', galleryButtons);
  const galleryControls = [elements['.kr-gallery-close'], ...galleryButtons];
  elements['.kr-gallery-panel'].queries.set('button, a[href], input, select, textarea, [tabindex]', galleryControls);
  root.queries.set('[data-map-action]', [elements['[data-map-action="in"]'], elements['[data-map-action="out"]']]);
  const transform = { k: 1, x: 0, y: 0 };
  const zoomCallbacks = new Map(); let zoomFilter;
  const zoom = () => {};
  for (const name of ['scaleExtent', 'extent', 'translateExtent']) zoom[name] = () => zoom;
  zoom.filter = callback => { zoomFilter = callback; return zoom; };
  zoom.on = (name, callback) => { zoomCallbacks.set(name, callback); return zoom; };
  zoom.transform = () => { zoomCallbacks.get('zoom.krakenContact')?.({ transform }); };
  zoom.scaleBy = () => {};
  class Selection {
    constructor(node = make()) { this.element = node; selections.push(this); }
    append() { const node = make(); this.element.append(node); return new Selection(node); }
    selectAll() { return new Selection(); }
    data() { return this; } join() { return this; } datum() { return this; }
    attr(name, value) { if (value === null) this.element.removeAttribute(name); else if (typeof value !== 'function') this.element.setAttribute(name, value); return this; }
    style(name, value) { this.element.style[name] = value; return this; }
    on() { return this; } interrupt() { return this; } transition() { return this; } duration() { return this; }
    text(value) { this.element.textContent = value; return this; }
    call(callback, ...args) { callback(this, ...args); return this; }
    node() { return this.element; }
    remove() { this.element.remove(); return this; }
  }
  const projection = point => point;
  projection.fitExtent = () => projection; projection.scale = value => value === undefined ? 1 : projection;
  projection.translate = value => value === undefined ? [0, 0] : projection;
  projection.invert = ([x, y]) => [8 + x / 1000, 48 - y / 1000];
  const d3 = { select: node => new Selection(node), geoMercator: () => projection,
    geoPath: () => () => 'M0,0L100,100', geoArea: () => 1, zoom: () => zoom, zoomIdentity: transform };
  const data = { office: { coordinates: [8.65, 47.69] }, bbox: [8.5, 47.6, 8.7, 47.8], map: { layers: {} }, destinations: customDestinations };
  const options = { d3, data, assets: { logo: '/logo.webp', exterior: '/exterior.webp', interior: '/interior.webp' },
    locale: 'es', t: source => 'ES: ' + source, calculatorUrl: '/quote?lang=es' };
  return { root, doc, view, nodes, frames, observers, elements, options, directionButtons, placeButtons, galleryButtons,
    get zoomFilter() { return zoomFilter; },
    flush(timestamp) { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(timestamp)); } };
}

test('example matching is exact and invalid route geometry never yields old metrics', () => {
  assert.equal(findExampleDestination(destinations, ' BAHNHOF Schaffhausen '), 0);
  assert.equal(findExampleDestination(destinations, 'Rheinfallquai, Neuhausen'), 2);
  assert.equal(findExampleDestination(destinations, 'Rheinfallstrasse 50'), -1);
  assert.equal(findExampleDestination(destinations, ''), -1);
  assert.equal(exampleRoute(destinations[2], 'inbound').distance_m, 6100);
  for (const bad of [null, { ...route(2, 1), distance_m: NaN }, { ...route(2, 1), duration_s: -1 },
    { ...route(2, 1), geometry: { type: 'LineString', coordinates: [[8.5, 47.6]] } }]) {
    assert.equal(exampleRoute({ routes: { outbound: bad } }, 'outbound'), null);
  }
});

test('editing an example clears every old result and direction changes cannot resurrect it', () => {
  const f = fixture(); const { elements: e } = f;
  const controller = mountKrakenContact(f.root, f.options);
  assert.equal(e['.kr-distance'].children[0].textContent, '5,6 ');
  assert.equal(e['.kr-duration'].textContent, 'ES: ca. 10 Min.');
  f.directionButtons[1].fire('click');
  assert.equal(e['.kr-distance'].children[0].textContent, '6,1 ');
  e['.kr-search input'].value = 'Unknown street 32';
  e['.kr-search input'].fire('input');
  assert.equal(e['.kr-result'].hidden, true);
  assert.equal(e['.kr-distance'].children.length, 0);
  assert.equal(e['.kr-duration'].textContent, '');
  assert.equal(e['.kr-route-player'].disabled, true);
  f.directionButtons[0].fire('click');
  assert.equal(e['.kr-result'].hidden, true);
  e['.kr-search > button'].fire('click');
  assert.equal(e['.kr-address-error'].hidden, false);
  assert.match(e['.kr-address-error'].textContent, /^ES: /);
  f.placeButtons[0].fire('click');
  assert.equal(e['.kr-result'].hidden, false);
  assert.equal(e['.kr-distance'].children[0].textContent, '2,2 ');
  controller.destroy();
});

test('a known example with no reverse route hides the previous route and explains the absence', () => {
  const customDestinations = structuredClone(destinations); customDestinations[2].routes.inbound = null;
  const f = fixture({ customDestinations });
  const controller = mountKrakenContact(f.root, f.options);
  f.directionButtons[1].fire('click');
  assert.equal(f.elements['.kr-result'].hidden, true);
  assert.equal(f.elements['.kr-route-player'].disabled, true);
  assert.equal(f.elements['.kr-address-error'].hidden, false);
  assert.match(f.elements['.kr-address-error'].textContent, /keine Route verfügbar/);
  f.directionButtons[0].fire('click');
  assert.equal(f.elements['.kr-result'].hidden, false);
  assert.equal(f.elements['.kr-address-error'].hidden, true);
  controller.destroy();
});

test('language-effect restarts preserve an unknown query without restoring a previous example', () => {
  const f = fixture(); const input = f.elements['.kr-search input'];
  const first = mountKrakenContact(f.root, f.options);
  f.directionButtons[1].fire('click');
  input.value = 'Unlisted address 51'; input.fire('input');
  f.elements['.kr-search > button'].fire('click'); first.destroy();
  const second = mountKrakenContact(f.root, { ...f.options, locale: 'fr', t: source => 'FR: ' + source });
  assert.equal(input.value, 'Unlisted address 51');
  assert.equal(f.elements['.kr-result'].hidden, true);
  assert.match(f.elements['.kr-address-error'].textContent, /^FR: /);
  f.directionButtons[0].fire('click');
  assert.equal(f.elements['.kr-result'].hidden, true);
  f.placeButtons[0].fire('click');
  assert.equal(input.value, 'FR: Bahnhof Schaffhausen');
  f.directionButtons[1].fire('click');
  assert.equal(f.elements['.kr-result'].hidden, false, 'translated example labels stay valid when switching direction');
  second.destroy();
});

test('playback pauses cleanly, reduced motion does not animate and remount destroys old listeners', () => {
  const f = fixture(); const player = f.elements['.kr-route-player'];
  const first = mountKrakenContact(f.root, f.options);
  player.fire('click'); f.flush(100); f.flush(1200);
  assert.equal(player.getAttribute('aria-pressed'), 'true');
  player.fire('click');
  assert.equal(player.getAttribute('aria-pressed'), 'false');
  assert.equal(f.frames.size, 0);
  assert.equal(f.zoomFilter({ type: 'wheel', ctrlKey: false }), false, 'ordinary wheel scroll belongs to the page');
  assert.equal(f.zoomFilter({ type: 'touchstart', touches: [{}] }), false, 'single touch belongs to page scrolling');
  assert.equal(f.zoomFilter({ type: 'touchstart', touches: [{}, {}] }), true);
  const second = mountKrakenContact(f.root, f.options);
  first.destroy();
  assert.equal(player.listeners.get('click').size, 1);
  assert.equal(f.observers.filter(observer => observer.connected).length, 1);
  assert.equal(f.elements['.kr-geography'].children.filter(node => node.attributes.has('data-kraken-contact-layer') && !node.removed).length, 1);
  second.destroy(); second.destroy();
  assert.equal(f.frames.size, 0);
  assert.equal(f.observers.filter(observer => observer.connected).length, 0);
  assert.equal([f.doc, f.view, f.view.matchMedia(), ...f.nodes].reduce((total, node) => total + [...node.listeners.values()].reduce((n, set) => n + set.size, 0), 0), 0);
  assert.equal(f.elements['.kr-geography'].children.filter(node => node.attributes.has('data-kraken-contact-layer') && !node.removed).length, 0);
  const reduced = fixture({ reduced: true }); const controller = mountKrakenContact(reduced.root, reduced.options);
  reduced.flush(0); reduced.elements['.kr-route-player'].fire('click');
  assert.equal(reduced.elements['.kr-route-player'].getAttribute('aria-pressed'), 'false');
  assert.equal(reduced.frames.size, 0);
  assert.match(reduced.elements['.kr-route-player > span'].textContent, /Erneut ansehen/);
  controller.destroy();
});

test('gallery traps keyboard focus, Escape closes and destroy restores owned inert state', () => {
  const f = fixture(); const e = f.elements;
  const controller = mountKrakenContact(f.root, f.options);
  e['.kr-gallery-cover'].fire('click');
  assert.equal(e['.kr-gallery-panel'].hidden, false);
  assert.equal(e['.kr-map'].inert, true);
  assert.equal(f.doc.activeElement, e['.kr-gallery-close']);
  let prevented = false;
  f.root.fire('keydown', { key: 'Tab', shiftKey: true, preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(f.doc.activeElement, f.galleryButtons[1]);
  f.root.fire('keydown', { key: 'Escape' });
  assert.equal(e['.kr-gallery-panel'].hidden, true);
  assert.equal(f.doc.activeElement, e['.kr-gallery-cover']);
  assert.equal(e['.kr-map'].inert, false);
  e['.kr-office-marker'].fire('click'); controller.destroy();
  assert.equal(e['.kr-map'].inert, false);
  assert.equal(e['.kr-contact'].inert, false);
  assert.equal(e['.kr-gallery-panel'].hidden, true);
});

test('live controller displays selectable API results, precision and missing-key state without example metrics', async () => {
  const f = fixture(); const e = f.elements;
  const candidate = { id: 'ch-postcode-8001', label: '8001 Zürich', coordinates: [8.54, 47.37], kind: 'postcode' };
  let routeCalls = 0;
  const controller = mountKrakenContact(f.root, { ...f.options, live: true, routingAvailable: false,
    search: async () => [candidate], route: async () => { routeCalls++; return route(52000, 3900); } });
  assert.equal(e['.kr-result'].hidden, true, 'live mode does not show static Rheinfall route metrics');
  assert.equal(e['.kr-route-player'].disabled, true);
  e['.kr-search input'].value = '8001'; e['.kr-search input'].fire('input');
  e['.kr-search > button'].fire('click');
  assert.match(e['.kr-search-status'].textContent, /Adressen werden gesucht/);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(e['.kr-suggestions'].hidden, false);
  assert.equal(e['.kr-result'].hidden, true);
  const suggestion = e['.kr-suggestions'].children[0];
  e['.kr-suggestions'].fire('click', { target: suggestion });
  assert.equal(e['.kr-selected-marker'].hidden, false);
  assert.equal(e['.kr-precision-note'].hidden, false);
  assert.match(e['.kr-address-error'].textContent, /momentan nicht verfügbar/);
  assert.equal(routeCalls, 0);
  f.directionButtons[1].fire('click');
  assert.equal(e['.kr-result'].hidden, true);
  e['.kr-search input'].value = 'Unknown'; e['.kr-search input'].fire('input');
  assert.equal(e['.kr-selected-marker'].hidden, true);
  assert.equal(e['.kr-precision-note'].hidden, true);
  assert.equal(e['.kr-distance'].children.length, 0);
  controller.destroy();
});
