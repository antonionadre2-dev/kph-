import type { Request, RequestHandler, Response as ExpressResponse } from 'express';

export const CONTACT_OFFICE = [8.655662, 47.699447] as const;
export const CONTACT_GEOCODER_URL = 'https://api3.geo.admin.ch/rest/services/ech/SearchServer';
export const CONTACT_ROUTING_URL = 'https://api.heigit.org/openrouteservice/v2/directions/driving-car/geojson';
const SWISS_EXTENT = [5.9, 45.7, 10.6, 47.9] as const;
const WINDOW_MS = 60_000;

type ErrorCode = 'invalid_request' | 'unavailable' | 'not_configured' | 'rate_limited' | 'no_route';
type Coordinates = [number, number];
export interface ContactCandidate {
  id: string;
  label: string;
  coordinates: Coordinates;
  kind: 'address' | 'postcode' | 'place';
}
export interface ContactRoute {
  distance_m: number;
  duration_s: number;
  geometry: { type: 'LineString'; coordinates: Coordinates[] };
}
export interface ContactRoutingOptions {
  fetcher?: typeof fetch;
  apiKey?: string;
  clock?: () => number;
  timeoutMs?: number;
  maxResponseBytes?: number;
  requestsPerMinute?: number;
  maxClients?: number;
}

class ContactError extends Error {
  constructor(public code: ErrorCode, public status: number, public retryAfter?: number) {
    super(code);
  }
}

function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function coordinate(value: unknown): value is Coordinates {
  return Array.isArray(value) && value.length === 2 && value.every(item => typeof item === 'number' && Number.isFinite(item))
    && value[0] >= -180 && value[0] <= 180 && value[1] >= -90 && value[1] <= 90;
}

function swissCoordinate(value: unknown): value is Coordinates {
  return coordinate(value) && value[0] >= SWISS_EXTENT[0] && value[0] <= SWISS_EXTENT[2]
    && value[1] >= SWISS_EXTENT[1] && value[1] <= SWISS_EXTENT[3];
}

/** SearchServer labels contain formatting; never forward their HTML to the UI. */
export function contactPlainLabel(value: unknown): string {
  if (typeof value !== 'string') return '';
  const entities: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  return value.slice(0, 2000).replace(/<[^>]*>/g, '').replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (whole, entity: string) => {
    if (!entity.startsWith('#')) return entities[entity.toLowerCase()] || whole;
    const hexadecimal = entity.slice(0, 2).toLowerCase() === '#x';
    const point = Number.parseInt(entity.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10);
    return point > 0 && point <= 0x10ffff && !(point >= 0xd800 && point <= 0xdfff) ? String.fromCodePoint(point) : '';
  }).replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 240);
}

export function normalizeContactCandidates(payload: unknown): ContactCandidate[] {
  if (!object(payload) || !Array.isArray(payload.results)) throw new ContactError('unavailable', 503);
  const candidates: ContactCandidate[] = [];
  const seen = new Set<string>();
  for (const raw of payload.results.slice(0, 50)) {
    if (!object(raw) || !object(raw.attrs)) continue;
    const attrs = raw.attrs;
    const coordinates: unknown = [attrs.lon, attrs.lat];
    const kind = attrs.origin === 'address' ? 'address' : attrs.origin === 'zipcode' ? 'postcode'
      : attrs.origin === 'gg25' || attrs.origin === 'gazetteer' ? 'place' : null;
    const label = contactPlainLabel(attrs.label);
    if (!kind || !label || !swissCoordinate(coordinates)) continue;
    const identity = `${label}|${coordinates.join(',')}`;
    if (seen.has(identity)) continue;
    seen.add(identity);
    const sourceId = String(raw.id ?? candidates.length).replace(/[^a-z\d_-]/gi, '').slice(0, 80);
    candidates.push({ id: `${attrs.origin}:${sourceId}`, label, coordinates, kind });
    if (candidates.length === 8) break;
  }
  return candidates;
}

export function normalizeContactRoute(payload: unknown): ContactRoute {
  if (!object(payload) || !Array.isArray(payload.features) || !object(payload.features[0])) throw new ContactError('unavailable', 503);
  const feature = payload.features[0];
  const summary = object(feature.properties) && object(feature.properties.summary) ? feature.properties.summary : null;
  const geometry = object(feature.geometry) ? feature.geometry : null;
  if (!summary || typeof summary.distance !== 'number' || !Number.isFinite(summary.distance) || summary.distance < 0 || summary.distance > 2_000_000
    || typeof summary.duration !== 'number' || !Number.isFinite(summary.duration) || summary.duration < 0 || summary.duration > 604_800
    || geometry?.type !== 'LineString' || !Array.isArray(geometry.coordinates) || geometry.coordinates.length < 2 || geometry.coordinates.length > 20_000
    || !geometry.coordinates.every(coordinate)) throw new ContactError('unavailable', 503);
  return { distance_m: summary.distance, duration_s: summary.duration, geometry: { type: 'LineString', coordinates: geometry.coordinates } };
}

function retrySeconds(value: string | null): number {
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds > 0 ? Math.min(300, Math.ceil(seconds)) : 60;
}

function failure(res: ExpressResponse, error: unknown) {
  const known = error instanceof ContactError ? error : new ContactError('unavailable', 503);
  if (known.retryAfter) res.setHeader('Retry-After', String(known.retryAfter));
  res.status(known.status).json({ error: { code: known.code } });
}

function privateHeaders(res: ExpressResponse) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
}

