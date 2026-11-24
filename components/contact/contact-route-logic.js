/** Address matching is deliberately limited to the supplied example destinations. */
export const normaliseExampleAddress = value => String(value || '').toLocaleLowerCase('de-CH')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');

export function findExampleDestination(destinations, value) {
  const normalised = normaliseExampleAddress(value);
  return normalised ? destinations.findIndex(destination =>
    normaliseExampleAddress(destination.label) === normalised
    || normaliseExampleAddress(destination.address) === normalised) : -1;
}

/** Missing or invalid routes never reuse metrics/geometry from another selection. */
export function exampleRoute(destination, direction) {
  if (direction !== 'outbound' && direction !== 'inbound') return null;
  const route = destination?.routes?.[direction];
  return validRoute(route);
}

export function validRoute(route) {
  if (!Number.isFinite(route?.distance_m) || route.distance_m < 0
    || !Number.isFinite(route?.duration_s) || route.duration_s < 0
    || route?.geometry?.type !== 'LineString' || !Array.isArray(route.geometry.coordinates)
    || route.geometry.coordinates.length < 2
    || !route.geometry.coordinates.every(point => Array.isArray(point) && point.length >= 2
      && point.slice(0, 2).every(Number.isFinite) && Math.abs(point[0]) <= 180 && Math.abs(point[1]) < 85.051129)) return null;
  return route;
}

export function validCandidate(candidate) {
  return Boolean(candidate && typeof candidate.id === 'string' && typeof candidate.label === 'string'
    && candidate.label.trim() && ['address', 'postcode', 'place'].includes(candidate.kind)
    && Array.isArray(candidate.coordinates) && candidate.coordinates.length === 2
    && candidate.coordinates.every(Number.isFinite) && Math.abs(candidate.coordinates[0]) <= 180
    && Math.abs(candidate.coordinates[1]) < 85.051129);
}

/** Abortable client state; no provider credentials or requests are owned here. */
export function createLiveRouteSession({ search, route, routingAvailable, onChange, initial = {} }) {
  let destroyed = false;
  let requestId = 0;
  let pending;
  let state = { query: initial.query ?? '', direction: initial.direction === 'inbound' ? 'inbound' : 'outbound',
    selected: null, candidates: [], route: null, status: 'idle', phase: null, errorCode: null };
  const emit = () => { if (!destroyed) onChange({ ...state, candidates: [...state.candidates] }); };
  const cancel = () => { requestId++; pending?.abort(); pending = undefined; };
  const errorCode = error => ['invalid_request', 'unavailable', 'not_configured', 'rate_limited', 'no_route'].includes(error?.code)
    ? error.code : 'unavailable';
  const edit = query => {
    if (destroyed) return;
    cancel();
    state = { ...state, query: String(query), selected: null, candidates: [], route: null, status: 'idle', phase: null, errorCode: null };
    emit();
  };
  async function find(query = state.query) {
    if (destroyed) return;
    edit(query);
    const id = requestId;
    if (!state.query.trim()) { state.status = 'empty'; emit(); return; }
    pending = new AbortController();
    state.status = 'searching'; state.phase = 'search'; emit();
    try {
      const candidates = await search(state.query.trim(), pending.signal);
      if (destroyed || id !== requestId) return;
      state.candidates = Array.isArray(candidates) ? candidates.filter(validCandidate).slice(0, 20) : [];
      state.status = state.candidates.length ? 'candidates' : 'empty';
      pending = undefined; emit();
    } catch (error) {
      if (destroyed || id !== requestId) return;
      pending = undefined;
      state.status = 'error'; state.errorCode = errorCode(error); emit();
    }
  }
  async function select(candidate) {
    if (destroyed || !validCandidate(candidate)) return;
    cancel();
    const id = requestId;
    state = { ...state, query: candidate.label, selected: candidate, candidates: [], route: null,
      status: routingAvailable ? 'routing' : 'error', phase: 'route', errorCode: routingAvailable ? null : 'not_configured' };
    emit();
    if (!routingAvailable) return;
    pending = new AbortController();
    try {
      const result = await route(candidate, state.direction, pending.signal);
      if (destroyed || id !== requestId) return;
      const validated = validRoute(result);
      state.route = validated;
      state.status = validated ? 'ready' : 'error';
      state.errorCode = validated ? null : 'no_route';
      pending = undefined; emit();
    } catch (error) {
      if (destroyed || id !== requestId) return;
      pending = undefined;
      state.status = 'error'; state.errorCode = errorCode(error); emit();
    }
  }
  return {
    edit, find, select,
    setDirection(direction) {
      if (destroyed || !['outbound', 'inbound'].includes(direction)) return;
      state.direction = direction;
      if (state.selected) void select(state.selected);
      else { cancel(); state.route = null; if (state.status === 'searching') state.status = 'idle'; emit(); }
    },
    restore() {
      if (validCandidate(initial.selected)) void select(initial.selected);
      else edit(initial.query ?? '');
    },
    snapshot: () => ({ ...state, candidates: [...state.candidates] }),
    destroy() { if (!destroyed) { destroyed = true; cancel(); } },
  };
}
