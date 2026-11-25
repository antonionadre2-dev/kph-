import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBookingService, BOOKING_TERMS_VERSION } from '../server/booking.ts';
import { BookingError, createFirestoreBookingStore } from '../server/booking-store.ts';
import { createResendEmailAdapter } from '../server/booking-email.ts';
import { calculatePrice, defaultSelection, PRICING_VERSION } from '../src/booking/pricing.ts';

const now = Date.parse('2026-11-24T10:00:00Z');
const origin = 'https://kraken.example';
const secret = 'synthetic-booking-secret-over-thirty-two-characters';
const cronSecret = 'synthetic-cron-secret-over-thirty-two-characters';
const clone = value => structuredClone(value);

function memoryStore() {
  const records = new Map(), keys = new Map(), mail = new Map(), suppressed = new Set();
  const calls = { scans: 0, staleScans: 0, claims: 0 };
  return {
    records, mail, suppressed, calls,
    async get(id) { return clone(records.get(id) || null); },
    async create(key, fingerprint, record, job) {
      const previous = keys.get(key);
      if (previous) {
        if (previous.fingerprint !== fingerprint) throw new BookingError('IDEMPOTENCY_CONFLICT', 409);
        return clone(records.get(previous.id));
      }
      records.set(record.bookingId, clone(record));
      keys.set(key, { id: record.bookingId, fingerprint });
      mail.set(job.id, clone(job));
      return clone(record);
    },
    async mutate(id, transform) {
      const next = transform(clone(records.get(id)));
      records.set(id, clone(next));
      return clone(next);
    },
    async mutateWithMail(id, transform, makeJob) {
      const next = transform(clone(records.get(id))), job = makeJob(next);
      records.set(id, clone(next));
      if (job && !mail.has(job.id)) mail.set(job.id, clone(job));
      return clone(next);
    },
    async addMail(job) {
      if (mail.has(job.id)) return false;
      mail.set(job.id, clone(job));
      return true;
    },
    async listDueMail(time, limit = 20) {
      calls.scans++;
      return [...mail.values()].filter(job => job.status === 'queued' && job.dueAt <= time)
        .sort((a, b) => a.dueAt - b.dueAt).slice(0, limit).map(clone);
    },
    async claimMail(id, time) {
      calls.claims++;
      const job = mail.get(id);
      if (!job || job.status !== 'queued' || job.dueAt > time) return null;
      job.status = 'sending';
      job.attempts = (Number.isSafeInteger(job.attempts) ? job.attempts : 0) + 1;
      job.leaseUntil = time + 60000;
      return clone(job);
    },
    async finishMail(id, status, providerId, retryAt) { Object.assign(mail.get(id), { status, providerId, leaseUntil: null, ...(status === 'queued' && Number.isSafeInteger(retryAt) ? { dueAt: retryAt } : {}) }); },
    async markStaleMail() { calls.staleScans++; },
    async consumeRate() { return true; },
    async isEmailSuppressed(email) { return suppressed.has(email); },
    async listByEmail(email) { return [...records.values()].filter(record => record.customer.email === email).map(clone); },
  };
}

function request(key = 'synthetic_request_123456', email = 'client@example.test') {
  const selection = defaultSelection('regular');
  return {
    selection, customer: { name: 'Synthetic Customer', email, phone: '+41770000000', address: 'Teststrasse 1', postalCode: '8200', city: 'Schaffhausen' },
    requestedDate: '2026-11-25', requestedTime: '10:00', notes: '', language: 'es',
    termsAccepted: true, termsVersion: BOOKING_TERMS_VERSION, pricingVersion: PRICING_VERSION,
    acceptedTotalCents: calculatePrice(selection).totalCents, idempotencyKey: key,
  };
}

function fixture(sendEmail, payment = null, clock = () => now) {
  const store = memoryStore();
  const service = createBookingService({ store, tokenSecret: secret, origin, mode: 'live', payment, sendEmail, sender: 'sender@example.test', clock });
  return { service, store };
}

