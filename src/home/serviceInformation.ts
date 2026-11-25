import { normalizeSiteLanguage } from '../locale';

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
  const locale=normalizeSiteLanguage(language)||'de-CH';
  const url=new URL(path,'https://krakenpfm.ch');
  if(url.origin!=='https://krakenpfm.ch')throw new Error('Expected an internal footer route.');
  url.searchParams.delete('hl');
  if(locale==='de'||locale==='de-CH')url.searchParams.delete('lang');
  else url.searchParams.set('lang',locale);
  return url.pathname+url.search+url.hash;
}

/** Reopen a native inbound information link, including an already-current fragment. */
export function serviceInformationTarget(href: string, currentHref: string): InformationService|null {
  try {
    const current=new URL(currentHref),target=new URL(href,current);
    if(target.origin!==current.origin||target.pathname.replace(/\/$/,'')!=='/leistungen')return null;
    return serviceInformationLinks.find(({section})=>target.hash==='#'+section)?.service||null;
  } catch { return null; }
}
