import copy from './impressum-copy.json' with { type: 'json' };

export const IMPRESSUM_LANGUAGES = ['de', 'en', 'es', 'fr', 'it', 'pt'] as const;
export type ImpressumLanguage = typeof IMPRESSUM_LANGUAGES[number];
export interface ImpressumCommon {
  companyName: string;
  owner: string;
  address: string;
  uid: string;
  uidUrl: string;
  email: string;
  phone: string;
  phoneHref: string;
  updatedAt: string;
}
export interface ImpressumRow { label: string; value: string; kind?: 'email' | 'phone' }
export interface ImpressumSection {
  id: 'company' | 'register' | 'contact' | 'liability' | 'links' | 'copyright' | 'more';
  title: string;
  rows?: ImpressumRow[];
  paragraphs?: string[];
  uidLabel?: string;
  uidLinkText?: string;
  links?: { label: string; path: string }[];
}
export interface ImpressumDocument {
  language: ImpressumLanguage;
  common: ImpressumCommon;
  title: string;
  updatedLabel: string;
  date: string;
  eyebrow: string;
  lead: string;
  nav: { home: string; services: string; about: string; contact: string; calculator: string; language: string; menu: string; skip: string };
  contents: string;
  helpTitle: string;
  helpText: string;
  sections: ImpressumSection[];
  footer: { legal: string; privacy: string; terms: string; credit: string };
  print: string;
  tocToggle: string;
  openMenu: string;
  closeMenu: string;
}

function immutable<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(immutable);
    Object.freeze(value);
  }
  return value;
}

/** Locale is selected only from the six supplied documents; unknown input uses German. */
export function impressumLanguage(value: unknown): ImpressumLanguage {
  const language = typeof value === 'string' ? value.trim().toLowerCase().split('-')[0] : 'de';
  return IMPRESSUM_LANGUAGES.includes(language as ImpressumLanguage) ? language as ImpressumLanguage : 'de';
}

const documents = immutable(Object.fromEntries(IMPRESSUM_LANGUAGES.map(language => [language, {
  language, common: copy.common, ...copy.locales[language],
}])) as unknown as Record<ImpressumLanguage, ImpressumDocument>);

/** Literal supplied copy, shared by client rendering and static HTML generation. */
export function getImpressumDocument(language: unknown): ImpressumDocument {
  return documents[impressumLanguage(language)];
}