export function createContactRoutingHandlers(options: ContactRoutingOptions = {}): {
  config: RequestHandler;
  geocode: RequestHandler;
  route: RequestHandler;
} {
  const fetcher = options.fetcher || ((input, init) => fetch(input, init));
  const clock = options.clock || (() => Date.now());
  const timeoutMs = options.timeoutMs ?? 8000;
  const maxBytes = options.maxResponseBytes ?? 1_048_576;
  const limit = options.requestsPerMinute ?? 30;
  const maxClients = options.maxClients ?? 1000;
  const configured = (options.apiKey ?? process.env.CONTACT_ROUTING_API_KEY ?? '').trim();
  const apiKey = configured.length <= 8192 && !/[\r\n]/.test(configured) ? configured : '';
  // Bounded, expiring counters only: never retain search text, addresses or routes.
  const budgets = new Map<string, { count: number; expires: number }>();

  function consume(req: Request) {
    const now = clock();
    for (const [key, budget] of budgets) if (budget.expires <= now) budgets.delete(key);
    const key = req.ip || req.socket?.remoteAddress || 'unknown';
    let budget = budgets.get(key);
    if (!budget) {
      if (budgets.size >= maxClients) throw new ContactError('rate_limited', 429, 60);
      budget = { count: 0, expires: now + WINDOW_MS };
      budgets.set(key, budget);
    }
    if (budget.count >= limit) throw new ContactError('rate_limited', 429, Math.max(1, Math.ceil((budget.expires - now) / 1000)));
    budget.count++;
  }

  async function upstreamJson(url: string, init: RequestInit = {}, routing = false): Promise<unknown> {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const deadline = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => { controller.abort(); reject(new ContactError('unavailable', 503)); }, timeoutMs);
    });
    const request = (async () => {
      const response = await fetcher(url, {
        ...init, redirect: 'error', signal: controller.signal,
        headers: { Accept: 'application/json', 'User-Agent': 'KrakenContact/1.0 https://krakenpfm.ch', ...init.headers },
      });
      if (response.status === 429) throw new ContactError('rate_limited', 429, retrySeconds(response.headers.get('retry-after')));
      const length = Number(response.headers.get('content-length'));
      if (length > maxBytes) { controller.abort(); throw new ContactError('unavailable', 503); }
      const reader = response.body?.getReader();
      if (!reader) throw new ContactError('unavailable', 503);
      const chunks: Uint8Array[] = [];
      let size = 0;
      try {
        while (true) {
          const part = await reader.read();
          if (part.done) break;
          size += part.value.byteLength;
          if (size > maxBytes) { controller.abort(); throw new ContactError('unavailable', 503); }
          chunks.push(part.value);
        }
      } finally { reader.releaseLock(); }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
      let payload: unknown;
      try { payload = JSON.parse(new TextDecoder().decode(bytes)); }
      catch { throw new ContactError('unavailable', 503); }
      if (!response.ok) {
        const code = object(payload) && object(payload.error) ? payload.error.code : null;
        if (routing && (response.status === 404 || code === 2009 || code === 2010)) throw new ContactError('no_route', 404);
        throw new ContactError('unavailable', 503);
      }
      return payload;
    })();
    try { return await Promise.race([request, deadline]); }
    finally { clearTimeout(timer!); }
  }

  const config: RequestHandler = (_req, res) => {
    privateHeaders(res);
    res.json({ geocoding: true, routing: { available: !!apiKey, provider: 'openrouteservice' }, coverage: 'CH' });
  };
  const geocode: RequestHandler = async (req, res) => {
    privateHeaders(res);
    try {
      const query = object(req.body) && typeof req.body.query === 'string' ? req.body.query.trim().replace(/\s+/g, ' ') : '';
      if (query.length < 2 || query.length > 160 || query.split(' ').length > 10 || /[\u0000-\u001f\u007f]/.test(query)) {
        throw new ContactError('invalid_request', 400);
      }
      consume(req);
      const language = object(req.body) && typeof req.body.language === 'string' ? req.body.language.split('-')[0].toLowerCase() : 'de';
      const params = new URLSearchParams({
        searchText: query, type: 'locations', origins: /^\d{4}$/.test(query) ? 'zipcode' : 'address,zipcode,gg25,gazetteer',
        limit: '8', sr: '4326', lang: ['de', 'en', 'fr', 'it', 'rm'].includes(language) ? language : 'de',
      });
      const candidates = normalizeContactCandidates(await upstreamJson(`${CONTACT_GEOCODER_URL}?${params}`));
      res.json({ candidates, attribution: 'swisstopo' });
    } catch (error) { failure(res, error); }
  };
  const route: RequestHandler = async (req, res) => {
    privateHeaders(res);
    try {
      if (!object(req.body) || !swissCoordinate(req.body.coordinates) || !['outbound', 'inbound'].includes(String(req.body.direction))) {
        throw new ContactError('invalid_request', 400);
      }
      if (!apiKey) throw new ContactError('not_configured', 503);
      consume(req);
      const destination = req.body.coordinates;
      const coordinates = req.body.direction === 'outbound' ? [CONTACT_OFFICE, destination] : [destination, CONTACT_OFFICE];
      const payload = await upstreamJson(CONTACT_ROUTING_URL, {
        method: 'POST', headers: { Authorization: apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ coordinates, instructions: false, geometry_simplify: true }),
      }, true);
      res.json({ route: normalizeContactRoute(payload), provider: 'openrouteservice' });
    } catch (error) { failure(res, error); }
  };
  return { config, geocode, route };
}
