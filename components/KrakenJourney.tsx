import React, { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import type { PriceQuote } from '../src/booking/pricing';
import { bookingLanguage, bookingLineLabel, bookingText } from '../src/booking/uiCopy';
import { journeyCopy, LANGUAGE_NAMES } from '../src/booking/journeyCopy';
import {CalculatorCompletionCheck} from './CalculatorFeedback';
import './kraken-journey.css';

export interface JourneyBooking {
  reference: string;
  language?: string;
  customer?: { name: string; email: string; address: string; postalCode: string; city: string };
  scheduling: { date: string; time: string; status: string };
  quote: PriceQuote;
  payment: { amountPaidCents: number; remainingBalanceCents?: number; depositPercent?: number };
}
export type JourneyPhase = 'request' | 'checkout' | 'verification' | 'success';
interface KrakenJourneyProps {
  phase: JourneyPhase | null;
  language: string;
  demo: boolean;
  booking?: JourneyBooking | null;
  onClose: () => void;
  onEmail?: () => void;
  children?: ReactNode;
}

function useJourneyDialog(open: boolean, onClose: () => void) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const openRef = useRef(open);
  const closeCallback = useRef(onClose);
  openRef.current = open;
  closeCallback.current = onClose;
  const restoreFocus = () => {
    const opener = openerRef.current;
    if (opener?.isConnected) opener.focus({ preventScroll: true });
    openerRef.current = null;
  };
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
      closeRef.current?.focus({ preventScroll: true });
    } else if (!open && dialog.open) dialog.close();
  }, [open]);
  useEffect(() => () => { dialogRef.current?.close(); restoreFocus(); }, []);
  function onDialogClose(event: React.SyntheticEvent<HTMLDialogElement>) {
    if (event.target !== event.currentTarget) return;
    restoreFocus();
    if (openRef.current) closeCallback.current();
  }
  function onCancel(event: React.SyntheticEvent<HTMLDialogElement>) {
    if (event.target !== event.currentTarget) return;
    event.preventDefault();
    closeCallback.current();
  }
  function trapFocus(event: React.KeyboardEvent<HTMLDialogElement>) {
    if(event.target instanceof Element && event.target.closest('dialog')!==event.currentTarget) return;
    if (event.key !== 'Tab') return;
    const items = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')]
      .filter(item => item.tabIndex >= 0 && !item.hidden && item.getClientRects().length > 0);
    const first = items[0], last = items[items.length - 1];
    if (!first) { event.preventDefault(); return; }
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
  return { dialogRef, closeRef, onDialogClose, onCancel, trapFocus };
}

function Brand({ compact = false }: { compact?: boolean }) {
  return <div className={`kr-journey-brand${compact ? ' is-compact' : ''}`}>
    <span className="kr-journey-logo"><img src="/calculator-approved/assets/logo.webp" alt="Kraken" width="1024" height="1024" /></span>
    <span>Properties &amp; Facilities<br />Management</span>
  </div>;
}

