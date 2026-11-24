/** Flat fragment names are included by the existing Vercel dist/*.html contract. */
export function seoFragmentName(pathname: string, language: string): string {
  const locale = ['de', 'en', 'es', 'fr', 'it', 'pt'].includes(language) ? language : 'de';
  const slug = pathname === '/' ? 'home' : pathname.replace(/^\//, '').replace(/[^a-z0-9-]/gi, '-');
  return `seo-page-${slug}-${locale}.html`;
}
