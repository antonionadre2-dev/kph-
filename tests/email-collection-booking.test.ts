import test from 'node:test';
import assert from 'node:assert/strict';
import { createBookingService, validateBookingRequest, BOOKING_TERMS_VERSION } from '../server/booking.ts';
import { BookingError } from '../server/booking-store.ts';
import { calculatePrice, defaultSelection, PRICING_VERSION } from '../src/booking/pricing.ts';
import { createCustomerNotification } from '../server/customer-notifications.ts';

const start = Date.parse('2026-11-25T09:00:00Z');
const clone = <T>(value: T): T => structuredClone(value);
const origin = 'https://kraken.example';
const supported = ['de', 'en', 'es', 'fr', 'it', 'pt'];

/** Durable state survives worker replacement; no Firebase or provider is contacted. */
function durableStore() {
  const records = new Map<string, any>(), keys = new Map<string, any>(), mail = new Map<string, any>();
  const preparedWrites: any[] = [];
  function record(id: string) {
    const value = records.get(id);
    if (!value) throw new BookingError('BOOKING_NOT_FOUND', 404);
    return clone(value);
  }
  return {
    records, mail, preparedWrites,
    async get(id: string) { return records.has(id) ? record(id) : null; },
    async create(key: string, fingerprint: string, value: any, job: any) {
      const previous = keys.get(key);
      if (previous) {
        if (previous.fingerprint !== fingerprint) throw new BookingError('IDEMPOTENCY_CONFLICT', 409);
        return record(previous.id);
      }
      records.set(value.bookingId, clone(value));
      keys.set(key, { id: value.bookingId, fingerprint });
      if (job) mail.set(job.id, clone(job));
      return record(value.bookingId);
    },
    async mutate(id: string, transform: (current: any) => any) {
      const current = record(id), next = transform(current) || current;
      records.set(id, clone(next));
      return record(id);
    },
    async mutateWithMail(id: string, transform: (current: any) => any, makeJobs: (next: any) => any) {
      const next = transform(record(id));
      const made = makeJobs(clone(next));
      const jobs = Array.isArray(made) ? made : made ? [made] : [];
      // Transform and notifications are evaluated before committing either side.
      const staged: any[] = jobs.filter((job: any) => !mail.has(job.id)).map((job: any) => clone(job));
      records.set(id, clone(next));
      for (const job of staged) mail.set(job.id, job);
      return record(id);
    },
    async addMail(job: any) {
      if (mail.has(job.id)) return false;
      mail.set(job.id, clone(job)); return true;
    },
    async prepareMail(id: string, envelope: any, preparedAt: number, expiresAt?: number) {
      const job = mail.get(id);
      if (!job || job.status !== 'sending') return null;
      if (job.prepared) return clone(job.prepared);
      Object.assign(job, { prepared: clone(envelope), preparedAt, ...(expiresAt ? { preparedExpiresAt: expiresAt } : {}) });
      preparedWrites.push({ id, preparedAt, envelope: clone(envelope) });
      return clone(job.prepared);
    },
    async updateLanguageAndPending(id: string, snapshot: any, time: number, update: (notification: any) => any) {
      const current = record(id);
      const staged: [string, any][] = [];
      for (const [key, job] of mail) {
        if (job.bookingId === id && job.status === 'queued' && !(job.attempts > 0) && !job.prepared && job.notification) {
          staged.push([key, { ...clone(job), notification: clone(update(clone(job.notification))) }]);
        }
      }
      const next = { ...current, language: snapshot.language, languageSnapshot: clone(snapshot), communicationPreferenceUpdatedAt: time, revision: current.revision + 1 };
      for (const [key, value] of staged) mail.set(key, value);
      records.set(id, clone(next)); return record(id);
    },
    async listDueMail(time: number, limit = 20) {
      return [...mail.values()].filter(job => job.status === 'queued' && job.dueAt <= time)
        .sort((a, b) => a.dueAt - b.dueAt).slice(0, limit).map(clone);
    },
    async claimMail(id: string, time: number) {
      const job = mail.get(id);
      if (!job || job.status !== 'queued' || job.dueAt > time) return null;
      Object.assign(job, { status: 'sending', attempts: (job.attempts || 0) + 1, leaseUntil: time + 60_000 });
      return clone(job);
    },
    async finishMail(id: string, status: string, providerId: string | null, retryAt?: number) {
      const job = mail.get(id);
      if (job?.status !== 'sending') return;
      Object.assign(job, { status, providerId, leaseUntil: null, ...(status === 'queued' && Number.isSafeInteger(retryAt) ? { dueAt: retryAt } : {}) });
    },
    async markStaleMail(time: number) {
      for (const job of mail.values()) if (job.status === 'sending' && job.leaseUntil <= time) job.status = 'delivery_unknown';
    },
    async isEmailSuppressed() { return false; },
    async consumeRate() { return true; },
    async listByEmail(email: string) { return [...records.values()].filter(value => value.customer.email === email).map(clone); },
  };
}

