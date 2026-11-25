import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, Download, FileText, MapPin, Printer, X } from 'lucide-react';
import { buildMovingGuide, GUIDE_PLACES, guidePlaceLabel, guidePreferencesFromQuery, isMovingGuideService, movingGuideCopy, movingGuideHtml, normalizeGuidePreferences, type GuidePreferences, type MovingGuideInput } from '../src/booking/movingGuide';
import './moving-guide.css';

export interface MovingGuideProps {
  language: string;
  preview: boolean;
  service?: string | null;
  customer?: MovingGuideInput['customer'];
  requestedDate?: string;
  appointmentConfirmed?: boolean;
  initialPreferences?: Partial<GuidePreferences>;
  onPreferencesChange?: (preferences: GuidePreferences) => void;
  presentation?: 'card' | 'button';
}

let logoPromise: Promise<string | undefined> | undefined;
function getOfflineLogo(): Promise<string | undefined> {
  if (!logoPromise) logoPromise = (async () => {
    const controller = new AbortController(), timer = window.setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch('/calculator-approved/assets/logo.webp', { credentials: 'same-origin', cache: 'force-cache', signal: controller.signal });
      if (!response.ok) return undefined;
      const blob = await response.blob();
      if (blob.size > 500_000 || !blob.type.startsWith('image/')) return undefined;
      return await new Promise<string | undefined>(resolve => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : undefined);
        reader.onerror = () => resolve(undefined); reader.readAsDataURL(blob);
      });
    } catch { return undefined; } finally { window.clearTimeout(timer); }
  })();
  return logoPromise;
}

