/**
 * Kraken's 24 November 2026 proposed preview tariff. Not a live tariff activation.
 * Prices and all calculated monetary values are integer CHF rappen.
 * This module does not accept a client-supplied price or infer work durations.
 */
export const PRICING_VERSION = 'kraken-private-2026-11-24-proposal-v2';
export const MATERIALS_PER_VISIT_CENTS = 1_000; // User offered CHF 4/h OR CHF 10/visit; use the explicit flat alternative.
export const MIN_LABOUR_RATE_CENTS = 4_000;
export const REFERENCE_VAT_BASIS_POINTS = 810;
export const PRICING_LIMITS = Object.freeze({ count: 1_000, areaM2: 10_000, personHours: 168, rooms: 100 });

export type RegularFrequency = 'weekly' | 'fortnightly' | 'monthly' | 'once';
export interface RegularSelection {
  service: 'regular'; frequency: RegularFrequency; hours: number;
  materials: boolean; oven: boolean; fridge: boolean; ironingHours: number;
}
export interface EndOfTenancySelection {
  service: 'endOfTenancy'; mode: 'fixed' | 'hourly'; propertyType: 'apartment' | 'house';
  rooms: number; areaM2: number; hours: number; bathrooms: number; guestWcs: number;
  slatBlinds: number; rollerShutters: number; smallBalconies: number; largeBalconies: number;
  storageRooms: number; garages: number; carpetRooms: number; heavySoiling: boolean;
}
export interface ConstructionSelection {
  service: 'construction'; mode: 'area' | 'hourly'; level: 'light' | 'full';
  areaM2: number; hours: number; cementM2: number; filmWindows: number; slatBlinds: number;
  extraArea: boolean;
}
export interface WindowSelection {
  service: 'windows'; standard: number; double: number; balconyDoors: number; roof: number;
  slatBlinds: number; rollerShutters: number; difficultAccess: boolean; winterGarden: boolean;
}
export interface MovingSelection { service: 'moving'; details?: string; }
export type BookingSelection = RegularSelection | EndOfTenancySelection | ConstructionSelection | WindowSelection | MovingSelection;
export type BookingService = BookingSelection['service'];
export type SelectionFor<S extends BookingService> = Extract<BookingSelection, { service: S }>;
export type PriceUnit = 'hour' | 'visit' | 'm2' | 'unit' | 'package';

export interface PriceLine {
  id: string;
  label: string;
  labelKey: string;
  quantity: number;
  unit: PriceUnit;
  unitPriceCents: number;
  totalCents: number;
  params?: Record<string, string | number | boolean>;
}
export interface PriceNotice { code: string; label: string; labelKey: string; }
export interface AppliedTier { rooms: number; maxAreaM2: number; priceCents: number; raisedForArea: boolean; }
export interface PriceQuote {
  pricingVersion: string;
  currency: 'CHF';
  service: BookingService;
  lines: PriceLine[];
  /** Sum of known line items. If review is required this is NOT the final price. */
  subtotalCents: number;
  /** Null means no binding price exists and checkout must be disabled. */
  totalCents: number | null;
  taxStatus: 'not_registered';
  vatCents: 0;
  /** Hypothetical same-net-price comparison, never a discount or an actual tax. */
  vatComparisonCents: number | null;
  manualReviewReasons: PriceNotice[];
  notices: PriceNotice[];
  appliedTier?: AppliedTier;
  /** Revenue/hour budget after the separate materials fee; NOT an estimated duration or profit guarantee. */
  maxAffordablePersonHours: number | null;
  /** Explicitly booked person-hours only. Fixed-job/add-on work durations are not invented. */
  bookedPersonHours?: number;
}

export class PricingValidationError extends Error {
  readonly name = 'PricingValidationError';
  readonly labelKey: string;
  constructor(readonly code: string, readonly field: string, message: string) {
    super(message);
    this.labelKey = `pricing.errors.${code}`;
  }
}

export const END_OF_TENANCY_TIERS = Object.freeze([
  { rooms: 1.5, maxAreaM2: 45, priceCents: 45_000 },
  { rooms: 2.5, maxAreaM2: 65, priceCents: 56_000 },
  { rooms: 3.5, maxAreaM2: 90, priceCents: 69_000 },
  { rooms: 4.5, maxAreaM2: 115, priceCents: 83_000 },
  { rooms: 5.5, maxAreaM2: 140, priceCents: 99_000 },
]);

