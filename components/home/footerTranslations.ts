import { normalizeHomeLanguage } from './homeTranslations';
import { businessHoursLabel, businessHoursTimeZoneLabel } from '../../src/config/business-hours.mjs';

// Only the new footer copy lives here; the approved homepage copy remains unchanged.
const copy = {
  hours: ['de', 'en', 'es', 'pt', 'it', 'fr'].map(businessHoursLabel),
  localTime: ['de', 'en', 'es', 'pt', 'it', 'fr'].map(businessHoursTimeZoneLabel),
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
