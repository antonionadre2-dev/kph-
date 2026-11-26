import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createServer } from 'node:http';
import { BOOKING_BROWSER_COOKIE, BOOKING_BROWSER_TTL_MS, BOOKING_MAIL_ACCESS_TTL_MS, createBookingAccessRecovery, issueBookingBrowserCookie, redeemBookingBrowserCookie } from '../server/booking-access-recovery.ts';
import { prepareCustomerEnvelope } from '../server/customer-notifications.ts';
import { accessRecoveryText } from '../src/booking/accessRecoveryCopy.ts';

const instant = Date.parse('2026-11-26T10:00:00Z');
const secret = 'synthetic-private-server-secret-at-least-32-characters';
const bookingId = 'synthetic_booking_12345678';
const otherId = 'different_booking_12345678';
const bearer = 'a'.repeat(43);
const record = { bookingId, reference: 'K-2026-ABCDEFGH', customer: { email: 'synthetic@example.test' }, mode: 'test', tokenRevoked: false };
const request = (overrides: Record<string, unknown> = {}) => ({ reference: record.reference, email: record.customer.email, language: 'es', idempotencyKey: 'synthetic_retry_key_123456789', ...overrides });
function fixture() {
  let now = instant, revoked = false, suppressed = false;
  const records = new Map([[bookingId, structuredClone(record)]]), jobs = new Map<string, any>(), rates = new Map<string, number>();
  const lookups: unknown[] = [], resolverCalls: string[] = [], dispatched: string[] = [];
  const store = {
    async findByReferenceEmail(reference: string, email: string) { lookups.push({ reference, email }); return [...records.values()].find(row => row.reference === reference && row.customer.email === email) || null; },
    async consumeRate(key: string, _now: number, _window: number, limit: number) { const count = (rates.get(key) || 0) + 1; rates.set(key, count); return count <= limit; },
    async isEmailSuppressed() { return suppressed; },
    async addMail(job: any) { if (jobs.has(job.id)) return false; jobs.set(job.id, structuredClone(job)); return true; },
  };
  const service = createBookingAccessRecovery({ secret, origin: 'https://kraken.example', store, clock: () => now,
    async resolveBookingAccess(id) { resolverCalls.push(id); return records.has(id) && !revoked ? { id, token: bearer } : null; },
    async dispatchMail(id) { dispatched.push(id); },
  });
  return { service, store, records, jobs, rates, lookups, resolverCalls, dispatched,
    tick(ms: number) { now += ms; }, now: () => now, revoke() { revoked = true; }, suppress() { suppressed = true; } };
}
const cookiePair = (header: string) => header.split(';', 1)[0];
const cookieOptions = (cookieHeader: string, id = bookingId, now = instant) => ({ cookieHeader, bookingId: id, secret, now });

test('persistent browser cookie has only last-booking authority, bounded dates and required security attributes', () => {
  const header = issueBookingBrowserCookie({ bookingId, secret, now: instant, ttlMs: BOOKING_BROWSER_TTL_MS * 4 });
  assert.match(header, /^__Secure-kraken_booking_access=/);
  for (const attribute of ['Max-Age=604800', 'Path=/api/booking', 'HttpOnly', 'Secure', 'SameSite=Strict']) assert.ok(header.includes(attribute));
  const encoded = cookiePair(header).split('=')[1].split('.')[0];
  assert.deepEqual(JSON.parse(Buffer.from(encoded, 'base64url').toString()), { id: bookingId, issuedAt: instant, expiresAt: instant + BOOKING_BROWSER_TTL_MS });
  assert.equal(redeemBookingBrowserCookie(cookieOptions(cookiePair(header))), true);
  assert.equal(redeemBookingBrowserCookie(cookieOptions(cookiePair(header), otherId)), false);
  assert.equal(redeemBookingBrowserCookie(cookieOptions(cookiePair(header), bookingId, instant + BOOKING_BROWSER_TTL_MS)), false);
  const lastCookie = cookiePair(issueBookingBrowserCookie({ bookingId: otherId, secret, now: instant }));
  assert.equal(redeemBookingBrowserCookie(cookieOptions(lastCookie, bookingId)), false, 'replacement cookie grants no authority to an earlier booking');
  assert.equal(redeemBookingBrowserCookie(cookieOptions(lastCookie, otherId)), true);
});