test('targeted dispatch never scans another queue and concurrent retries send only once', async () => {
  const sent = [], { service, store } = fixture(async message => { sent.push(message); return { id: 'accepted-1' }; });
  const first = await service.create(request());
  const other = await service.create(request('synthetic_unrelated_123456', 'other@example.test'));
  const jobId = `${first.bookingId}:request:1`;
  await Promise.all([service.runDue({ jobId, limit: 1 }), service.runDue({ jobId, limit: 1 })]);
  await service.runDue({ jobId, limit: 1 });
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, 'client@example.test');
  assert.equal(sent[0].idempotencyKey, `kraken-booking:${jobId}`);
  assert.equal((await store.get(first.bookingId)).email.request, 'sent');
  assert.equal(store.mail.get(`${other.bookingId}:request:1`).status, 'queued');
  assert.equal(store.calls.scans, 0);
  assert.equal(store.calls.staleScans, 0);
});

test('an uncertain provider result is retained and is never retried by targeted dispatch', async () => {
  let attempts = 0;
  const { service, store } = fixture(async () => { attempts++; throw new Error('Synthetic uncertain provider response'); });
  const booking = await service.create(request());
  const jobId = `${booking.bookingId}:request:1`;
  assert.deepEqual(await service.runDue({ jobId, limit: 1 }), { sent: 0, unknown: 1 });
  await service.runDue({ jobId, limit: 1 });
  assert.equal(attempts, 1);
  assert.equal(store.mail.get(jobId).status, 'delivery_unknown');
  assert.equal((await store.get(booking.bookingId)).email.request, 'delivery_unknown');
});

test('targeted delivery honours suppression and a missing provider without false sent state', async () => {
  let attempts = 0;
  const suppressed = fixture(async () => { attempts++; return { id: 'must-not-be-used' }; });
  const booking = await suppressed.service.create(request());
  suppressed.store.suppressed.add('client@example.test');
  await suppressed.service.runDue({ jobId: `${booking.bookingId}:request:1`, limit: 1 });
  assert.equal(attempts, 0);
  assert.equal(suppressed.store.mail.get(`${booking.bookingId}:request:1`).status, 'cancelled');
  assert.equal((await suppressed.store.get(booking.bookingId)).email.request, 'failed');

  const disabled = fixture(null);
  const pending = await disabled.service.create(request());
  assert.deepEqual(await disabled.service.runDue({ jobId: `${pending.bookingId}:request:1`, limit: 1 }), { sent: 0, unknown: 0, disabled: true });
  assert.equal((await disabled.store.get(pending.bookingId)).email.request, 'queued');
  assert.equal(disabled.store.calls.scans, 0);
  assert.equal(disabled.store.calls.claims, 0);
});

test('paid reconciliation awaits only its receipt and repeated reconciliation cannot resend it', async () => {
  const sent = [], payment = {
    async create() { return { id: 1, link: 'https://synthetic.payrexx.com/checkout' }; },
    async verify() { return { status: 'paid', transactionId: 'synthetic-transaction' }; },
  };
  const { service, store } = fixture(async message => { sent.push(message); return { id: 'receipt-accepted' }; }, payment);
  const booking = await service.create(request());
  const other = await service.create(request('synthetic_unrelated_123456', 'other@example.test'));
  await service.confirmAppointment(booking.bookingId, { operatorId: 'synthetic-operator', holdExpiresAt: '2026-11-24T14:00:00Z' });
  await service.checkout(booking.bookingId, booking.publicToken, { acceptedQuoteRevision: 1, termsAccepted: true, termsVersion: BOOKING_TERMS_VERSION, language: 'es' });
  const reconciled = await service.reconcile(booking.bookingId);
  assert.equal(reconciled.email.receipt, 'sent');
  assert.equal(reconciled.payment.status, 'paid');
  assert.equal(sent.length, 1);
  assert.equal(sent[0].idempotencyKey, `kraken-booking:${booking.bookingId}:receipt:${booking.bookingId}-r1`);
  await service.reconcile(booking.bookingId);
  assert.equal(sent.length, 1);
  for (const id of [booking.bookingId, other.bookingId]) assert.equal(store.mail.get(`${id}:request:1`).status, 'queued');
  assert.equal(store.calls.scans, 0);
  assert.equal(store.calls.staleScans, 0);
});

