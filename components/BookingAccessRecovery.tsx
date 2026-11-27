import React, { useEffect, useId, useRef, useState } from 'react';
import { accessRecoveryText } from '../src/booking/accessRecoveryCopy.ts';
import { bookingLanguage } from '../src/booking/uiCopy.ts';

type Access = { id: string; token: string };
type Props = { language: string; bookingId?: string; onRecovered: (access: Access) => void };
const validId = /^[A-Za-z0-9_-]{20,128}$/;
const validToken = /^[A-Za-z0-9_-]{43}$/;

/** Recovery never treats a reference/email pair as authentication or persists personal fields. */
export default function BookingAccessRecovery({ language, bookingId, onRecovered }: Props) {
  const id = useId();
  const [reference, setReference] = useState('');
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'checking' | 'idle' | 'sending' | 'accepted' | 'error'>(bookingId ? 'checking' : 'idle');
  const active = useRef<AbortController | null>(null);
  const recipient = useRef(onRecovered); recipient.current = onRecovered;
  const requestKey = useRef({ identity: '', key: '' });
  const proof = useRef('');
  const text = (key: Parameters<typeof accessRecoveryText>[1]) => accessRecoveryText(language, key);

  async function call(path: string, body: unknown, signal: AbortSignal): Promise<any> {
    const response = await fetch(path, { method: 'POST', signal, credentials: 'same-origin', referrerPolicy: 'strict-origin', cache: 'no-store',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body) });
    if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error('ACCESS_UNAVAILABLE');
    return response.json();
  }
  async function prepare(signal: AbortSignal) {
    const response = await fetch('/api/booking/config', { signal, credentials: 'same-origin', referrerPolicy: 'strict-origin', cache: 'no-store', headers: { Accept: 'application/json' } });
    if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error('ACCESS_UNAVAILABLE');
    const config = await response.json();
    if (config.available !== true) throw new Error('ACCESS_UNAVAILABLE');
  }
  async function restore() {
    if (!bookingId || !validId.test(bookingId)) { setState('idle'); return; }
    const controller = new AbortController(); active.current?.abort(); active.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 15_000);
    setState('checking');
    try {
      await prepare(controller.signal);
      const result = proof.current
        ? await call('/api/booking/link-access', { bookingId, proof: proof.current }, controller.signal)
        : await call('/api/booking/browser-access', { bookingId }, controller.signal);
      if (result.id !== bookingId || !validId.test(result.id) || !validToken.test(result.token)) throw new Error('INVALID_ACCESS_RESPONSE');
      if (!controller.signal.aborted) { proof.current = ''; recipient.current({ id: result.id, token: result.token }); }
    } catch {
      if (active.current === controller) setState(proof.current ? 'error' : 'idle');
    } finally { window.clearTimeout(timeout); if (active.current === controller) active.current = null; }
  }
  useEffect(() => {
    const current = new URL(window.location.href);
    const fragment = new URLSearchParams(current.hash.slice(1));
    // The email proof is a short-lived capability. Remove it before making requests.
    if (fragment.has('recover')) {
      proof.current = fragment.get('recover') || '';
      fragment.delete('recover'); current.hash = fragment.toString();
      window.history.replaceState(window.history.state, '', current.pathname + current.search + current.hash);
    }
    void restore();
    return () => { active.current?.abort(); active.current = null; };
  }, [bookingId]);

  async function request(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === 'sending' || state === 'checking') return;
    const controller = new AbortController(); active.current?.abort(); active.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 15_000);
    const identity = `${reference.trim().toUpperCase()}\n${email.trim().toLowerCase()}`;
    if (requestKey.current.identity !== identity) requestKey.current = { identity, key: crypto.randomUUID() };
    setState('sending');
    try {
      await prepare(controller.signal);
      const result = await call('/api/booking/access-requests', { reference: reference.trim().toUpperCase(), email: email.trim(), language: bookingLanguage(language), idempotencyKey: requestKey.current.key }, controller.signal);
      if (result.status !== 'accepted') throw new Error('INVALID_ACCESS_RESPONSE');
      if (!controller.signal.aborted) setState('accepted');
    } catch { if (active.current === controller) setState('error'); }
    finally { window.clearTimeout(timeout); if (active.current === controller) active.current = null; }
  }
  return <section className="kr-calc-card kr-booking-access-recovery" aria-labelledby={`${id}-title`}>
    <h2 id={`${id}-title`}>{text('title')}</h2>
    <p className="kr-calc-inline-note">{text('hint')}</p>
    {state === 'checking' && <p role="status">{text('checking')}</p>}
    {state === 'error' && <p className="kr-calc-alert" role="alert">{text('error')}</p>}
    {bookingId && state !== 'checking' && <button type="button" className="kr-calc-secondary" onClick={() => void restore()}>{text('retry')}</button>}
    <details open={Boolean(bookingId)}>
      <summary>{text('emailOption')}</summary>
      <form onSubmit={event => void request(event)}>
        <div className="kr-calc-field"><label htmlFor={`${id}-reference`}>{text('reference')}</label><input id={`${id}-reference`} name="reference" required maxLength={15} pattern="K-[0-9]{4}-[A-Za-z0-9_-]{8}" autoCapitalize="characters" autoComplete="off" spellCheck={false} value={reference} onChange={event => setReference(event.target.value.toUpperCase())} placeholder="K-2026-XXXXXXXX" /></div>
        <div className="kr-calc-field"><label htmlFor={`${id}-email`}>{text('email')}</label><input id={`${id}-email`} name="email" type="email" required maxLength={254} autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} /></div>
        <button className="kr-calc-primary" type="submit" disabled={state === 'sending' || state === 'checking' || state === 'accepted'}>{text(state === 'sending' ? 'sending' : 'send')}</button>
      </form>
    </details>
    {state === 'accepted' && <><p role="status">{text('accepted')} <a href="mailto:kai@krakenpfm.ch">kai@krakenpfm.ch</a></p><button type="button" className="kr-calc-secondary" onClick={() => { requestKey.current = { identity: '', key: '' }; setState('idle'); }}>{text('fresh')}</button></>}
  </section>;
}
