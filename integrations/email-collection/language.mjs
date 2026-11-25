/**
 * Language selection only. No storage, network calls or email sends.
 * Import this module in the website and on the server so both accept the same
 * six languages. Persist the returned snapshot with the quote/booking and copy
 * it into each queued email; a worker must never re-read browser preferences.
 */
export const emailLanguages = Object.freeze(['de', 'en', 'es', 'fr', 'it', 'pt']);

const snapshotSources = new Set([
  'selected', 'booking', 'customer', 'accept-language', 'default',
  'legacy-customer', 'legacy-default'
]);
const missingLanguage = value => value === undefined || value === null;

export class EmailLanguageError extends RangeError {
  constructor(code, field) {
    super(`${field}: ${code === 'MISSING_EMAIL_LANGUAGE' ? 'an email language is required' : 'expected a supported language (de, en, es, fr, it, pt)'}.`);
    this.name = 'EmailLanguageError';
    this.code = code;
    this.field = field;
  }
}

/**
 * Strict canonicalisation of a selected or persisted language.
 * Examples: de-CH -> de; en-GB -> en; pt-BR -> pt.
 * null/undefined mean missing; empty, malformed and unsupported values throw.
 * Language names and underscore locales are not BCP 47 and are not accepted.
 */
export function normalizeEmailLanguage(value, { field = 'language' } = {}) {
  if (missingLanguage(value)) throw new EmailLanguageError('MISSING_EMAIL_LANGUAGE', field);
  if (typeof value !== 'string' || !value.trim() || /[\r\n\u0000]/.test(value)) {
    throw new EmailLanguageError('INVALID_EMAIL_LANGUAGE', field);
  }
  let tag;
  try { tag = Intl.getCanonicalLocales(value.trim())[0]; }
  catch { throw new EmailLanguageError('INVALID_EMAIL_LANGUAGE', field); }
  const language = tag.split('-')[0];
  if (!emailLanguages.includes(language)) throw new EmailLanguageError('UNSUPPORTED_EMAIL_LANGUAGE', field);
  return language;
}

function languageHint(value) {
  if (missingLanguage(value)) return null;
  try { return normalizeEmailLanguage(value); }
  catch (error) {
    if (error instanceof EmailLanguageError) return null;
    throw error;
  }
}

/**
 * Resolve initial website state using values supplied by the existing app.
 * selectedLanguage is the explicit selector value; siteLanguage is the app's
 * current/persisted locale. Neither may silently fall back when invalid.
 * The document and browser are hints only when no explicit/app choice exists.
 * This function intentionally assumes no cookie, localStorage or framework key.
 */
export function resolveWebsiteLanguage({
  selectedLanguage, siteLanguage, documentLanguage, browserLanguages = []
} = {}) {
  if (!missingLanguage(selectedLanguage)) return normalizeEmailLanguage(selectedLanguage, { field: 'selectedLanguage' });
  if (!missingLanguage(siteLanguage)) return normalizeEmailLanguage(siteLanguage, { field: 'siteLanguage' });
  const documentHint = languageHint(documentLanguage);
  if (documentHint) return documentHint;
  if (!Array.isArray(browserLanguages)) throw new TypeError('browserLanguages must be an array.');
  for (const value of browserLanguages) {
    const hint = languageHint(value);
    if (hint) return hint;
  }
  return 'de';
}

/**
 * Select the highest-weight supported explicit Accept-Language range.
 * This is a first-visit hint, not HTTP content negotiation. Wildcards express no
 * concrete language and return no choice; q=0 and invalid entries are ignored.
 * It must never be called to override a selected or already saved language.
 */
export function languageFromAcceptLanguage(header) {
  if (missingLanguage(header) || header === '') return null;
  if (typeof header !== 'string') throw new TypeError('Accept-Language must be a string.');
  if (/[\r\n\u0000]/.test(header)) return null;
  const choices = [];
  for (const [index, entry] of header.split(',').entries()) {
    const [range, ...parameters] = entry.trim().split(';').map(part => part.trim());
    if (!range || range === '*' || parameters.length > 1) continue;
    let quality = 1;
    if (parameters.length) {
      const match = /^q=(0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/i.exec(parameters[0]);
      if (!match) continue;
      quality = Number(match[1]);
    }
    if (quality <= 0) continue;
    const language = languageHint(range);
    if (language) choices.push({ language, quality, index });
  }
  choices.sort((a, b) => b.quality - a.quality || a.index - b.index);
  return choices[0]?.language ?? null;
}

function languageSnapshot(language, source) {
  return Object.freeze({ language, source, version: 1 });
}

/**
 * Capture the language during a synchronous quote/save/booking request.
 * Priority: an explicitly requested choice > stored booking > stored customer
 * preference > first-request Accept-Language hint > website default (de).
 * Prefer always sending selectedLanguage from the website; HTTP fallback is for
 * a first creation with no choice available, never a webhook or reminder.
 *
 * A new selectedLanguage may replace a booking choice only when the customer
 * deliberately requests that change. Do not run this again for queued emails.
 * Persist the complete returned snapshot in the same transaction as the record.
 */
export function snapshotEmailLanguage({
  selectedLanguage, bookingLanguage, customerLanguage, acceptLanguage
} = {}) {
  if (!missingLanguage(selectedLanguage)) return languageSnapshot(normalizeEmailLanguage(selectedLanguage, { field: 'selectedLanguage' }), 'selected');
  if (!missingLanguage(bookingLanguage)) return languageSnapshot(normalizeEmailLanguage(bookingLanguage, { field: 'bookingLanguage' }), 'booking');
  if (!missingLanguage(customerLanguage)) return languageSnapshot(normalizeEmailLanguage(customerLanguage, { field: 'customerLanguage' }), 'customer');
  const headerHint = languageFromAcceptLanguage(acceptLanguage);
  return languageSnapshot(headerHint ?? 'de', headerHint ? 'accept-language' : 'default');
}

/**
 * Read a previously stored quote/booking/outbox snapshot. A webhook's language,
 * an administrator's language and later browser changes have no role here.
 * Missing/corrupt snapshots throw so the job can be repaired, not sent in an
 * arbitrary language. The function cannot itself prove the object's DB origin.
 */
export function languageForBackgroundEmail(snapshot) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    throw new EmailLanguageError('MISSING_EMAIL_LANGUAGE', 'snapshot');
  }
  if (snapshot.version !== 1 || !snapshotSources.has(snapshot.source)) {
    throw new TypeError('A persisted version-1 email language snapshot is required.');
  }
  return normalizeEmailLanguage(snapshot.language, { field: 'snapshot.language' });
}

/**
 * Explicit, auditable migration for OLD records lacking a language snapshot.
 * Preserve an existing valid booking language; otherwise use a valid customer
 * preference, finally German. Only null/undefined qualify as absent. Corrupted
 * non-empty or empty-string values must be repaired, not silently overwritten.
 * Persist this result once in the migration; do not use it inside every send.
 */
export function migrateLegacyEmailLanguage({ bookingLanguage, customerLanguage } = {}) {
  if (!missingLanguage(bookingLanguage)) return languageSnapshot(normalizeEmailLanguage(bookingLanguage, { field: 'bookingLanguage' }), 'booking');
  if (!missingLanguage(customerLanguage)) return languageSnapshot(normalizeEmailLanguage(customerLanguage, { field: 'customerLanguage' }), 'legacy-customer');
  return languageSnapshot('de', 'legacy-default');
}

// Build localised customer URLs with the real site's router BEFORE signing.
// This module deliberately does not mutate arbitrary URLs: changing a Payrexx,
// magic-login or signed download URL can invalidate its signature or session.