export const REGULAR_RATES: Readonly<Record<RegularFrequency, number>> = Object.freeze({ weekly: 4_000, fortnightly: 4_100, monthly: 4_200, once: 4_400 });
const FREQUENCY_LABELS: Record<RegularFrequency, string> = {
  weekly: 'wöchentlich', fortnightly: 'alle 2 Wochen', monthly: 'monatlich', once: 'einmalig',
};

function fail(code: string, field: string, message: string): never {
  throw new PricingValidationError(code, field, message);
}
function choice<T extends string>(value: unknown, field: string, options: readonly T[]): T {
  if (typeof value !== 'string' || !options.includes(value as T)) fail('invalid_choice', field, 'Bitte eine gültige Auswahl treffen.');
  return value as T;
}
function numeric(value: unknown, field: string, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) fail('invalid_number', field, 'Bitte eine gültige Zahl eingeben.');
  if (value < min || value > max) fail('out_of_range', field, `Der Wert muss zwischen ${min} und ${max} liegen.`);
  return value;
}
function count(value: unknown, field: string, fallback = 0): number {
  const result = numeric(value === undefined ? fallback : value, field, 0, PRICING_LIMITS.count);
  if (!Number.isSafeInteger(result)) fail('integer_required', field, 'Bitte eine ganze Anzahl eingeben.');
  return result;
}
function flag(value: unknown, field: string): boolean {
  if (value === undefined) return false;
  if (typeof value !== 'boolean') fail('invalid_boolean', field, 'Bitte eine gültige Ja-/Nein-Auswahl treffen.');
  return value;
}
function area(value: unknown, field: string, allowZero = false): number {
  const result = numeric(value, field, allowZero ? 0 : 0.01, PRICING_LIMITS.areaM2);
  if (Math.abs(result * 100 - Math.round(result * 100)) > 1e-7) fail('two_decimal_places', field, 'Flächen dürfen höchstens zwei Nachkommastellen haben.');
  return Math.round(result * 100) / 100;
}
function hours(value: unknown, field: string, minimum: number): number {
  const result = numeric(value, field, minimum, PRICING_LIMITS.personHours);
  if (!Number.isSafeInteger(result * 4)) fail('quarter_hour_required', field, 'Bitte die Arbeitszeit in Schritten von 15 Minuten wählen.');
  return result;
}
function centsForArea(rateCents: number, m2: number): number {
  const hundredths = Math.round(m2 * 100);
  return Math.floor((rateCents * hundredths + 50) / 100);
}
function notice(code: string, label: string): PriceNotice {
  return { code, label, labelKey: `pricing.notices.${code}` };
}

