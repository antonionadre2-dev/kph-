import { ROUTE_MUNICIPALITIES as MUNICIPALITIES } from "./src/routing/municipalities.ts";
import { toPublicPath, toLegacyPath, pathLanguage } from "./src/routing/site-paths.ts";
import { parsePath, isRouteValid } from "./src/routing/router.ts";
export { parsePath, isRouteValid, PATH_TO_PAGE_MAP } from "./src/routing/router.ts";
import { homeText, normalizeHomeLanguage } from "./components/home/homeTranslations.ts";
import { languageFromSearch } from "./src/locale.ts";
import { contactText } from "./components/contact/contactTranslations.ts";
import { bookingText } from "./src/booking/uiCopy.ts";
import { customerAccessText } from "./src/booking/customerAccessCopy.ts";
import { getLocalSeoDescriptor } from "./src/seo/local-content.ts";
import { getApprovedPageMetadata } from "./src/seo/local-metadata.ts";
import { getContactCopy } from "./src/contact/contact-copy.ts";

export type Language = "de" | "en" | "fr" | "it" | "es" | "pt";

export const BRAND = "Kraken PFM";
export const BASE_URL = "https://krakenpfm.ch";
export const DEFAULT_OG_IMAGE = `${BASE_URL}/kraken-og-1200x630.jpg`;
export const OG_IMAGE_WIDTH = "1200";
export const OG_IMAGE_HEIGHT = "630";
export const OG_IMAGE_TYPE = "image/jpeg";

export const PAGE_TO_PATH_MAP: Record<string, string> = {
  "home": "/",
  "consultation": "/quote",
  "about": "/about",
  "services-page": "/services",
  "approved-services": "/leistungen",
  "moving-services": "/kleine-umzuege",
  "commercial-services": "/commercial",
  "careers": "/careers",
  "sustainability-page": "/sustainability",
  "our-story": "/our-story",
  "blog": "/blog",
  "comic-page": "/comic",
  "comic-shop": "/comic-shop",
  "gdpr": "/gdpr",
  "terms": "/terms",
  "hse": "/hse",
  "impressum": "/impressum",
  "kontakt": "/kontakt",
  "login": "/login",
  "register": "/register",
  "dashboard": "/dashboard",
  "commercial-quote": "/commercial-quote",
  "review-invite": "/reviews",
  "coverage-hub": "/einsatzgebiete",
};

export const VALID_CITIES = ["schaffhausen", "zurich", "winterthur", "neuhausen", "stein-am-rhein"];
export const VALID_SERVICES = [
  "end-of-tenancy",
  "deep-cleaning",
  "daily-cleaning",
  "moving-furniture",
  "gardening",
  "exterior-cleaning",
  "pest-control",
  "waste-management",
  "car-detailing",
  "gutter-cleaning",
  "upholstery-cleaning",
  "window-cleaning",
  "mudanza-cajas",
  "pulido-suelos",
  "bar-restaurant-cleaning",
  "property-managers",
  "airbnb-rentals",
  "turnover-cleaning",
  "offices-corporate",
  "retail-showrooms",
  "gastronomy-restaurants",
  "kitchen-deep-cleaning",
  "industry-logistics"
];

export const getRegionHubUrl = (region: string): string => {
  const norm = region.toLowerCase();
  if (norm === "schaffhausen" || norm === "kanton-schaffhausen") {
    return "/reinigung/kanton-schaffhausen";
  }
  if (norm === "winterthur" || norm === "region-winterthur") {
    return "/reinigung/region-winterthur";
  }
  if (norm === "zuerich" || norm === "zurich" || norm === "region-zuerich") {
    return "/reinigung/region-zuerich";
  }
  return "/reinigung/region-zuerich";
};

export const getMunicipalityUrl = (municipalitySlug: string): string => {
  return `/reinigung/${municipalitySlug.toLowerCase()}`;
};

export const getServicePageUrl = (cityOrRegionSlug: string, serviceSlug: string): string | null => {
  let city = cityOrRegionSlug.toLowerCase();
  if (city === "zuerich") city = "zurich";
  if (city === "neuhausen-am-rheinfall") city = "neuhausen";
  const service = serviceSlug.toLowerCase();
  if (VALID_CITIES.includes(city) && VALID_SERVICES.includes(service)) {
    return `/services/${city}/${service}`;
  }
  return null;
};

