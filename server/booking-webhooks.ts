import crypto from 'node:crypto';
import { Webhook } from 'svix';
import { BookingError } from './booking-store.ts';

export function verifyPayrexxWebhook(raw:unknown,signature:string,secret:string) {
  if(!Buffer.isBuffer(raw))throw new BookingError('RAW_BODY_REQUIRED');
  const expected=crypto.createHmac('sha256',secret).update(raw).digest('hex');
  if(!/^[a-f0-9]{64}$/i.test(signature)||!crypto.timingSafeEqual(Buffer.from(signature.toLowerCase()),Buffer.from(expected)))throw new BookingError('INVALID_SIGNATURE',401);
  try{return JSON.parse(raw.toString('utf8'));}catch{throw new BookingError('INVALID_BODY');}
}
export function verifyResendWebhook(raw:unknown,headers:Record<string,string>,secret:string) {
  if(!Buffer.isBuffer(raw))throw new BookingError('RAW_BODY_REQUIRED');
  if(raw.length>32768)throw new BookingError('BODY_TOO_LARGE',413);
  const id=headers['svix-id'];
  if(!id||id.length>200)throw new BookingError('INVALID_SIGNATURE',401);
  try {
    // Svix verifies the unmodified body, signature and five-minute timestamp
    // tolerance. No option disables its replay-time protection.
    new Webhook(secret).verify(raw.toString('utf8'),headers);
    // Svix v2 verifies bytes without parsing; parse only after verification.
    const event:any=JSON.parse(raw.toString('utf8'));
    if(!event || typeof event.type!=='string')throw new Error();
    return {id,event};
  }catch{throw new BookingError('INVALID_SIGNATURE',401);}
}