/** Throws on malformed inputs; returns totalCents:null for legitimate quote-only services. */
export function calculatePrice(selection: BookingSelection): PriceQuote {
  if (!selection || typeof selection !== 'object' || Array.isArray(selection)) fail('invalid_selection', 'selection', 'Bitte eine Leistung auswählen.');
  const service = choice(selection.service, 'service', ['regular', 'endOfTenancy', 'construction', 'windows', 'moving'] as const);
  const lines: PriceLine[] = [];
  const manualReviewReasons: PriceNotice[] = [];
  const notices: PriceNotice[] = [];
  let appliedTier: AppliedTier | undefined;
  let bookedPersonHours: number | undefined;
  let materialsCents = 0;
  const add = (id: string, label: string, quantity: number, unit: PriceUnit, unitPriceCents: number, params?: PriceLine['params'], totalOverride?: number) => {
    if (quantity <= 0) return;
    const totalCents = totalOverride ?? Math.round(quantity * unitPriceCents);
    if (!Number.isSafeInteger(unitPriceCents) || !Number.isSafeInteger(totalCents) || totalCents < 0) fail('invalid_total', 'total', 'Der Preis konnte nicht sicher berechnet werden.');
    lines.push({ id, label, labelKey: `pricing.lines.${id}`, quantity, unit, unitPriceCents, totalCents, ...(params ? { params } : {}) });
  };
  const knownSubtotal = () => lines.reduce((sum, line) => sum + line.totalCents, 0);

  switch (service) {
    case 'regular': {
      const s = selection as RegularSelection;
      const frequency = choice(s.frequency, 'frequency', ['weekly', 'fortnightly', 'monthly', 'once'] as const);
      const cleaningHours = hours(s.hours, 'hours', frequency === 'once' ? 3 : 2.5);
      const ironingHours = hours(s.ironingHours ?? 0, 'ironingHours', 0);
      add('regular-labour', `Unterhaltsreinigung – ${FREQUENCY_LABELS[frequency]}`, cleaningHours, 'hour', REGULAR_RATES[frequency], { frequency });
      if (flag(s.materials, 'materials')) {
        materialsCents = MATERIALS_PER_VISIT_CENTS;
        add('regular-materials', 'Reinigungsmittel & Material von Kraken – pro Besuch', 1, 'visit', materialsCents);
      }
      if (flag(s.oven, 'oven')) add('regular-oven', 'Backofen innen – Zusatzleistung', 1, 'unit', 3_500);
      if (flag(s.fridge, 'fridge')) add('regular-fridge', 'Kühlschrank innen – Zusatzleistung', 1, 'unit', 3_000);
      add('regular-ironing', 'Bügeln – zusätzliche Arbeitszeit', ironingHours, 'hour', 4_000);
      bookedPersonHours = cleaningHours + ironingHours;
      break;
    }
    case 'endOfTenancy': {
      const s = selection as EndOfTenancySelection;
      const mode = choice(s.mode, 'mode', ['fixed', 'hourly'] as const);
      const propertyType = choice(s.propertyType, 'propertyType', ['apartment', 'house'] as const);
      const rooms = numeric(s.rooms, 'rooms', 1, PRICING_LIMITS.rooms);
      if (!Number.isSafeInteger(rooms * 2)) fail('half_room_required', 'rooms', 'Bitte die Zimmerzahl in halben oder ganzen Zimmern angeben.');
      const m2 = area(s.areaM2, 'areaM2');
      if (propertyType === 'house') manualReviewReasons.push(notice('house_visit_required', 'Einfamilienhaus: ab CHF 1’250 nach kostenloser Besichtigung. Der genaue Preis wird vorher vereinbart.'));
      if (m2 > 140) manualReviewReasons.push(notice('eot_area_over_limit', 'Für Wohnungen über 140 m² erstellen wir eine individuelle verbindliche Offerte.'));
      if (rooms > 5.5) manualReviewReasons.push(notice('eot_rooms_over_limit', 'Für mehr als 5.5 Zimmer erstellen wir eine individuelle verbindliche Offerte.'));
      if (mode === 'hourly') {
        const h = hours(s.hours, 'hours', 3);
        add('eot-hourly', 'Stundenreinigung ohne Abnahmegarantie', h, 'hour', 4_500);
        bookedPersonHours = h;
        notices.push(notice('hourly_no_handover_guarantee', 'Gebucht wird ein festes Arbeitszeitkontingent ohne Abnahmegarantie. Zusatzleistungen werden separat ausgewiesen.'));
      } else if (propertyType === 'apartment' && m2 <= 140 && rooms <= 5.5) {
        const roomIndex = END_OF_TENANCY_TIERS.findIndex(tier => rooms <= tier.rooms);
        const areaIndex = END_OF_TENANCY_TIERS.findIndex(tier => m2 <= tier.maxAreaM2);
        const tier = END_OF_TENANCY_TIERS[Math.max(roomIndex, areaIndex)];
        appliedTier = { ...tier, raisedForArea: areaIndex > roomIndex };
        add('eot-package', `Umzugsreinigung mit Abnahmegarantie – bis ${tier.rooms} Zimmer / ${tier.maxAreaM2} m²`, 1, 'package', tier.priceCents, { tierRooms: tier.rooms, maxAreaM2: tier.maxAreaM2 });
        if (appliedTier.raisedForArea) notices.push(notice('higher_area_tier', 'Die Wohnfläche überschreitet die gewählte Zimmerkategorie. Es gilt die höhere Flächenkategorie; der angezeigte Gesamtpreis berücksichtigt diese bereits.'));
      }
      add('eot-bathroom', 'Zusätzliches Bad mit Dusche oder Badewanne', Math.max(0, count(s.bathrooms, 'bathrooms', 1) - 1), 'unit', 6_500);
      add('eot-guest-wc', 'Gäste-WC mit Waschbecken', count(s.guestWcs, 'guestWcs'), 'unit', 3_500);
      add('eot-slat-blinds', 'Lamellenstoren', count(s.slatBlinds, 'slatBlinds'), 'unit', 1_200);
      add('eot-roller-shutters', 'Rollläden', count(s.rollerShutters, 'rollerShutters'), 'unit', 800);
      add('eot-small-balcony', 'Balkon klein – bis 8 m²', count(s.smallBalconies, 'smallBalconies'), 'unit', 4_500);
      add('eot-large-balcony', 'Terrasse / Balkon gross – über 8 m²', count(s.largeBalconies, 'largeBalconies'), 'unit', 8_000);
      add('eot-storage', 'Kellerabteil / Estrich', count(s.storageRooms, 'storageRooms'), 'unit', 4_000);
      add('eot-garage', 'Garagenbox', count(s.garages, 'garages'), 'unit', 4_500);
      add('eot-carpet', 'Teppich-Shampoonierung – pro Zimmer', count(s.carpetRooms, 'carpetRooms'), 'unit', 8_500);
      if (flag(s.heavySoiling, 'heavySoiling')) {
        const basisCents = knownSubtotal();
        const surchargeCents = Math.floor((basisCents * 15 + 50) / 100);
        if (surchargeCents > 0) add('eot-heavy-soiling', 'Starke Verschmutzung – 15 % auf Reinigung und Extras', 1, 'package', surchargeCents, { percentage: 15, basisCents });
      }
      break;
    }
    case 'construction': {
      const s = selection as ConstructionSelection;
      const mode = choice(s.mode, 'mode', ['area', 'hourly'] as const);
      const level = choice(s.level, 'level', ['light', 'full'] as const);
      const m2 = area(s.areaM2, 'areaM2', mode === 'hourly');
      if (mode === 'hourly') {
        const h = hours(s.hours, 'hours', 4);
        add('construction-hourly', 'Baureinigung auf Stundenbasis', h, 'hour', 4_800);
        bookedPersonHours = h;
      } else {
        const rate = level === 'light' ? 750 : 950;
        const minimum = level === 'light' ? 32_000 : 42_000;
        const base = centsForArea(rate, m2);
        add('construction-base', level === 'light' ? 'Leichte Baureinigung / Feinreinigung' : 'Neubau / Komplettsanierung', m2, 'm2', rate, { level }, base);
        if (base < minimum) add('construction-minimum', 'Aufschlag bis zum Mindestauftrag für die Grundreinigung', 1, 'package', minimum - base, { minimumCents: minimum });
      }
      const cementM2 = area(s.cementM2 ?? 0, 'cementM2', true);
      if (mode === 'area' && cementM2 > m2) fail('cement_area_exceeds_total', 'cementM2', 'Die Fläche mit Zement- oder Gipsresten darf die Reinigungsfläche nicht überschreiten.');
      add('construction-cement', 'Zementschleier / Gipsreste entfernen', cementM2, 'm2', 350, undefined, centsForArea(350, cementM2));
      add('construction-film', 'Schutzfolien & Aufkleber entfernen – pro Fenster', count(s.filmWindows, 'filmWindows'), 'unit', 800);
      add('construction-slat-blinds', 'Storen – pro Fenster', count(s.slatBlinds, 'slatBlinds'), 'unit', 1_200);
      if (flag(s.extraArea, 'extraArea')) manualReviewReasons.push(notice('construction_extra_area_quote_required', 'Terrasse / Wintergarten / Garage: CHF 60–100 zusätzlich. Der genaue Umfang und Preis werden vor der Zahlung bestätigt.'));
      break;
    }
    case 'windows': {
      const s = selection as WindowSelection;
      const standard = count(s.standard, 'standard');
      const double = count(s.double, 'double');
      const balconyDoors = count(s.balconyDoors, 'balconyDoors');
      const roof = count(s.roof, 'roof');
      const windows = standard + double + balconyDoors + roof;
      if (windows < 1) fail('windows_required', 'standard', 'Bitte mindestens ein Fenster auswählen.');
      const slatBlinds = count(s.slatBlinds, 'slatBlinds');
      const rollerShutters = count(s.rollerShutters, 'rollerShutters');
      if (slatBlinds + rollerShutters > windows) fail('blinds_exceed_windows', 'slatBlinds', 'Bitte höchstens einen Typ Aussenstoren pro ausgewähltem Fenster angeben.');
      add('windows-standard', 'Einfachfenster – innen/aussen, Rahmen & Fensterbank', standard, 'unit', 1_600);
      add('windows-double', 'Doppelfenster – innen/aussen, Rahmen & Fensterbank', double, 'unit', 2_400);
      add('windows-balcony-door', 'Balkontür / bodentiefes Fenster', balconyDoors, 'unit', 2_800);
      add('windows-roof', 'Dachfenster', roof, 'unit', 2_500);
      add('windows-slat-blinds', 'Lamellenstoren – pro Fenster', slatBlinds, 'unit', 1_200);
      add('windows-roller-shutters', 'Rollläden – pro Fenster', rollerShutters, 'unit', 800);
      // The supplied tariff says CHF 35, not CHF 35 per window: charge it once per visit.
      if (flag(s.difficultAccess, 'difficultAccess')) add('windows-difficult-access', 'Schwer zugängliche Fenster über 3 m – einmalig pro Besuch', 1, 'visit', 3_500);
      if (flag(s.winterGarden, 'winterGarden')) manualReviewReasons.push(notice('window_winter_garden_quote_required', 'Wintergarten: CHF 180–320 zusätzlich, je nach Grösse. Vor der Zahlung vereinbaren wir den genauen Preis.'));
      // This is the minimum order value including selected cleaning extras, not a minimum followed by extras again.
      const windowsSubtotal = knownSubtotal();
      if (windowsSubtotal < 12_000) add('windows-minimum', 'Aufschlag bis zum Mindestbestellwert pro Besuch', 1, 'visit', 12_000 - windowsSubtotal, { minimumCents: 12_000 });
      break;
    }
    case 'moving': {
      const s = selection as MovingSelection;
      if (s.details !== undefined && (typeof s.details !== 'string' || s.details.length > 5_000)) fail('invalid_details', 'details', 'Bitte eine Beschreibung mit höchstens 5’000 Zeichen eingeben.');
      manualReviewReasons.push(notice('moving_tariff_not_configured', 'Für Ihren kleinen Umzug erhalten Sie eine verbindliche Offerte nach Prüfung von Strecke, Umfang und Zugang.'));
      break;
    }
  }

  const subtotalCents = knownSubtotal();
  if (!Number.isSafeInteger(subtotalCents) || subtotalCents < 0) fail('invalid_total', 'total', 'Der Preis konnte nicht sicher berechnet werden.');
  const totalCents = manualReviewReasons.length ? null : subtotalCents;
  return {
    pricingVersion: PRICING_VERSION, currency: 'CHF', service, lines, subtotalCents, totalCents,
    taxStatus: 'not_registered', vatCents: 0,
    vatComparisonCents: totalCents === null ? null : Math.floor((totalCents * 81 + 500) / 1_000),
    manualReviewReasons, notices,
    ...(appliedTier ? { appliedTier } : {}),
    maxAffordablePersonHours: totalCents === null ? null : (totalCents - materialsCents) / MIN_LABOUR_RATE_CENTS,
    ...(bookedPersonHours !== undefined ? { bookedPersonHours } : {}),
  };
}

