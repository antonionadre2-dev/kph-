import "../src/styles/route-utilities.css";
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Check, CheckCircle2, ChevronDown, ClipboardList, CreditCard, Info, LoaderCircle, Mail, MapPin, Minus, Pencil, Phone, Plus, ShieldCheck } from 'lucide-react';
import { useTranslation } from '../i18n';
import { calculatePrice, defaultSelection, getRegularMinimumHours, PricingValidationError, REGULAR_RATES, type BookingSelection, type BookingService, type EndOfTenancySelection, type MovingSelection, type PriceQuote } from '../src/booking/pricing';
import { pricingConfig } from '../src/booking/pricingConfig';
import { pricingUiText } from '../src/booking/pricingUiCopy';
import { bookingLanguage, bookingLineLabel, bookingText } from '../src/booking/uiCopy';
import { BOOKING_TERMS_VERSION } from '../src/booking/terms';
import CalculatorNudges from './CalculatorNudges';
import KrakenServiceIcon from './KrakenServiceIcon';
import QuoteRecoveryCard from './QuoteRecoveryCard';
import KrakenJourney, { JourneyEmailPreview, type JourneyPhase } from './KrakenJourney';
import MovingGuide from './MovingGuide';
import { journeyCopy, LANGUAGE_NAMES } from '../src/booking/journeyCopy';
import { bookingRequestLanguage, communicationPreferenceDiffers } from '../src/booking/communicationLanguage';
import { guidePreferencesFromQuery, type GuidePreferences } from '../src/booking/movingGuide';
import { createDemoBooking, confirmDemoAppointment, settleDemoPayment, type DemoBooking, type DemoPaymentOutcome } from '../src/booking/demoJourney';
import { consumeHomeCalculatorRequest, subscribeHomeCalculatorRequests, HOME_CALCULATOR_INTENT_KEY } from '../src/home/calculator';
import { fieldErrorKey, type FieldErrorKey } from '../src/booking/fieldValidation';
import { consumeKaiTransfer, registerKaiCalculationPreview, subscribeKaiTransfers, kaiDraftFieldLabel } from '../src/kai/draft';
import { KAI_FIELDS, type KaiDraft } from '../src/kai/types';
import { applyKaiBookingTransfer, kaiBookingPreview, type KaiCalculatorState } from '../src/booking/kaiTransfer';
import { bookingMailStatusKey } from '../src/booking/emailAvailability';
import { clearPrivateDrafts } from '../src/booking/privateStorage';
import { buildQuoteWhatsAppHref, frictionText, CONFIRMATION_WINDOW_COPY } from '../src/booking/calculatorFriction';
import { publicHref } from '../src/routing/site-paths';
import CalculatorPostcodeCheck from './CalculatorPostcodeCheck';
import CustomerReviews from './home/CustomerReviews';
import { checkoutErrorKey, paymentUiState } from '../src/booking/paymentUi';
import { calculatorSubmission, clearCalculatorDraft, purgeExpiredCalculatorSession, readCalculatorDraft, writeCalculatorDraft, type CalculatorSubmission } from '../src/booking/calculatorDraft';
import BookingAccessRecovery from './BookingAccessRecovery';
import { accessRecoveryText } from '../src/booking/accessRecoveryCopy';
import { createBrowserAccessUiGate } from '../src/booking/browserAccessUi';
import './service-calculator.css';

interface ServiceCalculatorPageProps {
  onNavigate: (page: string) => void;
  cart?: Array<{ id?: string; type?: string; details?: unknown }>;
  setCart?: React.Dispatch<React.SetStateAction<any[]>>;
  preview?: boolean;
}
interface Customer {
  name: string; email: string; phone: string; address: string; postalCode: string; city: string;
}
interface RecoveryAccess { id: string; accessToken: string }
interface BookingConfig {
  available: boolean; paymentReady: boolean; emailReady: boolean; mode: 'test' | 'live' | 'unconfigured';
  termsVersion: string; depositPercent?: number;
}
interface BookingView {
  bookingId: string; reference: string; publicToken?: string; status: string;
  language?: string; languageSnapshot?: {language:string;source:string;version:number}; demo?: boolean;
  quote: PriceQuote; quoteRevision: number; canCheckout?: boolean;
  customer?: Customer; scopeNotes?: string; notes?: string; termsVersion?: string;
  scheduling: { status: 'requested' | 'held' | 'confirmed' | 'needs_reschedule'; date: string; time: string; endTime?: string; timeZone: string; holdExpiresAt?: string };
  payment: { status: string; amountPaidCents: number; amountDueNowCents?: number; remainingBalanceCents?: number; depositPercent?: number; checkoutExpiresAt?: string };
  email?: { request?: 'queued' | 'sending' | 'sent' | 'failed' | 'delivery_unknown'; receipt?: 'queued' | 'sending' | 'sent' | 'failed' | 'delivery_unknown' };
}
type ServiceChoice = BookingService | 'deep';
type WizardStep = 0 | 1 | 2;
type Text = (key: string, params?: Record<string, string | number>) => string;
const emptyCustomer: Customer = { name: '', email: '', phone: '', address: '', postalCode: '', city: '' };
const TERMS_VERSION = BOOKING_TERMS_VERSION;
const tokenKey = (id: string) => `kraken.booking.${id}`;
const recoveryTokenKey = (id: string) => `kraken.recovery.${id}`;
const safeId = /^[A-Za-z0-9_-]{1,128}$/;
const safeToken = /^[A-Za-z0-9_-]{20,256}$/;
const communicationCopy = {
  de:{use:'Diese Sprache für E-Mails verwenden',note:'Speichern Sie Ihre bevorzugte Sprache für kommende Mitteilungen.',saved:'Ihre E-Mail-Sprache wurde gespeichert.',error:'Die Änderung konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.'},
  en:{use:'Use this language for emails',note:'Save your preferred language for future communications.',saved:'Your email language has been saved.',error:'The change could not be saved. Please try again.'},
  es:{use:'Usar este idioma para los emails',note:'Guarde su idioma preferido para las próximas comunicaciones.',saved:'Su idioma de email se ha guardado.',error:'No se ha podido guardar el cambio. Inténtelo de nuevo.'},
  fr:{use:'Utiliser cette langue pour les emails',note:'Enregistrez votre langue préférée pour les prochaines communications.',saved:'La langue de vos emails a été enregistrée.',error:'Le changement n’a pas pu être enregistré. Veuillez réessayer.'},
  it:{use:'Usare questa lingua per le email',note:'Salvi la lingua preferita per le prossime comunicazioni.',saved:'La lingua delle email è stata salvata.',error:'Non è stato possibile salvare la modifica. Riprovi.'},
  pt:{use:'Usar este idioma nos emails',note:'Guarde o seu idioma preferido para as próximas comunicações.',saved:'O idioma dos seus emails foi guardado.',error:'Não foi possível guardar a alteração. Tente novamente.'}
};

function localToday(instant = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Zurich', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(instant);
  const part = (type: string) => parts.find(item => item.type === type)?.value || '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}
function randomId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
}
function rememberToken(id: string, token: string): void {
  try { sessionStorage.setItem(tokenKey(id), token); } catch { /* The current in-memory session remains usable. */ }
}
function recalledToken(id: string): string {
  try { return sessionStorage.getItem(tokenKey(id)) || ''; } catch { return ''; }
}
function serviceAlias(raw: unknown): ServiceChoice | null {
  if (typeof raw !== 'string') return null;
  const aliases: Record<string, ServiceChoice> = {
    regular: 'regular', 'regular-cleaning': 'regular', 'daily-cleaning': 'regular', unterhaltsreinigung: 'regular',
    deep: 'deep', 'deep-cleaning': 'deep', grundreinigung: 'deep',
    end: 'endOfTenancy', endOfTenancy: 'endOfTenancy', 'end-of-tenancy': 'endOfTenancy', umzugsreinigung: 'endOfTenancy',
    window: 'windows', windows: 'windows', 'window-cleaning': 'windows', fensterreinigung: 'windows',
    construction: 'construction', 'post-construction': 'construction', baureinigung: 'construction',
    move: 'moving', moving: 'moving', 'small-move': 'moving', umzug: 'moving',
  };
  return aliases[raw.trim()] || null;
}
type EntryIntent = { service: ServiceChoice | null; raw: string; source: 'url' | 'storage' | 'cart' | 'none'; cartIndex?: number };
function initialIntent(cart?: ServiceCalculatorPageProps['cart']): EntryIntent {
  const fromUrl = new URLSearchParams(window.location.search).get('service') || '';
  if (fromUrl) return { service: serviceAlias(fromUrl), raw: fromUrl.slice(0, 100), source: 'url' };
  // Existing service/SEO entry points pass only this non-personal intent. Never import saved customer data.
  let legacy = '';
  try { legacy = localStorage.getItem(HOME_CALCULATOR_INTENT_KEY) === 'windows' ? 'windows' : localStorage.getItem('kraken_preselected_service') || ''; } catch { /* Storage may be disabled. */ }
  if (legacy) return { service: serviceAlias(legacy), raw: legacy.slice(0, 100), source: 'storage' };
  if (Array.isArray(cart) && cart.length === 1 && typeof cart[0]?.type === 'string') return { service: serviceAlias(cart[0].type), raw: cart[0].type, source: 'cart', cartIndex: 0 };
  return { service: 'endOfTenancy', raw: '', source: 'none' };
}
function selectionFor(choice: ServiceChoice): BookingSelection {
  return choice === 'deep' ? { ...defaultSelection('regular'), cleaningKind: 'deep', frequency: 'once', hours: pricingConfig.regular.deep.minimumHours } : defaultSelection(choice);
}
function legacySelection(choice: ServiceChoice, item?: NonNullable<ServiceCalculatorPageProps['cart']>[number]): BookingSelection {
  const base = selectionFor(choice);
  if (!item?.details || typeof item.details !== 'object' || Array.isArray(item.details)) return base;
  const old = item.details as Record<string, unknown>;
  const validCount = (value: unknown) => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 1000;
  if (base.service === 'regular' && ['daily-cleaning', 'deep-cleaning'].includes(item.type || '')) {
    const frequency = ({ Weekly: 'weekly', 'Bi-Weekly': 'fortnightly', Monthly: 'monthly' } as const)[String(old.frequency) as 'Weekly' | 'Bi-Weekly' | 'Monthly'];
    return { ...base, frequency: choice === 'deep' ? 'once' : frequency || base.frequency,
      // Old duration combined estimated base time and some extras. Ask again instead of double billing.
      hours: Number.NaN,
      oven: old.oven === true || old.ovenInterior === true,
      fridge: old.fridge === true || old.fridgeFreezer === true,
      ironingHours: old.ironing === true && typeof old.ironingHours === 'number' && old.ironingHours >= 0 && old.ironingHours <= 168 && Number.isInteger(old.ironingHours * 4) ? old.ironingHours : 0 };
  }
  if (base.service === 'endOfTenancy' && item.type === 'end-of-tenancy') {
    return { ...base,
      rooms: typeof old.roomsCount === 'number' && old.roomsCount >= 1 && old.roomsCount <= 100 && Number.isInteger(old.roomsCount * 2) ? old.roomsCount : base.rooms,
      bathrooms: validCount(old.bathroomsCount) ? Number(old.bathroomsCount) : base.bathrooms,
      storageRooms: validCount(old.storageCount) ? Number(old.storageCount) : 0,
      carpetRooms: validCount(old.carpetCount) ? Number(old.carpetCount) : 0,
      // The old cart had no verified floor area or distinction between blind/balcony types.
      areaM2: Number.NaN };
  }
  if (base.service === 'moving' && typeof old.description === 'string') return { ...base, details: old.description.slice(0, 3000) };
  return base;
}

class BookingApiError extends Error {
  constructor(readonly code: string, readonly status: number) { super(code); }
}
async function api<T>(url: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const forwardAbort = () => controller.abort();
  options.signal?.addEventListener('abort', forwardAbort, { once: true });
  if (options.signal?.aborted) controller.abort();
  const timeout = window.setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(url, {
      ...options, credentials: 'same-origin', signal: controller.signal,
      headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
    });
    if (!response.headers.get('content-type')?.includes('application/json')) throw new BookingApiError('UNAVAILABLE', response.status);
    const data = await response.json();
    if (!response.ok) throw new BookingApiError(typeof data.code === 'string' ? data.code : 'REQUEST_FAILED', response.status);
    return data as T;
  } finally {
    window.clearTimeout(timeout);
    options.signal?.removeEventListener('abort', forwardAbort);
  }
}

