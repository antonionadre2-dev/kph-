import { publicHref, toLegacyPath } from '../routing/site-paths';

/** Information routes are deliberately independent of calculator hand-off/storage. */
export const serviceInformationLinks = [
  { service: 'windows', section: 'fensterreinigung', label: 'Fensterreinigung' },
  { service: 'end', section: 'umzugsreinigung', label: 'Umzugsreinigung' },
  { service: 'regular', section: 'regelmaessige-reinigung', label: 'Regelmässige Reinigung' },
  { service: 'deep', section: 'grundreinigung', label: 'Grundreinigung' },
  { service: 'moving', section: 'kleine-umzuege', label: 'Kleine Umzüge' },
] as const;

export type InformationService = typeof serviceInformationLinks[number]['service'];
export const serviceInformationSections = Object.freeze(Object.fromEntries(
  serviceInformationLinks.map(({service,section})=>[service,section]),
)) as Readonly<Record<InformationService,string>>;

/** Full native href, with locale before the fragment and German's established clean URL. */
export function footerInformationHref(path: string, language: unknown): string {
  return publicHref(path, language);
}

/** Reopen a native inbound information link, including an already-current fragment. */
export function serviceInformationTarget(href: string, currentHref: string): InformationService|null {
  try {
    const current=new URL(currentHref),target=new URL(href,current);
    if(target.origin!==current.origin||toLegacyPath(target.pathname)!=='/leistungen')return null;
    return serviceInformationLinks.find(({section})=>target.hash==='#'+section)?.service||null;
  } catch { return null; }
}
