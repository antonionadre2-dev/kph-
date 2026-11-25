export const CONTACT_CHANNELS = ['email', 'phone', 'whatsapp'] as const;
export const CONTACT_SERVICES = ['windows', 'end', 'regular', 'deep', 'moving', 'unsure'] as const;
export const CONTACT_LANGUAGES = ['de', 'en', 'es', 'fr', 'it', 'pt'] as const;
export type ContactFields = { name: string; email: string; phone: string; channel: string; service: string; postalCode: string; message: string };
export type ContactField = keyof ContactFields;
export type ContactFieldError = 'required' | 'invalidEmail' | 'invalidPhone' | 'invalidPostcode' | 'invalidMessage' | 'invalidService' | 'invalidChannel';
export const emptyContactFields = (): ContactFields => ({ name: '', email: '', phone: '', channel: 'email', service: 'unsure', postalCode: '', message: '' });
export function normalizeContactFields(input: unknown): ContactFields {
  const value = input && typeof input === 'object' && !Array.isArray(input) ? input as Record<string, unknown> : {};
  return Object.fromEntries(Object.keys(emptyContactFields()).map(key => [key, typeof value[key] === 'string' ? value[key].trim() : ''])) as ContactFields;
}
export function validateContactFields(input: unknown): Partial<Record<ContactField, ContactFieldError>> {
  const value = normalizeContactFields(input), errors: Partial<Record<ContactField, ContactFieldError>> = {};
  if (value.name.length < 2 || value.name.length > 100 || /[\u0000-\u001f\u007f]/.test(value.name)) errors.name = 'required';
  if (value.email.length > 254 || !/^[^\s@<>(),;]+@[^\s@<>(),;]+\.[^\s@<>(),;]+$/.test(value.email)) errors.email = 'invalidEmail';
  if (value.phone && (value.phone.length > 40 || !/^\+?[0-9 ()/.\-]+$/.test(value.phone) || !/^[0-9]{7,15}$/.test(value.phone.replace(/\D/g, '')))) errors.phone = 'invalidPhone';
  if (!(CONTACT_CHANNELS as readonly string[]).includes(value.channel)) errors.channel = 'invalidChannel';
  if (!(CONTACT_SERVICES as readonly string[]).includes(value.service)) errors.service = 'invalidService';
  if (!/^[1-9][0-9]{3}$/.test(value.postalCode)) errors.postalCode = 'invalidPostcode';
  if (value.message.length < 10 || value.message.length > 4000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value.message)) errors.message = 'invalidMessage';
  return errors;
}
export function contactLanguage(value: unknown): string {
  const code = typeof value === 'string' ? value.toLowerCase().split('-')[0] : '';
  return (CONTACT_LANGUAGES as readonly string[]).includes(code) ? code : 'de';
}
export const validContactReference = (value: unknown): value is string => typeof value === 'string' && /^KCT-[A-F0-9]{20}$/.test(value);
export const validContactIdempotencyKey = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