export default function MovingGuide({ language, preview, service, customer, requestedDate, appointmentConfirmed = false, initialPreferences, onPreferencesChange, presentation = 'card' }: MovingGuideProps) {
  const identity = useId(), copy = movingGuideCopy(language);
  const [preferences,setPreferences] = useState<GuidePreferences>(() => normalizeGuidePreferences(initialPreferences || (typeof window !== 'undefined' ? guidePreferencesFromQuery(window.location.search) : undefined)));
  const [completed,setCompleted] = useState<string[]>([]);
  const [open,setOpen] = useState(false), [busy,setBusy] = useState(false), [feedback,setFeedback] = useState('');
  const dialogRef = useRef<HTMLDialogElement>(null), openerRef = useRef<HTMLElement | null>(null), printFrameRef = useRef<HTMLIFrameElement | null>(null);
  const permitted = isMovingGuideService(service);
  const document = useMemo(() => buildMovingGuide({ language,preview,service,customer,requestedDate,appointmentConfirmed,preferences,completed }),[language,preview,service,customer,requestedDate,appointmentConfirmed,preferences,completed]);
  const count = document.completed.length;

  useEffect(() => {
    if (!initialPreferences) return;
    const incoming = normalizeGuidePreferences(initialPreferences);
    if (incoming.from === preferences.from && incoming.to === preferences.to && incoming.vehicle === preferences.vehicle) return;
    setPreferences(incoming);
    setCompleted(current => current.filter(id => !['parking','registration','vehicle'].includes(id)));
    // Sync parent state without echoing the change through onPreferencesChange.
  }, [Boolean(initialPreferences), initialPreferences?.from, initialPreferences?.to, initialPreferences?.vehicle]);
  useEffect(() => {
    if (!permitted || typeof window === 'undefined' || new URLSearchParams(window.location.search).get('guide') !== '1') return;
    setOpen(true);
    // Consume a public, non-personal deep link once so dismissing is stable.
    const current=new URL(window.location.href); current.searchParams.delete('guide');
    window.history.replaceState(window.history.state,'',current.pathname+current.search+current.hash);
  },[permitted]);
  useEffect(() => {
    const dialog=dialogRef.current;
    if (!dialog) return;
    if(open && !dialog.open) { dialog.showModal(); dialog.querySelector<HTMLButtonElement>('.kr-moving-guide-close')?.focus(); }
    if(!open && dialog.open) dialog.close();
  },[open]);
  useEffect(() => () => { printFrameRef.current?.remove(); },[]);

  function close() { setOpen(false); setFeedback(''); window.requestAnimationFrame(() => openerRef.current?.focus()); }
  function changePreferences(next: Partial<GuidePreferences>) {
    const value=normalizeGuidePreferences({...preferences,...next}); setPreferences(value); setFeedback(''); onPreferencesChange?.(value);
    // Changed scope must be reviewed again, rather than inheriting an unrelated tick.
    setCompleted(current=>current.filter(id=>!['parking','registration','vehicle'].includes(id)));
  }
  function trapFocus(event: React.KeyboardEvent<HTMLDialogElement>) {
    if(event.key==='Escape') { event.preventDefault(); event.stopPropagation(); close(); return; }
    if(event.key!=='Tab') return;
    const elements=Array.from((event.currentTarget as HTMLDialogElement).querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])')).filter(element=>element.getClientRects().length>0&&element.tabIndex>=0);
    const first=elements[0],last=elements[elements.length-1];
    if(!first||!last) {event.preventDefault();return;}
    if(event.shiftKey&&window.document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&window.document.activeElement===last){event.preventDefault();first.focus();}
  }
  async function download() {
    if(busy) return; setBusy(true); setFeedback('');
    try {
      const html=movingGuideHtml(document,await getOfflineLogo()), blob=new Blob([html],{type:'text/html;charset=utf-8'}), url=URL.createObjectURL(blob);
      const anchor=window.document.createElement('a');anchor.href=url;anchor.download=`kraken-moving-plan-${document.language}.html`;anchor.hidden=true;(dialogRef.current||window.document.body).appendChild(anchor);anchor.click();anchor.remove();
      window.setTimeout(()=>URL.revokeObjectURL(url),30_000); setFeedback(copy.downloadReady);
    } finally {setBusy(false);}
  }
  async function print() {
    if(busy)return;setBusy(true);setFeedback('');
    try {
      const html=movingGuideHtml(document,await getOfflineLogo());
      printFrameRef.current?.remove();
      const frame=window.document.createElement('iframe');printFrameRef.current=frame;
      frame.title=copy.cardTitle;frame.setAttribute('aria-hidden','true');frame.setAttribute('sandbox','allow-same-origin allow-modals');
      frame.style.cssText='position:fixed;inset:0;width:1px;height:1px;opacity:0;pointer-events:none;border:0';
      frame.onload=()=>{
        try {frame.contentWindow?.focus();frame.contentWindow?.print();}
        catch {setFeedback(copy.popupBlocked);}
        finally {setBusy(false);}
      };
      frame.srcdoc=html;window.document.body.appendChild(frame);
    } catch {setBusy(false);setFeedback(copy.popupBlocked);}
  }
  if(!permitted)return null;
  const launch = (event: React.MouseEvent<HTMLButtonElement>)=>{openerRef.current=event.currentTarget;setOpen(true);};
  return <>
    {presentation==='card' ? <section className="kr-moving-guide-card" aria-label={copy.cardTitle}>
      <span className="kr-moving-guide-card-icon" aria-hidden="true"><FileText/></span><div><h3>{copy.cardTitle}</h3><p>{copy.cardBody}</p><button type="button" onClick={launch} aria-haspopup="dialog">{copy.open}</button></div>
    </section> : <button type="button" className="kr-moving-guide-inline" onClick={launch} aria-haspopup="dialog"><FileText aria-hidden="true"/>{copy.open}</button>}
    <dialog ref={dialogRef} className="kr-moving-guide-dialog" aria-labelledby={`${identity}-title`} onCancel={event=>{if(event.target!==event.currentTarget)return;event.preventDefault();close();}} onClose={event=>{if(event.target!==event.currentTarget)return;setOpen(false);}} onKeyDown={trapFocus}>
      <div className="kr-moving-guide-heading"><div><p className="kr-moving-guide-eyebrow">KRAKEN · {copy.included}</p><h2 id={`${identity}-title`}>{copy.cardTitle}</h2></div><button type="button" className="kr-moving-guide-close" onClick={close} aria-label={copy.close}><X aria-hidden="true"/></button></div>
      <p className="kr-moving-guide-intro">{copy.cardBody}</p>
      <section className="kr-moving-guide-settings" aria-labelledby={`${identity}-customize`}><h3 id={`${identity}-customize`}>{copy.personalize}</h3><p>{copy.optional}</p><div className="kr-moving-guide-fields">
        <label htmlFor={`${identity}-from`}>{copy.from}<select id={`${identity}-from`} value={preferences.from} onChange={event=>changePreferences({from:event.target.value as GuidePreferences['from']})}>{GUIDE_PLACES.map(place=><option key={place} value={place}>{guidePlaceLabel(place,language)}</option>)}</select></label>
        <label htmlFor={`${identity}-to`}>{copy.to}<select id={`${identity}-to`} value={preferences.to} onChange={event=>changePreferences({to:event.target.value as GuidePreferences['to']})}>{GUIDE_PLACES.map(place=><option key={place} value={place}>{guidePlaceLabel(place,language)}</option>)}</select></label>
        <label className="kr-moving-guide-vehicle"><input type="checkbox" checked={preferences.vehicle} onChange={event=>changePreferences({vehicle:event.target.checked})}/><span>{copy.vehicle}</span></label>
      </div></section>
      <article className="kr-moving-guide-paper">
        <header className="kr-moving-guide-brand"><span><img src="/calculator-approved/assets/logo.webp" alt="Kraken" width="112" height="112" /></span><small>{copy.brandDescriptor}</small></header>
        <div className="kr-moving-guide-paper-content"><h3 className="kr-moving-guide-paper-title">{document.title}</h3><p>{document.subtitle}</p>
          <dl className="kr-moving-guide-context">{document.context.map(row=><div key={row.label}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl>
          <div className="kr-moving-guide-progress"><span><Check aria-hidden="true"/>{count} / {document.items.length} {copy.complete}</span><progress aria-label={copy.complete} value={count} max={document.items.length}/></div>
          {(['before','day','after'] as const).map(phase=><section className="kr-moving-guide-group" key={phase}><h4>{copy[phase]}</h4>{document.items.filter(item=>item.phase===phase).map(item=><div className={`kr-moving-guide-item ${document.completed.includes(item.id)?'is-complete':''}`} key={item.id}><label><input type="checkbox" checked={document.completed.includes(item.id)} onChange={event=>setCompleted(current=>event.target.checked?[...current.filter(id=>id!==item.id),item.id]:current.filter(id=>id!==item.id))}/><span>{item.title}</span></label><p>{item.body}</p>{!!item.links.length&&<div className="kr-moving-guide-links">{item.links.map(link=><a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">{link.label}</a>)}</div>}</div>)}</section>)}
          <aside className="kr-moving-guide-note"><strong>{copy.reviewed}</strong><p>{copy.registerScope}</p><p>{copy.note}</p></aside>
          <div className="kr-moving-guide-contact"><MapPin aria-hidden="true"/><div><strong>{copy.contact}</strong><p>Seewadelstrasse 3 · 8203 Schaffhausen</p><a href="tel:+41774505705">+41 77 450 57 05</a><span> · </span><a href="mailto:kai@krakenpfm.ch">kai@krakenpfm.ch</a></div></div>
        </div>
      </article>
      <p className="kr-moving-guide-privacy">{copy.privacy}{preview?` ${copy.preview}.`:''}</p>
      <div className="kr-moving-guide-feedback" role="status" aria-live="polite">{feedback}</div>
      <footer className="kr-moving-guide-actions"><button type="button" className="kr-moving-guide-back" onClick={close}>{copy.back}</button><div><button type="button" disabled={busy} onClick={()=>void print()}><Printer aria-hidden="true"/>{copy.print}</button><button type="button" className="is-primary" disabled={busy} onClick={()=>void download()}><Download aria-hidden="true"/>{busy?copy.preparing:copy.save}</button></div></footer>
    </dialog>
  </>;
}
