import type { RequestHandler, Request } from 'express';
import { isStaffIdentity } from '../src/auth/access.ts';
import { BookingError, digest } from './booking-store.ts';
import { operatorMailView } from './booking-mail-safety.ts';

const base='/api/booking/operator/requests';
const idPattern=/^[A-Za-z0-9_-]{1,128}$/;
function bodyOnly(body:any,keys:string[]){
  if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(key=>!keys.includes(key)))throw new BookingError('INVALID_BODY');
}
/** Authorized staff actions share the actual calculator store, never legacy maintenance records. */
export function createBookingOperatorHandler({getRuntime,getAuth,validCapture,clock=Date.now}:{getRuntime:()=>Promise<any>;getAuth:()=>Promise<{verifyIdToken:(token:string,revoked:boolean)=>Promise<any>}>;validCapture:(req:Request,runtime:any)=>boolean;clock?:()=>number}):RequestHandler{
  return async(req,res)=>{
    res.set({'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'});
    try{
      const runtime=await getRuntime();
      if(!runtime.store||!runtime.service)throw new BookingError('BOOKING_NOT_CONFIGURED',503);
      const token=/^Bearer ([A-Za-z0-9_.-]{20,8192})$/.exec(req.get('Authorization')||'')?.[1];
      if(!token)throw new BookingError('UNAUTHORIZED',401);
      const auth=await getAuth();
      const claims=await auth.verifyIdToken(token,true).catch(()=>null);
      if(!claims||!claims.uid)throw new BookingError('UNAUTHORIZED',401);
      if(!isStaffIdentity({email:claims.email,emailVerified:claims.email_verified===true,admin:claims.admin}))throw new BookingError('FORBIDDEN',403);
      const actor=claims.uid;
      if(req.method!=='GET'){
        if(req.get('Origin')!==runtime.origin||!validCapture(req,runtime))throw new BookingError('SESSION_REQUIRED',403);
        if(!req.is('application/json'))throw new BookingError('JSON_REQUIRED',415);
        if(Buffer.byteLength(JSON.stringify(req.body||{}),'utf8')>4096)throw new BookingError('BODY_TOO_LARGE',413);
        if(!await runtime.store.consumeRate(`operator:${actor}`,clock(),3600000,30))throw new BookingError('TOO_MANY_REQUESTS',429);
      }
      const view=(record:any)=>({...runtime.service.view(record),selection:record.selection,revision:record.revision,createdAt:record.createdAt});
      const details=async(id:string)=>{
        const record=await runtime.store.get(id);if(!record)throw new BookingError('BOOKING_NOT_FOUND',404);
        const [jobs,suppressed]=await Promise.all([runtime.store.listMailForBooking(id),runtime.store.isEmailSuppressed(record.customer.email)]);
        return {booking:view(record),emails:jobs.map((job:any)=>operatorMailView(job,record,suppressed)),emailReady:runtime.emailReady,scheduledRemindersReady:await runtime.service.remindersReady()};
      };
      if(req.path===base&&req.method==='GET')return res.json({bookings:(await runtime.store.listForOperator()).map(view),emailReady:runtime.emailReady,paymentReady:runtime.paymentReady,scheduledRemindersReady:await runtime.service.remindersReady()});
      if(req.path===base+'/search'&&req.method==='POST'){
        bodyOnly(req.body,['reference']);
        const reference=typeof req.body.reference==='string'?req.body.reference.trim().toUpperCase():'';
        if(!/^K-\d{4}-[A-Z0-9_-]{8}$/.test(reference))throw new BookingError('INVALID_REFERENCE');
        return res.json({bookings:(await runtime.store.listForOperator(reference)).map(view),emailReady:runtime.emailReady,paymentReady:runtime.paymentReady,scheduledRemindersReady:await runtime.service.remindersReady()});
      }
      const match=new RegExp('^'+base+'/([A-Za-z0-9_-]{1,128})(/(?:confirm|quote/approve|work/settle|payment/extra|cancel|refund|email/retry))?$').exec(req.path);
      if(!match||!idPattern.test(match[1]))throw new BookingError('NOT_FOUND',404);
      const id=match[1];
      if(req.method==='GET'&&!match[2])return res.json(await details(id));
      if(req.method==='POST'&&match[2]==='/confirm'){
        bodyOnly(req.body,['expectedRevision','holdExpiresAt','availabilityChecked','billingPeriod']);
        if(req.body.availabilityChecked!==true)throw new BookingError('AVAILABILITY_REVIEW_REQUIRED');
        if(!Number.isSafeInteger(req.body.expectedRevision)||req.body.expectedRevision<1)throw new BookingError('BOOKING_CHANGED',409);
        if(!runtime.paymentReady)throw new BookingError('PAYMENT_NOT_CONFIGURED',503);
        if(!runtime.emailReady)throw new BookingError('EMAIL_NOT_CONFIGURED',503);
        const saved=await runtime.service.confirmAppointment(id,{expectedRevision:req.body.expectedRevision,holdExpiresAt:req.body.holdExpiresAt,billingPeriod:req.body.billingPeriod,operatorId:actor,notifyPaymentReady:true});
        try{await runtime.service.runDue({jobId:`${id}:payment-ready:${saved.revision}`,limit:1});}catch{/* The durable hold and outbox remain authoritative. */}
        return res.json(await details(id));
      }
      if(req.method==='POST'&&['/quote/approve','/work/settle','/payment/extra','/cancel','/refund'].includes(match[2])){
        const action=match[2],allowed:Record<string,string[]>={
          '/quote/approve':['expectedRevision','totalCents','scopeNotes','scopeLanguage'],
          '/work/settle':['expectedRevision','actualHours'],
          '/payment/extra':['expectedRevision'], '/cancel':['expectedRevision'],
          '/refund':['expectedRevision','amountCents','idempotencyKey'],
        };
        bodyOnly(req.body,allowed[action]);
        if(!Number.isSafeInteger(req.body.expectedRevision)||req.body.expectedRevision<1)throw new BookingError('BOOKING_CHANGED',409);
        if(['/payment/extra','/refund'].includes(action)&&!runtime.paymentReady)throw new BookingError('PAYMENT_NOT_CONFIGURED',503);
        const common={...req.body,operatorId:actor};
        let saved:any;
        if(action==='/quote/approve')saved=await runtime.service.approveManualQuote(id,common);
        if(action==='/work/settle')saved=await runtime.service.settleWork(id,common);
        if(action==='/payment/extra')saved=await runtime.service.createExtraPayment(id,common);
        if(action==='/cancel')saved=await runtime.service.cancel(id,common);
        if(action==='/refund')saved=await runtime.service.refund(id,common);
        const event=saved&&(action==='/quote/approve'?['quote_ready',`${id}:quote:${saved.quoteRevision}`]:action==='/cancel'?['cancellation_confirmed',`${id}:cancelled:${saved.cancelledAt}`]:action==='/refund'?['refund_issued',`${id}:refund:${req.body.idempotencyKey}`]:null);
        if(event&&runtime.emailReady)try{await runtime.service.runDue({jobId:`${id}:${event[0]}:${digest(event[1]).slice(0,24)}`,limit:1});}catch{/* Financial state and the durable exact outbox job remain authoritative. */}
        return res.json(await details(id));
      }
      if(req.method==='POST'&&match[2]==='/email/retry'){
        bodyOnly(req.body,['jobId','expectedAttempts']);
        if(typeof req.body.jobId!=='string'||!/^[A-Za-z0-9:_-]{1,200}$/.test(req.body.jobId)||!Number.isSafeInteger(req.body.expectedAttempts)||req.body.expectedAttempts<1)throw new BookingError('INVALID_BODY');
        if(!runtime.emailReady)throw new BookingError('EMAIL_NOT_CONFIGURED',503);
        const jobId=await runtime.store.requeueFailedMail(id,req.body.jobId,req.body.expectedAttempts,actor,clock());
        try{await runtime.service.runDue({jobId,limit:1});}catch{/* Report the persisted state, never a fabricated delivery. */}
        return res.json(await details(id));
      }
      throw new BookingError('METHOD_NOT_ALLOWED',405);
    }catch(cause){return res.status(cause instanceof BookingError?cause.status:503).json({code:cause instanceof BookingError?cause.code:'BOOKING_OPERATOR_UNAVAILABLE'});}
  };
}