test('an expired worker budget cannot claim or send a job', async () => {
  let attempts = 0;
  const { service, store } = fixture(async () => { attempts++; return { id: 'must-not-be-used' }; });
  await service.create(request());
  assert.deepEqual(await service.runDue({ limit: 6, deadlineAt: performance.now() }), { sent: 0, unknown: 0 });
  assert.equal(attempts, 0);
  assert.equal(store.calls.scans, 0);
  assert.equal(store.calls.claims, 0);
});

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
let mockedHandlers;

async function handlersBundle() {
  if (mockedHandlers) return mockedHandlers;
  const cache = path.join(root, 'node_modules/.cache');
  mkdirSync(cache, { recursive: true });
  const temporary = mkdtempSync(path.join(cache, 'booking-email-dispatch-'));
  const outfile = path.join(temporary, 'handlers.cjs');
  try {
    await build({
      stdin: { contents: "export {createBookingHandlers} from './server/booking.ts'; export {setStore} from 'synthetic-booking-store';", resolveDir: root, loader: 'ts' },
      outfile, bundle: true, platform: 'node', format: 'cjs', packages: 'external', logLevel: 'silent',
      plugins: [{ name: 'synthetic-booking-adapters', setup(builder) {
        builder.onResolve({ filter: /(?:^synthetic-booking-store$|\/booking-store\.ts$)/ }, () => ({ path: 'store', namespace: 'synthetic-adapter' }));
        builder.onResolve({ filter: /^firebase-admin\/(?:app|firestore|auth)$/ }, args => ({ path: args.path, namespace: 'synthetic-adapter' }));
        builder.onLoad({ filter: /.*/, namespace: 'synthetic-adapter' }, args => ({ loader: 'js', contents: args.path === 'store' ? `
          import {createHash} from 'node:crypto'; let store;
          export const setStore=value=>{store=value}; export const createFirestoreBookingStore=()=>store;
          export const digest=value=>createHash('sha256').update(value).digest('hex');
          export class BookingError extends Error {constructor(code,status=400){super(code);this.code=code;this.status=status}}
        ` : args.path === 'firebase-admin/auth'
          ? 'throw new Error("Optional customer access must remain disabled"); export const getAuth=()=>({});'
          : 'export const getApps=()=>[]; export const initializeApp=()=>({}); export const cert=()=>({}); export const applicationDefault=()=>({}); export const getFirestore=()=>({});' }));
      } }],
    });
    mockedHandlers = require(outfile);
    return mockedHandlers;
  } finally { delete require.cache[outfile]; rmSync(temporary, { recursive: true, force: true }); }
}

function environment(overrides = {}) {
  return {
    APP_URL: origin, BOOKING_ENABLED: 'true', BOOKING_TOKEN_SECRET: secret,
    FIREBASE_SERVICE_ACCOUNT_JSON: '{}', BOOKING_CUSTOMER_ACCESS_ENABLED: 'false',
    RESEND_API_KEY: 'synthetic-resend-key', BOOKING_EMAIL_FROM: 'Kraken <sender@example.test>', CRON_SECRET: cronSecret,
    ...overrides,
  };
}

