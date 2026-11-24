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
  openingHours: { opens: '09:00', closes: '19:00' },
  logoPath: '/home-approved/assets/logo.webp',
  imagePath: '/home-approved/assets/hero-room-day-v4.webp',
  areas: ['Zürich', 'Schaffhausen', 'Winterthur'],
} as const;

export const CORE_SERVICE_CATALOG = [
  { slug: 'window-cleaning', name: 'Fensterreinigung', anchor: 'fensterreinigung' },
  { slug: 'end-of-tenancy', name: 'Umzugsreinigung', anchor: 'umzugsreinigung' },
  { slug: 'daily-cleaning', name: 'Regelmässige Reinigung', anchor: 'regelmaessige-reinigung' },
  { slug: 'deep-cleaning', name: 'Grundreinigung', anchor: 'grundreinigung' },
  { slug: 'moving-furniture', name: 'Kleine Umzüge', anchor: 'kleine-umzuege' },
] as const;
