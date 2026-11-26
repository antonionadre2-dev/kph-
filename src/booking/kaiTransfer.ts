import { kaiDraftFieldLabel, normalizeKaiDraft, type KaiTransferPolicy } from '../kai/draft.ts';
import { KAI_FIELDS, KAI_SERVICE_FIELDS, type KaiDraft, type KaiField } from '../kai/types.ts';
import { defaultSelection, getRegularMinimumHours, type BookingSelection } from './pricing.ts';
import { pricingConfig } from './pricingConfig.ts';

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
export interface KaiCalculatorResult extends KaiCalculatorState {
  draft: KaiDraft | null;
  conflicts: string[];
  /** Only facts without an applied calculator control belong in the Kai information box. */
  remainingFields: KaiDraft['fields'];
}
const choices = { windows: 'windows', end: 'endOfTenancy', regular: 'regular', deep: 'deep', moving: 'moving' } as const;
const canonical = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
function numeric(value: string | undefined, min: number, max: number, step = 1): number | null {
  if (!value || !/^\d{1,5}(?:[.,]\d{1,2})?$/.test(value.trim())) return null;
  const parsed = Number(value.replace(',', '.'));
  return parsed >= min && parsed <= max && Math.abs(parsed / step - Math.round(parsed / step)) < 1e-7 ? parsed : null;
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
const frequencyTypes: Record<string, 'weekly' | 'fortnightly' | 'monthly' | 'once'> = {
  weekly: 'weekly', wochentlich: 'weekly', 'jede woche': 'weekly', 'every week': 'weekly', semanal: 'weekly', semanalmente:'weekly', 'cada semana':'weekly', hebdomadaire: 'weekly', 'chaque semaine':'weekly', settimanale: 'weekly', 'ogni settimana':'weekly',
  fortnightly: 'fortnightly', 'bi-weekly': 'fortnightly', 'alle zwei wochen': 'fortnightly', quincenal: 'fortnightly', quinzenal: 'fortnightly', 'toutes les deux semaines': 'fortnightly', 'ogni due settimane': 'fortnightly',
  monthly: 'monthly', monatlich: 'monthly', mensual: 'monthly', mensal: 'monthly', mensuel: 'monthly', mensile: 'monthly',
  once:'once', 'one-time':'once', 'one-off':'once', einmalig:'once', 'una vez':'once', 'una sola vez':'once', 'uma vez':'once', 'uma unica vez':'once', 'una sola volta':'once', 'una tantum':'once', ponctuel:'once', ponctuelle:'once', 'une seule fois':'once',
};

/** Only explicit, unambiguous access facts can change a priced control. */
function explicitAccess(value: string): { floor?: number; lift?: boolean; complete: boolean } {
  const text = canonical(value);
  const floorMatch = text.match(/\b(\d{1,3})\.?\s*(?:stock|floor|etage|planta|piso|andar|piano)\b/);
  const floor = floorMatch ? Number(floorMatch[1]) : undefined;
  const noLift = /\b(?:ohne|kein(?:en)?|no|without|sin|sem|sans|senza)\s+(?:lift|aufzug|elevator|ascensor|elevador|ascenseur|ascensore)\b/.test(text);
  const withLift = !noLift && /\b(?:mit|with|con|com|avec|c['’]?e)\s+(?:lift|aufzug|elevator|ascensor|elevador|ascenseur|ascensore)\b/.test(text)
    || /^(?:lift|aufzug|elevator|ascensor|elevador|ascenseur|ascensore)$/.test(text);
  const rest = text
    .replace(/\b\d{1,3}\.?\s*(?:stock|floor|etage|planta|piso|andar|piano)\b/g,'')
    .replace(/\b(?:(?:ohne|kein(?:en)?|no|without|sin|sem|sans|senza|mit|with|con|com|avec|c['’]?e)\s+)?(?:lift|aufzug|elevator|ascensor|elevador|ascenseur|ascensore)\b/g,'')
    .replace(/[\s,.;:-]+/g,'');
  return { floor: floor !== undefined && floor <= pricingConfig.limits.floor ? floor : undefined, lift: noLift ? false : withLift ? true : undefined, complete: !rest && (floor === undefined || floor <= pricingConfig.limits.floor) };
}

const priorityExtras = {
  regular: [
    { key:'oven', pattern:/^(?:backofen|ofen|oven|horno|forno|four)$/ },
    { key:'fridge', pattern:/^(?:kuhlschrank|fridge|refrigerator|nevera|frigorifico|frigorifero|refrigerateur)$/ },
  ],
  end: [
    { key:'smallBalconies', pattern:/^(\d+)\s*(?:klein\w*\s+balkon\w*|small balconies|small balcony|balcones? pequenos?|pequen[oa]s? varandas?|balconi? piccoli?|petits? balcons?)$/ },
    { key:'largeBalconies', pattern:/^(\d+)\s*(?:gross\w*\s+balkon\w*|large balconies|large balcony|balcones? grandes?|grandes? varandas?|balconi? grandi?|grands? balcons?)$/ },
    { key:'slatBlinds', pattern:/^(\d+)\s*(?:lamellenstoren|slat blinds?|persianas? de laminas|estores? de laminas|veneziane|stores? a lamelles)$/ },
    { key:'rollerShutters', pattern:/^(\d+)\s*(?:rollladen|rollladen|roller shutters?|persianas? enrollables?|estores? de enrolar|tapparelle|volets? roulants?)$/ },
  ],
} as const;

function negatedPriority(value:string):string|undefined {
  const prefix=value.replace(/^(?:ohne|kein(?:e[nrms]?|en)?|without|no|not|sin|sem|nao|sans|pas de|senza|non)\s+/,'');
  if(prefix!==value)return prefix;
  const suffix=value.replace(/\s+(?:(?:doch|but|pero|afinal|mais|invece)\s+)?(?:nicht|not|no|nao|non|pas)$/,'');
  return suffix!==value?suffix:undefined;
}

/** Transfer only explicit facts. The price engine still owns all money, minimums and person-hours. */
export function applyKaiBookingTransfer(existing: KaiCalculatorState, value: unknown, policy: KaiTransferPolicy): KaiCalculatorResult {
  const draft = normalizeKaiDraft(value);
  const result: KaiCalculatorResult = { ...existing, customer: { ...existing.customer }, selection: existing.selection ? { ...existing.selection } : null, draft, conflicts: [], remainingFields:{} };
  if (!draft) return result;
  const allowed: readonly KaiField[] = draft.service ? KAI_SERVICE_FIELDS[draft.service] : ['city', 'postcode', 'date', 'notes'];
  const fields = Object.fromEntries(Object.entries(draft.fields).filter(([key]) => allowed.includes(key as KaiField))) as KaiDraft['fields'];
  const desired = draft.service ? choices[draft.service] : existing.choice;
  const sameService = desired === existing.choice;
  if (desired && (!sameService || !result.selection)) {
    result.choice = desired;
    result.selection = desired === 'deep' ? { ...defaultSelection('regular'), cleaningKind:'deep', frequency: 'once', hours: pricingConfig.regular.deep.minimumHours } : desired === 'moving' ? {service:'moving', details:''} : defaultSelection(desired);
    result.touchedSelection = [];
  }
  const touched = new Set(sameService ? existing.touchedSelection || [] : []);
  const handled = new Set<KaiField>();
  const notes: string[] = [];
  const conflicts = new Set<string>();
  const assign = (target: Record<string, unknown>, key: string, incoming: string | number | boolean, field: KaiField, explicit: boolean) => {
    const current = target[key];
    if (explicit && current !== undefined && current !== null && current !== '' && String(current) !== String(incoming)) {
      conflicts.add(field);
      if (policy === 'preserve') return;
    }
    target[key] = incoming; handled.add(field);
  };
  const assignSelection = (key: string, incoming: string | number | boolean, field: KaiField) => {
    if (!result.selection) return;
    assign(result.selection as unknown as Record<string, unknown>, key, incoming, field, touched.has(key));
    if (handled.has(field)) touched.add(key);
  };
  if (fields.city && fields.city.length <= 100) assign(result.customer, 'city', fields.city, 'city', true);
  if (fields.postcode && /^[1-9]\d{3}$/.test(fields.postcode)) assign(result.customer, 'postalCode', fields.postcode, 'postcode', true);
  if (fields.date && validDate(fields.date)) {
    const date = { value: result.requestedDate };
    assign(date, 'value', fields.date, 'date', true); result.requestedDate = date.value;
  }
  const selection = result.selection as unknown as Record<string, unknown> | null;
  if (selection && draft.service === 'end' && selection.service === 'endOfTenancy') {
    const rooms = numeric(fields.rooms, 1, 100, .5), baths = numeric(fields.bathrooms, 0, 1000), area = numeric(fields.area,.01,pricingConfig.limits.areaM2,.01);
    if (rooms !== null) { assign(selection, 'rooms', rooms, 'rooms', touched.has('rooms')); if (handled.has('rooms')) touched.add('rooms'); }
    if (baths !== null) { assign(selection, 'bathrooms', baths, 'bathrooms', touched.has('bathrooms')); if (handled.has('bathrooms')) touched.add('bathrooms'); }
    if (area !== null) assignSelection('areaM2',area,'area');
  }
  if (selection?.service === 'regular' && (draft.service === 'regular' || draft.service === 'deep')) {
    if (draft.service === 'regular' && fields.frequency) {
      const frequency = frequencyTypes[canonical(fields.frequency)];
      if (frequency) assignSelection('frequency',frequency,'frequency');
    }
    const hours = numeric(fields.hours,getRegularMinimumHours(result.selection as Extract<BookingSelection,{service:'regular'}>),pricingConfig.limits.personHours,.25);
    if (hours !== null) assignSelection('hours',hours,'hours');
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
  if (selection?.service === 'windows' && draft.service === 'windows' && fields.windowAccess) {
    const access = canonical(fields.windowAccess);
    if (/^(?:schwer zuganglich|schwer erreichbar|difficult access|difficult to reach|dificil acceso|acceso dificil|acesso dificil|difficile accesso|difficiles? d['’]acces)$/.test(access)) assignSelection('difficultAccess',true,'windowAccess');
    else if (/^(?:gut erreichbar|leicht zuganglich|easy access|easy to reach|facil acceso|acceso facil|facilmente acessiveis|facile accesso|faciles? d['’]acces)$/.test(access)) assignSelection('difficultAccess',false,'windowAccess');
  }
  if (selection?.service === 'moving' && draft.service === 'moving') {
    const rooms = numeric(fields.rooms,1,pricingConfig.limits.rooms,.5);
    if (rooms !== null) assignSelection('rooms',rooms,'rooms');
    const hours = numeric(fields.hours,.25,pricingConfig.limits.personHours,.25);
    // Supplying a duration does not select a team or an hourly contract.
    if (selection.mode === 'hourly' && hours !== null) assignSelection('estimatedHours',hours,'hours');
    if (fields.inventory) assignSelection('details',fields.inventory,'inventory');
    for (const [field,prefix] of [['originAccess','origin'],['destinationAccess','destination']] as const) {
      if (!fields[field]) continue;
      const access = explicitAccess(fields[field]);
      if (access.floor !== undefined) assignSelection(`${prefix}Floor`,access.floor,field);
      if (access.lift !== undefined) assignSelection(`${prefix}Lift`,access.lift,field);
      if (!access.complete || policy==='preserve' && conflicts.has(field)) handled.delete(field);
    }
  }
  if (fields.priorities && (selection?.service === 'regular' || selection?.service === 'endOfTenancy')) {
    const serviceExtras = selection.service === 'regular' ? priorityExtras.regular : priorityExtras.end;
    const residual = fields.priorities.split(/\s+(?:und|and|y|e|et)\s+|[,;\n]+/iu).map(part=>part.trim()).filter(Boolean).filter(part=>{
      const normalized=canonical(part), negative=selection.service==='regular'?negatedPriority(normalized):undefined;
      const extra = serviceExtras.find(extra=>extra.pattern.test(negative??normalized));
      if (!extra) return true;
      const match = (negative??normalized).match(extra.pattern)!;
      const amount = selection.service === 'regular' ? negative===undefined : Number(match[1]);
      if (typeof amount === 'number' && (!Number.isSafeInteger(amount) || amount>pricingConfig.limits.count)) return true;
      assignSelection(extra.key,amount,'priorities');
      return policy==='preserve' && conflicts.has('priorities');
    });
    if (!residual.length) handled.add('priorities');
    else { fields.priorities = residual.join(', '); handled.delete('priorities'); }
  }
  for (const field of KAI_FIELDS) {
    if (!fields[field] || handled.has(field)) continue;
    result.remainingFields[field] = fields[field];
    notes.push(field === 'notes' ? fields[field]! : `${kaiDraftFieldLabel(field, draft.language)}: ${fields[field]}`);
  }
  const append = (old: string, additions: string[]) => [old, ...additions.filter(note => !old.includes(note))].filter(Boolean).join('\n');
  // Keep every supplied fact visible even when there is no exact control, or a conflict was preserved.
  // Long drafts remain available in the transfer summary instead of silently exceeding API limits.
  const nextNotes = append(result.notes, notes);
  if (nextNotes.length <= 3000) result.notes = nextNotes;
  else conflicts.add('notes');
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
