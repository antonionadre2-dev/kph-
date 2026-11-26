import { normalizeEmailLanguage } from '../../integrations/email-collection/language.mjs';
import { pathLanguage } from '../routing/site-paths.ts';
import type { SiteLanguage } from '../locale';

/** Reading a booking is never permission to change the visitor's interface language. */
export function communicationLanguageToRestore(_saved: unknown, _location: string): SiteLanguage | null {
  return null;
}

/** Explicit route/query selection wins; browser language and saved booking language have no role. */
export function bookingRequestLanguage(siteLanguage: unknown, location: string): string {
  try { return normalizeEmailLanguage(pathLanguage(location) || siteLanguage); } catch { return 'de'; }
}

/** A different page language is an opportunity to ask, never an implicit update. */
export function communicationPreferenceDiffers(siteLanguage: unknown, saved: unknown): boolean {
  try { return normalizeEmailLanguage(siteLanguage) !== normalizeEmailLanguage(saved); } catch { return false; }
}
