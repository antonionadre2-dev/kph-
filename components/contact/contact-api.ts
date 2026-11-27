import type { KrakenRoute } from './contact-controller.js';

export interface ContactCandidate {
  id: string;
  label: string;
  coordinates: [number, number];
  kind: 'address' | 'postcode' | 'place';
}
export type ContactApiErrorCode = 'invalid_request' | 'unavailable' | 'not_configured' | 'rate_limited' | 'no_route';
export class ContactApiError extends Error {
  constructor(public code: ContactApiErrorCode) { super(code); this.name = 'ContactApiError'; }
}
export interface ContactConfig { geocoding: boolean; routing: { available: boolean; provider: string }; coverage: 'CH' }

const errorCodes = new Set<ContactApiErrorCode>(['invalid_request', 'unavailable', 'not_configured', 'rate_limited', 'no_route']);
async function request(path: string, signal: AbortSignal, body?: unknown): Promise<any> {
  const response = await fetch(path, {
    method: body === undefined ? 'GET' : 'POST', signal, credentials: 'same-origin', cache: 'no-store', referrerPolicy: 'strict-origin',
    headers: {Accept:'application/json', ...(body === undefined ? {} : {'Content-Type':'application/json'})},
    ...(body === undefined ? {} : {body:JSON.stringify(body)}),
  });
  let data: any;
  try { data = await response.json(); }
  catch { throw new ContactApiError('unavailable'); }
  if (!response.ok) {
    const code = data?.error?.code;
    throw new ContactApiError(errorCodes.has(code) ? code : 'unavailable');
  }
  return data;
}
export async function loadContactConfig(signal: AbortSignal): Promise<ContactConfig> {
  const value = await request('/api/contact/config',signal);
  if (value?.coverage !== 'CH' || typeof value.geocoding !== 'boolean' || typeof value.routing?.available !== 'boolean'
    || typeof value.routing.provider !== 'string') throw new ContactApiError('unavailable');
  return {geocoding:value.geocoding,routing:{available:value.routing.available,provider:value.routing.provider},coverage:'CH'};
}
export async function searchContactAddresses(query: string, language: string, signal: AbortSignal): Promise<ContactCandidate[]> {
  const value = await request('/api/contact/geocode',signal,{query,language});
  if (!Array.isArray(value?.candidates)) throw new ContactApiError('unavailable');
  return value.candidates.filter((candidate:any) => typeof candidate?.id === 'string' && typeof candidate.label === 'string'
    && candidate.label.length <= 300 && ['address','postcode','place'].includes(candidate.kind)
    && Array.isArray(candidate.coordinates) && candidate.coordinates.length === 2
    && candidate.coordinates.every(Number.isFinite))
    .slice(0,8).map((candidate:any) => ({id:candidate.id,label:candidate.label,coordinates:candidate.coordinates,kind:candidate.kind}));
}
export async function calculateContactRoute(candidate:ContactCandidate,direction:'outbound'|'inbound',signal:AbortSignal):Promise<KrakenRoute> {
  const value = await request('/api/contact/route',signal,{coordinates:candidate.coordinates,direction});
  const route = value?.route;
  if (!Number.isFinite(route?.distance_m) || route.distance_m < 0 || !Number.isFinite(route?.duration_s) || route.duration_s < 0
    || route.geometry?.type !== 'LineString' || !Array.isArray(route.geometry.coordinates) || route.geometry.coordinates.length < 2
    || route.geometry.coordinates.length > 20000 || !route.geometry.coordinates.every((point:any) => Array.isArray(point) && point.length === 2 && point.every(Number.isFinite))) {
    throw new ContactApiError('unavailable');
  }
  return {distance_m:route.distance_m,duration_s:route.duration_s,geometry:route.geometry};
}
