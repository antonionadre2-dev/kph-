import { useEffect } from 'react';
import { installDisclosureMotion } from './disclosure-motion-controller';
import './public-interactions.css';

/** Native HTML remains usable without JavaScript; enhancement attaches once for SPA routes. */
export default function DisclosureMotion() {
  useEffect(() => installDisclosureMotion(document, matchMedia('(prefers-reduced-motion: reduce)')), []);
  return null;
}
