import React, { useEffect, useRef, useState } from 'react';
import { browserSessionPersistence, isSignInWithEmailLink, onAuthStateChanged, setPersistence, signInWithEmailLink, signOut, type User } from 'firebase/auth';
import { auth } from './firebase';
import { useTranslation } from '../i18n';
import { customerAccessText } from '../src/booking/customerAccessCopy';
import { bookingLanguage, bookingText } from '../src/booking/uiCopy';
import './service-calculator.css';

type CustomerBooking = {
  bookingId: string; reference: string; status: string;
  quote?: { service: string; totalCents?: number | null };
  scheduling?: { status: string; date: string; time: string };
  payment?: { status: string; amountPaidCents?: number; remainingBalanceCents?: number };
};
/** Email-link completion always asks for the intended email; no email/token goes in localStorage or URL. */
export default function CustomerAccessPage({ onNavigate }: { onNavigate: (page: string) => void }) {
  const { language } = useTranslation();
  const text = (name: Parameters<typeof customerAccessText>[1]) => customerAccessText(language, name);
  const [email, setEmail] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [bookings, setBookings] = useState<CustomerBooking[]>([]);
  const [loaded, setLoaded] = useState(false);
  const mounted = useRef(true);
  const [link] = useState(() => isSignInWithEmailLink(auth, window.location.href) ? window.location.href : '');
  useEffect(() => {
    mounted.current = true;
    const unsubscribe = onAuthStateChanged(auth, next => { setUser(next); setCheckingAuth(false); });
    return () => { mounted.current = false; unsubscribe(); };
  }, []);
  useEffect(() => {
    setBookings([]); setLoaded(false);
    if (!user || link) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => { controller.abort(); if (mounted.current) { setFailed(true); setBusy(false); } }, 15000);
    setBusy(true); setFailed(false);
    void user.getIdToken().then(token => fetch('/api/customer/bookings', { signal: controller.signal, credentials: 'same-origin', cache: 'no-store', headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }))
      .then(async response => {
        if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error('Unavailable');
        const value = await response.json();
        if (!Array.isArray(value.bookings)) throw new Error('Invalid response');
        if (!controller.signal.aborted) { setBookings(value.bookings.slice(0, 100)); setLoaded(true); }
      }).catch(() => { if (!controller.signal.aborted) setFailed(true); })
      .finally(() => { window.clearTimeout(timeout); if (mounted.current) setBusy(false); });
    return () => { controller.abort(); window.clearTimeout(timeout); };
  }, [user, link]);
  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!link || busy || email.length > 254) return;
    setBusy(true); setFailed(false);
    try {
      await setPersistence(auth, browserSessionPersistence);
      await signInWithEmailLink(auth, email.trim(), link);
      const current = new URL(window.location.href);
      for (const key of ['apiKey','oobCode','mode','continueUrl','languageCode']) current.searchParams.delete(key);
      window.history.replaceState(window.history.state, '', current.pathname + current.search);
      // Remount without the consumed capability; never let it become an app login token.
      window.location.replace(current.pathname + current.search);
    } catch { if (mounted.current) { setFailed(true); setBusy(false); } }
  }
  const labels: Record<string, string> = { requested: 'appointmentRequested', held: 'appointmentHeld', confirmed: 'appointmentConfirmed', needs_reschedule: 'rescheduleTitle', paid: 'paidTitle', pending: 'pendingTitle', test_paid: 'testTitle' };
  return <main id="main" className="kr-service-calculator" lang={language}>
    <div className="kr-calc-shell"><header className="kr-calc-intro"><p className="kr-calc-eyebrow">KRAKEN</p><h1>{text('title')}</h1><p className="kr-calc-lead">{text('personal')}</p></header>
      {checkingAuth || busy ? <p role="status">{text('loading')}</p> : null}
      {failed && <p className="kr-calc-alert" role="alert">{text('failed')}</p>}
      {link ? <form className="kr-calc-card" onSubmit={login}><p>{text('verifyHint')}</p><div className="kr-calc-field"><label htmlFor="kr-access-email">{text('email')}</label><input id="kr-access-email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} /></div><button className="kr-calc-primary" type="submit" disabled={busy}>{text('continue')}</button></form> : !checkingAuth && !user ? <p className="kr-calc-inline-note">{text('noLink')}</p> : null}
      {user && !link && <>
        <button className="kr-calc-secondary" type="button" onClick={() => void signOut(auth)}>{text('logout')}</button>
        {loaded && !bookings.length && <p className="kr-calc-inline-note">{text('empty')}</p>}
        <div className="kr-calc-stack" style={{ marginTop: 24 }}>{bookings.map(booking => <article className="kr-calc-card" key={booking.bookingId}>
          <p className="kr-calc-eyebrow">{bookingText(language, 'reference')} · {booking.reference}</p>
          <h2>{bookingText(language, booking.quote?.service || 'summaryService')}</h2>
          {booking.scheduling && <p>{booking.scheduling.date} · {booking.scheduling.time} · Europe/Zurich<br />{bookingText(language, labels[booking.scheduling.status] || 'appointmentRequested')}</p>}
          {booking.payment && <p>{bookingText(language, labels[booking.payment.status] || 'receivedBody')}{typeof booking.payment.amountPaidCents === 'number' ? ` · ${new Intl.NumberFormat(bookingLanguage(language), { style: 'currency', currency: 'CHF' }).format(booking.payment.amountPaidCents / 100)}` : ''}</p>}
        </article>)}</div>
      </>}
      <button className="kr-calc-secondary" type="button" style={{ marginTop: 24 }} onClick={() => onNavigate('home')}>{text('home')}</button>
    </div>
  </main>;
}
