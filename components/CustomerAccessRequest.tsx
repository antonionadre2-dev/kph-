import React, { useEffect, useRef, useState } from 'react';
import { customerAccessText } from '../src/booking/customerAccessCopy';

/** A saved-quote capability permits requesting access; it is never a customer login. */
export default function CustomerAccessRequest({ language, email, recovery }: {
  language: string; email: string; recovery: { id: string; accessToken: string };
}) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'queued' | 'error'>('idle');
  const request = useRef<AbortController | null>(null);
  const key = useRef('');
  const text = (name: Parameters<typeof customerAccessText>[1]) => customerAccessText(language, name);
  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => { setEnabled(false); controller.abort(); }, 10000);
    void fetch('/api/customer/access/config', { signal: controller.signal, credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then(async response => response.ok && response.headers.get('content-type')?.includes('application/json') ? response.json() : { enabled: false })
      .then(value => { if (!controller.signal.aborted) setEnabled(value.enabled === true); })
      .catch(() => { if (!controller.signal.aborted) setEnabled(false); })
      .finally(() => window.clearTimeout(timeout));
    return () => { window.clearTimeout(timeout); controller.abort(); request.current?.abort(); request.current = null; };
  }, []);
  useEffect(() => { key.current = ''; setState('idle'); request.current?.abort(); }, [email, recovery.id, language]);
  async function send() {
    if (!enabled || state === 'loading' || state === 'queued') return;
    const controller = new AbortController(); request.current?.abort(); request.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    if (!key.current) key.current = crypto.randomUUID();
    setState('loading');
    try {
      const response = await fetch('/api/customer/access', { method: 'POST', signal: controller.signal, credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'Idempotency-Key': key.current },
        body: JSON.stringify({ email, language, idempotencyKey: key.current, recovery }) });
      if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error('Unavailable');
      const value = await response.json();
      if (value.status !== 'queued') throw new Error('Invalid response');
      if (!controller.signal.aborted) setState('queued');
    } catch { if (request.current === controller) setState('error'); }
    finally { window.clearTimeout(timeout); if (request.current === controller) request.current = null; }
  }
  return <div className="kr-recovery-account-option">
    <strong>{text('optional')}</strong>
    <p>{text(enabled === false ? 'unavailable' : 'personal')}</p>
    <button type="button" className="kr-recovery-save" disabled={!enabled || state === 'loading' || state === 'queued'} onClick={() => void send()}>
      {text(state === 'loading' ? 'loading' : 'request')}
    </button>
    {state === 'queued' && <p role="status">{text('queued')}</p>}
    {state === 'error' && <p role="alert">{text('unavailable')}</p>}
  </div>;
}
