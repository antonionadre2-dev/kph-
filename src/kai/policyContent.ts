import type { HomeLanguage } from '../../components/home/homeTranslations.ts';
import { TERMS_POLICIES } from '../legal/terms-policy.ts';

/** Generated from the immutable clauses used by /terms and its PDFs. */
export const PUBLIC_POLICY_CONTENT = TERMS_POLICIES;

/** Existing calculator inclusion copy. Locale order matches booking/uiCopy: de, en, es, fr, it, pt. */
export const END_OF_TENANCY_INCLUDED = {
  "de": "Im Pauschalpreis: komplette Küche, 1 Bad, Standardfenster und Böden." + ' ' + PUBLIC_POLICY_CONTENT.de.guaranteeScope,
  "en": "The fixed price includes a full kitchen, 1 bathroom, standard windows and floors." + ' ' + PUBLIC_POLICY_CONTENT.en.guaranteeScope,
  "es": "El precio cerrado incluye cocina completa, 1 baño, ventanas estándar y suelos." + ' ' + PUBLIC_POLICY_CONTENT.es.guaranteeScope,
  "fr": "Le forfait comprend la cuisine complète, 1 salle de bains, les vitres standard et les sols." + ' ' + PUBLIC_POLICY_CONTENT.fr.guaranteeScope,
  "it": "Il prezzo fisso comprende cucina completa, 1 bagno, finestre standard e pavimenti." + ' ' + PUBLIC_POLICY_CONTENT.it.guaranteeScope,
  "pt": "O preço fixo inclui cozinha completa, 1 casa de banho, janelas normais e pavimentos." + ' ' + PUBLIC_POLICY_CONTENT.pt.guaranteeScope
} as const;
export const END_OF_TENANCY_INCLUDED_ROW = [
  END_OF_TENANCY_INCLUDED.de, END_OF_TENANCY_INCLUDED.en, END_OF_TENANCY_INCLUDED.es,
  END_OF_TENANCY_INCLUDED.fr, END_OF_TENANCY_INCLUDED.it, END_OF_TENANCY_INCLUDED.pt,
] as const;
export function publicPolicyContent(language: HomeLanguage) { return PUBLIC_POLICY_CONTENT[language]; }
