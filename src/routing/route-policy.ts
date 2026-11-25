import { ROUTE_MUNICIPALITIES } from './municipalities.ts';
import { parseSitePath, publicHref, pathLanguage } from './site-paths.ts';

const CITIES = ['schaffhausen', 'zuerich', 'winterthur'];
const SERVICES = ['umzugsreinigung', 'wohnungsreinigung', 'grundreinigung', 'kleinumzug', 'fensterreinigung'];
export const PUBLIC_BASE_PATHS = [
  '/', '/leistungen', '/ueber-uns', '/kontakt', '/offerte', '/einsatzgebiete',
  '/reinigung/kanton-schaffhausen', '/reinigung/region-winterthur', '/reinigung/region-zuerich',
  ...CITIES.flatMap(city => SERVICES.map(service => `/${service}/${city}`)),
];
const PRIVATE_BASE_PATHS = ['/login', '/register', '/dashboard', '/customer-access', '/quote-demo', '/commercial-quote', '/reviews', '/reviewsvip', '/review-invite', '/dejar-opinion'];
const LEGAL_PATHS = ['/impressum', '/gdpr', '/terms'];
export const RETIRED_PAGE_PATHS = ['/commercial', '/careers', '/sustainability', '/blog', '/comic', '/comic-shop', '/hse'];
export const RETIRED_SERVICE_SLUGS = ['gardening', 'exterior-cleaning', 'pest-control', 'waste-management', 'car-detailing', 'gutter-cleaning', 'upholstery-cleaning', 'mudanza-cajas', 'pulido-suelos', 'bar-restaurant-cleaning', 'property-managers', 'airbnb-rentals', 'turnover-cleaning', 'offices-corporate', 'retail-showrooms', 'gastronomy-restaurants', 'kitchen-deep-cleaning', 'industry-logistics'];

export function regionForMunicipality(slug: string): string | null {
  const normalized = slug === 'neuhausen' ? 'neuhausen-am-rheinfall' : slug === 'zuerich' ? 'zurich' : slug === 'uhwiesen' ? 'laufen-uhwiesen' : slug;
  const municipality = ROUTE_MUNICIPALITIES.find(item => item.slug === normalized);
  if (!municipality) return null;
  return municipality.region === 'zuerich' ? '/reinigung/region-zuerich' : municipality.region === 'winterthur' ? '/reinigung/region-winterthur' : '/reinigung/kanton-schaffhausen';
}

/** Historical pages either have a specific replacement or an explicit removal status. */
export function getRouteDisposition(pathOrUrl: string): { status: 200 | 301 | 404 | 410; location?: string } {
  const url = new URL(pathOrUrl, 'https://krakenpfm.ch');
  const { pathname, legacyPath } = parseSitePath(pathOrUrl);
  const language = pathLanguage(pathOrUrl) || 'de';
  if (RETIRED_PAGE_PATHS.some(path => pathname === path || pathname.startsWith(path + '/'))) return { status: 410 };
  const service = /^\/(?:services|seo|dienstleistungen)\/([^/]+)\/([^/]+)$/.exec(legacyPath)
    || /^\/reinigung-(schaffhausen|zurich|zuerich|winterthur|neuhausen|thayngen|stein-am-rhein|feuerthalen|kloten|buelach|dietikon|uster)-(.+)$/.exec(legacyPath);
  if (service && RETIRED_SERVICE_SLUGS.includes(service[2])) return { status: 410 };
  if (service && !['end-of-tenancy', 'daily-cleaning', 'deep-cleaning', 'moving-furniture', 'window-cleaning'].includes(service[2])) return { status: 404 };
  const municipality = /^\/reinigung\/([^/]+)$/.exec(pathname);
  let target: string | null = null;
  if (municipality && !PUBLIC_BASE_PATHS.includes(pathname)) target = regionForMunicipality(municipality[1]);
  if (service && !PUBLIC_BASE_PATHS.includes(pathname)) target = regionForMunicipality(service[1]);
  if (!target && ![...PUBLIC_BASE_PATHS, ...LEGAL_PATHS, ...PRIVATE_BASE_PATHS].includes(pathname)) return { status: 404 };
  const replacement = new URL(target || pathname, 'https://krakenpfm.ch');
  replacement.search = url.search;
  replacement.hash = url.hash;
  const location = publicHref(replacement.pathname + replacement.search + replacement.hash, language);
  return location !== url.pathname + url.search + url.hash ? { status: 301, location } : { status: 200 };
}
