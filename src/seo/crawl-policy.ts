import { PUBLIC_BASE_PATHS } from '../routing/route-policy.ts';
import { toPublicPath } from '../routing/site-paths.ts';
/** Shared exclusions for search crawlers and route metadata. */
export const PRIVATE_PATH_PREFIXES = [
  '/api',
  '/admin',
  '/dashboard',
  '/login',
  '/register',
  '/auth',
  '/customer-access',
  '/recovery',
  '/quote-demo',
  '/commercial-quote',
  '/review-invite',
  '/reviews',
  '/reviewsvip',
  '/dejar-opinion',
] as const;

/** Reviewed public pages; do not derive this list from every routable legacy URL. */
export const INDEXABLE_PATHS = PUBLIC_BASE_PATHS;

export function isIndexablePath(pathname: string): boolean {
  return INDEXABLE_PATHS.includes(toPublicPath(pathname));
}

/** Accepts a request path, including an optional query string or fragment. */
export function isPrivatePath(pathname: string): boolean {
  let path = pathname.split(/[?#]/, 1)[0];
  try { path = decodeURIComponent(path); } catch { return true; }
  path = toPublicPath(path);
  path = path.toLowerCase();
  return PRIVATE_PATH_PREFIXES.some(prefix => path.startsWith(prefix));
}

const PRIVATE_QUERY_KEYS = new Set(['booking', 'draft', 'access', 'accesstoken', 'token', 'payment', 'guide', 'oobcode']);

/** The calculator introduction is public; saved bookings and capability links are not. */
export function isPrivateUrl(pathOrUrl: string): boolean {
  try {
    const url = new URL(pathOrUrl, 'https://krakenpfm.ch');
    return isPrivatePath(url.pathname) || [...url.searchParams.keys()].some(key => PRIVATE_QUERY_KEYS.has(key.toLowerCase()));
  } catch { return true; }
}

export function renderRobotsTxt(origin: string): string {
  return [
    '# Public information may be crawled for conventional and ChatGPT search.',
    '# GPTBot retains the existing wildcard policy; search access does not require training access.',
    '# ChatGPT-User is user initiated and may not apply robots.txt rules.',
    '# Crawl preferences do not replace authentication or authorization.',
    'User-agent: *',
    'User-agent: OAI-SearchBot',
    'User-agent: ChatGPT-User',
    'Allow: /',
    ...['', '/en', '/es', '/pt', '/it', '/fr'].flatMap(locale => PRIVATE_PATH_PREFIXES.filter(prefix => !['/commercial-quote', '/recovery'].includes(prefix)).map(prefix => `Disallow: ${locale}${prefix}`)),
    ...[...PRIVATE_QUERY_KEYS].map(key => `Disallow: /*?*${key}=`),
    '',
    `Sitemap: ${origin.replace(/\/$/, '')}/sitemap.xml`,
    '',
  ].join('\n');
}
