import { MUNICIPALITIES } from '../data/locations.ts';
import { normalizeHomeLanguage } from '../../components/home/homeTranslations.ts';
import { localText } from './local-translations.ts';

export const LOCAL_CITIES = [
  { id: 'schaffhausen', municipalitySlug: 'schaffhausen', regionId: 'schaffhausen', name: 'Schaffhausen', regionPath: '/reinigung/kanton-schaffhausen' },
  { id: 'zurich', municipalitySlug: 'zurich', regionId: 'zuerich', name: 'Zürich', regionPath: '/reinigung/region-zuerich' },
  { id: 'winterthur', municipalitySlug: 'winterthur', regionId: 'winterthur', name: 'Winterthur', regionPath: '/reinigung/region-winterthur' },
] as const;

export const LOCAL_SERVICES = [
  {
    id: 'window-cleaning', calculatorService: 'windows', anchor: 'fensterreinigung', title: 'Fensterreinigung',
    description: 'Einzelne Fenster oder die ganze Wohnung: Wir helfen Ihnen, wieder freie Sicht zu bekommen. Unsere Fensterreinigung für Privathaushalte richtet sich auch an kleine Aufträge. Glasflächen, Rahmen und Fensterbänke stimmen wir auf Ihren Bedarf ab. Welche Innen- und Aussenseiten gereinigt werden können, klären wir anhand der Zugänglichkeit.',
    preparation: 'Anzahl, Grösse und Zugänglichkeit der Fenster.',
    metadata: 'Fensterreinigung in {city} für Privathaushalte, auch einzelne Fenster. Glas, Rahmen und Fensterbänke nach Absprache. Umfang und Zugänglichkeit im Rechner planen.',
  },
  {
    id: 'end-of-tenancy', calculatorService: 'end', anchor: 'umzugsreinigung', title: 'Umzugsreinigung',
    description: 'Der Auszug steht an? Wir übernehmen die Endreinigung Ihrer Wohnung mit 1–4 Zimmern und besprechen, was für die Wohnungsabgabe gereinigt werden soll. Küche, Bad, Böden und weitere Bereiche planen wir nach dem vereinbarten Umfang. Anforderungen Ihrer Verwaltung und besondere Verschmutzungen können Sie bei der Anfrage angeben.',
    preparation: 'Zimmerzahl, Zustand und gewünschter Reinigungstermin.',
    metadata: 'Umzugsreinigung in {city} für private Wohnungen mit 1–4 Zimmern. Küche, Bad und Wohnräume nach Absprache. Umfang und Termin im Rechner planen.',
  },
  {
    id: 'daily-cleaning', calculatorService: 'regular', anchor: 'regelmaessige-reinigung', title: 'Regelmässige Reinigung',
    description: 'Ein gepflegtes Zuhause, auch wenn der Alltag voll ist. Unsere regelmässige Wohnungsreinigung entlastet Sie bei wiederkehrenden Aufgaben. Wir besprechen Ihre Prioritäten, die Räume und den gewünschten Rhythmus. Ob Küche, Bad, Böden oder Oberflächen: Sie bestimmen mit, welche Arbeiten Ihnen im Haushalt am meisten helfen.',
    preparation: 'Wohnungsgrösse, gewünschte Häufigkeit und Prioritäten.',
    metadata: 'Regelmässige Reinigung in {city} für Wohnungen mit 1–4 Zimmern. Aufgaben, Rhythmus und Prioritäten nach Absprache. Ihre Unterstützung im Rechner planen.',
  },
  {
    id: 'deep-cleaning', calculatorService: 'deep', anchor: 'grundreinigung', title: 'Grundreinigung',
    description: 'Manchmal braucht Ihr Zuhause mehr Aufmerksamkeit als bei der üblichen Reinigung. Mit einer Grundreinigung gehen wir die vereinbarten Bereiche intensiver an – etwa Küche, Bad oder häufig genutzte Oberflächen. Für einen Frühlingsputz, eine einmalige Auffrischung oder gezielte Unterstützung: Beschreiben Sie uns, was gründlicher gereinigt werden soll.',
    preparation: 'Betroffene Räume, Zustand und gewünschte Schwerpunkte.',
    metadata: 'Grundreinigung in {city} für Ihr Zuhause. Küche, Bad oder ausgewählte Bereiche intensiver reinigen lassen. Schwerpunkte und Umfang im Rechner planen.',
  },
  {
    id: 'moving-furniture', calculatorService: 'moving', anchor: 'kleine-umzuege', title: 'Kleine Umzüge',
    description: 'Sie zügeln mit wenig Hausrat oder möchten einzelne Möbel und Kartons transportieren lassen? Für Ihren Kleinumzug nutzen wir einen Ford Transit. Wir stimmen den Möbeltransport auf Start, Ziel und Zugänge ab. Welcher Arbeitsaufwand und wie viele Fahrten nötig sind, klären wir anhand Ihres Umzugsguts.',
    preparation: 'Start und Ziel, Möbel, Stockwerke, Lift und Parkmöglichkeiten.',
    metadata: 'Kleine Umzüge in {city} mit Ford Transit für einzelne Möbel und Kartons. Start, Ziel, Zugänge und Umzugsgut gemeinsam planen. Anfrage im Rechner starten.',
  },
] as const;

