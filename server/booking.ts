import crypto from 'node:crypto';
import type { Request, Response, RequestHandler } from 'express';
import { calculatePrice, defaultSelection, PRICING_VERSION } from '../src/booking/pricing.ts';
import { createFirestoreBookingStore, BookingError, digest, type BookingStore } from './booking-store.ts';
import { createPayrexxAdapter } from './booking-payrexx.ts';
import { createResendEmailAdapter, renderBookingEmail } from './booking-email.ts';
import { verifyPayrexxWebhook, verifyResendWebhook } from './booking-webhooks.ts';
import { createRecoveryService } from '../integrations/recovery/service.mjs';
import { createRecoveryHandler } from '../integrations/recovery/http.mjs';
import { createFirestoreRecoveryStore } from '../integrations/recovery/firestore-store.mjs';
import { bookingAppointmentStart, bookingEmailLinks, collectionConfiguration, createCustomerNotification, notificationForBooking, prepareCustomerEnvelope, selectedEmailSnapshot } from './customer-notifications.ts';
import { languageForBackgroundEmail, normalizeEmailLanguage } from '../integrations/email-collection/index.mjs';
import type { PaymentEmailScheduler } from './booking-lifecycle.ts';
import { runPayrexxConnectionCheckOnce } from './payrexx-connection-check.ts';
import firebaseConfig from '../firebase-applet-config.json' with {type:'json'};

export const BOOKING_TERMS_VERSION='kraken-2026-11-24';
export const DEPOSIT_PERCENT=15;
const languages=['de','en','es','fr','it','pt'];
const safeId=/^[A-Za-z0-9_-]{1,128}$/;
const timingEqual=(a:string,b:string)=>a.length===b.length && crypto.timingSafeEqual(Buffer.from(a),Buffer.from(b));
const canonical=(input:any):string=>JSON.stringify(input && typeof input==='object' ? Array.isArray(input)?input.map(value=>JSON.parse(canonical(value))):Object.fromEntries(Object.keys(input).sort().map(key=>[key,JSON.parse(canonical(input[key]))])):input);
const bearer=(req:Request)=>/^Bearer ([A-Za-z0-9_.-]{20,4096})$/.exec(req.get('Authorization')||'')?.[1]||'';
const privateResponse=(res:Response)=>{res.set({'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'});};
const validEmail=(value:unknown)=>typeof value==='string' && value.length<=254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const string=(value:unknown,max:number,code:string,min=1)=>{if(typeof value!=='string' || value.trim().length<min || value.length>max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value))throw new BookingError(code);return value.trim();};
const language=(value:unknown)=>{try{return normalizeEmailLanguage(value);}catch{throw new BookingError('INVALID_LANGUAGE');}};

/** Validates the actual Zurich wall-clock instant, including calendar and CET/CEST. */
export function validateAppointment(date:any,time:any,now=Date.now()) {
  if(typeof date!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(date))throw new BookingError('INVALID_DATE');
  if(typeof time!=='string' || !/^(?:09|1[0-8]):(?:00|15|30|45)$|^19:00$/.test(time))throw new BookingError('INVALID_TIME');
  const utc=Date.parse(`${date}T${time}:00Z`);
  if(!Number.isFinite(utc) || new Date(utc).toISOString().slice(0,10)!==date)throw new BookingError('INVALID_DATE');
  const formatter=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Zurich',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});
  const instant=[utc-3600000,utc-7200000].find(value=>formatter.format(value).replace(',','')===`${date} ${time}`);
  if(instant===undefined)throw new BookingError('INVALID_DATE_TIME');
  if(instant<=now || instant>now+366*86400000)throw new BookingError('DATE_OUT_OF_RANGE');
  return instant;
}
export function validateBookingRequest(input:any,now=Date.now()) {
  if(!input || typeof input!=='object' || Array.isArray(input))throw new BookingError('INVALID_BODY');
  const selection=input.selection;
  let quote:any;
  try {
    if(!selection || JSON.stringify(selection).length>8192)throw new Error();
    const allowed=Object.keys(defaultSelection(selection.service));
    if(selection.service==='moving')allowed.push('details');
    if(Object.keys(selection).some(key=>!allowed.includes(key)))throw new Error();
    if(selection.details!==undefined)string(selection.details,3000,'INVALID_SELECTION',0);
    quote=calculatePrice(selection);
  } catch {throw new BookingError('INVALID_SELECTION');}
  if(input.pricingVersion!==PRICING_VERSION || input.acceptedTotalCents!==quote.totalCents)throw new BookingError('PRICE_CHANGED',409);
  if(input.termsAccepted!==true || input.termsVersion!==BOOKING_TERMS_VERSION)throw new BookingError('TERMS_REQUIRED');
  const customer=input.customer;
  if(!customer || typeof customer!=='object')throw new BookingError('INVALID_NAME');
  const name=string(customer.name,120,'INVALID_NAME',2);
  if(!validEmail(customer.email))throw new BookingError('INVALID_EMAIL');
  const phone=string(customer.phone,40,'INVALID_PHONE',7);
  if(!/^\+?[0-9 ()-]{7,40}$/.test(phone))throw new BookingError('INVALID_PHONE');
  const address=string(customer.address,200,'INVALID_ADDRESS',3);
  if(typeof customer.postalCode!=='string' || !/^\d{4}$/.test(customer.postalCode))throw new BookingError('INVALID_POSTAL_CODE');
  const city=string(customer.city,100,'INVALID_CITY',2);
  validateAppointment(input.requestedDate,input.requestedTime,now);
  const idempotencyKey=string(input.idempotencyKey,128,'INVALID_IDEMPOTENCY_KEY',16);
  if(!/^[A-Za-z0-9_-]+$/.test(idempotencyKey))throw new BookingError('INVALID_IDEMPOTENCY_KEY');
  return {selection,quote,customer:{name,email:customer.email.trim().toLowerCase(),phone,address,postalCode:customer.postalCode,city},requestedDate:input.requestedDate,requestedTime:input.requestedTime,language:language(input.language),notes:string(input.notes??'',4000,'INVALID_NOTES',0),idempotencyKey,recovery:input.recovery};
}

