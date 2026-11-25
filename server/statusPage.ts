import { publicHref } from '../src/routing/site-paths.ts';

const text = {
  de: ['Diese Seite wurde entfernt.', 'Diese Seite wurde nicht gefunden.', 'Reinigung und kleine Umzüge für Ihr Zuhause.', 'Aktuelle Leistungen'],
  en: ['This page has been removed.', 'This page could not be found.', 'Cleaning and small moves for your home.', 'Current services'],
  es: ['Esta página se ha retirado.', 'No se ha encontrado esta página.', 'Limpieza y pequeñas mudanzas para su hogar.', 'Servicios actuales'],
  fr: ['Cette page a été retirée.', 'Cette page est introuvable.', 'Nettoyage et petits déménagements pour votre logement.', 'Prestations actuelles'],
  it: ['Questa pagina è stata rimossa.', 'Questa pagina non è stata trovata.', 'Pulizie e piccoli traslochi per la sua casa.', 'Servizi attuali'],
  pt: ['Esta página foi retirada.', 'Esta página não foi encontrada.', 'Limpeza e pequenas mudanças para a sua casa.', 'Serviços atuais'],
};
export function renderStatusPage(status: 404 | 410, language: string): string {
  const locale = language.split('-')[0] as keyof typeof text;
  const t = text[locale] || text.de;
  const heading = t[status === 410 ? 0 : 1];
  return `<!doctype html><html lang="${locale === 'de' ? 'de-CH' : locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex, follow"><title>${heading} | Kraken PFM</title></head><body><main id="main"><h1>${heading}</h1><p>${t[2]}</p><a href="${publicHref('/leistungen', locale)}">${t[3]}</a></main></body></html>`;
}
