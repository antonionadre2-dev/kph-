import { normalizeContactLanguage, type ContactLanguage } from './contact-copy.ts';

/** Owner confirmation is pending. Empty values must render no promise or reserved space. */
export const CONTACT_SETTINGS: { responseTime: Partial<Record<ContactLanguage, string>>; ownerPhoto: { src: string } | null } = {
  responseTime: {},
  // Set only after the owner supplies an approved real photograph.
  ownerPhoto: null,
};

export function getContactResponseTime(language: unknown): string {
  return CONTACT_SETTINGS.responseTime[normalizeContactLanguage(language)]?.trim() || '';
}