function NumberField({ name, label, value, onChange, min = 0, max = 1000, step = 1, hint, invalid, errorMessage, text, required = true }: {
  key?: string; name: string; label: string; value: number; onChange: (value: number) => void;
  min?: number; max?: number; step?: number; hint?: string; invalid?: boolean; errorMessage?: string; text: Text; required?: boolean;
}) {
  const id = `kr-calc-${name}`;
  const change = (direction: -1 | 1) => onChange(Number.isFinite(value) ? Math.round(Math.min(max, Math.max(min, value + direction * step)) * 100) / 100 : min);
  return <div className="kr-calc-field kr-calc-stepper-field">
    <label htmlFor={id}>{label}</label>
    <div className="kr-calc-number-wrap">
      <button type="button" className="kr-calc-number-button" aria-label={text('decreaseQuantity', { label })} disabled={Number.isFinite(value) && value <= min} onClick={() => change(-1)}><Minus aria-hidden="true" /></button>
      <input id={id} name={name} type="number" inputMode={step < 1 ? 'decimal' : 'numeric'} required={required} min={min} max={max} step={step}
        value={Number.isFinite(value) ? value : ''} aria-invalid={invalid || undefined} aria-describedby={[hint ? `${id}-hint` : null, errorMessage ? `${id}-error` : null].filter(Boolean).join(' ') || undefined}
        onChange={event => onChange(event.target.value === '' ? Number.NaN : Number(event.target.value))} />
      <button type="button" className="kr-calc-number-button" aria-label={text('increaseQuantity', { label })} disabled={Number.isFinite(value) && value >= max} onClick={() => change(1)}><Plus aria-hidden="true" /></button>
    </div>
    {hint && <span className="kr-calc-hint" id={`${id}-hint`}>{hint}</span>}
    {errorMessage && <span id={`${id}-error`} className="kr-calc-field-error">{errorMessage}</span>}
  </div>;
}
function ToggleField({ name, label, checked, onChange, hint, price }: {
  key?: string; name: string; label: string; checked: boolean; onChange: (value: boolean) => void; hint?: string; price?: string;
}) {
  return <label className={`kr-calc-toggle ${checked ? 'is-selected' : ''}`} htmlFor={`kr-calc-${name}`}>
    <input id={`kr-calc-${name}`} type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} />
    <span><strong>{label}</strong>{hint && <small>{hint}</small>}</span>
    {price && <b>{price}</b>}
  </label>;
}

function EotAreaRule({ rooms, language, money }: { rooms: number; language: string; money: (cents: number) => string }) {
  const index = pricingConfig.endOfTenancy.tiers.findIndex(tier => rooms <= tier.rooms);
  if (index < 0) return null;
  const tier = pricingConfig.endOfTenancy.tiers[index], next = pricingConfig.endOfTenancy.tiers[index + 1];
  return <p className="kr-calc-area-rule">{pricingUiText(language, 'eotAreaRule', { area: tier.maxAreaM2, rate: money(pricingConfig.endOfTenancy.excessAreaRateCents), max: pricingConfig.endOfTenancy.maxExcessAreaM2 })}{next && <> {pricingUiText(language, 'eotAreaCap', { cap: money(next.priceCents) })}</>}</p>;
}

export function MovingCalculatorFields({ selection, onChange, text, language, money }: { selection: MovingSelection; onChange: (changes: Record<string, unknown>) => void; text: Text; language: string; money: (cents: number) => string }) {
  const p = (key: string, params?: Record<string, string | number>) => pricingUiText(language, key, params);
  const config = pricingConfig.moving;
  const mode = selection.mode || '', team = selection.team === 2 ? 2 : 1;
  const minimum = config.hourly.teams[team];
  const cleaning = selection.cleaning;
  const number = (name: string, label: string, value: unknown, min = 0, step = 1, hint?: string, max: number = pricingConfig.limits.count, required = true, onChangeValue?: (value: number) => void) => <NumberField key={name} name={name} label={label} value={typeof value === 'number' ? value : NaN} min={min} max={max} step={step} hint={hint} required={required} text={text} onChange={onChangeValue || (value => onChange({ [name]: value }))} />;
  const updateCleaning = (changes: Partial<EndOfTenancySelection>) => { if (cleaning) onChange({ cleaning: { ...cleaning, ...changes } }); };
  const cleaningNumber = (name: keyof EndOfTenancySelection, label: string = name, min = 0, step = 1, hint?: string, max: number = pricingConfig.limits.count) => number(`cleaning-${name}`, label === 'comboArea' ? p(label) : text(label), cleaning?.[name], min, step, hint, max, true, value => updateCleaning({ [name]: value }));
  const changeRooms = (rooms: number) => onChange({ rooms, sameAddress: false, ...(cleaning ? { cleaning: { ...cleaning, rooms } } : {}) });
  return <div className="kr-calc-moving-fields">
    <div className="kr-calc-fields">
      <div className="kr-calc-field"><label htmlFor="kr-calc-moving-mode">{p('movingMode')}</label><select id="kr-calc-moving-mode" value={mode} onChange={event => onChange({ mode: event.target.value, ...(event.target.value === 'hourly' ? { largeWardrobes: 0, disposalM3: 0, boxes: 0 } : {}) })}>{!mode && <option value="" disabled>{p('chooseMovingMode')}</option>}<option value="hourly">{p('movingHourly')}</option><option value="fixed">{p('movingFixed')}</option></select></div>
      {number('rooms', text('rooms'), selection.rooms, 1, .5, cleaning ? p('comboRoomsMatch') : undefined, pricingConfig.limits.rooms, Boolean(mode), changeRooms)}
      {mode === 'hourly' ? <>
        <div className="kr-calc-field"><label htmlFor="kr-calc-team">{p('team')}</label><select id="kr-calc-team" value={team} onChange={event => onChange({ team: Number(event.target.value) })}>{([1, 2] as const).map(value => <option key={value} value={value}>{p(value === 1 ? 'teamOne' : 'teamTwo')} · {money(config.hourly.teams[value].hourlyRateCents)}/h</option>)}</select></div>
        {number('estimatedHours', p('estimatedHours'), selection.estimatedHours, .25, .25, p('hourlyMinimum', { hours: minimum.minimumHours, rate: money(minimum.hourlyRateCents) }), pricingConfig.limits.personHours)}
        {number('additionalHelpers', p('additionalHelpers'), selection.additionalHelpers, 0, 1, `${money(config.hourly.additionalHelperRateCents)}/h`)}
      </> : mode === 'fixed' ? number('distanceKm', p('distanceKm'), selection.distanceKm, 0, .1, p('distanceHint', { max: config.fixed.maxDistanceKm }), pricingConfig.limits.distanceKm, false, value => onChange({ distanceKm: Number.isFinite(value) ? value : undefined })) : null}
    </div>
    {mode === 'hourly' ? <p className="kr-calc-moving-rule">{p('hourlyBilling')} {p('travelFlat', { price: money(config.travelCents) })}</p> : mode === 'fixed' ? <>
      {!Number.isFinite(selection.distanceKm) && <p className="kr-calc-inline-note">{p('distanceMissing')}</p>}
      <div className="kr-calc-moving-addresses">
        <div className="kr-calc-moving-address-group">{number('originFloor', p('originFloor'), selection.originFloor, 0, 1, undefined, pricingConfig.limits.floor)}<ToggleField name="originLift" label={p('originLift')} checked={selection.originLift === true} onChange={value => onChange({ originLift: value })} /></div>
        <div className="kr-calc-moving-address-group">{number('destinationFloor', p('destinationFloor'), selection.destinationFloor, 0, 1, undefined, pricingConfig.limits.floor)}<ToggleField name="destinationLift" label={p('destinationLift')} checked={selection.destinationLift === true} onChange={value => onChange({ destinationLift: value })} /></div>
      </div>
      <p className="kr-calc-hint">{p('floorHint', { price: money(config.extras.floorPerAddressCents) })}</p>
      <p className="kr-calc-included"><CheckCircle2 aria-hidden="true" />{p('fixedAssemblyIncluded')}</p>
      <div className="kr-calc-fields">{number('largeWardrobes', p('largeWardrobes'), selection.largeWardrobes, 0, 1, p('wardrobesHint', { price: money(config.extras.largeWardrobeCents) }))}{number('disposalM3', p('disposalM3'), selection.disposalM3, 0, .1, p('disposalHint', { price: money(config.extras.disposalPerM3Cents) }), pricingConfig.limits.areaM2)}{number('boxes', p('boxes'), selection.boxes, 0, 1, `${money(config.extras.boxCents)}/×`)}</div>
    </> : null}
    <fieldset className="kr-calc-moving-special"><legend>{p('specialItems')}</legend><p className="kr-calc-hint">{p('specialItemsHint')}</p><div className="kr-calc-toggles">{(['piano', 'safe', 'furnitureLift'] as const).map(name => <ToggleField key={name} name={name} label={p(name)} checked={selection[name] === true} onChange={value => onChange({ [name]: value })} />)}</div></fieldset>
    {mode && <section className="kr-calc-moving-combo" aria-labelledby="kr-calc-combo-title">
      <h3 id="kr-calc-combo-title">{p('comboTitle')}</h3><p>{p('comboHint', { price: money(config.combo[0].discountCents), amount: money(config.combo[1].discountCents) })}</p>
      <ToggleField name="combo-enable" label={p('comboEnable')} checked={Boolean(cleaning)} onChange={value => onChange({ cleaning: value ? { ...defaultSelection('endOfTenancy'), rooms: selection.rooms || 1.5, areaM2: NaN } : undefined, sameAddress: false })} />
      {cleaning && <>
        <div className="kr-calc-fields kr-calc-combo-fields">{cleaningNumber('areaM2', 'comboArea', .01, .01, undefined, pricingConfig.limits.areaM2)}</div>
        <EotAreaRule rooms={cleaning.rooms} language={language} money={money} />
        <p className="kr-calc-hint">{p('comboRoomsMatch')}</p>
        <ToggleField name="sameAddress" label={p('sameAddress')} hint={p('sameAddressHint')} checked={selection.sameAddress === true} onChange={value => onChange({ sameAddress: value })} />
        <details className="kr-calc-combo-extras"><summary>{p('comboExtras')}</summary><div className="kr-calc-fields">{cleaningNumber('bathrooms', 'bathrooms', 0, 1, text('bathroomsHint'))}{cleaningNumber('guestWcs')}{cleaningNumber('slatBlinds')}{cleaningNumber('rollerShutters')}{cleaningNumber('smallBalconies')}{cleaningNumber('largeBalconies')}{cleaningNumber('storageRooms')}{cleaningNumber('garages')}{cleaningNumber('carpetRooms')}</div><ToggleField name="cleaning-heavySoiling" label={text('heavySoiling')} hint={text('heavyHint')} price={`+${pricingConfig.endOfTenancy.extras.heavySoilingPercent} %`} checked={cleaning.heavySoiling} onChange={value => updateCleaning({ heavySoiling: value })} /></details>
      </>}
    </section>}
    <div className="kr-calc-field kr-calc-moving-description"><label htmlFor="kr-calc-moving-details">{p('movingDetailsOptional')}</label><textarea id="kr-calc-moving-details" rows={4} maxLength={3000} value={selection.details || ''} onChange={event => onChange({ details: event.target.value })} /></div>
  </div>;
}

function PriceSummary({ quote, text, language, money, hasSelection = false }: { quote: PriceQuote | null; text: Text; language: string; money: (cents: number) => string; hasSelection?: boolean }) {
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const manual = Boolean(quote?.manualReviewReasons.length || quote?.totalCents === null);
  const estimated = quote?.priceType === 'estimate';
  const from = quote?.priceType === 'from' && typeof quote.fromPriceCents === 'number';
  const priceLabel = from ? pricingUiText(language, 'fromLabel') : estimated ? pricingUiText(language, 'estimate') : text(manual ? 'individual' : 'priceLive');
  const shownTotal = from ? pricingUiText(language, 'fromPrice', { price: money(quote.fromPriceCents!) }) : manual ? text('individual') : quote && typeof quote.totalCents === 'number' ? money(quote.totalCents) : '—';
  return <>
    <p className="kr-calc-summary-label">{priceLabel}</p>
    <div className="kr-calc-total" aria-live="polite" aria-atomic="true">
      <span>{estimated ? pricingUiText(language, 'estimate') : text(manual ? 'manualPrice' : 'currentTotal')}</span>
      <strong>{shownTotal}</strong>
    </div>
    {quote && <p className="kr-calc-final-price">{pricingUiText(language, 'finalPrice')}</p>}
    {!quote && <p className="kr-calc-empty"><ClipboardList aria-hidden="true" />{text(hasSelection ? 'checkRequired' : 'selectToStart')}</p>}
    {quote && <p className="kr-calc-price-note"><Info aria-hidden="true" />{from ? pricingUiText(language, 'fromHint') : estimated ? pricingUiText(language, 'estimateHint') : text(manual ? 'manualPrice' : 'fixedForScope')}</p>}
    {!!quote?.lines.length && <details className="kr-calc-summary-details" open={breakdownOpen} onToggle={event => setBreakdownOpen(event.currentTarget.open)}><summary>{text(breakdownOpen ? 'hideBreakdown' : 'showBreakdown')}<ChevronDown aria-hidden="true" /></summary><ul className="kr-calc-lines" aria-label={text('selectedExtras')}>
      {quote.lines.map(line => <li key={line.id}>
        <span>{bookingLineLabel(language, line)}
          {line.quantity !== 1 && <small>{line.params?.capped ? pricingUiText(language, 'eotAreaCap', { cap: money(Number(line.params.capCents)) }) : <>{line.quantity.toLocaleString(bookingLanguage(language))} {line.unit === 'hour' ? 'h' : line.unit === 'm2' ? 'm²' : line.unit === 'm3' ? 'm³' : '×'} · {money(line.unitPriceCents)}</>}</small>}
        </span><b>{money(line.totalCents)}</b>
      </li>)}
    </ul></details>}
    {quote && !manual && <div className="kr-calc-breakdown">
      <div><span>{text('subtotal')}</span><b>{money(quote.subtotalCents)}</b></div>
    </div>}
  </>;
}