function request(language: any = 'es', overrides: any = {}) {
  const selection = defaultSelection('regular');
  return {
    selection, language,
    customer: { name: 'Synthetic Customer', email: 'client@example.test', phone: '+41770000000', address: 'Teststrasse 1', postalCode: '8200', city: 'Schaffhausen' },
    requestedDate: '2026-11-26', requestedTime: '10:00', notes: '',
    termsAccepted: true, termsVersion: BOOKING_TERMS_VERSION,
    pricingVersion: PRICING_VERSION, acceptedTotalCents: calculatePrice(selection).totalCents,
    idempotencyKey: 'synthetic_collection_request_0001', ...overrides,
  };
}
function scenario(options: { send?: (message: any) => Promise<any> } = {}) {
  const store = durableStore(), sent: any[] = [], calls = { gateways: 0, verifications: 0 };
  let time = start, providerStatus = 'pending';
  const payment = {
    async create(record: any) {
      calls.gateways++;
      assert.ok(record.payment.amountDueNowCents > 0);
      return { id: 71, link: 'https://payment.example.test/synthetic-gateway' };
    },
    async verify() {
      calls.verifications++;
      // A controlled provider adapter response, not a browser redirect or payload.
      return { status: providerStatus, transactionId: 'synthetic-verified-transaction', language: 'de' };
    },
  };
  const send = async (message: any) => {
    const job = [...store.mail.values()].find(row => row.prepared?.idempotencyKey === message.idempotencyKey);
    assert.ok(job?.prepared, 'the envelope must be durable before the provider call');
    assert.deepEqual(message, job.prepared);
    sent.push(clone(message));
    return options.send ? options.send(message) : { id: `synthetic-provider-${sent.length}` };
  };
  const worker = (collection = true, paymentNotifications: boolean | 'default' = true) => createBookingService({
    store: store as any, tokenSecret: 'synthetic-private-token-secret-over-32-characters', origin,
    mode: 'live', payment, sendEmail: send, sender: 'Kraken PFM <kai@krakenpfm.ch>',
    clock: () => time, emailCollectionEnabled: collection,
    ...(paymentNotifications === 'default' ? {} : { paymentNotificationsEnabled: paymentNotifications }),
  });
  return { store, sent, calls, worker, advance(ms: number) { time += ms; }, setProvider(status: string) { providerStatus = status; } };
}
const checkoutInput = (language = 'de') => ({ language, acceptedQuoteRevision: 1, termsAccepted: true, termsVersion: BOOKING_TERMS_VERSION });
const jobsOf = (store: ReturnType<typeof durableStore>, templateId: string) => [...store.mail.values()].filter(job => job.notification?.templateId === templateId);

test('all six selections persist through request, a fresh worker and the verified deposit notification', async () => {
  for (const language of supported) {
    const f = scenario(), service = f.worker();
    const booking = await service.create(request(language));
    const stored = await f.store.get(booking.bookingId), jobs = jobsOf(f.store, 'request_received');
    assert.deepEqual(stored.languageSnapshot, { language, source: 'selected', version: 1 });
    assert.deepEqual(booking.languageSnapshot, stored.languageSnapshot);
    assert.equal(booking.language, language);
    assert.equal(jobs.length, 1);
    assert.deepEqual(jobs[0].notification.languageSnapshot, stored.languageSnapshot);
    assert.equal(jobs[0].notification.recipientEmail, stored.customer.email);
    assert.equal(jobs[0].notification.entityId, booking.bookingId);
    assert.ok(jobs[0].notification.eventId && jobs[0].notification.templateRevision);
    assert.equal(jobsOf(f.store, 'booking_confirmed').length, 0);
    await service.runDue();
    assert.equal(f.sent.length, 1);
    assert.equal(f.sent[0].language, language);
    assert.ok(f.sent[0].html.includes(`<html lang="${language}">`));
    assert.ok(f.sent[0].text.includes(`lang=${language}`));
    await service.confirmAppointment(booking.bookingId, { operatorId: 'synthetic-operator', holdExpiresAt: '2026-11-25T15:00:00Z' });
    await service.checkout(booking.bookingId, booking.publicToken!, checkoutInput(language === 'de' ? 'es' : 'de'));
    f.setProvider('paid');
    await f.worker().reconcile(booking.bookingId);
    await f.worker().runDue();
    const receipts = jobsOf(f.store, 'deposit_received');
    assert.equal(receipts.length, 1);
    assert.equal(receipts[0].prepared.language, language);
    assert.ok(receipts[0].prepared.text.includes(`lang=${language}`));
    assert.ok(f.sent.every(message => message.language === language));
  }
});

