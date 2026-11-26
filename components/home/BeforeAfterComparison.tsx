import React, { useId, useState } from 'react';
import type { BeforeAfterCase } from '../../src/home/before-after';
import './before-after.css';

const copy = {
  de: { title: 'Vorher und nachher', before: 'Vorher', after: 'Nachher', slider: 'Fotos vergleichen' },
  en: { title: 'Before and after', before: 'Before', after: 'After', slider: 'Compare photographs' },
  es: { title: 'Antes y después', before: 'Antes', after: 'Después', slider: 'Comparar fotografías' },
  pt: { title: 'Antes e depois', before: 'Antes', after: 'Depois', slider: 'Comparar fotografias' },
  it: { title: 'Prima e dopo', before: 'Prima', after: 'Dopo', slider: 'Confronta le fotografie' },
  fr: { title: 'Avant et après', before: 'Avant', after: 'Après', slider: 'Comparer les photos' },
};
const Comparison: React.FC<{ item: BeforeAfterCase; labels: typeof copy.de }> = ({ item, labels }) => {
  const [position, setPosition] = useState(50);
  const id = useId();
  return <figure className="kr-photo-comparison">
    <div className="kr-photo-comparison-view" style={{ aspectRatio: `${item.width}/${item.height}` }}>
      <img src={item.after.src} alt={item.after.alt} width={item.width} height={item.height} loading="lazy" decoding="async" />
      <div className="kr-photo-comparison-before" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}><img src={item.before.src} alt={item.before.alt} width={item.width} height={item.height} loading="lazy" decoding="async" /></div>
      <span className="kr-photo-comparison-divider" style={{ left: `${position}%` }} aria-hidden="true" />
      <span className="kr-photo-comparison-label">{labels.before}</span><span className="kr-photo-comparison-label kr-photo-comparison-label--after">{labels.after}</span>
    </div>
    <figcaption><label htmlFor={id}>{labels.slider}</label><output htmlFor={id}>{position}%</output></figcaption>
    <input id={id} type="range" min="0" max="100" value={position} aria-valuetext={`${position}% ${labels.before}, ${100 - position}% ${labels.after}`} onChange={event => setPosition(Number(event.currentTarget.value))} />
  </figure>;
};

/** Empty data means no section, image requests or placeholder photographs. */
export default function BeforeAfterComparison({ cases, language }: { cases: readonly BeforeAfterCase[]; language: string }) {
  const id = useId();
  if (!cases.length) return null;
  const labels = copy[language.toLowerCase().split('-')[0] as keyof typeof copy] || copy.de;
  return <section className="section container kr-before-after" aria-labelledby={id}><h2 id={id}>{labels.title}</h2>{cases.map(item => <Comparison key={item.id} item={item} labels={labels} />)}</section>;
}
