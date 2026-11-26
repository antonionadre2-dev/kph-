import { defaultSelection, type BookingSelection } from './pricing.ts';
import type { StorageLike } from './privateStorage.ts';

export const CALCULATOR_DRAFT_KEY = 'kraken.calculator.anonymous.v1';
export const CALCULATOR_CONTACT_KEY = 'kraken.calculator.session.v1';
export const CALCULATOR_SUBMISSION_KEY = 'kraken.calculator.submission.v1';
export const CALCULATOR_DRAFT_TTL_MS = 24 * 60 * 60 * 1000;
export const CALCULATOR_SESSION_TTL_MS = 30 * 60 * 1000;
export type CalculatorChoice = BookingSelection['service'] | 'deep';
export interface CalculatorDraftCustomer { name: string; email: string; phone: string; address: string; postalCode: string; city: string }
export interface CalculatorDraftState {
  choice: CalculatorChoice; selection: BookingSelection; wizardStep: 0 | 1 | 2;
  customer?: CalculatorDraftCustomer; requestedDate?: string; requestedTime?: string; notes?: string;
}
export interface CalculatorSubmission { hash: string; key: string }
const enums: Record<string, string[]> = { frequency: ['weekly','fortnightly','monthly','once'], mode: ['fixed','hourly','area'], propertyType: ['apartment','house'], level: ['light','full'], cleaningKind: ['regular','deep'] };
const record = (value: unknown): value is Record<string, any> => !!value && typeof value === 'object' && !Array.isArray(value);
const storage = (kind: 'localStorage' | 'sessionStorage'): StorageLike | null => { try { return typeof window === 'undefined' ? null : window[kind]; } catch { return null; } };
const remove = (store: StorageLike | null, key: string) => { try { store?.removeItem(key); } catch { /* Storage is optional. */ } };
function read(store: StorageLike | null, key: string, ttl: number, now: number) {
  try {
    const raw = store?.getItem(key); if (!raw) return null;
    if (raw.length > 24000) throw Error();
    const value = JSON.parse(raw);
    if (!record(value) || value.version !== 1 || !Number.isFinite(value.savedAt) || !Number.isFinite(value.expiresAt)
      || value.savedAt > now || value.expiresAt <= now || value.expiresAt <= value.savedAt || value.expiresAt - value.savedAt > ttl || !record(value.data)) throw Error();
    return value;
  } catch { remove(store, key); return null; }
}
function write(store: StorageLike | null, key: string, data: Record<string, unknown>, ttl: number, now: number, preserveExpiry = false) {
  const previous = read(store, key, ttl, now);
  // Restoring, changing language or merely mounting the page never renews retention.
  if (previous && JSON.stringify(previous.data) === JSON.stringify(data)) return;
  try { store?.setItem(key, JSON.stringify({ version: 1, savedAt: preserveExpiry && previous ? previous.savedAt : now, expiresAt: preserveExpiry && previous ? previous.expiresAt : now + ttl, data })); } catch { /* Keep the current in-memory form. */ }
}
function sanitizeRead(store: StorageLike | null, key: string, saved: Record<string, any>, data: Record<string, unknown>) {
  const serialized = JSON.stringify({ version: 1, savedAt: saved.savedAt, expiresAt: saved.expiresAt, data });
  try { if (store?.getItem(key) !== serialized) store?.setItem(key, serialized); } catch { /* Never extend the original expiry. */ }
}
function text(value: unknown, max: number): string {
  return typeof value === 'string' && value.length <= max && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value) ? value : '';
}
function selection(value: unknown): BookingSelection | null {
  if (!record(value) || !['regular','endOfTenancy','windows','moving','construction'].includes(value.service)) return null;
  const base = defaultSelection(value.service as BookingSelection['service']) as unknown as Record<string, unknown>;
  const result: Record<string, unknown> = { service: value.service };
  for (const [key, fallback] of Object.entries(base)) {
    if (key === 'service' || key === 'details') continue;
    const supplied = value[key];
    // A combined cleaning contains quantities only. Never retain arbitrary nested
    // objects, addresses or a caller-supplied price in the anonymous draft.
    if (value.service === 'moving' && key === 'cleaning') {
      if (supplied === undefined) continue;
      if (!record(supplied) || supplied.service !== 'endOfTenancy') return null;
      const cleaning = selection(supplied);
      if (!cleaning || cleaning.service !== 'endOfTenancy') return null;
      result.cleaning = cleaning;
      continue;
    }
    // Historical moving drafts contained only a description; missing optional
    // fields must not silently turn that personal request into a priced move.
    if (supplied === undefined && (value.service === 'moving' || key === 'cleaningKind')) continue;
    if (value.service === 'moving' && key === 'team' && supplied !== 1 && supplied !== 2) return null;
    if (value.service === 'moving' && key === 'mode' && supplied !== 'fixed' && supplied !== 'hourly') return null;
    if (value.service === 'moving' && key === 'distanceKm') {
      if (supplied === null || typeof supplied === 'number' && Number.isNaN(supplied)) continue;
      if (typeof supplied !== 'number' || !Number.isFinite(supplied) || supplied < 0 || supplied > 10000) return null;
      result.distanceKm = supplied; continue;
    }
    if (typeof fallback === 'number') {
      if (supplied === null || (typeof supplied === 'number' && Number.isNaN(supplied))) result[key] = NaN;
      else if (typeof supplied === 'number' && Number.isFinite(supplied) && Math.abs(supplied) <= 10000) result[key] = supplied;
      else return null;
    } else if (typeof fallback === 'boolean') {
      if (typeof supplied !== 'boolean') return null; result[key] = supplied;
    } else {
      if (!enums[key]?.includes(supplied)) return null; result[key] = supplied;
    }
  }
  return result as unknown as BookingSelection;
}
function anonymous(value: unknown) {
  if (!record(value)) return null;
  const selected = selection(value.selection);
  if (!selected || ![0,1,2].includes(value.wizardStep)) return null;
  const deep = selected.service === 'regular' && (selected.cleaningKind === 'deep' || selected.cleaningKind === undefined && selected.frequency === 'once');
  if (value.choice !== (deep ? 'deep' : selected.service) || deep && selected.service === 'regular' && selected.frequency !== 'once') return null;
  return { choice: value.choice as CalculatorChoice, selection: selected, wizardStep: value.wizardStep as 0 | 1 | 2 };
}
const selectionKey = (value: { choice: CalculatorChoice; selection: BookingSelection }) => JSON.stringify({ choice: value.choice, selection: value.selection });
function personal(value: unknown) {
  const input = record(value) ? value : {};
  const customer = record(input.customer) ? input.customer : {};
  const date = typeof input.requestedDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input.requestedDate) ? input.requestedDate : '';
  const instant = date ? Date.parse(date + 'T12:00:00Z') : NaN;
  return {
    customer: { name: text(customer.name,120), email: text(customer.email,254), phone: text(customer.phone,40), address: text(customer.address,200), postalCode: typeof customer.postalCode === 'string' && /^\d{0,4}$/.test(customer.postalCode) ? customer.postalCode : '', city: text(customer.city,100) },
    requestedDate: Number.isFinite(instant) && new Date(instant).toISOString().slice(0,10) === date ? date : '',
    requestedTime: typeof input.requestedTime === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(input.requestedTime) ? input.requestedTime : '09:00',
    notes: text(input.notes,4000), movingDetails: text(input.movingDetails,3000),
  };
}

