import { normalizeEmailLanguage } from '../../integrations/email-collection/language.mjs';
import { languageFromSearch } from '../locale';
import type { SiteLanguage } from '../locale';

/** Restore a saved communication choice only when navigation has no explicit locale. */
export function communicationLanguageToRestore(saved: unknown, search: string): SiteLanguage | null {
  if (languageFromSearch(search)) return null;
  try { return normalizeEmailLanguage(saved) as SiteLanguage; } catch { return null; }
}

/** A different page language is an opportunity to ask, never an implicit update. */
export function communicationPreferenceDiffers(siteLanguage: unknown, saved: unknown): boolean {
  try { return normalizeEmailLanguage(siteLanguage) !== normalizeEmailLanguage(saved); } catch { return false; }
}
