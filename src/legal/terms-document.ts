import de from './versions/kraken-agb-2026-11-28-v3/de.json' with { type: 'json' };
import en from './versions/kraken-agb-2026-11-28-v3/en.json' with { type: 'json' };
import es from './versions/kraken-agb-2026-11-28-v3/es.json' with { type: 'json' };
import pt from './versions/kraken-agb-2026-11-28-v3/pt.json' with { type: 'json' };
import it from './versions/kraken-agb-2026-11-28-v3/it.json' with { type: 'json' };
import fr from './versions/kraken-agb-2026-11-28-v3/fr.json' with { type: 'json' };

import { CURRENT_TERMS_VERSION } from './terms-version.ts';
export { CURRENT_TERMS_VERSION, TERMS_EFFECTIVE_DATE } from './terms-version.ts';
export const TERMS_LANGUAGES = ['de', 'en', 'es', 'pt', 'it', 'fr'] as const;
export type TermsLanguage = typeof TERMS_LANGUAGES[number];
export type TermsBlock = { type: 'paragraph'; text: string } | { type: 'list'; items: string[] };
export interface TermsSection { number: number; title: string; blocks: TermsBlock[] }
export interface TermsDocument {
  version: string;
  language: TermsLanguage;
  title: string;
  dateLabel: string;
  translationNotice: string;
  sections: TermsSection[];
  contact: string;
}

function freezeDocument<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freezeDocument);
    Object.freeze(value);
  }
  return value;
}

export function termsLanguage(value: unknown): TermsLanguage {
  const code = typeof value === 'string' ? value.trim().toLowerCase().split('-')[0] : 'de';
  return TERMS_LANGUAGES.includes(code as TermsLanguage) ? code as TermsLanguage : 'de';
}

const documents: Record<TermsLanguage, TermsDocument> = freezeDocument({
  de: de as TermsDocument, en: en as TermsDocument, es: es as TermsDocument,
  pt: pt as TermsDocument, it: it as TermsDocument, fr: fr as TermsDocument,
});

/** A version mismatch is never silently replaced by another set of contractual terms. */
export function getTermsDocument(language: string, version: string = CURRENT_TERMS_VERSION): TermsDocument {
  if (version !== CURRENT_TERMS_VERSION) throw new RangeError('Unknown terms version');
  return documents[termsLanguage(language)];
}

export function termsSectionText(section: TermsSection, options: { stripNumbering?: boolean } = {}): string {
  return section.blocks.map(block => block.type === 'paragraph' ?
    (options.stripNumbering ? block.text.replace(/^\d+\.\d+\s+/, '') : block.text) : block.items.join('\n')).join('\n\n');
}

export function termsDocumentText(document: TermsDocument): string {
  return [document.title, document.dateLabel, ...(document.translationNotice ? [document.translationNotice] : []),
    ...document.sections.flatMap(section => [section.title, termsSectionText(section)]), document.contact].join('\n\n');
}

/** Includes lists and unnumbered continuations belonging to the selected subclause. */
export function getTermsClause(language: string, sectionNumber: number, subclause?: number, version: string = CURRENT_TERMS_VERSION): string {
  const section = getTermsDocument(language, version).sections.find(item => item.number === sectionNumber);
  if (!section) throw new RangeError('Unknown terms section');
  if (subclause === undefined) return termsSectionText(section);
  const marker = `${sectionNumber}.${subclause} `;
  const start = section.blocks.findIndex(block => block.type === 'paragraph' && block.text.startsWith(marker));
  if (start < 0) throw new RangeError('Unknown terms subclause');
  let end = start + 1;
  while (end < section.blocks.length && !(section.blocks[end].type === 'paragraph' && /^\d+\.\d+\s/.test((section.blocks[end] as {text:string}).text))) end++;
  return termsSectionText({ ...section, blocks: section.blocks.slice(start, end) });
}
