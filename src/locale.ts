import { publicHref, pathLanguage, toPublicPath } from './routing/site-paths.ts';

export const SITE_LANGUAGES = ['de-CH', 'de', 'en', 'fr', 'it', 'es', 'pt'] as const;
export type SiteLanguage = typeof SITE_LANGUAGES[number];
export const LANGUAGE_STORAGE_KEY = 'kraken_preferred_lang';
export const LOCALE_LOCATION_EVENT = 'kraken:locationchange';

export function normalizeSiteLanguage(value: unknown): SiteLanguage | null {
  if (typeof value !== 'string') return null;
  const code = value.trim().toLowerCase();
  if (code === 'de-ch') return 'de-CH';
  if (SITE_LANGUAGES.includes(code as SiteLanguage)) return code as SiteLanguage;
  const regional = /^(de|en|fr|it|es|pt)-[a-z]{2}(?:-[a-z0-9]+)*$/.exec(code);
  return regional ? regional[1] as SiteLanguage : null;
}

export function languageFromSearch(search: string): SiteLanguage | null {
  const params = new URLSearchParams(search);
  return normalizeSiteLanguage(params.get('lang')) || normalizeSiteLanguage(params.get('hl'));
}

export function resolveSiteLanguage({ pathname = '', search = '', saved = null, browserLanguage = '' }: {
  pathname?: string; search?: string; saved?: unknown; browserLanguage?: string;
} = {}): SiteLanguage {
  const explicit = pathLanguage(pathname) || languageFromSearch(search);
  if (explicit) return explicit;
  const preferred = normalizeSiteLanguage(saved);
  if (preferred) return preferred;
  const browser = normalizeSiteLanguage(browserLanguage);
  return browser === 'de' || browser === 'de-CH' ? browser : 'de-CH';
}

export function languageSelectionUrl(href: string, language: SiteLanguage): string {
  const url = new URL(href);
  return publicHref(url.pathname + url.search + url.hash, language);
}

/** A restored preference gets the same explicit URL as a visitor's language selection. */
export function restoredLanguageUrl(href: string, language: SiteLanguage): string | null {
  const url = new URL(href);
  const explicit = pathLanguage(href);
  const german = language === 'de' || language === 'de-CH';
  if (explicit) {
    // The server preserves this unprefixed entry choice until i18n has resolved
    // and persisted it. Canonical metadata remains the ordinary German URL.
    if (!german || explicit !== 'de' || pathLanguage(url.pathname)) return null;
    const normalized = languageSelectionUrl(href, language);
    return normalized !== url.pathname + url.search + url.hash ? normalized : null;
  }
  if (german) return null;
  return languageSelectionUrl(href, language);
}

/** Merge route queries without duplicating '?'; an explicit target locale wins. */
export function localizedNavigationUrl(target: string, currentHref: string, language: SiteLanguage): string {
  const current = new URL(currentHref);
  const destination = new URL(target, current);
  if (destination.origin !== current.origin) throw new Error('Expected a same-origin navigation route.');
  const explicit = pathLanguage(destination.href);
  const targetKeys = new Set(destination.searchParams.keys());
  const bookingKeys = new Set(['booking', 'draft', 'guide', 'payment']);
  for (const [key, value] of current.searchParams) {
    if (toPublicPath(destination.pathname) !== toPublicPath(current.pathname) && bookingKeys.has(key)) continue;
    if (!targetKeys.has(key)) destination.searchParams.append(key, value);
  }
  return publicHref(destination.pathname + destination.search + destination.hash, explicit || language);
}
