/** All tariffs come from the shared configuration; monetary values are CHF rappen. */
import { pricingConfig } from './pricingConfig.ts';
export { pricingConfig } from './pricingConfig.ts';
export const PRICING_VERSION = pricingConfig.version;
export const MATERIALS_PER_VISIT_CENTS = pricingConfig.regular.extras.materialsPerVisitCents;
export const MIN_LABOUR_RATE_CENTS = pricingConfig.minimumLabourRateCents;
export const REFERENCE_VAT_BASIS_POINTS = Math.round(pricingConfig.vat.rate*10_000);
export const PRICING_LIMITS:Readonly<Record<keyof typeof pricingConfig.limits,number>> = pricingConfig.limits;

export type RegularFrequency = 'weekly' | 'fortnightly' | 'monthly' | 'once';
export const REGULAR_MINIMUM_HOURS: Readonly<Record<RegularFrequency, number>> = pricingConfig.regular.minimumHours;
export interface RegularSelection {
  service: 'regular'; frequency: RegularFrequency; hours: number;
  /** Missing on historical one-off deep-clean selections; keep their existing minimum. */
  cleaningKind?: 'regular' | 'deep';
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
export interface MovingSelection {
  service:'moving'; mode?:'hourly'|'fixed'; team?:1|2; estimatedHours?:number; additionalHelpers?:number;
  rooms?:number; distanceKm?:number; originFloor?:number; originLift?:boolean; destinationFloor?:number; destinationLift?:boolean;
  largeWardrobes?:number; disposalM3?:number; boxes?:number; piano?:boolean; safe?:boolean; furnitureLift?:boolean;
  cleaning?:EndOfTenancySelection; sameAddress?:boolean; details?:string;
}
export type BookingSelection = RegularSelection | EndOfTenancySelection | ConstructionSelection | WindowSelection | MovingSelection;
export type BookingService = BookingSelection['service'];
export type SelectionFor<S extends BookingService> = Extract<BookingSelection, { service: S }>;
export type PriceUnit = 'hour' | 'visit' | 'm2' | 'm3' | 'unit' | 'package';

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
  priceType:'fixed'|'estimate'|'from'|'personal';
  /** Minimum confirmed order for hourly work, including booked extras and travel; null forbids payment. */
  depositBasisCents:number|null;
  /** A non-binding minimum for request-only cases, never a payable total. */
  fromPriceCents?:number;
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

export const END_OF_TENANCY_TIERS = pricingConfig.endOfTenancy.tiers;
export const REGULAR_RATES: Readonly<Record<RegularFrequency, number>> = pricingConfig.regular.rates;
export const MOVING_RATES=pricingConfig.moving;
export function getRegularMinimumHours(selection:Pick<RegularSelection,'frequency'|'cleaningKind'>):number {
  return selection.cleaningKind==='deep'||selection.cleaningKind===undefined&&selection.frequency==='once'
    ?pricingConfig.regular.deep.minimumHours:REGULAR_MINIMUM_HOURS[selection.frequency];
}
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
  let priceType:PriceQuote['priceType']='fixed';
  let depositBasisCents:number|undefined;
  let fromPriceCents:number|undefined;
  const add = (id: string, label: string, quantity: number, unit: PriceUnit, unitPriceCents: number, params?: PriceLine['params'], totalOverride?: number) => {
    if (quantity <= 0) return;
    const totalCents = totalOverride ?? Math.round(quantity * unitPriceCents);
    if (!Number.isSafeInteger(unitPriceCents) || !Number.isSafeInteger(totalCents) || (totalCents < 0 && id !== 'moving-combo')) fail('invalid_total', 'total', 'Der Preis konnte nicht sicher berechnet werden.');
    lines.push({ id, label, labelKey: `pricing.lines.${id}`, quantity, unit, unitPriceCents, totalCents, ...(params ? { params } : {}) });
  };
  const knownSubtotal = () => lines.reduce((sum, line) => sum + line.totalCents, 0);

