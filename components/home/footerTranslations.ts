import { normalizeHomeLanguage } from './homeTranslations';

// Only the new footer copy lives here; the approved homepage copy remains unchanged.
const copy = {
  hours: ['Mo–So · 09:00–19:00', 'Mon–Sun · 09:00–19:00', 'Lun–dom · 09:00–19:00', 'Seg–dom · 09:00–19:00', 'Lun–dom · 09:00–19:00', 'Lun–dim · 09:00–19:00'],
  localTime: ['Ortszeit Zürich', 'Zurich local time', 'Hora de Zúrich', 'Hora de Zurique', 'Ora locale di Zurigo', 'Heure locale de Zurich'],
  visits: ['Besuche nach Vereinbarung', 'Visits by appointment', 'Visitas con cita previa', 'Visitas por marcação', 'Visite su appuntamento', 'Visites sur rendez-vous'],
  allServices: ['Alle Leistungen', 'All services', 'Todos los servicios', 'Todos os serviços', 'Tutti i servizi', 'Toutes les prestations'],
  allAreas: ['Alle Einsatzgebiete', 'All service areas', 'Todas las zonas de servicio', 'Todas as zonas de serviço', 'Tutte le zone servite', 'Toutes les zones desservies'],
  discover: ['Kraken entdecken', 'Discover Kraken', 'Conozca Kraken', 'Conheça a Kraken', 'Scopra Kraken', 'Découvrez Kraken'],
  regions: ['Einsatzgebiete im Footer', 'Service areas in the footer', 'Zonas de servicio del pie de página', 'Zonas de serviço no rodapé', 'Zone servite nel piè di pagina', 'Zones desservies dans le pied de page'],
} as const;
type FooterTextKey=keyof typeof copy;
const languages=['de','en','es','pt','it','fr'] as const;
export function footerText(language: unknown,key: FooterTextKey): string {
  return copy[key][languages.indexOf(normalizeHomeLanguage(language))];
}
