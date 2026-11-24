import test from 'node:test';
import assert from 'node:assert/strict';
import type { Request, RequestHandler, Response as ExpressResponse } from 'express';
import {
  CONTACT_OFFICE, CONTACT_GEOCODER_URL, CONTACT_ROUTING_URL,
  createContactRoutingHandlers, contactPlainLabel,
} from '../src/contact/routing-server.ts';

const OFFICE = [...CONTACT_OFFICE];
const DESTINATION = [8.632696, 47.698002];
const KEY = 'fixture-private-provider-key-do-not-return';
const json = (body: unknown, status = 200, headers: Record<string, string> = {}) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });
const addressResult = () => ({ results: [{ id: 12, attrs: { origin: 'address', label: 'Seewadelstrasse 3 <b>8203 Schaffhausen</b>', lon: OFFICE[0], lat: OFFICE[1] } }] });
const routeResult = (distance = 2386.8, duration = 257.8, points = [OFFICE, DESTINATION]) => ({ type: 'FeatureCollection', features: [{ type: 'Feature', properties: { summary: { distance, duration } }, geometry: { type: 'LineString', coordinates: points } }] });

async function invoke(handler: RequestHandler, body?: unknown, ip = '127.0.0.1') {
  let status = 200;
  let payload: any;
  const headers: Record<string, string> = {};
  const req = { body, ip, socket: { remoteAddress: ip } } as Request;
  const res = {
    setHeader(name: string, value: string) { headers[name.toLowerCase()] = value; return this; },
    status(value: number) { status = value; return this; },
    json(value: unknown) { payload = value; return this; },
  } as unknown as ExpressResponse;
  await handler(req, res, error => { throw error || new Error('Unexpected next()'); });
  return { status, payload, headers };
}

test('config exposes capabilities only and missing routing credentials never prevent keyless geocoding', async () => {
  let calls = 0;
  const api = createContactRoutingHandlers({ apiKey: '', fetcher: async () => { calls++; return json(addressResult()); } });
  assert.deepEqual((await invoke(api.config)).payload, { geocoding: true, routing: { available: false, provider: 'openrouteservice' }, coverage: 'CH' });
  const missing = await invoke(api.route, { coordinates: DESTINATION, direction: 'outbound' });
  assert.equal(missing.status, 503);
  assert.deepEqual(missing.payload, { error: { code: 'not_configured' } });
  assert.equal(calls, 0);
  const search = await invoke(api.geocode, { query: 'Seewadelstrasse 3 8203 Schaffhausen', language: 'es' });
  assert.equal(search.status, 200);
  assert.equal(search.payload.candidates[0].label, 'Seewadelstrasse 3 8203 Schaffhausen');
  assert.equal(search.payload.attribution, 'swisstopo');
  assert.equal(search.headers['cache-control'], 'private, no-store');
  assert.equal(calls, 1);
});