export default function ServiceCalculatorPage({ onNavigate, cart, setCart, preview = false }: ServiceCalculatorPageProps) {
  const { language } = useTranslation();
  const locale = bookingLanguage(language);
  const journey = journeyCopy(locale);
  const text: Text = useCallback((key, params) => bookingText(locale, key, params), [locale]);
  const pricingText = useCallback((key: Parameters<typeof pricingUiText>[1], params?: Record<string, string | number>) => pricingUiText(locale, key, params), [locale]);
  const money = useCallback((cents: number) => new Intl.NumberFormat(locale === 'de' ? 'de-CH' : locale, { style: 'currency', currency: 'CHF', minimumFractionDigits: 2 }).format(cents / 100), [locale]);
  const [bootstrap] = useState(() => {
    const entry = initialIntent(cart);
    const params = new URLSearchParams(window.location.search);
    const saved = preview || params.has('booking') || params.has('draft') ? null : readCalculatorDraft();
    const draft = saved && (entry.source === 'none' || entry.service === saved.choice) ? saved : null;
    return { entry, draft };
  });
  const { entry, draft: restoredDraft } = bootstrap;
  const [choice, setChoice] = useState<ServiceChoice | null>(restoredDraft?.choice || entry.service);
  const [selection, setSelection] = useState<BookingSelection | null>(() => restoredDraft?.selection || (entry.service ? legacySelection(entry.service, entry.source === 'cart' ? cart?.[entry.cartIndex ?? 0] : undefined) : null));
  const [legacyImported, setLegacyImported] = useState(entry.source === 'cart' && Boolean(entry.service));
  const [unsupportedIntent, setUnsupportedIntent] = useState(Boolean(entry.raw && !entry.service));
  const intentHandled = useRef(Boolean(restoredDraft) || entry.source !== 'none');
  const legacyCart = Array.isArray(cart) ? cart : [];
  const [customer, setCustomer] = useState<Customer>(() => ({ ...emptyCustomer, ...restoredDraft?.customer }));
  const [requestedDate, setRequestedDate] = useState(restoredDraft?.requestedDate || '');
  const [requestedTime, setRequestedTime] = useState(restoredDraft?.requestedTime || '09:00');
  const [notes, setNotes] = useState(restoredDraft?.notes || '');
  const [kaiSummary, setKaiSummary] = useState<KaiDraft | null>(null);
  const [kaiConflicts, setKaiConflicts] = useState<string[]>([]);
  const touchedSelection = useRef<Set<string>>(new Set(entry.source === 'cart' && entry.service ? Object.keys(legacySelection(entry.service, cart?.[entry.cartIndex ?? 0])) : []));
  const interruptedSelections = useRef(new Map<ServiceChoice, { selection: BookingSelection; touched: string[] }>());
  const [wizardStep, setWizardStep] = useState<WizardStep>(restoredDraft?.wizardStep || 0);
  const [extrasOpen, setExtrasOpen] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [config, setConfig] = useState<BookingConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [configAttempt, setConfigAttempt] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, FieldErrorKey>>({});
  const [booking, setBooking] = useState<BookingView | null>(null);
  const [bookingEntry] = useState(() => {
    const url = new URL(window.location.href), fragment = new URLSearchParams(url.hash.slice(1));
    const candidate = url.searchParams.get('booking') || '';
    const id = !preview && safeId.test(candidate) ? candidate : null;
    const supplied = fragment.get('access') || '';
    const recover = fragment.has('recover');
    const token = id && !recover ? safeToken.test(supplied) ? supplied : recalledToken(id) : '';
    return { id, recover, supplied: safeToken.test(supplied), token: safeToken.test(token) ? token : '' };
  });
  const [bookingEntryPending, setBookingEntryPending] = useState(Boolean(bookingEntry.id && bookingEntry.token && !bookingEntry.recover));
  const browserAccessUi = useRef(createBrowserAccessUiGate());
  const [bookingAccess, setBookingAccess] = useState<{ id: string; token: string } | null>(null);
  const [recoveryAccess, setRecoveryAccess] = useState<RecoveryAccess | null>(null);
  const [recoveryEmailLanguage, setRecoveryEmailLanguage] = useState<string | null>(null);
  const [changingEmailLanguage, setChangingEmailLanguage] = useState(false);
  const [emailLanguageNotice, setEmailLanguageNotice] = useState<'saved'|'error'|null>(null);
  const [recoveryRestored, setRecoveryRestored] = useState(false);
  const [recoveryLoading, setRecoveryLoading] = useState(() => !preview && new URLSearchParams(window.location.search).has('draft'));
  const [returnMissing, setReturnMissing] = useState(Boolean(bookingEntry.id && (!bookingEntry.token || bookingEntry.recover)));
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [payConsent, setPayConsent] = useState(false);
  const [openingPayment, setOpeningPayment] = useState(false);
  const [paymentClock, setPaymentClock] = useState(() => Date.now());
  const [demoEnabled, setDemoEnabled] = useState(false);
  const [demoOutcome, setDemoOutcome] = useState<DemoPaymentOutcome>('paid');
  const [journeyPhase, setJourneyPhase] = useState<JourneyPhase | null>(null);
  const [journeyEmail, setJourneyEmail] = useState<'request' | 'receipt' | null>(null);
    const [guidePreferences,setGuidePreferences] = useState<GuidePreferences>(() => guidePreferencesFromQuery(window.location.search));
  const demoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const verifiedSuccess = useRef('');
  const verifyingPayment = useRef('');
  const idempotency = useRef<CalculatorSubmission | null>(null);
  const submittedResult = useRef<HTMLElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const stepPanelRef = useRef<HTMLElement>(null);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const finalConsentRef = useRef<HTMLInputElement>(null);
  const [today] = useState(localToday);

  useEffect(() => () => { if (demoTimer.current) clearTimeout(demoTimer.current); }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (preview || !choice || !selection || booking || bookingAccess || recoveryLoading || returnMissing || params.has('booking') || params.has('draft')) return;
    writeCalculatorDraft({ choice, selection, wizardStep, customer, requestedDate, requestedTime, notes });
  }, [preview, choice, selection, wizardStep, customer, requestedDate, requestedTime, notes, booking, bookingAccess, recoveryLoading, returnMissing]);

  useEffect(() => {
    if (preview) return;
    purgeExpiredCalculatorSession();
    const timer = window.setInterval(() => purgeExpiredCalculatorSession(), 30_000);
    return () => window.clearInterval(timer);
  }, [preview]);

  useEffect(() => {
    if (entry.source === 'storage') {
      try { if (localStorage.getItem('kraken_preselected_service') === entry.raw) localStorage.removeItem('kraken_preselected_service'); } catch { /* No new storage is required. */ }
    }
  }, [entry]);
  useEffect(() => {
    // App may load its existing basket after this lazy route mounts. Do not override an active edit.
    if (intentHandled.current || touchedSelection.current.size > 0 || bookingAccess || !legacyCart.length) return;
    intentHandled.current = true;
    if (legacyCart.length === 1) {
      const service = serviceAlias(legacyCart[0]?.type || '');
      if (service) { setChoice(service); setSelection(legacySelection(service, legacyCart[0])); setLegacyImported(true); }
      else setUnsupportedIntent(true);
    }
  }, [cart, choice, bookingAccess]);

  const { quote, priceError } = useMemo(() => {
    if (!selection) return { quote: null, priceError: null };
    try { return { quote: calculatePrice(selection), priceError: null }; }
    catch (cause) { return { quote: null, priceError: cause instanceof PricingValidationError ? cause : new PricingValidationError('invalid_selection', 'selection', '') }; }
  }, [selection]);

  useEffect(() => {
    if (preview) return;
    const url = new URL(window.location.href);
    const id = url.searchParams.get('draft');
    const fragment = new URLSearchParams(url.hash.slice(1));
    let accessToken = fragment.get('resume') || '';
    if (!id && !accessToken) { setRecoveryLoading(false); return; }
    if (!accessToken && id && safeId.test(id)) { try { accessToken = sessionStorage.getItem(recoveryTokenKey(id)) || ''; } catch { /* A fresh email link can still be opened. */ } }
    // Keep the capability in the fragment until its validated response has been consumed.
    // A network failure or language change must leave the email link retryable.
    const consumeResume = () => {
      const current = new URL(window.location.href);
      const pending = new URLSearchParams(current.hash.slice(1));
      if (pending.get('resume') !== accessToken) return;
      pending.delete('resume'); current.hash = pending.toString();
      window.history.replaceState(window.history.state, '', current.pathname + current.search + current.hash);
    };
    if (!id || !safeId.test(id) || !safeToken.test(accessToken)) { setError(text('recoveryLinkUnavailable')); setReturnMissing(true); setRecoveryLoading(false); return; }
    const controller = new AbortController();
    setRecoveryLoading(true);
    void api<{ selection: BookingSelection; language: string; email?: string; guidePreferences?:GuidePreferences; bookingId?: string | null; resumeBooking?: { bookingId: string; publicToken: string; canCheckout: boolean; status: string } | null }>(`/api/recovery/drafts/${encodeURIComponent(id)}`, { signal: controller.signal, headers: { Authorization: `Bearer ${accessToken}` } })
      .then(draft => {
        if (controller.signal.aborted) return;
        setRecoveryEmailLanguage(draft.language);
        if(draft.guidePreferences) setGuidePreferences(draft.guidePreferences);
        // A payment reminder must resume its existing booking, never create a duplicate request.
        if (draft.bookingId || draft.resumeBooking) {
          const saved = draft.resumeBooking;
          if (!saved || saved.bookingId !== draft.bookingId || !safeId.test(saved.bookingId) || !safeToken.test(saved.publicToken)) throw new Error('Saved booking unavailable');
          rememberToken(saved.bookingId, saved.publicToken);
          consumeResume();
          setBookingAccess({ id: saved.bookingId, token: saved.publicToken });
          try { sessionStorage.removeItem(recoveryTokenKey(id)); } catch { /* Optional session state. */ }
          const current = new URL(window.location.href);
          current.searchParams.set('booking', saved.bookingId); current.searchParams.delete('draft');
          window.history.replaceState(window.history.state, '', current.pathname + current.search + current.hash);
          return;
        }
        calculatePrice(draft.selection);
        const service = draft.selection.service === 'regular' && (draft.selection.cleaningKind === 'deep' || (!draft.selection.cleaningKind && draft.selection.frequency === 'once')) ? 'deep' : serviceAlias(draft.selection.service);
        if (!service) throw new Error('Unknown saved service');
        intentHandled.current = true; setChoice(service); setSelection(draft.selection); setWizardStep(0);
        touchedSelection.current = new Set(Object.keys(draft.selection));
        if (typeof draft.email === 'string' && draft.email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email)) setCustomer(value => ({ ...value, email: draft.email! }));
        try { sessionStorage.setItem(recoveryTokenKey(id), accessToken); } catch { /* Memory remains available. */ }
        setRecoveryAccess({ id, accessToken }); setRecoveryRestored(true);
        consumeResume();
      }).catch(() => { if (!controller.signal.aborted) { try { sessionStorage.removeItem(recoveryTokenKey(id)); } catch { /* Optional session state. */ } setError(text('recoveryLinkUnavailable')); setReturnMissing(true); } })
      .finally(() => { if (!controller.signal.aborted) setRecoveryLoading(false); });
    return () => controller.abort();
    // This capability is intentionally consumed once, then kept only in memory.
  }, [preview]);

  useEffect(() => {
    if (preview || !recoveryAccess || !selection || booking || bookingAccess) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      if (document.hidden) return;
      void api(`/api/recovery/drafts/${encodeURIComponent(recoveryAccess.id)}/activity`, { method: 'POST', signal: controller.signal, headers: { Authorization: `Bearer ${recoveryAccess.accessToken}` }, body: JSON.stringify({ selection, guidePreferences }) }).catch(() => { /* Activity never changes a communication preference. */ });
    }, 1200);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [preview, recoveryAccess, selection, wizardStep, booking, bookingAccess, guidePreferences]);
  const manualReview = Boolean(quote && (quote.totalCents === null || quote.manualReviewReasons.length));
  const { checkoutHasExpired, holdHasExpired, canOpenCheckout, nextUpdateAt } = paymentUiState(booking, paymentClock);

  useEffect(() => {
    const now = Date.now();
    setPaymentClock(now);
    if (nextUpdateAt === null || nextUpdateAt <= now) return;
    const timeout = window.setTimeout(() => setPaymentClock(Date.now()), Math.min(nextUpdateAt - now + 50, 2_147_483_647));
    return () => window.clearTimeout(timeout);
  }, [nextUpdateAt]);

  useEffect(() => {
    if (preview) return;
    const url = new URL(window.location.href);
    const fragment = new URLSearchParams(url.hash.slice(1));
    // Remove capability secrets from the visible URL before any API calls.
    if (fragment.has('access')) {
      fragment.delete('access');
      url.hash = fragment.toString();
      window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
    }
    const { id, token, supplied, recover } = bookingEntry;
    if (!id) return;
    if (!token || recover) { setBookingEntryPending(false); setReturnMissing(true); return; }
    if (supplied) browserAccessUi.current.establish(id, token);
    rememberToken(id, token);
    setBookingAccess({ id, token });
    setBookingEntryPending(false);
  }, [preview, bookingEntry]);

  useEffect(() => {
    if (preview) {
      setConfig({ available: false, paymentReady: false, emailReady: false, mode: 'unconfigured', termsVersion: TERMS_VERSION });
      setConfigLoading(false);
      return;
    }
    const controller = new AbortController();
    setConfigLoading(true);
    api<BookingConfig>('/api/booking/config', { signal: controller.signal })
      .then(value => { if (!controller.signal.aborted) setConfig(value); })
      .catch(() => { if (!controller.signal.aborted) setConfig({ available: false, paymentReady: false, emailReady: false, mode: 'unconfigured', termsVersion: TERMS_VERSION }); })
      .finally(() => { if (!controller.signal.aborted) setConfigLoading(false); });
    return () => controller.abort();
  }, [configAttempt, preview]);

  const readStatus = useCallback(async (access: { id: string; token: string }, signal?: AbortSignal) => {
    if (preview) throw new BookingApiError('PREVIEW_ONLY', 403);
    try {
      const value = await api<BookingView>(`/api/booking/requests/${encodeURIComponent(access.id)}`, { signal, headers: browserAccessUi.current.headers(access.id, access.token) });
      if (!signal?.aborted) setBooking(value);
      return value;
    } catch (cause) {
      if (!signal?.aborted && cause instanceof BookingApiError && [401,403,404].includes(cause.status)) {
        try { sessionStorage.removeItem(tokenKey(access.id)); } catch { /* Recovery remains available. */ }
        setBookingAccess(null); setBooking(null); setReturnMissing(true);
      }
      throw cause;
    }
  }, [preview]);

  const recoverBookingAccess = useCallback((access: { id: string; token: string }) => {
    if (!safeId.test(access.id) || !safeToken.test(access.token)) return;
    rememberToken(access.id, access.token);
    setError(''); setReturnMissing(false); setBookingEntryPending(false);
    setBookingAccess(access);
    const url = new URL(window.location.href);
    url.searchParams.set('booking', access.id);
    for (const key of ['draft','payment','service']) url.searchParams.delete(key);
    url.hash = '';
    window.history.replaceState(window.history.state, '', publicHref(url.pathname + url.search, locale));
  }, [locale]);

  useEffect(() => {
    if (preview || !bookingAccess) return;
    const controller = new AbortController();
    let interval: ReturnType<typeof setInterval> | undefined;
    const started = Date.now();
    let inFlight = false;
    setLoadingStatus(true);
    const refresh = async () => {
      if (inFlight || controller.signal.aborted) return;
      if (Date.now() - started > 60_000) { if (interval) clearInterval(interval); return; }
      inFlight = true;
      try {
        const current = await readStatus(bookingAccess, controller.signal);
        if (['paid', 'test_paid', 'refunded', 'partially_refunded', 'chargeback'].includes(current.payment.status) && interval) clearInterval(interval);
      } catch {
        if (!controller.signal.aborted) setError(text('networkError'));
      } finally {
        inFlight = false;
        if (!controller.signal.aborted) setLoadingStatus(false);
      }
    };
    void refresh();
    interval = setInterval(() => { void refresh(); }, 3000);
    return () => { controller.abort(); if (interval) clearInterval(interval); };
  }, [bookingAccess, readStatus, text, preview]);

  useEffect(() => { setPayConsent(false); }, [booking?.quoteRevision, booking?.scheduling.date, booking?.scheduling.time]);

  const chooseService = (service: ServiceChoice) => {
    if (choice === service) return;
    intentHandled.current = true; setLegacyImported(false); setUnsupportedIntent(false);
    if (choice && selection) interruptedSelections.current.set(choice, { selection: { ...selection }, touched: [...touchedSelection.current] });
    const remembered = interruptedSelections.current.get(service);
    setChoice(service); setSelection(remembered ? { ...remembered.selection } : selectionFor(service));
    touchedSelection.current = new Set(remembered?.touched || []);
    setTermsAccepted(false); setError(''); setFieldErrors({});
    setExtrasOpen(false);
  };
  useEffect(() => {
    const receive = () => {
      const request = consumeHomeCalculatorRequest();
      if (!request || bookingAccess || booking) return;
      const service = serviceAlias(request.kind === 'windows' ? 'windows' : request.service);
      if (!service) { setUnsupportedIntent(true); return; }
      intentHandled.current = true;
      if (choice !== service) {
        if (choice && selection) interruptedSelections.current.set(choice, { selection: { ...selection }, touched: [...touchedSelection.current] });
        const remembered = interruptedSelections.current.get(service);
        setChoice(service); setSelection(remembered ? { ...remembered.selection } : selectionFor(service));
        touchedSelection.current = new Set(remembered?.touched || []); setTermsAccepted(false);
      }
      setLegacyImported(false); setUnsupportedIntent(false); setError(''); setWizardStep(0);
    };
    // An explicit URL selection takes precedence over an old queued service.
    if (new URLSearchParams(window.location.search).has('service')) consumeHomeCalculatorRequest();
    else receive();
    return subscribeHomeCalculatorRequests(receive);
  }, [bookingAccess, booking, choice]);

  const kaiCurrent = useRef<KaiCalculatorState | null>(null);
  kaiCurrent.current = { choice, selection, customer, requestedDate, notes, touchedSelection: [...touchedSelection.current] };
  const kaiReceiver = useRef<() => void>(() => {});
  kaiReceiver.current = () => {
    const transfer = consumeKaiTransfer();
    if (!transfer) return;
    consumeHomeCalculatorRequest();
    setKaiSummary(transfer.draft);
    if (booking || bookingAccess || submitting || openingPayment || recoveryLoading || returnMissing) {
      setKaiConflicts(['notes']); return; // An existing booking or restoration is never edited by a chat transfer.
    }
    let current = kaiCurrent.current!;
    if (current.choice && current.selection) interruptedSelections.current.set(current.choice, { selection: { ...current.selection }, touched: [...touchedSelection.current] });
    const desired = serviceAlias(transfer.draft.service === 'end' ? 'endOfTenancy' : transfer.draft.service);
    const remembered = desired && desired !== current.choice ? interruptedSelections.current.get(desired) : null;
    if (remembered && desired) current = { ...current, choice: desired, selection: { ...remembered.selection }, touchedSelection: remembered.touched };
    const applied = applyKaiBookingTransfer(current, transfer.draft, transfer.policy);
    touchedSelection.current = new Set(applied.touchedSelection || []);
    intentHandled.current = true;
    setChoice(applied.choice); setSelection(applied.selection); setCustomer(applied.customer);
    setRequestedDate(applied.requestedDate); setNotes(applied.notes); setKaiConflicts(applied.conflicts);
    setWizardStep(0); setLegacyImported(false); setUnsupportedIntent(false); setTermsAccepted(false); setError(''); setFieldErrors({});
    // Facts and interrupted configurations remain in memory; nothing is written to legacy personal-data storage.
  };
  useEffect(() => {
    kaiReceiver.current();
    const unsubscribe = subscribeKaiTransfers(() => kaiReceiver.current());
    const unregister = registerKaiCalculationPreview(draft => {
      const current = kaiCurrent.current!;
      const desired = serviceAlias(draft.service === 'end' ? 'endOfTenancy' : draft.service);
      const remembered = desired && desired !== current.choice ? interruptedSelections.current.get(desired) : null;
      return kaiBookingPreview(remembered && desired ? { ...current, choice: desired, selection: { ...remembered.selection }, touchedSelection: remembered.touched } : current, draft);
    });
    return () => { unsubscribe(); unregister(); };
  }, []);

  const chooseLegacyItem = (index: number) => {
    const item = legacyCart[index];
    const service = serviceAlias(item?.type || '');
    if (!service) return;
    intentHandled.current = true; setChoice(service); setSelection(legacySelection(service, item));
    touchedSelection.current = new Set(Object.keys(legacySelection(service, item)));
    setLegacyImported(true); setUnsupportedIntent(false); setTermsAccepted(false); setError('');
    setWizardStep(0);
  };
  const updateSelection = (changes: Record<string, unknown>) => {
    for (const key of Object.keys(changes)) touchedSelection.current.add(key);
    setSelection(current => current ? { ...current, ...changes } as BookingSelection : current);
    setTermsAccepted(false); setError('');
  };
  const updateCustomer = (key: keyof Customer, value: string) => { setCustomer(current => ({ ...current, [key]: value })); setTermsAccepted(false); setError(''); };
  const acceptRecoveryAccess = (access: RecoveryAccess) => {
    if (preview || !safeId.test(access.id) || !safeToken.test(access.accessToken)) return;
    setRecoveryAccess(access);
    setRecoveryEmailLanguage(locale);setEmailLanguageNotice(null);
    try { sessionStorage.setItem(recoveryTokenKey(access.id), access.accessToken); } catch { /* No customer details are stored. */ }
    const url = new URL(window.location.href); url.searchParams.set('draft', access.id);
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
  };

  async function changeCommunicationLanguage() {
    if(preview || changingEmailLanguage || (!bookingAccess&&!recoveryAccess))return;
    setChangingEmailLanguage(true);setEmailLanguageNotice(null);
    try {
      if(bookingAccess) {
        const updated=await api<BookingView>(`/api/booking/requests/${encodeURIComponent(bookingAccess.id)}/language`,{method:'PATCH',headers:{Authorization:`Bearer ${bookingAccess.token}`},body:JSON.stringify({language:locale})});
        setBooking(current=>current?.bookingId===updated.bookingId?{...current,language:updated.language,languageSnapshot:updated.languageSnapshot}:current);
      } else if(recoveryAccess) {
        const updated=await api<{language:string}>(`/api/recovery/drafts/${encodeURIComponent(recoveryAccess.id)}/activity`,{method:'POST',headers:{Authorization:`Bearer ${recoveryAccess.accessToken}`},body:JSON.stringify({language:locale})});
        setRecoveryEmailLanguage(updated.language);
      }
      setEmailLanguageNotice('saved');
    }catch{setEmailLanguageNotice('error');}
    finally{setChangingEmailLanguage(false);}
  }

  function focusStep(fieldId?: string) {
    window.requestAnimationFrame(() => {
      const target = (fieldId ? document.getElementById(fieldId) : null) || stepHeadingRef.current;
      if (!target) return;
      let ancestor = target.parentElement;
      while (ancestor) { if (ancestor instanceof HTMLDetailsElement) ancestor.open = true; ancestor = ancestor.parentElement; }
      target.focus({ preventScroll: true });
      const scrollTarget = fieldId ? target : stepPanelRef.current || target;
      scrollTarget.scrollIntoView({ block: fieldId ? 'center' : 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      // Inline errors use the selected site language instead of native browser popovers.
    });
  }
  function stepIssue(step: WizardStep): { step: WizardStep; message: string; fieldId?: string } | null {
    if (step === 0) {
      if (!/^[1-9]\d{3}$/.test(customer.postalCode.trim())) return { step: 0, message: text('invalidContact'), fieldId: 'kr-calc-postal' };
      if (!selection || !choice) return { step: 0, message: text('selectToStart') };
      if (selection.service === 'moving' && selection.cleaning && !selection.sameAddress) return { step: 0, message: pricingText('sameAddressHint'), fieldId: 'kr-calc-sameAddress' };
      if (selection.service === 'moving' && selection.cleaning && (selection.rooms || 0) > 3.5) return { step: 0, message: pricingText('comboRoomsMatch'), fieldId: 'kr-calc-rooms' };
      if (!quote || priceError) return { step: 0, message: text('priceError'), fieldId: priceError?.field ? `kr-calc-${priceError.field.replace(/\./g, '-')}` : undefined };
      return null;
    }
    if (step === 1) {
      const values: Array<[keyof Customer, number, number, string]> = [
        ['address', 3, 180, 'address'], ['postalCode', 4, 4, 'postal'], ['city', 2, 100, 'city'],
        ['name', 2, 120, 'name'], ['email', 1, 254, 'email'], ['phone', 6, 40, 'phone'],
      ];
      for (const [key, min, max, id] of values) {
        const value = customer[key].trim();
        if (value.length < min || value.length > max || /[\u0000-\u001f]/.test(value)) return { step: 1, message: text('checkRequired'), fieldId: `kr-calc-${id}` };
      }
      if (!/^\d{4}$/.test(customer.postalCode.trim())) return { step: 1, message: text('invalidContact'), fieldId: 'kr-calc-postal' };
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email.trim())) return { step: 1, message: text('invalidContact'), fieldId: 'kr-calc-email' };
      if (!/^[+\d\s()./-]+$/.test(customer.phone.trim())) return { step: 1, message: text('invalidContact'), fieldId: 'kr-calc-phone' };
      const day = new Date(`${requestedDate}T12:00:00Z`);
      const currentTime = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Zurich', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date());
      if (!/^\d{4}-\d{2}-\d{2}$/.test(requestedDate) || !Number.isFinite(day.getTime()) || day.toISOString().slice(0, 10) !== requestedDate || requestedDate < localToday() || requestedDate > localToday(new Date(Date.now() + 366 * 86400000))) return { step: 1, message: text('invalidDate'), fieldId: 'kr-calc-date' };
      if (!/^\d{2}:\d{2}$/.test(requestedTime) || requestedTime < '09:00' || requestedTime > '19:00' || Number(requestedTime.slice(3)) % 15 !== 0 || (requestedDate === localToday() && requestedTime <= currentTime)) return { step: 1, message: text('invalidDate'), fieldId: 'kr-calc-time' };
      if (notes.length > 3000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(notes)) return { step: 1, message: text('checkRequired'), fieldId: 'kr-calc-notes' };
    }
    return null;
  }
  function reportPanelValidity(): boolean {
    const controls = stepPanelRef.current?.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input, select, textarea');
    const invalid: Record<string, FieldErrorKey> = {};
    for (const control of controls || []) {
      if (!control.validity.valid) invalid[control.id] = fieldErrorKey(control.id, control.validity.valueMissing);
    }
    setFieldErrors(invalid);
    const first = Object.keys(invalid)[0];
    if (first) { setError(text('checkRequired')); focusStep(first); return false; }
    return true;
  }
  const fieldAttributes = (id: string) => ({ 'aria-invalid': fieldErrors[id] ? true : undefined, 'aria-describedby': fieldErrors[id] ? `${id}-error` : undefined });
  const inlineFieldError = (id: string) => fieldErrors[id] ? <span id={`${id}-error`} className="kr-calc-field-error">{text(fieldErrors[id])}</span> : null;
  function revealIssue(issue: NonNullable<ReturnType<typeof stepIssue>>) {
    setWizardStep(issue.step); setError(issue.message); setTermsAccepted(false);
    if (issue.fieldId) setFieldErrors(current => ({ ...current, [issue.fieldId!]: fieldErrorKey(issue.fieldId!, false) }));
    focusStep(issue.fieldId);
  }
  function navigateStep(target: WizardStep) {
    if (submitting) return;
    if (target > wizardStep) {
      if (!reportPanelValidity()) return;
      for (let index = 0; index < target; index++) {
        const issue = stepIssue(index as WizardStep);
        if (issue) { revealIssue(issue); return; }
      }
    }
    setError(''); setWizardStep(target); focusStep();
  }
  const nextStep = () => navigateStep(Math.min(2, wizardStep + 1) as WizardStep);

  const submitRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (wizardStep < 2) { nextStep(); return; }
    for (let index = 0; index < 2; index++) {
      const issue = stepIssue(index as WizardStep);
      if (issue) { revealIssue(issue); return; }
    }
    if (!termsAccepted) { setError(text('checkRequired')); finalConsentRef.current?.focus(); return; }
    if (preview && demoEnabled && selection && quote && !submitting) {
      setError(''); setSubmitting(true); setJourneyPhase('request');
      const snapshot=createDemoBooking(selection,customer,requestedDate,requestedTime,locale);
      demoTimer.current=setTimeout(() => {
        setBooking(snapshot); setSubmitting(false); setJourneyPhase(null);
        window.requestAnimationFrame(() => submittedResult.current?.focus());
      },1800);
      return;
    }
    if (preview || !selection || !quote || submitting || !config?.available) return;
    setError('');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(requestedDate) || requestedDate < localToday() || !/^\d{2}:\d{2}$/.test(requestedTime) || requestedTime < '09:00' || requestedTime > '19:00') {
      setError(text('invalidDate')); return;
    }
    const payload = {
      selection, customer, requestedDate, requestedTime, notes, language: bookingRequestLanguage(language, window.location.href),
      termsAccepted: true, termsVersion: config.termsVersion || TERMS_VERSION,
      pricingVersion: quote.pricingVersion, acceptedTotalCents: quote.totalCents,
      ...(recoveryAccess ? { recovery: recoveryAccess } : {}),
    };
    setSubmitting(true); setJourneyPhase('request');
    try {
      idempotency.current = await calculatorSubmission(payload, idempotency.current, randomId);
      const result = await api<BookingView>('/api/booking/requests', {
        method: 'POST', body: JSON.stringify({ ...payload, idempotencyKey: idempotency.current.key }),
      });
      if (!safeId.test(result.bookingId) || !result.publicToken || !safeToken.test(result.publicToken)) throw new BookingApiError('INVALID_RESPONSE', 502);
      clearPrivateDrafts();
      clearCalculatorDraft();
      idempotency.current = null;
      setCart?.([]);
      rememberToken(result.bookingId, result.publicToken);
      browserAccessUi.current.establish(result.bookingId, result.publicToken);
      setBooking(result); setBookingAccess({ id: result.bookingId, token: result.publicToken });
      if (recoveryAccess) { try { sessionStorage.removeItem(recoveryTokenKey(recoveryAccess.id)); } catch { /* Optional session state. */ } }
      setRecoveryAccess(null);
      const url = new URL(window.location.href);
      url.searchParams.set('booking', result.bookingId); url.searchParams.delete('payment'); url.searchParams.delete('draft'); url.hash = '';
      window.history.replaceState(window.history.state, '', url.pathname + url.search);
      window.requestAnimationFrame(() => submittedResult.current?.focus());
    } catch (cause) {
      const fieldByCode: Record<string, string> = { INVALID_NAME: 'name', INVALID_EMAIL: 'email', INVALID_PHONE: 'phone', INVALID_ADDRESS: 'address', INVALID_POSTAL_CODE: 'postal', INVALID_CITY: 'city', INVALID_DATE: 'date', INVALID_TIME: 'time', INVALID_DATE_TIME: 'date', DATE_OUT_OF_RANGE: 'date' };
      if (cause instanceof BookingApiError && fieldByCode[cause.code]) revealIssue({ step: 1, message: text(cause.code.includes('DATE') || cause.code.includes('TIME') ? 'invalidDate' : 'invalidContact'), fieldId: `kr-calc-${fieldByCode[cause.code]}` });
      else if (cause instanceof BookingApiError && cause.code === 'PRICE_CHANGED') revealIssue({ step: 0, message: text('priceChanged') });
      else if (cause instanceof BookingApiError && cause.code === 'TERMS_REQUIRED') {
        setTermsAccepted(false); setConfigAttempt(value => value + 1);
        revealIssue({ step: 2, message: text('termsUpdated'), fieldId: 'kr-calc-final-consent' });
      }
      else setError(text(cause instanceof BookingApiError && cause.status === 409 ? 'priceChanged' : 'networkError'));
    } finally { setSubmitting(false); setJourneyPhase(null); }
  };

  const refreshStatus = async () => {
    if (preview || !bookingAccess || loadingStatus) return;
    setError(''); setLoadingStatus(true);
    try { await readStatus(bookingAccess); } catch { setError(text('networkError')); }
    finally { setLoadingStatus(false); }
  };
  const startPayment = async () => {
    if (preview && demoEnabled && booking?.demo && booking.canCheckout && payConsent && !openingPayment) {
      setError('');setOpeningPayment(true);setJourneyPhase('verification');
      const snapshot=booking as DemoBooking;
      demoTimer.current=setTimeout(() => {
        const result=settleDemoPayment(snapshot,demoOutcome,locale);
        setBooking(result);setOpeningPayment(false);setPayConsent(false);setJourneyPhase(demoOutcome==='paid'?'success':null);
        if(demoOutcome==='failed') setError(journey.paymentFailed);
      },2600);
      return;
    }
    if (preview || !bookingAccess || !booking || !payConsent || !canOpenCheckout || openingPayment) return;
    setError(''); setOpeningPayment(true); setJourneyPhase('checkout');
    try {
      const result = await api<{ link: string }>(`/api/booking/requests/${encodeURIComponent(bookingAccess.id)}/checkout`, {
        method: 'POST', headers: { Authorization: `Bearer ${bookingAccess.token}` },
        body: JSON.stringify({ acceptedQuoteRevision: booking.quoteRevision, termsAccepted: true, termsVersion: booking.termsVersion || config?.termsVersion || TERMS_VERSION, language: bookingRequestLanguage(language, window.location.href) }),
      });
      const paymentUrl = new URL(result.link);
      if (paymentUrl.protocol !== 'https:') throw new BookingApiError('INVALID_PAYMENT_LINK', 502);
      window.location.assign(paymentUrl.href);
    } catch (cause) {
      await refreshStatus();
      setPayConsent(false);
      setError(text(checkoutErrorKey(cause instanceof BookingApiError ? cause : null)));
      setOpeningPayment(false);
      setJourneyPhase(null);
    }
  };
  const reset = () => {
    browserAccessUi.current.clear(); setBookingEntryPending(false);
    clearCalculatorDraft(); idempotency.current = null;
    if (demoTimer.current) clearTimeout(demoTimer.current);
    setSubmitting(false);setOpeningPayment(false);setJourneyPhase(null);setJourneyEmail(null);
    verifiedSuccess.current='';verifyingPayment.current='';
    setBookingAccess(null); setBooking(null); setReturnMissing(false); setChoice('endOfTenancy'); setSelection(defaultSelection('endOfTenancy'));
    setTermsAccepted(false); setPayConsent(false); setError(''); setCustomer({ ...emptyCustomer });
    setRequestedDate(''); setRequestedTime('09:00'); setNotes('');
    setKaiSummary(null); setKaiConflicts([]); touchedSelection.current.clear(); interruptedSelections.current.clear();
    setWizardStep(0);
    setRecoveryAccess(null); setRecoveryEmailLanguage(null);setEmailLanguageNotice(null);setRecoveryRestored(false); setRecoveryLoading(false);
    intentHandled.current = true; setLegacyImported(false); setUnsupportedIntent(false);
    const url = new URL(window.location.href);
    for (const key of ['booking', 'payment', 'service', 'draft']) url.searchParams.delete(key);
    url.hash = ''; window.history.replaceState(window.history.state, '', url.pathname + url.search);
  };

  const startDemo = () => {
    if(!preview) return;
    reset();setDemoEnabled(true);setChoice('endOfTenancy');setSelection(defaultSelection('endOfTenancy'));
    setCustomer({name:'Demo Kraken',email:'preview@example.com',phone:'+41790000000',address:'Musterstrasse 1',postalCode:'8000',city:'Zürich'});
    setRequestedDate(localToday(new Date(Date.now()+7*86400000)));setRequestedTime('09:00');
    setTermsAccepted(false);setDemoOutcome('paid');
    focusStep();
  };
  const confirmDemo = () => {
    if(!preview || !booking?.demo) return;
    setBooking(confirmDemoAppointment(booking as DemoBooking));setPayConsent(false);setError('');
  };
  const completePendingDemo = () => {
    if(!preview || !booking?.demo || booking.payment.status!=='pending') return;
    setBooking(settleDemoPayment(booking as DemoBooking,'paid',locale));setJourneyPhase('success');
  };

  const number = (name: string, label = name, min = 0, step = 1, hint?: string, max = 1000) => <NumberField key={name}
    name={name} label={text(label)} value={Number((selection as unknown as Record<string, unknown>)?.[name])}
    min={min} max={max} step={step} hint={hint} invalid={priceError?.field === name || Boolean(fieldErrors[`kr-calc-${name}`])} errorMessage={fieldErrors[`kr-calc-${name}`] ? text(fieldErrors[`kr-calc-${name}`]) : undefined} text={text}
    onChange={value => updateSelection({ [name]: value })} />;
  const toggle = (name: string, label = name, hint?: string, price?: string) => <ToggleField key={name}
    name={name} label={text(label)} checked={Boolean((selection as unknown as Record<string, unknown>)?.[name])}
    hint={hint} price={price} onChange={value => updateSelection({ [name]: value })} />;
  const extras = (content: React.ReactNode, count: number) => <details className="kr-calc-extras" open={extrasOpen} onToggle={event => setExtrasOpen(event.currentTarget.open)}>
    <summary><span>{text('extrasOptional')}<em>{text('extrasReassurance')}</em></span><small>{text('extrasCount', { count })}</small><ChevronDown aria-hidden="true" /></summary>
    <div className="kr-calc-extras-content">{content}</div>
  </details>;

  function details() {
    if (!selection) return null;
    switch (selection.service) {
      case 'regular': return <>
        <div className="kr-calc-fields">
          {choice !== 'deep' && <div className="kr-calc-field"><label htmlFor="kr-calc-frequency">{text('frequency')}</label>
            <select id="kr-calc-frequency" value={selection.frequency} onChange={event => {
              const frequency = event.target.value as typeof selection.frequency;
              updateSelection({ frequency, cleaningKind: 'regular', hours: Math.max(selection.hours || 0, getRegularMinimumHours({ ...selection, frequency, cleaningKind: 'regular' })) });
            }}>
              {(['weekly', 'fortnightly', 'monthly', 'once'] as const).map(value => <option key={value} value={value}>{text(value)} · {money(REGULAR_RATES[value])}/h</option>)}
            </select>
          </div>}
          {number('hours', 'hours', getRegularMinimumHours(selection), .25, text('minimumRegular', { hours: getRegularMinimumHours(selection) }), pricingConfig.limits.personHours)}
        </div>
        <p className="kr-calc-hint">{text('hoursHint')}</p>
        {extras(<>
        <div className="kr-calc-toggles">
          {toggle('materials', 'materials', text('materialsHint'), money(pricingConfig.regular.extras.materialsPerVisitCents))}
          {toggle('oven', 'oven', undefined, money(pricingConfig.regular.extras.ovenCents))}
          {toggle('fridge', 'fridge', undefined, money(pricingConfig.regular.extras.fridgeCents))}
        </div>
        <div className="kr-calc-fields kr-calc-extra-fields">{number('ironingHours', 'ironing', 0, .25, `${money(pricingConfig.regular.extras.ironingHourlyRateCents)}/h`, pricingConfig.limits.personHours)}</div>
        </>, [selection.materials, selection.oven, selection.fridge, selection.ironingHours > 0].filter(Boolean).length)}
      </>;
      case 'endOfTenancy': return <>
        <div className="kr-calc-fields">
          <div className="kr-calc-field"><label htmlFor="kr-calc-mode">{text('billingMode')}</label>
            <select id="kr-calc-mode" value={selection.mode} onChange={event => updateSelection({ mode: event.target.value })}><option value="fixed">{text('fixed')}</option><option value="hourly">{text('hourly')} · {money(pricingConfig.endOfTenancy.hourly.rateCents)}/h</option></select>
          </div>
          <div className="kr-calc-field"><label htmlFor="kr-calc-property-type">{text('propertyType')}</label><select id="kr-calc-property-type" value={selection.propertyType} onChange={event => updateSelection({ propertyType: event.target.value })}><option value="apartment">{text('apartment')}</option><option value="house">{text('house')}</option></select></div>
          {number('rooms', 'rooms', 1, .5, undefined, 100)}
          {number('areaM2', 'area', .01, .01, undefined, 10_000)}
          {selection.mode === 'hourly' && number('hours', 'hours', pricingConfig.endOfTenancy.hourly.minimumHours, .25, text('minimumRegular', { hours: pricingConfig.endOfTenancy.hourly.minimumHours }), pricingConfig.limits.personHours)}
        </div>
        {selection.mode === 'fixed' && selection.propertyType === 'apartment' && <EotAreaRule rooms={selection.rooms} language={locale} money={money} />}
        {selection.mode === 'fixed' && selection.propertyType === 'apartment' ? <ul className="kr-calc-included-benefits">
          {['eotBenefitKitchenBath', 'eotBenefitWindowsFloors', 'eotBenefitHandover'].map(key => <li key={key}><CheckCircle2 aria-hidden="true" /><span>{text(key)}</span></li>)}
        </ul> : <p className="kr-calc-included"><Info aria-hidden="true" />{text(selection.mode === 'hourly' ? 'notice.hourly_no_handover_guarantee' : 'houseHint')}</p>}
        {extras(<>
        <div className="kr-calc-fields">
          {number('bathrooms', 'bathrooms', 0, 1, text('bathroomsHint'))}{number('guestWcs')}
          {number('slatBlinds')}{number('rollerShutters')}{number('smallBalconies')}{number('largeBalconies')}
          {number('storageRooms')}{number('garages')}{number('carpetRooms')}
        </div>
        <div className="kr-calc-toggles">{toggle('heavySoiling', 'heavySoiling', text('heavyHint'), `+${pricingConfig.endOfTenancy.extras.heavySoilingPercent} %`)}</div>
        </>, [selection.bathrooms > 1, selection.guestWcs > 0, selection.slatBlinds > 0, selection.rollerShutters > 0, selection.smallBalconies > 0, selection.largeBalconies > 0, selection.storageRooms > 0, selection.garages > 0, selection.carpetRooms > 0, selection.heavySoiling].filter(Boolean).length)}
      </>;
      case 'construction': return <>
        <div className="kr-calc-fields">
          <div className="kr-calc-field"><label htmlFor="kr-calc-mode">{text('billingMode')}</label><select id="kr-calc-mode" value={selection.mode} onChange={event => updateSelection({ mode: event.target.value })}><option value="area">{text('areaMode')}</option><option value="hourly">{text('hourMode')} · {money(pricingConfig.construction.hourly.rateCents)}/h</option></select></div>
          <div className="kr-calc-field"><label htmlFor="kr-calc-level">{text('constructionLevel')}</label><select id="kr-calc-level" value={selection.level} onChange={event => updateSelection({ level: event.target.value })}><option value="light">{text('light')}</option><option value="full">{text('full')}</option></select></div>
          {number('areaM2', 'area', selection.mode === 'hourly' ? 0 : .01, .01, undefined, 10_000)}
          {selection.mode === 'hourly' && number('hours', 'hours', pricingConfig.construction.hourly.minimumHours, .25, text('minimumRegular', { hours: pricingConfig.construction.hourly.minimumHours }), pricingConfig.limits.personHours)}
        </div>
        {extras(<>
        <div className="kr-calc-fields">{number('cementM2', 'cementM2', 0, .01, `${money(pricingConfig.construction.extras.cementPerM2Cents)}/m²`, pricingConfig.limits.areaM2)}{number('filmWindows', 'filmWindows', 0, 1, money(pricingConfig.construction.extras.filmWindowCents))}{number('slatBlinds', 'slatBlinds', 0, 1, money(pricingConfig.windows.rates.slatBlindsCents))}</div>
        <div className="kr-calc-toggles">{toggle('extraArea', 'extraArea', text('extraAreaHint'))}</div>
        </>, [selection.cementM2 > 0, selection.filmWindows > 0, selection.slatBlinds > 0, selection.extraArea].filter(Boolean).length)}
      </>;
      case 'windows': return <>
        <p className="kr-calc-included"><CheckCircle2 aria-hidden="true" />{text('windowIncluded')}</p>
        <div className="kr-calc-fields">{number('standard', 'standard', 0, 1, money(pricingConfig.windows.rates.standardCents))}{number('double', 'double', 0, 1, money(pricingConfig.windows.rates.doubleCents))}{number('balconyDoors', 'balconyDoors', 0, 1, money(pricingConfig.windows.rates.balconyDoorCents))}{number('roof', 'roof', 0, 1, money(pricingConfig.windows.rates.roofCents))}</div>
        {extras(<>
        <div className="kr-calc-fields">{number('slatBlinds', 'slatBlinds', 0, 1, money(pricingConfig.windows.rates.slatBlindsCents))}{number('rollerShutters', 'rollerShutters', 0, 1, money(pricingConfig.windows.rates.rollerShutterCents))}</div>
        <div className="kr-calc-toggles">{toggle('difficultAccess', 'difficultAccess', undefined, money(pricingConfig.windows.rates.difficultAccessPerVisitCents))}{toggle('winterGarden', 'winterGarden', text('winterGardenHint'))}</div>
        </>, [selection.slatBlinds > 0, selection.rollerShutters > 0, selection.difficultAccess, selection.winterGarden].filter(Boolean).length)}
      </>;
      case 'moving': return <MovingCalculatorFields selection={selection} onChange={updateSelection} text={text} language={locale} money={money} />;
    }
  }

  const services: ServiceChoice[] = ['endOfTenancy', 'windows', 'regular', 'deep', 'moving', 'construction'];
  const emailState = booking?.payment.status === 'paid' ? booking?.email?.receipt : booking?.email?.request;
  const paid = booking?.payment.status === 'paid';
  const emailStatusKey = bookingMailStatusKey(emailState, paid, preview || config?.emailReady === true);
  const testPaid = booking?.payment.status === 'test_paid';
  const held = booking?.scheduling.status === 'held';
  const needsReschedule = booking?.scheduling.status === 'needs_reschedule';
  const pending = booking?.payment.status === 'pending';
  const changedPayment = Boolean(booking && ['refunded', 'partially_refunded', 'partially-refunded', 'chargeback', 'disputed', 'reconciliation_required'].includes(booking.payment.status));
  const dueNow = booking?.payment.amountDueNowCents;
  const depositPercent = booking?.payment.depositPercent ?? config?.depositPercent ?? 15;
  const finalTotal = booking?.quote.totalCents;
  const finalBalance = booking?.payment.remainingBalanceCents;
  const balanceAfterDeposit = typeof finalTotal === 'number' && typeof dueNow === 'number' ? Math.max(0, finalTotal - dueNow) : null;
  const stepKeys = ['stepService', 'stepSchedule', 'stepReview'] as const;
  const stepHintKeys = ['configureHint', 'stepScheduleHint', 'stepReviewHint'] as const;
  const stepTitleKeys = ['configureTitle', 'planTitle', 'reviewReady'] as const;
  const nextLabel = ['continueSchedule', 'continueReview'][wizardStep] || 'stepReview';
  const liveTotal = quote?.priceType === 'from' && typeof quote.fromPriceCents === 'number' ? pricingText('fromPrice', { price: money(quote.fromPriceCents) }) : manualReview ? text('individual') : quote && typeof quote.totalCents === 'number' ? money(quote.totalCents) : '—';
  const reviewDate = requestedDate && Number.isFinite(Date.parse(`${requestedDate}T12:00:00Z`)) ? new Intl.DateTimeFormat(locale === 'de' ? 'de-CH' : locale, { dateStyle: 'full', timeZone: 'Europe/Zurich' }).format(new Date(`${requestedDate}T12:00:00Z`)) : '—';
  const focusConsent = () => {
    finalConsentRef.current?.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    finalConsentRef.current?.focus({ preventScroll: true });
  };

  useEffect(() => {
    if(!booking) return;
    const identity=`${booking.bookingId}:${booking.quoteRevision}`;
    if(paid && !preview && verifiedSuccess.current!==identity) {
      verifiedSuccess.current=identity;setJourneyPhase('success');
    } else if(!preview && pending && verifyingPayment.current!==identity) {
      verifyingPayment.current=identity;setJourneyPhase('verification');
    } else if(changedPayment) setJourneyPhase(null);
  },[booking?.bookingId,booking?.quoteRevision,paid,pending,changedPayment,preview]);
  useEffect(() => {
    if(preview || journeyPhase!=='verification') return;
    const timeout=window.setTimeout(()=>setJourneyPhase(current=>current==='verification'?null:current),25_000);
    return ()=>window.clearTimeout(timeout);
  },[journeyPhase,preview]);
  const guide = (presentation:'card'|'button'='card') => {
    const service = booking?.quote.service || choice || selection?.service;
    if (service !== 'moving' && service !== 'endOfTenancy') return null;
    return <MovingGuide language={locale} preview={preview} service={service} customer={booking?.customer || customer} requestedDate={booking?.scheduling.date || requestedDate} appointmentConfirmed={booking?.scheduling.status==='confirmed'} initialPreferences={guidePreferences} onPreferencesChange={setGuidePreferences} presentation={presentation} />;
  };

  return <main id="main" className="kr-service-calculator" lang={language}>
    <div className="kr-calc-shell">
      <header className="kr-calc-intro">
        <p className="kr-calc-eyebrow">{text('eyebrow')}</p>
        <h1>{text('titleStart')} <span>{text('titleAccent')}</span></h1>
        <p className="kr-calc-lead">{text('intro')}</p>
        <div className="kr-calc-trust"><span><MapPin aria-hidden="true" />{text('region')}</span><span><ShieldCheck aria-hidden="true" />{text('noVat')}</span><span><Check aria-hidden="true" />{text('personal')}</span></div>
      </header>
      {preview && <section className="kr-journey-demo-bar" aria-label={journey.demoActive}><div><strong>{demoEnabled?journey.demoActive:journey.demoStart}</strong><p>{journey.demoNote}</p></div><button type="button" className="kr-calc-secondary" onClick={demoEnabled?()=>{reset();setDemoEnabled(false);}:startDemo}>{demoEnabled?journey.demoStop:journey.demoStart}</button></section>}
      {kaiSummary && <section className="kr-calc-card kr-calc-kai-transfer" aria-labelledby="kr-calc-kai-title">
        <h2 id="kr-calc-kai-title">{text('kaiTransferTitle')}</h2><p>{text('kaiTransferHint')}</p>
        {kaiConflicts.length > 0 && <p className="kr-calc-inline-note" role="status">{text('kaiTransferConflicts')}</p>}
        <dl>{KAI_FIELDS.filter(field => kaiSummary.fields[field]).map(field => <div key={field}><dt>{kaiDraftFieldLabel(field, locale)}</dt><dd>{kaiSummary.fields[field]}</dd></div>)}</dl>
      </section>}
      {recoveryRestored && <p className="kr-calc-inline-note" role="status"><CheckCircle2 aria-hidden="true" />{text('recoveryRestored')}</p>}
      {recoveryLoading && <div className="kr-calc-loading" role="status"><LoaderCircle className="kr-calc-spin" aria-hidden="true" />{text('working')}</div>}
      {config?.mode === 'test' && <p className="kr-calc-alert kr-calc-test" role="status">{text('testBanner')}</p>}
      {!preview && config?.available && config.emailReady === false && <p className="kr-calc-inline-note" role="status"><Mail aria-hidden="true" />{text(booking ? 'mailUnavailable' : 'emailUnavailableBeforeRequest')}</p>}
      {returnMissing && <><BookingAccessRecovery language={locale} bookingId={new URLSearchParams(window.location.search).get('booking') || bookingEntry.id || undefined} onRecovered={recoverBookingAccess} /><button type="button" className="kr-calc-secondary" onClick={reset}>{text('newRequest')}</button></>}
      {(bookingAccess || bookingEntryPending) && !booking && <div className="kr-calc-loading" role="status">{loadingStatus || bookingEntryPending ? <><LoaderCircle className="kr-calc-spin" aria-hidden="true" />{text('working')}</> : <button type="button" className="kr-calc-secondary" onClick={() => { void refreshStatus(); }}>{text('refresh')}</button>}</div>}
      {error && <p className="kr-calc-alert" role="alert">{error}</p>}
      {!preview && (booking?.language || (recoveryAccess && recoveryEmailLanguage)) && <section className="kr-calc-card" style={{marginBottom:24}} aria-label={journey.emailLanguage}>
        <p>{journey.emailLanguage}: <strong>{LANGUAGE_NAMES[bookingLanguage(booking?.language || recoveryEmailLanguage || locale)]}</strong></p>
        {communicationPreferenceDiffers(locale,booking?.language || recoveryEmailLanguage) && <><p>{communicationCopy[locale].note}</p><button type="button" className="kr-calc-secondary" disabled={changingEmailLanguage} onClick={()=>void changeCommunicationLanguage()}>{changingEmailLanguage?<LoaderCircle className="kr-calc-spin" aria-hidden="true"/>:null}{communicationCopy[locale].use}</button></>}
        {emailLanguageNotice && <p role={emailLanguageNotice==='error'?'alert':'status'}>{communicationCopy[locale][emailLanguageNotice]}</p>}
      </section>}
      {!preview && !bookingAccess && !booking && !bookingEntryPending && !returnMissing && !recoveryLoading && <details className="kr-calc-access-tools" style={{ marginBottom:24 }}><summary className="kr-calc-text-button" style={{ minHeight:44 }}>{accessRecoveryText(locale,'title')}</summary><BookingAccessRecovery language={locale} onRecovered={recoverBookingAccess} /></details>}
      {!bookingAccess && !booking && !bookingEntryPending && !returnMissing && !recoveryLoading && <>
        {unsupportedIntent && <p className="kr-calc-alert" role="status">{text('unsupportedIntent')}</p>}
        {wizardStep === 0 && legacyCart.length > 0 && <section className="kr-calc-card" style={{ marginBottom: 24 }} aria-labelledby="kr-calc-legacy-title"><h2 id="kr-calc-legacy-title" className="kr-calc-subtitle" style={{ marginTop: 0 }}>{text('previousBasket', { count: legacyCart.length })}</h2><p className="kr-calc-section-hint" style={{ marginTop: 0 }}>{text('previousBasketHint')}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>{legacyCart.map((item, index) => { const service = serviceAlias(item?.type || ''); return service ? <button className="kr-calc-secondary" type="button" key={item?.id || index} onClick={() => chooseLegacyItem(index)}>{index + 1}. {text(service)}</button> : item?.type === 'comic-book' ? <button className="kr-calc-secondary" type="button" key={item.id || index} onClick={() => onNavigate('comic-shop')}>{index + 1}. {text('comicShop')}</button> : <span className="kr-calc-inline-note" key={item?.id || index} style={{ margin: 0 }}>{index + 1}. {text('unsupportedBasketItem')}</span>; })}</div>
          {legacyCart.some(item => !serviceAlias(item?.type || '')) && <p className="kr-calc-price-note">{text('excludedBasketItems')}</p>}
        </section>}
        {legacyImported && <p className="kr-calc-inline-note" style={{ marginBottom: 24 }} role="status"><Info aria-hidden="true" />{text('legacyImported')}</p>}
      </>}

      {booking ? <section ref={submittedResult} tabIndex={-1} className="kr-calc-result" aria-labelledby="kr-calc-result-title">
        <div className="kr-calc-result-heading">
          <span className="kr-calc-result-icon">{paid ? <CheckCircle2 aria-hidden="true" /> : held ? <CalendarDays aria-hidden="true" /> : <ClipboardList aria-hidden="true" />}</span>
          <div><p className="kr-calc-eyebrow">{text('reference')} · {booking.reference || booking.bookingId}</p><h2 id="kr-calc-result-title">{text(testPaid ? 'testTitle' : changedPayment ? 'paymentChangedTitle' : needsReschedule ? 'rescheduleTitle' : paid ? (depositPercent < 100 ? 'depositPaidTitle' : 'paidTitle') : pending ? 'pendingTitle' : holdHasExpired ? 'holdExpiredTitle' : held ? 'heldTitle' : 'receivedTitle')}</h2>
            <p>{text(testPaid ? 'testBody' : changedPayment ? 'inactiveReceipt' : needsReschedule ? 'rescheduleBody' : paid ? 'paidBody' : pending ? 'pendingBody' : holdHasExpired ? 'holdExpiredBody' : held ? 'heldBody' : 'receivedBody')}</p>
            {!preview && booking.scheduling.status === 'requested' && !paid && !testPaid && !changedPayment && <p>{text('paymentNextStep')}</p>}</div>
        </div>
        {preview && booking.demo && <section className="kr-journey-demo-booking"><span>{journey.demoNote}</span><div><button type="button" className="kr-calc-secondary" onClick={()=>setJourneyEmail(paid?'receipt':'request')}>{paid?journey.receiptEmail:journey.requestEmail}</button>{booking.scheduling.status==='requested' && <button type="button" className="kr-calc-primary" disabled={booking.quote.totalCents===null || Boolean(booking.quote.manualReviewReasons.length)} onClick={confirmDemo}>{journey.demoConfirm}</button>}{pending && <button type="button" className="kr-calc-primary" onClick={completePendingDemo}>{journey.verifyDemo}</button>}</div>{booking.scheduling.status==='requested' && <p>{booking.quote.totalCents===null?journey.demoManual:journey.demoConfirmHint}</p>}</section>}
        {checkoutHasExpired && <div className="kr-calc-alert" role="alert"><p style={{ margin: '0 0 12px' }}>{text('checkoutExpired')}</p><a href="tel:+41774505705">+41 77 450 57 05</a><span aria-hidden="true"> · </span><a href="mailto:kai@krakenpfm.ch">kai@krakenpfm.ch</a></div>}
        {holdHasExpired && <div className="kr-calc-alert" role="status"><a href="tel:+41774505705">+41 77 450 57 05</a><span aria-hidden="true"> · </span><a href="mailto:kai@krakenpfm.ch">kai@krakenpfm.ch</a></div>}
        <div className="kr-calc-layout kr-calc-booking-layout">
          <div className="kr-calc-stack">
            <section className="kr-calc-card">
              <div className="kr-calc-section-title"><CalendarDays aria-hidden="true" /><h3>{text(needsReschedule ? 'appointmentReschedule' : holdHasExpired ? 'holdExpiredTitle' : booking.scheduling.status === 'confirmed' ? 'appointmentConfirmed' : held ? 'appointmentHeld' : 'appointmentRequested')}</h3></div>
              {!needsReschedule && <div className="kr-calc-appointment"><strong>{booking.scheduling.date ? new Intl.DateTimeFormat(locale === 'de' ? 'de-CH' : locale, { dateStyle: 'full', timeZone: 'Europe/Zurich' }).format(new Date(`${booking.scheduling.date}T12:00:00Z`)) : '—'}</strong><span>{booking.scheduling.time || '—'}{booking.scheduling.endTime ? `–${booking.scheduling.endTime}` : ''} · {text('swissTime')}</span></div>}
              {booking.scopeNotes && <div className="kr-calc-scope-notes"><h4>{text('selectedExtras')}</h4><p>{booking.scopeNotes}</p></div>}
              {(booking.customer || customer.address) && <div className="kr-calc-address"><MapPin aria-hidden="true" /><div><h4>{text('serviceAddress')}</h4><p>{booking.customer?.address || customer.address}<br />{booking.customer?.postalCode || customer.postalCode} {booking.customer?.city || customer.city}</p></div></div>}
              {emailStatusKey && <p className="kr-calc-email-state" role="status"><Mail aria-hidden="true" />{text(emailStatusKey)}</p>}
              {!preview && <button type="button" className="kr-calc-secondary" onClick={() => { void refreshStatus(); }} disabled={loadingStatus}>{loadingStatus && <LoaderCircle className="kr-calc-spin" aria-hidden="true" />}{text('refresh')}</button>}
            </section>
            {canOpenCheckout && <section className="kr-calc-card kr-calc-payment-card">
              <div className="kr-calc-section-title"><CreditCard aria-hidden="true" /><h3>{text('paymentSummary')}</h3></div>
              <dl className="kr-calc-payment-details">
                <div><dt>{booking.quote.priceType === 'estimate' ? pricingText('estimate') : text('total')}</dt><dd>{typeof finalTotal === 'number' ? money(finalTotal) : text('individual')}</dd></div>
                <div className="kr-calc-due"><dt>{depositPercent < 100 ? text('depositDue', { percent: depositPercent }) : text('fullDue')}</dt><dd>{typeof dueNow === 'number' ? money(dueNow) : '—'}</dd></div>
                {typeof balanceAfterDeposit === 'number' && <div><dt>{text('remaining')}</dt><dd>{money(balanceAfterDeposit)}</dd></div>}
              </dl>
              <p className="kr-calc-final-price">{pricingText('finalPrice')}</p>
              {preview && booking.demo && <label className="kr-journey-demo-result">{journey.demoResult}<select value={demoOutcome} onChange={event=>setDemoOutcome(event.target.value as DemoPaymentOutcome)} disabled={openingPayment}><option value="paid">{journey.resultPaid}</option><option value="pending">{journey.resultPending}</option><option value="failed">{journey.resultFailed}</option></select></label>}
              {!preview && <p>{text('paymentReadyStep')}</p>}
              <label className="kr-calc-consent"><input type="checkbox" checked={payConsent} onChange={event => setPayConsent(event.target.checked)} /><span>{preview&&booking.demo?journey.demoConsent:booking.termsVersion&&booking.termsVersion!==BOOKING_TERMS_VERSION?text('payConsentExisting'):<>{text('payConsent')} <a href={publicHref('/terms', locale)} target="_blank" rel="noopener noreferrer">{text('terms')}</a></>}</span></label>
              <button type="button" className="kr-calc-primary" disabled={!payConsent || openingPayment || typeof dueNow !== 'number' || dueNow <= 0} onClick={() => { void startPayment(); }}>{openingPayment ? <LoaderCircle className="kr-calc-spin" aria-hidden="true" /> : <ShieldCheck aria-hidden="true" />}{preview&&booking.demo?journey.demoPay:text(openingPayment ? 'openingPayment' : depositPercent < 100 ? 'payDeposit' : 'pay')}</button>
            </section>}
            {paid && <section className="kr-calc-card kr-calc-payment-card"><div className="kr-calc-section-title"><CheckCircle2 aria-hidden="true" /><h3>{text('paidAmount')}</h3></div><strong className="kr-calc-paid-amount">{money(booking.payment.amountPaidCents)}</strong>{typeof finalBalance === 'number' && <p className="kr-calc-balance">{text('remaining')}: <strong>{money(finalBalance)}</strong></p>}</section>}
            {guide()}
            <button type="button" className="kr-calc-secondary kr-calc-new-request" onClick={reset}>{text('newRequest')}</button>
          </div>
          <aside className="kr-calc-summary kr-calc-card"><h2>{text('summary')}</h2><PriceSummary quote={booking.quote} text={text} language={locale} money={money} /></aside>
        </div>
      </section> : !bookingAccess && !bookingEntryPending && !returnMissing && !recoveryLoading && <>
        <form onInputCapture={event => { const id = (event.target as HTMLElement).id; if (fieldErrors[id]) setFieldErrors(current => { const next = { ...current }; delete next[id]; return next; }); }} ref={formRef} className="kr-calc-layout" noValidate onSubmit={submitRequest}>
          <div className="kr-calc-stack">
            <section className="kr-calc-step-panel kr-calc-card" ref={stepPanelRef} aria-labelledby="kr-calc-step-title" data-step={wizardStep}>
              <nav className="kr-calc-stepper" aria-label={text('stepProgress', { current: wizardStep + 1, total: 3 })}>
                {stepKeys.map((key, index) => <button key={key} type="button" className={`kr-calc-step ${wizardStep === index ? 'is-active' : ''} ${index < wizardStep ? 'is-complete' : ''}`} aria-current={wizardStep === index ? 'step' : undefined} disabled={submitting} onClick={() => navigateStep(index as WizardStep)}>
                  <span className="kr-calc-step-number">{index < wizardStep ? <Check aria-hidden="true" /> : index + 1}</span><span className="kr-calc-step-copy">{text(key)}</span>
                </button>)}
              </nav>
              <header className="kr-calc-step-header"><p className="kr-calc-step-progress">{text('stepProgress', { current: wizardStep + 1, total: 3 })}</p><div className="kr-calc-section-title">{wizardStep === 1 && <KrakenServiceIcon name="appointment" size={42} />}<h2 id="kr-calc-step-title" ref={stepHeadingRef} tabIndex={-1}>{text(stepTitleKeys[wizardStep])}</h2></div><p className="kr-calc-section-hint">{text(stepHintKeys[wizardStep])}</p></header>
              {demoEnabled && <p className="kr-journey-sample-note">{journey.demoData}</p>}
              {wizardStep === 0 && <fieldset className="kr-calc-fields-group" disabled={submitting}><legend className="kr-calc-sr-only">{text('configureTitle')}</legend>
                <CalculatorPostcodeCheck value={customer.postalCode} onChange={value => updateCustomer('postalCode', value)} language={locale} error={fieldErrors['kr-calc-postal'] ? text(fieldErrors['kr-calc-postal']) : undefined} />
                <div className="kr-calc-services kr-calc-services-compact" aria-label={text('serviceTitle')}>{services.map(id => <button key={id} type="button" className={`kr-calc-service ${choice === id ? 'is-selected' : ''}`} aria-pressed={choice === id} aria-controls="kr-calc-configuration" onClick={() => chooseService(id)}>
                  <span className="kr-calc-service-icon"><KrakenServiceIcon name={id} size={48} /></span><span className="kr-calc-service-copy"><strong>{text(id)}</strong></span>{choice === id && <><Check className="kr-calc-selected-mark" aria-hidden="true" /><span className="kr-calc-sr-only">{text('selectedLabel')}</span></>}
                </button>)}</div>
                <div id="kr-calc-configuration" className="kr-calc-service-configuration">
                  {selection ? <>
                    {details()}
                    {priceError && <p className="kr-calc-alert" role="alert">{text(['windows_required', 'blinds_exceed_windows', 'cement_area_exceeds_total'].includes(priceError.code) ? `error.${priceError.code}` : 'priceError')}</p>}
                    {quote?.notices.map(notice => <p className="kr-calc-inline-note" key={notice.code}><Info aria-hidden="true" />{text(`notice.${notice.code}`)}</p>)}
                    {quote?.manualReviewReasons.map(notice => <p className="kr-calc-inline-note" key={notice.code}><Info aria-hidden="true" />{text(`notice.${notice.code}`)}</p>)}
                  </> : <p className="kr-calc-service-empty"><ClipboardList aria-hidden="true" /><span>{text('selectToStart')}</span></p>}
                </div>
              </fieldset>}
              {wizardStep === 1 && <>
                <fieldset className="kr-calc-fields-group" disabled={submitting}><legend className="kr-calc-sr-only">{text('planTitle')}</legend>
                  <div className="kr-calc-fields">
                    <div className="kr-calc-field kr-calc-wide"><label htmlFor="kr-calc-address">{text('address')}</label><input id="kr-calc-address" {...fieldAttributes('kr-calc-address')} name="street-address" autoComplete="street-address" required minLength={3} maxLength={180} value={customer.address} onChange={event => updateCustomer('address', event.target.value)} />{inlineFieldError('kr-calc-address')}</div>
                    <div className="kr-calc-field"><label htmlFor="kr-calc-postal">{text('postalCode')}</label><input id="kr-calc-postal" {...fieldAttributes('kr-calc-postal')} name="postal-code" autoComplete="postal-code" inputMode="numeric" pattern="[0-9]{4}" required maxLength={4} value={customer.postalCode} onChange={event => updateCustomer('postalCode', event.target.value)} />{inlineFieldError('kr-calc-postal')}</div>
                    <div className="kr-calc-field"><label htmlFor="kr-calc-city">{text('city')}</label><input id="kr-calc-city" {...fieldAttributes('kr-calc-city')} name="address-level2" autoComplete="address-level2" required minLength={2} maxLength={100} value={customer.city} onChange={event => updateCustomer('city', event.target.value)} />{inlineFieldError('kr-calc-city')}</div>
                    <div className="kr-calc-field"><label htmlFor="kr-calc-date">{text('requestedDate')}</label><input id="kr-calc-date" {...fieldAttributes('kr-calc-date')} name="requestedDate" type="date" required min={today} max={localToday(new Date(Date.now() + 366 * 86400000))} value={requestedDate} onChange={event => { setRequestedDate(event.target.value); setTermsAccepted(false); setError(''); }} />{inlineFieldError('kr-calc-date')}</div>
                    <div className="kr-calc-field"><label htmlFor="kr-calc-time">{text('requestedTime')}</label><input id="kr-calc-time" {...fieldAttributes('kr-calc-time')} name="requestedTime" type="time" required min="09:00" max="19:00" step={900} value={requestedTime} onChange={event => { setRequestedTime(event.target.value); setTermsAccepted(false); setError(''); }} />{inlineFieldError('kr-calc-time')}</div>
                  </div><p className="kr-calc-inline-note"><CalendarDays aria-hidden="true" />{text('dateHint')}</p>
                </fieldset>
                <fieldset className="kr-calc-fields-group kr-calc-contact-group" disabled={submitting}><legend className="kr-calc-sr-only">{text('contactTitle')}</legend><div className="kr-calc-section-title"><KrakenServiceIcon name="mail" size={38} /><h3>{text('contactTitle')}</h3></div>
                  <div className="kr-calc-fields">
                    <div className="kr-calc-field kr-calc-wide"><label htmlFor="kr-calc-name">{text('name')}</label><input id="kr-calc-name" {...fieldAttributes('kr-calc-name')} name="name" autoComplete="name" required minLength={2} maxLength={120} value={customer.name} onChange={event => updateCustomer('name', event.target.value)} />{inlineFieldError('kr-calc-name')}</div>
                    <div className="kr-calc-field"><label htmlFor="kr-calc-email">{text('email')}</label><input id="kr-calc-email" {...fieldAttributes('kr-calc-email')} name="email" autoComplete="email" type="email" required maxLength={254} value={customer.email} onChange={event => updateCustomer('email', event.target.value)} />{inlineFieldError('kr-calc-email')}</div>
                    <div className="kr-calc-field"><label htmlFor="kr-calc-phone">{text('phone')}</label><input id="kr-calc-phone" {...fieldAttributes('kr-calc-phone')} name="tel" autoComplete="tel" type="tel" required minLength={6} maxLength={40} value={customer.phone} onChange={event => updateCustomer('phone', event.target.value)} />{inlineFieldError('kr-calc-phone')}</div>
                    <div className="kr-calc-field kr-calc-wide"><label htmlFor="kr-calc-notes">{text('notes')}</label><textarea id="kr-calc-notes" {...fieldAttributes('kr-calc-notes')} rows={4} maxLength={3000} placeholder={text('notesHint')} value={notes} onChange={event => { setNotes(event.target.value); setTermsAccepted(false); }} /></div>
                  </div>
                </fieldset>
              </>}
              {wizardStep === 2 && <div className="kr-calc-review-blocks">
                <article className="kr-calc-review-block"><header><h3><KrakenServiceIcon name={choice || 'regular'} size={36} />{text('summaryService')}</h3><button type="button" className="kr-calc-text-button kr-calc-edit-button" aria-label={`${text('editSelection')}: ${text('summaryService')}`} onClick={() => navigateStep(0)}><Pencil aria-hidden="true" />{text('editSelection')}</button></header>
                  <p className="kr-calc-review-service">{choice ? text(choice) : ''}{selection?.service === 'regular' && <span> · {text(selection.frequency)}</span>}</p>
                  <ul className="kr-calc-review-lines">{quote?.lines.map(line => <li key={line.id}><span>{bookingLineLabel(locale, line)}<small>{line.quantity.toLocaleString(locale)} {line.unit === 'hour' ? 'h' : line.unit === 'm2' ? 'm²' : line.unit === 'm3' ? 'm³' : '×'}</small></span><strong>{money(line.totalCents)}</strong></li>)}</ul>
                  {selection?.service === 'moving' && selection.details && <p className="kr-calc-review-notes">{selection.details}</p>}
                  {quote?.notices.map(notice => <p key={notice.code} className="kr-calc-hint">{text(`notice.${notice.code}`)}</p>)}
                  {quote?.manualReviewReasons.map(notice => <p key={notice.code} className="kr-calc-hint">{text(`notice.${notice.code}`)}</p>)}
                  <p className="kr-calc-hint">{quote?.priceType === 'estimate' ? pricingText('estimateHint') : quote?.priceType === 'from' ? pricingText('fromHint') : text(manualReview ? 'manualPrice' : 'scopeFixed')}</p>
                </article>
                <article className="kr-calc-review-block"><header><h3><MapPin aria-hidden="true" />{text('reviewAppointment')}</h3><button type="button" className="kr-calc-text-button kr-calc-edit-button" aria-label={`${text('editSelection')}: ${text('reviewAppointment')}`} onClick={() => navigateStep(1)}><Pencil aria-hidden="true" />{text('editSelection')}</button></header><p>{customer.address}<br />{customer.postalCode} {customer.city}</p><p><strong>{reviewDate}</strong><br />{requestedTime} · {text('swissTime')}</p><span className="kr-calc-review-status">{text('appointmentRequested')}</span></article>
                <article className="kr-calc-review-block"><header><h3><Mail aria-hidden="true" />{text('reviewContact')}</h3><button type="button" className="kr-calc-text-button kr-calc-edit-button" aria-label={`${text('editSelection')}: ${text('reviewContact')}`} onClick={() => navigateStep(1)}><Pencil aria-hidden="true" />{text('editSelection')}</button></header><p><strong>{customer.name}</strong><br />{customer.email}<br />{customer.phone}</p>{notes.trim() && <p className="kr-calc-review-notes">{notes}</p>}</article>
              </div>}
              <footer className="kr-calc-step-actions">
                <div className="kr-calc-step-actions-context"><button type="button" className="kr-calc-secondary kr-calc-back-button" disabled={submitting} onClick={() => wizardStep>0?navigateStep((wizardStep - 1) as WizardStep):onNavigate('home')}>{wizardStep>0?text('previousStep'):journey.backHome}</button></div>
                {wizardStep < 2 && <button type="button" className="kr-calc-primary kr-calc-footer-next" disabled={submitting || !selection} onClick={nextStep}>{text(wizardStep === 0 ? 'footerContinueSchedule' : 'footerContinueReview')}</button>}
              </footer>
            </section>
          </div>
          <div className="kr-calc-aside-stack">
            <aside className="kr-calc-summary kr-calc-card" aria-labelledby="kr-calc-summary-title"><h2 id="kr-calc-summary-title">{text('summary')}</h2>
              {choice && <div className="kr-calc-summary-selection"><KrakenServiceIcon name={choice || 'regular'} size={36} /><span>{text(choice)}</span></div>}
              <PriceSummary quote={quote} text={text} language={locale} money={money} hasSelection={Boolean(selection)} />
              {quote?.service === 'moving' && quote.priceType === 'estimate' && typeof quote.depositBasisCents === 'number' && <p className="kr-calc-deposit-preview">{pricingText('depositMinimum', { percent: depositPercent })}<strong>{pricingText('depositPreview', { amount: money(Math.round(quote.depositBasisCents * depositPercent / 100)) })}</strong></p>}
              <CustomerReviews language={locale} />
              {!preview && config?.paymentReady && <p className="kr-calc-payment-method-note">{frictionText(locale, 'paymentReady')}{quote?.priceType !== 'estimate' && typeof config.depositPercent === 'number' && config.depositPercent > 0 && config.depositPercent <= 100 && <span>{frictionText(locale, 'deposit', { percent: String(config.depositPercent) })}</span>}</p>}
              {CONFIRMATION_WINDOW_COPY[locale] && <p className="kr-calc-request-note">{CONFIRMATION_WINDOW_COPY[locale]}</p>}
              {wizardStep < 2 ? <><button type="button" className="kr-calc-primary" disabled={submitting || (wizardStep === 0 && !selection)} onClick={nextStep}>{text(nextLabel)}</button><p className="kr-calc-request-note">{text('bookingJourney')}</p></> : <>
                <label className="kr-calc-consent"><input id="kr-calc-final-consent" ref={finalConsentRef} type="checkbox" required checked={termsAccepted} disabled={submitting} onChange={event => setTermsAccepted(event.target.checked)} /><span>{preview&&demoEnabled?journey.demoConsent:<>{text('termsPrefix')} <a href={`${preview ? 'https://krakenpfm.ch' : ''}${publicHref('/terms', locale)}`} target="_blank" rel="noopener noreferrer">{text('terms')}</a> {text('privacyPrefix')} <a href={`${preview ? 'https://krakenpfm.ch' : ''}${publicHref('/gdpr', locale)}`} target="_blank" rel="noopener noreferrer">{text('privacy')}</a> {text('readSuffix')}</>}</span></label>
                <button type="submit" className="kr-calc-primary" disabled={(preview?!demoEnabled:!config?.available) || !quote || submitting || !termsAccepted}>{submitting ? <LoaderCircle className="kr-calc-spin" aria-hidden="true" /> : <ClipboardList aria-hidden="true" />}{preview&&demoEnabled?journey.demoSubmit:text(submitting ? 'submitting' : manualReview ? 'manualSubmit' : 'requestSubmit')}</button>
                <p className="kr-calc-request-note">{preview?journey.demoNote:text('requestNote')}</p>
                {!preview && (configLoading ? <p className="kr-calc-status-note" role="status">{text('loadingConfig')}</p> : !config?.available && <div className="kr-calc-unavailable" role="status"><p>{text('unavailable')}</p><button type="button" className="kr-calc-text-button" onClick={() => setConfigAttempt(value => value + 1)}>{text('retry')}</button></div>)}
              </>}
            </aside>
            <details className="kr-calc-secondary-tools"><summary>{frictionText(locale, 'secondary')}</summary>
            {selection && quote && <QuoteRecoveryCard preview={preview} language={locale} selection={selection} selectedService={choice} email={customer.email} onEmailAccepted={email => updateCustomer('email', email)} onDraftSaved={acceptRecoveryAccess} onContinueSaved={()=>focusStep()} guide={guide('button')} guidePreferences={guidePreferences} />}
            {guide('button')}
            {selection && quote && <div className="kr-calc-whatsapp"><a href={buildQuoteWhatsAppHref(selection, choice || selection.service, locale)} target="_blank" rel="noopener noreferrer">{frictionText(locale, 'whatsapp')}</a><p>{frictionText(locale, 'whatsappNote')}</p></div>}
            <div className="kr-calc-help"><img src="/calculator-approved/assets/kai-help.webp" alt="" width="72" height="88" loading="lazy" aria-hidden="true" /><div><h3>{text('kaiGuide')}</h3><p>{text('kaiGuideHint')}</p><p>{text('helpHours')}</p><a className="kr-calc-contact-link" href={publicHref('/kontakt', locale)} target="_blank" rel="noopener noreferrer">{text('contactPage')}<ChevronDown aria-hidden="true" /></a><a href="tel:+41774505705"><Phone aria-hidden="true" />+41 77 450 57 05</a><a href="mailto:kai@krakenpfm.ch">kai@krakenpfm.ch</a></div></div>
            </details>
          </div>
          <div className="kr-calc-mobile-bar"><div className="kr-calc-mobile-price"><span>{quote?.priceType === 'estimate' ? pricingText('estimate') : quote?.priceType === 'from' ? pricingText('fromLabel') : text('currentTotal')}</span><strong aria-live="polite">{liveTotal}</strong><small>{pricingText('finalPrice')}</small></div><button type="button" className="kr-calc-primary" disabled={submitting || (wizardStep === 0 && !selection)} aria-controls={wizardStep === 2 ? 'kr-calc-final-consent' : 'kr-calc-step-title'} onClick={wizardStep === 2 ? focusConsent : nextStep}>{text(wizardStep === 2 ? 'stepReview' : 'nextStep')}</button></div>
        </form>
      </>}
    </div>
    <KrakenJourney phase={journeyPhase} language={locale} demo={preview} booking={booking} onClose={()=>setJourneyPhase(null)} onEmail={preview?()=>{setJourneyPhase(null);setJourneyEmail('receipt');}:undefined}>{journeyPhase==='success'&&guide('button')}</KrakenJourney>
    <JourneyEmailPreview open={Boolean(journeyEmail)} kind={journeyEmail||'request'} language={booking?.language||locale} booking={booking} onClose={()=>setJourneyEmail(null)} />
    {!booking && !bookingAccess && !returnMissing && !recoveryLoading && <CalculatorNudges selected={Boolean(selection)} step={wizardStep} preview={preview} language={locale} />}
  </main>;
}
