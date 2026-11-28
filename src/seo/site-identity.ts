import { BUSINESS_HOURS } from '../config/business-hours.mjs';
/** Business details already published in the approved contact page and imprint. */
export const SITE_IDENTITY = {
  name: 'Kraken Properties and Facilities Management Gomes Mendes',
  shortName: 'Kraken PFM',
  origin: 'https://krakenpfm.ch',
  email: 'kai@krakenpfm.ch',
  telephone: '+41774505705',
  address: {
    streetAddress: 'Seewadelstrasse 3',
    postalCode: '8203',
    addressLocality: 'Schaffhausen',
    addressRegion: 'SH',
    addressCountry: 'CH',
  },
  openingHours: { opens: BUSINESS_HOURS.opens, closes: BUSINESS_HOURS.closes },
  // Official Swiss building address register 102196962, checked 25 November 2026.
  // https://api3.geo.admin.ch/rest/services/ech/MapServer/ch.swisstopo.amtliches-gebaeudeadressverzeichnis/102196962?sr=4326&geometryFormat=geojson
  geo: { latitude: 47.699447, longitude: 8.655662 },
  logoPath: '/home-approved/assets/logo.webp',
  imagePath: '/home-approved/assets/hero-room-day-v4.webp',
  areas: ['Zürich', 'Schaffhausen', 'Winterthur'],
} as const;

export const CORE_SERVICE_CATALOG = [
  { slug: 'window-cleaning', name: 'Fensterreinigung', anchor: 'fensterreinigung' },
  { slug: 'end-of-tenancy', name: 'Umzugsreinigung', anchor: 'umzugsreinigung' },
  { slug: 'daily-cleaning', name: 'Regelmässige Reinigung', anchor: 'regelmaessige-reinigung' },
  { slug: 'deep-cleaning', name: 'Grundreinigung', anchor: 'grundreinigung' },
  { slug: 'post-construction', name: 'Baureinigung', anchor: 'baureinigung' },
  { slug: 'moving-furniture', name: 'Kleine Umzüge', anchor: 'kleine-umzuege' },
] as const;