test('browser cookie rejects tampering, duplication, another secret and future issuance', () => {
  const cookie = cookiePair(issueBookingBrowserCookie({ bookingId, secret, now: instant }));
  assert.equal(redeemBookingBrowserCookie(cookieOptions(cookie.slice(0, -1) + (cookie.endsWith('a') ? 'b' : 'a'))), false);
  assert.equal(redeemBookingBrowserCookie(cookieOptions(`${cookie}; ${cookie}`)), false);
  assert.equal(redeemBookingBrowserCookie({ ...cookieOptions(cookie), secret: 'another-private-server-secret-at-least-32-characters' }), false);
  assert.equal(redeemBookingBrowserCookie(cookieOptions(cookiePair(issueBookingBrowserCookie({ bookingId, secret, now: instant + 31_000 })))), false);
  assert.equal(redeemBookingBrowserCookie(cookieOptions('')), false);
});

test('matching, unknown, suppressed and rate-limited requests receive the identical generic acknowledgement without capabilities', async () => {
  const matching = fixture(), unknown = fixture(), suppressed = fixture(), limited = fixture(); suppressed.suppress();
  const outcomes = [
    await matching.service.requestAccess(request(), { rateKey: 'synthetic_source_123' }),
    await unknown.service.requestAccess(request({ reference: 'K-2026-XXXXXXXX' }), { rateKey: 'synthetic_source_123' }),
    await suppressed.service.requestAccess(request(), { rateKey: 'synthetic_source_123' }),
  ];
  for (let attempt = 0; attempt < 4; attempt++) outcomes.push(await limited.service.requestAccess(request(), { rateKey: 'synthetic_source_123' }));
  for (const outcome of outcomes) assert.deepEqual(outcome, { status: 'accepted' });
  assert.equal(matching.jobs.size, 1); assert.equal(unknown.jobs.size, 0); assert.equal(suppressed.jobs.size, 0);
  assert.equal(limited.lookups.length, 3, 'fourth attempt is stopped before booking lookup');
  assert.equal(limited.rates.size, 3); assert.equal([...limited.rates.values()].every(value => value === 4), true);
  assert.doesNotMatch(JSON.stringify([...limited.rates.keys()]), /synthetic@example|ABCDEFGH|synthetic_source/);
});

test('duplicate request retains one immutable, renderable collection job and real fifteen-minute expiry', async () => {
  const f = fixture();
  await f.service.requestAccess(request(), { rateKey: 'synthetic_source_123' });
  const first = structuredClone([...f.jobs.values()][0]); f.tick(30_000);
  await f.service.requestAccess(request(), { rateKey: 'synthetic_source_123' });
  assert.equal(f.jobs.size, 1); assert.deepEqual([...f.jobs.values()][0], first);
  assert.equal(first.kind, 'customer_access'); assert.equal(first.bookingId, null);
  assert.equal(first.expiresAt, instant + BOOKING_MAIL_ACCESS_TTL_MS);
  assert.equal(first.notification.templateId, 'magic_link'); assert.equal(first.notification.languageSnapshot.language, 'es');
  const envelope = prepareCustomerEnvelope(first.notification, first.authorisedLinks, 'https://kraken.example');
  assert.match(envelope.subject, /^\[TEST\]/); assert.equal(envelope.to, record.customer.email);
  assert.ok(envelope.text.includes(first.authorisedLinks.primary));
  assert.ok(first.message.text.includes(first.authorisedLinks.primary));
  const link = new URL(first.authorisedLinks.primary);
  assert.equal(link.pathname, '/es/offerte'); assert.equal(link.searchParams.get('booking'), bookingId);
  assert.equal(link.searchParams.has('email'), false); assert.equal(link.searchParams.has('token'), false);
  assert.ok(link.hash.startsWith('#recover=')); assert.doesNotMatch(link.href, /synthetic%40|synthetic@example/);
});

