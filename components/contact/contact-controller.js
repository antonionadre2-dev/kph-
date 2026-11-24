/**
 * Contact map controller. D3 and route/search callbacks are injected; Swiss
 * WMS background images are loaded by the separately owned basemap helper.
 *
 * const controller = mountKrakenContact(root, {
 *   d3, data, assets: { logo, exterior, interior },
 *   icons: root => lucide.createIcons({ root, attrs: { width: 16, height: 16 } }),
 *   calculatorUrl: '/quote'
 * });
 * // React effect cleanup: return () => controller.destroy();
 */

import { createLiveRouteSession, exampleRoute, findExampleDestination, normaliseExampleAddress } from './contact-route-logic.js';
import { createSwissBasemap } from './contact-basemap.js';

const mountedRoots = new WeakMap();
// Keep in-page selections across language-effect restarts. Weak keys ensure
// leaving the page does not retain a removed React root or visitor address.
const previousSelections = new WeakMap();
const TRANSITION = 'kraken-contact';

export function mountKrakenContact(root, options = {}) {
  if (!root || root.nodeType !== 1 || typeof root.querySelector !== 'function') {
    throw new TypeError('mountKrakenContact: root must be the contact section element.');
  }
  const { d3, data, assets, icons, calculatorUrl, t = source => source, locale = 'de-CH',
    live = false, search, route: requestRoute, routingAvailable = false } = options;
  if (live && (typeof search !== 'function' || typeof requestRoute !== 'function')) {
    throw new TypeError('mountKrakenContact: live mode requires search and route callbacks.');
  }
  const text = (source, values = {}) => t(source).replace(/\{([A-Za-z]+)\}/g,
    (placeholder, name) => Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : placeholder);
  for (const method of ['select', 'geoMercator', 'geoPath', 'geoArea', 'zoom']) {
    if (typeof d3?.[method] !== 'function') {
      throw new TypeError(`mountKrakenContact: supply D3 with ${method}().`);
    }
  }
  if (!d3.zoomIdentity || !data?.office?.coordinates || !Array.isArray(data?.bbox)
    || !data?.map?.layers || !Array.isArray(data?.destinations) || !data.destinations.length) {
    throw new TypeError('mountKrakenContact: map data and at least one destination are required.');
  }
  for (const destination of data.destinations) {
    if (!Array.isArray(destination.coordinates) || destination.coordinates.length < 2
      || !destination.coordinates.slice(0, 2).every(Number.isFinite) || typeof destination.label !== 'string') {
      throw new TypeError('mountKrakenContact: each destination needs coordinates and a label.');
    }
  }
  for (const name of ['logo', 'exterior', 'interior']) {
    if (typeof assets?.[name] !== 'string' || !assets[name].trim()) {
      throw new TypeError(`mountKrakenContact: assets.${name} must be an image URL.`);
    }
  }
  if (icons !== undefined && typeof icons !== 'function') {
    throw new TypeError('mountKrakenContact: icons must be a synchronous callback receiving root.');
  }

  mountedRoots.get(root)?.destroy();
  const doc = root.ownerDocument;
  const view = doc.defaultView;
  if (!view) throw new Error('mountKrakenContact: mount after the element has a browser document.');
  const q = selector => root.querySelector(selector);
  const qa = selector => Array.from(root.querySelectorAll(selector));
  const required = selector => {
    const element = q(selector);
    if (!element) throw new Error(`mountKrakenContact: missing ${selector} inside root.`);
    return element;
  };

  // Icons are optional when markup already contains SVGs. Call before retaining
  // icon elements, because Lucide replaces <i> placeholders with SVG elements.
  icons?.(root);
  const map = required('.kr-map');
  const contact = required('.kr-contact');
  const svgElement = required('.kr-geography');
  const input = required('.kr-search input');
  const searchButton = required('.kr-search > button');
  const suggestions = required('.kr-suggestions');
  const searchStatus = live ? required('.kr-search-status') : null;
  const precisionNote = live ? required('.kr-precision-note') : null;
  const selectedMarker = live ? required('.kr-selected-marker') : null;
  const error = required('.kr-address-error');
  const result = required('.kr-result');
  const distance = required('.kr-distance');
  const duration = required('.kr-duration');
  const resultDirection = required('.kr-result-direction');
  const officeMarker = required('.kr-office-marker');
  const travelMarker = required('.kr-travel-marker');
  const player = required('.kr-route-player');
  const playIcon = required('.kr-play-icon');
  const pauseIcon = required('.kr-pause-icon');
  const playerLabel = required('.kr-route-player > span');
  const gallery = required('.kr-gallery-panel');
  const galleryClose = required('.kr-gallery-close');
  const galleryCover = required('.kr-gallery-cover');
  const galleryStage = required('.kr-gallery-stage');
  const galleryImage = required('.kr-gallery-stage .kr-scene-image');
  const directionButtons = qa('[data-direction]');
  const placeButtons = qa('[data-place]');
  const galleryButtons = qa('[data-gallery]');
  const zoomIn = required('[data-map-action="in"]');
  const zoomOut = required('[data-map-action="out"]');
  const svg = d3.select(svgElement);
  const svgAttributes = ['viewBox', 'width', 'height', 'aria-label', 'style'].map(name => [name, svgElement.getAttribute(name)]);
  const initialZoom = svgElement.__zoom;
  const previousCalculatorHref = q('.kr-quote')?.getAttribute('href');
  const media = view.matchMedia?.('(prefers-reduced-motion: reduce)');
  const cleanup = [];
  let destroyed = false;
  let reduced = Boolean(media?.matches);
  let width = 400;
  let height = 800;
  let baseProjection;
  let projection;
  let routeLength = 0;
  let drawFrame = 0;
  let animationFrame = 0;
  let resizeObserver;
  let sizeKey = '';
  let galleryTrigger;
  let galleryInertState;
  let mouseGesture;
  let liveSession;
  let liveState;
  let lastFitSelection;
  let lastFitRoute;
  let basemap;
  const cached = previousSelections.get(root);
  const previousSelection = cached && Boolean(cached.live) === Boolean(live) ? cached : undefined;
  const state = {
    destination: previousSelection?.destination ?? Math.min(2, data.destinations.length - 1),
    direction: previousSelection?.direction ?? 'outbound', zoom: d3.zoomIdentity, progress: 0,
    playing: false, lastTime: null, photo: 'exterior', valid: true
  };
  const on = (target, type, callback, eventOptions) => {
    target.addEventListener(type, callback, eventOptions);
    cleanup.push(() => target.removeEventListener(type, callback, eventOptions));
  };
  const normalise = normaliseExampleAddress;
  const activeRoute = () => live ? liveState?.route ?? null
    : state.valid ? exampleRoute(data.destinations[state.destination], state.direction) : null;
  const findDestination = value => {
    const original = findExampleDestination(data.destinations, value);
    if (original >= 0) return original;
    const normalised = normalise(value);
    return normalised ? data.destinations.findIndex(destination => normalise(t(destination.label)) === normalised) : -1;
  };

  qa('.kr-original-logo').forEach(image => { image.src = assets.logo; });
  qa('[data-photo-source]').forEach(image => {
    const key = image.dataset.photoSource;
    if (key === 'exterior' || key === 'interior') image.src = assets[key];
  });
  if (calculatorUrl !== undefined && q('.kr-quote')) q('.kr-quote').setAttribute('href', calculatorUrl);
  const help = q('.kr-map-help');
  const initialHelp = help?.textContent;
  if (help) help.textContent = t(view.matchMedia?.('(pointer: coarse)').matches
    ? 'Mit zwei Fingern bewegen · + / − zoomen'
    : 'Karte ziehen · Strg + Scrollen oder + / − zum Zoomen');

  function toFeature(value) {
    const feature = value.type === 'Feature'
      ? { ...value, properties: { ...value.properties } }
      : { type: 'Feature', properties: { class: value.class }, geometry: value.geometry || value };
    if (feature.geometry.type === 'Polygon' && d3.geoArea(feature) > Math.PI * 2) {
      feature.geometry = { type: 'Polygon', coordinates: feature.geometry.coordinates.map(ring => ring.slice().reverse()) };
    }
    return feature;
  }
  const layers = data.map.layers;
  // A single owned group makes cleanup/remount safe without removing host SVG content.
  const ownedLayer = svg.append('g').attr('data-kraken-contact-layer', '');
  if (live) basemap = createSwissBasemap({ d3, rootLayer: ownedLayer.append('g'), view,
    status: q('.kr-basemap-status'), t, initialLayers: layers, initialBounds: data.bbox,
    getScale: () => Math.min(1.75, Math.sqrt(state.zoom.k)),
    getExclusions: () => {
      const mapRect = map.getBoundingClientRect();
      return [officeMarker, selectedMarker, ...placeButtons].filter(element => element && !element.hidden).map(element => {
        const rect = element.getBoundingClientRect();
        return {x:rect.left-mapRect.left,y:rect.top-mapRect.top,width:rect.width,height:rect.height};
      });
    } });
  const vectorLayer = ownedLayer.append('g').attr('display', live ? 'none' : null);
  const land = vectorLayer.append('g').selectAll('path').data((layers.land || []).map(toFeature)).join('path')
    .attr('fill', feature => feature.properties.class === 'wood' ? '#d7e5de' : '#e0e9e2').attr('stroke', 'none');
  const water = vectorLayer.append('g').selectAll('path').data((layers.water || []).map(toFeature)).join('path')
    .attr('fill', '#bbd6e5').attr('stroke', '#a8c8db').attr('stroke-width', 0.6);
  const buildings = vectorLayer.append('g').selectAll('path').data((layers.buildings || []).map(toFeature)).join('path')
    .attr('fill', '#cdd8df').attr('stroke', '#c1ced7').attr('stroke-width', 0.45);
  const roadData = (layers.roads || []).map(toFeature);
  const roadWidth = feature => ({ motorway: 5.3, trunk: 5, primary: 4.5, secondary: 3.7,
    tertiary: 2.6, minor: 1.6, rail: 1.4 }[feature.properties.class] || 2);
  const roadEdges = vectorLayer.append('g').selectAll('path').data(roadData).join('path')
    .attr('fill', 'none').attr('stroke', feature => feature.properties.class === 'rail' ? '#b8c8d3' : '#d0dbe2')
    .attr('stroke-linecap', 'round').attr('stroke-linejoin', 'round');
  const roadSurfaces = vectorLayer.append('g').selectAll('path').data(roadData).join('path')
    .attr('fill', 'none').attr('stroke', feature => feature.properties.class === 'rail' ? '#d4dfe5' : '#fbfdfe')
    .attr('stroke-linecap', 'round').attr('stroke-linejoin', 'round');
  const routePath = (stroke, strokeWidth) => ownedLayer.append('path').attr('fill', 'none')
    .attr('stroke', stroke).attr('stroke-width', strokeWidth).attr('stroke-linecap', 'round').attr('stroke-linejoin', 'round');
  const routeHalo = routePath('#fff', 9);
  const routeLine = routePath('#164a70', 4.5);
  const routeProgress = routePath('#76cbb3', 4.5);
  const labelLayer = vectorLayer.append('g');

  const zoom = d3.zoom().scaleExtent([0.85, 5])
    .filter(event => event.type === 'wheel' ? event.ctrlKey
      : event.type.startsWith('touch') ? event.touches.length >= 2 : !event.button)
    .on('start.krakenContact', event => {
      if (destroyed || event.sourceEvent?.type !== 'mousedown') return;
      const gestureView = event.sourceEvent.view || view;
      const selection = d3.select(gestureView);
      mouseGesture = { view: gestureView, move: selection.on('mousemove.zoom'), up: selection.on('mouseup.zoom') };
    })
    .on('zoom.krakenContact', event => {
      if (destroyed) return;
      state.zoom = event.transform;
      queueDraw();
    })
    .on('end.krakenContact', () => {
      mouseGesture = undefined;
      if (projection) basemap?.schedule(projection, width, height);
    });
  svg.call(zoom).style('touch-action', 'pan-y');

  function queueDraw() {
    if (destroyed || drawFrame) return;
    drawFrame = view.requestAnimationFrame(() => { drawFrame = 0; draw(); });
  }
  function fit() {
    if (destroyed) return;
    const rect = map.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    width = rect.width;
    height = rect.height;
    sizeKey = `${Math.round(width)}x${Math.round(height)}`;
    svg.interrupt(TRANSITION).attr('viewBox', `0 0 ${width} ${height}`).attr('width', width).attr('height', height);
    const mobile = root.clientWidth < 620;
    const left = Math.min(mobile ? 50 : 57, width * 0.2);
    const top = Math.min(mobile ? 193 : 245, height * 0.45);
    const right = Math.max(left + 1, width - Math.min(mobile ? 66 : 79, width * 0.24));
    const bottom = Math.max(top + 1, height - Math.min(mobile ? 139 : 156, height * 0.33));
    const fitCoordinates = live && liveState?.selected
      ? [data.office.coordinates, liveState.selected.coordinates, ...(activeRoute()?.geometry.coordinates ?? [])]
      : [data.office.coordinates, ...data.destinations.map(destination => destination.coordinates)];
    if (fitCoordinates.every(point => Math.abs(point[0] - fitCoordinates[0][0]) < 0.0001
      && Math.abs(point[1] - fitCoordinates[0][1]) < 0.0001)) {
      const [longitude, latitude] = fitCoordinates[0];
      fitCoordinates.push([longitude - 0.001, latitude - 0.001], [longitude + 0.001, latitude + 0.001]);
    }
    baseProjection = d3.geoMercator().fitExtent([[left, top], [right, bottom]], { type: 'MultiPoint', coordinates: fitCoordinates });
    const cornerA = baseProjection([data.bbox[0], data.bbox[3]]);
    const cornerB = baseProjection([data.bbox[2], data.bbox[1]]);
    zoom.extent([[0, 0], [width, height]]).translateExtent(live ? [[-Infinity, -Infinity], [Infinity, Infinity]] : [
      [Math.min(cornerA[0], 0) - 60, Math.min(cornerA[1], 0) - 60],
      [Math.max(cornerB[0], width) + 60, Math.max(cornerB[1], height) + 60]
    ]);
    svg.call(zoom.transform, d3.zoomIdentity);
    draw();
    if (projection) basemap?.schedule(projection, width, height, true);
  }
  function place(element, point) {
    element.style.left = `${point[0]}px`;
    element.style.top = `${point[1]}px`;
    element.hidden = point[0] < -65 || point[0] > width + 65 || point[1] < -20 || point[1] > height + 160;
  }
  function draw() {
    if (destroyed || !baseProjection) return;
    const transform = state.zoom;
    const translation = baseProjection.translate();
    projection = d3.geoMercator().scale(baseProjection.scale() * transform.k)
      .translate([translation[0] * transform.k + transform.x, translation[1] * transform.k + transform.y]);
    const path = d3.geoPath(projection);
    const scale = Math.min(1.75, Math.sqrt(transform.k));
    if (!live) {
      land.attr('d', path);
      water.attr('d', path);
      buildings.attr('d', path).attr('opacity', Math.min(1, 0.6 + transform.k * 0.2));
      roadEdges.attr('d', path).attr('stroke-width', feature => roadWidth(feature) * scale + 1.2);
      roadSurfaces.attr('d', path).attr('stroke-width', feature => roadWidth(feature) * scale)
        .attr('stroke-dasharray', feature => feature.properties.class === 'rail' ? '4 4' : null);
    }
    const selectedRoute = activeRoute();
    for (const route of [routeHalo, routeLine, routeProgress]) {
      route.datum(selectedRoute?.geometry ?? null).attr('d', selectedRoute ? path : null)
        .attr('display', selectedRoute ? null : 'none');
    }
    try { routeLength = selectedRoute ? routeLine.node().getTotalLength() : 0; } catch { routeLength = 0; }
    const officePoint = projection(data.office.coordinates);
    place(officeMarker, [officePoint[0], officePoint[1] + 5]);
    const occupied = [{ x: officePoint[0] - 70, y: officePoint[1] - 166, width: 140, height: 181 }];
    for (const button of placeButtons) {
      if (live && liveState?.selected) { button.hidden = true; continue; }
      const destination = data.destinations[Number(button.dataset.place)];
      if (!destination) { button.hidden = true; continue; }
      const point = projection(destination.coordinates);
      place(button, point);
      occupied.push({ x: point[0] - 38, y: point[1] - 24, width: 76, height: 76 });
    }
    if (selectedMarker) {
      if (liveState?.selected) place(selectedMarker, projection(liveState.selected.coordinates));
      else selectedMarker.hidden = true;
    }
    basemap?.align(projection);
    labelLayer.selectAll('*').remove();
    const intersects = (a, b) => a.x < b.x + b.width + 5 && a.x + a.width + 5 > b.x
      && a.y < b.y + b.height + 5 && a.y + a.height + 5 > b.y;
    for (const label of live ? [] : layers.labels || []) {
      const point = projection(label.coordinates);
      if (point[0] < 20 || point[0] > width - 20 || point[1] < 88 || point[1] > height - 76) continue;
      const node = labelLayer.append('text').attr('x', point[0]).attr('y', point[1]).attr('text-anchor', 'middle')
        .attr('class', `kr-geographic-label ${label.kind === 'water' ? 'kr-water' : label.kind === 'road' ? '' : 'kr-city'}`)
        .text(label.name === 'Neuhausen am Rheinfall' ? 'Neuhausen' : label.name);
      try {
        const bounds = node.node().getBBox();
        if (bounds.x < 9 || bounds.x + bounds.width > width - 9 || occupied.some(box => intersects(bounds, box))) node.remove();
        else occupied.push(bounds);
      } catch { node.remove(); }
    }
    drawProgress();
    zoomIn.disabled = transform.k >= 4.99;
    zoomOut.disabled = transform.k <= 0.851;
  }
  function drawProgress() {
    if (destroyed) return;
    travelMarker.hidden = !activeRoute() || !routeLength || (!state.playing && state.progress === 0);
    routeProgress.attr('stroke-dasharray', `${routeLength * state.progress} ${routeLength}`)
      .attr('opacity', state.progress > 0 ? 1 : 0);
    if (!travelMarker.hidden) {
      const point = routeLine.node().getPointAtLength(routeLength * state.progress);
      travelMarker.style.left = `${point.x}px`;
      travelMarker.style.top = `${point.y}px`;
    }
  }
  function setPlayer() {
    // Lucide converts these nodes to SVG; the HTMLElement.hidden property is
    // not available consistently on SVGElement, so use the actual attribute.
    playIcon.toggleAttribute('hidden', state.playing);
    pauseIcon.toggleAttribute('hidden', !state.playing);
    playerLabel.textContent = t(state.playing ? 'Pause' : state.progress >= 1 ? 'Erneut ansehen'
      : state.progress > 0 ? 'Weiter ansehen' : 'Route ansehen');
    player.setAttribute('aria-label', t(state.playing ? 'Routenanimation pausieren' : live ? 'Route abspielen' : 'Beispielroute abspielen'));
    player.setAttribute('aria-pressed', String(state.playing));
  }
  function stopAnimation(reset = false) {
    state.playing = false;
    if (animationFrame) view.cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    state.lastTime = null;
    if (reset) state.progress = 0;
    setPlayer();
    drawProgress();
  }
  function tick(timestamp) {
    animationFrame = 0;
    if (destroyed || !state.playing) return;
    if (state.lastTime === null) state.lastTime = timestamp;
    state.progress = Math.min(1, state.progress + (timestamp - state.lastTime) / 8500);
    state.lastTime = timestamp;
    drawProgress();
    if (state.progress >= 1) { stopAnimation(); return; }
    animationFrame = view.requestAnimationFrame(tick);
  }
  function renderSelection() {
    const route = activeRoute();
    result.hidden = !route;
    player.disabled = !route;
    directionButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.direction === state.direction)));
    placeButtons.forEach(button => button.setAttribute('aria-pressed', String(state.valid && Number(button.dataset.place) === state.destination)));
    if (route) {
      const destination = live ? liveState.selected : data.destinations[state.destination];
      const label = live ? destination.label : t(destination.label);
      const unit = doc.createElement('small');
      unit.textContent = 'km';
      distance.replaceChildren(doc.createTextNode(`${(route.distance_m / 1000).toLocaleString(locale, {
        minimumFractionDigits: 1, maximumFractionDigits: 1
      })} `), unit);
      duration.textContent = text('ca. {minutes} Min.', { minutes: Math.round(route.duration_s / 60).toLocaleString(locale) });
      resultDirection.textContent = state.direction === 'outbound'
        ? `Kraken → ${label}` : `${label} → Kraken`;
      svgElement.setAttribute('aria-label', text(live ? 'Karte mit Route {route}' : 'Karte mit Beispielroute {route}', { route: resultDirection.textContent }));
    } else {
      distance.replaceChildren();
      duration.textContent = '';
      resultDirection.textContent = '';
      svgElement.setAttribute('aria-label', t(live ? 'Karte mit Kraken. Bitte eine Adresse suchen.'
        : 'Karte mit Kraken und Beispielzielen. Bitte eine Beispieladresse wählen.'));
    }
    if (state.valid && !live) {
      error.hidden = Boolean(route);
      if (!route) error.textContent = t('Für dieses Beispiel ist in dieser Richtung keine Route verfügbar.');
    }
    previousSelections.set(root, { live, destination: state.destination, direction: state.direction,
      valid: state.valid, selected: liveState?.selected ?? null, query: input.value, showError: !error.hidden });
    draw();
  }
  function animateZoom(action, value, milliseconds) {
    svg.interrupt(TRANSITION);
    if (reduced) svg.call(action, value);
    else svg.transition(TRANSITION).duration(milliseconds).call(action, value);
  }
  function selectDestination(index, animate = true) {
    if (!Number.isInteger(index) || !data.destinations[index] || destroyed) return;
    state.destination = index;
    state.valid = true;
    input.value = t(data.destinations[index].label);
    input.removeAttribute('aria-invalid');
    error.hidden = true;
    suggestions.hidden = true;
    suggestions.replaceChildren();
    stopAnimation(true);
    renderSelection();
    if (animate && baseProjection) animateZoom(zoom.transform, d3.zoomIdentity, 350);
  }
  function invalidAddress(showError) {
    state.valid = false;
    stopAnimation(true);
    error.hidden = !showError;
    if (showError) {
      error.textContent = t('Für diese Vorschau bitte eine Beispieladresse wählen. Freie Adresssuche ist noch nicht verbunden.');
      input.setAttribute('aria-invalid', 'true');
      suggestions.hidden = true;
    } else input.removeAttribute('aria-invalid');
    renderSelection();
  }
  function renderLiveSelection(snapshot) {
    if (destroyed) return;
    liveState = snapshot;
    state.direction = snapshot.direction;
    state.valid = Boolean(snapshot.selected);
    input.value = snapshot.query;
    input.removeAttribute('aria-invalid');
    input.setAttribute('aria-busy', String(snapshot.status === 'searching'));
    suggestions.replaceChildren();
    snapshot.candidates.forEach((candidate, index) => {
      const button = doc.createElement('button');
      button.type = 'button';
      button.className = 'cursor-interaction';
      button.dataset.candidateIndex = String(index);
      button.textContent = candidate.label;
      suggestions.append(button);
    });
    suggestions.hidden = snapshot.status !== 'candidates' || !snapshot.candidates.length;
    let problem = '';
    if (snapshot.status === 'empty') problem = t('Keine Adresse gefunden. Bitte prüfen Sie Ihre Eingabe.');
    if (snapshot.status === 'error') {
      if (snapshot.errorCode === 'rate_limited') problem = t('Zu viele Anfragen. Bitte warten Sie einen Moment und versuchen Sie es erneut.');
      else if (snapshot.errorCode === 'not_configured') problem = t('Die Routenberechnung ist momentan nicht verfügbar. Bitte versuchen Sie es erneut.');
      else if (snapshot.errorCode === 'no_route') problem = t('Keine befahrbare Route gefunden.');
      else problem = t(snapshot.phase === 'search'
        ? 'Die Adresssuche ist momentan nicht verfügbar. Bitte versuchen Sie es erneut.'
        : 'Die Routenberechnung ist momentan nicht verfügbar. Bitte versuchen Sie es erneut.');
    }
    error.textContent = problem;
    error.hidden = !problem;
    if (problem && snapshot.phase !== 'route') input.setAttribute('aria-invalid', 'true');
    searchStatus.textContent = snapshot.status === 'searching' ? t('Adressen werden gesucht …')
      : snapshot.status === 'routing' ? t('Route wird berechnet …')
      : snapshot.status === 'candidates' ? t('Bitte wählen Sie die passende Adresse.') : '';
    precisionNote.hidden = !snapshot.selected || snapshot.selected.kind === 'address';
    precisionNote.textContent = precisionNote.hidden ? ''
      : t('Ortsmitte als ungefähres Ziel. Für einen genauen Zielpunkt geben Sie die vollständige Adresse ein.');
    const markerLabel = selectedMarker.querySelector('span');
    if (markerLabel) markerLabel.textContent = snapshot.selected?.label ?? '';
    selectedMarker.setAttribute('aria-label', text('Eingegebene Adresse: {address}', { address: snapshot.selected?.label ?? '' }));
    stopAnimation(true);
    renderSelection();
    if (snapshot.selected && (snapshot.selected !== lastFitSelection || snapshot.route !== lastFitRoute)) {
      lastFitSelection = snapshot.selected; lastFitRoute = snapshot.route;
      fit();
    }
  }
  function findAddress() {
    if (live) { void liveSession.find(input.value); return; }
    const found = findDestination(input.value);
    if (found < 0) invalidAddress(true);
    else selectDestination(found);
  }

  on(player, 'click', () => {
    if (!activeRoute()) return;
    if (state.playing) { stopAnimation(); return; }
    if (reduced) { state.progress = 1; drawProgress(); setPlayer(); return; }
    if (state.progress >= 1) state.progress = 0;
    state.playing = true;
    state.lastTime = null;
    setPlayer();
    animationFrame = view.requestAnimationFrame(tick);
  });
  on(doc, 'visibilitychange', () => { if (doc.hidden) stopAnimation(); });
  const chooseExample = index => {
    const destination = data.destinations[index];
    if (!destination) return;
    if (live) void liveSession.find(destination.label);
    else selectDestination(index);
  };
  placeButtons.forEach(button => on(button, 'click', () => chooseExample(Number(button.dataset.place))));
  qa('[data-example]').forEach(button => on(button, 'click', () => chooseExample(Number(button.dataset.example))));
  directionButtons.forEach(button => on(button, 'click', () => {
    if (!['outbound', 'inbound'].includes(button.dataset.direction)) return;
    if (live) { liveSession.setDirection(button.dataset.direction); return; }
    state.direction = button.dataset.direction;
    // Changing direction must never validate arbitrary text or resurrect an old route.
    state.valid = state.valid && findDestination(input.value) === state.destination;
    stopAnimation(true);
    renderSelection();
  }));
  qa('[data-map-action]').forEach(button => on(button, 'click', () => {
    const action = button.dataset.mapAction;
    if (!baseProjection) return;
    if (action === 'reset') { if (live) fit(); else animateZoom(zoom.transform, d3.zoomIdentity, 400); }
    else if (action === 'in' || action === 'out') animateZoom(zoom.scaleBy, action === 'in' ? 1.45 : 1 / 1.45, 250);
  }));
  on(searchButton, 'click', findAddress);
  on(input, 'keydown', event => {
    if (event.key === 'Enter') { event.preventDefault(); findAddress(); }
    if (event.key === 'Escape') suggestions.hidden = true;
    if (event.key === 'ArrowDown' && !suggestions.hidden) {
      event.preventDefault();
      suggestions.querySelector('button')?.focus();
    }
  });
  on(input, 'input', () => {
    if (live) { liveSession.edit(input.value); return; }
    // Clear the stale alert immediately while the user corrects their address.
    invalidAddress(false);
    suggestions.replaceChildren();
    const value = normalise(input.value);
    if (value) data.destinations.forEach((destination, index) => {
      if (!normalise(`${destination.label} ${t(destination.label)} ${destination.address || ''}`).includes(value)) return;
      const button = doc.createElement('button');
      button.type = 'button';
      button.className = 'cursor-interaction';
      button.dataset.destinationIndex = String(index);
      button.textContent = t(destination.label);
      suggestions.append(button);
    });
    suggestions.hidden = !suggestions.children.length;
  });
  // One delegated listener for all dynamically rebuilt suggestions.
  on(suggestions, 'click', event => {
    const button = event.target.closest?.(live ? 'button[data-candidate-index]' : 'button[data-destination-index]');
    if (!button || !suggestions.contains(button)) return;
    if (live) void liveSession.select(liveState.candidates[Number(button.dataset.candidateIndex)]);
    else selectDestination(Number(button.dataset.destinationIndex));
    input.focus({ preventScroll: true });
  });
  if (selectedMarker) on(selectedMarker, 'click', fit);
  on(suggestions, 'keydown', event => {
    if (event.key === 'Escape') { suggestions.hidden = true; input.focus({ preventScroll: true }); }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    const buttons = Array.from(suggestions.querySelectorAll('button'));
    const index = buttons.indexOf(doc.activeElement);
    if (index < 0) return;
    event.preventDefault();
    const next = index + (event.key === 'ArrowDown' ? 1 : -1);
    if (next < 0) input.focus();
    else buttons[Math.min(next, buttons.length - 1)]?.focus();
  });

  function setPhoto(key) {
    if (key !== 'exterior' && key !== 'interior') return;
    state.photo = key;
    galleryStage.dataset.scene = key;
    galleryImage.src = assets[key];
    galleryImage.alt = t(key === 'exterior' ? 'Fotorealistisches Konzept der Kraken-Fassade'
      : 'Fotorealistisches Konzept des Kraken-Empfangs');
    galleryButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.gallery === key)));
  }
  function restoreGalleryInert() {
    if (!galleryInertState) return;
    map.inert = galleryInertState.map;
    contact.inert = galleryInertState.contact;
    galleryInertState = undefined;
  }
  function openGallery(event) {
    galleryTrigger = event.currentTarget;
    stopAnimation();
    setPhoto('exterior');
    gallery.hidden = false;
    galleryInertState ||= { map: map.inert, contact: contact.inert };
    map.inert = true;
    contact.inert = true;
    galleryClose.focus({ preventScroll: true });
  }
  function closeGallery() {
    gallery.hidden = true;
    restoreGalleryInert();
    if (galleryTrigger?.isConnected) galleryTrigger.focus({ preventScroll: true });
    galleryTrigger = undefined;
  }
  on(galleryCover, 'click', openGallery);
  on(officeMarker, 'click', openGallery);
  on(galleryClose, 'click', closeGallery);
  galleryButtons.forEach(button => on(button, 'click', () => setPhoto(button.dataset.gallery)));
  on(root, 'keydown', event => {
    if (event.key === 'Escape' && !gallery.hidden) { event.preventDefault(); closeGallery(); }
    if (event.key === 'Tab' && !gallery.hidden) {
      const controls = Array.from(gallery.querySelectorAll('button, a[href], input, select, textarea, [tabindex]'))
        .filter(element => !element.disabled && !element.hidden && element.getAttribute('tabindex') !== '-1');
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (first && (event.shiftKey ? doc.activeElement === first : doc.activeElement === last)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus({ preventScroll: true });
      }
    }
  });
  if (media) {
    const changeMotion = event => { reduced = event.matches; if (reduced) stopAnimation(); };
    if (media.addEventListener) on(media, 'change', changeMotion);
    else if (media.addListener) { media.addListener(changeMotion); cleanup.push(() => media.removeListener(changeMotion)); }
  }
  const resized = () => {
    if (destroyed) return;
    const rect = map.getBoundingClientRect();
    const nextKey = `${Math.round(rect.width)}x${Math.round(rect.height)}`;
    if (nextKey !== sizeKey) fit();
  };

  const controller = { destroy };
  mountedRoots.set(root, controller);
  function destroy() {
    if (destroyed) return;
    destroyed = true;
    state.playing = false;
    liveSession?.destroy();
    basemap?.destroy();
    if (drawFrame) view.cancelAnimationFrame(drawFrame);
    if (animationFrame) view.cancelAnimationFrame(animationFrame);
    drawFrame = animationFrame = 0;
    resizeObserver?.disconnect();
    cleanup.splice(0).forEach(dispose => dispose());
    // D3 attaches temporary window handlers during a mouse drag. Remove only
    // handlers still owned by this instance, so another map is not interrupted.
    if (mouseGesture) {
      const selection = d3.select(mouseGesture.view);
      let ownsGesture = false;
      if (mouseGesture.move && selection.on('mousemove.zoom') === mouseGesture.move) {
        selection.on('mousemove.zoom', null); ownsGesture = true;
      }
      if (mouseGesture.up && selection.on('mouseup.zoom') === mouseGesture.up) selection.on('mouseup.zoom', null);
      if (ownsGesture && typeof d3.dragEnable === 'function') d3.dragEnable(mouseGesture.view, false);
      mouseGesture = undefined;
    }
    zoom.on('.krakenContact', null);
    svg.interrupt(TRANSITION).on('.zoom', null);
    ownedLayer.interrupt(TRANSITION).selectAll('*').interrupt(TRANSITION);
    ownedLayer.remove();
    // A wheel gesture can own a short internal D3 timer; clear it before
    // removing its gesture state. No callbacks may draw after destroyed=true.
    if (svgElement.__zooming?.wheel) view.clearTimeout(svgElement.__zooming.wheel);
    delete svgElement.__zooming;
    if (initialZoom === undefined) delete svgElement.__zoom;
    else svgElement.__zoom = initialZoom;
    svgAttributes.forEach(([name, value]) => {
      if (value === null) svgElement.removeAttribute(name);
      else svgElement.setAttribute(name, value);
    });
    restoreGalleryInert();
    gallery.hidden = true;
    suggestions.hidden = true;
    suggestions.replaceChildren();
    travelMarker.hidden = true;
    if (selectedMarker) selectedMarker.hidden = true;
    if (help) help.textContent = initialHelp;
    if (calculatorUrl !== undefined && q('.kr-quote')) {
      if (previousCalculatorHref === null) q('.kr-quote').removeAttribute('href');
      else q('.kr-quote').setAttribute('href', previousCalculatorHref);
    }
    if (mountedRoots.get(root) === controller) mountedRoots.delete(root);
  }

  try {
    gallery.hidden = true;
    setPhoto('exterior');
    if (live) {
      liveSession = createLiveRouteSession({ search, route: requestRoute, routingAvailable, onChange: renderLiveSelection,
        initial: previousSelection ?? { query: input.value, direction: state.direction } });
      liveSession.restore();
    } else if (previousSelection && !previousSelection.valid) {
      input.value = previousSelection.query;
      invalidAddress(previousSelection.showError);
    } else selectDestination(state.destination, false);
    fit();
    if (typeof view.ResizeObserver === 'function') {
      resizeObserver = new view.ResizeObserver(resized);
      resizeObserver.observe(map);
    } else on(view, 'resize', resized);
  } catch (cause) {
    destroy();
    throw cause;
  }
  return controller;
}

export default mountKrakenContact;
