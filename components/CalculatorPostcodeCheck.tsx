import React, { useEffect, useRef, useState } from 'react';
import { LoaderCircle, Mail, Phone } from 'lucide-react';
import { bookingText } from '../src/booking/uiCopy';
import { frictionText } from '../src/booking/calculatorFriction';
import { postcodeLocalities, type ResolvedPostcodeLocality } from '../src/booking/postcodeLocation';
import { bookingAreaReview } from '../src/booking/serviceArea';

export default function CalculatorPostcodeCheck({ value, onChange, onResolved, language, error }: {
  value: string;
  onChange: (value: string) => void;
  onResolved?: (place: ResolvedPostcodeLocality) => void;
  language: string;
  error?: string;
}) {
  const [state, setState] = useState<'idle' | 'loading' | 'found' | 'notFound' | 'unavailable'>('idle');
  const [places, setPlaces] = useState<ResolvedPostcodeLocality[]>([]);
  const [selected, setSelected] = useState('');
  const request = useRef<AbortController | null>(null);
  useEffect(() => { request.current?.abort(); request.current = null; setState('idle'); setPlaces([]); setSelected(''); }, [value, language]);
  useEffect(() => () => { request.current?.abort(); request.current = null; }, []);
  async function check() {
    if (!/^[1-9]\d{3}$/.test(value) || request.current && !request.current.signal.aborted) return;
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 10_000);
    setState('loading'); setPlaces([]); setSelected('');
    try {
      const response = await fetch('/api/contact/geocode', { method: 'POST', credentials: 'same-origin', referrerPolicy: 'strict-origin', signal: controller.signal, headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ query: value, language }) });
      if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw Error('Unavailable');
      const data = await response.json();
      if (request.current !== controller || controller.signal.aborted) return;
      const found = postcodeLocalities(value, data.candidates);
      setPlaces(found);
      if (found.length) {
        setState('found');
        if (found.length === 1) { setSelected(found[0].locality); onResolved?.(found[0]); }
      } else setState('notFound');
    } catch { if (request.current === controller) setState('unavailable'); }
    finally { window.clearTimeout(timeout); if (request.current === controller) request.current = null; }
  }
  const outside = /^[1-9]\d{3}$/.test(value) && bookingAreaReview(value, selected || places.map(place => place.locality).join(' ')) === 'outside';
  return <section className="kr-calc-postcode-first" aria-labelledby="kr-calc-postcode-title">
    <h3 id="kr-calc-postcode-title">{frictionText(language, 'postcodeFirst')}</h3>
    <p>{frictionText(language, 'postcodeHint')}</p>
    <div className="kr-calc-postcode-controls"><div className="kr-calc-field">
      <label htmlFor="kr-calc-postal">{bookingText(language, 'postalCode')}</label>
      <input id="kr-calc-postal" name="postal-code" autoComplete="postal-code" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} required value={value} aria-invalid={!!error || undefined} aria-describedby={`kr-calc-postcode-note${error ? ' kr-calc-postal-error' : ''}`} onChange={event => onChange(event.target.value.replace(/[^0-9]/g, '').slice(0, 4))} />
      {error && <span className="kr-calc-field-error" id="kr-calc-postal-error">{error}</span>}
    </div><button type="button" className="kr-calc-secondary" disabled={!/^[1-9]\d{3}$/.test(value) || state === 'loading'} aria-busy={state === 'loading' || undefined} onClick={() => void check()}>{state === 'loading' && <LoaderCircle className="kr-calc-spin" aria-hidden="true" />}{frictionText(language, state === 'loading' ? 'checking' : 'checkPostcode')}</button></div>
    {state === 'found' && places.length > 1 && <div className="kr-calc-field kr-calc-locality-choice"><label htmlFor="kr-calc-found-locality">{bookingText(language, 'postcodeChooseLocality')}</label><select id="kr-calc-found-locality" value={selected} onChange={event => { setSelected(event.target.value); const place = places.find(item => item.locality === event.target.value); if (place) onResolved?.(place); }}><option value="">—</option>{places.map(place => <option key={place.locality} value={place.locality}>{place.locality}</option>)}</select></div>}
    <p id="kr-calc-postcode-note" role="status">{state === 'found' ? frictionText(language, 'found', { place: selected || places.map(place => place.locality).join(' · ') }) : state === 'notFound' ? frictionText(language, 'notFound') : state === 'unavailable' ? frictionText(language, 'postcodeUnavailable') : state === 'loading' ? frictionText(language, 'checking') : 'swisstopo · CH'}</p>
    {outside && <div className="kr-calc-area-review" role="status"><p><strong>{bookingText(language, 'coverageOutside')}</strong></p><p>{bookingText(language, 'coverageReview')}</p><div className="kr-calc-area-contacts"><a href="tel:+41774505705"><Phone aria-hidden="true" />+41 77 450 57 05</a><a href="https://wa.me/41774505705" target="_blank" rel="noopener noreferrer">WhatsApp</a><a href="mailto:kai@krakenpfm.ch"><Mail aria-hidden="true" />kai@krakenpfm.ch</a></div></div>}
  </section>;
}