export type LocalSeoRoute =
  | { kind: 'coverage' }
  | { kind: 'region'; regionId: string }
  | { kind: 'municipality'; municipalitySlug: string }
  | { kind: 'service'; cityId: string; serviceId: string };

export const getLocalCity = (value: string) => LOCAL_CITIES.find(city =>
  city.id === value || city.municipalitySlug === value || city.regionId === value);
export const getLocalService = (value: string) => LOCAL_SERVICES.find(service => service.id === value);

/** Existing routes only: no generated municipality × service URL expansion. */
export function resolveLocalSeoRoute(pathname: string): LocalSeoRoute | null {
  const path = pathname.split(/[?#]/)[0].replace(/\/$/, '') || '/';
  if (path === '/einsatzgebiete') return { kind: 'coverage' };
  const cityForRegion = LOCAL_CITIES.find(city => city.regionPath === path);
  if (cityForRegion) return { kind: 'region', regionId: cityForRegion.regionId };
  const service = path.match(/^\/(?:services|seo|dienstleistungen)\/([^/]+)\/([^/]+)$/i);
  if (service) return { kind: 'service', cityId: service[1] === 'zuerich' ? 'zurich' : service[1], serviceId: service[2] };
  const municipality = path.match(/^\/reinigung\/([^/]+)$/i);
  if (municipality && MUNICIPALITIES.some(item => item.slug === municipality[1])) {
    return { kind: 'municipality', municipalitySlug: municipality[1] };
  }
  return null;
}

export function getLocalRoutePlace(route: LocalSeoRoute): { city?: typeof LOCAL_CITIES[number]; name: string } {
  if (route.kind === 'coverage') return { name: '' };
  const placeId = route.kind === 'municipality' ? route.municipalitySlug : route.kind === 'region' ? route.regionId : route.cityId;
  const city = getLocalCity(placeId);
  if (city) return { city, name: city.name };
  const slug = placeId === 'neuhausen' ? 'neuhausen-am-rheinfall' : placeId;
  return { name: MUNICIPALITIES.find(municipality => municipality.slug === slug)?.name || placeId };
}

export function localHref(path: string, language: string): string {
  const [pathname, fragment] = path.split('#');
  return `${pathname}${pathname.includes('?') ? '&' : '?'}lang=${normalizeHomeLanguage(language)}${fragment ? '#' + fragment : ''}`;
}

export const LOCAL_SCOPE = 'Persönliche Hilfe für Privathaushalte in Zürich, Schaffhausen und Winterthur. Von einzelnen Fenstern bis zur Wohnung mit 1–4 Zimmern.';
export const LOCAL_ADDRESS_CONFIRMATION = 'Diese Ortsseite bestätigt keinen verfügbaren Termin. Teilen Sie uns Adresse, Aufgabe und Wunschdatum mit, damit wir prüfen können, ob Ihr Auftrag in unsere Planung passt.';

/** Shared by HTTP metadata and the visible React body; deliberately contains no numeric prices. */
export function getLocalSeoDescriptor(pathname: string, language: string = 'de') {
  const route = resolveLocalSeoRoute(pathname);
  if (!route) return null;
  const t = (source: string) => localText(language, source);
  const { city, name } = getLocalRoutePlace(route);
  const service = route.kind === 'service' ? getLocalService(route.serviceId) : undefined;
  const indexable = route.kind === 'coverage' || route.kind === 'region' || (route.kind === 'service' && !!city && !!service);
  const h1 = route.kind === 'coverage'
    ? t('Einsatzgebiete')
    : route.kind === 'service' && city && service
      ? `${t(service.title)} · ${name}`
      : route.kind === 'region'
        ? `${t('Reinigung und kleine Umzüge')} · ${name}`
        : `${t('Anfrage für Ihre Adresse')} · ${name}`;
  const descriptionSource = city && service ? service.metadata
    : route.kind === 'coverage' ? 'Reinigung und kleine Umzüge für Privathaushalte in Zürich, Schaffhausen und Winterthur. Fünf Leistungen für Ihr Zuhause, auch Wohnungen mit 1–4 Zimmern. Persönlich planen.'
      : route.kind === 'region' ? 'Reinigung und kleine Umzüge in {city} für Privathaushalte. Fenster, Umzugsreinigung, regelmässige Reinigung und Grundreinigung. Auftrag im Rechner planen.'
        : 'Reinigung oder kleinen Umzug für Ihre Adresse in {city} anfragen. Senden Sie Aufgabe und Wunschdatum; Verfügbarkeit und Umfang werden persönlich geprüft.';
  const description = t(descriptionSource).replace('{city}', name);
  return { title: `${h1} | Kraken PFM`, h1, description, indexable, route };
}
