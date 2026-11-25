import { getMetadataForPath, normalizeCanonicalPath } from '../../seoConfig.ts';
import { homeText, normalizeHomeLanguage } from '../../components/home/homeTranslations.ts';
import { languageFromSearch } from '../locale.ts';
import { isIndexablePath, isPrivateUrl } from './crawl-policy.ts';
import { CORE_SERVICE_CATALOG, SITE_IDENTITY } from './site-identity.ts';

export { normalizeCanonicalPath } from '../../seoConfig.ts';

export type StructuredData = Record<string, unknown>;
export const SEO_LANGUAGES = ['de', 'en', 'es', 'pt', 'it', 'fr'] as const;

/** German keeps its established URL; translated pages retain their existing language URL. */
export function localizedCanonicalUrl(pathname: string, language: string): string {
  const url = new URL(normalizeCanonicalPath(pathname), SITE_IDENTITY.origin);
  const locale = normalizeHomeLanguage(language);
  if (locale !== 'de') url.searchParams.set('lang', locale);
  return url.href;
}

export function localizedAlternates(pathname: string): { lang: string; href: string }[] {
  return [
    ...SEO_LANGUAGES.map(language => ({
      lang: language === 'de' ? 'de-CH' : language,
      href: localizedCanonicalUrl(pathname, language),
    })),
    { lang: 'x-default', href: localizedCanonicalUrl(pathname, 'de') },
  ];
}

export type PageSeo = ReturnType<typeof getMetadataForPath> & {
  indexable: boolean;
  robots: 'index, follow' | 'noindex, follow';
  language: string;
  structuredData: StructuredData[];
};

/** Safe for script text as well as JSON: content can never close the script tag. */
export function serializeStructuredData(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

export const safeSchemaJson = serializeStructuredData;

/** One metadata source for the HTTP response and subsequent client navigation. */
export function getPageSeo(pathOrUrl: string, language?: string): PageSeo {
  let url: URL;
  let validUrl = true;
  try { url = new URL(pathOrUrl, SITE_IDENTITY.origin); }
  catch { validUrl = false; url = new URL('/', SITE_IDENTITY.origin); }
  const locale = normalizeHomeLanguage(language || languageFromSearch(url.search) || 'de');
  const baseMeta = getMetadataForPath(url.pathname + url.search, locale);
  const canonicalPath = normalizeCanonicalPath(url.pathname);
  const indexable = validUrl && isIndexablePath(canonicalPath) && !isPrivateUrl(url.pathname + url.search);
  const meta = {
    ...baseMeta,
    canonical: indexable ? localizedCanonicalUrl(canonicalPath, locale) : baseMeta.canonical,
    hreflangs: indexable ? localizedAlternates(canonicalPath) : [],
  };
  const result: PageSeo = {
    ...meta,
    indexable,
    robots: indexable ? 'index, follow' : 'noindex, follow',
    language: locale === 'de' ? 'de-CH' : locale,
    structuredData: [],
  };
  if (!indexable) return result;

  const origin = SITE_IDENTITY.origin;
  const businessId = `${origin}/#business`;
  const websiteId = `${origin}/#website`;
  const serviceCatalog = CORE_SERVICE_CATALOG.map(service => ({
    '@type': 'Service',
    name: homeText(locale, service.name),
    url: `${localizedCanonicalUrl('/leistungen', locale)}#${service.anchor}`,
    provider: { '@id': businessId },
  }));
  const website: StructuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': websiteId,
    url: localizedCanonicalUrl('/', locale),
    name: SITE_IDENTITY.shortName,
    publisher: { '@id': businessId },
    inLanguage: result.language,
  };
  const business: StructuredData = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': businessId,
    name: SITE_IDENTITY.name,
    alternateName: SITE_IDENTITY.shortName,
    url: `${origin}/`,
    logo: origin + SITE_IDENTITY.logoPath,
    image: origin + SITE_IDENTITY.imagePath,
    email: SITE_IDENTITY.email,
    telephone: SITE_IDENTITY.telephone,
    address: { '@type': 'PostalAddress', ...SITE_IDENTITY.address },
    areaServed: SITE_IDENTITY.areas.map(name => ({ '@type': 'City', name })),
    openingHoursSpecification: [{
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      ...SITE_IDENTITY.openingHours,
    }],
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: homeText(locale, 'Reinigung und kleine Umzüge in Zürich, Schaffhausen und Winterthur.'),
      itemListElement: serviceCatalog,
    },
  };
  const page: StructuredData = {
    '@context': 'https://schema.org',
    '@type': canonicalPath === '/about' ? 'AboutPage' : canonicalPath === '/kontakt' ? 'ContactPage' : 'WebPage',
    '@id': `${meta.canonical}#webpage`,
    url: meta.canonical,
    name: meta.title,
    description: meta.description,
    inLanguage: result.language,
    isPartOf: { '@id': websiteId },
    about: { '@id': businessId },
  };
  const schema: StructuredData[] = [website, business, page];
  if (canonicalPath !== '/') {
    const breadcrumbs: { name: string; item: string }[] = [
      { name: SITE_IDENTITY.shortName, item: localizedCanonicalUrl('/', locale) },
    ];
    const serviceMatch = /^\/services\/(schaffhausen|zurich|winterthur)\/([^/]+)$/.exec(canonicalPath);
    if (serviceMatch) {
      breadcrumbs.push({ name: homeText(locale, 'Leistungen'), item: localizedCanonicalUrl('/leistungen', locale) });
      const service = CORE_SERVICE_CATALOG.find(item => item.slug === serviceMatch[2]);
      if (service) {
        const serviceId = `${meta.canonical}#service`;
        const city = serviceMatch[1] === 'zurich' ? 'Zürich' : serviceMatch[1] === 'schaffhausen' ? 'Schaffhausen' : 'Winterthur';
        schema.push({
          '@context': 'https://schema.org', '@type': 'Service', '@id': serviceId,
          name: meta.h1,
          serviceType: homeText(locale, service.name),
          description: meta.description,
          url: meta.canonical,
          provider: { '@id': businessId },
          areaServed: { '@type': 'City', name: city },
        });
        page.mainEntity = { '@id': serviceId };
      }
    } else if (canonicalPath.startsWith('/reinigung/')) {
      breadcrumbs.push({ name: homeText(locale, 'Reinigung und kleine Umzüge in Zürich, Schaffhausen und Winterthur.'), item: localizedCanonicalUrl('/einsatzgebiete', locale) });
    }
    breadcrumbs.push({ name: meta.h1, item: meta.canonical });
    const breadcrumbId = `${meta.canonical}#breadcrumb`;
    schema.push({
      '@context': 'https://schema.org', '@type': 'BreadcrumbList', '@id': breadcrumbId,
      itemListElement: breadcrumbs.map((item, index) => ({ '@type': 'ListItem', position: index + 1, ...item })),
    });
    page.breadcrumb = { '@id': breadcrumbId };
  }
  result.structuredData = schema;
  return result;
}
