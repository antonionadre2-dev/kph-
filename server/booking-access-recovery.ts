import crypto from 'node:crypto';
import { BookingError } from './booking-store.ts';
import { createCustomerNotification, prepareCustomerEnvelope, selectedEmailSnapshot } from './customer-notifications.ts';
import { publicHref } from '../src/routing/site-paths.ts';

export const BOOKING_BROWSER_COOKIE = '__Secure-kraken_booking_access';
export const BOOKING_BROWSER_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const BOOKING_MAIL_ACCESS_TTL_MS = 15 * 60 * 1000;
const safeId = /^[A-Za-z0-9_-]{20,128}$/;
const locales = new Set(['de', 'en', 'es', 'fr', 'it', 'pt']);
type Access = { id: string; token: string };
type Proof = { id: string; issuedAt: number; expiresAt: number };
type ProofOptions = { bookingId: string; secret: string; now?: number; ttlMs?: number };
const equal = (a: string, b: string) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

function sign(encoded: string, secret: string, purpose: 'browser' | 'mail'): string {
  if (typeof secret !== 'string' || secret.length < 32) throw new Error('BOOKING_ACCESS_NOT_CONFIGURED');
  return crypto.createHmac('sha256', secret).update(`kraken-booking-${purpose}-access-v1:${encoded}`).digest('base64url');
}
function issueProof({ bookingId, secret, now = Date.now(), ttlMs }: ProofOptions, purpose: 'browser' | 'mail', maximum: number): string {
  const ttl = ttlMs === undefined ? maximum : Math.min(ttlMs, maximum);
  if (!safeId.test(bookingId) || !Number.isSafeInteger(now) || !Number.isSafeInteger(ttl) || ttl < 1000) throw new Error('INVALID_BOOKING_ACCESS');
  const encoded = Buffer.from(JSON.stringify({ id: bookingId, issuedAt: now, expiresAt: now + ttl })).toString('base64url');
  return `${encoded}.${sign(encoded, secret, purpose)}`;
}
function verifyProof(value: unknown, bookingId: unknown, secret: string, now: number, purpose: 'browser' | 'mail', maximum: number): Proof | null {
  if (typeof value !== 'string' || value.length > 1024 || typeof bookingId !== 'string' || !safeId.test(bookingId) || !Number.isSafeInteger(now)) return null;
  const parts = /^([A-Za-z0-9_-]{20,768})\.([A-Za-z0-9_-]{43})$/.exec(value);
  if (!parts) return null;
  try {
    if (!equal(parts[2], sign(parts[1], secret, purpose))) return null;
    const proof = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    if (!proof || Object.keys(proof).sort().join(',') !== 'expiresAt,id,issuedAt' || proof.id !== bookingId || !Number.isSafeInteger(proof.issuedAt) || !Number.isSafeInteger(proof.expiresAt) || proof.issuedAt > now + 30_000 || proof.expiresAt <= now || proof.expiresAt <= proof.issuedAt || proof.expiresAt - proof.issuedAt > maximum) return null;
    return proof;
  } catch { return null; }
}

/** Issue only on creation or explicit, authenticated email-link establishment; never on polling. */
export function issueBookingBrowserCookie(options: ProofOptions): string {
  const now = options.now ?? Date.now();
  const ttl = Math.min(options.ttlMs ?? BOOKING_BROWSER_TTL_MS, BOOKING_BROWSER_TTL_MS);
  const value = issueProof({ ...options, now, ttlMs: ttl }, 'browser', BOOKING_BROWSER_TTL_MS);
  return `${BOOKING_BROWSER_COOKIE}=${value}; Max-Age=${Math.floor(ttl / 1000)}; Expires=${new Date(now + ttl).toUTCString()}; Path=/api/booking; HttpOnly; Secure; SameSite=Strict`;
}

/** No refresh, browser fingerprint, customer data or payment facts are accepted from this cookie. */
export function redeemBookingBrowserCookie({ cookieHeader, bookingId, secret, now = Date.now() }: { cookieHeader: string; bookingId: string; secret: string; now?: number }): boolean {
  if (typeof cookieHeader !== 'string' || cookieHeader.length > 16_384) return false;
  const values = cookieHeader.split(';').map(part => part.trim()).filter(part => part.startsWith(`${BOOKING_BROWSER_COOKIE}=`));
  if (values.length !== 1) return false;
  return Boolean(verifyProof(values[0].slice(BOOKING_BROWSER_COOKIE.length + 1), bookingId, secret, now, 'browser', BOOKING_BROWSER_TTL_MS));
}

type RecoveryStore = {
  findByReferenceEmail: (reference: string, email: string) => Promise<any | null>;
  consumeRate: (key: string, now: number, windowMs: number, limit: number) => Promise<boolean>;
  isEmailSuppressed: (email: string) => Promise<boolean>;
  addMail: (job: any) => Promise<unknown>;
};
type RecoveryOptions = {
  secret: string; origin: string; store: RecoveryStore;
  resolveBookingAccess: (id: string) => Promise<Access | null>;
  clock?: () => number;
  dispatchMail?: (jobId: string) => Promise<unknown>;
};