test('German first visit followed by a Spanish choice survives checkout locale, closed browser and duplicated callbacks', async () => {
  const f = scenario(), browserSession = f.worker();
  const firstVisitLanguage = 'de', selectedLanguage = 'es';
  assert.notEqual(firstVisitLanguage, selectedLanguage);
  const booking = await browserSession.create(request(selectedLanguage));
  const otherDevice = await f.worker().read(booking.bookingId, booking.publicToken!);
  assert.equal(otherDevice.language, 'es');
  assert.deepEqual(otherDevice.languageSnapshot, { language: 'es', source: 'selected', version: 1 });
  assert.equal(jobsOf(f.store, 'booking_confirmed').length, 0);
  await browserSession.confirmAppointment(booking.bookingId, { operatorId: 'synthetic-operator', holdExpiresAt: '2026-11-25T15:00:00Z' });
  assert.equal((await f.store.get(booking.bookingId)).scheduling.status, 'held');
  assert.equal(jobsOf(f.store, 'booking_confirmed').length, 0);
  await browserSession.checkout(booking.bookingId, booking.publicToken!, checkoutInput('fr'));
  assert.equal((await f.store.get(booking.bookingId)).language, 'es');
  assert.equal(jobsOf(f.store, 'deposit_received').length, 0, 'a success-page visit cannot verify a payment');
  assert.equal(jobsOf(f.store, 'payment_received').length, 0);
  assert.equal(f.calls.verifications, 0);

  // New service instance has no browser language, cookies or in-memory request.
  f.setProvider('paid');
  const serverCallback = f.worker();
  await serverCallback.reconcile(booking.bookingId);
  await serverCallback.runDue();
  const receipt = jobsOf(f.store, 'deposit_received');
  assert.equal(receipt.length, 1);
  assert.equal(jobsOf(f.store, 'payment_received').length, 0, 'the15% deposit is not a fully paid service');
  assert.equal(jobsOf(f.store, 'booking_confirmed').length, 1);
  assert.equal(receipt[0].status, 'sent');
  assert.equal(receipt[0].prepared.language, 'es');
  assert.match(receipt[0].prepared.subject, /Anticipo recibido/);
  assert.ok(receipt[0].prepared.text.includes('Importe pendiente'));
  assert.ok(receipt[0].prepared.text.includes('lang=es'));
  assert.ok(f.sent.every(message => message.language === 'es'));
  const record = await f.store.get(booking.bookingId);
  assert.equal(record.payment.amountPaidCents, record.payment.amountDueNowCents);
  assert.ok(record.payment.remainingBalanceCents > 0);
  const count = f.sent.length, jobs = f.store.mail.size;
  await f.worker().reconcile(booking.bookingId);
  await f.worker().runDue();
  assert.equal(f.sent.length, count);
  assert.equal(f.store.mail.size, jobs);
  assert.equal(jobsOf(f.store, 'deposit_received').length, 1);
  assert.equal(f.calls.gateways, 1);
});

test('missing and invalid new languages fail, while supported regional tags normalize without fallback', async () => {
  for (const value of [undefined, null, '', 'nl', 'es_CR', {}, 7]) {
    const input = request('es'); input.language = value;
    assert.throws(() => validateBookingRequest(input, start), { code: 'INVALID_LANGUAGE' });
  }
  const aliases = { 'de-CH': 'de', 'en-GB': 'en', 'es-ES': 'es', 'fr-CH': 'fr', 'it-CH': 'it', 'pt-BR': 'pt' };
  for (const [value, expected] of Object.entries(aliases)) {
    const f = scenario(), booking = await f.worker().create(request(value));
    assert.equal(booking.language, expected);
    assert.deepEqual(booking.languageSnapshot, { language: expected, source: 'selected', version: 1 });
  }
});