test('only mailbox proof or an authentic browser cookie can release access; expiry, wrong purpose and revocation fail', async () => {
  const f = fixture(); await f.service.requestAccess(request(), { rateKey: 'synthetic_source_123' });
  const job = [...f.jobs.values()][0], proof = new URLSearchParams(new URL(job.authorisedLinks.primary).hash.slice(1)).get('recover')!;
  assert.deepEqual(await f.service.redeemLink({ bookingId, proof }), { id: bookingId, token: bearer });
  await assert.rejects(f.service.redeemLink({ bookingId: otherId, proof }), { code: 'BOOKING_ACCESS_UNAVAILABLE' });
  const cookie = cookiePair(issueBookingBrowserCookie({ bookingId, secret, now: instant }));
  await assert.rejects(f.service.redeemLink({ bookingId, proof: cookie.split('=')[1] }), { code: 'BOOKING_ACCESS_UNAVAILABLE' });
  assert.deepEqual(await f.service.redeemBrowserAccess({ bookingId, cookieHeader: cookie }), { id: bookingId, token: bearer });
  f.tick(BOOKING_MAIL_ACCESS_TTL_MS);
  await assert.rejects(f.service.redeemLink({ bookingId, proof }), { code: 'BOOKING_ACCESS_UNAVAILABLE' });
  assert.deepEqual(await f.service.redeemBrowserAccess({ bookingId, cookieHeader: cookie }), { id: bookingId, token: bearer });
  f.revoke();
  await assert.rejects(f.service.redeemBrowserAccess({ bookingId, cookieHeader: cookie }), { code: 'BOOKING_ACCESS_UNAVAILABLE' });
});

test('invalid proof never consults the booking resolver and queue infrastructure failure does not expose existence', async () => {
  const f = fixture();
  await assert.rejects(f.service.redeemBrowserAccess({ bookingId, cookieHeader: '' }), { code: 'BOOKING_ACCESS_UNAVAILABLE' });
  await assert.rejects(f.service.redeemLink({ bookingId, proof: 'not-proof' }), { code: 'BOOKING_ACCESS_UNAVAILABLE' });
  assert.deepEqual(f.resolverCalls, []);
  f.store.addMail = async () => { throw new Error('SYNTHETIC_PRIVATE_FAILURE'); };
  assert.deepEqual(await f.service.requestAccess(request(), { rateKey: 'synthetic_source_123' }), { status: 'accepted' });
});

test('six languages describe conditional delivery and the bounded browser recovery without claiming delivery', () => {
  const results = ['de', 'en', 'es', 'fr', 'it', 'pt'].map(locale => accessRecoveryText(locale, 'accepted'));
  assert.equal(new Set(results).size, 6);
  assert.ok(results.every(copy => copy.includes('15')));
  assert.match(accessRecoveryText('es', 'accepted'), /^Si la referencia y el correo/);
  assert.match(accessRecoveryText('de', 'hint'), /sieben Tage/);
});

test('recovery access uses a valid reviewed expiry-bearing email snapshot in all six selected languages', async () => {
  for (const locale of ['de', 'en', 'es', 'fr', 'it', 'pt']) {
    const f = fixture();
    await f.service.requestAccess(request({ language: locale }), { rateKey: 'synthetic_source_language' });
    assert.equal(f.jobs.size, 1);
    const job = [...f.jobs.values()][0], message = prepareCustomerEnvelope(job.notification, job.authorisedLinks, 'https://kraken.example');
    assert.equal(job.notification.languageSnapshot.language, locale);
    assert.equal(job.notification.renderData.expiresAt, new Date(instant + BOOKING_MAIL_ACCESS_TTL_MS).toISOString());
    assert.ok(message.text.includes(job.authorisedLinks.primary));
    assert.match(message.subject, /^\[TEST\]/);
    assert.ok(new URL(job.authorisedLinks.primary).pathname === (locale === 'de' ? '/offerte' : `/${locale}/offerte`));
  }
});

