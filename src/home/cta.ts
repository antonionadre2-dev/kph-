import { homeText, normalizeHomeLanguage } from '../../components/home/homeTranslations';

/** One calculator action catalogue shared by regional and service articles. */
export function calculatorCta(language: unknown, service?: string): string {
  const end = ['end', 'moveout', 'endOfTenancy', 'end-of-tenancy'].includes(service || '');
  return homeText(normalizeHomeLanguage(language), end ? 'Umzugsreinigung berechnen' : 'Offerte berechnen');
}
