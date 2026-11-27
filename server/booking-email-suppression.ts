import { BookingError } from './booking-store.ts';

const suppressionEvents=new Set(['email.bounced','email.complained','email.suppressed']);
const domainPattern=/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

/** Resend preserves the display name in data.from. Accept one mailbox only. */
export function senderMailbox(value:unknown):string|null {
  if(typeof value!=='string'||value.length>512||/[\r\n]/.test(value))return null;
  const trimmed=value.trim();
  const address=trimmed.includes('<')||trimmed.includes('>')?/^[^<>]*<([^<>]+)>$/.exec(trimmed)?.[1]?.trim():trimmed;
  if(!address||!/^[-a-zA-Z0-9.!#$%&'*+/=?^_`{|}~]+@[a-zA-Z0-9.-]+$/.test(address))return null;
  const [local,domain]=address.split('@');
  if(local.length>64||local.startsWith('.')||local.endsWith('.')||local.includes('..')||!domainPattern.test(domain.toLowerCase()))return null;
  return `${local.toLowerCase()}@${domain.toLowerCase()}`;
}

/** No implicit account-wide subscription: the sender domain must be explicit. */
export function suppressionScope(env:NodeJS.ProcessEnv):string|null {
  const domain=env.RESEND_WEBHOOK_SENDER_DOMAIN?.trim().toLowerCase();
  const sender=senderMailbox(env.BOOKING_EMAIL_FROM);
  return domain&&domainPattern.test(domain)&&sender?.split('@')[1]===domain?domain:null;
}

/** Called only after Svix verification of the original bytes. Foreign domains
 * are acknowledged before their recipients or event IDs touch Kraken storage. */
export async function applyVerifiedSuppression({event,id,fingerprint,domain,store,recovery,now}:{event:any;id:string;fingerprint:string;domain:string;store:any;recovery?:any;now:number}) {
  if(!suppressionEvents.has(event.type))return {received:true,ignored:true};
  const sender=senderMailbox(event.data?.from);
  if(!sender)throw new BookingError('INVALID_EMAIL_EVENT');
  if(sender.split('@')[1]!==domain)return {received:true,ignored:true};
  const recipients=event.data?.to;
  if(!Array.isArray(recipients)||recipients.length!==1||typeof recipients[0]!=='string'||recipients[0].length>254||!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(recipients[0]))throw new BookingError('INVALID_EMAIL_EVENT');
  if(await store.emailEventProcessed(id,fingerprint))return {received:true};
  const email=recipients[0].trim().toLowerCase(),reason=event.type==='email.complained'?'complaint':'bounced';
  // Both mutations are idempotent. Complete only after both, so a partial
  // failure can retry without losing either suppression.
  await store.suppressEmail(email,reason,now);
  if(recovery)await recovery.suppressEmail(email,reason);
  await store.finishEmailEvent(id,fingerprint,now);
  return {received:true};
}
