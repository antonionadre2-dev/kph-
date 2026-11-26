import { normalizeEmailLanguage } from '../email-collection/language.mjs';

export const CONSENT_VERSION = 'recovery-2026-11-24';
export const DAY_MS = 86_400_000;
export const HOUR_MS = 3_600_000;
export const DRAFT_TTL_MS = 7 * DAY_MS;
export const SOCIAL_TTL_MS = DAY_MS;
export const LANGUAGES = Object.freeze(['de', 'en', 'es', 'fr', 'it', 'pt']);
export const GUIDE_PLACES = Object.freeze(['unknown', 'zurich', 'winterthur', 'schaffhausen', 'zh', 'sh', 'other']);
export const SERVICES = Object.freeze(['regular', 'deep', 'endOfTenancy', 'windows', 'construction', 'moving']);
export const REGIONS = Object.freeze(['Zürich', 'Schaffhausen', 'Winterthur']);
export const STOP_REASONS = Object.freeze(['completed', 'paid', 'cancelled', 'unsubscribed', 'bounced', 'complaint', 'expired']);
const localClock = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Zurich', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const SELECTION_KEYS = {
  regular:['service','cleaningKind','frequency','hours','materials','oven','fridge','ironingHours'],
  endOfTenancy:['service','mode','propertyType','rooms','areaM2','hours','bathrooms','guestWcs','slatBlinds','rollerShutters','smallBalconies','largeBalconies','storageRooms','garages','carpetRooms','heavySoiling'],
  construction:['service','mode','level','areaM2','hours','cementM2','filmWindows','slatBlinds','extraArea'],
  windows:['service','standard','double','balconyDoors','roof','slatBlinds','rollerShutters','difficultAccess','winterGarden'],
  moving:['service','mode','team','estimatedHours','additionalHelpers','rooms','distanceKm','originFloor','originLift','destinationFloor','destinationLift','largeWardrobes','disposalM3','boxes','piano','safe','furnitureLift','sameAddress','cleaning','details']
};

export class RecoveryError extends Error {
  constructor(code, status = 400) { super(code); this.name = 'RecoveryError'; this.code = code; this.status = status; }
}

export function normaliseLanguage(value) {
  const language = String(value || 'de').toLowerCase().split(/[-_]/)[0];
  return LANGUAGES.includes(language) ? language : 'de';
}

export function normaliseEmail(value) {
  if (typeof value !== 'string') throw new RecoveryError('INVALID_EMAIL');
  const email = value.trim().toLowerCase();
  if (email.length > 254 || /[\s\u0000-\u001f\u007f]/.test(email) || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) throw new RecoveryError('INVALID_EMAIL');
  return email;
}

export function cleanSelection(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !SELECTION_KEYS[value.service]) throw new RecoveryError('INVALID_SELECTION');
  const selection=Object.fromEntries(SELECTION_KEYS[value.service].filter(key=>Object.hasOwn(value,key)).map(key=>[key,value[key]]));
  if(selection.service==='moving' && selection.cleaning!==undefined){
    if(!selection.cleaning || selection.cleaning.service!=='endOfTenancy')throw new RecoveryError('INVALID_SELECTION');
    selection.cleaning=cleanSelection(selection.cleaning);
  }
  if(JSON.stringify(selection).length>12_000) throw new RecoveryError('INVALID_SELECTION');
  return JSON.parse(JSON.stringify(selection));
}

/** Only coarse, customer-selected locations. Never accept names, addresses or free text here. */
export function cleanGuidePreferences(value) {
  if (value === undefined) return {from:'unknown',to:'unknown',vehicle:false};
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
    Object.keys(value).length !== 3 || !Object.hasOwn(value,'from') || !Object.hasOwn(value,'to') || !Object.hasOwn(value,'vehicle') ||
    !GUIDE_PLACES.includes(value.from) || !GUIDE_PLACES.includes(value.to) || typeof value.vehicle !== 'boolean') {
    throw new RecoveryError('INVALID_GUIDE_PREFERENCES');
  }
  return {from:value.from,to:value.to,vehicle:value.vehicle};
}

/** Slot search uses Zürich's IANA zone, so both CET/CEST changes are handled. */
export function nextServiceWindow(instant) {
  if (!Number.isFinite(instant)) throw new RecoveryError('INVALID_TIME');
  let candidate = Math.ceil(instant / 60_000) * 60_000;
  for (let i = 0; i < 36 * 60; i++, candidate += 60_000) {
    const clock = localClock.format(new Date(candidate));
    if (clock >= '09:00' && clock < '19:00') return candidate;
  }
  throw new RecoveryError('TIME_WINDOW_UNAVAILABLE', 500);
}

export function isServiceWindow(instant) {
  const clock = localClock.format(new Date(instant));
  return clock >= '09:00' && clock < '19:00';
}

export function reminderDue(kind, lastActivityAt, firstReminderSentAt = null) {
  if (kind === 'reminder1') return nextServiceWindow(lastActivityAt + 4 * HOUR_MS);
  if (kind === 'reminder2') return nextServiceWindow(Math.max(lastActivityAt + 24 * HOUR_MS, (firstReminderSentAt || 0) + 20 * HOUR_MS));
  throw new RecoveryError('INVALID_MAIL_KIND');
}

export function normaliseCapture(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new RecoveryError('INVALID_BODY');
  if (typeof input.idempotencyKey !== 'string' || !/^[a-zA-Z0-9_-]{16,128}$/.test(input.idempotencyKey)) throw new RecoveryError('INVALID_IDEMPOTENCY_KEY');
  if (typeof input.reminderConsent !== 'boolean') throw new RecoveryError('CONSENT_REQUIRED');
  if (input.reminderConsent && input.consentVersion !== CONSENT_VERSION) throw new RecoveryError('CONSENT_VERSION_CHANGED', 409);
  let language;
  try { language=normalizeEmailLanguage(input.language); } catch { throw new RecoveryError('INVALID_LANGUAGE'); }
  const selection = cleanSelection(input.selection);
  return { email: normaliseEmail(input.email), language, selection, guidePreferences:cleanGuidePreferences(input.guidePreferences), reminderConsent: input.reminderConsent,
    consentVersion: input.reminderConsent ? CONSENT_VERSION : null, idempotencyKey: input.idempotencyKey };
}

export function socialEventShape(input, now, requirePaid = true) {
  if (!input || typeof input.bookingId !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(input.bookingId)) throw new RecoveryError('INVALID_BOOKING');
  if (!Number.isSafeInteger(input.revision) || input.revision < 1) throw new RecoveryError('INVALID_REVISION');
  if (input.mode !== 'live') return null;
  const happened = typeof input.occurredAt === 'number' ? input.occurredAt : Date.parse(input.occurredAt);
  const service = input.service === 'regular' && input.frequency === 'once' ? 'deep' : input.service;
  const visible = input.status === 'confirmed' && (!requirePaid || input.paymentStatus === 'paid') &&
    !['refunded', 'partially_refunded', 'chargeback', 'failed', 'cancelled', 'test_paid'].includes(input.paymentStatus) &&
    SERVICES.includes(service) && REGIONS.includes(input.region) && Number.isFinite(happened) && happened <= now + 60_000 && happened > now - SOCIAL_TTL_MS;
  return { bookingId: input.bookingId, revision: input.revision, visible,
    service: visible ? service : null, region: visible ? input.region : null,
    occurredAt: visible ? Math.floor(Math.min(happened, now) / 60_000) * 60_000 : now,
    expiresAt: visible ? happened + SOCIAL_TTL_MS : now + SOCIAL_TTL_MS };
}
