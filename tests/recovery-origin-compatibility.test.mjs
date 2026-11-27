import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, createHmac } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { createRecoveryHandler } from '../integrations/recovery/http.mjs';
import { normaliseCapture } from '../integrations/recovery/policy.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
const origin = 'https://krakenpfm.ch';
const now = Date.parse('2026-11-27T12:00:00Z');
const secret = 'synthetic-booking-origin-proof-secret-over-thirty-two-characters';
const canary = 'PRIVATE_RECOVERY_ORIGIN_CANARY';
const remote = 'synthetic-origin-client';
let bundle;

async function actualBookingHandlers() {
  if (bundle) return bundle;
  const adapters = {
    control: 'export const state={};export const setFixture=value=>{for(const key of Object.keys(state))delete state[key];Object.assign(state,value);};export const recoveryOptions=()=>state.options;',
    store: "import {state} from 'origin-proof-fixture';import {createHash} from 'node:crypto';export const createFirestoreBookingStore=()=>state.store;export const digest=value=>createHash('sha256').update(value).digest('hex');export class BookingError extends Error{constructor(code,status=400){super(code);this.code=code;this.status=status;}}",
    sdk: 'export const getApps=()=>[];export const initializeApp=()=>({});export const cert=()=>({});export const applicationDefault=()=>({});export const getFirestore=()=>({});export const getAuth=()=>({});',
    recovery: "import {state} from 'origin-proof-fixture';export const createRecoveryService=options=>{state.options=options;return state.recovery;};",
    recoveryStore: 'export const createFirestoreRecoveryStore=()=>({});',
  };
  const result = await build({
    stdin: { contents: "export {createBookingHandlers} from './server/booking.ts';export {setFixture,recoveryOptions} from 'origin-proof-fixture';", resolveDir: root, loader: 'ts' },
    bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external', logLevel: 'silent',
    plugins: [{ name: 'local-origin-proof-adapters', setup(builder) {
      builder.onResolve({ filter: /^origin-proof-fixture$/ }, () => ({ path: 'control', namespace: 'mock' }));
      builder.onResolve({ filter: /\/booking-store\.ts$/ }, () => ({ path: 'store', namespace: 'mock' }));
      builder.onResolve({ filter: /^firebase-admin\// }, () => ({ path: 'sdk', namespace: 'mock' }));
      builder.onResolve({ filter: /recovery\/service\.mjs$/ }, () => ({ path: 'recovery', namespace: 'mock' }));
      builder.onResolve({ filter: /recovery\/firestore-store\.mjs$/ }, () => ({ path: 'recoveryStore', namespace: 'mock' }));
      builder.onLoad({ filter: /.*/, namespace: 'mock' }, args => ({ loader: 'js', contents: adapters[args.path] }));
    } }],
  });
  const localModule = { exports: {} };
  new Function('require', 'module', 'exports', '__filename', '__dirname', result.outputFiles[0].text)(require, localModule, localModule.exports, root + 'tests/synthetic-origin-proof.cjs', root);
  bundle = localModule.exports;
  return bundle;
}

function signedCookie(expires = now + 3_600_000, signingSecret = secret) {
  const value = `synthetic_capture_nonce.${expires}`;
  return `kraken_capture=${value}.${createHmac('sha256', signingSecret).update(value).digest('base64url')}`;
}

function input() {
  return { email: 'synthetic@example.test', language: 'es', selection: { service: 'regular', frequency: 'weekly', hours: 2.5 }, reminderConsent: false, idempotencyKey: 'synthetic_origin_capture_123456' };
}

async function fixture() {
  const compiled = await actualBookingHandlers();
  const calls = { captures: [], providers: [], authorizations: [] };
  const recovery = {
    config: { enabled: true, emailReady: true, remindersEnabled: false },
    async capture(body, context) {
      calls.captures.push({ body: structuredClone(body), context: structuredClone(context) });
      const value = normaliseCapture(body);
      return { id: 'synthetic_origin_draft_123456', accessToken: 'a'.repeat(43), language: value.language, expiresAt: new Date(now + 7 * 86_400_000).toISOString(), mailStatus: 'queued', remindersEnabled: false };
    },
    async sendSaved() {
      const sent = await compiled.recoveryOptions().sendEmail({ from: 'Kraken <kai@krakenpfm.ch>', to: 'synthetic@example.test', subject: 'Synthetic saved selection', html: '<p>Synthetic saved selection</p>', text: 'Synthetic saved selection', idempotencyKey: 'synthetic_origin_saved_123456' });
      assert.equal(sent.id, 'synthetic-provider-acceptance');
      return 'sent';
    },
  };
  compiled.setFixture({ store: { async isEmailSuppressed() { return false; } }, recovery });
  const handlers = compiled.createBookingHandlers({
    env: { APP_URL: origin + '/', BOOKING_ENABLED: 'true', BOOKING_TOKEN_SECRET: secret, FIREBASE_SERVICE_ACCOUNT_JSON: '{}', RESEND_API_KEY: 'synthetic-only-key', BOOKING_EMAIL_FROM: 'Kraken <kai@krakenpfm.ch>', RECOVERY_TOKEN_SECRET: 'synthetic-recovery-secret-over-thirty-two-characters', CRON_SECRET: 'synthetic-cron-secret-over-thirty-two-characters' },
    clock: () => now,
    fetcher: async (url, options) => {
      assert.equal(url, 'https://api.resend.com/emails', 'Only the injected fake provider may be called');
      calls.providers.push(JSON.parse(options.body));
      return Response.json({ id: 'synthetic-provider-acceptance' });
    },
  });
  return { handlers, recovery, calls };
}

async function invoke(f, overrides = {}, fullProof = true) {
  const headers = {
    host: 'krakenpfm.ch', 'content-type': 'application/json',
    ...(fullProof ? { 'sec-fetch-site': 'same-origin', 'sec-fetch-mode': 'cors', referer: origin + `/es/offerte?private=${canary}`, cookie: signedCookie() } : {}),
    ...Object.fromEntries(Object.entries(overrides).map(([name, value]) => [name.toLowerCase(), value])),
  };
  for (const name of Object.keys(headers)) if (headers[name] === undefined) delete headers[name];
  const response = {
    statusCode: 200, body: null, headers: {},
    set(values) { for (const [name, value] of Object.entries(values)) this.headers[name.toLowerCase()] = value; return this; },
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; return this; },
    status(value) { this.statusCode = value; return this; },
    json(value) { this.body = value; return this; },
    send(value) { this.body = typeof value === 'string' && this.headers['content-type']?.includes('application/json') ? JSON.parse(value) : value; return this; },
  };
  await f.handlers.middleware({
    path: '/api/recovery/drafts', originalUrl: `/api/recovery/drafts?private=${canary}`, method: 'POST', body: input(), headers,
    socket: { remoteAddress: remote }, get: name => headers[name.toLowerCase()], is: type => type === 'application/json',
  }, response, () => { throw new Error('Capture unexpectedly bypassed booking middleware'); });
  return response;
}

test('the actual booking middleware forwards fully proven absent-origin requests through the strict recovery adapter', async t => {
  t.mock.method(console, 'info', () => {});
  const logs = [];
  t.mock.method(console, 'warn', (...args) => logs.push(args));
  for (const mode of ['cors', 'same-origin']) {
    const f = await fixture();
    const response = await invoke(f, { 'Sec-Fetch-Mode': mode, 'x-kraken-server-remote': canary });
    assert.equal(response.statusCode, 201, JSON.stringify(response.body));
    assert.equal(response.body.mailStatus, 'sent');
    assert.equal(f.calls.captures.length, 1);
    assert.equal(f.calls.providers.length, 1);
    assert.deepEqual(f.calls.captures[0].body, input());
    assert.equal(f.calls.captures[0].context.rateKey, createHash('sha256').update(remote).digest('hex'), 'Client-controlled internal headers never become the trusted rate key');
    assert.equal(response.headers['referrer-policy'], 'no-referrer');
    assert.match(response.headers['cache-control'], /no-store/);
  }
  assert.equal(logs.length, 0);
});

test('every incomplete or contradictory origin proof rejects before capture or provider effects', async t => {
  t.mock.method(console, 'info', () => {});
  const logs = [];
  t.mock.method(console, 'warn', (...args) => logs.push(args));
  const cases = [
    ['no proof', {}, false],
    ['missing fetch site', { 'Sec-Fetch-Site': undefined }],
    ['same-site sibling', { 'Sec-Fetch-Site': 'same-site' }],
    ['cross-site', { 'Sec-Fetch-Site': 'cross-site' }],
    ['user navigation site', { 'Sec-Fetch-Site': 'none' }],
    ['unknown fetch site', { 'Sec-Fetch-Site': canary }],
    ['missing fetch mode', { 'Sec-Fetch-Mode': undefined }],
    ['no-cors mode', { 'Sec-Fetch-Mode': 'no-cors' }],
    ['navigation mode', { 'Sec-Fetch-Mode': 'navigate' }],
    ['unknown fetch mode', { 'Sec-Fetch-Mode': canary }],
    ['missing referer', { Referer: undefined }],
    ['empty referer', { Referer: '' }],
    ['malformed referer', { Referer: canary }],
    ['relative referer', { Referer: '/es/offerte' }],
    ['foreign referer', { Referer: `https://${canary}.example/` }],
    ['origin suffix attack', { Referer: `https://krakenpfm.ch.${canary}.example/` }],
    ['www referer', { Referer: 'https://www.krakenpfm.ch/' }],
    ['wrong-port referer', { Referer: 'https://krakenpfm.ch:444/' }],
    ['insecure referer', { Referer: 'http://krakenpfm.ch/' }],
    ['referer credentials', { Referer: `https://${canary}:secret@krakenpfm.ch/` }],
    ['missing cookie', { Cookie: undefined }],
    ['expired cookie', { Cookie: signedCookie(now - 1) }],
    ['cookie expires now', { Cookie: signedCookie(now) }],
    ['wrong signature', { Cookie: signedCookie(now + 3_600_000, 'other-synthetic-private-secret-over-thirty-two-characters') }],
    ['malformed cookie', { Cookie: 'kraken_capture=%' }],
    ['invalid cookie', { Cookie: `kraken_capture=${canary}` }],
    ['explicit empty origin', { Origin: '' }],
    ['explicit opaque origin', { Origin: 'null' }],
    ['explicit foreign origin', { Origin: `https://${canary}.example` }],
    ['explicit www origin', { Origin: 'https://www.krakenpfm.ch' }],
    ['spoofed internal evidence without actual proof', { 'x-kraken-server-remote': canary, 'x-kraken-verified-origin': origin }, false],
  ];
  for (const [label, overrides, fullProof = true] of cases) {
    const f = await fixture();
    const response = await invoke(f, overrides, fullProof);
    assert.equal(response.statusCode, 403, label + ': ' + JSON.stringify(response.body));
    assert.deepEqual(response.body, { code: 'ORIGIN_NOT_ALLOWED' }, label);
    assert.equal(f.calls.captures.length, 0, label + ': capture must not run');
    assert.equal(f.calls.providers.length, 0, label + ': provider must not run');
  }
  assert.doesNotMatch(JSON.stringify(logs), new RegExp(canary));
  for (const [marker, event] of logs) {
    assert.equal(marker, '[recovery:origin-rejected]');
    if (event.originKind === 'missing') {
      assert.deepEqual(Object.keys(event).sort(), ['cookieValid', 'fetchSite', 'hostKind', 'layer', 'method', 'originKind', 'referrerKind']);
      assert.equal(typeof event.cookieValid, 'boolean');
      assert.ok(['missing', 'same-origin', 'same-site', 'cross-site', 'none', 'other'].includes(event.fetchSite));
      assert.ok(['missing', 'same-origin', 'other', 'invalid'].includes(event.referrerKind));
    }
  }
});

test('an explicit canonical Origin retains the existing path without requiring fallback metadata', async t => {
  t.mock.method(console, 'info', () => {});
  const f = await fixture();
  const response = await invoke(f, { Origin: origin, Cookie: signedCookie() }, false);
  assert.equal(response.statusCode, 201);
  assert.equal(f.calls.captures.length, 1);
  assert.equal(f.calls.providers.length, 1);
});

test('the standalone recovery adapter still refuses missing, empty, opaque and foreign origins even with all proof headers', async () => {
  for (const suppliedOrigin of [undefined, '', 'null', 'https://other.example']) {
    let captures = 0, providers = 0, authorized = 0;
    const handler = createRecoveryHandler({
      publicBaseUrl: origin,
      service: { async capture() { captures++; throw new Error('Capture must not run'); }, async sendSaved() { providers++; return 'sent'; } },
      authorizeCapture: async () => { authorized++; return { rateKey: 'synthetic-origin-source' }; },
    });
    const headers = { 'Content-Type': 'application/json', 'Sec-Fetch-Site': 'same-origin', 'Sec-Fetch-Mode': 'cors', Referer: origin + '/', Cookie: signedCookie(), 'x-kraken-verified-origin': origin, ...(suppliedOrigin !== undefined ? { Origin: suppliedOrigin } : {}) };
    const response = await handler(new Request(origin + '/api/recovery/drafts', { method: 'POST', headers, body: JSON.stringify(input()) }));
    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), { code: 'ORIGIN_NOT_ALLOWED' });
    assert.equal(captures, 0);
    assert.equal(providers, 0);
    assert.equal(authorized, 0);
  }
});
