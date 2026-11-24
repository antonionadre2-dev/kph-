import { kaiDraftFieldLabel, normalizeKaiDraft, type KaiTransferPolicy } from '../kai/draft';
import { KAI_FIELDS, KAI_SERVICE_FIELDS, type KaiDraft, type KaiField } from '../kai/types';
import { defaultSelection, type BookingSelection } from './pricing';

export type CalculatorChoice = BookingSelection['service'] | 'deep';
export interface KaiCalculatorState {
  choice: CalculatorChoice | null;
  selection: BookingSelection | null;
  customer: { name: string; email: string; phone: string; address: string; postalCode: string; city: string };
  requestedDate: string;
  notes: string;
  /** Only fields actually edited/restored by the customer count as conflicts, not untouched defaults. */
  touchedSelection?: string[];
}
export interface KaiCalculatorResult extends KaiCalculatorState { draft: KaiDraft | null; conflicts: string[] }
const choices = { windows: 'windows', end: 'endOfTenancy', regular: 'regular', deep: 'deep', moving: 'moving' } as const;
const canonical = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
function numeric(value: string | undefined, min: number, max: number, step = 1): number | null {
  if (!value || !/^\d{1,4}(?:[.,]\d)?$/.test(value.trim())) return null;
  const parsed = Number(value.replace(',', '.'));
  return parsed >= min && parsed <= max && Number.isInteger(parsed / step) ? parsed : null;
}
function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
const windowTypes: Record<string, 'standard' | 'double' | 'balconyDoors' | 'roof'> = {
  standard: 'standard', standardfenster: 'standard', 'standard window': 'standard', 'standard windows': 'standard', 'ventana estandar': 'standard', 'ventanas estandar': 'standard', 'fenetre standard': 'standard', 'fenetres standard': 'standard', 'finestra standard': 'standard', 'finestre standard': 'standard', 'janela normal': 'standard', 'janelas normais': 'standard',
  double: 'double', doppelfenster: 'double', 'double window': 'double', 'double windows': 'double', 'ventana doble': 'double', 'ventanas dobles': 'double', 'fenetre double': 'double', 'fenetres doubles': 'double', 'finestra doppia': 'double', 'finestre doppie': 'double', 'janela dupla': 'double', 'janelas duplas': 'double',
  balconydoors: 'balconyDoors', balkontur: 'balconyDoors', balkonturen: 'balconyDoors', 'balcony door': 'balconyDoors', 'balcony doors': 'balconyDoors', 'puerta de balcon': 'balconyDoors', 'puertas de balcon': 'balconyDoors', 'porte-fenetre': 'balconyDoors', 'porta del balcone': 'balconyDoors', 'porta de varanda': 'balconyDoors',
  roof: 'roof', dachfenster: 'roof', 'roof window': 'roof', 'roof windows': 'roof', 'ventana de tejado': 'roof', 'ventanas de tejado': 'roof', 'fenetre de toit': 'roof', 'finestra da tetto': 'roof', 'janela de telhado': 'roof',
};
const frequencyTypes: Record<string, 'weekly' | 'fortnightly' | 'monthly'> = {
  weekly: 'weekly', wochentlich: 'weekly', semanal: 'weekly', hebdomadaire: 'weekly', settimanale: 'weekly',
  fortnightly: 'fortnightly', 'bi-weekly': 'fortnightly', 'alle zwei wochen': 'fortnightly', quincenal: 'fortnightly', quinzenal: 'fortnightly', 'toutes les deux semaines': 'fortnightly', 'ogni due settimane': 'fortnightly',
  monthly: 'monthly', monatlich: 'monthly', mensual: 'monthly', mensal: 'monthly', mensuel: 'monthly', mensile: 'monthly',
};

