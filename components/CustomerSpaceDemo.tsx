import React, { useEffect, useId, useRef } from 'react';
import type { BookingSelection, PriceQuote } from '../src/booking/pricing';
import { bookingLineLabel } from '../src/booking/uiCopy';
import { recoveryCopy, recoveryLanguage } from '../src/booking/recoveryCopy';
import { journeyCopy, LANGUAGE_NAMES } from '../src/booking/journeyCopy';
import KrakenServiceIcon from './KrakenServiceIcon';

export interface CustomerSpaceSnapshot {
  email: string;
  selection: BookingSelection;
  selectedService: string;
  quote: PriceQuote;
}

/** An in-memory design example. It does not create an identity, persist data or send a message. */
export default function CustomerSpaceDemo({ open, language, snapshot, onClose, onContinue, guide }: {
  open: boolean;
  language: string;
  snapshot: CustomerSpaceSnapshot;
  onClose: () => void;
  onContinue?: () => void;
  guide?: React.ReactNode;
}) {
  const journey = journeyCopy(language);
  const locale = recoveryLanguage(language);
  const copy = recoveryCopy(locale);
  const id = useId().replace(/:/g, '');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const service = snapshot.selectedService === 'deep' ? 'deep' : snapshot.selection.service;
  const money = (cents: number) => new Intl.NumberFormat(locale === 'de' ? 'de-CH' : locale, { style: 'currency', currency: 'CHF' }).format(cents / 100);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      if (!dialog.open) {
        openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        dialog.showModal();
      }
      closeRef.current?.focus();
    } else if (dialog.open) {
      dialog.close();
      if (openerRef.current?.isConnected) openerRef.current.focus();
    }
  }, [open]);

  function onKeyDown(event: React.KeyboardEvent<HTMLDialogElement>) {
    if ((event.target as HTMLElement).closest('dialog') !== event.currentTarget) return;
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose(); return; }
    if (event.key !== 'Tab') return;
    const elements = Array.from((event.currentTarget as HTMLDialogElement).querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'))
      .filter(element => element.tabIndex >= 0 && !element.hidden && element.getClientRects().length > 0);
    const first = elements[0]; const last = elements[elements.length - 1];
    if (!first || !last) { event.preventDefault(); return; }
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  return <dialog ref={dialogRef} className="kr-recovery-dialog kr-space-dialog" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`}
    onCancel={event => { if (event.target !== event.currentTarget) return; event.preventDefault(); onClose(); }} onClose={event => { if (event.target !== event.currentTarget) return; onClose(); if (openerRef.current?.isConnected) openerRef.current.focus(); }} onKeyDown={onKeyDown}>
    <header className="kr-recovery-dialog-header">
      <div><p className="kr-space-badge">{journey.accountDemo}</p><h2 id={`${id}-title`}>{journey.accountTitle}</h2></div>
      <button type="button" ref={closeRef} className="kr-recovery-close" aria-label={journey.close} onClick={onClose}><span aria-hidden="true">×</span></button>
    </header>
    <p className="kr-recovery-modal-intro" id={`${id}-description`}>{journey.accountBody}</p>
    <div className="kr-space-identity"><img src="/calculator-approved/assets/kai-help.webp" alt="" width="64" height="78" aria-hidden="true" /><div><span>{copy.emailLabel}</span><strong>{snapshot.email}</strong><p>{journey.emailLanguage}: <b>{LANGUAGE_NAMES[locale]}</b></p></div></div>
    <article className="kr-space-plan">
      <header><KrakenServiceIcon name={service} size={50} /><div><p>{journey.savedQuote}</p><h3>{copy.services[service]}</h3></div></header>
      <ul className="kr-recovery-email-lines">{snapshot.quote.lines.map(line => <li key={line.id}><span>{bookingLineLabel(locale, line)}</span><b>{money(line.totalCents)}</b></li>)}</ul>
      <div className="kr-recovery-email-total"><span>{journey.total}</span><strong>{snapshot.quote.totalCents === null ? copy.individualPrice : money(snapshot.quote.totalCents)}</strong></div>
      {snapshot.quote.totalCents !== null && <div className="kr-recovery-email-tax"><span>{copy.vat}</span><b>{money(snapshot.quote.vatCents)}</b></div>}
      <p className="kr-space-scope">{copy.noReservation}</p>
    </article>
    {guide && <section className="kr-space-guide" aria-label={journey.guideBenefit}><h3>{journey.guideBenefit}</h3><p>{journey.guideBenefitBody}</p>{guide}</section>}
    <p className="kr-space-disclaimer">{journey.accountDemoSaved}</p>
    <footer className="kr-space-actions"><button type="button" className="kr-space-back" onClick={onClose}>{journey.back}</button><button type="button" className="kr-recovery-save" onClick={() => { dialogRef.current?.close(); onClose(); window.requestAnimationFrame(() => onContinue?.()); }}>{journey.continuePlan}</button></footer>
  </dialog>;
}
