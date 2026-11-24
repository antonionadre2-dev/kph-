import { viewportTiles, decodeSwissTile, mergeVectorLayers } from './contact-vector-data.js';

const MAX_TILE_BYTES = 2 * 1024 * 1024;
const MAX_CACHE_TILES = 32;
const ROAD_WIDTH = { motorway: 5.3, trunk: 5, primary: 4.5, secondary: 3.7, tertiary: 2.6, minor: 1.6, rail: 1.4 };
const ROAD_PRIORITY = { minor: 0, rail: 1, tertiary: 2, secondary: 3, primary: 4, trunk: 5, motorway: 6 };
const geometryBounds = new WeakMap();

function viewportBounds(projection, width, height) {
  const a = projection.invert([0, 0]);
  const b = projection.invert([width, height]);
  return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])];
}
function contains(outer, inner) {
  return Boolean(outer && inner && inner.every(Number.isFinite)
    && inner[0] >= outer[0] - 1e-8 && inner[1] >= outer[1] - 1e-8
    && inner[2] <= outer[2] + 1e-8 && inner[3] <= outer[3] + 1e-8);
}
function tileBounds(tiles) {
  const longitude = (x, z) => x / (2 ** z) * 360 - 180;
  const latitude = (y, z) => Math.atan(Math.sinh(Math.PI * (1 - 2 * y / (2 ** z)))) * 180 / Math.PI;
  return [Math.min(...tiles.map(tile => longitude(tile.x, tile.z))), Math.min(...tiles.map(tile => latitude(tile.y + 1, tile.z))),
    Math.max(...tiles.map(tile => longitude(tile.x + 1, tile.z))), Math.max(...tiles.map(tile => latitude(tile.y, tile.z)))];
}

export function normaliseVectorFeature(value, d3) {
  const feature = value.type === 'Feature' ? { ...value, properties: { ...value.properties } }
    : { type: 'Feature', properties: { class: value.class }, geometry: value.geometry || value };
  const normalisePolygon = coordinates => {
    const polygon = { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates } };
    return d3.geoArea(polygon) > Math.PI * 2 ? coordinates.map(ring => ring.slice().reverse()) : coordinates;
  };
  if (feature.geometry.type === 'Polygon') feature.geometry = { type: 'Polygon', coordinates: normalisePolygon(feature.geometry.coordinates) };
  if (feature.geometry.type === 'MultiPolygon') feature.geometry = { type: 'MultiPolygon', coordinates: feature.geometry.coordinates.map(normalisePolygon) };
  return feature;
}
function boundsOf(feature) {
  let bounds = geometryBounds.get(feature);
  if (bounds) return bounds;
  bounds = [Infinity, Infinity, -Infinity, -Infinity];
  const scan = coordinates => {
    if (typeof coordinates[0] === 'number') {
      bounds[0] = Math.min(bounds[0], coordinates[0]); bounds[1] = Math.min(bounds[1], coordinates[1]);
      bounds[2] = Math.max(bounds[2], coordinates[0]); bounds[3] = Math.max(bounds[3], coordinates[1]);
    } else coordinates.forEach(scan);
  };
  scan(feature.geometry.coordinates);
  geometryBounds.set(feature, bounds);
  return bounds;
}
const overlaps = (a, b) => a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
const collection = (features, className) => ({ type: 'FeatureCollection', properties: { class: className }, features });
function grouped(features) {
  const groups = new Map();
  for (const feature of features) {
    const name = feature.properties.class || 'other';
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(feature);
  }
  return [...groups].map(([name, items]) => collection(items, name));
}
function normaliseLayers(layers, d3) {
  return Object.fromEntries(['land', 'water', 'buildings', 'roads'].map(name => [name,
    (layers?.[name] || []).map(feature => normaliseVectorFeature(feature, d3))])
    .concat([['labels', layers?.labels || []]]));
}

async function readTile(response, signal) {
  if (!response.ok) throw new Error(`Vector tile HTTP ${response.status}.`);
  if (Number(response.headers?.get('content-length')) > MAX_TILE_BYTES) throw new Error('Vector tile exceeds size limit.');
  if (!response.body?.getReader) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > MAX_TILE_BYTES) throw new Error('Vector tile exceeds size limit.');
    return bytes;
  }
  const reader = response.body.getReader();
  const chunks = []; let size = 0;
  try {
    for (;;) {
      if (signal.aborted) throw Object.assign(new Error('Aborted.'), { name: 'AbortError' });
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_TILE_BYTES) throw new Error('Vector tile exceeds size limit.');
      chunks.push(value);
    }
  } catch (error) { await reader.cancel().catch(() => {}); throw error; }
  finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}

