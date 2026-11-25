import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';
import type { Request, RequestHandler } from 'express';
import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };
import { contactLanguage, normalizeContactFields, validateContactFields, validContactIdempotencyKey, validContactReference } from '../src/contact/intake-contract.ts';
import { ContactIntakeError, createFirestoreContactIntakeStore, type ContactIntakeStore, type ContactRecord } from './contact-intake-store.ts';
import { createResendEmailAdapter } from './booking-email.ts';
import { getContactCopy } from '../src/contact/contact-copy.ts';

export const CONTACT_CHALLENGE_ACTION = 'kraken_contact';
type Environment = Record<string, string | undefined>;
type Challenge = { token: string; hostname: string; idempotencyKey: string };
export type ContactIntakeOptions = {
  env?: Environment; store?: ContactIntakeStore; fetcher?: typeof fetch; clock?: () => number;
  verifyChallenge?: (challenge: Challenge) => Promise<boolean>;
  sendEmail?: (message: any) => Promise<{ id: string }>;
};
const responseHeaders = (res: any) => { res.setHeader('Cache-Control', 'private, no-store'); res.setHeader('X-Content-Type-Options', 'nosniff'); };
function allowedOrigins(env: Environment): Set<string> {
  const origins = (env.CONTACT_ALLOWED_ORIGINS || 'https://krakenpfm.ch,https://www.krakenpfm.ch').split(',').map(value => value.trim());
  return new Set(origins.filter(origin => {
    try { const url = new URL(origin); return url.origin === origin && (url.protocol === 'https:' || (env.NODE_ENV !== 'production' && url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))); }
    catch { return false; }
  }));
}
function clientAddress(req: Request, env: Environment): string {
  // Only Vercel's trusted edge overwrites the forwarding header. A standalone
  // Express deployment uses the actual socket, never an arbitrary browser header.
  const forwarded = env.VERCEL === '1' ? req.get('x-vercel-forwarded-for') || req.get('x-forwarded-for') : '';
  const value = forwarded?.split(',')[0]?.trim();
  return value && isIP(value) ? value : req.socket?.remoteAddress || 'unknown';
}

export async function verifyContactChallenge(challenge: Challenge, secret: string, fetcher: typeof fetch = fetch, now = Date.now()): Promise<boolean> {
  try {
    const response = await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(8000),
      body: JSON.stringify({ secret, response: challenge.token, idempotency_key: challenge.idempotencyKey }),
    });
    if (!response.ok) return false;
    const text = await response.text();
    if (text.length > 16_384) return false;
    const result = JSON.parse(text), timestamp = Date.parse(result.challenge_ts);
    return result.success === true && result.hostname === challenge.hostname && result.action === CONTACT_CHALLENGE_ACTION
      && Number.isFinite(timestamp) && timestamp <= now + 60_000 && timestamp >= now - 330_000;
  } catch { return false; }
}

