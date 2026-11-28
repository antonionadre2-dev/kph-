import React, { useId } from 'react';
import { getCityServiceContent } from '../src/seo/city-content';

/** Municipal facts stay separate from Kraken's commercial promises and tariffs. */
export default function CityServicePlanning({ cityId, serviceId, language, className = 'local-seo-section' }: { cityId: string; serviceId: string; language: string; className?: string }) {
  const id = useId();
  const copy = getCityServiceContent(cityId, serviceId, language);
  if (!copy) return null;
  return <section className={className} aria-labelledby={id} data-verified-city={copy.cityId}>
    <h2 id={id}>{copy.title}</h2>
    <p>{copy.preparation}</p>
    <ul>{copy.facts.map(fact => <li key={fact.id}><p>{fact.text}{' '}<a href={fact.source.url} target="_blank" rel="noopener noreferrer">{fact.source.label}</a></p></li>)}</ul>
  </section>;
}
