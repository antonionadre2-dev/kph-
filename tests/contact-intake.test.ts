import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import express from 'express';
import { createContactIntakeHandlers, verifyContactChallenge } from '../server/contact-intake.ts';
import { ContactIntakeError, type ContactIntakeStore, type ContactJob, type ContactRecord } from '../server/contact-intake-store.ts';
import { validateContactFields } from '../src/contact/intake-contract.ts';
import { acceptedContactResponse, contactRetryIdentity } from '../src/contact/intake-client.ts';
import { renderContactAcknowledgement } from '../server/contact-intake-email.ts';

const fields = { name: 'Ana Test', email: 'ana@example.test', phone: '', channel: 'email', service: 'end', postalCode: '8203', message: 'This is an isolated test enquiry.' };
const env = { CONTACT_INTAKE_ENABLED: 'true', CONTACT_INTAKE_SECRET: 'x'.repeat(48), CONTACT_TURNSTILE_SITE_KEY: 'public-site-key-test', CONTACT_TURNSTILE_SECRET_KEY: 'private-challenge-test', CRON_SECRET: 'c'.repeat(40), NODE_ENV: 'production' };
const payload = (extra: Record<string, unknown> = {}) => ({ ...fields, language: 'es', website: '', turnstileToken: 'challenge-token', idempotencyKey: randomUUID(), ...extra });
function memoryStore() {
  const keys = new Map<string, { fingerprint: string; record: ContactRecord }>(), records = new Map<string, ContactRecord>();
  const jobs = new Map<string, ContactJob>(), rates = new Map<string, { count: number; until: number }>();
  let failBefore = false, failAfter = false;
  const store: ContactIntakeStore = {
    async previous(key, fingerprint) { const value = keys.get(key); if (!value) return null; if (value.fingerprint !== fingerprint) throw new ContactIntakeError('idempotency_conflict', 409); return value.record; },
    async consumeRate(key, now, window, limit) { const previous = rates.get(key), value = previous && previous.until > now ? { ...previous, count: previous.count + 1 } : { count: 1, until: now + window }; rates.set(key, value); return value.count <= limit; },
    async create(key, fingerprint, record, job) {
      const old = keys.get(key); if (old) { if (old.fingerprint !== fingerprint) throw new ContactIntakeError('idempotency_conflict', 409); return old.record; }
      if (failBefore) throw new Error('Provider unavailable');
      keys.set(key, { fingerprint, record }); records.set(record.id, record); if (job) jobs.set(job.id, job);
      if (failAfter) { failAfter = false; throw new Error('Response lost after commit'); } return record;
    },
    async due(now) { return [...jobs.values()].filter(job => job.status === 'queued' && job.dueAt <= now); },
    async claim(id, now) { const job = jobs.get(id); if (!job || job.status !== 'queued') return null; const claimed = { ...job, status: 'sending', attempts: job.attempts + 1, leaseUntil: now + 60000 }; jobs.set(id, claimed); return claimed; },
    async finish(id, status, extra = {}) { const job = jobs.get(id); if (job?.status === 'sending') jobs.set(id, { ...job, ...extra, status }); },
  };
  return { store, records, jobs, rates, failBefore() { failBefore = true; }, failAfter() { failAfter = true; } };
}
async function withApi(options: Parameters<typeof createContactIntakeHandlers>[0], run: (call: (body?: unknown, headers?: Record<string, string>, endpoint?: string) => Promise<{ response: Response; body: any }>) => Promise<void>) {
  const app = express(), handlers = createContactIntakeHandlers(options);
  app.use(express.json({ limit: '24kb' })); app.get('/config', handlers.config); app.post('/messages', handlers.message); app.post('/maintenance', handlers.maintenance);
  const server = createServer(app); await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    await run(async (body, headers = {}, endpoint = body === undefined ? '/config' : '/messages') => {
      const response = await fetch('http://127.0.0.1:' + (server.address() as any).port + endpoint, { method: body === undefined ? 'GET' : 'POST', headers: { Origin: 'https://krakenpfm.ch', 'Content-Type': 'application/json', ...headers }, ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }) });
      return { response, body: await response.json().catch(() => null) };
    });
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
}