/** Registration and durable deduplication are the success boundary, never email delivery. */
export function createContactIntakeHandlers(options: ContactIntakeOptions = {}): { config: RequestHandler; message: RequestHandler; maintenance: RequestHandler } {
  const env = options.env || process.env, fetcher = options.fetcher || fetch, clock = options.clock || Date.now;
  const origins = allowedOrigins(env), secret = env.CONTACT_INTAKE_SECRET || env.BOOKING_TOKEN_SECRET || '';
  const siteKey = env.CONTACT_TURNSTILE_SITE_KEY || '', challengeSecret = env.CONTACT_TURNSTILE_SECRET_KEY || '';
  const configured = env.CONTACT_INTAKE_ENABLED === 'true' && secret.length >= 32 && /^[A-Za-z0-9_-]{10,128}$/.test(siteKey)
    && challengeSecret.length >= 10 && origins.size > 0;
  const keyed = (context: string, value: string) => createHmac('sha256', secret).update(context + '\0' + value).digest('hex');
  let storePromise: Promise<ContactIntakeStore | null> | null = null;
  function getStore(): Promise<ContactIntakeStore | null> {
    if (!configured) return Promise.resolve(null);
    if (options.store) return Promise.resolve(options.store);
    if (!storePromise) storePromise = (async () => {
      if (!(env.FIREBASE_SERVICE_ACCOUNT_JSON || env.GOOGLE_APPLICATION_CREDENTIALS || env.BOOKING_USE_APPLICATION_DEFAULT === 'true')) return null;
      try {
        const { getApps, initializeApp, cert, applicationDefault } = await import('firebase-admin/app');
        const { getFirestore } = await import('firebase-admin/firestore');
        let app = getApps().find(candidate => candidate.name === 'kraken-booking');
        if (!app) {
          const credential = env.FIREBASE_SERVICE_ACCOUNT_JSON ? cert(JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON)) : applicationDefault();
          try { app = initializeApp({ credential, projectId: env.BOOKING_FIREBASE_PROJECT_ID || firebaseConfig.projectId }, 'kraken-booking'); }
          catch { app = getApps().find(candidate => candidate.name === 'kraken-booking'); if (!app) return null; }
        }
        return createFirestoreContactIntakeStore(getFirestore(app, env.BOOKING_FIREBASE_DATABASE_ID || firebaseConfig.firestoreDatabaseId));
      } catch { return null; } // No credentials, provider errors or form data enter application logs.
    })();
    return storePromise;
  }
  const emailReady = env.CONTACT_ACKNOWLEDGEMENT_ENABLED === 'true' && !!env.RESEND_API_KEY && !!env.BOOKING_EMAIL_FROM && (env.CRON_SECRET || '').length >= 32;
  const sender = options.sendEmail || (emailReady ? createResendEmailAdapter(env.RESEND_API_KEY!, fetcher) : null);
  const verify = options.verifyChallenge || ((challenge: Challenge) => verifyContactChallenge(challenge, challengeSecret, fetcher, clock()));
  const fail = (res: any, error: unknown) => {
    const known = error instanceof ContactIntakeError ? error : new ContactIntakeError('unavailable', 503);
    if (known.status === 429) res.setHeader('Retry-After', '600');
    res.status(known.status).json({ accepted: false, error: { code: known.code } });
  };
  const requestOrigin = (req: Request) => {
    const value = req.get('Origin') || '';
    if (!origins.has(value)) throw new ContactIntakeError('origin_rejected', 403);
    return new URL(value);
  };
  return {
    config: async (_req, res) => {
      responseHeaders(res);
      const available = !!await getStore();
      res.json({ available, challenge: available ? { provider: 'turnstile', siteKey, action: CONTACT_CHALLENGE_ACTION } : null });
    },
    message: async (req, res) => {
      responseHeaders(res);
      try {
        const origin = requestOrigin(req);
        if (!req.is('application/json')) throw new ContactIntakeError('invalid_request', 415);
        if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body) || Buffer.byteLength(JSON.stringify(req.body), 'utf8') > 24_576) throw new ContactIntakeError('invalid_request', 413);
        const allowed = new Set(['name', 'email', 'phone', 'channel', 'service', 'postalCode', 'message', 'language', 'website', 'turnstileToken', 'idempotencyKey']);
        if (Object.keys(req.body).some(key => !allowed.has(key)) || typeof req.body.website !== 'string' || req.body.website !== '') throw new ContactIntakeError('invalid_request');
        if (['name', 'email', 'channel', 'service', 'postalCode', 'message'].some(key => typeof req.body[key] !== 'string') || (req.body.phone !== undefined && typeof req.body.phone !== 'string')) throw new ContactIntakeError('invalid_request');
        const fields = normalizeContactFields(req.body), errors = validateContactFields(fields);
        if (Object.keys(errors).length) { res.status(400).json({ accepted: false, error: { code: 'validation', fields: errors } }); return; }
        if (!validContactIdempotencyKey(req.body.idempotencyKey)) throw new ContactIntakeError('invalid_request');
        const store = await getStore();
        if (!store) throw new ContactIntakeError('unavailable', 503);
        const now = clock(), key = req.body.idempotencyKey;
        const fingerprint = keyed('content', JSON.stringify(fields));
        if (!await store.consumeRate(keyed('ip', clientAddress(req, env)), now, 600_000, 10)) throw new ContactIntakeError('rate_limited', 429);
        const prior = await store.previous(key, fingerprint);
        if (prior) {
          if (!validContactReference(prior.reference)) throw new ContactIntakeError('unavailable', 503);
          res.status(200).json({ accepted: true, reference: prior.reference }); return;
        }
        const token = req.body.turnstileToken;
        if (typeof token !== 'string' || !token || token.length > 2048 || !await verify({ token, hostname: origin.hostname, idempotencyKey: key })) throw new ContactIntakeError('verification_failed', 403);
        if (!await store.consumeRate(keyed('email', fields.email.toLowerCase()), now, 3_600_000, 5)) throw new ContactIntakeError('rate_limited', 429);
        const id = randomUUID(), reference = 'KCT-' + randomUUID().replace(/-/g, '').slice(0, 20).toUpperCase();
        const language = contactLanguage(req.body.language), copy = getContactCopy(language).form;
        const serviceLabels: Record<string, string> = { windows: copy.serviceWindows, end: copy.serviceEnd, regular: copy.serviceRegular, deep: copy.serviceDeep, moving: copy.serviceMoving, unsure: copy.serviceUnsure };
        const channelLabels: Record<string, string> = { email: copy.channelEmail, phone: copy.channelPhone, whatsapp: copy.channelWhatsapp };
        const effectiveChannel = fields.phone ? fields.channel : 'email';
        const subject = [serviceLabels[fields.service], fields.postalCode, channelLabels[fields.channel] + (effectiveChannel !== fields.channel ? ' → ' + channelLabels[effectiveChannel] : ''), fields.phone].filter(Boolean).join(' · ');
        const record: ContactRecord = { ...fields, id, reference, language, effectiveChannel, subject, status: 'new', createdAt: now };
        let job = null;
        if (emailReady && sender) {
          const { renderContactAcknowledgement } = await import('./contact-intake-email.ts');
          job = { id: 'contact-received:' + id, recordId: id, status: 'queued', dueAt: now, attempts: 0, envelope: renderContactAcknowledgement(record, env.BOOKING_EMAIL_FROM!) };
        }
        const saved = await store.create(key, fingerprint, record, job);
        if (!validContactReference(saved.reference)) throw new ContactIntakeError('unavailable', 503);
        res.status(201).json({ accepted: true, reference: saved.reference });
      } catch (error) { fail(res, error); }
    },
    maintenance: async (req, res) => {
      responseHeaders(res);
      const expected = env.CRON_SECRET || '', received = req.get('Authorization') || '';
      if (expected.length < 32 || received.length !== expected.length + 7 || !timingSafeEqual(Buffer.from(received), Buffer.from('Bearer ' + expected))) { res.status(403).json({ error: { code: 'forbidden' } }); return; }
      try {
        const store = await getStore();
        if (!store || !sender || !emailReady) throw new ContactIntakeError('unavailable', 503);
        let processed = 0;
        for (const pending of (await store.due(clock())).slice(0, 5)) {
          const job = await store.claim(pending.id, clock());
          if (!job) continue;
          try {
            const accepted = await sender(job.envelope);
            await store.finish(job.id, 'sent', { providerId: accepted.id, sentAt: clock() });
          } catch (cause) {
            const error = cause as { definitelyNotSent?: boolean; retryable?: boolean; retryAfterMs?: number };
            if (error.definitelyNotSent && error.retryable && job.attempts < 3) await store.finish(job.id, 'queued', { dueAt: clock() + Math.max(60_000, error.retryAfterMs || 0) });
            else await store.finish(job.id, error.definitelyNotSent ? 'failed' : 'delivery_unknown');
          }
          processed++;
        }
        res.json({ processed });
      } catch (error) { fail(res, error); }
    },
  };
}
