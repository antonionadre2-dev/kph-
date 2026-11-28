import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './Auth';
import { auth } from './firebase';
import { useTranslation } from '../i18n';
import { normalizeHomeLanguage } from './home/homeTranslations';
import { bookingText, bookingLineLabel } from '../src/booking/uiCopy';
import { serviceName } from '../src/booking/serviceNames';
import { createOperatorClient } from '../src/booking/operator-client';
import { usesTermsPaymentDeadline } from '../src/booking/paymentDeadline';
import { operatorCopy } from '../src/booking/operatorCopy';
import { operatorAmountCents, proposedOperatorRefund, safeOperatorPaymentLink, operatorScopeLanguage } from '../src/booking/operatorUi';
import './booking-operations.css';

const base = '/api/booking/operator/requests';
export function BookingOperationsPanel() {
  const { user } = useAuth(), { language } = useTranslation(), lang = normalizeHomeLanguage(language), t = operatorCopy(lang);
  const scope = user?.staff === true && user.uid ? user.uid : '';
  const active = useRef(scope); active.current = scope;
  const generation = useRef(0), controller = useRef<AbortController | null>(null), mutationPending = useRef(false);
  const refundAttempt = useRef<{ bookingId: string; amountCents: number; key: string } | null>(null);
  const [visibleScope, setVisibleScope] = useState(''), [rows, setRows] = useState<any[]>([]), [detail, setDetail] = useState<any>(null);
  const [reference, setReference] = useState(''), [checked, setChecked] = useState(false), [holdMinutes, setHoldMinutes] = useState('120');
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(false), [failure, setFailure] = useState('');
  const [ready, setReady] = useState<{payment:boolean;email:boolean;scheduled:boolean|null}>({ payment: false, email: false, scheduled: null });
  const [periodStart, setPeriodStart] = useState(''), [periodEnd, setPeriodEnd] = useState(''), [visits, setVisits] = useState('');
  const [approvedPrice, setApprovedPrice] = useState(''), [scopeNotes, setScopeNotes] = useState(''), [scopeLanguage, setScopeLanguage] = useState(lang);
  const [actualHours, setActualHours] = useState(''), [cancelChecked, setCancelChecked] = useState(false), [refundChecked, setRefundChecked] = useState(false);
  const api = useMemo(() => createOperatorClient({ uid: scope, currentUser: () => auth.currentUser }), [scope]);
  async function run(path: string, body?: unknown, detailResult = false) {
    if (mutationPending.current) return null;
    if (body !== undefined) mutationPending.current = true;
    const own = scope, version = ++generation.current;
    controller.current?.abort(); const abort = new AbortController(); controller.current = abort;
    setBusy(true); setFailure(''); setMessage(false);
    try {
      const result = await api(path, body, abort.signal);
      if (active.current !== own || generation.current !== version) return null;
      if (typeof result.scheduledRemindersReady === 'boolean') setReady(previous => ({...previous,scheduled:result.scheduledRemindersReady}));
      if (detailResult) {
        setDetail(result); setChecked(false); setCancelChecked(false); setRefundChecked(false);
        setRows(previous => previous.map(row => row.bookingId === result.booking.bookingId ? result.booking : row));
      } else {
        setRows(result.bookings); setDetail(null); setChecked(false);
        setReady({ payment: result.paymentReady === true, email: result.emailReady === true, scheduled: typeof result.scheduledRemindersReady === 'boolean' ? result.scheduledRemindersReady : null });
      }
      setMessage(true); return result;
    } catch (error) {
      if (!abort.signal.aborted && active.current === own && generation.current === version) setFailure(error instanceof Error && /^[A-Z_]{3,80}$/.test(error.message) ? error.message : 'BOOKING_OPERATOR_UNAVAILABLE');
      return null;
    } finally {
      if (body !== undefined) mutationPending.current = false;
      if (active.current === own && generation.current === version) setBusy(false);
    }
  }
  useEffect(() => {
    setRows([]); setDetail(null); setReference(''); setChecked(false); setFailure(''); setMessage(false); setReady({ payment: false, email: false, scheduled: null }); setVisibleScope(scope);
    if (scope) void run(base);
    return () => { ++generation.current; controller.current?.abort(); };
  }, [scope, api]);
  useEffect(() => {
    setApprovedPrice(''); setScopeNotes(detail?.booking?.scopeNotes || ''); setScopeLanguage(operatorScopeLanguage(detail?.booking?.language)); setActualHours('');
    setPeriodStart(detail?.booking?.payment?.billingPeriod?.start || detail?.booking?.scheduling?.date || '');
    setPeriodEnd(detail?.booking?.payment?.billingPeriod?.end || '');
    setVisits(detail?.booking?.payment?.billingPeriod?.visits ? String(detail.booking.payment.billingPeriod.visits) : '');
    setCancelChecked(false); setRefundChecked(false); refundAttempt.current = null;
  }, [detail?.booking?.bookingId]);
  if (!scope || visibleScope !== scope) return null;
  const booking = detail?.booking, full = booking?.payment?.model === 'full_prepayment';
  const fromTerms = full || usesTermsPaymentDeadline(booking), monthly = booking?.payment?.billingMode === 'monthly';
  const dueAt = Date.parse(booking?.payment?.paymentDueAt || booking?.payment?.depositDueAt || '');
  const money = (cents: unknown) => Number.isSafeInteger(cents) ? new Intl.NumberFormat(lang, { style: 'currency', currency: 'CHF' }).format(Number(cents) / 100) : '—';
  const dateTime = (value: string | number) => new Intl.DateTimeFormat(lang, { timeZone: 'Europe/Zurich', dateStyle: 'long', timeStyle: 'short' }).format(new Date(value));
  const mailState = (value: string | undefined) => ({ scheduling: t.mailScheduling, cancelling: t.mailCancelling, scheduled: t.mailScheduled, cancelled: t.mailCancelled, cancel_failed: t.mailCancelFailed, schedule_failed: t.mailScheduleFailed, unavailable: t.reminderUnavailable, schedule_unknown: t.mailUnknown, cancel_unknown: t.mailUnknown, queued: t.mailQueued, sending: t.mailSending, sent: t.mailSent, delivered: t.mailDelivered, failed: t.mailFailed, delivery_unknown: t.mailUnknown, bounced: t.mailBounced, suppressed: t.mailSuppressed }[value || ''] || value || '—');
  const paymentState = (value: string) => ['not_started', 'awaiting_payment', 'pending'].includes(value) ? t.paymentOpen : ['paid', 'test_paid'].includes(value) ? t.paymentPaid : value;
  const personalPrice = Boolean(booking && (booking.quote.totalCents === null || booking.quote.priceType === 'from' || booking.quote.manualReviewReasons.length));
  const refundDue = proposedOperatorRefund(booking), extraLink = safeOperatorPaymentLink(booking?.payment?.extraPayment?.link);
  const unsettledRefund = booking?.payment?.refunds?.some((refund: any) => ['creating', 'pending', 'unknown'].includes(refund.status));
  async function refund() {
    if (!booking || !refundChecked || refundDue <= 0) return;
    if (refundAttempt.current?.bookingId !== booking.bookingId || refundAttempt.current.amountCents !== refundDue) refundAttempt.current = { bookingId: booking.bookingId, amountCents: refundDue, key: crypto.randomUUID() };
    const result = await run(`${base}/${booking.bookingId}/refund`, { expectedRevision: booking.revision, amountCents: refundDue, idempotencyKey: refundAttempt.current.key }, true);
    if (result?.booking?.payment?.refunds?.some((job: any) => job.idempotencyKey === refundAttempt.current?.key && job.status === 'verified')) refundAttempt.current = null;
  }
  return <section className="booking-operations" aria-labelledby="booking-operations-title" aria-busy={busy}>
    <h2 id="booking-operations-title">{t.title}</h2><p>{t.intro}</p>
    <form className="booking-operations-search" onSubmit={event => { event.preventDefault(); void run(base + '/search', { reference }); }} method="post" action={base + '/search'}>
      <label>{t.reference}<input value={reference} onChange={event => setReference(event.target.value)} pattern="K-[0-9]{4}-[A-Za-z0-9_-]{8}" maxLength={15} required autoComplete="off" placeholder="K-2026-XXXXXXXX" /></label>
      <button disabled={busy} type="submit">{t.search}</button><button disabled={busy} type="button" onClick={() => void run(base)}>{t.refresh}</button>
    </form>
    {ready.scheduled === false && <p role="status" className="booking-operations-warning">{t.reminderUnavailable}</p>}
    <p role="status" aria-live="polite">{busy ? t.loading : message ? t.done : ''}</p>
    {failure && <p role="alert" className="booking-operations-error">{t.error} <code>{failure}</code></p>}
    {!rows.length && !busy && <p>{t.empty}</p>}
    <ul className="booking-operations-list">{rows.map(row => <li key={row.bookingId}><button type="button" disabled={busy} aria-label={`${t.select}: ${row.reference}`} aria-pressed={booking?.bookingId === row.bookingId} onClick={() => void run(`${base}/${row.bookingId}`, undefined, true)}><strong>{row.reference}</strong><span>{row.customer.name} · {serviceName(lang, row.selection || row.quote.service)}</span><span>{row.scheduling.date} {row.scheduling.time} · {row.scheduling.timeZone}</span><span>{row.scheduling.status} · {paymentState(row.payment.status)}</span></button></li>)}</ul>
    {booking && <article className="booking-operations-detail">
      <h3>{booking.reference} · {t.customer}</h3><p>{booking.customer.name}<br /><a href={`mailto:${booking.customer.email}`}>{booking.customer.email}</a><br /><a href={`tel:${booking.customer.phone}`}>{booking.customer.phone}</a><br />{booking.customer.address}, {booking.customer.postalCode} {booking.customer.city}</p>
      <p><strong>{t.requested}:</strong> {booking.scheduling.date} {booking.scheduling.time} · {booking.scheduling.timeZone}<br />{t.savedLanguage}: {booking.language}<br />{t.status}: {booking.scheduling.status} · {paymentState(booking.payment.status)}</p>
      {booking.coverageReview === 'outside' && <p className="booking-operations-attention">{bookingText(lang, 'coverageOutside')} {t.coverage}</p>}
      {!full && <p>{t.legacy} <code>{booking.termsVersion}</code></p>}
      <ul>{booking.quote.lines.map((line: any, index: number) => <li key={index}>{bookingLineLabel(lang, line)} · {money(line.totalCents)}</li>)}</ul>
      {booking.notes && <p className="booking-operations-notes">{booking.notes}</p>}{booking.scopeNotes && <p className="booking-operations-notes">{booking.scopeNotes}</p>}
      <dl><dt>{monthly ? bookingText(lang, 'perVisitPrice') : t.total}</dt><dd>{money(booking.quote.totalCents)}</dd><dt>{monthly ? t.monthly : t.deposit}{!full && booking.payment.depositPercent ? ` (${booking.payment.depositPercent}%)` : ''}</dt><dd>{money(full ? booking.payment.totalDueCents : booking.payment.amountDueNowCents)}</dd><dt>{bookingText(lang, 'paidAmount')}</dt><dd>{money(booking.payment.amountPaidCents)}</dd><dt>{t.remaining}</dt><dd>{money(full ? booking.payment.outstandingCents : booking.payment.remainingBalanceCents)}</dd></dl>
      {full && booking.payment.reminder && <p><strong>{t.reminder}:</strong> {mailState(booking.payment.reminder.status)}{Number.isFinite(Date.parse(booking.payment.reminder.dueAt)) ? ` · ${dateTime(booking.payment.reminder.dueAt)}` : ''}{['schedule_unknown','cancel_unknown'].includes(booking.payment.reminder.status) && <span className="booking-operations-warning"> {t.reminderUnknown}</span>}</p>}
      {monthly && booking.payment.billingPeriod && <p>{t.monthly}: {booking.payment.billingPeriod.start} – {booking.payment.billingPeriod.end} · {booking.payment.billingPeriod.visits} {t.visits.toLowerCase()}</p>}
      {Number.isFinite(dueAt) && <p><strong>{t.depositDue}:</strong> {dateTime(dueAt)} · Europe/Zurich</p>}
      <p>{booking.canCheckout ? t.ready : t.notReady}</p>
      {personalPrice && booking.scheduling.status === 'requested' && <form onSubmit={event => { event.preventDefault(); const totalCents = operatorAmountCents(approvedPrice); if (totalCents) void run(`${base}/${booking.bookingId}/quote/approve`, { expectedRevision: booking.revision, totalCents, scopeNotes, scopeLanguage }, true); }}>
        <h3>{t.approvePrice}</h3><label>{t.approvedPrice}<input inputMode="decimal" value={approvedPrice} onChange={event => setApprovedPrice(event.target.value)} required pattern="(?:0|[1-9][0-9]{0,6})(?:[.,][0-9]{1,2})?" /></label><label>{t.scope}<textarea value={scopeNotes} onChange={event => setScopeNotes(event.target.value)} required minLength={10} maxLength={2000} rows={3} /></label><label>{t.scopeLanguage}<select value={scopeLanguage} onChange={event => setScopeLanguage(normalizeHomeLanguage(event.target.value))}>{['de', 'en', 'es', 'pt', 'it', 'fr'].map(value => <option key={value} value={value}>{value.toUpperCase()}</option>)}</select></label><p>{t.scopeLanguageReview.replace('{language}', operatorScopeLanguage(booking.language).toUpperCase())}</p><button type="submit" disabled={busy || !operatorAmountCents(approvedPrice) || scopeLanguage !== operatorScopeLanguage(booking.language)}>{t.approvePrice}</button>
      </form>}
      {!booking.canCheckout && booking.scheduling.status === 'requested' && booking.status !== 'cancelled' && <form onSubmit={event => { event.preventDefault(); if (checked) void run(`${base}/${booking.bookingId}/confirm`, { expectedRevision: booking.revision, availabilityChecked: true, ...(monthly ? { billingPeriod: { start: periodStart, end: periodEnd, visits: Number(visits) } } : {}), ...(!fromTerms ? { holdExpiresAt: new Date(Date.now() + Number(holdMinutes) * 60000).toISOString() } : {}) }, true); }} method="post" action={`${base}/${booking.bookingId}/confirm`}>
        {fromTerms ? <p><strong>{t.termsDeadline}:</strong> {full ? t.deadlineDescription : t.legacyDeadlineDescription}</p> : <label>{t.hold}<select value={holdMinutes} onChange={event => setHoldMinutes(event.target.value)}><option value="30">{t.minutes}</option><option value="120">{t.hours}</option><option value="1440">{t.day}</option><option value="10080">{t.week}</option></select></label>}
        {monthly && <fieldset><legend>{t.monthly}</legend><p>{t.monthlyHint}</p><div className="booking-operations-fields"><label>{t.periodStart}<input type="date" required value={periodStart} onChange={event => setPeriodStart(event.target.value)} /></label><label>{t.periodEnd}<input type="date" required min={periodStart} value={periodEnd} onChange={event => setPeriodEnd(event.target.value)} /></label><label>{t.visits}<input type="number" required min={1} max={31} step={1} value={visits} onChange={event => setVisits(event.target.value)} /></label></div></fieldset>}
        <label className="booking-operations-check"><input type="checkbox" checked={checked} onChange={event => setChecked(event.target.checked)} required />{t.review}</label>
        <button type="submit" disabled={busy || !checked || !ready.payment || !ready.email || personalPrice}>{t.confirm}</button>{(!ready.payment || !ready.email) && <p>{t.unavailable}</p>}
      </form>}
      {full && booking.canSettleWork && <form onSubmit={event => { event.preventDefault(); void run(`${base}/${booking.bookingId}/work/settle`, { expectedRevision: booking.revision, actualHours: Number(actualHours) }, true); }}>
        <h3>{t.settlement}</h3><p>{monthly ? t.periodHours : t.singleHours}</p><label>{t.actualHours}<input type="number" required min={0} max={168} step={0.25} value={actualHours} onChange={event => setActualHours(event.target.value)} /></label><button type="submit" disabled={busy || actualHours === ''}>{t.settle}</button>
      </form>}
      {booking.workSettlement && <section className="booking-operations-settlement"><h3>{t.settlement}</h3><dl><dt>{t.actualHours}</dt><dd>{booking.workSettlement.actualHours}</dd><dt>{t.finalTotal}</dt><dd>{money(booking.workSettlement.finalTotalCents)}</dd><dt>{t.extraDue}</dt><dd>{money(booking.payment.outstandingCents)}</dd><dt>{t.refundDue}</dt><dd>{money(refundDue)}</dd></dl>
        {booking.payment.outstandingCents > 0 && !extraLink && <button type="button" disabled={busy || ['creating', 'unknown'].includes(booking.payment.extraPayment?.status)} onClick={() => void run(`${base}/${booking.bookingId}/payment/extra`, { expectedRevision: booking.revision }, true)}>{t.createExtra}</button>}
        {extraLink && booking.payment.outstandingCents > 0 && !['paid','test_paid'].includes(booking.payment.extraPayment?.status) && <p><a href={extraLink} target="_blank" rel="noopener noreferrer">{t.openExtra}</a> · {paymentState(booking.payment.extraPayment.status)}</p>}
      </section>}
      {full && booking.cancellationQuote && !['completed', 'expired'].includes(booking.status) && <section className="booking-operations-cancellation"><h3>{t.cancellation}</h3><dl><dt>{t.refundPercent}</dt><dd>{booking.cancellationQuote.refundPercent}%</dd><dt>{t.retained}</dt><dd>{money(booking.cancellationQuote.retainedCents)}</dd><dt>{t.refundDue}</dt><dd>{money(booking.cancellationQuote.refundCents)}</dd></dl>
        {booking.status !== 'cancelled' && <form onSubmit={event => { event.preventDefault(); if (cancelChecked) void run(`${base}/${booking.bookingId}/cancel`, { expectedRevision: booking.revision }, true); }}><label className="booking-operations-check"><input type="checkbox" checked={cancelChecked} onChange={event => setCancelChecked(event.target.checked)} required />{t.cancelReview}</label><button type="submit" disabled={busy || !cancelChecked}>{t.cancel}</button></form>}
      </section>}
      {full && refundDue > 0 && <form onSubmit={event => { event.preventDefault(); void refund(); }}><h3>{t.refundDue}: {money(refundDue)}</h3><label className="booking-operations-check"><input type="checkbox" checked={refundChecked} onChange={event => setRefundChecked(event.target.checked)} required />{t.refundReview}</label><button type="submit" disabled={busy || !refundChecked || unsettledRefund}>{t.refundAction}</button>{unsettledRefund && <p>{t.refundPending}</p>}</form>}
      {!!booking.payment.refunds?.length && <ul>{booking.payment.refunds.map((job: any) => <li key={job.idempotencyKey}>{money(job.amountCents)} · {job.status === 'verified' ? t.refundVerified : job.status === 'unknown' ? t.mailUnknown : t.refundPending}{job.verifiedAt ? ` · ${dateTime(job.verifiedAt)}` : ''}</li>)}</ul>}
      <h3>{t.mail}</h3><dl><dt>{t.requestEmail}</dt><dd>{mailState(booking.email?.request)}</dd></dl><p>{t.provider}</p>
      {!detail.emails.length && <p>{t.noMail}</p>}
      <ul className="booking-operations-mail">{detail.emails.map((job: any) => <li key={job.id}><strong>{job.template || job.kind}</strong> <span>{mailState(job.status)} · {job.attempts}</span>{job.failure && <p><code>{job.failure.code}</code>{job.failure.httpStatus && ` · HTTP ${job.failure.httpStatus}`}{job.failure.providerName && ` · ${job.failure.providerName}`}</p>}{job.canRetry ? <button type="button" disabled={busy || !detail.emailReady} onClick={() => void run(`${base}/${booking.bookingId}/email/retry`, { jobId: job.id, expectedAttempts: job.attempts }, true)}>{job.kind === 'request' ? t.resendRequest : t.retry}</button> : job.status !== 'sent' && job.status !== 'delivered' && <p>{t.blocked}: <code>{job.blockedReason}</code></p>}</li>)}</ul>
    </article>}
  </section>;
}
