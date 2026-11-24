export type FieldErrorKey = 'requiredField' | 'invalidField' | 'invalidEmailField' | 'invalidPostalField' | 'invalidPhoneField' | 'invalidDate';
/** Validation text is chosen by the application locale, never the browser UI language. */
export function fieldErrorKey(id: string, missing: boolean): FieldErrorKey {
  if (missing) return 'requiredField';
  if (id.endsWith('-email')) return 'invalidEmailField';
  if (id.endsWith('-postal')) return 'invalidPostalField';
  if (id.endsWith('-phone')) return 'invalidPhoneField';
  if (id.endsWith('-date') || id.endsWith('-time')) return 'invalidDate';
  return 'invalidField';
}