test('seven fields are validated; an omitted telephone never becomes a required field', () => {
  for (const channel of ['email', 'phone', 'whatsapp']) assert.deepEqual(validateContactFields({ ...fields, channel }), {});
  assert.equal(validateContactFields({ ...fields, phone: '<script>' }).phone, 'invalidPhone');
  assert.equal(validateContactFields({ ...fields, postalCode: 'ABCD' }).postalCode, 'invalidPostcode');
  assert.equal(validateContactFields({ ...fields, postalCode: '0000' }).postalCode, 'invalidPostcode');
  assert.equal(validateContactFields({ ...fields, message: 'short' }).message, 'invalidMessage');
  assert.equal(validateContactFields({ ...fields, message: 'a'.repeat(4001) }).message, 'invalidMessage');
  assert.equal(validateContactFields({ ...fields, service: 'gardening' }).service, 'invalidService');
  assert.equal(validateContactFields({ ...fields, channel: 'sms' }).channel, 'invalidChannel');
});

test('same-content retries and language changes retain their opaque identity; a generic 200 is never acceptance', () => {
  let generated = 0;
  const first = contactRetryIdentity(null, fields, 'es', () => { generated++; return randomUUID(); });
  assert.equal(contactRetryIdentity(first, { ...fields, name: '  Ana Test  ' }, 'fr'), first);
  assert.equal(generated, 1); assert.equal(first.language, 'es');
  assert.notEqual(contactRetryIdentity(first, { ...fields, message: fields.message + ' More.' }, 'fr').key, first.key);
  for (const body of [{ ok: true }, { accepted: true }, { accepted: true, reference: '<script>' }, { reference: 'KCT-' + 'A'.repeat(20) }]) assert.equal(acceptedContactResponse({ ok: true }, body), null);
  assert.equal(acceptedContactResponse({ ok: false }, { accepted: true, reference: 'KCT-' + 'A'.repeat(20) }), null);
});

test('unconfigured intake is unavailable and exposes no private credentials', async () => {
  await withApi({ env: {} }, async call => {
    const config = await call(); assert.deepEqual(config.body, { available: false, challenge: null });
    assert.match(config.response.headers.get('cache-control')!, /no-store/);
    const result = await call(payload()); assert.equal(result.response.status, 503); assert.equal(result.body.accepted, false); assert.equal(result.body.reference, undefined);
  });
});

test('durable registration returns a real reference, preserves requested language and deduplicates across handler instances', async () => {
  const memory = memoryStore(); let verified = 0;
  const body = payload({ channel: 'whatsapp' });
  const options = { env, store: memory.store, verifyChallenge: async () => { verified++; return true; } };
  let reference: string;
  await withApi(options, async call => {
    const result = await call(body); assert.equal(result.response.status, 201); assert.match(result.body.reference, /^KCT-[A-F0-9]{20}$/); reference = result.body.reference;
    assert.equal(memory.records.size, 1); const record = [...memory.records.values()][0];
    assert.equal(record.channel, 'whatsapp'); assert.equal(record.effectiveChannel, 'email'); assert.equal(record.language, 'es');
    assert.match(record.subject, /8203/); assert.match(record.subject, /WhatsApp/); assert.match(record.subject, /→/);
    assert.equal(memory.jobs.size, 0, 'No email is invented without an explicit configured acknowledgement');
  });
  await withApi(options, async call => {
    const result = await call({ ...body, language: 'fr', turnstileToken: '' }); assert.equal(result.response.status, 200); assert.equal(result.body.reference, reference!);
    assert.equal(verified, 1); assert.equal(memory.records.size, 1);
    const changed = await call({ ...body, message: body.message + ' Changed.' }); assert.equal(changed.response.status, 409);
  });
});

test('a failed write is never success; a lost response after commit retries to the original durable record', async () => {
  const before = memoryStore(); before.failBefore();
  await withApi({ env, store: before.store, verifyChallenge: async () => true }, async call => {
    const result = await call(payload()); assert.equal(result.response.status, 503); assert.equal(result.body.accepted, false); assert.equal(before.records.size, 0);
  });
  const after = memoryStore(), body = payload(); after.failAfter();
  await withApi({ env, store: after.store, verifyChallenge: async () => true }, async call => {
    const lost = await call(body); assert.equal(lost.response.status, 503); assert.equal(after.records.size, 1);
    const retry = await call(body); assert.equal(retry.response.status, 200); assert.equal(retry.body.reference, [...after.records.values()][0].reference); assert.equal(after.records.size, 1);
  });
});