test('collection rollout leaves payment receipts with the existing provider by default', async () => {
  const f = scenario(), service = f.worker(true, 'default');
  const booking = await service.create(request('es'));
  await service.confirmAppointment(booking.bookingId, { operatorId: 'synthetic-operator', holdExpiresAt: '2026-11-25T15:00:00Z' });
  await service.checkout(booking.bookingId, booking.publicToken!, checkoutInput('de'));
  f.setProvider('paid');
  await f.worker(true, 'default').reconcile(booking.bookingId);
  await f.worker(true, 'default').runDue();
  assert.equal((await f.store.get(booking.bookingId)).payment.status, 'paid');
  assert.equal(jobsOf(f.store, 'deposit_received').length, 0);
  assert.equal(jobsOf(f.store, 'payment_received').length, 0);
  assert.equal(f.sent.filter(message => ['deposit_received', 'payment_received'].includes(message.templateId)).length, 0);
  assert.notEqual((await f.store.get(booking.bookingId)).email.receipt, 'queued', 'do not claim a Kraken receipt is queued when that sender is disabled');
});

test('a retry after a definite429 rejection reuses the entire prepared envelope despite later record changes', async () => {
  let rejected = false;
  const f = scenario({ send: async message => {
    if (message.templateId === 'payment_requested' && !rejected) {
      rejected = true;
      throw Object.assign(new Error('synthetic-rate-limit'), { definitelyNotSent: true, retryable: true, retryAfterMs: 15 * 60_000 });
    }
    return { id: 'synthetic-accepted' };
  } });
  const service = f.worker(), booking = await service.create(request('es'));
  await service.runDue();
  await service.confirmAppointment(booking.bookingId, { operatorId: 'synthetic-operator', holdExpiresAt: '2026-11-25T15:00:00Z' });
  await service.checkout(booking.bookingId, booking.publicToken!, checkoutInput('de'));
  await service.runDue();
  const originalJob = jobsOf(f.store, 'payment_requested')[0], prepared = clone(originalJob.prepared);
  assert.equal(originalJob.status, 'queued');
  assert.equal(originalJob.attempts, 1);
  assert.equal(prepared.language, 'es');
  await f.store.mutate(booking.bookingId, current => ({ ...current, language: 'de', customer: { ...current.customer, email: 'changed@example.test', city: 'Changed City' }, quote: { ...current.quote, totalCents: 999_900 } }));
  f.advance(16 * 60_000);
  await f.worker().runDue();
  const attempts = f.sent.filter(message => message.templateId === 'payment_requested');
  assert.equal(attempts.length, 2);
  assert.deepEqual(attempts[0], prepared);
  assert.deepEqual(attempts[1], prepared);
  assert.equal(attempts[1].to, 'client@example.test');
  assert.equal(jobsOf(f.store, 'payment_requested')[0].status, 'sent');
  assert.equal(f.store.preparedWrites.filter(write => write.id === originalJob.id).length, 1);
});

test('an explicit authenticated preference changes only unattempted notifications and leaves issued messages immutable', async () => {
  const f = scenario(), service = f.worker(), booking = await service.create(request('es'));
  const first = jobsOf(f.store, 'request_received')[0];
  await assert.rejects(service.changeEmailLanguage(booking.bookingId, 'wrong-access-capability', { language: 'en' }), { code: 'BOOKING_NOT_FOUND' });
  await assert.rejects(service.changeEmailLanguage(booking.bookingId, booking.publicToken!, { language: 'nl' }), { code: 'INVALID_LANGUAGE' });
  const updated = await service.changeEmailLanguage(booking.bookingId, booking.publicToken!, { language: 'en' });
  assert.equal(updated.language, 'en');
  assert.equal(f.store.mail.get(first.id).notification.languageSnapshot.language, 'en');
  await service.runDue();
  const emitted = clone(f.store.mail.get(first.id));
  assert.equal(emitted.prepared.language, 'en');
  await service.changeEmailLanguage(booking.bookingId, booking.publicToken!, { language: 'fr' });
  assert.deepEqual(f.store.mail.get(first.id), emitted);
  assert.equal((await f.store.get(booking.bookingId)).language, 'fr');
  await service.confirmAppointment(booking.bookingId, { operatorId: 'synthetic-operator', holdExpiresAt: '2026-11-25T15:00:00Z' });
  await service.checkout(booking.bookingId, booking.publicToken!, checkoutInput('de'));
  assert.equal(jobsOf(f.store, 'payment_requested')[0].notification.languageSnapshot.language, 'fr');
});