export const getServiceLinkForMunicipality = (municipalitySlug: string, serviceSlug: string): string => {
  const mun = MUNICIPALITIES.find(m => m.slug === municipalitySlug.toLowerCase());
  if (!mun) {
    return `/services/zurich/${serviceSlug.toLowerCase()}`;
  }
  
  const mSlug = mun.slug;
  const urlCitySlug = mSlug === "neuhausen-am-rheinfall" ? "neuhausen" : mSlug;
  
  // Tier 1 municipalities have standalone service subpages
  if (mun.tier === 1 && VALID_CITIES.includes(urlCitySlug)) {
    return `/services/${urlCitySlug}/${serviceSlug.toLowerCase()}`;
  }
  
  // Tier 2 municipalities use anchor sections on their location page
  if (mun.tier === 2) {
    return `/reinigung/${mSlug}#${serviceSlug.toLowerCase()}`;
  }
  
  // Tier 3 municipalities link to parent region hub
  const targetRegion = mun.region === "zuerich" ? "region-zuerich" : mun.region === "winterthur" ? "region-winterthur" : "kanton-schaffhausen";
  return `/reinigung/${targetRegion}#${serviceSlug.toLowerCase()}`;
};

/** Canonical German base route; the language prefix is supplied by getPageSeo. */
export function normalizeCanonicalPath(pathOrUrl: string): string { return toPublicPath(pathOrUrl); }

export const HOME_METADATA = {
  title: "Kraken PFM – Reinigung & kleine Umzüge in Zürich, Schaffhausen und Winterthur",
  description: "Persönliche Reinigung und kleine Umzüge für Privathaushalte in Zürich, Schaffhausen und Winterthur. Fensterreinigung, Umzugsreinigung, regelmässige Reinigung und Grundreinigung."
};

const FALLBACK_LABELS: Record<string, readonly string[]> = {
  impressum: ['Impressum','Legal notice','Aviso legal','Aviso legal','Note legali','Mentions légales'],
  gdpr: ['Datenschutz','Privacy','Privacidad','Privacidade','Privacy','Confidentialité'],
  terms: ['Allgemeine Geschäftsbedingungen','Terms and conditions','Condiciones generales','Condições gerais','Condizioni generali','Conditions générales'],
  login: ['Anmelden','Sign in','Iniciar sesión','Iniciar sessão','Accedi','Connexion'],
  register: ['Konto erstellen','Create an account','Crear cuenta','Criar conta','Creare un account','Créer un compte'],
  dashboard: ['Kundenbereich','Customer area','Área de cliente','Área de cliente','Area clienti','Espace client'],
  'review-invite': ['Ihre Rückmeldung','Your feedback','Su opinión','A sua opinião','La sua opinione','Votre avis'],
  '404': ['Seite nicht gefunden','Page not found','Página no encontrada','Página não encontrada','Pagina non trovata','Page introuvable'],
};
const FALLBACK_LANGUAGES = ['de','en','es','pt','it','fr'];