export function writeCalculatorDraft(value: CalculatorDraftState, local: StorageLike | null = storage('localStorage'), session: StorageLike | null = storage('sessionStorage'), now = Date.now()): void {
  const clean = anonymous(value); if (!clean) return;
  const previous = anonymous(read(local, CALCULATOR_DRAFT_KEY, CALCULATOR_DRAFT_TTL_MS, now)?.data);
  write(local, CALCULATOR_DRAFT_KEY, clean, CALCULATOR_DRAFT_TTL_MS, now, !!previous && selectionKey(previous) === selectionKey(clean));
  const contact = personal({ ...value, movingDetails: value.selection.service === 'moving' ? value.selection.details : '' });
  write(session, CALCULATOR_CONTACT_KEY, { selectionKey: selectionKey(clean), ...contact }, CALCULATOR_SESSION_TTL_MS, now);
}

export function readCalculatorDraft(local: StorageLike | null = storage('localStorage'), session: StorageLike | null = storage('sessionStorage'), now = Date.now()): CalculatorDraftState | null {
  const saved = read(local, CALCULATOR_DRAFT_KEY, CALCULATOR_DRAFT_TTL_MS, now);
  const clean = anonymous(saved?.data);
  if (!clean) { remove(local, CALCULATOR_DRAFT_KEY); remove(session, CALCULATOR_CONTACT_KEY); return null; }
  sanitizeRead(local, CALCULATOR_DRAFT_KEY, saved!, clean);
  const contact = read(session, CALCULATOR_CONTACT_KEY, CALCULATOR_SESSION_TTL_MS, now);
  if (!contact || contact.data.selectionKey !== selectionKey(clean)) return { ...clean, wizardStep: clean.wizardStep === 0 ? 0 : 1 };
  const details = personal(contact.data);
  sanitizeRead(session, CALCULATOR_CONTACT_KEY, contact, { selectionKey: selectionKey(clean), ...details });
  return { ...clean, ...details, ...(clean.selection.service === 'moving' ? { selection: { ...clean.selection, details: details.movingDetails } } : {}) };
}

export function clearCalculatorDraft(local: StorageLike | null = storage('localStorage'), session: StorageLike | null = storage('sessionStorage')): void {
  remove(local, CALCULATOR_DRAFT_KEY); remove(session, CALCULATOR_CONTACT_KEY); remove(session, CALCULATOR_SUBMISSION_KEY);
}

/** Also purge expired personal data while the form stays open; never changes the live form. */
export function purgeExpiredCalculatorSession(session: StorageLike | null = storage('sessionStorage'), now = Date.now()): void {
  read(session, CALCULATOR_CONTACT_KEY, CALCULATOR_SESSION_TTL_MS, now);
  read(session, CALCULATOR_SUBMISSION_KEY, CALCULATOR_SESSION_TTL_MS, now);
}

function canonical(value: any): string {
  return JSON.stringify(value && typeof value === 'object' ? Array.isArray(value) ? value.map(item => JSON.parse(canonical(item)))
    : Object.fromEntries(Object.keys(value).sort().map(key => [key, JSON.parse(canonical(value[key]))])) : value);
}

/** A retry nonce is not an access token. Only its hash and nonce survive for at most 30 minutes. */
export async function calculatorSubmission(payload: unknown, current: CalculatorSubmission | null, newKey: () => string, session: StorageLike | null = storage('sessionStorage'), now = Date.now()): Promise<CalculatorSubmission> {
  const bytes = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical(payload)));
  const hash = Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2,'0')).join('');
  if (current?.hash === hash) return current;
  const saved = read(session, CALCULATOR_SUBMISSION_KEY, CALCULATOR_SESSION_TTL_MS, now)?.data;
  const result = saved?.hash === hash && /^[A-Za-z0-9_-]{16,128}$/.test(saved.key) ? { hash, key: saved.key } : { hash, key: newKey() };
  write(session, CALCULATOR_SUBMISSION_KEY, result, CALCULATOR_SESSION_TTL_MS, now);
  return result;
}