export function defaultSelection<S extends BookingService>(service: S): SelectionFor<S> {
  const selections: { [K in BookingService]: SelectionFor<K> } = {
    regular: { service: 'regular', frequency: 'weekly', hours: 2.5, materials: false, oven: false, fridge: false, ironingHours: 0 },
    endOfTenancy: { service: 'endOfTenancy', mode: 'fixed', propertyType: 'apartment', rooms: 2.5, areaM2: 65, hours: 3, bathrooms: 1, guestWcs: 0, slatBlinds: 0, rollerShutters: 0, smallBalconies: 0, largeBalconies: 0, storageRooms: 0, garages: 0, carpetRooms: 0, heavySoiling: false },
    construction: { service: 'construction', mode: 'area', level: 'light', areaM2: 50, hours: 4, cementM2: 0, filmWindows: 0, slatBlinds: 0, extraArea: false },
    windows: { service: 'windows', standard: 4, double: 2, balconyDoors: 0, roof: 0, slatBlinds: 0, rollerShutters: 0, difficultAccess: false, winterGarden: false },
    moving: { service: 'moving', details: '' },
  };
  const valid = choice(service, 'service', ['regular', 'endOfTenancy', 'construction', 'windows', 'moving'] as const);
  return { ...selections[valid] } as SelectionFor<S>;
}