test('attempted queued notifications keep their prepared language during a later preference change', async () => {
  let rejectOnce = true;
  const f = scenario({ send: async () => {
    if (rejectOnce) { rejectOnce = false; throw Object.assign(new Error('synthetic-quota'), { definitelyNotSent: true, retryable: true }); }
    return { id: 'synthetic-provider' };
  } });
  const service = f.worker(), booking = await service.create(request('es'));
  await service.runDue();
  const first = clone(jobsOf(f.store, 'request_received')[0]);
  assert.equal(first.status, 'queued');
  assert.equal(first.attempts, 1);
  await service.changeEmailLanguage(booking.bookingId, booking.publicToken!, { language: 'en' });
  assert.deepEqual(jobsOf(f.store, 'request_received')[0], first);
  f.advance(16 * 60_000);
  await f.worker().runDue();
  assert.equal(f.sent.length, 2);
  assert.deepEqual(f.sent[0], f.sent[1]);
  assert.equal(f.sent[1].language, 'es');
});

test('the persisted notification snapshot wins when raw booking language or customer fields later differ', async () => {
  const f = scenario(), service = f.worker(), booking = await service.create(request('es'));
  const snapshot = clone(jobsOf(f.store, 'request_received')[0].notification);
  await f.store.mutate(booking.bookingId, record => ({ ...record, language: 'de', languageSnapshot: { language: 'de', source: 'selected', version: 1 }, customer: { ...record.customer, name: 'Changed Admin Name', email: 'other@example.test' } }));
  await f.worker().runDue();
  assert.equal(f.sent[0].language, 'es');
  assert.equal(f.sent[0].to, snapshot.recipientEmail);
  assert.ok(f.sent[0].text.includes('Synthetic Customer'));
  assert.ok(!f.sent[0].text.includes('Changed Admin Name'));
});

test('logical event identity is stable across locale changes but isolated by recipient and template', () => {
  const input = { templateId: 'request_received', eventId: 'synthetic-event-1', entityId: 'synthetic-booking-1', email: 'client@example.test', languageSnapshot: { language: 'es', source: 'selected', version: 1 }, renderData: { service: 'regular', customer: {} } };
  const first = createCustomerNotification(input);
  assert.equal(createCustomerNotification({ ...input, languageSnapshot: { language: 'fr', source: 'selected', version: 1 } }).id, first.id);
  assert.notEqual(createCustomerNotification({ ...input, email: 'other@example.test' }).id, first.id);
  assert.notEqual(createCustomerNotification({ ...input, templateId: 'booking_confirmed' }).id, first.id);
});

test('a concurrent verified paid or refund result during preparation cancels the now-ineligible notification before transport', async () => {
  for (const race of ['pending-paid', 'receipt-refunded']) {
    const f = scenario(), service = f.worker(), booking = await service.create(request('es'));
    await service.confirmAppointment(booking.bookingId, { operatorId: 'synthetic-operator', holdExpiresAt: '2026-11-25T15:00:00Z' });
    await service.checkout(booking.bookingId, booking.publicToken!, checkoutInput('de'));
    const target = race === 'pending-paid' ? 'payment_pending' : 'deposit_received';
    const originalPrepare = f.store.prepareMail.bind(f.store);
    let raced = false;
    f.store.prepareMail = async (id: string, envelope: any, preparedAt: number, expiresAt?: number) => {
      const prepared = await originalPrepare(id, envelope, preparedAt, expiresAt);
      if (!raced && envelope.templateId === target) {
        raced = true;
        // Another authenticated provider callback commits a newer fact after
        // rendering/persistence but before the outer worker's provider call.
        f.setProvider(race === 'pending-paid' ? 'paid' : 'refunded');
        await f.worker().reconcile(booking.bookingId);
      }
      return prepared;
    };
    if (race === 'pending-paid') {
      f.advance(16 * 60_000);
      await service.reconcile(booking.bookingId);
      assert.equal(jobsOf(f.store, target).length, 1);
      await service.runDue();
    } else {
      f.setProvider('paid');
      await service.reconcile(booking.bookingId);
      await service.runDue();
    }
    assert.equal(raced, true, `${race}: ${target} must reach durable preparation before the simulated callback`);
    assert.equal(jobsOf(f.store, target)[0].status, 'cancelled');
    assert.ok(jobsOf(f.store, target)[0].prepared, 'the race occurred after preparation');
    assert.equal(f.sent.filter(message => message.templateId === target).length, 0);
    const actual = await f.store.get(booking.bookingId);
    assert.equal(actual.payment.status, race === 'pending-paid' ? 'paid' : 'refunded');
    if (race === 'receipt-refunded') {
      assert.equal(f.sent.filter(message => message.templateId === 'booking_confirmed').length, 0);
      assert.equal(jobsOf(f.store, 'booking_confirmed')[0].status, 'cancelled');
    }
  }
});
