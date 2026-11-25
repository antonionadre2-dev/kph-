import { toPublicPath } from '../routing/site-paths.ts';
/** Flat fragment names are included by the existing Vercel dist/*.html contract. */
export const LEGAL_DOCUMENT_PATHS = ['/impressum','/gdpr','/terms'] as const;
export const HOME_APP_SSR_MARKER='<!-- kraken-home-app-ssr -->';

export function seoFragmentName(pathname: string, language: string): string {
  const locale = ['de', 'en', 'es', 'fr', 'it', 'pt'].includes(language) ? language : 'de';
  const base = toPublicPath(pathname);
  const slug = base === '/' ? 'home' : base.replace(/^\//, '').replace(/[^a-z0-9-]/gi, '-');
  return `seo-page-${slug}-${locale}.html`;
}
