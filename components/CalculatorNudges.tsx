import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, ChevronDown, MessageCircle, X } from 'lucide-react';
import { bookingLanguage, bookingText } from '../src/booking/uiCopy';
import { ACTIVITY_REGIONS, activityAgeLabel, activityText, activityTitle, parseBookingActivity, type BookingActivityEvent } from '../src/booking/bookingActivity';
import { journeyCopy } from '../src/booking/journeyCopy';
import KrakenServiceIcon from './KrakenServiceIcon';

type Notice = { kind: 'help' | 'demo' } | { kind: 'booking'; event: BookingActivityEvent };
interface CalculatorNudgesProps { selected: boolean; step: number; preview: boolean; language: string }
const HELP_SESSION_KEY = 'kraken.calc.personal-help.v2';
const ACTIVITY_SESSION_KEY = 'kraken.calc.booking-notices.v1';
const HELP_DELAY_MS = 25_000;
const EVENT_INTERVAL_MS = 60_000;
const EVENT_SESSION_LIMIT = 3;

function readSeen(): string[] {
  try {
    const value = JSON.parse(sessionStorage.getItem(ACTIVITY_SESSION_KEY) || '[]');
    return Array.isArray(value) ? value.filter(id => typeof id === 'string' && /^[A-Za-z0-9_-]{8,100}$/.test(id)).slice(-EVENT_SESSION_LIMIT) : [];
  } catch { return []; }
}
function userIsBusy() {
  const active = document.activeElement;
  return document.hidden || Boolean(document.querySelector('dialog[open], [role="dialog"][aria-modal="true"]')) || Boolean(active?.matches('input, textarea, select, [contenteditable="true"]') || active?.closest('[contenteditable="true"]'));
}

