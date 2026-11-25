import { getContactCopy } from '../src/contact/contact-copy.ts';
import { publicHref } from '../src/routing/site-paths.ts';
import type { ContactRecord } from './contact-intake-store.ts';
const escape = (value: string) => value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]!));
/** Kraken's current palette, sender and selected language; no invented conversation route. */
export function renderContactAcknowledgement(record: ContactRecord, from: string): Record<string, unknown> {
  const copy = getContactCopy(record.language), t = copy.form;
  const contactUrl = 'https://krakenpfm.ch' + publicHref('/kontakt', record.language);
  const privacyUrl = 'https://krakenpfm.ch' + publicHref('/gdpr', record.language);
  const text = ['Kraken PFM', t.successTitle, t.successReference + ': ' + record.reference, t.successMessage, copy.hero.hours,
    '+41 77 450 57 05 · kai@krakenpfm.ch', contactUrl, t.privacyLink + ': ' + privacyUrl].join('\n\n');
  return { from, to: record.email, replyTo: 'kai@krakenpfm.ch', idempotencyKey: 'kraken-contact:' + record.id, subject: 'Kraken · ' + t.successTitle,
    text, headers: { 'Content-Language': record.language },
    html: `<!doctype html><html lang="${escape(record.language)}"><body style="margin:0;background:#f3f8fc;color:#062d52;font:16px Arial,sans-serif"><table role="presentation" width="100%"><tr><td style="padding:24px"><table role="presentation" width="100%" style="max-width:620px;margin:auto;background:white;border-radius:20px"><tr><td style="padding:30px"><img src="https://krakenpfm.ch/kraken-emails/assets/kraken-logo.png" alt="Kraken" width="140" style="display:block;width:140px;max-width:100%;height:auto;border:0"><p style="font-size:12px;line-height:1.5">Properties &amp; Facilities Management</p><h1>${escape(t.successTitle)}</h1><p>${escape(t.successReference)}: <strong>${escape(record.reference)}</strong></p><p>${escape(t.successMessage)}</p><p><a href="${contactUrl}" style="display:inline-block;background:#b7f3d7;color:#062d52;padding:14px 20px;border-radius:12px">${escape(t.directContact)}</a></p><p>${escape(copy.hero.hours)}<br>Kraken PFM · Seewadelstrasse 3, 8203 Schaffhausen<br><a href="tel:+41774505705">+41 77 450 57 05</a> · <a href="mailto:kai@krakenpfm.ch">kai@krakenpfm.ch</a></p><p><a href="${privacyUrl}">${escape(t.privacyLink)}</a></p></td></tr></table></td></tr></table></body></html>` };
}
