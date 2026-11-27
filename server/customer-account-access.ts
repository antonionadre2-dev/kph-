import { digest } from './booking-store.ts';
import { createCustomerNotification, selectedEmailSnapshot } from './customer-notifications.ts';

/** The queue lifetime is a delivery limit, never an assertion about Firebase's
 * provider-managed sign-in-code lifetime. No action link exists until claimed. */
export function customerAccountAccessJob({draftId,email,language,idempotencyKey,now}:{draftId:string;email:string;language:string;idempotencyKey:string;now:number}) {
  const id=`access:${draftId}:${digest(idempotencyKey)}`;
  return {id,bookingId:null,kind:'customer_access',accessProvider:'firebase',email,status:'queued',dueAt:now,expiresAt:now+15*60000,
    notification:createCustomerNotification({templateId:'magic_link',eventId:id,entityId:draftId,email,languageSnapshot:selectedEmailSnapshot(language),
      renderData:{customer:{},accessType:'firebase_email_link'}})};
}

/** Keep the SDK's signed URL byte-for-byte. Never turn arbitrary URLs into
 * account links, and do not expose provider errors or links in diagnostics. */
export async function firebaseCustomerAccessLink(auth:any,email:string,language:string,origin:string,authDomain:string):Promise<string> {
  try {
    const link=await auth.generateSignInWithEmailLink(email,{url:`${origin}/customer-access?lang=${language}`,handleCodeInApp:true});
    const parsed=new URL(link);
    if(parsed.protocol!=='https:'||parsed.username||parsed.password||![authDomain,new URL(origin).host].includes(parsed.host)||parsed.pathname!=='/__/auth/action')throw new Error();
    return link;
  }catch{throw Object.assign(new Error('EMAIL_PREPARATION_FAILED'),{definitelyNotSent:true});}
}