/** Live notices only consume a verified server feed; examples require an explicit preview action. */
export default function CalculatorNudges({ selected, step, preview, language }: CalculatorNudgesProps) {
  const [notice, setNotice] = useState<Notice | null>(null);
  const [demoRegion,setDemoRegion] = useState<string>('Zürich');
  const [hovered, setHovered] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const paused = hovered || focusWithin;
  const shown = useRef(false);
  const seen = useRef(new Set(readSeen()));
  const queue = useRef<BookingActivityEvent[]>([]);
  const lastNoticeAt = useRef(0);
  const earliestBookingAt = useRef(Date.now() + 15_000);
  const currentNotice = useRef(notice);
  currentNotice.current = notice;
  const text = (key: string) => bookingText(language, key);
  const labels = activityText(language);
  const contactHref = `/kontakt?lang=${encodeURIComponent(bookingLanguage(language))}`;
  const rememberShown = useCallback(() => {
    shown.current = true;
    try { sessionStorage.setItem(HELP_SESSION_KEY, 'shown'); } catch { /* UI preference is optional. */ }
  }, []);

  useEffect(() => {
    if (!selected || step !== 0 || shown.current) return;
    try { if (sessionStorage.getItem(HELP_SESSION_KEY)) return; } catch { /* Optional UI state only. */ }
    let timer: number;
    const show = () => {
      if (shown.current) return;
      if (userIsBusy() || currentNotice.current || Date.now() - lastNoticeAt.current < EVENT_INTERVAL_MS) {
        timer = window.setTimeout(show, 3000); return;
      }
      rememberShown(); lastNoticeAt.current = Date.now(); setNotice({ kind: 'help' });
    };
    timer = window.setTimeout(show, HELP_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [selected, step, rememberShown]);

  useEffect(() => {
    if (preview || step !== 0 || seen.current.size >= EVENT_SESSION_LIMIT) return;
    let disposed = false;
    let timer: number;
    let request: AbortController | null = null;
    const poll = async () => {
      if (disposed) return;
      if (document.hidden) { timer = window.setTimeout(poll, 30_000); return; }
      request = new AbortController();
      const timeout = window.setTimeout(() => request?.abort(), 10_000);
      let failed = false;
      try {
        const response = await fetch('/api/bookings/activity', { credentials: 'same-origin', cache: 'no-store', signal: request.signal, headers: { Accept: 'application/json' } });
        if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error('Feed unavailable');
        const events = parseBookingActivity(await response.json());
        if (!disposed) queue.current = events.filter(event => !seen.current.has(event.id));
      } catch { failed = true; if (!disposed) queue.current = []; }
      finally { window.clearTimeout(timeout); if (!disposed) timer = window.setTimeout(poll, failed ? 60_000 : 30_000); }
    };
    void poll();
    const display = window.setInterval(() => {
      const now = Date.now();
      if (disposed || userIsBusy() || currentNotice.current || seen.current.size >= EVENT_SESSION_LIMIT || now < earliestBookingAt.current || now - lastNoticeAt.current < EVENT_INTERVAL_MS) return;
      const event = queue.current.find(item => !seen.current.has(item.id) && now - Date.parse(item.occurredAt) <= 86_400_000);
      if (!event) return;
      seen.current.add(event.id); queue.current = queue.current.filter(item => item.id !== event.id);
      try { sessionStorage.setItem(ACTIVITY_SESSION_KEY, JSON.stringify([...seen.current])); } catch { /* Memory still deduplicates this visit. */ }
      lastNoticeAt.current = now;
      setNotice({ kind: 'booking', event });
    }, 2000);
    return () => { disposed = true; request?.abort(); window.clearTimeout(timer); window.clearInterval(display); };
  }, [preview, step]);

  useEffect(() => { if (step !== 0) setNotice(null); }, [step]);
  useEffect(() => {
    if (!notice || paused) return;
    const timer = window.setTimeout(() => setNotice(null), 12_000);
    return () => window.clearTimeout(timer);
  }, [notice, paused]);

  const close = () => { setNotice(null); setHovered(false); setFocusWithin(false); };
  const showPreview = (kind: 'help' | 'demo') => {
    if (!preview) return;
    rememberShown(); lastNoticeAt.current = Date.now(); setNotice({ kind }); setHovered(false); setFocusWithin(false);
  };
  const kind = notice?.kind;
  const event = notice?.kind === 'booking' ? notice.event : null;

  return <>
    {preview && step === 0 && <details className="kr-calc-demo-tools">
      <summary>{text('previewTools')}<ChevronDown aria-hidden="true" /></summary>
      <div>
        <button type="button" onClick={() => showPreview('help')}><MessageCircle aria-hidden="true" />{text('nudgeShowHelp')}</button>
        <label className="kr-nudge-demo-region">{journeyCopy(language).regionDemo}<select value={demoRegion} onChange={event=>setDemoRegion(event.target.value)}>{ACTIVITY_REGIONS.map(region=><option key={region}>{region}</option>)}</select></label>
        <button type="button" onClick={() => showPreview('demo')}><CheckCircle2 aria-hidden="true" />{text('nudgeShowDemo')}</button>
      </div>
    </details>}
    {notice && step === 0 && <aside className={`kr-calc-nudge is-${kind}`}
      aria-label={kind === 'demo' ? text('nudgeDemoBadge') : kind === 'booking' ? labels.confirmed : text('nudgeContactTitle')}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocusWithin(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocusWithin(false); }}>
      {kind === 'help' ? <img className="kr-calc-nudge-kai" src="/calculator-approved/assets/kai-help.webp" alt="" width="68" height="82" aria-hidden="true" /> : <div className="kr-calc-nudge-icon" aria-hidden="true"><KrakenServiceIcon name={event?.service || 'windows'} size={60} /></div>}
      <div className="kr-calc-nudge-copy">
        <div role="status" aria-live="polite" aria-atomic="true">
          {kind === 'demo' && <span className="kr-calc-nudge-badge">{text('nudgeDemoBadge')}</span>}
          {kind === 'booking' && <span className="kr-calc-activity-verified"><CheckCircle2 aria-hidden="true" />{labels.confirmed}</span>}
          <strong>{event ? activityTitle(event, language) : kind==='demo'?`${text('windows')} · ${demoRegion}`:text('nudgeContactTitle')}</strong>
          <p>{event ? event.region : kind === 'demo' ? labels.demo : text('nudgeHelpBody')}</p>
          {event && <span className="kr-calc-activity-meta">{activityAgeLabel(event, language)}</span>}
        </div>
        {kind === 'help' && <a href={contactHref} target="_blank" rel="noopener noreferrer">{text('contactPage')}<ChevronDown aria-hidden="true" /></a>}
      </div>
      <button type="button" className="kr-calc-nudge-close" aria-label={text('nudgeClose')} onClick={close}><X aria-hidden="true" /></button>
    </aside>}
  </>;
}
