import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { calculatePrice, type BookingSelection, type PriceQuote } from '../src/booking/pricing';
import { bookingLineLabel, bookingText } from '../src/booking/uiCopy';
import { fetchRecoveryEmailSettings, recoveryReminderFeedbackKey } from '../src/booking/emailAvailability';
import { recoveryCopy, recoveryLanguage, type RecoveryEmailKind } from '../src/booking/recoveryCopy';
import { type GuidePreferences } from '../src/booking/movingGuide';
import { journeyCopy, LANGUAGE_NAMES } from '../src/booking/journeyCopy';
import CustomerSpaceDemo, { type CustomerSpaceSnapshot } from './CustomerSpaceDemo';
import CustomerAccessRequest from './CustomerAccessRequest';
import './quote-recovery.css';

export interface QuoteRecoveryCardProps {
  preview: boolean;
  language: string;
  selection: BookingSelection | null;
  selectedService: string | null;
  email: string;
  onEmailAccepted: (email: string) => void;
  onDraftSaved?: (access: { id: string; accessToken: string }) => void;
  guidePreferences?: GuidePreferences;
  openSignal?: number;
  onContinueSaved?: () => void;
  guide?: React.ReactNode;
}

type SaveState = 'idle' | 'saving' | 'preview' | 'queued' | 'sent' | 'deliveryUnknown' | 'savedNoDelivery' | 'error';
interface RecoveryDraftResponse {
  id: string; accessToken: string; expiresAt: string;
  mailStatus: 'queued' | 'sending' | 'sent' | 'failed' | 'delivery_unknown';
  remindersEnabled?: boolean;
}
const CONSENT_VERSION = 'recovery-2026-11-24';
const EMAIL_KINDS: RecoveryEmailKind[] = ['saved', 'first', 'last'];
const MAIL_STATUSES = new Set(['queued', 'sending', 'sent', 'failed', 'delivery_unknown']);

/** Stable request identity in memory only: no email, token or selection is persisted by this component. */
function canonicalJson(value: unknown): string {
  const ordered = (item: unknown): unknown => {
    if (Array.isArray(item)) return item.map(ordered);
    if (item && typeof item === 'object') return Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)).map(([key, entry]) => [key, ordered(entry)]));
    return item;
  };
  return JSON.stringify(ordered(value));
}
function newKey(): string {
  return typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Array.from(crypto.getRandomValues(new Uint8Array(20)), value => value.toString(16).padStart(2, '0')).join('');
}
function isValidEmail(value: string): boolean {
  return value.length <= 254 && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/.test(value);
}
function validDraftResponse(value: unknown): value is RecoveryDraftResponse {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<RecoveryDraftResponse>;
  return typeof data.id === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(data.id)
    && typeof data.accessToken === 'string' && /^[A-Za-z0-9_-]{20,512}$/.test(data.accessToken)
    && typeof data.expiresAt === 'string' && Number.isFinite(Date.parse(data.expiresAt))
    && typeof data.mailStatus === 'string' && MAIL_STATUSES.has(data.mailStatus)
    && (data.remindersEnabled === undefined || typeof data.remindersEnabled === 'boolean');
}