/** Original code-native Transit concept. Brand and Kai use the existing original assets. */
function usePageVisibility() {
  const [visible, setVisible] = useState(() => typeof document === 'undefined' || !document.hidden);
  useEffect(() => {
    const update = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  return visible;
}
function TransitScene({ moving }: { moving: boolean }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  return <div className={`kr-journey-transit${moving ? '' : ' is-still'}`} aria-hidden="true">
    <svg viewBox="0 0 560 250" focusable="false">
      <defs>
        <linearGradient id={`${id}-body`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#fff" /><stop offset=".63" stopColor="#eef7fc" /><stop offset="1" stopColor="#c8dce9" /></linearGradient>
        <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#c1ebf4" /><stop offset="1" stopColor="#6a9eb9" /></linearGradient>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#e6f4ff" /><stop offset="1" stopColor="#f3fcf8" /></linearGradient>
        <clipPath id={`${id}-window`}><path d="M333 105h24l29 33h-53Z" /></clipPath>
        <clipPath id={`${id}-road`}><rect x="27" y="198" width="506" height="26" rx="13" /></clipPath>
      </defs>
      <ellipse cx="280" cy="139" rx="237" ry="95" fill={`url(#${id}-sky)`} />
      <g fill="none" stroke="#bed4df" strokeWidth="2" opacity=".6"><path d="M53 185v-31l27-22 27 22v31m-49-31h44M456 186v-46h31v46m8 0v-67h24v67" /><path d="M468 150h7m-7 12h7m-7 12h7m35-45h7m-7 13h7m-7 13h7" /></g>
      <g className="kr-journey-cloud" fill="#fff" opacity=".95"><path d="M90 80h69a14 14 0 0 0-14-14 23 23 0 0 0-44-4A14 14 0 0 0 90 80Z" /><path d="M407 65h49a11 11 0 0 0-11-11 16 16 0 0 0-31-3 11 11 0 0 0-7 14Z" /></g>
      <ellipse cx="273" cy="201" rx="194" ry="12" fill="#123d60" opacity=".10" />
      <rect x="27" y="198" width="506" height="26" rx="13" fill="#d4e8ed" />
      <g clipPath={`url(#${id}-road)`}><path className="kr-journey-road" d="M-50 212H610" stroke="#fff" strokeWidth="3" strokeDasharray="30 22" /></g>
      <g className="kr-journey-van">
        <path d="M83 183V99q0-15 17-15h221q19 0 32 16l34 37h28q24 0 29 23l5 23v10H83Z" fill={`url(#${id}-body)`} stroke="#a8c4d4" strokeWidth="2" />
        <path d="M86 169h237v12H86Z" fill="#b4e9d5" /><path d="M325 169h116v12H325Z" fill="#b4e9d5" />
        <path d="M102 92h211q17 0 28 14" stroke="#fff" strokeWidth="5" strokeLinecap="round" fill="none" opacity=".85" />
        <path d="M318 91v87M112 99v68m186-68v68" stroke="#b8cfdd" strokeWidth="1.5" fill="none" />
        <path d="M331 102h27l33 38h-60Z" fill={`url(#${id}-glass)`} stroke="#527b98" strokeWidth="2" />
        <g clipPath={`url(#${id}-window)`}>
          <image href="/calculator-approved/assets/kai.webp" x="307" y="99" width="125" height="125" preserveAspectRatio="xMidYMin meet" />
          <path d="m335 104 45 32" stroke="#fff" strokeWidth="8" opacity=".16" />
          <ellipse cx="380" cy="140" rx="10" ry="9" fill="none" stroke="#153d5c" strokeWidth="3" />
        </g>
        <path d="M392 140h12l7 6" fill="none" stroke="#385c73" strokeWidth="4" strokeLinecap="round" />
        <path d="M333 148h55v29" fill="none" stroke="#a4c2d4" strokeWidth="1.5" />
        <path d="M340 153h11M281 132h10" stroke="#4e6d83" strokeWidth="3" strokeLinecap="round" />
        <path d="M420 151h17l4 10h-21Z" fill="#faffef" stroke="#c0d5dc" strokeWidth="1.5" />
        <path d="M84 117h5v25h-5" fill="#ec7e7e" /><path d="M88 184h34m37 0h193m37 0h57" stroke="#52748d" strokeWidth="8" strokeLinecap="round" />
        <svg x="157" y="102" width="116" height="57" viewBox="0 252 1024 508" preserveAspectRatio="xMidYMid meet"><image href="/calculator-approved/assets/logo.webp" width="1024" height="1024" /></svg>
        <g className="kr-journey-wheel kr-journey-wheel-back"><circle cx="142" cy="187" r="25" fill="#163955" /><circle cx="142" cy="187" r="16" fill="#d2e4ed" /><circle cx="142" cy="187" r="7" fill="#8ba9bd" /><path d="M142 174v7m0 12v7m-13-13h7m12 0h7" stroke="#779bb2" strokeWidth="3" /></g>
        <g className="kr-journey-wheel kr-journey-wheel-front"><circle cx="373" cy="187" r="25" fill="#163955" /><circle cx="373" cy="187" r="16" fill="#d2e4ed" /><circle cx="373" cy="187" r="7" fill="#8ba9bd" /><path d="M373 174v7m0 12v7m-13-13h7m12 0h7" stroke="#779bb2" strokeWidth="3" /></g>
      </g>
    </svg>
  </div>;
}

function formatMoney(cents: number, language: string) {
  if (!Number.isFinite(cents)) return '—';
  return new Intl.NumberFormat(`${bookingLanguage(language)}-CH`, { style: 'currency', currency: 'CHF', currencyDisplay: 'code' }).format(cents / 100);
}
function formatDate(date: string, language: string) {
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T12:00:00Z`) : null;
  return parsed && Number.isFinite(parsed.getTime()) ? new Intl.DateTimeFormat(`${bookingLanguage(language)}-CH`, { timeZone: 'Europe/Zurich', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(parsed) : date || '—';
}
function serviceLabel(booking: JourneyBooking, language: string) {
  const deep = booking.quote.service === 'regular' && booking.quote.lines.some(line => line.id === 'regular-labour' && line.params?.frequency === 'once');
  return bookingText(language, deep ? 'deep' : booking.quote.service);
}
function NextSteps({ language }: { language: string }) {
  const copy = journeyCopy(language);
  return <section className="kr-journey-next"><h3>{copy.nextTitle}</h3><ol>
    {[[copy.receiptStep, copy.receiptBody], [copy.prepareStep, copy.prepareBody], [copy.serviceStep, copy.serviceBody]].map(([title, body], index) => <li key={title}><span className="kr-journey-step-number" aria-hidden="true">{index + 1}</span><div><strong>{title}</strong><p>{body}</p></div></li>)}
  </ol></section>;
}
function BookingDetails({ booking, language, paid }: { booking: JourneyBooking; language: string; paid: boolean }) {
  const copy = journeyCopy(language);
  const confirmed = booking.scheduling.status === 'confirmed';
  const remainder = booking.payment.remainingBalanceCents;
  return <div className="kr-journey-booking">
    <div className="kr-journey-booking-top"><strong>{serviceLabel(booking, language)}</strong><span>{copy.reference}: {booking.reference}</span></div>
    <div className="kr-journey-date"><img src="/calculator-approved/assets/kraken-emoji-appointment.svg" alt="" width="40" height="40" /><div><span>{paid && confirmed ? copy.emailConfirmed : copy.emailPending}</span><strong>{formatDate(booking.scheduling.date, language)}</strong><p>{booking.scheduling.time || '—'} · {bookingText(language, 'swissTime')}</p></div></div>
    {booking.customer?.address && <address>{booking.customer.address}<br />{booking.customer.postalCode} {booking.customer.city}</address>}
    <dl className="kr-journey-amounts">
      <div><dt>{copy.total}</dt><dd>{booking.quote.totalCents === null ? bookingText(language, 'individual') : formatMoney(booking.quote.totalCents, language)}</dd></div>
      {paid && <div className="kr-journey-paid"><dt>{copy.amountPaid}</dt><dd>{formatMoney(booking.payment.amountPaidCents, language)}</dd></div>}
      {paid && typeof remainder === 'number' && remainder > 0 && <div><dt>{copy.remaining}</dt><dd>{formatMoney(remainder, language)}</dd></div>}
    </dl>
  </div>;
}

export default function KrakenJourney({ phase, language, demo, booking, onClose, onEmail, children }: KrakenJourneyProps) {
  const copy = journeyCopy(language);
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const pageVisible = usePageVisibility();
  const { dialogRef, closeRef, onDialogClose, onCancel, trapFocus } = useJourneyDialog(phase !== null, onClose);
  const success = phase === 'success';
  const title = success ? copy.successTitle : phase === 'checkout' ? copy.checkoutTitle : phase === 'verification' ? copy.verifyTitle : copy.requestTitle;
  const description = success ? copy.successBody : phase === 'checkout' ? copy.checkoutBody : phase === 'verification' ? copy.verifyBody : copy.requestBody;
  return <dialog ref={dialogRef} className={`kr-journey-dialog${success ? ' is-success' : ''}${pageVisible ? '' : ' is-background'}`} lang={bookingLanguage(language)} aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`} onCancel={onCancel} onClose={onDialogClose} onKeyDown={trapFocus}>
    <header className="kr-journey-header"><Brand compact /><button ref={closeRef} type="button" className="kr-journey-close" aria-label={copy.close} onClick={onClose}><span aria-hidden="true">×</span></button></header>
    <div className="kr-journey-body">
      {demo && <div className="kr-journey-demo"><strong>{copy.demoActive}</strong><span>{copy.demoNote}</span></div>}
      <div className="kr-journey-hero">
        {success && <span className="kr-journey-success-mark" aria-hidden="true"><CalculatorCompletionCheck /></span>}
        <TransitScene moving={phase !== null && !success && pageVisible} />
        <div role="status" aria-live="polite" aria-atomic="true"><h2 id={`${id}-title`}>{title}</h2><p id={`${id}-description`}>{description}</p></div>
      </div>
      {!success && <div className="kr-journey-processing"><div className="kr-journey-progress" role="progressbar" aria-label={copy.processing}><span /></div><span>{copy.processing}<span className="kr-journey-dots" aria-hidden="true">…</span></span></div>}
      {success && <>
        {booking && <BookingDetails booking={booking} language={language} paid />}
        <NextSteps language={language} />
        <div className="kr-journey-contact"><a href="tel:+41774505705">+41 77 450 57 05</a><a href="mailto:kai@krakenpfm.ch">kai@krakenpfm.ch</a></div>
      </>}
      {children && <div className="kr-journey-extra">{children}</div>}
      <footer className="kr-journey-actions">{success && onEmail && <button type="button" className="kr-journey-primary" onClick={onEmail}>{copy.receiptEmail}</button>}<button type="button" className="kr-journey-secondary" onClick={onClose}>{copy.close}</button></footer>
    </div>
  </dialog>;
}

export function JourneyEmailPreview({ open, kind, language, booking, onClose }: { open: boolean; kind: 'request' | 'receipt'; language: string; booking: JourneyBooking | null; onClose: () => void }) {
  // The accepted booking locale is the email locale, even after switching the surrounding UI.
  const locale = bookingLanguage(booking?.language || language);
  const copy = journeyCopy(locale);
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const { dialogRef, closeRef, onDialogClose, onCancel, trapFocus } = useJourneyDialog(open, onClose);
  const paid = kind === 'receipt';
  const subject = paid ? copy.emailReceiptSubject : copy.emailRequestSubject;
  return <dialog ref={dialogRef} className="kr-journey-dialog kr-journey-email-dialog" lang={locale} aria-labelledby={`${id}-email-title`} onCancel={onCancel} onClose={onDialogClose} onKeyDown={trapFocus}>
    <header className="kr-journey-header"><div><p className="kr-journey-eyebrow">KRAKEN · E-MAIL</p><h2 id={`${id}-email-title`}>{copy.emailTitle}</h2></div><button ref={closeRef} type="button" className="kr-journey-close" aria-label={copy.close} onClick={onClose}><span aria-hidden="true">×</span></button></header>
    <div className="kr-journey-body">
      <div className="kr-journey-demo"><strong>{copy.emailDemo}</strong><span>{copy.emailLanguage}: {LANGUAGE_NAMES[locale]}</span></div>
      <dl className="kr-journey-envelope"><div><dt>{copy.subject}</dt><dd>{subject}</dd></div><div><dt>{copy.recipient}</dt><dd>{booking?.customer?.email || '—'}</dd></div></dl>
      <article className="kr-journey-email-paper"><div className="kr-journey-email-brand"><Brand /></div><div className="kr-journey-email-content">
        <h3>{paid ? copy.successTitle : copy.emailRequestSubject}</h3><p className="kr-journey-email-intro">{paid ? copy.emailReceiptBody : copy.emailRequestBody}</p>
        {booking && <>
          <BookingDetails booking={booking} language={locale} paid={paid} />
          {!!booking.quote.lines.length && <ul className="kr-journey-email-lines">{booking.quote.lines.map(line => <li key={line.id}><span>{bookingLineLabel(locale, line)}</span><strong>{formatMoney(line.totalCents, locale)}</strong></li>)}</ul>}
          <div className="kr-journey-email-vat"><span>{bookingText(locale, 'vat')}</span><strong>{formatMoney(booking.quote.vatCents, locale)}</strong></div>
        </>}
        {paid && <NextSteps language={locale} />}
        <div className="kr-journey-email-help"><strong>{copy.serviceStep}</strong><p>{copy.serviceBody}</p><a href="mailto:kai@krakenpfm.ch">kai@krakenpfm.ch</a><span> · </span><a href="tel:+41774505705">+41 77 450 57 05</a></div>
      </div><footer className="kr-journey-email-foot">Kraken Properties &amp; Facilities Management<br />Seewadelstrasse 3 · 8203 Schaffhausen</footer></article>
      <footer className="kr-journey-actions"><button type="button" className="kr-journey-secondary" onClick={onClose}>{copy.close}</button></footer>
    </div>
  </dialog>;
}
