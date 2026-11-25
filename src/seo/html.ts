import { getPageSeo, safeSchemaJson } from './metadata.ts';
import { clientSeoState } from './client-state.ts';

export const escapeSeoHtml = (value: unknown): string => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]!));

/** One escaped head for humans and crawlers; never vary markup by user agent. */
export function injectPageSeo(html: string, pathWithQuery: string, language?: string, options: {allowIndexing?:boolean} = {}): string {
  const meta = getPageSeo(pathWithQuery, language);
  const state = clientSeoState(pathWithQuery,language,options.allowIndexing!==false);
  let result = html.replace(/<title\b[^>]*>[\s\S]*?<\/title>/i, () => `<title>${escapeSeoHtml(meta.title)}</title>`);
  result = result.replace(/<html\b([^>]*?)\blang=["'][^"']*["']/i, (_all, attributes) => `<html${attributes}lang="${escapeSeoHtml(meta.language)}"`);
  const tag = (attribute: 'name' | 'property', key: string, value: string) => {
    const pattern = new RegExp(`<meta\\b(?=[^>]*\\b${attribute}=["']${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'])[^>]*>`, 'gi');
    const replacement = `<meta ${attribute}="${key}" content="${escapeSeoHtml(value)}">`;
    let seen = false;
    result = result.replace(pattern, () => { if (seen) return ''; seen = true; return replacement; });
    if (!seen) result = result.replace('</head>', () => replacement + '</head>');
  };
  for (const key of ['title', 'twitter:title']) tag('name', key, meta.title);
  for (const key of ['description', 'twitter:description']) tag('name', key, meta.description);
  tag('name', 'robots', state.robots);
  tag('name', 'kraken-route-seo', state.marker);
  tag('name', 'twitter:image', meta.ogImage);
  tag('property', 'og:title', meta.title);
  tag('property', 'og:description', meta.description);
  tag('property', 'og:url', meta.canonical);
  tag('property', 'og:image', meta.ogImage);
  tag('property', 'og:image:width', meta.ogImageWidth);
  tag('property', 'og:image:height', meta.ogImageHeight);
  tag('property', 'og:image:type', meta.ogImageType);
  tag('property', 'og:locale', ({ de: 'de_CH', en: 'en', es: 'es', fr: 'fr_CH', it: 'it_CH', pt: 'pt' } as Record<string, string>)[meta.language.slice(0, 2)] || 'de_CH');
  result = result.replace(/<link\b(?=[^>]*\brel=["']canonical["'])[^>]*>/gi, '');
  result = result.replace(/<link\b(?=[^>]*\brel=["']alternate["'])(?=[^>]*\bhreflang=)[^>]*>/gi, '');
  result = result.replace(/<script\b(?=[^>]*\btype=["']application\/ld\+json["'])[^>]*>[\s\S]*?<\/script>/gi, '');
  const schema = { '@context': 'https://schema.org', '@graph': meta.structuredData };
  const alternates = meta.hreflangs.map(({ lang, href }) => `<link rel="alternate" hreflang="${escapeSeoHtml(lang)}" href="${escapeSeoHtml(href)}">`).join('');
  return result.replace('</head>', () => `<link rel="canonical" href="${escapeSeoHtml(meta.canonical)}">${alternates}<script id="kraken-page-schema" type="application/ld+json">${safeSchemaJson(schema)}</script></head>`);
}