  switch (service) {
    case 'regular': {
      const s = selection as RegularSelection;
      const frequency = choice(s.frequency, 'frequency', ['weekly', 'fortnightly', 'monthly', 'once'] as const);
      const cleaningKind=s.cleaningKind===undefined?(frequency==='once'?'deep':'regular'):choice(s.cleaningKind,'cleaningKind',['regular','deep'] as const);
      if(cleaningKind==='deep'&&frequency!=='once')fail('invalid_choice','frequency','Grundreinigung wird einmalig gebucht.');
      const minimumHours = getRegularMinimumHours(s);
      const cleaningHours = hours(s.hours, 'hours', minimumHours);
      const ironingHours = hours(s.ironingHours ?? 0, 'ironingHours', 0);
      const rateCents = cleaningKind==='deep'?pricingConfig.regular.deep.hourlyRateCents:REGULAR_RATES[frequency];
      add('regular-labour', `Unterhaltsreinigung – ${FREQUENCY_LABELS[frequency]}`, cleaningHours, 'hour', rateCents, { frequency,cleaningKind });
      if (flag(s.materials, 'materials')) {
        materialsCents = MATERIALS_PER_VISIT_CENTS;
        add('regular-materials', 'Reinigungsmittel & Material von Kraken – pro Besuch', 1, 'visit', materialsCents);
      }
      if (flag(s.oven, 'oven')) add('regular-oven', 'Backofen innen – Zusatzleistung', 1, 'unit', pricingConfig.regular.extras.ovenCents);
      if (flag(s.fridge, 'fridge')) add('regular-fridge', 'Kühlschrank innen – Zusatzleistung', 1, 'unit', pricingConfig.regular.extras.fridgeCents);
      add('regular-ironing', 'Bügeln – zusätzliche Arbeitszeit', ironingHours, 'hour', pricingConfig.regular.extras.ironingHourlyRateCents);
      bookedPersonHours = cleaningHours + ironingHours;
      // Materials, fixed extras and explicitly ordered ironing remain in the minimum scope.
      // Cleaning travel is already included in the tariff; do not add a second travel fee.
      depositBasisCents = knownSubtotal() - (cleaningHours - minimumHours) * rateCents;
      priceType = 'estimate';
      break;
    }
    case 'endOfTenancy': {
      const s = selection as EndOfTenancySelection;
      const mode = choice(s.mode, 'mode', ['fixed', 'hourly'] as const);
      const propertyType = choice(s.propertyType, 'propertyType', ['apartment', 'house'] as const);
      const rooms = numeric(s.rooms, 'rooms', 1, PRICING_LIMITS.rooms);
      if (!Number.isSafeInteger(rooms * 2)) fail('half_room_required', 'rooms', 'Bitte die Zimmerzahl in halben oder ganzen Zimmern angeben.');
      const m2 = area(s.areaM2, 'areaM2');
      const roomIndex=END_OF_TENANCY_TIERS.findIndex(tier=>rooms<=tier.rooms);
      const tier=roomIndex>=0?END_OF_TENANCY_TIERS[roomIndex]:undefined;
      const roundedM2=Math.ceil(m2),excessM2=tier?Math.max(0,roundedM2-tier.maxAreaM2):0;
      let hourlyLabourAboveMinimumCents = 0;
      if (propertyType === 'house') manualReviewReasons.push(notice('house_visit_required', `Einfamilienhaus: ab CHF ${pricingConfig.endOfTenancy.houseFromCents/100} nach kostenloser Besichtigung. Der genaue Preis wird vorher vereinbart.`));
      if (excessM2>pricingConfig.endOfTenancy.maxExcessAreaM2) manualReviewReasons.push(notice('eot_excess_area_over_limit', `Mehr als ${pricingConfig.endOfTenancy.maxExcessAreaM2} m² Mehrfläche: persönliche verbindliche Offerte.`));
      if (!tier) manualReviewReasons.push(notice('eot_rooms_over_limit', 'Für mehr als 5.5 Zimmer erstellen wir eine individuelle verbindliche Offerte.'));
      if (mode === 'hourly') {
        const h = hours(s.hours, 'hours', pricingConfig.endOfTenancy.hourly.minimumHours);
        add('eot-hourly', 'Stundenreinigung ohne Abnahmegarantie', h, 'hour', pricingConfig.endOfTenancy.hourly.rateCents);
        bookedPersonHours = h;
        hourlyLabourAboveMinimumCents = (h - pricingConfig.endOfTenancy.hourly.minimumHours) * pricingConfig.endOfTenancy.hourly.rateCents;
        priceType = 'estimate';
        notices.push(notice('hourly_no_handover_guarantee', 'Reinigung nach Aufwand ohne Abnahmegarantie. Nach der Mindestdauer wird die tatsächliche Arbeitszeit in 15-Minuten-Schritten abgerechnet. Zusatzleistungen werden separat ausgewiesen.'));
      } else if (propertyType === 'apartment' && tier && excessM2<=pricingConfig.endOfTenancy.maxExcessAreaM2) {
        appliedTier = { ...tier, raisedForArea:false };
        add('eot-package', `Umzugsreinigung mit Abnahmegarantie – bis ${tier.rooms} Zimmer / ${tier.maxAreaM2} m²`, 1, 'package', tier.priceCents, { tierRooms: tier.rooms, maxAreaM2: tier.maxAreaM2 });
        if(excessM2){
          const requestedSurchargeCents=excessM2*pricingConfig.endOfTenancy.excessAreaRateCents;
          const next=END_OF_TENANCY_TIERS[roomIndex+1];
          const surchargeCents=next?Math.min(requestedSurchargeCents,next.priceCents-tier.priceCents):requestedSurchargeCents;
          const capped=surchargeCents<requestedSurchargeCents;
          add('eot-extra-area',`Mehrfläche: +${excessM2} m² × CHF ${pricingConfig.endOfTenancy.excessAreaRateCents/100}${capped?` (auf CHF ${surchargeCents/100} begrenzt; Reinigung höchstens CHF ${next!.priceCents/100})`:''}`,excessM2,'m2',pricingConfig.endOfTenancy.excessAreaRateCents,{excessM2,requestedSurchargeCents,capped,capCents:next?.priceCents??0},surchargeCents);
        }
      }
      add('eot-bathroom', 'Zusätzliches Bad mit Dusche oder Badewanne', Math.max(0, count(s.bathrooms, 'bathrooms', 1) - 1), 'unit', pricingConfig.endOfTenancy.extras.bathroomCents);
      add('eot-guest-wc', 'Gäste-WC mit Waschbecken', count(s.guestWcs, 'guestWcs'), 'unit', pricingConfig.endOfTenancy.extras.guestWcCents);
      add('eot-slat-blinds', 'Lamellenstoren', count(s.slatBlinds, 'slatBlinds'), 'unit', pricingConfig.endOfTenancy.extras.slatBlindsCents);
      add('eot-roller-shutters', 'Rollläden', count(s.rollerShutters, 'rollerShutters'), 'unit', pricingConfig.endOfTenancy.extras.rollerShutterCents);
      add('eot-small-balcony', 'Balkon klein – bis 8 m²', count(s.smallBalconies, 'smallBalconies'), 'unit', pricingConfig.endOfTenancy.extras.smallBalconyCents);
      add('eot-large-balcony', 'Terrasse / Balkon gross – über 8 m²', count(s.largeBalconies, 'largeBalconies'), 'unit', pricingConfig.endOfTenancy.extras.largeBalconyCents);
      add('eot-storage', 'Kellerabteil / Estrich', count(s.storageRooms, 'storageRooms'), 'unit', pricingConfig.endOfTenancy.extras.storageCents);
      add('eot-garage', 'Garagenbox', count(s.garages, 'garages'), 'unit', pricingConfig.endOfTenancy.extras.garageCents);
      add('eot-carpet', 'Teppich-Shampoonierung – pro Zimmer', count(s.carpetRooms, 'carpetRooms'), 'unit', pricingConfig.endOfTenancy.extras.carpetRoomCents);
      if (mode === 'hourly') depositBasisCents = knownSubtotal() - hourlyLabourAboveMinimumCents;
      if (flag(s.heavySoiling, 'heavySoiling')) {
        const basisCents = knownSubtotal();
        const surchargeCents = Math.floor((basisCents * pricingConfig.endOfTenancy.extras.heavySoilingPercent + 50) / 100);
        if (surchargeCents > 0) add('eot-heavy-soiling', `Starke Verschmutzung – ${pricingConfig.endOfTenancy.extras.heavySoilingPercent} % auf Reinigung und Extras`, 1, 'package', surchargeCents, { percentage: pricingConfig.endOfTenancy.extras.heavySoilingPercent, basisCents });
        if (depositBasisCents !== undefined) depositBasisCents += Math.floor((depositBasisCents * pricingConfig.endOfTenancy.extras.heavySoilingPercent + 50) / 100);
      }
      break;
    }
    case 'construction': {
      const s = selection as ConstructionSelection;
      const mode = choice(s.mode, 'mode', ['area', 'hourly'] as const);
      const level = choice(s.level, 'level', ['light', 'full'] as const);
      const m2 = area(s.areaM2, 'areaM2', mode === 'hourly');
      let hourlyLabourAboveMinimumCents = 0;
      if (mode === 'hourly') {
        const h = hours(s.hours, 'hours', pricingConfig.construction.hourly.minimumHours);
        add('construction-hourly', 'Baureinigung auf Stundenbasis', h, 'hour', pricingConfig.construction.hourly.rateCents);
        bookedPersonHours = h;
        hourlyLabourAboveMinimumCents = (h - pricingConfig.construction.hourly.minimumHours) * pricingConfig.construction.hourly.rateCents;
        priceType = 'estimate';
      } else {
        const rate = pricingConfig.construction.area[level].rateCents;
        const minimum = pricingConfig.construction.area[level].minimumCents;
        const base = centsForArea(rate, m2);
        add('construction-base', level === 'light' ? 'Leichte Baureinigung / Feinreinigung' : 'Neubau / Komplettsanierung', m2, 'm2', rate, { level }, base);
        if (base < minimum) add('construction-minimum', 'Aufschlag bis zum Mindestauftrag für die Grundreinigung', 1, 'package', minimum - base, { minimumCents: minimum });
      }
      const cementM2 = area(s.cementM2 ?? 0, 'cementM2', true);
      if (mode === 'area' && cementM2 > m2) fail('cement_area_exceeds_total', 'cementM2', 'Die Fläche mit Zement- oder Gipsresten darf die Reinigungsfläche nicht überschreiten.');
      add('construction-cement', 'Zementschleier / Gipsreste entfernen', cementM2, 'm2', pricingConfig.construction.extras.cementPerM2Cents, undefined, centsForArea(pricingConfig.construction.extras.cementPerM2Cents, cementM2));
      add('construction-film', 'Schutzfolien & Aufkleber entfernen – pro Fenster', count(s.filmWindows, 'filmWindows'), 'unit', pricingConfig.construction.extras.filmWindowCents);
      add('construction-slat-blinds', 'Storen – pro Fenster', count(s.slatBlinds, 'slatBlinds'), 'unit', pricingConfig.construction.extras.slatBlindsCents);
      if (flag(s.extraArea, 'extraArea')) manualReviewReasons.push(notice('construction_extra_area_quote_required', `Terrasse / Wintergarten / Garage: CHF ${pricingConfig.construction.extras.extraAreaFromCents/100}–${pricingConfig.construction.extras.extraAreaToCents/100} zusätzlich. Der genaue Umfang und Preis werden vor der Zahlung bestätigt.`));
      if (mode === 'hourly') depositBasisCents = knownSubtotal() - hourlyLabourAboveMinimumCents;
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
      add('windows-standard', 'Einfachfenster – innen/aussen, Rahmen & Fensterbank', standard, 'unit', pricingConfig.windows.rates.standardCents);
      add('windows-double', 'Doppelfenster – innen/aussen, Rahmen & Fensterbank', double, 'unit', pricingConfig.windows.rates.doubleCents);
      add('windows-balcony-door', 'Balkontür / bodentiefes Fenster', balconyDoors, 'unit', pricingConfig.windows.rates.balconyDoorCents);
      add('windows-roof', 'Dachfenster', roof, 'unit', pricingConfig.windows.rates.roofCents);
      add('windows-slat-blinds', 'Lamellenstoren – pro Fenster', slatBlinds, 'unit', pricingConfig.windows.rates.slatBlindsCents);
      add('windows-roller-shutters', 'Rollläden – pro Fenster', rollerShutters, 'unit', pricingConfig.windows.rates.rollerShutterCents);
      // The supplied tariff says CHF 35, not CHF 35 per window: charge it once per visit.
      if (flag(s.difficultAccess, 'difficultAccess')) add('windows-difficult-access', 'Schwer zugängliche Fenster über 3 m – einmalig pro Besuch', 1, 'visit', pricingConfig.windows.rates.difficultAccessPerVisitCents);
      if (flag(s.winterGarden, 'winterGarden')) manualReviewReasons.push(notice('window_winter_garden_quote_required', `Wintergarten: CHF ${pricingConfig.windows.winterGardenFromCents/100}–${pricingConfig.windows.winterGardenToCents/100} zusätzlich, je nach Grösse. Vor der Zahlung vereinbaren wir den genauen Preis.`));
      // This is the minimum order value including selected cleaning extras, not a minimum followed by extras again.
      const windowsSubtotal = knownSubtotal();
      if (windowsSubtotal < pricingConfig.windows.minimumCents) add('windows-minimum', 'Aufschlag bis zum Mindestbestellwert pro Besuch', 1, 'visit', pricingConfig.windows.minimumCents - windowsSubtotal, { minimumCents: pricingConfig.windows.minimumCents });
      break;
    }
    case 'moving': {
      const s = selection as MovingSelection;
      if (s.details !== undefined && (typeof s.details !== 'string' || s.details.length > 5_000)) fail('invalid_details', 'details', 'Bitte eine Beschreibung mit höchstens 5’000 Zeichen eingeben.');
      // Old saved descriptions never acquire an unrequested hourly tariff.
      if(s.mode===undefined){manualReviewReasons.push(notice('moving_details_review','Für Ihren kleinen Umzug erhalten Sie eine verbindliche Offerte nach Prüfung von Strecke, Umfang und Zugang.'));break;}
      const mode=choice(s.mode,'mode',['hourly','fixed'] as const);
      const team=numeric(s.team??1,'team',1,2);if(team!==1&&team!==2)fail('invalid_choice','team','Bitte eine oder zwei Personen wählen.');
      const additionalHelpers=count(s.additionalHelpers,'additionalHelpers');
      const rooms=numeric(s.rooms??1.5,'rooms',1,PRICING_LIMITS.rooms);
      if(!Number.isSafeInteger(rooms*2))fail('half_room_required','rooms','Bitte die Zimmerzahl in halben oder ganzen Zimmern angeben.');
      const distance=s.distanceKm===undefined?undefined:numeric(s.distanceKm,'distanceKm',0,PRICING_LIMITS.distanceKm);
      const originFloor=count(s.originFloor,'originFloor',1),destinationFloor=count(s.destinationFloor,'destinationFloor',1);
      if(originFloor>PRICING_LIMITS.floor||destinationFloor>PRICING_LIMITS.floor)fail('out_of_range','floor','Bitte eine gültige Etage wählen.');
      const originLift=flag(s.originLift,'originLift'),destinationLift=flag(s.destinationLift,'destinationLift');
      const largeWardrobes=count(s.largeWardrobes,'largeWardrobes'),disposalM3=area(s.disposalM3??0,'disposalM3',true),boxes=count(s.boxes,'boxes');
      const special=flag(s.piano,'piano')||flag(s.safe,'safe')||flag(s.furnitureLift,'furnitureLift');
      // Validate every flag, even if an earlier special item already requires review.
      flag(s.safe,'safe');flag(s.furnitureLift,'furnitureLift');
      const sameAddress=flag(s.sameAddress,'sameAddress');
      if(special)manualReviewReasons.push(notice('moving_special_items','Klavier, Tresor oder Möbellift: persönliche Offerte vor einer Zahlung.'));
      if(mode==='hourly'){
        const profile=pricingConfig.moving.hourly.teams[team as 1|2];
        const requestedHours=numeric(s.estimatedHours,'estimatedHours',0.01,PRICING_LIMITS.personHours);
        const billingParts=60/pricingConfig.moving.hourly.billingMinutes;
        const estimatedHours=Math.max(profile.minimumHours,Math.ceil(requestedHours*billingParts)/billingParts);
        add('moving-hourly',`${team} ${team===1?'Person':'Personen'} + Lieferwagen – Richtpreis`,estimatedHours,'hour',profile.hourlyRateCents,{team,estimatedHours,minimumHours:profile.minimumHours});
        add('moving-helper','Zusätzliche Helfer – geschätzte Arbeitszeit',estimatedHours*additionalHelpers,'hour',pricingConfig.moving.hourly.additionalHelperRateCents,{helpers:additionalHelpers,estimatedHours,minimumHours:profile.minimumHours});
        add('moving-travel','Anfahrtspauschale pro Auftrag',1,'visit',pricingConfig.moving.travelCents);
        depositBasisCents=profile.minimumHours*(profile.hourlyRateCents+additionalHelpers*pricingConfig.moving.hourly.additionalHelperRateCents)+pricingConfig.moving.travelCents;
        priceType='estimate';
        notices.push(notice('moving_hourly_estimate',`Richtpreis nach geschätzter Dauer. Mindestdauer ${profile.minimumHours} Stunden, danach Abrechnung in ${pricingConfig.moving.hourly.billingMinutes}-Minuten-Schritten. Anfahrt enthalten. Eine Person: Kunde hilft tragen.`));
        if(disposalM3||boxes)manualReviewReasons.push(notice('moving_hourly_extras_review','Entsorgung oder bereitgestellte Kartons beim Stundenumzug: persönliche Offerte für diese Zusatzleistungen.'));
      }else{
        const tier=pricingConfig.moving.fixed.tiers.find(tier=>rooms<=tier.rooms);
        if(distance===undefined)manualReviewReasons.push(notice('moving_distance_required','Für einen Festpreis die Strecke zwischen beiden Adressen angeben. Keine automatisch verifizierte Route.'));
        else if(distance>pricingConfig.moving.fixed.maxDistanceKm)manualReviewReasons.push(notice('moving_distance_over_limit',`Mehr als ${pricingConfig.moving.fixed.maxDistanceKm} km zwischen den Adressen: persönliche Offerte.`));
        if(!tier)manualReviewReasons.push(notice('moving_rooms_over_limit','Ab 4 Zimmern: persönliche Offerte.'));
        if(tier&&distance!==undefined&&distance<=pricingConfig.moving.fixed.maxDistanceKm&&!special){
          add(tier.priceType==='from'?'moving-fixed-from':'moving-fixed',tier.priceType==='from'?'Kleinumzug – ab Preis nach Fotos oder Besichtigung':'Kleinumzug – Festpreis',1,'package',tier.priceCents,{rooms:tier.rooms,maxDistanceKm:pricingConfig.moving.fixed.maxDistanceKm});
          if(tier.priceType==='from'){
            fromPriceCents=tier.priceCents;
            manualReviewReasons.push(notice('moving_photos_required','3–3.5 Zimmer: ab Preis. Der definitive Preis wird nach Fotos oder einer Besichtigung bestätigt; keine sofortige Zahlung.'));
          }
        }
        const extras=pricingConfig.moving.extras;
        add('moving-origin-floor','Startadresse ohne Lift – Etagen über der ersten',originLift?0:Math.max(0,originFloor-extras.includedFloor),'unit',extras.floorPerAddressCents,{floor:originFloor,includedFloor:extras.includedFloor});
        add('moving-destination-floor','Zieladresse ohne Lift – Etagen über der ersten',destinationLift?0:Math.max(0,destinationFloor-extras.includedFloor),'unit',extras.floorPerAddressCents,{floor:destinationFloor,includedFloor:extras.includedFloor});
        add('moving-wardrobe','Montage grosser Kleiderschrank',largeWardrobes,'unit',extras.largeWardrobeCents);
        add('moving-disposal','Entsorgung inklusive Gebühren – pro m³',disposalM3,'m3',extras.disposalPerM3Cents,undefined,centsForArea(extras.disposalPerM3Cents,disposalM3));
        add('moving-boxes','Umzugskartons',boxes,'unit',extras.boxCents);
        notices.push(notice('moving_fixed_scope',`Festpreis bis ${pricingConfig.moving.fixed.maxDistanceKm} km. Montage von Bett und Tisch enthalten. Strecke und Zugang werden vor der Bestätigung geprüft.`));
        if(fromPriceCents!==undefined)fromPriceCents=knownSubtotal();
      }
      if(s.cleaning!==undefined){
        const cleaning=s.cleaning;
        if(!sameAddress||!cleaning||typeof cleaning!=='object'||Array.isArray(cleaning)||cleaning.service!=='endOfTenancy'||cleaning.mode!=='fixed'||cleaning.propertyType!=='apartment'||cleaning.rooms!==rooms||rooms>3.5||Object.keys(cleaning).some(key=>!Object.hasOwn(defaultSelection('endOfTenancy'),key)))fail('invalid_combo','cleaning','Kombi nur mit ausdrücklich gebuchter Umzugsreinigung an derselben Adresse und passender Zimmerzahl bis 3.5 Zimmer.');
        const cleaningQuote=calculatePrice(cleaning);
        for(const line of cleaningQuote.lines)lines.push({...line,params:{...line.params,comboCleaning:true}});
        manualReviewReasons.push(...cleaningQuote.manualReviewReasons);notices.push(...cleaningQuote.notices);
        if(cleaningQuote.totalCents!==null){
          const discount=pricingConfig.moving.combo.find(tier=>rooms<=tier.rooms)!.discountCents;
          add('moving-combo','Kombi-Rabatt',1,'package',-discount,{sameAddress:true,rooms});
          if(depositBasisCents!==undefined)depositBasisCents+=cleaningQuote.totalCents-discount;
          if(fromPriceCents!==undefined)fromPriceCents=knownSubtotal();
        }else fromPriceCents=undefined;
      }else if(sameAddress)fail('invalid_combo','cleaning','Für den Kombi-Rabatt muss eine passende Reinigung ausdrücklich ausgewählt werden.');
      break;
    }
  }

