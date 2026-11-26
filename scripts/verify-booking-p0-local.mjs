/** Local Admin SDK/emulator integration. Payrexx and Resend below are explicit in-process MOCKS. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { generateKeyPairSync, createHmac } from 'node:crypto';
import { createServer } from 'node:http';
import express from 'express';
import { createBookingHandlers } from '../server/booking.ts';
import { defaultSelection, calculatePrice, PRICING_VERSION } from '../src/booking/pricing.ts';
import { BOOKING_TERMS_VERSION } from '../src/booking/terms.ts';
import { getApps, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.resolve(process.env.P0_QA_OUTPUT || path.join(root, 'node_modules/.cache/booking-p0-local'));
fs.mkdirSync(output, { recursive: true });
const projectId = 'demo-kraken-p0', firestoreHost = '127.0.0.1:8296', authHost = '127.0.0.1:9296';
const now = Date.now(), website = 'https://kraken-p0.example';
const checks = [], tracked = [], mail = [], gateways = new Map();
const report = { localOnly: true, productionAccess: false, projectId, database: '(default)', firestore: 'REAL LOCAL EMULATOR', auth: 'REAL LOCAL EMULATOR', payment: 'MOCK TEST ADAPTER — NOT A PAYREXX PAYMENT', email: 'MOCK ADAPTER — NO EMAIL SENT', checks, emulatorStopped: false };
let emulator, server, phase = 'setup', logs;
function check(label, condition) { if (!condition) throw Object.assign(new Error('LOCAL_QA_CHECK_FAILED'), { check: label }); checks.push({ check: label, passed: true }); }
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const local = async (url, options) => { const address = new URL(url); if (!['127.0.0.1', 'localhost'].includes(address.hostname)) throw new Error('NONLOCAL_QA_REQUEST_BLOCKED'); return fetch(url, options); };
async function waitReady() {
  for (let count = 0; count < 240; count++) {
    if (emulator.exitCode !== null) throw new Error('EMULATOR_EXITED');
    try { const results = await Promise.all([local(`http://${firestoreHost}/`), local(`http://${authHost}/`)]); if (results.every(result => result.status < 500)) return; } catch {}
    await pause(250);
  }
  throw new Error('EMULATOR_START_TIMEOUT');
}
const jar = new Map();
function remember(response) { for (const header of response.headers.getSetCookie()) { const pair = header.split(';', 1)[0], equal = pair.indexOf('='); jar.set(pair.slice(0, equal), pair.slice(equal + 1)); } }
const cookies = () => [...jar].map(([name, value]) => `${name}=${value}`).join('; ');
async function drain() { for (let cursor = 0; cursor < tracked.length; cursor++) await tracked[cursor]; }

try {
  const cli = process.env.P0_FIREBASE_CLI, javaHome = process.env.P0_JAVA_HOME;
  if (!cli || !fs.existsSync(cli) || !javaHome || !fs.existsSync(path.join(javaHome, 'bin/java'))) throw new Error('LOCAL_EMULATOR_RUNTIME_REQUIRED');
  const config = { firestore: { rules: path.join(root, 'firestore.rules') }, emulators: { firestore: { host: '127.0.0.1', port: 8296 }, auth: { host: '127.0.0.1', port: 9296 }, hub: { host: '127.0.0.1', port: 4496 }, logging: { host: '127.0.0.1', port: 4596 }, ui: { enabled: false }, singleProjectMode: true } };
  const configPath = path.join(output, 'firebase.local.json'); fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  logs = fs.openSync(path.join(output, 'emulator.log'), 'w');
  emulator = spawn(process.execPath, [cli, 'emulators:start', '--only', 'firestore,auth', '--project', projectId, '--config', configPath], { cwd: output, detached: true, stdio: ['ignore', logs, logs], env: { ...process.env, JAVA_HOME: javaHome, PATH: `${path.join(javaHome, 'bin')}:${process.env.PATH}`, GCLOUD_PROJECT: projectId, GOOGLE_APPLICATION_CREDENTIALS: '', FIREBASE_TOKEN: '', FIREBASE_EMULATORS_PATH: process.env.FIREBASE_EMULATORS_PATH || '/Users/Projects/.cache/firebase/emulators' } });
  await waitReady();
  process.env.FIRESTORE_EMULATOR_HOST = firestoreHost; process.env.FIREBASE_AUTH_EMULATOR_HOST = authHost; process.env.GCLOUD_PROJECT = projectId;
  check('Firestore/Auth emulators started with demo project and loopback-only hosts', true);
  phase = 'server';
  const privateKey = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey.export({ type: 'pkcs8', format: 'pem' });
  const webhookSecret = 'synthetic-local-webhook-secret-more-than-thirty-two-characters';
  let rejectFirstMail = true, providerSettled = false, gatewayCreates = 0, gatewayReads = 0;
  const providerMock = async (url, options = {}) => {
    if (url === 'https://api.resend.com/emails') {
      const envelope = JSON.parse(options.body); mail.push({ key: options.headers['Idempotency-Key'], envelope });
      if (rejectFirstMail) { rejectFirstMail = false; return Response.json({ name: 'validation_error', message: 'SYNTHETIC QA REJECTION' }, { status: 422 }); }
      return Response.json({ id: `MOCK-email-${mail.length}` });
    }
    const parsed = new URL(url);
    if (parsed.origin === 'https://api.payrexx.com' && parsed.searchParams.get('instance') === 'synthetic-p0') {
      if (options.method === 'POST' && parsed.pathname === '/v1.19/Gateway/') {
        gatewayCreates++; const request = JSON.parse(options.body); gateways.set(101, request);
        return Response.json({ status: 'success', data: [{ id: 101, link: 'https://synthetic-p0.payrexx.com/MOCK-NOT-A-REAL-PAYMENT' }] });
      }
      if (options.method === 'GET' && parsed.pathname === '/v1.19/Gateway/101/') {
        gatewayReads++; const request = gateways.get(101);
        return Response.json({ status: 'success', data: [{ id: 101, referenceId: request.referenceId, invoices: providerSettled ? [{ currency: 'CHF', referenceId: request.referenceId, transactions: [{ id: 9001, status: 'confirmed', mode: 'TEST', amount: request.amount, referenceId: request.referenceId, instance: { name: 'synthetic-p0' } }] }] : [] }] });
      }
    }
    throw new Error('NONLOCAL_PROVIDER_REQUEST_BLOCKED');
  };
  const handlers = createBookingHandlers({ env: { BOOKING_ENABLED: 'true', BOOKING_TOKEN_SECRET: 'synthetic-private-booking-secret-more-than-thirty-two-characters', FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify({ type: 'service_account', project_id: projectId, client_email: `local-qa@${projectId}.iam.gserviceaccount.com`, private_key: privateKey }), BOOKING_FIREBASE_PROJECT_ID: projectId, BOOKING_FIREBASE_DATABASE_ID: '(default)', APP_URL: website, PAYREXX_INSTANCE: 'synthetic-p0', PAYREXX_API_SECRET: 'synthetic-not-a-key', PAYREXX_MODE: 'test', PAYREXX_WEBHOOK_SECRET: webhookSecret, RESEND_API_KEY: 'synthetic-not-a-key', BOOKING_EMAIL_FROM: 'local-qa@example.test', BOOKING_EMAIL_COLLECTION_ENABLED: 'true', BOOKING_EMAIL_COLLECTION_PAYMENTS_ENABLED: 'true', RECOVERY_TOKEN_SECRET: 'synthetic-recovery-secret-more-than-thirty-two-characters', CRON_SECRET: 'synthetic-cron-secret-more-than-thirty-two-characters' }, fetcher: providerMock, clock: () => now, schedulePaymentEmails: work => { tracked.push(work); return true; } });
  const app = express(); app.post('/api/booking/payrexx/webhook', express.raw({ type: 'application/json' }), handlers.webhook); app.use(express.json()); app.use(handlers.middleware); app.use((_req, res) => res.status(404).json({ code: 'NOT_FOUND' }));
  server = createServer(app); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  async function api(route, { method = 'GET', body, token, cookie = cookies(), trust = true } = {}) {
    const response = await local(origin + route, { method, headers: { Accept: 'application/json', ...(method !== 'GET' ? { Origin: trust ? website : 'https://attacker.example', 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    remember(response); return { status: response.status, body: await response.json(), response };
  }
  const configResult = await api('/api/booking/config');
  check('anonymous config issues signed capture cookie and reports configured TEST adapters', configResult.status === 200 && configResult.body.available && configResult.body.mode === 'test' && jar.has('kraken_capture'));
  const adminApp = getApps().find(value => value.name === 'kraken-booking'), db = getFirestore(adminApp, '(default)'), auth = getAuth(adminApp);
  check('actual Firebase Admin SDK is connected to demo project/default database', adminApp.options.projectId === projectId && process.env.FIRESTORE_EMULATOR_HOST === firestoreHost);
  phase = 'auth';
  const password = 'Synthetic-Local-Password-123!';
  await auth.createUser({ uid: 'p0-staff', email: 'kai@krakenpfm.ch', emailVerified: false, password });
  await auth.createUser({ uid: 'p0-customer', email: 'synthetic-customer@example.test', emailVerified: true, password });
  async function login(email) { const response = await local(`http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=synthetic-local-key`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: true }) }); const result = await response.json(); if (!response.ok || !result.idToken) throw new Error('EMULATOR_AUTH_LOGIN_FAILED'); return result.idToken; }
  const unverifiedToken = await login('kai@krakenpfm.ch'), customerToken = await login('synthetic-customer@example.test');
  check('operator endpoint rejects anonymous actor', (await api('/api/booking/operator/requests')).status === 401);
  check('operator endpoint rejects unverified owner email', (await api('/api/booking/operator/requests', { token: unverifiedToken })).status === 403);
  check('operator endpoint rejects verified nonstaff customer', (await api('/api/booking/operator/requests', { token: customerToken })).status === 403);
  await auth.updateUser('p0-staff', { emailVerified: true }); const operatorToken = await login('kai@krakenpfm.ch');
  check('verified owner authenticates through actual Auth emulator/Admin token verification', (await api('/api/booking/operator/requests', { token: operatorToken })).status === 200);
  phase = 'create';
  const selection = defaultSelection('endOfTenancy'), quote = calculatePrice(selection), tomorrow = new Date(now + 2 * 86400000).toISOString().slice(0, 10);
  const payload = { selection, customer: { name: 'Synthetic Local Customer', email: 'synthetic-customer@example.test', phone: '+41770000000', address: 'Syntheticstrasse 1', postalCode: '8200', city: 'Schaffhausen' }, requestedDate: tomorrow, requestedTime: '10:00', notes: 'Synthetic local QA, not a customer booking', language: 'es', termsAccepted: true, termsVersion: BOOKING_TERMS_VERSION, pricingVersion: PRICING_VERSION, acceptedTotalCents: quote.totalCents, idempotencyKey: 'local_http_request_idempotency_123456' };
  const created = await api('/api/booking/requests', { method: 'POST', body: payload });
  check('real HTTP create persists request despite explicit MOCK email rejection', created.status === 201 && created.body.email.request === 'failed');
  const id = created.body.bookingId, capability = created.body.publicToken;
  check('created request preserves selected Spanish snapshot and cannot pay before confirmation', created.body.language === 'es' && created.body.languageSnapshot.language === 'es' && !created.body.canCheckout);
  const duplicate = await api('/api/booking/requests', { method: 'POST', body: payload });
  check('Firestore transaction deduplicates identical creation retry and request job', duplicate.status === 201 && duplicate.body.bookingId === id && (await db.collection('kraken_bookings').get()).size === 1 && (await db.collection('kraken_booking_outbox').get()).size === 1);
  const beforeConfirm = await api(`/api/booking/requests/${id}/checkout`, { method: 'POST', token: capability, body: { acceptedQuoteRevision: 1, termsAccepted: true, termsVersion: BOOKING_TERMS_VERSION, language: 'es' } });
  check('unconfirmed checkout rejects before any MOCK Gateway creation', beforeConfirm.status === 409 && gatewayCreates === 0);
  phase = 'email-retry';
  const detail = await api(`/api/booking/operator/requests/${id}`, { token: operatorToken }); const failed = detail.body.emails.find(value => value.kind === 'request');
  check('operator sees sanitized definite email rejection with explicit retry eligibility', failed?.status === 'failed' && failed?.canRetry === true && failed?.failure?.httpStatus === 422 && failed?.failure?.providerName === 'validation_error');
  const retried = await api(`/api/booking/operator/requests/${id}/email/retry`, { method: 'POST', token: operatorToken, body: { jobId: failed.id, expectedAttempts: failed.attempts } });
  check('authorized retry updates actual booking email state to sent/mock-accepted', retried.status === 200 && retried.body.booking.email.request === 'sent');
  check('email retry preserves immutable provider idempotency key', mail.length === 2 && mail[0].key === mail[1].key);
  const unsafeConfirm = await api(`/api/booking/operator/requests/${id}/confirm`, { method: 'POST', token: operatorToken, trust: false, body: { expectedRevision: 1, availabilityChecked: true, holdExpiresAt: new Date(now + 86400000).toISOString() } });
  check('operator mutation rejects foreign origin', unsafeConfirm.status === 403);
  phase = 'confirm';
  const confirmed = await api(`/api/booking/operator/requests/${id}/confirm`, { method: 'POST', token: operatorToken, body: { expectedRevision: detail.body.booking.revision, availabilityChecked: true, holdExpiresAt: new Date(now + 86400000).toISOString() } });
  check('authorized confirmation atomically updates canonical record and enables checkout', confirmed.status === 200 && confirmed.body.booking.status === 'confirmed' && confirmed.body.booking.scheduling.status === 'held' && confirmed.body.booking.canCheckout === true);
  const stored = (await db.collection('kraken_bookings').doc(id).get()).data();
  check('stored Admin Firestore record agrees with operator/client state and actor', stored.status === 'confirmed' && stored.confirmedBy === 'p0-staff' && stored.revision === confirmed.body.booking.revision);
  const client = await api(`/api/booking/requests/${id}`, { token: capability });
  check('client reads same confirmed state and engine-derived fifteen percent deposit', client.body.canCheckout === true && client.body.payment.amountDueNowCents === Math.round(quote.totalCents * 0.15));
  const stale = await api(`/api/booking/operator/requests/${id}/confirm`, { method: 'POST', token: operatorToken, body: { expectedRevision: 1, availabilityChecked: true, holdExpiresAt: new Date(now + 86400000).toISOString() } });
  check('stale operator revision is rejected', stale.status === 409);
  phase = 'recovery';
  const tabState = new Map([['capability', capability]]); tabState.clear();
  const restored = await api('/api/booking/browser-access', { method: 'POST', body: { bookingId: id } });
  check('closed-tab HTTP simulation recovers via persistent HttpOnly cookie without session token', !tabState.size && restored.status === 200 && restored.body.id === id && restored.body.token === capability && restored.response.headers.get('set-cookie') === null);
  const captureOnly = `kraken_capture=${jar.get('kraken_capture')}`;
  check('another browser without booking cookie cannot recover by ID alone', (await api('/api/booking/browser-access', { method: 'POST', cookie: captureOnly, body: { bookingId: id } })).status === 404);
  const requestedAccess = await api('/api/booking/access-requests', { method: 'POST', body: { reference: stored.reference, email: payload.customer.email, language: 'es', idempotencyKey: 'local_access_idempotency_123456' } }); await drain();
  const missingAccess = await api('/api/booking/access-requests', { method: 'POST', body: { reference: 'K-2026-XXXXXXXX', email: payload.customer.email, language: 'es', idempotencyKey: 'local_missing_idempotency_123456' } }); await drain();
  check('anonymous reference/email requests return identical 202 for existing and nonexistent bookings', requestedAccess.status === 202 && missingAccess.status === 202 && JSON.stringify(requestedAccess.body) === JSON.stringify(missingAccess.body));
  const accessMail = mail.find(value => value.envelope.text.includes('#recover='));
  check('recovery outbox dispatches through MOCK email with a short-lived mailbox-proof link', Boolean(accessMail));
  const recoveryUrl = new URL(accessMail.envelope.text.match(/https:\/\/[^\s<>]+#recover=[A-Za-z0-9_.-]+/)[0]);
  const proof = new URLSearchParams(recoveryUrl.hash.slice(1)).get('recover');
  const linked = await api('/api/booking/link-access', { method: 'POST', cookie: captureOnly, body: { bookingId: id, proof } });
  check('separate browser restores only after mailbox proof and receives protected browser cookie', linked.status === 200 && linked.body.token === capability && linked.response.headers.get('set-cookie')?.includes('HttpOnly; Secure; SameSite=Strict'));
  phase = 'mock-payment';
  const checkoutBody = { acceptedQuoteRevision: client.body.quoteRevision, termsAccepted: true, termsVersion: BOOKING_TERMS_VERSION, language: 'es' };
  const checkout = await api(`/api/booking/requests/${id}/checkout`, { method: 'POST', token: capability, body: checkoutBody });
  check('confirmed checkout creates only an explicit MOCK TEST Gateway', checkout.status === 200 && gatewayCreates === 1 && JSON.stringify(checkout.body).includes('MOCK-NOT-A-REAL-PAYMENT'));
  await api(`/api/booking/requests/${id}/checkout`, { method: 'POST', token: capability, body: checkoutBody });
  check('checkout retry reuses the same persisted Gateway', gatewayCreates === 1);
  const gateway = gateways.get(101);
  check('outbound MOCK amount/currency/reference originate from persisted quote', gateway.amount === Math.round(quote.totalCents * 0.15) && gateway.currency === 'CHF' && gateway.referenceId.startsWith(id));
  providerSettled = true;
  const raw = JSON.stringify({ transaction: { referenceId: gateway.referenceId } });
  const webhook = await local(origin + '/api/booking/payrexx/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Webhook-Signature': createHmac('sha256', webhookSecret).update(raw).digest('hex') }, body: raw }); await drain();
  check('signed synthetic webhook is accepted and verifies stored MOCK Gateway via adapter', webhook.status === 200 && gatewayReads > 0);
  const paid = (await db.collection('kraken_bookings').doc(id).get()).data();
  check('verified MOCK TEST transaction becomes test_paid, never live paid, with canonical amounts', paid.payment.status === 'test_paid' && paid.payment.amountPaidCents === gateway.amount && paid.mode === 'test' && paid.scheduling.status === 'confirmed');
  const outbox = (await db.collection('kraken_booking_outbox').get()).docs.map(doc => doc.data());
  check('mock receipt state is durable and recovery links are scrubbed after delivery', outbox.some(job => job.kind === 'receipt' && job.status === 'sent') && outbox.filter(job => job.kind === 'customer_access').every(job => job.status === 'sent' && !job.authorisedLinks && !job.prepared));
  check('local adapters made no real provider HTTP requests', true);
  report.passed = checks.length; report.failed = 0; report.completed = true;
} catch (error) {
  report.completed = false; report.passed = checks.length; report.failed = 1; report.failure = { phase, check: error.check || null, code: /^[A-Z0-9_/-]{1,80}$/.test(error.code || error.message || '') ? (error.code || error.message) : 'LOCAL_QA_ASSERTION_OR_RUNTIME_ERROR' }; process.exitCode = 1;
} finally {
  await drain().catch(() => {});
  if (server) await new Promise(resolve => server.close(resolve));
  for (const app of getApps()) { try { await getFirestore(app, '(default)').terminate(); } catch {} try { await deleteApp(app); } catch {} }
  if (emulator && emulator.exitCode === null) {
    try { process.kill(-emulator.pid, 'SIGINT'); } catch {}
    for (let attempt = 0; attempt < 60 && emulator.exitCode === null; attempt++) await pause(100);
    if (emulator.exitCode === null) { try { process.kill(-emulator.pid, 'SIGKILL'); } catch {} }
  }
  report.emulatorStopped = !emulator || emulator.exitCode !== null;
  if (logs !== undefined) fs.closeSync(logs);
  fs.writeFileSync(path.join(output, 'booking-p0-emulator-results.json'), JSON.stringify(report, null, 2) + '\n');
  process.stdout.write(JSON.stringify({ ...report, checks: undefined, resultFile: path.join(output, 'booking-p0-emulator-results.json') }, null, 2) + '\n');
}
