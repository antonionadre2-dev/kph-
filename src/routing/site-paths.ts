import { ROUTE_MUNICIPALITIES } from './municipalities.ts';
export const SITE_ORIGIN = 'https://krakenpfm.ch';
export const ROUTE_LANGUAGES = ['de', 'en', 'es', 'pt', 'it', 'fr'] as const;
export type RouteLanguage = typeof ROUTE_LANGUAGES[number];

export function routeLanguage(value: unknown): RouteLanguage | null {
  if (typeof value !== 'string') return null;
  const code = value.trim().toLowerCase().split('-')[0];
  return ROUTE_LANGUAGES.includes(code as RouteLanguage) ? code as RouteLanguage : null;
}

const SERVICES: Record<string, string> = {
  'end-of-tenancy': 'umzugsreinigung', 'daily-cleaning': 'wohnungsreinigung',
  'deep-cleaning': 'grundreinigung', 'moving-furniture': 'kleinumzug', 'window-cleaning': 'fensterreinigung',
};
const LEGACY_SERVICES = Object.fromEntries(Object.entries(SERVICES).map(([old, current]) => [current, old]));
const ALIASES: Record<string, string> = {
  '/index.html': '/',
  '/about': '/ueber-uns', '/ueber-kraken': '/ueber-uns', '/our-story': '/ueber-uns', '/quote': '/offerte', '/consultation': '/offerte',
  '/services': '/leistungen', '/contact': '/kontakt', '/contacto': '/kontakt', '/imprint': '/impressum',
  '/reinigung/uhwiesen': '/reinigung/laufen-uhwiesen',
};

function historicalRegion(slug: string): string | null {
  const normalized = slug === 'neuhausen' ? 'neuhausen-am-rheinfall' : slug === 'zuerich' ? 'zurich' : slug;
  const place = ROUTE_MUNICIPALITIES.find(item => item.slug === normalized);
  return !place ? null : place.region === 'zuerich' ? '/reinigung/region-zuerich' : place.region === 'winterthur' ? '/reinigung/region-winterthur' : '/reinigung/kanton-schaffhausen';
}

function splitPath(pathOrUrl: string) {
  const url = new URL(pathOrUrl, SITE_ORIGIN);
  const parts = url.pathname.split('/').filter(Boolean);
  const first = routeLanguage(parts[0]);
  const prefixed = first && parts[0].length === 2 ? first : null;
  const pathname = ('/' + (prefixed ? parts.slice(1) : parts).join('/')).toLowerCase();
  return { url, pathname, prefixed };
}

/** Canonical German base path, independent of a visitor's language prefix. */
export function toPublicPath(pathOrUrl: string): string {
  const { pathname } = splitPath(pathOrUrl);
  const aliased = ALIASES[pathname] || pathname;
  const municipality = /^\/reinigung\/([^/]+)$/.exec(aliased);
  if (municipality && !['region-zuerich', 'region-winterthur', 'kanton-schaffhausen'].includes(municipality[1])) return historicalRegion(municipality[1]) || aliased;
  if (ALIASES[pathname]) return aliased;
  const service = /^\/(?:services|seo|dienstleistungen)\/([^/]+)\/([^/]+)$/.exec(pathname)
    || /^\/reinigung-(schaffhausen|zurich|zuerich|winterthur|neuhausen|thayngen|stein-am-rhein|feuerthalen|kloten|buelach|dietikon|uster)-(.+)$/.exec(pathname);
  if (service && SERVICES[service[2]]) {
    const city = service[1] === 'zurich' ? 'zuerich' : service[1];
    if (!['zuerich', 'schaffhausen', 'winterthur'].includes(city)) return historicalRegion(city) || `/${SERVICES[service[2]]}/${city}`;
    return `/${SERVICES[service[2]]}/${city}`;
  }
  return pathname;
}

/** Existing component/router identifiers stay stable while public URLs migrate. */
export function toLegacyPath(pathOrUrl: string): string {
  const path = toPublicPath(pathOrUrl);
  if (path === '/ueber-uns') return '/about';
  if (path === '/offerte') return '/quote';
  const service = /^\/([^/]+)\/([^/]+)$/.exec(path);
  if (service && LEGACY_SERVICES[service[1]]) {
    const city = service[2] === 'zuerich' ? 'zurich' : service[2];
    return `/services/${city}/${LEGACY_SERVICES[service[1]]}`;
  }
  return path;
}

export function pathLanguage(pathOrUrl: string): RouteLanguage | null {
  const { url, prefixed } = splitPath(pathOrUrl);
  return prefixed || routeLanguage(url.searchParams.get('lang')) || routeLanguage(url.searchParams.get('hl'));
}

export function parseSitePath(pathOrUrl: string) {
  const pathname = toPublicPath(pathOrUrl);
  const legacyPath = toLegacyPath(pathname);
  const match = /^\/services\/([^/]+)\/([^/]+)$/.exec(legacyPath);
  return { pathname, legacyPath, language: pathLanguage(pathOrUrl),
    service: match ? { cityId: match[1], serviceId: match[2] } : null };
}

/** Complete native link: no locale in storage is required to follow it. */
export function publicHref(path: string, language: unknown): string {
  const { url } = splitPath(path);
  if (url.origin !== SITE_ORIGIN) throw new Error('Expected a same-origin site route.');
  if (/^\/(?:api|assets|home-approved|about-approved|kraken-contact)(?:\/|$)/.test(url.pathname)) return url.pathname + url.search + url.hash;
  const locale = routeLanguage(language) || pathLanguage(path) || 'de';
  const pathname = toPublicPath(path);
  url.pathname = locale === 'de' ? pathname : '/' + locale + (pathname === '/' ? '/' : pathname);
  url.searchParams.delete('lang'); url.searchParams.delete('hl');
  return url.pathname + url.search + url.hash;
}