/** Reference/email identifies a recipient only. Proof is sent to that mailbox, never returned here. */
export function createBookingAccessRecovery({ secret, origin, store, resolveBookingAccess, clock = Date.now, dispatchMail }: RecoveryOptions) {
  const base = new URL(origin);
  if (base.protocol !== 'https:' || base.origin !== origin || secret.length < 32) throw new Error('BOOKING_ACCESS_NOT_CONFIGURED');
  const keyed = (value: string) => crypto.createHmac('sha256', secret).update(`kraken-access-rate-v1:${value}`).digest('hex');
  const accepted = () => ({ status: 'accepted' as const });
  async function resolve(id: string): Promise<Access> {
    const result = await resolveBookingAccess(id).catch(() => null);
    if (!result || result.id !== id || typeof result.token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(result.token)) throw new BookingError('BOOKING_ACCESS_UNAVAILABLE', 404);
    return result;
  }
  return {
    async requestAccess(input: unknown, { rateKey }: { rateKey: string }): Promise<{ status: 'accepted' }> {
      const value = input as Record<string, unknown>;
      if (!value || typeof value !== 'object' || Array.isArray(value) || typeof value.reference !== 'string' || !/^K-\d{4}-[A-Za-z0-9_-]{8}$/.test(value.reference.trim()) || typeof value.email !== 'string' || value.email.length > 254 || !/^[^\s@<>(),;]+@[^\s@<>(),;]+\.[^\s@<>(),;]+$/.test(value.email.trim()) || typeof value.language !== 'string' || !locales.has(value.language) || typeof value.idempotencyKey !== 'string' || !/^[A-Za-z0-9_-]{16,128}$/.test(value.idempotencyKey) || typeof rateKey !== 'string' || rateKey.length < 8 || rateKey.length > 512) throw new BookingError('INVALID_ACCESS_REQUEST', 400);
      const reference = value.reference.trim().toUpperCase(), email = value.email.trim().toLowerCase(), now = clock();
      // Every bucket is consumed before lookup, even for an unknown or suppressed recipient.
      const permitted = await Promise.all([
        store.consumeRate(`access-origin:${keyed(rateKey)}`, now, 60 * 60 * 1000, 20),
        store.consumeRate(`access-email-hour:${keyed(email)}`, now, 60 * 60 * 1000, 3),
        store.consumeRate(`access-email-day:${keyed(email)}`, now, 24 * 60 * 60 * 1000, 5),
      ]);
      if (permitted.some(result => !result)) return accepted();
      try {
        const record = await store.findByReferenceEmail(reference, email);
        if (!record || record.tokenRevoked || !safeId.test(record.bookingId) || record.reference !== reference || record.customer?.email !== email || await store.isEmailSuppressed(email)) return accepted();
        const jobId = `booking-access:${keyed(`${reference}\n${email}\n${value.idempotencyKey}`)}`;
        const expiresAt = now + BOOKING_MAIL_ACCESS_TTL_MS;
        const proof = issueProof({ bookingId: record.bookingId, secret, now }, 'mail', BOOKING_MAIL_ACCESS_TTL_MS);
        const link = new URL(publicHref('/quote', value.language), origin);
        link.searchParams.set('booking', record.bookingId); link.hash = `recover=${proof}`;
        const links = { primary: link.href, secondary: new URL(publicHref('/kontakt', value.language), origin).href };
        const notification = createCustomerNotification({ templateId: 'magic_link', eventId: jobId, entityId: record.bookingId, email,
          languageSnapshot: selectedEmailSnapshot(value.language), renderData: { reference, customer: {}, expiresAt: new Date(expiresAt).toISOString(), testMode: record.mode === 'test' } });
        // Prepare a valid fallback through the same reviewed collection; current rollout may be off.
        const envelope = prepareCustomerEnvelope(notification, links, origin);
        await store.addMail({ id: jobId, bookingId: null, kind: 'customer_access', email, status: 'queued', dueAt: now, expiresAt,
          notification, authorisedLinks: links, message: { subject: envelope.subject, text: envelope.text, html: envelope.html } });
        if (dispatchMail) await dispatchMail(jobId).catch(() => undefined);
      } catch { /* Uniform acknowledgement never discloses a booking, suppression or mail failure. */ }
      return accepted();
    },
    async redeemLink({ bookingId, proof }: { bookingId: string; proof: string }): Promise<Access> {
      if (!verifyProof(proof, bookingId, secret, clock(), 'mail', BOOKING_MAIL_ACCESS_TTL_MS)) throw new BookingError('BOOKING_ACCESS_UNAVAILABLE', 404);
      return resolve(bookingId);
    },
    async redeemBrowserAccess({ bookingId, cookieHeader }: { bookingId: string; cookieHeader: string }): Promise<Access> {
      if (!redeemBookingBrowserCookie({ cookieHeader, bookingId, secret, now: clock() })) throw new BookingError('BOOKING_ACCESS_UNAVAILABLE', 404);
      return resolve(bookingId);
    },
  };
}