test('local HTTP stub: closed tab loses session token, persistent cookie recovers latest booking without extending expiry or depending on email', async t => {
  const f = fixture(), app = express(); app.use(express.json());
  app.use((req, res, next) => { res.set({ 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' }); if (req.method === 'POST' && (req.get('Origin') !== 'https://kraken.example' || !req.get('Cookie')?.includes('capture=valid'))) return res.status(403).json({ code: 'SESSION_REQUIRED' }); next(); });
  app.post('/api/booking/test-create', (_req, res) => { res.set('Set-Cookie', issueBookingBrowserCookie({ bookingId, secret, now: f.now() })); res.status(201).json({ bookingId, publicToken: bearer, email: { request: 'failed' } }); });
  app.post('/api/booking/browser-access', async (req, res) => { try { res.json(await f.service.redeemBrowserAccess({ bookingId: req.body.bookingId, cookieHeader: req.get('Cookie') || '' })); } catch { res.status(404).json({ code: 'BOOKING_ACCESS_UNAVAILABLE' }); } });
  app.post('/api/booking/access-requests', async (req, res) => { try { res.status(202).json(await f.service.requestAccess(req.body, { rateKey: 'synthetic_source_http' })); } catch { res.status(400).json({ code: 'INVALID_ACCESS_REQUEST' }); } });
  app.post('/api/booking/link-access', async (req, res) => { try { const access = await f.service.redeemLink(req.body); res.set('Set-Cookie', issueBookingBrowserCookie({ bookingId: access.id, secret, now: f.now() })); res.json(access); } catch { res.status(404).json({ code: 'BOOKING_ACCESS_UNAVAILABLE' }); } });
  const server = createServer(app); await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve)); t.after(() => new Promise<void>(resolve => server.close(() => resolve())));
  const origin = `http://127.0.0.1:${(server.address() as any).port}`;
  let cookie = 'capture=valid';
  const post = (path: string, body: unknown, cookieHeader = cookie, trusted = true) => fetch(origin + path, { method: 'POST', headers: { Origin: trusted ? 'https://kraken.example' : 'https://attacker.example', Cookie: cookieHeader, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const created = await post('/api/booking/test-create', {}), createdBody = await created.json();
  assert.equal(created.status, 201); assert.equal(createdBody.email.request, 'failed');
  const persistent = created.headers.get('set-cookie')!; cookie += `; ${cookiePair(persistent)}`;
  const tabSession = new Map([['bookingToken', createdBody.publicToken]]); tabSession.clear();
  assert.equal(tabSession.size, 0, 'simulates closing the tab; no session capability remains');
  f.tick(60_000);
  const restored = await post('/api/booking/browser-access', { bookingId });
  assert.equal(restored.status, 200); assert.deepEqual(await restored.json(), { id: bookingId, token: bearer });
  assert.equal(restored.headers.get('set-cookie'), null, 'recovery/polling never refreshes the seven-day deadline');
  assert.equal((await post('/api/booking/browser-access', { bookingId }, 'capture=valid')).status, 404);
  assert.equal((await post('/api/booking/browser-access', { bookingId }, cookie, false)).status, 403);
  const missing = await post('/api/booking/access-requests', request({ reference: 'K-2026-XXXXXXXX' }));
  const matched = await post('/api/booking/access-requests', request());
  assert.equal(missing.status, 202); assert.equal(matched.status, 202); assert.deepEqual(await missing.json(), await matched.json());
  const job = [...f.jobs.values()][0], proof = new URLSearchParams(new URL(job.authorisedLinks.primary).hash.slice(1)).get('recover');
  const anotherBrowser = await post('/api/booking/link-access', { bookingId, proof }, 'capture=valid');
  assert.equal(anotherBrowser.status, 200); assert.deepEqual(await anotherBrowser.json(), { id: bookingId, token: bearer });
  assert.match(anotherBrowser.headers.get('set-cookie')!, /HttpOnly; Secure; SameSite=Strict/);
  f.tick(BOOKING_BROWSER_TTL_MS);
  assert.equal((await post('/api/booking/browser-access', { bookingId })).status, 404);
  assert.equal(f.dispatched.length, 1, 'only local stub dispatch was used; no email provider was called');
});
