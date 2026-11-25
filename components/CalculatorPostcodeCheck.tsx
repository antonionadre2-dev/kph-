import React, { useEffect, useRef, useState } from 'react';
import { bookingText } from '../src/booking/uiCopy';
import { frictionText } from '../src/booking/calculatorFriction';

export default function CalculatorPostcodeCheck({ value, onChange, language, error }: { value: string; onChange: (value: string) => void; language: string; error?: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'found' | 'notFound' | 'unavailable'>('idle');
  const [place, setPlace] = useState('');
  const request = useRef<AbortController | null>(null);
  useEffect(() => { request.current?.abort(); request.current = null; setState('idle'); setPlace(''); }, [value, language]);
  useEffect(() => () => { request.current?.abort(); request.current = null; }, []);
  async function check() {
    if (!/^\d{4}$/.test(value)) return;
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 10_000);
    setState('loading'); setPlace('');
    try {
      const response = await fetch('/api/contact/geocode', { method: 'POST', credentials: 'same-origin', signal: controller.signal, headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ query: value, language }) });
      if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw Error('Unavailable');
      const data = await response.json();
      if (request.current !== controller || controller.signal.aborted) return;
      const candidates = Array.isArray(data.candidates) ? data.candidates.filter(candidate => candidate?.kind === 'postcode' && typeof candidate.label === 'string' && candidate.label.includes(value)) : [];
      if (candidates.length) { setPlace(candidates.map(candidate => candidate.label.slice(0, 180)).join(' · ').slice(0, 500)); setState('found'); }
      else setState('notFound');
    } catch { if (request.current === controller) setState('unavailable'); }
    finally { window.clearTimeout(timeout); }
  }
  return <section className="kr-calc-postcode-first" aria-labelledby="kr-calc-postcode-title"><h3 id="kr-calc-postcode-title">{frictionText(language, 'postcodeFirst')}</h3><p>{frictionText(language, 'postcodeHint')}</p><div className="kr-calc-postcode-controls"><div className="kr-calc-field"><label htmlFor="kr-calc-postal">{bookingText(language, 'postalCode')}</label><input id="kr-calc-postal" name="postal-code" autoComplete="postal-code" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} required value={value} aria-invalid={!!error || undefined} aria-describedby={`kr-calc-postcode-note${error ? ' kr-calc-postal-error' : ''}`} onChange={event => onChange(event.target.value.replace(/[^0-9]/g, '').slice(0, 4))} />{error && <span className="kr-calc-field-error" id="kr-calc-postal-error">{error}</span>}</div><button type="button" className="kr-calc-secondary" disabled={!/^\d{4}$/.test(value) || state === 'loading'} onClick={() => void check()}>{frictionText(language, state === 'loading' ? 'checking' : 'checkPostcode')}</button></div><p id="kr-calc-postcode-note" role="status">{state === 'found' ? frictionText(language, 'found', { place }) : state === 'notFound' ? frictionText(language, 'notFound') : state === 'unavailable' ? frictionText(language, 'postcodeUnavailable') : state === 'loading' ? frictionText(language, 'checking') : 'swisstopo · CH'}</p></section>;
}