/** Original Kraken palette, with official vectors for destinations beyond the supplied local sample. */
export function createSwissBasemap({ d3, rootLayer, view, status, t = source => source,
  initialLayers, initialBounds, getExclusions = () => [], getScale = () => 1 }) {
  let destroyed = false;
  let timer;
  let pending;
  let sequence = 0;
  let current;
  let dynamic;
  let lastTileKey;
  let rendering = false;
  const cache = new Map();
  const baseline = normaliseLayers(initialLayers, d3);
  const owned = rootLayer.append('g').attr('data-kraken-vector-basemap', '').attr('pointer-events', 'none');
  const groups = Object.fromEntries(['land', 'water', 'buildings', 'roadEdges', 'roadSurfaces', 'labels'].map(name => [name, owned.append('g')]));
  const message = source => { if (status) { status.textContent = source ? t(source) : ''; status.hidden = !source; } };
  const cancel = () => {
    sequence++;
    if (timer !== undefined) view.clearTimeout(timer);
    timer = undefined;
    pending?.abort(); pending = undefined;
  };
  function render() {
    if (destroyed || !current || rendering) return;
    rendering = true;
    try {
      const { projection, width, height } = current;
      const bounds = viewportBounds(projection, width, height);
      const original = contains(initialBounds, bounds);
      const layers = original ? baseline : contains(dynamic?.bounds, bounds) ? dynamic.layers : null;
      owned.attr('display', layers ? null : 'none');
      if (!layers) return;
      const visible = (name, maximum) => original ? layers[name]
        : layers[name].filter(feature => overlaps(boundsOf(feature), bounds)).slice(0, maximum);
      const land = visible('land', 1000);
      const water = visible('water', 1000);
      const buildings = visible('buildings', 8000);
      const roads = original ? layers.roads : layers.roads.filter(feature => overlaps(boundsOf(feature), bounds))
        .sort((a, b) => (ROAD_PRIORITY[b.properties.class] || 0) - (ROAD_PRIORITY[a.properties.class] || 0)).slice(0, 8000);
      const path = d3.geoPath(projection);
      const scale = Math.max(0.5, Math.min(1.75, getScale()));
      const draw = (name, data) => groups[name].selectAll('path').data(data).join('path').attr('d', path);
      draw('land', grouped(land)).attr('fill', feature => feature.properties.class === 'wood' ? '#d7e5de' : '#e0e9e2').attr('stroke', 'none');
      const waterLines = water.filter(feature => feature.geometry.type.endsWith('LineString'));
      const waterAreas = water.filter(feature => !feature.geometry.type.endsWith('LineString'));
      draw('water', [collection(waterAreas), { ...collection(waterLines), properties: { line: true } }])
        .attr('fill', feature => feature.properties.line ? 'none' : '#bbd6e5').attr('stroke', '#a8c8db')
        .attr('stroke-width', feature => feature.properties.line ? 1.2 : 0.6);
      draw('buildings', [collection(buildings)]).attr('fill', '#cdd8df').attr('stroke', '#c1ced7').attr('stroke-width', 0.45)
        .attr('opacity', Math.min(1, 0.6 + scale * scale * 0.2));
      const roadGroups = grouped(roads).sort((a, b) => (ROAD_PRIORITY[a.properties.class] || 0) - (ROAD_PRIORITY[b.properties.class] || 0));
      draw('roadEdges', roadGroups).attr('fill', 'none')
        .attr('stroke', feature => feature.properties.class === 'rail' ? '#b8c8d3' : '#d0dbe2')
        .attr('stroke-width', feature => (ROAD_WIDTH[feature.properties.class] || 2) * scale + 1.2)
        .attr('stroke-linecap', 'round').attr('stroke-linejoin', 'round');
      draw('roadSurfaces', roadGroups).attr('fill', 'none')
        .attr('stroke', feature => feature.properties.class === 'rail' ? '#d4dfe5' : '#fbfdfe')
        .attr('stroke-width', feature => (ROAD_WIDTH[feature.properties.class] || 2) * scale)
        .attr('stroke-linecap', 'round').attr('stroke-linejoin', 'round')
        .attr('stroke-dasharray', feature => feature.properties.class === 'rail' ? '4 4' : null);
      groups.labels.selectAll('*').remove();
      const occupied = [...getExclusions()];
      const intersects = (a, b) => a.x < b.x + b.width + 5 && a.x + a.width + 5 > b.x
        && a.y < b.y + b.height + 5 && a.y + a.height + 5 > b.y;
      const labels = original ? layers.labels : [...layers.labels].sort((a, b) => (a.rank || 0) - (b.rank || 0)).slice(0, 180);
      const namedWater = new Set();
      for (const label of labels) {
        if (!original && label.kind === 'water' && namedWater.has(label.name)) continue;
        const point = projection(label.coordinates);
        if (point[0] < 20 || point[0] > width - 20 || point[1] < 88 || point[1] > height - 76) continue;
        const node = groups.labels.append('text').attr('x', point[0]).attr('y', point[1]).attr('text-anchor', 'middle')
          .attr('class', `kr-geographic-label ${label.kind === 'water' ? 'kr-water' : label.kind === 'road' ? '' : 'kr-city'}`)
          .text(label.name === 'Neuhausen am Rheinfall' ? 'Neuhausen' : label.name);
        try {
          const box = node.node().getBBox();
          if (box.x < 9 || box.x + box.width > width - 9 || occupied.some(other => intersects(box, other))) node.remove();
          else { occupied.push(box); if (!original && label.kind === 'water') namedWater.add(label.name); }
        } catch { node.remove(); }
      }
    } finally { rendering = false; }
  }
  async function load(id) {
    timer = undefined;
    if (destroyed || id !== sequence || !current) return;
    const { projection, width, height } = current;
    if (contains(initialBounds, viewportBounds(projection, width, height))) { message(''); render(); return; }
    const controller = new AbortController(); pending = controller;
    try {
      const tiles = viewportTiles(projection, width, height);
      if (!tiles.length || tiles.length > 16 || typeof view.fetch !== 'function') throw new Error('No vector coverage for this viewport.');
      const tileKey = tiles.map(tile => tile.key).sort().join('|');
      if (lastTileKey === tileKey && dynamic) {
        pending = undefined;
        message(contains(dynamic.bounds, viewportBounds(projection, width, height)) ? '' : 'Die Hintergrundkarte konnte nicht geladen werden.');
        render(); return;
      }
      const loaded = new Map(); let cursor = 0;
      const worker = async () => {
        while (cursor < tiles.length) {
          if (controller.signal.aborted || destroyed || id !== sequence) return;
          const tile = tiles[cursor++];
          let layers = cache.get(tile.key);
          if (layers) { cache.delete(tile.key); cache.set(tile.key, layers); }
          else {
            const response = await view.fetch(tile.url, { signal: controller.signal, credentials: 'omit' });
            const bytes = await readTile(response, controller.signal);
            if (controller.signal.aborted || destroyed || id !== sequence) return;
            layers = decodeSwissTile(bytes, tile);
            cache.set(tile.key, layers);
            while (cache.size > MAX_CACHE_TILES) cache.delete(cache.keys().next().value);
          }
          loaded.set(tile.key, layers);
        }
      };
      await Promise.all(Array.from({ length: Math.min(4, tiles.length) }, worker));
      if (destroyed || id !== sequence || controller.signal.aborted) return;
      if (loaded.size !== tiles.length) throw new Error('Incomplete vector coverage.');
      dynamic = { layers: normaliseLayers(mergeVectorLayers(tiles.map(tile => loaded.get(tile.key))), d3), bounds: tileBounds(tiles) };
      lastTileKey = tileKey; pending = undefined;
      message(contains(dynamic.bounds, viewportBounds(current.projection, current.width, current.height)) ? '' : 'Die Hintergrundkarte konnte nicht geladen werden.');
      render();
    } catch (error) {
      controller.abort();
      if (destroyed || id !== sequence) return;
      dynamic = undefined; lastTileKey = undefined; pending = undefined;
      message('Die Hintergrundkarte konnte nicht geladen werden.'); render();
    }
  }
  return {
    align(projection) { if (current && !destroyed) { current.projection = projection; render(); } },
    schedule(projection, width, height, immediate = false) {
      if (destroyed) return;
      current = { projection, width, height };
      cancel();
      render();
      if (contains(initialBounds, viewportBounds(projection, width, height))) { message(''); return; }
      message('Hintergrundkarte wird geladen …');
      const id = sequence;
      if (immediate) void load(id);
      else timer = view.setTimeout(() => { void load(id); }, 220);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true; cancel(); cache.clear(); dynamic = undefined;
      owned.remove(); message('');
    },
  };
}
