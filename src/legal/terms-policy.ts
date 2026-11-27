import generated from './terms-policy.generated.json' with { type: 'json' };

export interface TermsPolicy {
  deposit: string;
  payment: string;
  cancellation: string;
  rescheduling: string;
  guaranteeScope: string;
  guarantee: string;
  preparation: string;
  materials: string;
  insurance: string;
  team: string;
}

type PolicyLanguage = keyof typeof generated.policies;
export const TERMS_POLICY_VERSION = generated.version;
export const TERMS_POLICY_SOURCE_HASHES = Object.freeze(generated.sources);
export const TERMS_POLICIES: Readonly<Record<PolicyLanguage, Readonly<TermsPolicy>>> = Object.freeze(
  Object.fromEntries(Object.entries(generated.policies).map(([language, policy]) => [language, Object.freeze(policy)])),
) as Readonly<Record<PolicyLanguage, Readonly<TermsPolicy>>>;

/** This entry point deliberately imports only selected legal clauses, never the full documents. */
export function getTermsPolicy(language: unknown): Readonly<TermsPolicy> {
  const code = typeof language === 'string' ? language.trim().toLowerCase().split('-')[0] : 'de';
  return TERMS_POLICIES[Object.prototype.hasOwnProperty.call(TERMS_POLICIES, code) ? code as PolicyLanguage : 'de'];
}