test('origin, honeypot, whitelist, token and durable frequency checks reject hostile requests', async () => {
  const memory = memoryStore(); let verified = 0;
  await withApi({ env, store: memory.store, verifyChallenge: async ({ token }) => { verified++; return token === 'valid'; } }, async call => {
    assert.equal((await call(payload(), { Origin: 'https://attacker.example' })).response.status, 403);
    assert.equal((await call(payload({ website: 'spam' }))).response.status, 400);
    assert.equal((await call(payload({ subject: 'Injected subject' }))).response.status, 400);
    assert.equal((await call(payload({ phone: {} }))).response.status, 400);
    assert.equal((await call(payload())).response.status, 403);
    for (let index = 0; index < 9; index++) assert.equal((await call(payload({ email: `test${index}@example.test`, turnstileToken: 'valid' }))).response.status, 201);
    const limited = await call(payload({ turnstileToken: 'valid' })); assert.equal(limited.response.status, 429); assert.equal(limited.response.headers.get('retry-after'), '600');
    assert.equal(memory.records.size, 9); assert.equal(verified, 10);
  });
});

test('Cloudflare verification checks its actual success, hostname, action and token freshness', async () => {
  const now = Date.now(), challenge = { token: 'valid', hostname: 'krakenpfm.ch', idempotencyKey: randomUUID() };
  const result = { success: true, hostname: challenge.hostname, action: 'kraken_contact', challenge_ts: new Date(now).toISOString() };
  let seen: any;
  const verify = (body: object) => verifyContactChallenge(challenge, 'server-secret', (async (url, options) => { assert.equal(url, 'https://challenges.cloudflare.com/turnstile/v0/siteverify'); seen = JSON.parse(options!.body as string); return Response.json(body); }) as typeof fetch, now);
  assert.equal(await verify(result), true); assert.equal(seen.idempotency_key, challenge.idempotencyKey);
  for (const bad of [{ ...result, success: false }, { ...result, hostname: 'other.example' }, { ...result, action: 'login' }, { ...result, challenge_ts: new Date(now - 400000).toISOString() }, { ...result, challenge_ts: 'invalid' }]) assert.equal(await verify(bad), false);
});

test('acknowledgement jobs are durable before provider use and do not alter registration/payment state', async () => {
  const memory = memoryStore(); let sent = 0;
  const mailEnv = { ...env, CONTACT_ACKNOWLEDGEMENT_ENABLED: 'true', RESEND_API_KEY: 'server-only-test', BOOKING_EMAIL_FROM: 'Kraken <kai@example.test>' };
  const body = payload();
  await withApi({ env: mailEnv, store: memory.store, verifyChallenge: async () => true, sendEmail: async message => { sent++; assert.equal(message.to, body.email); assert.match(message.idempotencyKey, /^kraken-contact:/); return { id: 'provider-test-id' }; } }, async call => {
    const accepted = await call(body); assert.equal(accepted.response.status, 201); assert.equal(sent, 0); assert.equal(memory.jobs.size, 1);
    await call(body); assert.equal(memory.jobs.size, 1);
    assert.equal((await call({}, {}, '/maintenance')).response.status, 403);
    const drained = await call({}, { Authorization: 'Bearer ' + env.CRON_SECRET }, '/maintenance'); assert.equal(drained.response.status, 200); assert.equal(sent, 1);
    await call({}, { Authorization: 'Bearer ' + env.CRON_SECRET }, '/maintenance'); assert.equal(sent, 1);
    assert.equal([...memory.jobs.values()][0].status, 'sent');
    const record = [...memory.records.values()][0]; assert.equal(record.status, 'new'); assert.equal((record as any).booking, undefined);
    for (const language of ['de', 'en', 'es', 'fr', 'it', 'pt']) {
      const email = renderContactAcknowledgement({ ...record, language }, 'Kraken <kai@example.test>');
      assert.equal((email.headers as any)['Content-Language'], language); assert.match(email.html as string, new RegExp('<html lang="' + language + '"'));
      assert.doesNotMatch(email.text as string, /\?lang=/);
      assert.ok((email.text as string).includes('\n\n'), 'Plain-text email contains real paragraph breaks');
      assert.match(email.html as string, /<img[^>]+kraken-emails\/assets\/kraken-logo\.png/);
    }
  });
});

test('ambiguous email results stay unknown and are never automatically resent', async () => {
  const memory = memoryStore(); let attempted = 0;
  await withApi({ env: { ...env, CONTACT_ACKNOWLEDGEMENT_ENABLED: 'true', RESEND_API_KEY: 'test', BOOKING_EMAIL_FROM: 'kai@example.test' }, store: memory.store, verifyChallenge: async () => true, sendEmail: async () => { attempted++; throw new Error('Provider timeout'); } }, async call => {
    await call(payload());
    await call({}, { Authorization: 'Bearer ' + env.CRON_SECRET }, '/maintenance');
    await call({}, { Authorization: 'Bearer ' + env.CRON_SECRET }, '/maintenance');
    assert.equal(attempted, 1); assert.equal([...memory.jobs.values()][0].status, 'delivery_unknown');
  });
});