export default function QuoteRecoveryCard({ preview, language, selection, selectedService, email, onEmailAccepted, onDraftSaved, openSignal = 0, onContinueSaved, guide, guidePreferences }: QuoteRecoveryCardProps) {
  const copy = recoveryCopy(language);
  const journey = journeyCopy(language);
  const locale = recoveryLanguage(language);
  const identity = useId().replace(/:/g, '');
  const [emailValue, setEmailValue] = useState(email);
  const [reminderConsent, setReminderConsent] = useState(false);
  const [accountOptIn, setAccountOptIn] = useState(false);
  const [demoAccount, setDemoAccount] = useState<CustomerSpaceSnapshot | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [error, setError] = useState<'invalidEmail' | 'chooseService' | 'unavailable' | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [recoveryReady, setRecoveryReady] = useState<boolean | null>(null);
  const [remindersReady, setRemindersReady] = useState(false);
  const [availabilityAttempt, setAvailabilityAttempt] = useState(0);
  const [emailKind, setEmailKind] = useState<RecoveryEmailKind>('saved');
  const [demoNotice, setDemoNotice] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const disclosureRef = useRef<HTMLDetailsElement>(null);
  const openSignalRef = useRef(0);
  const emailValueRef = useRef(emailValue);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const requestRef = useRef<{ serial: number; controller: AbortController | null }>({ serial: 0, controller: null });
  const keysRef = useRef(new Map<string, string>());
  const savedRef = useRef<RecoveryDraftResponse | null>(null);
  const mountedRef = useRef(true);
  const previewRef = useRef(preview);
  emailValueRef.current = emailValue;
  previewRef.current = preview;

  const normalizedEmail = emailValue.trim();
  const payload = { email: normalizedEmail, selection, language: locale, reminderConsent: reminderConsent && (preview || remindersReady), consentVersion: CONSENT_VERSION, ...(guidePreferences?{guidePreferences}:{}) };
  const fingerprint = canonicalJson(payload);
  const fingerprintRef = useRef(fingerprint);
  fingerprintRef.current = fingerprint;
  const selectionFingerprint = canonicalJson(selection);
  const quote: PriceQuote | null = useMemo(() => {
    if (!selection) return null;
    try { return calculatePrice(selection); } catch { return null; }
  }, [selectionFingerprint]);
  const money = (cents: number) => new Intl.NumberFormat(`${locale}-CH`, { style: 'currency', currency: 'CHF', currencyDisplay: 'code' }).format(cents / 100);
  const serviceKey = selectedService === 'deep' ? 'deep' : selection?.service || 'unknown';
  const serviceLabel = copy.services[serviceKey];
  const message = copy.emails[emailKind];
  const tabLabels = [copy.savedTab, copy.firstTab, copy.lastTab];
  const isSaved = !['idle', 'saving', 'error'].includes(saveState);
  const canSave = preview || recoveryReady === true;
  const reminderFeedbackKey = recoveryReminderFeedbackKey(preview, reminderConsent, savedRef.current?.remindersEnabled);

  useEffect(() => {
    if (preview) { setRecoveryReady(null); setRemindersReady(false); return; }
    const controller = new AbortController();
    setRecoveryReady(null);
    setRemindersReady(false);
    void fetchRecoveryEmailSettings(fetch, controller.signal).then(settings => {
      if (!controller.signal.aborted) { setRecoveryReady(settings.available); setRemindersReady(settings.remindersEnabled); }
    });
    return () => controller.abort();
  }, [preview, availabilityAttempt]);

  // A customer email entered elsewhere can prefill this card. Locally typed input is not overwritten on every render.
  useEffect(() => {
    if (email.trim() !== emailValueRef.current.trim()) {
      setEmailValue(email);
      setReminderConsent(false);
      setAccountOptIn(false);
      setDemoAccount(null);
      setAccountOpen(false);
    }
  }, [email]);

  useEffect(() => {
    if (openSignal <= openSignalRef.current) { openSignalRef.current = openSignal; return; }
    openSignalRef.current = openSignal;
    if (!disclosureRef.current) return;
    disclosureRef.current.open = true;
    const frame = window.requestAnimationFrame(() => {
      disclosureRef.current?.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      emailInputRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [openSignal]);

  useEffect(() => {
    if (!preview) { setAccountOptIn(false); setDemoAccount(null); setAccountOpen(false); }
  }, [preview]);

  useEffect(() => {
    requestRef.current.serial += 1;
    requestRef.current.controller?.abort();
    requestRef.current.controller = null;
    savedRef.current = null;
    setSaveState('idle');
    setError(null);
  }, [fingerprint, preview]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestRef.current.serial += 1;
      requestRef.current.controller?.abort();
      savedRef.current = null;
    };
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (modalOpen) {
      if (!dialog.open) dialog.showModal();
      closeRef.current?.focus();
    } else if (dialog.open) {
      dialog.close();
      openerRef.current?.focus();
    }
  }, [modalOpen, preview]);

  async function saveQuote() {
    if (saveState === 'saving' || !canSave) return;
    setError(null);
    if (!selection || !selectedService || !quote) { setError('chooseService'); return; }
    if (!isValidEmail(normalizedEmail)) {
      setError('invalidEmail');
      emailInputRef.current?.focus();
      return;
    }
    // The private design preview never fetches, persists or emails customer data.
    if (preview) {
      setSaveState('preview');
      setDemoAccount(accountOptIn ? { email: normalizedEmail, selection: JSON.parse(JSON.stringify(selection)) as BookingSelection, selectedService, quote: JSON.parse(JSON.stringify(quote)) as PriceQuote } : null);
      onEmailAccepted(normalizedEmail);
      return;
    }

    const requestFingerprint = fingerprint;
    let idempotencyKey = keysRef.current.get(requestFingerprint);
    if (!idempotencyKey) {
      idempotencyKey = newKey();
      keysRef.current.set(requestFingerprint, idempotencyKey);
      if (keysRef.current.size > 32) keysRef.current.delete(keysRef.current.keys().next().value as string);
    }
    const controller = new AbortController();
    requestRef.current.controller?.abort();
    const serial = ++requestRef.current.serial;
    requestRef.current.controller = controller;
    const stillCurrent = () => mountedRef.current && !previewRef.current && serial === requestRef.current.serial && requestFingerprint === fingerprintRef.current;
    let timedOut = false;
    const timeout = window.setTimeout(() => { timedOut = true; controller.abort(); }, 15000);
    setSaveState('saving');
    try {
      const response = await fetch('/api/recovery/drafts', {
        method: 'POST', credentials: 'same-origin', signal: controller.signal,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'Idempotency-Key': idempotencyKey },
        body: JSON.stringify({ ...payload, idempotencyKey }),
      });
      if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error('RECOVERY_UNAVAILABLE');
      const data: unknown = await response.json();
      if (!validDraftResponse(data)) throw new Error('RECOVERY_INVALID_RESPONSE');
      if (!stillCurrent()) return;
      savedRef.current = data;
      setSaveState(data.mailStatus === 'sent' ? 'sent' : data.mailStatus === 'queued' || data.mailStatus === 'sending' ? 'queued' : data.mailStatus === 'delivery_unknown' ? 'deliveryUnknown' : 'savedNoDelivery');
      onEmailAccepted(normalizedEmail);
      onDraftSaved?.({ id: data.id, accessToken: data.accessToken });
    } catch {
      if (!stillCurrent() || (controller.signal.aborted && !timedOut)) return;
      setSaveState('error');
      setError('unavailable');
    } finally {
      window.clearTimeout(timeout);
      if (requestRef.current.controller === controller) requestRef.current.controller = null;
    }
  }

  function closeModal() { setModalOpen(false); setDemoNotice(false); }
  function trapDialogFocus(event: React.KeyboardEvent<HTMLDialogElement>) {
    if(event.target instanceof Element && event.target.closest('dialog')!==event.currentTarget) return;
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeModal(); return; }
    if (event.key !== 'Tab') return;
    const elements = Array.from((event.currentTarget as HTMLDialogElement).querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'))
      .filter(element => element.tabIndex >= 0 && !element.hidden && element.getClientRects().length > 0);
    const first = elements[0];
    const last = elements[elements.length - 1];
    if (!first || !last) { event.preventDefault(); return; }
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  return <section className="kr-recovery" aria-label={copy.title}>
    <details ref={disclosureRef} className="kr-recovery-disclosure">
      <summary><img src="/calculator-approved/assets/kraken-emoji-mail.svg" alt="" width="42" height="42" aria-hidden="true" /><span>{copy.title}</span><span className="kr-recovery-chevron" aria-hidden="true" /></summary>
      <div className="kr-recovery-body">
        {!canSave ? <>
          <p className="kr-recovery-intro" role="status">{bookingText(locale, recoveryReady === null ? 'recoveryAvailabilityLoading' : 'recoveryUnavailable')}</p>
          {recoveryReady === false && <button type="button" className="kr-calc-text-button" onClick={() => setAvailabilityAttempt(value => value + 1)}>{bookingText(locale, 'retry')}</button>}
        </> : <>
        <p className="kr-recovery-intro">{copy.intro}</p>
        <p className="kr-recovery-language"><span>{journey.emailLanguage}</span><strong>{LANGUAGE_NAMES[locale]}</strong></p>
        <label className="kr-recovery-label" htmlFor={`${identity}-email`}>{copy.emailLabel}</label>
        <input ref={emailInputRef} id={`${identity}-email`} className="kr-recovery-email" type="text" inputMode="email" autoComplete="email" maxLength={254}
          value={emailValue} placeholder={copy.emailPlaceholder} aria-invalid={error === 'invalidEmail' || undefined}
          aria-describedby={`${identity}-privacy${error ? ` ${identity}-error` : ''}`}
          onChange={event => { setEmailValue(event.target.value); setReminderConsent(false); setAccountOptIn(false); setDemoAccount(null); setAccountOpen(false); }}
          onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); event.stopPropagation(); void saveQuote(); } }} />
        {(preview || remindersReady) && <label className="kr-recovery-consent"><input type="checkbox" checked={reminderConsent} onChange={event => setReminderConsent(event.target.checked)} /><span>{copy.consent}</span></label>}
        <p className="kr-recovery-privacy" id={`${identity}-privacy`}>{copy.privacy}</p>
        {preview && <div className="kr-recovery-account-option"><p className="kr-space-badge">{journey.accountDemo}</p><label className="kr-recovery-consent"><input type="checkbox" checked={accountOptIn} aria-describedby={`${identity}-account-hint`} onChange={event => { setAccountOptIn(event.target.checked); if (!event.target.checked) { setDemoAccount(null); setAccountOpen(false); } }} /><span>{journey.accountOptIn}</span></label><p id={`${identity}-account-hint`}>{journey.accountHint}</p></div>}
        <button type="button" className="kr-recovery-save" disabled={saveState === 'saving'} onClick={() => void saveQuote()}>{saveState === 'saving' ? copy.saving : journey.saveProgress}</button>
        {error && <p className="kr-recovery-error" role="alert" id={`${identity}-error`}>{copy[error]}{error === 'unavailable' ? ` ${copy.retry}` : ''}</p>}
        <div aria-live="polite" aria-atomic="true">
          {isSaved && <div className="kr-recovery-feedback"><strong>{saveState === 'preview' ? copy.previewSaved : copy[saveState as 'queued' | 'sent' | 'deliveryUnknown' | 'savedNoDelivery']}</strong><p>{copy[reminderFeedbackKey]}</p>{preview && demoAccount && <p>{journey.accountDemoSaved}</p>}</div>}
        </div>
        {!preview && isSaved && savedRef.current && <CustomerAccessRequest language={locale} email={normalizedEmail} recovery={savedRef.current} />}
        {preview && isSaved && demoAccount && <button type="button" className="kr-recovery-account-open" aria-haspopup="dialog" onClick={() => setAccountOpen(true)}>{journey.accountOpen}</button>}
        {preview && <p className="kr-recovery-preview-note">{copy.previewOnly}</p>}
        </>}
      </div>
    </details>
    {preview && <button type="button" className="kr-recovery-preview-link" aria-haspopup="dialog" onClick={event => { openerRef.current = event.currentTarget; setModalOpen(true); }}>{copy.previewEmails}</button>}
    {preview && <dialog ref={dialogRef} className="kr-recovery-dialog" aria-labelledby={`${identity}-modal-title`} aria-describedby={`${identity}-modal-description`}
      onCancel={event => { if (event.target !== event.currentTarget) return; event.preventDefault(); closeModal(); }} onKeyDown={trapDialogFocus} onClose={event => { if (event.target !== event.currentTarget) return; setModalOpen(false); openerRef.current?.focus(); }}>
      <div className="kr-recovery-dialog-header"><div><p className="kr-recovery-eyebrow">KRAKEN · E-MAIL</p><h2 id={`${identity}-modal-title`}>{copy.modalTitle}</h2></div><button type="button" ref={closeRef} className="kr-recovery-close" aria-label={copy.close} onClick={closeModal}><span aria-hidden="true">×</span></button></div>
      <p className="kr-recovery-modal-intro" id={`${identity}-modal-description`}>{copy.modalIntro}</p>
      <p className="kr-recovery-language"><span>{journey.emailLanguage}</span><strong>{LANGUAGE_NAMES[locale]}</strong></p>
      <div className="kr-recovery-tabs" role="tablist" aria-label={copy.tabsLabel}>
        {EMAIL_KINDS.map((kind, index) => <button type="button" role="tab" key={kind} ref={element => { tabRefs.current[index] = element; }} id={`${identity}-tab-${kind}`} aria-controls={`${identity}-email-panel`} aria-selected={emailKind === kind} tabIndex={emailKind === kind ? 0 : -1}
          onClick={() => { setEmailKind(kind); setDemoNotice(false); }} onKeyDown={event => {
            let next: number | null = null;
            if (event.key === 'ArrowRight') next = (index + 1) % EMAIL_KINDS.length;
            if (event.key === 'ArrowLeft') next = (index + EMAIL_KINDS.length - 1) % EMAIL_KINDS.length;
            if (event.key === 'Home') next = 0;
            if (event.key === 'End') next = EMAIL_KINDS.length - 1;
            if (next !== null) { event.preventDefault(); setEmailKind(EMAIL_KINDS[next]); setDemoNotice(false); tabRefs.current[next]?.focus(); }
          }}>{tabLabels[index]}</button>)}
      </div>
      <div className="kr-recovery-email-panel" role="tabpanel" id={`${identity}-email-panel`} aria-labelledby={`${identity}-tab-${emailKind}`} tabIndex={0}>
        <dl className="kr-recovery-envelope"><div><dt>{copy.subject}</dt><dd>{message.subject}</dd></div><div><dt>{copy.sender}</dt><dd>Kraken · kai@krakenpfm.ch</dd></div><div><dt>{copy.recipient}</dt><dd>{isValidEmail(normalizedEmail) ? normalizedEmail : copy.sampleEmail}</dd></div></dl>
        <article className="kr-recovery-email-design">
          <header className="kr-recovery-email-brand"><span className="kr-recovery-logo"><img src="/calculator-approved/assets/logo.webp" alt="Kraken" width="115" height="115" /></span><span>Properties &amp; Facilities<br />Management</span></header>
          <div className="kr-recovery-email-content"><h3>{message.title}</h3><p>{message.body}</p>
            <div className="kr-recovery-email-quote"><div className="kr-recovery-email-service"><span>{copy.service}</span><strong>{serviceLabel}</strong></div>
              {quote && <ul className="kr-recovery-email-lines">{quote.lines.map(line => <li key={line.id}><span>{bookingLineLabel(language, line)}</span><b>{money(line.totalCents)}</b></li>)}</ul>}
              <div className="kr-recovery-email-total"><span>{copy.selectedPrice}</span><strong>{quote ? quote.totalCents === null ? copy.individualPrice : money(quote.totalCents) : '—'}</strong></div>
              {quote && quote.totalCents !== null && <><div className="kr-recovery-email-tax"><span>{copy.vat}</span><b>{money(0)}</b></div>
                <div className="kr-recovery-email-saving"><span>{copy.comparison}</span><strong>{money(quote.vatComparisonCents ?? 0)}</strong><small>{copy.comparisonDetail}</small><small>{copy.hypotheticalGross}: {money(quote.totalCents + (quote.vatComparisonCents ?? 0))}</small></div></>}
            </div>
            {modalOpen && guide && <div className="kr-recovery-email-guide">{guide}</div>}
            <p className="kr-recovery-email-appointment">{copy.noReservation}</p>
            <button type="button" className="kr-recovery-email-cta" onClick={() => setDemoNotice(true)}>{copy.emailCta}</button>
            {demoNotice && <p className="kr-recovery-demo-action" role="status">{copy.demoCta}</p>}
            <p>{message.support}</p><p className="kr-recovery-email-signature">{copy.signature}</p>
          </div>
          <footer className="kr-recovery-email-footer"><p>{emailKind === 'saved' ? copy.requestedEmail : copy.reminderEmail}</p><p>Kraken Properties &amp; Facilities Management<br />Seewadelstrasse 3 · 8203 Schaffhausen<br />kai@krakenpfm.ch · +41 77 450 57 05</p>{emailKind !== 'saved' && <span className="kr-recovery-email-unsubscribe">{copy.unsubscribe} · {copy.previewOnly}</span>}</footer>
        </article>
      </div>
    </dialog>}
    {preview && demoAccount && <CustomerSpaceDemo open={accountOpen} language={locale} snapshot={demoAccount} onClose={() => setAccountOpen(false)} onContinue={onContinueSaved} guide={guide} />}
  </section>;
}