export function createBookingService({store,tokenSecret,origin,mode='unconfigured',payment=null,sendEmail=null,sender='',clock=Date.now,recovery=null,emailCollectionEnabled=false,paymentNotificationsEnabled=false}: {store:BookingStore;tokenSecret:string;origin:string;mode?:string;payment?:any;sendEmail?:any;sender?:string;clock?:()=>number;recovery?:any;emailCollectionEnabled?:boolean;paymentNotificationsEnabled?:boolean}) {
  const token=(id:string)=>crypto.createHmac('sha256',tokenSecret).update(`booking:${id}`).digest('base64url');
  let recoveryService=recovery;
  const canCheckout=(record:any)=>Boolean(payment && ['confirmed','held'].includes(record.scheduling.status) && Date.parse(record.scheduling.holdExpiresAt)>clock() && record.quote.totalCents>0 && !record.quote.manualReviewReasons.length && !['paid','test_paid','refunded','partially_refunded','chargeback','disputed','reconciliation_required'].includes(record.payment.status) && !['cancelled','expired','completed'].includes(record.status));
  const view=(record:any,includeToken=false)=>({bookingId:record.bookingId,reference:record.reference,...(includeToken?{publicToken:token(record.bookingId)}:{}),status:record.status,language:record.language,languageSnapshot:record.languageSnapshot,quote:record.quote,quoteRevision:record.quoteRevision,canCheckout:canCheckout(record),customer:record.customer,notes:record.notes,scopeNotes:record.scopeNotes,termsVersion:record.termsVersion,scheduling:record.scheduling,payment:record.payment,email:record.email});
  async function authenticated(id:string,access:string) {if(!safeId.test(id)||!timingEqual(access,token(id)))throw new BookingError('BOOKING_NOT_FOUND',404);const record=await store.get(id);if(!record || record.tokenRevoked)throw new BookingError('BOOKING_NOT_FOUND',404);return record;}
  function mailJob(record:any,kind:string,templateId:string,eventId:string,id?:string,extra:any={}) {
    let notification,notificationError;
    try{notification=notificationForBooking(record,templateId,eventId,extra);}catch{notificationError='EMAIL_SNAPSHOT_REVIEW_REQUIRED';}
    return {id:id||`${record.bookingId}:${templateId}:${digest(eventId).slice(0,24)}`,bookingId:record.bookingId,kind,status:'queued',dueAt:clock(),...(notification?{notification}:{notification:null,notificationError})};
  }
  function eligibleNotification(record:any,job:any) {
    if(job.kind==='customer_access')return job.expiresAt>clock();
    if(!record)return false;
    if(job.kind==='receipt')return ['paid','test_paid'].includes(record.payment.status);
    if(job.kind!=='notification')return true;
    const template=job.notification?.templateId;
    if(['booking_confirmed','appointment_reminder'].includes(template)){
      if(record.scheduling.status!=='confirmed'||['cancelled','expired','completed'].includes(record.status)||['refunded','partially_refunded','chargeback','disputed','reconciliation_required'].includes(record.payment.status))return false;
      try{if(bookingAppointmentStart(record)!==job.notification.renderData.appointment?.start)return false;}catch{return false;}
    }
    if(template==='payment_pending'&&record.payment.status!=='pending')return false;
    if(template==='payment_failed'&&record.payment.status!=='failed')return false;
    if(template==='payment_requested'&&(!canCheckout(record)||record.checkout?.expiresAt<=clock()))return false;
    if(template==='appointment_reminder'&&Date.parse(job.notification?.renderData?.appointment?.start||'')<=clock())return false;
    return true;
  }
  const service={
    token,view,authenticated,canCheckout,
    setRecovery(value:any){recoveryService=value;},
    async create(input:any) {
      const value=validateBookingRequest(input,clock());
      // Validate a linked recovery capability before creating the booking.
      if(value.recovery) {
        if(!recoveryService)throw new BookingError('RECOVERY_UNAVAILABLE',503);
        const draft=await recoveryService.read(value.recovery.id,value.recovery.accessToken);
        if(draft.email!==value.customer.email)throw new BookingError('RECOVERY_EMAIL_MISMATCH',409);
        if(draft.bookingId)return view(await authenticated(draft.resumeBooking.bookingId,draft.resumeBooking.publicToken),true);
      }
      const id=crypto.randomBytes(18).toString('base64url'), total=value.quote.totalCents;
      const now=clock();
      const record={bookingId:id,reference:`K-${new Date(now).getUTCFullYear()}-${id.slice(0,8).toUpperCase()}`,status:'awaiting_confirmation',mode,createdAt:now,revision:1,selection:value.selection,quote:value.quote,quoteRevision:1,customer:value.customer,notes:value.notes,language:value.language,languageSnapshot:selectedEmailSnapshot(value.language),termsVersion:BOOKING_TERMS_VERSION,termsAcceptedAt:now,scheduling:{status:'requested',date:value.requestedDate,time:value.requestedTime,timeZone:'Europe/Zurich'},payment:{status:'not_started',depositPercent:DEPOSIT_PERCENT,amountDueNowCents:total===null?0:Math.round(total*DEPOSIT_PERCENT/100),amountPaidCents:0,remainingBalanceCents:total??0},email:{request:'queued'},...(value.recovery?{recoveryId:value.recovery.id}:{})};
      const fingerprint=digest(canonical({...value,recovery:value.recovery||null}));
      const saved=await store.create(value.idempotencyKey,fingerprint,record,mailJob(record,'request','request_received',`${id}:requested:1`,`${id}:request:1`));
      if(value.recovery)await recoveryService.linkBooking({...value.recovery,email:value.customer.email,bookingId:saved.bookingId});
      return view(saved,true);
    },
    async read(id:string,access:string) {
      let record=await authenticated(id,access);
      if(record.checkout?.gatewayId && !['refunded','chargeback','disputed','reconciliation_required'].includes(record.payment.status) && clock()-(record.lastVerifiedAt||0)>=2500) {
        try {record=await service.reconcile(id);}catch{/* A provider outage never becomes a successful payment. */}
      }
      return view(record);
    },
    async checkout(id:string,access:string,input:any) {
      await authenticated(id,access);
      if(!payment)throw new BookingError('PAYMENT_NOT_CONFIGURED',503);
      if(input?.termsAccepted!==true || input.termsVersion!==BOOKING_TERMS_VERSION)throw new BookingError('TERMS_REQUIRED');
      const presentationLanguage=language(input.language); // Checkout presentation never changes the saved communication preference.
      const claimed=await store.mutate(id,current=>{
        if(input.acceptedQuoteRevision!==current.quoteRevision)throw new BookingError('PRICE_CHANGED',409);
        if(!['live','test'].includes(mode)||current.mode!==mode)throw new BookingError('PAYMENT_MODE_CHANGED',409);
        if(!canCheckout(current))throw new BookingError('CHECKOUT_NOT_AVAILABLE',409);
        if(current.checkout?.link && current.checkout.expiresAt>clock())return current;
        // A timed-out/unknown POST must be reconciled by an operator, never retried into a second charge.
        if(current.checkout && ['creating','unknown'].includes(current.checkout.status))throw new BookingError('PAYMENT_RECONCILIATION_REQUIRED',409);
        if(current.checkout?.expiresAt<=clock())throw new BookingError('CHECKOUT_EXPIRED',409);
        const expiresAt=Math.min(Date.parse(current.scheduling.holdExpiresAt),clock()+30*60000);
        return {...current,checkout:{status:'creating',reference:`${id}-r${current.quoteRevision}`,expiresAt,createdAt:clock()},revision:current.revision+1};
      });
      if(claimed.checkout.link)return {link:claimed.checkout.link};
      try {
        const gateway=await payment.create(claimed,token(id),Math.max(1,Math.floor((claimed.checkout.expiresAt-clock())/60000)),presentationLanguage);
        await store.mutateWithMail(id,current=>({...current,checkout:{...current.checkout,gatewayId:gateway.id,link:gateway.link,status:'created'},payment:{...current.payment,status:'pending',checkoutExpiresAt:new Date(current.checkout.expiresAt).toISOString()}}),record=>emailCollectionEnabled?mailJob(record,'notification','payment_requested',`${id}:gateway:${gateway.id}`):null);
        if(emailCollectionEnabled)try{await service.runDue({jobId:`${id}:payment_requested:${digest(`${id}:gateway:${gateway.id}`).slice(0,24)}`,limit:1});}catch{console.warn('[booking:email-dispatch]',{phase:'payment-request'});}
        return {link:gateway.link};
      } catch {
        await store.mutate(id,current=>({...current,checkout:{...current.checkout,status:'unknown'}}));
        throw new BookingError('PAYMENT_RECONCILIATION_REQUIRED',503);
      }
    },
    async reconcile(id:string,{scheduleEmails}:{scheduleEmails?:PaymentEmailScheduler}={}) {
      const current=await store.get(id);if(!current?.checkout?.gatewayId || !payment)throw new BookingError('PAYMENT_NOT_STARTED',409);
      let verified:any;
      try {verified=await payment.verify(current);}catch(cause){if(cause instanceof BookingError && cause.status===409)await store.mutate(id,record=>({...record,payment:{...record.payment,status:'reconciliation_required'},revision:record.revision+1}));throw cause;}
      const next=await store.mutateWithMail(id,record=>{
        if(record.checkout.reference!==current.checkout.reference)throw new BookingError('PAYMENT_MISMATCH',409);
        // A stale waiting notification cannot undo a completed payment.
        const previous=record.payment.status;
        const terminal=['refunded','partially_refunded','chargeback','disputed','reconciliation_required'];
        const status=(terminal.includes(previous)&&!terminal.includes(verified.status))||(['paid','test_paid'].includes(previous)&&['pending','failed','cancelled','expired'].includes(verified.status))?previous:verified.status;
        const paid=['paid','test_paid'].includes(status);
        const amount=paid?record.payment.amountDueNowCents:record.payment.amountPaidCents;
        return {...record,lastVerifiedAt:clock(),revision:record.payment.status===status?record.revision:record.revision+1,payment:{...record.payment,status,transactionId:verified.transactionId,amountPaidCents:amount,remainingBalanceCents:Math.max(0,(record.quote.totalCents||0)-amount)},...(paid?{scheduling:{...record.scheduling,status:'confirmed'},email:{...record.email,...(!emailCollectionEnabled||paymentNotificationsEnabled?{receipt:record.email.receipt||'queued'}:{})}}:{})};
      },record=>{
        if(['paid','test_paid'].includes(record.payment.status)){
          const jobs=(!emailCollectionEnabled||paymentNotificationsEnabled)?[mailJob(record,'receipt',record.payment.remainingBalanceCents>0?'deposit_received':'payment_received',`${id}:settled:${record.checkout.reference}`,`${id}:receipt:${record.checkout.reference}`)]:[];
          if(emailCollectionEnabled){
            jobs.push(mailJob(record,'notification','booking_confirmed',`${id}:appointment:${record.checkout.reference}`));
            const reminder=mailJob(record,'notification','appointment_reminder',`${id}:appointment-reminder:${record.checkout.reference}`);
            const appointment=Date.parse(reminder.notification?.renderData?.appointment?.start||'');
            if(appointment>clock()+24*3600000)jobs.push({...reminder,dueAt:appointment-24*3600000});
          }
          return emailCollectionEnabled?jobs:jobs[0];
        }
        if(emailCollectionEnabled&&record.payment.status==='failed')return mailJob(record,'notification','payment_failed',`${id}:failed:${record.checkout.reference}`);
        // A gateway wait is not a settled payment. Notify only after a verified, sustained wait.
        if(emailCollectionEnabled&&record.payment.status==='pending'&&Number.isSafeInteger(record.checkout.createdAt)&&clock()-record.checkout.createdAt>=15*60000)
          return mailJob(record,'notification','payment_pending',`${id}:pending:${record.checkout.reference}`);
        return null;
      });
      if(['paid','test_paid'].includes(next.payment.status)) {
        if(next.recoveryId && recoveryService)await recoveryService.stopDraft(next.recoveryId,'paid');
      }
      if(recoveryService)await recoveryService.recordBookingEvent({bookingId:id,revision:next.revision,status:next.scheduling.status==='confirmed'?'confirmed':next.status,mode:next.mode,paymentStatus:next.payment.status,service:next.quote.service,region:['Zürich','Schaffhausen','Winterthur'].find(region=>next.customer.city.toLowerCase()===region.toLowerCase()),occurredAt:new Date(next.confirmedAt||clock()).toISOString(),draftId:next.recoveryId});
      if(['paid','test_paid'].includes(next.payment.status)) {
        const dispatch=async()=>{
          try {
            await service.runDue({jobId:`${id}:receipt:${next.checkout.reference}`,limit:1});
            if(emailCollectionEnabled)await service.runDue({jobId:`${id}:booking_confirmed:${digest(`${id}:appointment:${next.checkout.reference}`).slice(0,24)}`,limit:1});
            return await store.get(id) || next;
          } catch {
            console.warn('[booking:email-dispatch]',{phase:'receipt'});
            return next;
          }
        };
        // The payment and its exact outbox jobs are already durable above.
        // Only the webhook supplies a host lifecycle scheduler; reads await.
        const pending=dispatch();
        if(scheduleEmails){
          try {if(scheduleEmails(pending))return next;}
          catch {console.warn('[booking:email-dispatch]',{phase:'lifecycle-fallback'});}
        }
        return await pending;
      }
      return next;
    },
    /** Server-only operation. Invoke after an authorized person actually checks availability. */
    async confirmAppointment(id:string,{holdExpiresAt,operatorId}:{holdExpiresAt:string;operatorId:string}) {
      if(!operatorId || !Number.isFinite(Date.parse(holdExpiresAt)) || Date.parse(holdExpiresAt)<=clock() || Date.parse(holdExpiresAt)>clock()+7*86400000)throw new BookingError('INVALID_HOLD');
      return store.mutate(id,record=>{
        validateAppointment(record.scheduling.date,record.scheduling.time,clock());
        if(['cancelled','expired','completed'].includes(record.status)||record.quote.totalCents===null||record.quote.manualReviewReasons.length)throw new BookingError('MANUAL_REVIEW_REQUIRED',409);
        if(record.checkout)throw new BookingError('CHECKOUT_ALREADY_STARTED',409);
        return {...record,status:'confirmed',mode,confirmedAt:clock(),confirmedBy:operatorId,revision:record.revision+1,scheduling:{...record.scheduling,status:'held',holdExpiresAt}};
      });
    },
    /** Private commercial approval; the customer must accept the resulting revision in checkout. */
    async approveManualQuote(id:string,{totalCents,scopeNotes,scopeLanguage,operatorId}:{totalCents:number;scopeNotes:string;scopeLanguage?:string;operatorId:string}) {
      if(!operatorId || !Number.isSafeInteger(totalCents)||totalCents<=0||totalCents>100000000)throw new BookingError('INVALID_APPROVED_PRICE');
      const scope=string(scopeNotes,4000,'INVALID_SCOPE',10);
      if(emailCollectionEnabled&&!scopeLanguage)throw new BookingError('SCOPE_LANGUAGE_REQUIRED');
      const reviewedLanguage=scopeLanguage?language(scopeLanguage):undefined;
      return store.mutateWithMail(id,record=>{
        if(record.checkout || !record.quote.manualReviewReasons.length || ['cancelled','expired','completed'].includes(record.status))throw new BookingError('MANUAL_QUOTE_NOT_AVAILABLE',409);
        if(emailCollectionEnabled&&reviewedLanguage!==record.language)throw new BookingError('SCOPE_LANGUAGE_MISMATCH');
        return {...record,originalQuote:record.quote,scopeNotes:scope,...(reviewedLanguage?{scopeContentLanguage:reviewedLanguage}:{}),quote:{...record.quote,lines:[{id:'approved-manual-quote',label:scope,labelKey:'approvedManualQuote',quantity:1,unit:'package',unitPriceCents:totalCents,totalCents}],subtotalCents:totalCents,totalCents,vatComparisonCents:Math.round(totalCents*.081),manualReviewReasons:[]},quoteRevision:record.quoteRevision+1,revision:record.revision+1,priceApprovedBy:operatorId,priceApprovedAt:clock(),payment:{...record.payment,amountDueNowCents:Math.round(totalCents*DEPOSIT_PERCENT/100),remainingBalanceCents:totalCents}};
      },record=>emailCollectionEnabled?mailJob(record,'notification','quote_ready',`${id}:quote:${record.quoteRevision}`):null);
    },
    async changeEmailLanguage(id:string,access:string,input:any) {
      await authenticated(id,access);
      const snapshot=selectedEmailSnapshot(language(input?.language));
      const next=await store.updateLanguageAndPending(id,snapshot,clock(),notification=>({...notification,languageSnapshot:snapshot}));
      return view(next);
    },
    async resolveBookingForRecovery(id:string,email:string) {
      const record=await store.get(id);if(!record || record.customer.email!==email)return null;
      return {bookingId:id,publicToken:token(id),email,mode:record.mode,status:record.status,canCheckout:canCheckout(record),paymentStatus:record.payment.status,holdExpiresAt:record.scheduling.holdExpiresAt};
    },
    async runDue({jobId,limit=20,deadlineAt=Infinity}:{jobId?:string;limit?:number;deadlineAt?:number}={}) {
      if(!sendEmail)return {sent:0,unknown:0,disabled:true};
      const batch=Math.max(0,Math.min(20,Math.floor(limit)));let sent=0,unknown=0;
      if(!batch || performance.now()>=deadlineAt)return {sent,unknown};
      // Targeted request dispatch never scans or drains another customer's queue.
      if(!jobId)await store.markStaleMail(clock(),{limit:batch,deadlineAt});
      const pendingJobs=jobId?[{id:jobId}]:await store.listDueMail(clock(),batch);
      for(const pending of pendingJobs.slice(0,batch)) {
        if(performance.now()+15000>=deadlineAt)break;
        const job=await store.claimMail(pending.id,clock());if(!job)continue;
        if(!emailCollectionEnabled&&(job.kind==='notification'||job.prepared?.notificationId)){await store.finishMail(job.id,'cancelled',null);continue;}
        if(emailCollectionEnabled&&!paymentNotificationsEnabled&&job.kind==='receipt'){await store.finishMail(job.id,'cancelled',null);continue;}
        if(job.kind==='customer_access' && (!job.message || job.expiresAt<=clock())) {await store.finishMail(job.id,'cancelled',null);continue;}
        const record=job.bookingId?await store.get(job.bookingId):null;
        if(!eligibleNotification(record,job)){await store.finishMail(job.id,'cancelled',null);continue;}
        const recipient=job.email||record.customer.email;
        if(await store.isEmailSuppressed(recipient)) {await store.finishMail(job.id,'cancelled',null);if(record&&job.kind!=='customer_access')await store.mutate(record.bookingId,current=>({...current,email:{...current.email,[job.kind]:'failed'}}));continue;}
        try {
          let message=job.prepared;
          if(!message) {
            if(emailCollectionEnabled) {
              if(!job.notification)throw Object.assign(new Error('EMAIL_SNAPSHOT_REVIEW_REQUIRED'),{definitelyNotSent:true});
              const links=job.kind==='customer_access'?job.authorisedLinks:bookingEmailLinks(record,job.notification,origin,token(record.bookingId));
              message=prepareCustomerEnvelope(job.notification,links,origin);
              // Keep the old stable job/provider key across a renderer rollout.
              message={...message,idempotencyKey:`kraken-booking:${job.id}`};
            } else {
              const rendered=job.kind==='customer_access'?job.message:renderBookingEmail(record,job.kind,origin,token(record.bookingId));
              message={from:sender,to:job.email||record.customer.email,...rendered,idempotencyKey:`kraken-booking:${job.id}`};
            }
            if(typeof store.prepareMail==='function')message=await store.prepareMail(job.id,message,clock(),job.expiresAt);
            else if(emailCollectionEnabled)throw Object.assign(new Error('EMAIL_PREPARATION_STORE_REQUIRED'),{definitelyNotSent:true});
            if(!message)continue;
          }
          if(job.preparedExpiresAt&&job.preparedExpiresAt<=clock()){await store.finishMail(job.id,'cancelled',null);continue;}
          if(await store.isEmailSuppressed(message.to)){await store.finishMail(job.id,'cancelled',null);continue;}
          if(!eligibleNotification(job.bookingId?await store.get(job.bookingId):null,job)){await store.finishMail(job.id,'cancelled',null);continue;}
          const accepted=await sendEmail(message);
          await store.finishMail(job.id,'sent',accepted.id);
          if(job.kind!=='customer_access')await store.mutate(record.bookingId,current=>({...current,email:{...current.email,[job.kind]:'sent'}}));
          sent++;
        } catch(cause:any) {
          const definitive=cause?.definitelyNotSent===true;
          const attempts=Number.isSafeInteger(job.attempts)?job.attempts:1;
          const retry=definitive&&cause?.retryable===true&&attempts<3;
          const status=retry?'queued':definitive?'failed':'delivery_unknown';
          const retryAfterMs=Number.isSafeInteger(cause?.retryAfterMs)&&cause.retryAfterMs>=0?cause.retryAfterMs:0;
          await store.finishMail(job.id,status,null,retry?clock()+Math.max(15*60000,retryAfterMs):undefined);
          if(job.kind!=='customer_access')await store.mutate(record.bookingId,current=>({...current,email:{...current.email,[job.kind]:status}}));
          if(status==='delivery_unknown')unknown++;
        }
      }
      return {sent,unknown};
    }
  };
  return service;
}