  const subtotalCents = knownSubtotal();
  if (!Number.isSafeInteger(subtotalCents) || subtotalCents < 0) fail('invalid_total', 'total', 'Der Preis konnte nicht sicher berechnet werden.');
  const totalCents = manualReviewReasons.length ? null : subtotalCents;
  if (depositBasisCents !== undefined && (!Number.isSafeInteger(depositBasisCents) || depositBasisCents < 0 || depositBasisCents > subtotalCents)) fail('invalid_total', 'total', 'Die Anzahlung konnte nicht sicher berechnet werden.');
  return {
    pricingVersion: PRICING_VERSION, currency: pricingConfig.currency, service, lines, subtotalCents, totalCents,
    priceType:manualReviewReasons.length?(fromPriceCents!==undefined?'from':'personal'):priceType,depositBasisCents:totalCents===null?null:depositBasisCents??totalCents,...(fromPriceCents!==undefined?{fromPriceCents}:{}),
    taxStatus: 'not_registered', vatCents: 0,
    vatComparisonCents:null,
    manualReviewReasons, notices,
    ...(appliedTier ? { appliedTier } : {}),
    maxAffordablePersonHours: totalCents === null ? null : (totalCents - materialsCents) / MIN_LABOUR_RATE_CENTS,
    ...(bookedPersonHours !== undefined ? { bookedPersonHours } : {}),
  };
}