test('Swiss postcode searches use postcode origins while address/place searches preserve ambiguity as safe text', async () => {
  const requests: URL[] = [];
  const api = createContactRoutingHandlers({ apiKey: '', fetcher: async input => {
    requests.push(new URL(String(input)));
    return json({ results: [
      { id: 1, attrs: { origin: 'zipcode', label: '<b>8200 &amp; Schaffhausen</b>', lon: 8.62, lat: 47.71 } },
      { id: 2, attrs: { origin: 'address', label: 'Seewadelstrasse 3 <b>8203 Schaffhausen</b>', lon: 8.655662, lat: 47.699447 } },
      { id: 3, attrs: { origin: 'address', label: 'Seewadelstrasse 3.1 <b>8203 Schaffhausen</b>', lon: 8.655427, lat: 47.699280 } },
      { id: 4, attrs: { origin: 'gazetteer', label: '<b>Bahnhof</b> Schaffhausen', lon: 8.632696, lat: 47.698002 } },
      { id: 5, attrs: { origin: 'gg25', label: 'Schaffhausen', lon: 8.63, lat: 47.7 } },
      { id: 6, attrs: { origin: 'address', label: 'Outside Swiss service extent', lon: -77.7, lat: 39.7 } },
    ] });
  } });
  const result = await invoke(api.geocode, { query: '8200', language: 'fr' });
  assert.equal(requests[0].origin + requests[0].pathname, CONTACT_GEOCODER_URL);
  assert.equal(requests[0].searchParams.get('origins'), 'zipcode');
  assert.equal(requests[0].searchParams.get('sr'), '4326');
  assert.equal(requests[0].searchParams.get('lang'), 'fr');
  assert.equal(result.payload.candidates.length, 5);
  assert.equal(result.payload.candidates[0].label, '8200 & Schaffhausen');
  assert.deepEqual(result.payload.candidates.slice(1, 3).map((candidate: any) => candidate.kind), ['address', 'address']);
  await invoke(api.geocode, { query: 'Bahnhof Schaffhausen', language: 'de-CH', url: 'https://untrusted.invalid' });
  assert.equal(requests[1].searchParams.get('origins'), 'address,zipcode,gg25,gazetteer');
  assert.equal(requests[1].searchParams.get('lang'), 'de');
  assert.equal(contactPlainLabel('B&#xFC;ro &quot;Kraken&quot;\u0000'), 'Büro "Kraken"');
});

test('each direction asks the real provider with reversed endpoints and uses that response metrics and geometry', async () => {
  const requests: { url: string; init: RequestInit }[] = [];
  const api = createContactRoutingHandlers({ apiKey: KEY, fetcher: async (input, init = {}) => {
    requests.push({ url: String(input), init });
    return requests.length === 1 ? json(routeResult(2386.8, 257.8)) : json(routeResult(2409.9, 263.1, [DESTINATION, [8.64, 47.69], OFFICE]));
  } });
  assert.equal((await invoke(api.config)).payload.routing.available, true);
  const outbound = await invoke(api.route, { coordinates: DESTINATION, direction: 'outbound', upstreamUrl: 'https://untrusted.invalid' });
  const inbound = await invoke(api.route, { coordinates: DESTINATION, direction: 'inbound' });
  assert.equal(outbound.status, 200); assert.equal(inbound.status, 200);
  assert.deepEqual(JSON.parse(requests[0].init.body as string).coordinates, [OFFICE, DESTINATION]);
  assert.deepEqual(JSON.parse(requests[1].init.body as string).coordinates, [DESTINATION, OFFICE]);
  for (const request of requests) {
    assert.equal(request.url, CONTACT_ROUTING_URL);
    assert.equal(request.init.method, 'POST');
    assert.equal((request.init.headers as Record<string, string>).Authorization, KEY);
    assert.equal(request.init.redirect, 'error');
  }
  assert.equal(outbound.payload.route.distance_m, 2386.8);
  assert.equal(inbound.payload.route.distance_m, 2409.9);
  assert.equal(inbound.payload.route.duration_s, 263.1);
  assert.equal(inbound.payload.route.geometry.coordinates.length, 3);
  assert.equal(inbound.payload.provider, 'openrouteservice');
  assert.ok(!JSON.stringify([outbound, inbound, (await invoke(api.config)).payload]).includes(KEY));
});

test('invalid query and destination inputs fail before any provider request', async () => {
  let calls = 0;
  const api = createContactRoutingHandlers({ apiKey: KEY, fetcher: async () => { calls++; return json({}); } });
  for (const body of [null, [], { query: '' }, { query: 'a' }, { query: 'x'.repeat(161) }, { query: 'one two three four five six seven eight nine ten eleven' }]) {
    assert.deepEqual((await invoke(api.geocode, body)).payload, { error: { code: 'invalid_request' } });
  }
  for (const body of [null, { coordinates: ['8.6', 47.7], direction: 'outbound' }, { coordinates: [8.6, NaN], direction: 'outbound' }, { coordinates: [-77, 39], direction: 'outbound' }, { coordinates: DESTINATION, direction: 'sideways' }, { coordinates: [...DESTINATION, 1], direction: 'outbound' }]) {
    const result = await invoke(api.route, body);
    assert.equal(result.status, 400);
    assert.deepEqual(result.payload, { error: { code: 'invalid_request' } });
  }
  assert.equal(calls, 0);
});