interface Runtime { service:ReturnType<typeof createBookingService>|null; recovery:any; handleRecovery:any; store:BookingStore|null; auth:any; origin:string; mode:string; paymentReady:boolean; emailReady:boolean; customerAccess:boolean; secret:string; }
export function createBookingHandlers({env=process.env,fetcher=fetch,clock=Date.now,schedulePaymentEmails}:{env?:NodeJS.ProcessEnv;fetcher?:typeof fetch;clock?:()=>number;schedulePaymentEmails?:PaymentEmailScheduler}={}) {
  let initialization:Promise<Runtime>|null=null;
  const initialize=()=>initialization ||= (async()=>{
    let origin='https://krakenpfm.ch';try{origin=new URL(env.APP_URL||origin).origin;}catch{}
    const secret=env.BOOKING_TOKEN_SECRET||'';
    const disabled:Runtime={service:null,recovery:null,handleRecovery:(createRecoveryHandler as any)({publicBaseUrl:origin}),store:null,auth:null,origin,mode:'unconfigured',paymentReady:false,emailReady:false,customerAccess:false,secret};
    const gates={bookingEnabled:env.BOOKING_ENABLED==='true',tokenSecretReady:secret.length>=32,adminCredentialProvided:Boolean(env.FIREBASE_SERVICE_ACCOUNT_JSON || env.GOOGLE_APPLICATION_CREDENTIALS || env.BOOKING_USE_APPLICATION_DEFAULT==='true')};
    // Initialization is cached: emit one private diagnostic, never the error or its message/stack.
    const diagnostic=(phase:string,cause?:unknown)=>{
      const error=cause as {name?:unknown;code?:unknown;message?:unknown}|undefined;
      const name=typeof error?.name==='string'&&['Error','SyntaxError','TypeError','RangeError','FirebaseError','FirebaseAppError','FirebaseAuthError','FirebaseFirestoreError','GoogleError','BookingError'].includes(error.name)?error.name:cause?'UnknownError':null;
      const code=typeof error?.code==='number'&&Number.isInteger(error.code)&&error.code>=0&&error.code<=16?error.code:
        typeof error?.code==='string'&&/^(?:app\/(?:invalid-credential|invalid-app-options|invalid-argument|duplicate-app|no-app|app-deleted|network-error|network-timeout|unable-to-parse-response)|auth\/(?:invalid-credential|invalid-project-id|invalid-argument)|firestore\/(?:invalid-argument|failed-precondition|permission-denied|unauthenticated|unavailable)|ERR_MODULE_NOT_FOUND|MODULE_NOT_FOUND|ERR_PACKAGE_PATH_NOT_EXPORTED|ERR_REQUIRE_ESM|ERR_REQUIRE_ASYNC_MODULE|ERR_AMBIGUOUS_MODULE_SYNTAX|ERR_INTERNAL_ASSERTION|ERR_DLOPEN_FAILED|ERR_UNSUPPORTED_DIR_IMPORT|ERR_IMPORT_ATTRIBUTE_MISSING|ERR_REQUIRE_CYCLE_MODULE|ENOENT|EACCES)$/.test(error.code)?error.code:null;
      const message=phase.startsWith('sdk_')&&typeof error?.message==='string'?error.message:'';
      const errorCategory=phase.startsWith('sdk_')?{dynamicRequire:message.includes('Dynamic require'),missingModule:message.includes('Cannot find module'),missingPackage:message.includes('Cannot find package'),notSupported:message.includes('not supported'),requireCall:message.includes('require()'),packageJson:message.includes('package.json'),cannotLoad:message.includes('Cannot load'),missingExport:message.includes('does not provide an export')}:null;
      const entry={...gates,phase,error:{name,code},...(errorCategory?{errorCategory}:{})};
      if(cause)console.error('[booking:initialize]',entry);else if(phase==='gates')console.warn('[booking:initialize]',entry);else console.info('[booking:initialize]',entry);
    };
    if(!gates.bookingEnabled || !gates.tokenSecretReady || !gates.adminCredentialProvided){diagnostic('gates');return disabled;}
    let phase='sdk_app_import';
    try {
      const {getApps,initializeApp,cert,applicationDefault}=await import('firebase-admin/app');
      phase='sdk_firestore_import';
      const {getFirestore}=await import('firebase-admin/firestore');
      let app=getApps().find(app=>app.name==='kraken-booking');
      if(!app){
        phase='credential_json';
        const account=env.FIREBASE_SERVICE_ACCOUNT_JSON?JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON):null;
        phase='firebase_credential';
        const credential=env.FIREBASE_SERVICE_ACCOUNT_JSON?cert(account):applicationDefault();
        phase='firebase_app';
        app=initializeApp({credential,projectId:env.BOOKING_FIREBASE_PROJECT_ID||firebaseConfig.projectId},'kraken-booking');
      }
      phase='firestore';
      const db=getFirestore(app,env.BOOKING_FIREBASE_DATABASE_ID||firebaseConfig.firestoreDatabaseId);
      const store=createFirestoreBookingStore(db);
      phase='services';
      const mode=['live','test'].includes(env.PAYREXX_MODE||'')?env.PAYREXX_MODE!:'unconfigured';
      const webhookReady=Boolean(env.PAYREXX_WEBHOOK_SECRET?.trim());
      const paymentReady=Boolean(env.PAYREXX_INSTANCE&&env.PAYREXX_API_SECRET&&webhookReady&&mode!=='unconfigured'&&origin.startsWith('https://'));
      const payment=paymentReady?createPayrexxAdapter({instance:env.PAYREXX_INSTANCE!,secret:env.PAYREXX_API_SECRET!,mode:mode as 'live'|'test',origin},fetcher):null;
      const emailReady=Boolean(env.RESEND_API_KEY&&env.BOOKING_EMAIL_FROM&&origin.startsWith('https://'));
      const providerEmail=emailReady?createResendEmailAdapter(env.RESEND_API_KEY!,fetcher):null;
      const sendEmail=providerEmail?async(message:any)=>{if(await store.isEmailSuppressed(message.to)){const error:any=new BookingError('EMAIL_SUPPRESSED');error.definitelyNotSent=true;throw error;}return providerEmail(message);}:null;
      const emailCollection=collectionConfiguration(env,origin);
      const service=createBookingService({store,tokenSecret:secret,origin,mode,payment,sendEmail,sender:env.BOOKING_EMAIL_FROM,clock,emailCollectionEnabled:emailCollection.enabled,paymentNotificationsEnabled:env.BOOKING_EMAIL_COLLECTION_PAYMENTS_ENABLED==='true'});
      const remindersEnabled=env.BOOKING_RECOVERY_REMINDERS_ENABLED==='true'&&(env.RESEND_WEBHOOK_SECRET||'').length>=32;
      const recovery=emailReady&&(env.RECOVERY_TOKEN_SECRET||'').length>=32&&(env.CRON_SECRET||'').length>=32?createRecoveryService({store:createFirestoreRecoveryStore(db),calculatePrice,sendEmail,resolveBookingForRecovery:service.resolveBookingForRecovery,publicBaseUrl:origin,sender:env.BOOKING_EMAIL_FROM!,tokenSecret:env.RECOVERY_TOKEN_SECRET!,remindersEnabled,emailCollection,clock}):null;
      const customerAccess=env.BOOKING_CUSTOMER_ACCESS_ENABLED==='true'&&emailReady&&Boolean(recovery);
      let auth=null;
      if(customerAccess){
        phase='sdk_auth_import';
        const {getAuth}=await import('firebase-admin/auth');
        phase='auth';
        auth=getAuth(app);
      }
      phase='services';
      service.setRecovery(recovery);
      const handleRecovery=(createRecoveryHandler as any)({service:recovery,publicBaseUrl:origin,...(recovery?{authorizeCapture:async(request:globalThis.Request)=>{
        const session=cookieSession(request.headers.get('cookie')||'',secret,clock());
        const remote=request.headers.get('x-kraken-server-remote');
        return session&&remote?{rateKey:remote}:null;
      }}:{})});
      diagnostic('ready');
      return {service,recovery,store,auth,origin,mode,paymentReady,emailReady,customerAccess,handleRecovery,secret};
    }catch(cause){diagnostic(phase,cause);return disabled;}
  })();
  async function middleware(req:Request,res:Response,next:any) {
    if(!/^\/api\/(?:booking(?:\/|$)|bookings\/activity|recovery\/|customer\/)/.test(req.path)&&req.path!=='/recovery/unsubscribe')return next();
    privateResponse(res);
    try {
      if(req.path==='/api/booking/maintenance') {
        res.set('X-Robots-Tag','noindex, nofollow');
        if(req.method!=='GET'){res.set('Allow','GET');throw new BookingError('METHOD_NOT_ALLOWED',405);}
        const cronSecret=env.CRON_SECRET||'';
        if(cronSecret.length<32)throw new BookingError('MAINTENANCE_NOT_CONFIGURED',503);
        if(!timingEqual(digest(req.get('Authorization')||''),digest(`Bearer ${cronSecret}`)))throw new BookingError('UNAUTHORIZED',401);
        const runtime=await initialize();
        if(!runtime.service || !runtime.emailReady)throw new BookingError('EMAIL_NOT_CONFIGURED',503);
        const deadlineAt=performance.now()+180000;
        const booking=await runtime.service.runDue({limit:6,deadlineAt});
        const recovery=await runtime.recovery?.runDue({limit:6,deadlineAt})||{sent:0,cancelled:0,deferred:0,failed:0,unknown:0};
        return res.json({booking:{sent:booking.sent,unknown:booking.unknown},recovery});
      }
      const runtime=await initialize();
      if(req.method!=='GET') {
        if(req.get('Origin')!==runtime.origin)throw new BookingError('ORIGIN_NOT_ALLOWED',403);
        if(!req.is('application/json'))throw new BookingError('JSON_REQUIRED',415);
        if(JSON.stringify(req.body||{}).length>32768)throw new BookingError('BODY_TOO_LARGE',413);
      }
      if(req.path==='/api/booking/config'&&req.method==='GET') {
        if(runtime.paymentReady&&env.VERCEL==='1'){
          try {
            const check=await runPayrexxConnectionCheckOnce({enabledUntil:env.PAYREXX_CONNECTION_CHECK_UNTIL,instance:env.PAYREXX_INSTANCE!,apiSecret:env.PAYREXX_API_SECRET!,fetchImpl:fetcher,now:clock});
            if(check)console.info('[booking:payrexx-connection-check]',check);
          }catch{
            console.warn('[booking:payrexx-connection-check]',{authStatus:'provider_unavailable',methodsChecked:false,liveCHFOneTimeAvailable:null,testCHFOneTimeAvailable:null,unknownModePresent:null});
          }
        }
        if(runtime.service) {
          const nonce=crypto.randomBytes(24).toString('base64url'),expires=clock()+3600000,value=`${nonce}.${expires}`;
          const signature=crypto.createHmac('sha256',runtime.secret).update(value).digest('base64url');
          res.cookie('kraken_capture',`${value}.${signature}`,{httpOnly:true,sameSite:'strict',secure:runtime.origin.startsWith('https://'),path:'/',maxAge:3600000});
        }
        return res.json({available:Boolean(runtime.service),paymentReady:runtime.paymentReady,emailReady:runtime.emailReady,mode:runtime.mode,termsVersion:BOOKING_TERMS_VERSION,depositPercent:DEPOSIT_PERCENT});
      }
      if(req.path.startsWith('/api/recovery/')||req.path==='/api/bookings/activity'||req.path==='/recovery/unsubscribe') {
        const headers=new Headers();for(const [key,value]of Object.entries(req.headers))if(typeof value==='string')headers.set(key,value);
        // Overwrite this internal header; forwarded/client-controlled addresses are never rate keys.
        headers.set('x-kraken-server-remote',digest(req.socket.remoteAddress||'unknown'));
        const response=await runtime.handleRecovery(new globalThis.Request(`${runtime.origin}${req.originalUrl}`,{method:req.method,headers,...(req.method==='GET'?{}:{body:JSON.stringify(req.body)})}));
        res.status(response.status);response.headers.forEach((value:string,name:string)=>res.setHeader(name,value));return res.send(await response.text());
      }
      if(req.path==='/api/customer/access/config'&&req.method==='GET')return res.json({enabled:runtime.customerAccess});
      if(!runtime.service||!runtime.store)throw new BookingError('BOOKING_NOT_CONFIGURED',503);
      const session=cookieSession(req.get('cookie')||'',runtime.secret,clock());
      if(req.method!=='GET' && !session)throw new BookingError('SESSION_REQUIRED',403);
      const remote=digest(req.socket.remoteAddress||'unknown');
      if(req.method!=='GET' && !await runtime.store.consumeRate(`request:${remote}`,clock(),3600000,30))throw new BookingError('TOO_MANY_REQUESTS',429);
      if(req.path==='/api/booking/requests'&&req.method==='POST') {
        const created=await runtime.service.create(req.body);
        let result=created;
        try {
          await runtime.service.runDue({jobId:`${created.bookingId}:request:1`,limit:1});
          result=runtime.service.view(await runtime.service.authenticated(created.bookingId,created.publicToken),true);
        } catch {
          console.warn('[booking:email-dispatch]',{phase:'request'});
        }
        return res.status(201).json(result);
      }
      const match=/^\/api\/booking\/requests\/([A-Za-z0-9_-]{1,128})(\/(?:checkout|language))?$/.exec(req.path);
      if(match) {
        if(req.method==='GET'&&!match[2])return res.json(await runtime.service.read(match[1],bearer(req)));
        if(req.method==='POST'&&match[2]==='/checkout')return res.json(await runtime.service.checkout(match[1],bearer(req),req.body));
        if(req.method==='PATCH'&&match[2]==='/language')return res.json(await runtime.service.changeEmailLanguage(match[1],bearer(req),req.body));
        throw new BookingError('METHOD_NOT_ALLOWED',405);
      }
      if(req.path==='/api/customer/access'&&req.method==='POST') {
        if(!runtime.customerAccess||!runtime.recovery)throw new BookingError('CUSTOMER_ACCESS_NOT_CONFIGURED',503);
        if(!validEmail(req.body?.email))throw new BookingError('INVALID_EMAIL');
        const email=req.body.email.trim().toLowerCase(),locale=language(req.body.language);
        const draft=await runtime.recovery.read(req.body.recovery?.id,req.body.recovery?.accessToken);
        if(draft.email!==email)throw new BookingError('RECOVERY_EMAIL_MISMATCH',403);
        if(!await runtime.store.consumeRate(`access:${digest(email)}`,clock(),86400000,3))throw new BookingError('TOO_MANY_REQUESTS',429);
        // Firebase itself verifies email ownership; no account exists merely because this was queued.
        const link=await runtime.auth.generateSignInWithEmailLink(email,{url:`${runtime.origin}/customer-access?lang=${locale}`,handleCodeInApp:true});
        const copy={de:['Ihr Kraken-Zugang','Mit diesem persönlichen Link können Sie sich bei Kraken anmelden.'],en:['Your Kraken access','Use this personal link to sign in to Kraken.'],es:["Su acceso a Kraken","Utilice este enlace personal para iniciar sesión en Kraken."],fr:['Votre accès Kraken','Utilisez ce lien personnel pour vous connecter à Kraken.'],it:['Il tuo accesso Kraken','Usa questo link personale per accedere a Kraken.'],pt:['O seu acesso Kraken','Utilize esta ligação pessoal para iniciar sessão na Kraken.']}[locale]!;
        const idempotencyKey=string(req.body.idempotencyKey,128,'INVALID_IDEMPOTENCY_KEY',16);
        // Separate account outbox also handles drafts that have no booking yet.
        await runtime.store.addMail({id:`access:${draft.id}:${digest(idempotencyKey)}`,bookingId:null,kind:'customer_access',email,status:'queued',dueAt:clock(),expiresAt:clock()+15*60000,message:{subject:copy[0],text:`${copy[1]}\n\n${link}`,html:`<p>${copy[1]}</p><p><a href="${link.replaceAll('&','&amp;').replaceAll('"','&quot;')}">${copy[0]}</a></p>`}});
        return res.status(202).json({status:'queued'});
      }
      if(req.path==='/api/customer/bookings'&&req.method==='GET') {
        if(!runtime.customerAccess)throw new BookingError('CUSTOMER_ACCESS_NOT_CONFIGURED',503);
        const claims=await runtime.auth.verifyIdToken(bearer(req),true).catch(()=>null);
        if(!claims?.email_verified||!claims.email)throw new BookingError('UNAUTHORIZED',401);
        const records=await runtime.store.listByEmail(claims.email.toLowerCase());
        return res.json({bookings:records.map(record=>runtime.service!.view(record))});
      }
      throw new BookingError('NOT_FOUND',404);
    }catch(cause){return res.status(cause instanceof BookingError?cause.status:503).json({code:cause instanceof BookingError?cause.code:'BOOKING_UNAVAILABLE'});}
  }
  /** Mount with express.raw before the global JSON parser. Body contents never establish payment state. */
  const webhook:RequestHandler=async(req,res)=>{
    privateResponse(res);
    try {
      const runtime=await initialize();
      if(!runtime.service||!runtime.paymentReady||!env.PAYREXX_WEBHOOK_SECRET)throw new BookingError('PAYMENT_NOT_CONFIGURED',503);
      const payload=verifyPayrexxWebhook(req.body,req.get('X-Webhook-Signature')||'',env.PAYREXX_WEBHOOK_SECRET);
      const reference=payload.transaction?.referenceId||payload.transaction?.invoice?.referenceId;
      const id=/^([A-Za-z0-9_-]{24})-r\d+$/.exec(reference||'')?.[1];
      if(!id)throw new BookingError('UNKNOWN_REFERENCE',404);
      await runtime.service.reconcile(id,{scheduleEmails:schedulePaymentEmails});
      return res.json({received:true});
    }catch(cause){return res.status(cause instanceof BookingError?cause.status:503).json({code:cause instanceof BookingError?cause.code:'PAYMENT_VERIFICATION_UNAVAILABLE'});}
  };
  const emailWebhook:RequestHandler=async(req,res)=>{
    privateResponse(res);
    try {
      const runtime=await initialize();
      if(!runtime.store||!env.RESEND_WEBHOOK_SECRET)throw new BookingError('EMAIL_WEBHOOK_NOT_CONFIGURED',503);
      const {id,event}=verifyResendWebhook(req.body,{'svix-id':req.get('svix-id')||'','svix-timestamp':req.get('svix-timestamp')||'','svix-signature':req.get('svix-signature')||''},env.RESEND_WEBHOOK_SECRET);
      const fingerprint=digest(req.body.toString('utf8'));
      if(await runtime.store.emailEventProcessed(id,fingerprint))return res.json({received:true});
      if(['email.bounced','email.complained','email.suppressed'].includes(event.type)) {
        const recipients=event.data?.to;
        if(!Array.isArray(recipients)||recipients.length!==1||!validEmail(recipients[0]))throw new BookingError('INVALID_EMAIL_EVENT');
        const email=recipients[0].trim().toLowerCase(),reason=event.type==='email.complained'?'complaint':'bounced';
        // Both operations are idempotent; mark the event complete only after both.
        // An interrupted delivery can retry without losing the suppression.
        await runtime.store.suppressEmail(email,reason,clock());
        if(runtime.recovery)await runtime.recovery.suppressEmail(email,reason);
      }
      await runtime.store.finishEmailEvent(id,fingerprint,clock());
      return res.json({received:true});
    }catch(cause){return res.status(cause instanceof BookingError?cause.status:503).json({code:cause instanceof BookingError?cause.code:'EMAIL_WEBHOOK_UNAVAILABLE'});}
  };
  return {middleware:middleware as RequestHandler,webhook,emailWebhook,initialize,async runDue(){const runtime=await initialize();const deadlineAt=performance.now()+180000;return {booking:await runtime.service?.runDue({limit:6,deadlineAt})||{disabled:true},recovery:await runtime.recovery?.runDue({limit:6,deadlineAt})||{disabled:true}};}};
}

function cookieSession(header:string,secret:string,now:number) {
  const match=/(?:^|;\s*)kraken_capture=([^;]+)/.exec(header);if(!match||secret.length<32)return null;
  const parts=decodeURIComponent(match[1]).split('.');if(parts.length!==3||!/^\d{13}$/.test(parts[1])||Number(parts[1])<=now)return null;
  const signature=crypto.createHmac('sha256',secret).update(`${parts[0]}.${parts[1]}`).digest('base64url');
  return timingEqual(parts[2],signature)?parts[0]:null;
}