export function defaultSelection<S extends BookingService>(service: S): SelectionFor<S> {
  const selections: { [K in BookingService]: SelectionFor<K> } = {
    regular: { service: 'regular', cleaningKind:'regular', frequency: 'weekly', hours: REGULAR_MINIMUM_HOURS.weekly, materials: false, oven: false, fridge: false, ironingHours: 0 },
    endOfTenancy: { service: 'endOfTenancy', mode: 'fixed', propertyType: 'apartment', rooms: 2.5, areaM2: 65, hours: 3, bathrooms: 1, guestWcs: 0, slatBlinds: 0, rollerShutters: 0, smallBalconies: 0, largeBalconies: 0, storageRooms: 0, garages: 0, carpetRooms: 0, heavySoiling: false },
    construction: { service: 'construction', mode: 'area', level: 'light', areaM2: 50, hours: 4, cementM2: 0, filmWindows: 0, slatBlinds: 0, extraArea: false },
    windows: { service: 'windows', standard: 4, double: 2, balconyDoors: 0, roof: 0, slatBlinds: 0, rollerShutters: 0, difficultAccess: false, winterGarden: false },
    moving: { service:'moving',mode:'hourly',team:1,estimatedHours:pricingConfig.moving.hourly.teams[1].minimumHours,additionalHelpers:0,rooms:1.5,distanceKm:undefined,originFloor:1,originLift:true,destinationFloor:1,destinationLift:true,largeWardrobes:0,disposalM3:0,boxes:0,piano:false,safe:false,furnitureLift:false,sameAddress:false,cleaning:undefined,details:'' },
  };
  const valid = choice(service, 'service', ['regular', 'endOfTenancy', 'construction', 'windows', 'moving'] as const);
  return { ...selections[valid] } as SelectionFor<S>;
}