async function invoke(handlers, pathname, { method = 'GET', headers = {}, body = {} } = {}) {
  const normalized = Object.fromEntries(Object.entries(headers).map(([name, value]) => [name.toLowerCase(), value]));
  const response = {
    statusCode: 200, headers: {}, cookies: [], body: undefined,
    set(name, value) { if (typeof name === 'string') this.headers[name.toLowerCase()] = value; else for (const [key, item] of Object.entries(name)) this.headers[key.toLowerCase()] = item; return this; },
    status(value) { this.statusCode = value; return this; },
    cookie(name, value, options) { this.cookies.push({ name, value, options }); return this; },
    json(value) { this.body = value; return this; },
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; return this; },
    send(value) { this.body = value; return this; },
  };
  await handlers.middleware({ path: pathname, originalUrl: pathname, method, body, socket: { remoteAddress: 'synthetic-test-client' }, get: name => normalized[name.toLowerCase()], is: type => normalized['content-type']?.startsWith(type) }, response, () => { throw new Error('Unexpected middleware fall-through'); });
  return response;
}

test('the request HTTP route awaits its one email, returns sent state and does not drain unrelated jobs', async t => {
  t.mock.method(console, 'info', () => {});
  const { createBookingHandlers, setStore } = await handlersBundle();
  const store = memoryStore(); setStore(store);
  let providerEntered, releaseProvider, completed = false, attempts = 0;
  const entered = new Promise(resolve => { providerEntered = resolve; });
  const released = new Promise(resolve => { releaseProvider = resolve; });
  const handlers = createBookingHandlers({ env: environment(), clock: () => now, fetcher: async (url, init) => {
    assert.equal(url, 'https://api.resend.com/emails');
    assert.equal(JSON.parse(init.body).to[0], 'client@example.test');
    attempts++; providerEntered(); await released;
    return new Response(JSON.stringify({ id: 'synthetic-provider-accepted' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } });
  const runtime = await handlers.initialize();
  assert.equal(runtime.customerAccess, false);
  const unrelated = await runtime.service.create(request('synthetic_unrelated_123456', 'other@example.test'));
  const config = await invoke(handlers, '/api/booking/config');
  const cookie = config.cookies.map(value => `${value.name}=${value.value}`).join('; ');
  const options = { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', Cookie: cookie }, body: request() };
  const pending = invoke(handlers, '/api/booking/requests', options).then(value => { completed = true; return value; });
  try {
    await entered;
    assert.equal(completed, false, 'the route must not finish while the provider result is pending');
    releaseProvider();
    const result = await pending;
    assert.equal(result.statusCode, 201);
    assert.equal(result.body.email.request, 'sent');
    const retry = await invoke(handlers, '/api/booking/requests', options);
    assert.equal(retry.body.bookingId, result.body.bookingId);
    assert.equal(attempts, 1);
    assert.equal(store.mail.get(`${unrelated.bookingId}:request:1`).status, 'queued');
    assert.equal(store.calls.scans, 0);
    assert.equal(store.calls.staleScans, 0);
  } finally { releaseProvider(); await pending; }
});

test('request submission remains saved and queued when email is not configured', async t => {
  t.mock.method(console, 'info', () => {});
  const { createBookingHandlers, setStore } = await handlersBundle();
  const store = memoryStore(); setStore(store);
  let networkAttempts = 0;
  const handlers = createBookingHandlers({ env: environment({ RESEND_API_KEY: undefined }), clock: () => now, fetcher: async () => { networkAttempts++; throw new Error('Network forbidden'); } });
  const config = await invoke(handlers, '/api/booking/config');
  assert.equal(config.body.emailReady, false);
  const result = await invoke(handlers, '/api/booking/requests', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', Cookie: config.cookies.map(value => `${value.name}=${value.value}`).join('; ') }, body: request() });
  assert.equal(result.statusCode, 201);
  assert.equal(result.body.email.request, 'queued');
  assert.equal(store.records.size, 1);
  assert.equal(networkAttempts, 0);
});

test('maintenance rejects unsupported methods, absent secrets, invalid tokens and missing email configuration', async t => {
  t.mock.method(console, 'info', () => {});
  const { createBookingHandlers, setStore } = await handlersBundle();
  const store = memoryStore(); setStore(store);
  const make = overrides => createBookingHandlers({ env: environment(overrides), clock: () => now, fetcher: async () => { throw new Error('Network forbidden'); } });
  for (const method of ['POST', 'PATCH', 'DELETE', 'HEAD']) {
    const result = await invoke(make({}), '/api/booking/maintenance', { method });
    assert.equal(result.statusCode, 405, method);
    assert.equal(result.headers.allow, 'GET');
    assert.equal(result.body.code, 'METHOD_NOT_ALLOWED');
    assert.match(result.headers['cache-control'], /no-store/);
    assert.match(result.headers['x-robots-tag'], /noindex/);
  }
  for (const missing of [undefined, 'short']) {
    const result = await invoke(make({ CRON_SECRET: missing }), '/api/booking/maintenance');
    assert.equal(result.statusCode, 503);
    assert.equal(result.body.code, 'MAINTENANCE_NOT_CONFIGURED');
  }
  for (const authorization of [undefined, `Bearer ${cronSecret}x`, 'Bearer invalid', '']) {
    const result = await invoke(make({}), '/api/booking/maintenance', { headers: { Authorization: authorization } });
    assert.equal(result.statusCode, 401);
    assert.equal(result.body.code, 'UNAUTHORIZED');
  }
  const notReady = await invoke(make({ RESEND_API_KEY: undefined }), '/api/booking/maintenance', { headers: { Authorization: `Bearer ${cronSecret}` } });
  assert.equal(notReady.statusCode, 503);
  assert.equal(notReady.body.code, 'EMAIL_NOT_CONFIGURED');
  assert.equal(store.calls.scans, 0);
});

test('authorized maintenance returns only bounded counters with private non-indexable response headers', async t => {
  t.mock.method(console, 'info', () => {});
  const { createBookingHandlers, setStore } = await handlersBundle();
  const store = memoryStore(); setStore(store);
  let providerCalls = 0;
  const handlers = createBookingHandlers({ env: environment(), clock: () => now, fetcher: async url => {
    assert.equal(url, 'https://api.resend.com/emails');
    return new Response(JSON.stringify({ id: `synthetic-accepted-${++providerCalls}` }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } });
  const runtime = await handlers.initialize();
  for (let index = 0; index < 8; index++) await runtime.service.create(request(`synthetic_daily_queue_${index}`, `client${index}@example.test`));
  const result = await invoke(handlers, '/api/booking/maintenance', { headers: { Authorization: `Bearer ${cronSecret}` } });
  assert.equal(result.statusCode, 200);
  assert.deepEqual(result.body, { booking: { sent: 6, unknown: 0 }, recovery: { sent: 0, cancelled: 0, deferred: 0, failed: 0, unknown: 0 } });
  assert.equal(providerCalls, 6);
  assert.equal([...store.mail.values()].filter(job => job.status === 'queued').length, 2);
  assert.match(result.headers['cache-control'], /no-store/);
  assert.match(result.headers['x-robots-tag'], /noindex/);
  assert.equal(result.headers['referrer-policy'], 'no-referrer');
  assert.doesNotMatch(JSON.stringify(result.body), /@|bookingId|publicToken|synthetic|Bearer|secret|subject|html/);
});

test('email persistence failures cannot turn an already saved request into an HTTP error', async t => {
  t.mock.method(console, 'info', () => {});
  const warnings = [];
  t.mock.method(console, 'warn', (...args) => warnings.push(args));
  const { createBookingHandlers, setStore } = await handlersBundle();
  for (const failure of ['finishMail', 'postDispatchLookup']) {
    await t.test(failure, async () => {
      warnings.length = 0;
      const store = memoryStore(); setStore(store);
      const originalGet = store.get;
      let failNextGet = false, providerCalls = 0;
      store.get = async id => {
        if (failNextGet) { failNextGet = false; throw new Error('PRIVATE_LOOKUP_FAILURE_CANARY'); }
        return originalGet(id);
      };
      if (failure === 'finishMail') store.finishMail = async () => { throw new Error('PRIVATE_FINISH_MAIL_CANARY'); };
      const handlers = createBookingHandlers({ env: environment(), clock: () => now, fetcher: async url => {
        assert.equal(url, 'https://api.resend.com/emails');
        providerCalls++;
        if (failure === 'postDispatchLookup') failNextGet = true;
        return new Response(JSON.stringify({ id: 'synthetic-provider-accepted' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      } });
      const config = await invoke(handlers, '/api/booking/config');
      const options = { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', Cookie: config.cookies.map(value => `${value.name}=${value.value}`).join('; ') }, body: request() };
      const created = await invoke(handlers, '/api/booking/requests', options);
      assert.equal(created.statusCode, 201);
      assert.equal(created.body.email.request, 'queued', 'an unconfirmed persistence result must not be advertised as sent');
      assert.equal(store.records.size, 1);
      assert.equal((await originalGet(created.body.bookingId)).status, 'awaiting_confirmation');
      const retry = await invoke(handlers, '/api/booking/requests', options);
      assert.equal(retry.statusCode, 201);
      assert.equal(retry.body.bookingId, created.body.bookingId);
      assert.equal(providerCalls, 1, 'a provider-accepted job must not be sent twice after a response retry');
      assert.equal(store.calls.scans, 0);
      assert.deepEqual(warnings, [['[booking:email-dispatch]', { phase: 'request' }]]);
      assert.doesNotMatch(JSON.stringify(warnings), /CANARY|@|synthetic-provider|bookingId/);
      assert.equal(JSON.stringify(warnings).includes(created.body.bookingId), false);
    });
  }
});

test('a verified payment stays paid when receipt persistence or its final lookup fails', async t => {
  const warnings = [];
  t.mock.method(console, 'warn', (...args) => warnings.push(args));
  for (const failure of ['finishMail', 'postDispatchLookup']) {
    await t.test(failure, async () => {
      warnings.length = 0;
      let providerCalls = 0, failNextGet = false;
      const payment = {
        async create() { return { id: 1, link: 'https://synthetic.payrexx.com/checkout' }; },
        async verify() { return { status: 'paid', transactionId: 'synthetic-paid-transaction' }; },
      };
      const { service, store } = fixture(async () => {
        providerCalls++;
        if (failure === 'postDispatchLookup') failNextGet = true;
        return { id: 'synthetic-receipt-accepted' };
      }, payment);
      const originalGet = store.get;
      store.get = async id => {
        if (failNextGet) { failNextGet = false; throw new Error('PRIVATE_RECEIPT_LOOKUP_CANARY'); }
        return originalGet(id);
      };
      if (failure === 'finishMail') store.finishMail = async () => { throw new Error('PRIVATE_RECEIPT_FINISH_CANARY'); };
      const booking = await service.create(request());
      await service.confirmAppointment(booking.bookingId, { operatorId: 'synthetic-operator', holdExpiresAt: '2026-11-24T14:00:00Z' });
      await service.checkout(booking.bookingId, booking.publicToken, { acceptedQuoteRevision: 1, termsAccepted: true, termsVersion: BOOKING_TERMS_VERSION, language: 'es' });
      const result = await service.reconcile(booking.bookingId);
      assert.equal(result.payment.status, 'paid');
      assert.equal(result.payment.amountPaidCents, result.payment.amountDueNowCents);
      assert.equal(result.scheduling.status, 'confirmed');
      assert.equal(result.email.receipt, 'queued');
      assert.equal((await originalGet(booking.bookingId)).payment.status, 'paid');
      assert.equal((await service.reconcile(booking.bookingId)).payment.status, 'paid');
      assert.equal(providerCalls, 1);
      assert.equal(store.calls.scans, 0);
      assert.deepEqual(warnings, [['[booking:email-dispatch]', { phase: 'receipt' }]]);
      assert.doesNotMatch(JSON.stringify(warnings), /CANARY|@|synthetic-paid|synthetic-receipt/);
      assert.equal(JSON.stringify(warnings).includes(booking.bookingId), false);
    });
  }
});

test('maintenance still reports a worker failure instead of a false successful delivery report', async t => {
  t.mock.method(console, 'info', () => {});
  const { createBookingHandlers, setStore } = await handlersBundle();
  const store = memoryStore(); setStore(store);
  store.listDueMail = async () => { throw new Error('PRIVATE_WORKER_FAILURE_CANARY'); };
  let providerCalls = 0;
  const handlers = createBookingHandlers({ env: environment(), clock: () => now, fetcher: async () => { providerCalls++; throw new Error('Network forbidden'); } });
  const result = await invoke(handlers, '/api/booking/maintenance', { headers: { Authorization: `Bearer ${cronSecret}` } });
  assert.equal(result.statusCode, 503);
  assert.equal(result.body.code, 'BOOKING_UNAVAILABLE');
  assert.doesNotMatch(JSON.stringify(result.body), /CANARY|stack|message|@/);
  assert.equal(providerCalls, 0);
});

test('only documented Resend 429 errors expose safe retry metadata', async () => {
  const message = { from: 'sender@example.test', to: 'client@example.test', subject: 'Synthetic', text: 'Synthetic', idempotencyKey: 'synthetic-fixed-key' };
  for (const name of ['rate_limit_exceeded', 'daily_quota_exceeded', 'monthly_quota_exceeded']) {
    const adapter = createResendEmailAdapter('synthetic-key', async () => Response.json({ name, message: 'PRIVATE_PROVIDER_BODY_CANARY' }, { status: 429, headers: { 'Retry-After': '1200' } }));
    await assert.rejects(adapter(message), error => {
      assert.equal(error.definitelyNotSent, true);
      assert.equal(error.retryable, true);
      assert.equal(error.retryAfterMs, 1200000);
      assert.doesNotMatch(JSON.stringify(error), /PRIVATE_PROVIDER_BODY_CANARY|retry-after/i);
      return true;
    });
  }
  for (const header of [undefined, '-10', 'not-a-delay', '999999999999999999999999999']) {
    const adapter = createResendEmailAdapter('synthetic-key', async () => Response.json({ name: 'rate_limit_exceeded' }, { status: 429, headers: header ? { 'Retry-After': header } : {} }));
    await assert.rejects(adapter(message), error => error.retryable === true && error.retryAfterMs === 0);
  }
});

test('known 429 retries respect persisted dueAt, stable idempotency and three total worker attempts', async () => {
  let currentTime = now, providerCalls = 0;
  const keys = [];
  const adapter = createResendEmailAdapter('synthetic-key', async (_url, init) => {
    providerCalls++; keys.push(init.headers['Idempotency-Key']);
    return Response.json({ name: 'rate_limit_exceeded' }, { status: 429, headers: { 'Retry-After': '1200' } });
  });
  const initial = fixture(adapter, null, () => currentTime), { store } = initial;
  let service = initial.service;
  const booking = await service.create(request()), jobId = `${booking.bookingId}:request:1`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    assert.deepEqual(await service.runDue({ jobId, limit: 1 }), { sent: 0, unknown: 0 });
    assert.equal(providerCalls, attempt);
    assert.equal(store.mail.get(jobId).attempts, attempt);
    if (attempt < 3) {
      assert.equal(store.mail.get(jobId).status, 'queued');
      assert.equal((await store.get(booking.bookingId)).email.request, 'queued');
      const retryAt = currentTime + 1200000;
      assert.equal(store.mail.get(jobId).dueAt, retryAt);
      currentTime = retryAt - 1;
      await service.runDue({ jobId, limit: 1 });
      assert.equal(providerCalls, attempt, 'HTTP retries cannot bypass dueAt');
      currentTime = retryAt;
      service = createBookingService({ store, tokenSecret: secret, origin, mode: 'live', sendEmail: adapter, sender: 'sender@example.test', clock: () => currentTime });
    }
  }
  assert.equal(store.mail.get(jobId).status, 'failed');
  assert.equal((await store.get(booking.bookingId)).email.request, 'failed');
  currentTime += 86400000;
  await service.runDue({ jobId, limit: 1 });
  await service.runDue();
  assert.equal(providerCalls, 3);
  assert.deepEqual([...new Set(keys)], [`kraken-booking:${jobId}`]);
});

test('a known rejection waits at least fifteen minutes and a later accepted email is sent once', async () => {
  let currentTime = now, providerCalls = 0;
  const keys = [];
  const adapter = createResendEmailAdapter('synthetic-key', async (_url, init) => {
    keys.push(init.headers['Idempotency-Key']);
    if (++providerCalls === 1) return Response.json({ name: 'daily_quota_exceeded' }, { status: 429, headers: { 'Retry-After': '1' } });
    return Response.json({ id: 'accepted-after-known-rejection' });
  });
  const { service, store } = fixture(adapter, null, () => currentTime);
  const booking = await service.create(request()), jobId = `${booking.bookingId}:request:1`;
  await service.runDue({ jobId, limit: 1 });
  assert.equal(store.mail.get(jobId).dueAt, now + 15 * 60000);
  currentTime += 15 * 60000;
  assert.deepEqual(await service.runDue({ jobId, limit: 1 }), { sent: 1, unknown: 0 });
  assert.equal((await store.get(booking.bookingId)).email.request, 'sent');
  assert.equal(store.mail.get(jobId).attempts, 2);
  await service.runDue({ jobId, limit: 1 });
  assert.equal(providerCalls, 2);
  assert.equal(new Set(keys).size, 1);
});

test('unrecognised 429, 409, 5xx, timeouts and uncertain successful bodies are never retried', async () => {
  for (const response of [
    () => Response.json({ name: 'unrecognised_limit' }, { status: 429 }),
    () => Response.json({ name: 'rate_limit_exceeded' }, { status: 409 }),
    () => Response.json({ name: 'rate_limit_exceeded' }, { status: 503 }),
    () => { throw new DOMException('Synthetic timeout', 'TimeoutError'); },
    () => Response.json({ unexpected: true }),
  ]) {
    let providerCalls = 0;
    const adapter = createResendEmailAdapter('synthetic-key', async () => { providerCalls++; return response(); });
    const { service, store } = fixture(adapter);
    const booking = await service.create(request()), jobId = `${booking.bookingId}:request:1`;
    assert.deepEqual(await service.runDue({ jobId, limit: 1 }), { sent: 0, unknown: 1 });
    await service.runDue({ jobId, limit: 1 }); await service.runDue();
    assert.equal(providerCalls, 1);
    assert.equal(store.mail.get(jobId).status, 'delivery_unknown');
    assert.equal(store.mail.get(jobId).attempts, 1);
  }
});

test('Firestore transaction records persist attempt counts and deferred dueAt', async () => {
  const documents = new Map();
  const db = {
    collection: name => ({ doc: id => ({ key: `${name}/${id}` }) }),
    async runTransaction(action) {
      return action({
        async get(ref) { return { exists: documents.has(ref.key), data: () => clone(documents.get(ref.key)) }; },
        create(ref, value) { assert.equal(documents.has(ref.key), false); documents.set(ref.key, clone(value)); },
        set(ref, value) { documents.set(ref.key, clone(value)); },
        update(ref, value) { documents.set(ref.key, { ...documents.get(ref.key), ...clone(value) }); },
      });
    },
  };
  const store = createFirestoreBookingStore(db);
  await store.addMail({ id: 'synthetic-persisted-job', kind: 'request', status: 'queued', dueAt: now });
  const first = await store.claimMail('synthetic-persisted-job', now);
  assert.equal(first.attempts, 1);
  await store.finishMail(first.id, 'queued', null, now + 1200000);
  assert.equal(await store.claimMail(first.id, now + 1199999), null);
  const second = await store.claimMail(first.id, now + 1200000);
  assert.equal(second.attempts, 2);
  assert.equal(second.dueAt, now + 1200000);
});