test('no geocoder matches are an empty selection rather than fabricated locations', async () => {
  const api = createContactRoutingHandlers({ fetcher: async () => json({ results: [] }) });
  assert.deepEqual((await invoke(api.geocode, { query: 'No matching public place' })).payload, { candidates: [], attribution: 'swisstopo' });
});

test('provider limits and no-route errors retain explicit response states without leaking upstream details', async () => {
  for (const fixture of [
    { status: 429, error: { code: 999, message: KEY }, expectedStatus: 429, expectedCode: 'rate_limited', retry: '90' },
    { status: 404, error: { code: 2009, message: KEY }, expectedStatus: 404, expectedCode: 'no_route' },
    { status: 400, error: { code: 2010, message: KEY }, expectedStatus: 404, expectedCode: 'no_route' },
    { status: 403, error: { code: 999, message: KEY }, expectedStatus: 503, expectedCode: 'unavailable' },
  ]) {
    const api = createContactRoutingHandlers({ apiKey: KEY, fetcher: async () => json({ error: fixture.error }, fixture.status, fixture.retry ? { 'Retry-After': fixture.retry } : {}) });
    const result = await invoke(api.route, { coordinates: DESTINATION, direction: 'outbound' });
    assert.equal(result.status, fixture.expectedStatus);
    assert.deepEqual(result.payload, { error: { code: fixture.expectedCode } });
    assert.ok(!JSON.stringify(result).includes(KEY));
    if (fixture.retry) assert.equal(result.headers['retry-after'], fixture.retry);
  }
});

test('broken or oversized upstream bodies never become a displayed route', async () => {
  for (const response of [
    () => new Response('not JSON'),
    () => json({ type: 'FeatureCollection', features: [] }),
    () => json(routeResult(-1)),
    () => json(routeResult(100, 50, [[200, 0], DESTINATION])),
    () => new Response('x'.repeat(3000)),
    () => new Response('{}', { headers: { 'Content-Length': '50000' } }),
  ]) {
    const api = createContactRoutingHandlers({ apiKey: KEY, maxResponseBytes: 2000, fetcher: async () => response() });
    const result = await invoke(api.route, { coordinates: DESTINATION, direction: 'inbound' });
    assert.equal(result.status, 503);
    assert.deepEqual(result.payload, { error: { code: 'unavailable' } });
    assert.equal('route' in result.payload, false);
  }
});

test('provider timeout aborts the request and returns a bounded unavailable result', async () => {
  let aborted = false;
  const api = createContactRoutingHandlers({ apiKey: KEY, timeoutMs: 10, fetcher: async (_input, init) => new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => { aborted = true; reject(new Error(KEY)); });
  }) });
  const result = await invoke(api.route, { coordinates: DESTINATION, direction: 'outbound' });
  assert.equal(result.status, 503);
  assert.equal(aborted, true);
  assert.deepEqual(result.payload, { error: { code: 'unavailable' } });
});

test('per-client limits expire and the bounded budget map rejects new clients while full', async () => {
  let now = 0;
  let calls = 0;
  const api = createContactRoutingHandlers({ apiKey: '', requestsPerMinute: 2, maxClients: 1, clock: () => now, fetcher: async () => { calls++; return json(addressResult()); } });
  const body = { query: 'Seewadelstrasse 3' };
  assert.equal((await invoke(api.geocode, body, 'client-a')).status, 200);
  assert.equal((await invoke(api.geocode, body, 'client-a')).status, 200);
  const limited = await invoke(api.geocode, body, 'client-a');
  assert.equal(limited.status, 429); assert.equal(limited.headers['retry-after'], '60');
  assert.equal((await invoke(api.geocode, body, 'client-b')).status, 429);
  assert.equal(calls, 2);
  now = 60_001;
  assert.equal((await invoke(api.geocode, body, 'client-b')).status, 200);
  assert.equal(calls, 3);
});