function getBaseMetadataForPath(
  pathname: string,
  langParam?: string
): {
  title: string;
  description: string;
  canonical: string;
  hreflangs: { lang: string; href: string }[];
  pageType: string;
  h1: string;
  h2: string;
  bodyText: string;
  ogImage: string;
  ogImageWidth: string;
  ogImageHeight: string;
  ogImageType: string;
} {
  const cleanPath = toLegacyPath(pathname);
  const localLanguage = normalizeHomeLanguage(langParam || pathLanguage(pathname) || 'de');
  const local = isRouteValid(cleanPath) ? getLocalSeoDescriptor(cleanPath, localLanguage) : null;
  if (local) {
    return {
      title: local.title, description: local.description, canonical: `${BASE_URL}${cleanPath}`,
      hreflangs: [], pageType: parsePath(cleanPath).page,
      h1: local.h1, h2: BRAND, bodyText: local.description,
      ogImage: DEFAULT_OG_IMAGE, ogImageWidth: OG_IMAGE_WIDTH, ogImageHeight: OG_IMAGE_HEIGHT, ogImageType: OG_IMAGE_TYPE,
    };
  }
  if (cleanPath === '/customer-access') {
    const locale = normalizeHomeLanguage(langParam || pathLanguage(pathname) || 'de');
    const title = customerAccessText(locale, 'title');
    const description = customerAccessText(locale, 'personal');
    return {
      title: `${title} · Kraken PFM`, description, canonical: `${BASE_URL}/customer-access`,
      hreflangs: [], pageType: 'customer-access', h1: title, h2: BRAND, bodyText: description,
      ogImage: DEFAULT_OG_IMAGE, ogImageWidth: OG_IMAGE_WIDTH, ogImageHeight: OG_IMAGE_HEIGHT, ogImageType: OG_IMAGE_TYPE,
    };
  }
  if (cleanPath === '/quote' || cleanPath === '/quote-demo') {
    const locale = normalizeHomeLanguage(langParam || pathLanguage(pathname) || 'de');
    const t = (key: string) => bookingText(locale, key);
    const h1 = `${t('titleStart')} ${t('titleAccent')}`;
    const description = t('intro');
    return {
      title: `${cleanPath === '/quote-demo' ? 'Demo · ' : ''}${h1} · Kraken PFM`,
      description, canonical: `${BASE_URL}/quote`, hreflangs: [],
      pageType: cleanPath === '/quote-demo' ? 'calculator-demo' : 'consultation',
      h1, h2: BRAND, bodyText: description, ogImage: DEFAULT_OG_IMAGE,
      ogImageWidth: OG_IMAGE_WIDTH, ogImageHeight: OG_IMAGE_HEIGHT, ogImageType: OG_IMAGE_TYPE,
    };
  }
  if (cleanPath.replace(/\/$/, '') === "/kontakt") {
    const locale = normalizeHomeLanguage(langParam || pathLanguage(pathname) || 'de');
    const title = contactText(locale, 'Kontakt · Kraken PFM in Schaffhausen');
    const description = getContactCopy(locale).meta.description;
    return {
      title, description, canonical: `${BASE_URL}/kontakt`, hreflangs: [], pageType: 'kontakt',
      h1: `${contactText(locale, 'Näher dran.')} ${contactText(locale, 'Persönlich für Sie da.')}`,
      h2: BRAND, bodyText: description,
      ogImage: DEFAULT_OG_IMAGE, ogImageWidth: OG_IMAGE_WIDTH, ogImageHeight: OG_IMAGE_HEIGHT, ogImageType: OG_IMAGE_TYPE,
    };
  }
  if (cleanPath === "/about" || cleanPath === "/ueber-kraken") {
    const locale = normalizeHomeLanguage(langParam || pathLanguage(pathname) || 'de');
    const copy = {
      de: ['Über Kraken & Kai · Persönliche Hilfe für Ihr Zuhause', 'Lernen Sie Kraken PFM, Gründer Antonio Nadre Gomes Mendes und Maskottchen Kai kennen. Persönliche Reinigung und kleine Umzüge ab Schaffhausen für Zürich und Winterthur.', 'Persönlich da. Mit Erfahrung. Für Ihr Zuhause.'],
      en: ['About Kraken & Kai · Personal help for your home', 'Meet Kraken PFM, founder Antonio Nadre Gomes Mendes and mascot Kai. Personal cleaning and small moves from Schaffhausen for Zurich and Winterthur.', 'Personally here. With experience. For your home.'],
      es: ['Sobre Kraken y Kai · Ayuda personal para su hogar', 'Conozca Kraken PFM, a su fundador Antonio Nadre Gomes Mendes y a Kai. Limpieza y pequeñas mudanzas desde Schaffhausen para Zúrich y Winterthur.', 'Atención personal. Con experiencia. Para su hogar.'],
      pt: ['Sobre a Kraken e o Kai · Apoio pessoal para a sua casa', 'Conheça a Kraken PFM, o fundador Antonio Nadre Gomes Mendes e a mascote Kai. Limpeza e pequenas mudanças a partir de Schaffhausen para Zurique e Winterthur.', 'Apoio pessoal. Com experiência. Para a sua casa.'],
      it: ['Kraken e Kai · Un aiuto personale per la sua casa', 'Conosca Kraken PFM, il fondatore Antonio Nadre Gomes Mendes e la mascotte Kai. Pulizie e piccoli traslochi da Sciaffusa per Zurigo e Winterthur.', 'Un aiuto personale. Con esperienza. Per la sua casa.'],
      fr: ['Kraken et Kai · Une aide personnelle pour votre maison', 'Découvrez Kraken PFM, son fondateur Antonio Nadre Gomes Mendes et sa mascotte Kai. Nettoyage et petits déménagements depuis Schaffhouse pour Zurich et Winterthour.', 'À vos côtés. Avec expérience. Pour votre maison.'],
    }[locale];
    return { title: copy[0], description: copy[1], canonical: `${BASE_URL}/about`, hreflangs: [], pageType: 'about', h1: copy[2], h2: BRAND, bodyText: copy[1], ogImage: DEFAULT_OG_IMAGE, ogImageWidth: OG_IMAGE_WIDTH, ogImageHeight: OG_IMAGE_HEIGHT, ogImageType: OG_IMAGE_TYPE };
  }
  if (cleanPath === "/leistungen") {
    const locale = normalizeHomeLanguage(langParam || pathLanguage(pathname) || 'de');
    const copy = {
      de: ['Reinigung & kleine Umzüge in Zürich, Schaffhausen & Winterthur | Kraken', 'Fensterreinigung, Umzugsreinigung, regelmässige Reinigung, Grundreinigung und kleine Umzüge für Privathaushalte in Zürich, Schaffhausen und Winterthur.', 'Reinigung und kleine Umzüge. Passend zu Ihnen.'],
      en: ['Cleaning & small moves in Zurich, Schaffhausen & Winterthur | Kraken', 'Window cleaning, end-of-tenancy cleaning, regular cleaning, deep cleaning and small moves for private households in Zurich, Schaffhausen and Winterthur.', 'Cleaning and small moves. Suited to you.'],
      es: ['Limpieza y pequeñas mudanzas en Zúrich, Schaffhausen y Winterthur | Kraken', 'Limpieza de ventanas, de fin de alquiler, periódica, a fondo y pequeñas mudanzas para hogares particulares en Zúrich, Schaffhausen y Winterthur.', 'Limpieza y pequeñas mudanzas. A su medida.'],
      pt: ['Limpeza e pequenas mudanças em Zurique, Schaffhausen e Winterthur | Kraken', 'Limpeza de janelas, de fim de arrendamento, regular, profunda e pequenas mudanças para casas particulares em Zurique, Schaffhausen e Winterthur.', 'Limpeza e pequenas mudanças. À sua medida.'],
      it: ['Pulizie e piccoli traslochi a Zurigo, Sciaffusa e Winterthur | Kraken', 'Pulizia di finestre, di fine locazione, regolare, a fondo e piccoli traslochi per abitazioni private a Zurigo, Sciaffusa e Winterthur.', 'Pulizie e piccoli traslochi. Su misura per lei.'],
      fr: ['Nettoyage et petits déménagements à Zurich, Schaffhouse et Winterthour | Kraken', 'Nettoyage de vitres, de fin de bail, régulier, en profondeur et petits déménagements pour les particuliers à Zurich, Schaffhouse et Winterthour.', 'Nettoyage et petits déménagements. Selon vos besoins.'],
    }[locale];
    return { title: copy[0], description: copy[1], canonical: `${BASE_URL}/leistungen`, hreflangs: [], pageType: 'approved-services', h1: copy[2], h2: BRAND, bodyText: copy[1], ogImage: DEFAULT_OG_IMAGE, ogImageWidth: OG_IMAGE_WIDTH, ogImageHeight: OG_IMAGE_HEIGHT, ogImageType: OG_IMAGE_TYPE };
  }
  // Home copy shares the same six-language source dictionary as its UI.
  if (cleanPath === "/") {
    const homeLanguage = normalizeHomeLanguage(langParam || pathLanguage(pathname) || 'de');
    const description = homeText(homeLanguage, HOME_METADATA.description);
    return {
      ...HOME_METADATA,
      title: homeText(homeLanguage, HOME_METADATA.title),
      description,
      canonical: `${BASE_URL}/`,
      hreflangs: [],
      pageType: "home",
      h1: homeText(homeLanguage, "Umzugsreinigung Zürich"),
      h2: homeText(homeLanguage, "Reinigung und kleine Umzüge in Zürich, Schaffhausen und Winterthur."),
      bodyText: description,
      ogImage: DEFAULT_OG_IMAGE,
      ogImageWidth: OG_IMAGE_WIDTH,
      ogImageHeight: OG_IMAGE_HEIGHT,
      ogImageType: OG_IMAGE_TYPE,
    };
  }
  const currentLang = normalizeHomeLanguage(langParam || pathLanguage(pathname) || 'de');
  const page = parsePath(cleanPath).page;
  const label = (FALLBACK_LABELS[page] || FALLBACK_LABELS['404'])[FALLBACK_LANGUAGES.indexOf(currentLang)];
  const title = label + ' | Kraken PFM';
  const description = homeText(currentLang, 'Reinigung und kleine Umzüge in Zürich, Schaffhausen und Winterthur.');
  const h1 = title.split("|")[0].trim();
  const h2 = BRAND;
  const bodyText = description;

  // Authoritative canonical URL
  const canonical = `${BASE_URL}${cleanPath}`;

  // Legacy metadata draft; getPageSeo supplies public-language canonicals and alternates.
  const hreflangs: { lang: string; href: string }[] = [];

  return {
    title,
    description,
    canonical,
    hreflangs,
    pageType: page,
    h1,
    h2,
    bodyText,
    ogImage: DEFAULT_OG_IMAGE,
    ogImageWidth: OG_IMAGE_WIDTH,
    ogImageHeight: OG_IMAGE_HEIGHT,
    ogImageType: OG_IMAGE_TYPE,
  };
}

/** Approved copy is shared by SSR, client navigation and the legacy prerender entry point. */
export function getMetadataForPath(pathname: string, langParam?: string): ReturnType<typeof getBaseMetadataForPath> {
  const base = getBaseMetadataForPath(pathname, langParam);
  const locale = normalizeHomeLanguage(langParam || pathLanguage(pathname) || 'de');
  const approved = getApprovedPageMetadata(toLegacyPath(pathname), locale);
  return approved ? { ...base, ...approved, bodyText: approved.description } : base;
}