/** Transfer only explicit facts. The price engine still owns all money, minimums and person-hours. */
export function applyKaiBookingTransfer(existing: KaiCalculatorState, value: unknown, policy: KaiTransferPolicy): KaiCalculatorResult {
  const draft = normalizeKaiDraft(value);
  const result: KaiCalculatorResult = { ...existing, customer: { ...existing.customer }, selection: existing.selection ? { ...existing.selection } : null, draft, conflicts: [] };
  if (!draft) return result;
  const allowed: readonly KaiField[] = draft.service ? KAI_SERVICE_FIELDS[draft.service] : ['city', 'postcode', 'date', 'notes'];
  const fields = Object.fromEntries(Object.entries(draft.fields).filter(([key]) => allowed.includes(key as KaiField))) as KaiDraft['fields'];
  const desired = draft.service ? choices[draft.service] : existing.choice;
  const sameService = desired === existing.choice;
  if (desired && (!sameService || !result.selection)) {
    result.choice = desired;
    result.selection = desired === 'deep' ? { ...defaultSelection('regular'), frequency: 'once', hours: 3 } : defaultSelection(desired);
    result.touchedSelection = [];
  }
  const touched = new Set(sameService ? existing.touchedSelection || [] : []);
  const handled = new Set<KaiField>();
  const notes: string[] = [];
  const conflicts = new Set<string>();
  const assign = (target: Record<string, unknown>, key: string, incoming: string | number, field: KaiField, explicit: boolean) => {
    const current = target[key];
    if (explicit && current !== undefined && current !== null && current !== '' && String(current) !== String(incoming)) {
      conflicts.add(field);
      if (policy === 'preserve') return;
    }
    target[key] = incoming; handled.add(field);
  };
  if (fields.city && fields.city.length <= 100) assign(result.customer, 'city', fields.city, 'city', true);
  if (fields.postcode && /^[1-9]\d{3}$/.test(fields.postcode)) assign(result.customer, 'postalCode', fields.postcode, 'postcode', true);
  if (fields.date && validDate(fields.date)) {
    const date = { value: result.requestedDate };
    assign(date, 'value', fields.date, 'date', true); result.requestedDate = date.value;
  }
  const selection = result.selection as unknown as Record<string, unknown> | null;
  if (selection && draft.service === 'end' && selection.service === 'endOfTenancy') {
    const rooms = numeric(fields.rooms, 1, 100, .5), baths = numeric(fields.bathrooms, 0, 1000);
    if (rooms !== null) { assign(selection, 'rooms', rooms, 'rooms', touched.has('rooms')); if (handled.has('rooms')) touched.add('rooms'); }
    if (baths !== null) { assign(selection, 'bathrooms', baths, 'bathrooms', touched.has('bathrooms')); if (handled.has('bathrooms')) touched.add('bathrooms'); }
  }
  if (selection?.service === 'regular' && draft.service === 'regular' && fields.frequency) {
    const frequency = frequencyTypes[canonical(fields.frequency)];
    if (frequency) { assign(selection, 'frequency', frequency, 'frequency', touched.has('frequency')); if (handled.has('frequency')) touched.add('frequency'); }
  }
  if (selection?.service === 'windows' && draft.service === 'windows' && fields.windowType) {
    const type = windowTypes[canonical(fields.windowType)], count = numeric(fields.windowsCount, 0, 1000);
    if (type && count !== null) {
      // The preview's example windows are not extra customer-supplied quantities.
      for (const field of ['standard', 'double', 'balconyDoors', 'roof']) if (field !== type && !touched.has(field)) selection[field] = 0;
      assign(selection, type, count, 'windowsCount', touched.has(type));
      if (handled.has('windowsCount')) { handled.add('windowType'); touched.add(type); }
    }
  }
  for (const field of KAI_FIELDS) {
    if (!fields[field] || handled.has(field)) continue;
    notes.push(field === 'notes' ? fields[field]! : `${kaiDraftFieldLabel(field, draft.language)}: ${fields[field]}`);
  }
  const append = (old: string, additions: string[]) => [old, ...additions.filter(note => !old.includes(note))].filter(Boolean).join('\n');
  // Keep every supplied fact visible even when there is no exact control, or a conflict was preserved.
  // Long drafts remain available in the transfer summary instead of silently exceeding API limits.
  const nextNotes = append(result.notes, notes);
  if (nextNotes.length <= 3000) result.notes = nextNotes;
  else conflicts.add('notes');
  if (selection?.service === 'moving' && draft.service === 'moving') {
    const old = typeof selection.details === 'string' ? selection.details : '';
    const movingDetails = append(old, notes);
    if (movingDetails.length <= 3000) selection.details = movingDetails;
    else conflicts.add('inventory');
  }
  result.touchedSelection = [...touched];
  result.conflicts = [...conflicts];
  return result;
}

/** Backwards compatible shape for the shared Kai review, plus conflicts of this calculator's new controls. */
export function kaiBookingPreview(existing: KaiCalculatorState, draft: KaiDraft) {
  const applied = applyKaiBookingTransfer(existing, draft, 'preserve');
  return {
    contact: { city: existing.customer.city, postcode: existing.customer.postalCode, date: existing.requestedDate, notes: existing.notes },
    config: {},
    conflicts: applied.conflicts,
  };
}
