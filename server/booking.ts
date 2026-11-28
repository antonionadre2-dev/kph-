import crypto from 'node:crypto';
import type { Request, Response, RequestHandler } from 'express';
import { calculatePrice, defaultSelection, PRICING_VERSION } from '../src/booking/pricing.ts';
import { BOOKING_TERMS_VERSION, checkoutTermsMatch } from '../src/booking/terms.ts';
import { depositPaymentDeadline, fullPaymentDeadline, usesTermsPaymentDeadline } from '../src/booking/paymentDeadline.ts';
import {createTermsAcceptance,currentTermsDocuments,termsMetadata} from '../src/legal/terms-registry.ts';
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
import { safeMailFailure } from './booking-mail-safety.ts';
import { logRecoveryOriginRejection, missingOriginRequestProof } from './security.ts';
import { createBookingOperatorHandler } from './booking-operator.ts';
import { createBookingAccessRecovery, issueBookingBrowserCookie, redeemBookingBrowserCookie } from './booking-access-recovery.ts';
import { pinnedAccessRequest } from './booking-access-dispatch.ts';
import { applyVerifiedSuppression, suppressionScope } from './booking-email-suppression.ts';
import { customerAccountAccessJob, firebaseCustomerAccessLink } from './customer-account-access.ts';
import { usesFullPrepayment, isMonthlySelection, monthlyBillingPeriod, settledHourlyQuote, cancellationRefundQuote, minimumBillableHours } from '../src/booking/fullPrepayment.ts';
import { createBookingReminders } from './booking-reminders.ts';
import { bookingAreaReview } from '../src/booking/serviceArea.ts';
import firebaseConfig from '../firebase-applet-config.json' with {type:'json'};

export { BOOKING_TERMS_VERSION };
export const DEPOSIT_PERCENT=15;
const languages=['de','en','es','fr','it','pt'];
const safeId=/^[A-Za-z0-9_-]{1,128}$/;
const timingEqual=(a:string,b:string)=>a.length===b.length && crypto.timingSafeEqual(Buffer.from(a),Buffer.from(b));
const canonical=(input:any):string=>JSON.stringify(input && typeof input==='object' ? Array.isArray(input)?input.map(value=>JSON.parse(canonical(value))):Object.fromEntries(Object.keys(input).filter(key=>input[key]!==undefined).sort().map(key=>[key,JSON.parse(canonical(input[key]))])):input);
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
  const acceptedLanguage=language(input.language);
  const document=termsMetadata(BOOKING_TERMS_VERSION,acceptedLanguage)!;
  if(input.termsHash!==undefined&&input.termsHash!==document.sha256)throw new BookingError('TERMS_REQUIRED');
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
  return {selection,quote,customer:{name,email:customer.email.trim().toLowerCase(),phone,address,postalCode:customer.postalCode,city},requestedDate:input.requestedDate,requestedTime:input.requestedTime,language:acceptedLanguage,termsVersion:BOOKING_TERMS_VERSION,termsHash:document.sha256,notes:string(input.notes??'',4000,'INVALID_NOTES',0),idempotencyKey,recovery:input.recovery};
}

export function createBookingService({store,tokenSecret,origin,mode='unconfigured',payment=null,sendEmail=null,sender='',clock=Date.now,recovery=null,emailCollectionEnabled=false,paymentNotificationsEnabled=false}: {store:BookingStore;tokenSecret:string;origin:string;mode?:string;payment?:any;sendEmail?:any;sender?:string;clock?:()=>number;recovery?:any;emailCollectionEnabled?:boolean;paymentNotificationsEnabled?:boolean}) {
  const token=(id:string)=>crypto.createHmac('sha256',tokenSecret).update(`booking:${id}`).digest('base64url');
  let recoveryService=recovery;
  let createCustomerAccessLink:((email:string,language:string)=>Promise<string>)|null=null;
  const checkoutDeadline=(record:any)=>usesFullPrepayment(record)?Date.parse(record.payment.checkoutAvailableUntil||bookingAppointmentStart(record)||''):Math.min(Date.parse(record.scheduling.holdExpiresAt),usesTermsPaymentDeadline(record)?Date.parse(record.payment.depositDueAt):Infinity);
  const canCheckout=(record:any)=>Boolean(payment && ['confirmed','held'].includes(record.scheduling.status) && checkoutDeadline(record)>clock() && (usesFullPrepayment(record)?record.payment.totalDueCents:record.quote.totalCents)>0 && !record.quote.manualReviewReasons.length && !['paid','test_paid','refunded','partially_refunded','chargeback','disputed','reconciliation_required'].includes(record.payment.status) && !['cancelled','expired','completed'].includes(record.status));
  const cancellationQuote=(record:any)=>{if(!usesFullPrepayment(record))return undefined;try{return cancellationRefundQuote(record,Date.parse(bookingAppointmentStart(record)!),record.cancelledAt||clock());}catch{return null;}};
  const view=(record:any,includeToken=false)=>({bookingId:record.bookingId,reference:record.reference,...(includeToken?{publicToken:token(record.bookingId)}:{}),status:record.status,language:record.language,languageSnapshot:record.languageSnapshot,quote:record.quote,quoteRevision:record.quoteRevision,canCheckout:canCheckout(record),customer:record.customer,notes:record.notes,scopeNotes:record.scopeNotes,termsVersion:record.termsVersion,termsAcceptance:record.termsAcceptance,confirmedAt:record.confirmedAt,selection:record.selection,scheduling:record.scheduling,payment:{...record.payment,...(record.payment.reminder&&['scheduling','cancelling'].includes(record.payment.reminder.status)&&record.payment.reminder.updatedAt+60000<=clock()?{reminder:{...record.payment.reminder,status:record.payment.reminder.status==='scheduling'?'schedule_unknown':'cancel_unknown'}}:{})},email:record.email,...(usesFullPrepayment(record)?{coverageReview:record.coverageReview,reviewReasons:record.reviewReasons||[],manualReviewRequired:record.coverageReview==='outside'&&!record.coverageReviewedAt,canStart:['paid','test_paid'].includes(record.payment.status)&&!['cancelled','expired','completed'].includes(record.status),canSettleWork:['paid','test_paid'].includes(record.payment.status)&&record.quote.priceType==='estimate'&&!record.workSettlement&&!['cancelled','expired','completed'].includes(record.status)&&minimumBillableHours(record.selection)!==null,workSettlement:record.workSettlement||null,cancellationQuote:cancellationQuote(record)}:{})});
  async function authenticated(id:string,access:string) {if(!safeId.test(id)||!timingEqual(access,token(id)))throw new BookingError('BOOKING_NOT_FOUND',404);const record=await store.get(id);if(!record || record.tokenRevoked)throw new BookingError('BOOKING_NOT_FOUND',404);return record;}
  function mailJob(record:any,kind:string,templateId:string,eventId:string,id?:string,extra:any={}) {
    let notification,notificationError;
    try{notification=notificationForBooking(record,templateId,eventId,extra);}catch{notificationError='EMAIL_SNAPSHOT_REVIEW_REQUIRED';}
    return {id:id||`${record.bookingId}:${templateId}:${digest(eventId).slice(0,24)}`,bookingId:record.bookingId,kind,status:'queued',dueAt:clock(),...(notification?{notification}:{notification:null,notificationError})};
  }
  function eligibleNotification(record:any,job:any) {
    if(job.kind==='customer_access')return job.expiresAt>clock();
    if(!record)return false;
    if(['payment_ready','payment_reminder'].includes(job.kind))return canCheckout(record)&&(!job.paymentDueAt||job.paymentDueAt===record.payment.paymentDueAt);
    if(job.kind==='extra_payment_ready')return usesFullPrepayment(record)&&record.payment.extraPayment?.status==='pending'&&!['cancelled','expired'].includes(record.status);
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
  const reminders=createBookingReminders({store,sendEmail,origin,token,eligible:eligibleNotification,clock});
  const service={
    remindersReady:reminders.ready,schedulePaymentReminders:reminders.schedule,cancelPaymentReminders:reminders.cancel,
    token,view,authenticated,canCheckout,
    async browserAccess(id:string){
      if(!safeId.test(id))return null;
      const record=await store.get(id);
      return record&&!record.tokenRevoked?{id,token:token(id)}:null;
    },
    setRecovery(value:any){recoveryService=value;},
    setCustomerAccessLink(value:(email:string,language:string)=>Promise<string>){createCustomerAccessLink=value;},
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
      const full=usesFullPrepayment({termsVersion:BOOKING_TERMS_VERSION}),monthly=full&&isMonthlySelection(value.selection);
      const fullPayment={model:'full_prepayment',billingMode:monthly?'monthly':'single',status:'not_started',totalDueCents:monthly?null:total,amountDueNowCents:monthly?0:total??0,amountPaidCents:0,outstandingCents:monthly?0:total??0,refundedCents:0};
      const coverageReview=bookingAreaReview(value.customer.postalCode,value.customer.city);
      const record={bookingId:id,reference:`K-${new Date(now).getUTCFullYear()}-${id.slice(0,8).toUpperCase()}`,status:'awaiting_confirmation',mode,createdAt:now,revision:1,selection:value.selection,quote:value.quote,quoteRevision:1,customer:value.customer,notes:value.notes,language:value.language,languageSnapshot:selectedEmailSnapshot(value.language),termsVersion:BOOKING_TERMS_VERSION,termsAcceptedAt:now,termsAcceptance:createTermsAcceptance(value.language,now),scheduling:{status:'requested',date:value.requestedDate,time:value.requestedTime,timeZone:'Europe/Zurich'},payment:full?fullPayment:{status:'not_started',depositPercent:DEPOSIT_PERCENT,amountDueNowCents:total===null?0:Math.round((value.quote.depositBasisCents??value.quote.minimumChargeCents??total)*DEPOSIT_PERCENT/100),amountPaidCents:0,remainingBalanceCents:total??0},coverageReview,reviewReasons:coverageReview==='outside'?['outside_service_area']:[],email:{request:'queued'},...(value.recovery?{recoveryId:value.recovery.id}:{})};
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
      if(record.payment.extraPayment?.gatewayId&&!['paid','test_paid','refunded','partially_refunded','reconciliation_required'].includes(record.payment.extraPayment.status)&&clock()-(record.payment.extraPayment.lastVerifiedAt||0)>=2500){try{record=await service.reconcileExtra(id);}catch{}}
      return view(record);
    },
    async checkout(id:string,access:string,input:any) {
      await authenticated(id,access);
      if(!payment)throw new BookingError('PAYMENT_NOT_CONFIGURED',503);
      if(input?.termsAccepted!==true)throw new BookingError('TERMS_REQUIRED');
      const presentationLanguage=language(input.language); // Checkout presentation never changes the saved communication preference.
      const claimed=await store.mutate(id,current=>{
        if(!checkoutTermsMatch(input.termsVersion,current.termsVersion))throw new BookingError('TERMS_REQUIRED');
        if(input.acceptedQuoteRevision!==current.quoteRevision)throw new BookingError('PRICE_CHANGED',409);
        if(usesFullPrepayment(current)&&input.acceptedTotalDueCents!==current.payment.totalDueCents)throw new BookingError('PRICE_CHANGED',409);
        if(!['live','test'].includes(mode)||current.mode!==mode)throw new BookingError('PAYMENT_MODE_CHANGED',409);
        if(!canCheckout(current))throw new BookingError('CHECKOUT_NOT_AVAILABLE',409);
        if(current.checkout?.link && current.checkout.expiresAt>clock())return current;
        // A timed-out/unknown POST must be reconciled by an operator, never retried into a second charge.
        if(current.checkout && ['creating','unknown'].includes(current.checkout.status))throw new BookingError('PAYMENT_RECONCILIATION_REQUIRED',409);
        if(current.checkout?.expiresAt<=clock())throw new BookingError('CHECKOUT_EXPIRED',409);
        // Current terms provide one gateway for the entire remaining payment window.
        // Reusing that gateway avoids manufacturing another potentially payable attempt.
        const expiresAt=Math.min(checkoutDeadline(current),usesTermsPaymentDeadline(current)||usesFullPrepayment(current)?Infinity:clock()+30*60000);
        if(expiresAt-clock()<60000)throw new BookingError('CHECKOUT_NOT_AVAILABLE',409);
        return {...current,checkout:{status:'creating',reference:`${id}-r${current.quoteRevision}`,expiresAt,createdAt:clock()},revision:current.revision+1};
      });
      if(claimed.checkout.link)return {link:claimed.checkout.link};
      try {
        const validity=Math.floor((claimed.checkout.expiresAt-clock())/60000);
        if(validity<1)throw new BookingError('CHECKOUT_NOT_AVAILABLE',409);
        const gateway=await payment.create(claimed,token(id),validity,presentationLanguage);
        const saved=await store.mutateWithMail(id,current=>{
          if(current.checkout?.reference!==claimed.checkout.reference||current.checkout.createdAt!==claimed.checkout.createdAt)throw new BookingError('PAYMENT_MISMATCH',409);
          const payable=canCheckout(current);
          return {...current,checkout:{...current.checkout,gatewayId:gateway.id,link:gateway.link,status:payable?'created':'review_required'},payment:{...current.payment,status:payable?'pending':'reconciliation_required',checkoutExpiresAt:new Date(current.checkout.expiresAt).toISOString()}};
        },record=>emailCollectionEnabled&&record.checkout.status==='created'?mailJob(record,'notification','payment_requested',`${id}:gateway:${gateway.id}`):null);
        if(saved.checkout.status!=='created')throw new BookingError('PAYMENT_RECONCILIATION_REQUIRED',409);
        if(emailCollectionEnabled)try{await service.runDue({jobId:`${id}:payment_requested:${digest(`${id}:gateway:${gateway.id}`).slice(0,24)}`,limit:1});}catch{console.warn('[booking:email-dispatch]',{phase:'payment-request'});}
        return {link:gateway.link};
      } catch {
        await store.mutate(id,current=>current.checkout?.reference===claimed.checkout.reference&&current.checkout.createdAt===claimed.checkout.createdAt&&current.checkout.status==='creating'?{...current,checkout:{...current.checkout,status:'unknown'}}:current);
        throw new BookingError('PAYMENT_RECONCILIATION_REQUIRED',503);
      }
    },
    async reconcile(id:string,{scheduleEmails}:{scheduleEmails?:PaymentEmailScheduler}={}) {
      const current=await store.get(id);if(!current?.checkout?.gatewayId || !payment)throw new BookingError('PAYMENT_NOT_STARTED',409);
      let verified:any;
      try {verified=await payment.verify(current);}catch(cause){if(cause instanceof BookingError && cause.status===409)await store.mutate(id,record=>record.checkout?.reference===current.checkout.reference&&record.checkout?.gatewayId===current.checkout.gatewayId?{...record,payment:{...record.payment,status:'reconciliation_required'},revision:record.revision+1}:record);throw cause;}
      const next=await store.mutateWithMail(id,record=>{
        if(record.checkout.reference!==current.checkout.reference||record.checkout.gatewayId!==current.checkout.gatewayId)throw new BookingError('PAYMENT_MISMATCH',409);
        // A stale waiting notification cannot undo a completed payment.
        const previous=record.payment.status;
        const terminal=['refunded','partially_refunded','chargeback','disputed','reconciliation_required'];
        const lateSettlement=['paid','test_paid'].includes(verified.status)&&!['paid','test_paid','refunded','partially_refunded','chargeback','disputed'].includes(previous)&&(['cancelled','expired'].includes(record.status)||['cancelled','needs_reschedule'].includes(record.scheduling.status));
        const staleResult=(terminal.includes(previous)&&!terminal.includes(verified.status))||(['paid','test_paid'].includes(previous)&&['pending','failed','cancelled','expired'].includes(verified.status));
        const refundedCents=usesFullPrepayment(record)?Math.max(record.payment.refundedCents||0,Number.isSafeInteger(verified.refundedCents)?verified.refundedCents:0):undefined;
        const refundStatus=usesFullPrepayment(record)&&(refundedCents||0)>0?((refundedCents||0)>=Math.max(record.payment.amountPaidCents||0,record.payment.amountDueNowCents)?'refunded':'partially_refunded'):null;
        const status=refundStatus||(lateSettlement?'reconciliation_required':staleResult?previous:verified.status);
        const paid=['paid','test_paid'].includes(status);
        const reviewedSettlement=status==='reconciliation_required'&&['paid','test_paid'].includes(verified.status);
        const amount=paid||reviewedSettlement||(usesFullPrepayment(record)&&['paid','test_paid','refunded','partially_refunded'].includes(verified.status))?(usesFullPrepayment(record)?Math.max(record.payment.amountPaidCents||0,record.payment.amountDueNowCents):record.payment.amountDueNowCents):record.payment.amountPaidCents;
        return {...record,lastVerifiedAt:clock(),revision:record.payment.status===status?record.revision:record.revision+1,payment:{...record.payment,status,transactionId:staleResult&&!reviewedSettlement?record.payment.transactionId:verified.transactionId,amountPaidCents:amount,...(usesFullPrepayment(record)?{refundedCents}:{}),...(usesFullPrepayment(record)?{outstandingCents:Math.max(0,(record.status==='cancelled'?(cancellationQuote(record)?.retainedCents||0):(record.workSettlement?.finalTotalCents??record.payment.totalDueCents??0))-amount+(refundedCents||0))}:{remainingBalanceCents:Math.max(0,(record.quote.totalCents||0)-amount)}),...(reviewedSettlement?{verifiedPaymentStatus:verified.status,settlementNeedsReview:true}:{})},...(paid?{scheduling:{...record.scheduling,status:usesFullPrepayment(record)&&['cancelled','completed'].includes(record.status)?record.scheduling.status:'confirmed'},email:{...record.email,...(usesFullPrepayment(record)||!emailCollectionEnabled||paymentNotificationsEnabled?{receipt:record.email.receipt||'queued'}:{})}}:{})};
      },record=>{
        if(['paid','test_paid'].includes(record.payment.status)){
          const jobs=(usesFullPrepayment(record)||!emailCollectionEnabled||paymentNotificationsEnabled)?[mailJob(record,'receipt',!usesFullPrepayment(record)&&record.payment.remainingBalanceCents>0?'deposit_received':'payment_received',`${id}:settled:${record.checkout.reference}`,`${id}:receipt:${record.checkout.reference}`)]:[];
          if(emailCollectionEnabled){
            jobs.push(mailJob(record,'notification','booking_confirmed',`${id}:appointment:${record.checkout.reference}`));
            const reminder=mailJob(record,'notification','appointment_reminder',`${id}:appointment-reminder:${record.checkout.reference}`);
            const appointment=Date.parse(reminder.notification?.renderData?.appointment?.start||'');
            if(appointment>clock()+24*3600000)jobs.push({...reminder,dueAt:appointment-24*3600000});
          }
          return emailCollectionEnabled||usesFullPrepayment(record)?jobs:jobs[0];
        }
        if(emailCollectionEnabled&&record.payment.status==='failed')return mailJob(record,'notification','payment_failed',`${id}:failed:${record.checkout.reference}`);
        // A gateway wait is not a settled payment. Notify only after a verified, sustained wait.
        if(emailCollectionEnabled&&record.payment.status==='pending'&&Number.isSafeInteger(record.checkout.createdAt)&&clock()-record.checkout.createdAt>=15*60000)
          return mailJob(record,'notification','payment_pending',`${id}:pending:${record.checkout.reference}`);
        return null;
      });
      if(['paid','test_paid'].includes(next.payment.status)) {
        if(usesFullPrepayment(next))try{await reminders.cancel(id);}catch{}
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
    async confirmAppointment(id:string,{holdExpiresAt,operatorId,expectedRevision,notifyPaymentReady=false,billingPeriod}:{holdExpiresAt?:string;operatorId:string;expectedRevision?:number;notifyPaymentReady?:boolean;billingPeriod?:any}) {
      if(!operatorId || (holdExpiresAt!==undefined&&(!Number.isFinite(Date.parse(holdExpiresAt)) || Date.parse(holdExpiresAt)<=clock() || Date.parse(holdExpiresAt)>clock()+7*86400000)))throw new BookingError('INVALID_HOLD');
      const saved=await store.mutateWithMail(id,record=>{
        if(expectedRevision!==undefined&&record.revision!==expectedRevision)throw new BookingError('BOOKING_CHANGED',409);
        const confirmedAt=clock(),start=validateAppointment(record.scheduling.date,record.scheduling.time,confirmedAt);
        if(['cancelled','expired','completed'].includes(record.status)||record.quote.totalCents===null||record.quote.manualReviewReasons.length)throw new BookingError('MANUAL_REVIEW_REQUIRED',409);
        if(record.checkout)throw new BookingError('CHECKOUT_ALREADY_STARTED',409);
        if(usesFullPrepayment(record)){
          if(record.confirmedAt)throw new BookingError('BOOKING_ALREADY_CONFIRMED',409);
          let monthly;
          if(isMonthlySelection(record.selection)){
            try{monthly=monthlyBillingPeriod(billingPeriod,record.quote.totalCents,record.scheduling.date);}catch{throw new BookingError('BILLING_PERIOD_REQUIRED');}
          }else if(billingPeriod!==undefined)throw new BookingError('INVALID_BILLING_PERIOD');
          const total=monthly?.totalCents??record.quote.totalCents;
          const due=new Date(fullPaymentDeadline(confirmedAt,start)).toISOString();
          return {...record,status:'confirmed',mode,confirmedAt,confirmedBy:operatorId,revision:record.revision+1,
            ...(record.coverageReview==='outside'?{coverageReviewedAt:confirmedAt,coverageReviewedBy:operatorId}:{}),
            payment:{...record.payment,status:'awaiting_payment',totalDueCents:total,initialChargeCents:total,amountDueNowCents:total,outstandingCents:total,paymentDueAt:due,checkoutAvailableUntil:new Date(start).toISOString(),...(monthly?{billingPeriod:{...monthly,confirmedAt,confirmedBy:operatorId}}:{})},
            ...(notifyPaymentReady?{email:{...record.email,payment_ready:'queued'}}:{}),scheduling:{...record.scheduling,status:'confirmed'}};
        }
        const currentTerms=usesTermsPaymentDeadline(record);
        if(!currentTerms&&holdExpiresAt===undefined)throw new BookingError('INVALID_HOLD');
        const deadline=currentTerms?new Date(depositPaymentDeadline(confirmedAt,start)).toISOString():holdExpiresAt!;
        return {...record,status:'confirmed',mode,confirmedAt,confirmedBy:operatorId,revision:record.revision+1,...(currentTerms?{payment:{...record.payment,depositDueAt:deadline}}:{}),...(notifyPaymentReady?{email:{...record.email,payment_ready:'queued'}}:{}),scheduling:{...record.scheduling,status:'held',holdExpiresAt:deadline}};
      },record=>{
        const jobs:any[]=[];
        if(notifyPaymentReady)jobs.push(mailJob(record,'payment_ready','payment_requested',`${id}:availability:${record.revision}`,`${id}:payment-ready:${record.revision}`,usesFullPrepayment(record)?{paymentDueAt:record.payment.paymentDueAt}:{}));
        if(usesFullPrepayment(record)){
          const reminderAt=Date.parse(record.payment.paymentDueAt)-24*3600000;
          if(reminderAt>clock())jobs.push({...mailJob(record,'payment_reminder','payment_requested',`${id}:payment-reminder:${record.revision}`,`${id}:payment-reminder:${record.revision}`,{paymentDueAt:record.payment.paymentDueAt,paymentReminder:true,pricing:{currency:'CHF',priceType:record.quote.priceType==='estimate'?'estimate':'fixed',totalRappen:record.payment.totalDueCents,paidRappen:record.payment.amountPaidCents,vatRappen:0,transactionRappen:record.payment.outstandingCents}}),dueAt:reminderAt,paymentDueAt:record.payment.paymentDueAt});
        }
        return jobs;
      });
      if(usesFullPrepayment(saved))try{await reminders.schedule(id);}catch{}
      return await store.get(id)||saved;
    },
    /** Private commercial approval; the customer must accept the resulting revision in checkout. */
    async approveManualQuote(id:string,{totalCents,scopeNotes,scopeLanguage,operatorId,expectedRevision}:{totalCents:number;scopeNotes:string;scopeLanguage?:string;operatorId:string;expectedRevision?:number}) {
      if(!operatorId || !Number.isSafeInteger(totalCents)||totalCents<=0||totalCents>100000000)throw new BookingError('INVALID_APPROVED_PRICE');
      const scope=string(scopeNotes,4000,'INVALID_SCOPE',10);
      if(emailCollectionEnabled&&!scopeLanguage)throw new BookingError('SCOPE_LANGUAGE_REQUIRED');
      const reviewedLanguage=scopeLanguage?language(scopeLanguage):undefined;
      return store.mutateWithMail(id,record=>{
        if(expectedRevision!==undefined&&record.revision!==expectedRevision)throw new BookingError('BOOKING_CHANGED',409);
        if(record.checkout || !record.quote.manualReviewReasons.length || ['cancelled','expired','completed'].includes(record.status))throw new BookingError('MANUAL_QUOTE_NOT_AVAILABLE',409);
        if(emailCollectionEnabled&&reviewedLanguage!==record.language)throw new BookingError('SCOPE_LANGUAGE_MISMATCH');
        if(usesFullPrepayment(record)&&totalCents<(record.quote.fromPriceCents||0))throw new BookingError('INVALID_APPROVED_PRICE');
        const {fromPriceCents,depositBasisCents,minimumChargeCents,totalPayableCents,...previousQuote}=record.quote;
        return {...record,originalQuote:record.quote,scopeNotes:scope,...(reviewedLanguage?{scopeContentLanguage:reviewedLanguage}:{}),quote:{...previousQuote,lines:[{id:'approved-manual-quote',label:scope,labelKey:'approvedManualQuote',quantity:1,unit:'package',unitPriceCents:totalCents,totalCents}],subtotalCents:totalCents,totalCents,priceType:'fixed',...(usesFullPrepayment(record)?{minimumChargeCents:totalCents,totalPayableCents:totalCents}:{depositBasisCents:totalCents}),vatComparisonCents:null,manualReviewReasons:[]},quoteRevision:record.quoteRevision+1,revision:record.revision+1,priceApprovedBy:operatorId,priceApprovedAt:clock(),payment:{...record.payment,...(usesFullPrepayment(record)?{totalDueCents:totalCents,amountDueNowCents:totalCents,outstandingCents:totalCents}:{amountDueNowCents:Math.round(totalCents*DEPOSIT_PERCENT/100),remainingBalanceCents:totalCents})}};
      },record=>emailCollectionEnabled?mailJob(record,'notification','quote_ready',`${id}:quote:${record.quoteRevision}`):null);
    },
    /** Staff records actual billable work; the tariff and minimum stay server-owned. */
    async settleWork(id:string,{actualHours,expectedRevision,operatorId}:{actualHours:number;expectedRevision:number;operatorId:string}) {
      return store.mutate(id,record=>{
        if(!usesFullPrepayment(record))throw new BookingError('LEGACY_BOOKING_REVIEW_REQUIRED',409);
        if(record.workSettlement){if(record.workSettlement.actualHours===actualHours)return record;throw new BookingError('WORK_ALREADY_SETTLED',409);}
        if(!operatorId||record.revision!==expectedRevision)throw new BookingError('BOOKING_CHANGED',409);
        if(!['paid','test_paid'].includes(record.payment.status)||record.quote.priceType!=='estimate'||['cancelled','expired'].includes(record.status))throw new BookingError('WORK_SETTLEMENT_NOT_AVAILABLE',409);
        let result;try{result=settledHourlyQuote(record.selection,actualHours,record.payment.billingPeriod?.visits||1);}catch{throw new BookingError('INVALID_ACTUAL_HOURS');}
        const netPaid=record.payment.amountPaidCents-(record.payment.refundedCents||0);
        const workSettlement={...result,extraDueCents:Math.max(0,result.finalTotalCents-netPaid),refundDueCents:Math.max(0,netPaid-result.finalTotalCents),scope:record.payment.billingMode==='monthly'?'billing_period':'single_visit',settledAt:clock(),settledBy:operatorId};
        return {...record,status:'completed',scheduling:{...record.scheduling,status:'completed'},revision:record.revision+1,workSettlement,payment:{...record.payment,outstandingCents:workSettlement.extraDueCents}};
      });
    },
    /** One durable additional gateway per settled scope; ambiguous creation never starts another charge. */
    async createExtraPayment(id:string,{expectedRevision,operatorId}:{expectedRevision:number;operatorId:string}) {
      if(!payment)throw new BookingError('PAYMENT_NOT_CONFIGURED',503);
      const attempt=crypto.randomUUID();
      const claimed=await store.mutate(id,record=>{
        if(!usesFullPrepayment(record)||!operatorId)throw new BookingError('EXTRA_PAYMENT_NOT_AVAILABLE',409);
        if(record.payment.extraPayment){if(record.payment.extraPayment.link)return record;throw new BookingError('PAYMENT_RECONCILIATION_REQUIRED',409);}
        if(record.revision!==expectedRevision)throw new BookingError('BOOKING_CHANGED',409);
        if(!record.workSettlement?.extraDueCents||!['paid','test_paid'].includes(record.payment.status)||record.status!=='completed')throw new BookingError('EXTRA_PAYMENT_NOT_AVAILABLE',409);
        const extraPayment={amountCents:record.workSettlement.extraDueCents,status:'creating',reference:`${id}-extra-r${record.revision}`,createdAt:clock(),dueAt:new Date(clock()+7*86400000).toISOString(),attempt,createdBy:operatorId};
        return {...record,revision:record.revision+1,payment:{...record.payment,extraPayment}};
      });
      if(claimed.payment.extraPayment.link)return claimed;
      const extra=claimed.payment.extraPayment;
      if(extra.attempt!==attempt)throw new BookingError('PAYMENT_RECONCILIATION_REQUIRED',409);
      const providerRecord={...claimed,checkout:{reference:extra.reference,expiresAt:Date.parse(extra.dueAt)},payment:{...claimed.payment,amountDueNowCents:extra.amountCents,paymentKind:'extra'}};
      try{
        const gateway=await payment.create(providerRecord,token(id),Math.floor((Date.parse(extra.dueAt)-clock())/60000),claimed.language);
        const saved=await store.mutateWithMail(id,current=>{
          if(current.payment.extraPayment?.attempt!==attempt)throw new BookingError('PAYMENT_MISMATCH',409);
          return {...current,revision:current.revision+1,payment:{...current.payment,extraPayment:{...current.payment.extraPayment,gatewayId:gateway.id,link:gateway.link,status:'pending'}}};
        },record=>mailJob(record,'extra_payment_ready','payment_requested',extra.reference,`${id}:extra-payment:${extra.reference}`,{extraPayment:true,paymentDueAt:extra.dueAt,pricing:{currency:'CHF',priceType:'fixed',totalRappen:record.workSettlement.finalTotalCents,paidRappen:record.payment.amountPaidCents,vatRappen:0,transactionRappen:extra.amountCents}}));
        try{await service.runDue({jobId:`${id}:extra-payment:${extra.reference}`,limit:1});}catch{}
        return saved;
      }catch{
        await store.mutate(id,current=>current.payment.extraPayment?.attempt===attempt&&current.payment.extraPayment.status==='creating'?{...current,payment:{...current.payment,extraPayment:{...current.payment.extraPayment,status:'unknown'}}}:current);
        throw new BookingError('PAYMENT_RECONCILIATION_REQUIRED',503);
      }
    },
    async reconcileExtra(id:string) {
      const record=await store.get(id),extra=record?.payment.extraPayment;
      if(!usesFullPrepayment(record)||!extra?.gatewayId||!payment)throw new BookingError('PAYMENT_NOT_STARTED',409);
      const result=await payment.verify({...record,checkout:{reference:extra.reference,gatewayId:extra.gatewayId},payment:{...record.payment,amountDueNowCents:extra.amountCents}});
      const saved=await store.mutateWithMail(id,current=>{
        if(current.payment.extraPayment?.reference!==extra.reference)throw new BookingError('PAYMENT_MISMATCH',409);
        if(['paid','test_paid'].includes(current.payment.extraPayment.status))return current;
        const paid=['paid','test_paid'].includes(result.status),amount=current.payment.amountPaidCents+(paid?extra.amountCents:0);
        return {...current,revision:current.revision+1,payment:{...current.payment,amountPaidCents:amount,outstandingCents:Math.max(0,current.workSettlement.finalTotalCents-amount+(current.payment.refundedCents||0)),extraPayment:{...current.payment.extraPayment,status:result.status,transactionId:result.transactionId,lastVerifiedAt:clock()}}};
      },current=>['paid','test_paid'].includes(current.payment.extraPayment.status)?mailJob(current,'receipt','payment_received',extra.reference,`${id}:extra-receipt:${extra.reference}`,{pricing:{currency:'CHF',priceType:'fixed',totalRappen:current.workSettlement.finalTotalCents,paidRappen:current.payment.amountPaidCents,vatRappen:0,transactionRappen:extra.amountCents},paymentStatus:'settled'}):null);
      if(['paid','test_paid'].includes(saved.payment.extraPayment.status))try{await service.runDue({jobId:`${id}:extra-receipt:${extra.reference}`,limit:1});}catch{}
      return saved;
    },
    async cancel(id:string,{expectedRevision,operatorId}:{expectedRevision:number;operatorId:string}) {
      const saved=await store.mutateWithMail(id,record=>{
        if(!usesFullPrepayment(record))throw new BookingError('LEGACY_BOOKING_REVIEW_REQUIRED',409);
        if(record.status==='cancelled')return record;
        if(!operatorId||record.revision!==expectedRevision)throw new BookingError('BOOKING_CHANGED',409);
        if(record.status==='completed')throw new BookingError('BOOKING_ALREADY_COMPLETED',409);
        return {...record,status:'cancelled',cancelledAt:clock(),cancelledBy:operatorId,revision:record.revision+1,scheduling:{...record.scheduling,status:'cancelled'}};
      },record=>mailJob(record,'notification','cancellation_confirmed',`${id}:cancelled:${record.cancelledAt}`));
      try{await reminders.cancel(id);}catch{}
      if(saved.recoveryId&&recoveryService)await recoveryService.stopDraft(saved.recoveryId,'cancelled');
      return saved;
    },
    /** A refund is recorded only after an authenticated provider read proves its cumulative amount. */
    async refund(id:string,{expectedRevision,amountCents,idempotencyKey,operatorId}:{expectedRevision:number;amountCents:number;idempotencyKey:string;operatorId:string}) {
      if(!payment?.refund||!payment?.verifyRefund)throw new BookingError('REFUND_NOT_CONFIGURED',503);
      if(!Number.isSafeInteger(amountCents)||amountCents<=0||typeof idempotencyKey!=='string'||!/^[A-Za-z0-9_-]{16,128}$/.test(idempotencyKey)||!operatorId)throw new BookingError('INVALID_REFUND');
      const attempt=crypto.randomUUID();
      const claimed=await store.mutate(id,record=>{
        if(!usesFullPrepayment(record))throw new BookingError('LEGACY_BOOKING_REVIEW_REQUIRED',409);
        const previous=(record.payment.refunds||[]).find((job:any)=>job.idempotencyKey===idempotencyKey);
        if(previous){if(previous.amountCents!==amountCents)throw new BookingError('IDEMPOTENCY_CONFLICT',409);return record;}
        if(record.revision!==expectedRevision)throw new BookingError('BOOKING_CHANGED',409);
        if((record.payment.refunds||[]).some((job:any)=>['creating','pending','unknown'].includes(job.status)))throw new BookingError('REFUND_RECONCILIATION_REQUIRED',409);
        const available=record.status==='cancelled'?cancellationQuote(record)?.refundCents:record.workSettlement?Math.max(0,record.payment.amountPaidCents-(record.payment.refundedCents||0)-record.workSettlement.finalTotalCents):0;
        if(!available||amountCents>available||!record.payment.transactionId)throw new BookingError('INVALID_REFUND_AMOUNT',409);
        const job={idempotencyKey,amountCents,status:'creating',attempt,createdAt:clock(),createdBy:operatorId,targetRefundedCents:(record.payment.refundedCents||0)+amountCents};
        return {...record,revision:record.revision+1,payment:{...record.payment,refunds:[...(record.payment.refunds||[]),job]}};
      });
      const operation=claimed.payment.refunds.find((job:any)=>job.idempotencyKey===idempotencyKey);
      if(operation.status==='verified')return claimed;
      try{
        if(operation.attempt===attempt)await payment.refund(claimed,amountCents);
        const verified=await payment.verifyRefund(claimed,operation.targetRefundedCents);
        if(!verified.verified)return await store.mutate(id,current=>({...current,payment:{...current.payment,refunds:current.payment.refunds.map((job:any)=>job.idempotencyKey===idempotencyKey?{...job,status:'pending'}:job)}}));
        return await store.mutateWithMail(id,current=>{
          const refundedCents=Math.max(current.payment.refundedCents||0,verified.refundedCents);
          return {...current,revision:current.revision+1,payment:{...current.payment,refundedCents,status:refundedCents>=current.payment.amountPaidCents?'refunded':'partially_refunded',outstandingCents:Math.max(0,(current.status==='cancelled'?(cancellationQuote(current)?.retainedCents||0):((current.workSettlement?.finalTotalCents??current.payment.totalDueCents)||0))-(current.payment.amountPaidCents-refundedCents)),refunds:current.payment.refunds.map((job:any)=>job.idempotencyKey===idempotencyKey?{...job,status:'verified',verifiedAt:clock(),providerId:verified.id}:job)}};
        },record=>mailJob(record,'notification','refund_issued',`${id}:refund:${idempotencyKey}`,undefined,{paymentStatus:'refund_accepted',pricing:{currency:'CHF',totalRappen:record.payment.totalDueCents||record.quote.totalCents,paidRappen:record.payment.amountPaidCents,vatRappen:0,refundRappen:amountCents}}));
      }catch{
        await store.mutate(id,current=>({...current,payment:{...current.payment,refunds:current.payment.refunds.map((job:any)=>job.idempotencyKey===idempotencyKey&&job.status!=='verified'?{...job,status:'unknown'}:job)}}));
        throw new BookingError('REFUND_RECONCILIATION_REQUIRED',503);
      }
    },
    async changeEmailLanguage(id:string,access:string,input:any) {
      const record=await authenticated(id,access);
      const snapshot=selectedEmailSnapshot(language(input?.language));
      const next=await store.updateLanguageAndPending(id,snapshot,clock(),notification=>({
        ...notification,languageSnapshot:snapshot,
        ...(notification.renderData?.termsSummary?{renderData:{...notification.renderData,
          // Translate presentation only; the stored acceptance language/version and event stay intact.
          termsSummary:notificationForBooking({...record,language:snapshot.language,languageSnapshot:snapshot},notification.templateId,notification.eventId).renderData.termsSummary,
        }}:{}),
      }));
      return view(next);
    },
    async resolveBookingForRecovery(id:string,email:string) {
      const record=await store.get(id);if(!record || record.customer.email!==email)return null;
      return {bookingId:id,publicToken:token(id),email,mode:record.mode,status:record.status,canCheckout:canCheckout(record),paymentStatus:record.payment.status,holdExpiresAt:usesFullPrepayment(record)?record.payment.checkoutAvailableUntil:record.scheduling.holdExpiresAt};
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
        const record=job.bookingId?await store.get(job.bookingId):null;
        const fullFinancial=usesFullPrepayment(record)&&(['payment_ready','payment_reminder','extra_payment_ready','receipt'].includes(job.kind)||['refund_issued','payment_requested','payment_pending','payment_failed','booking_confirmed','appointment_reminder'].includes(job.notification?.templateId));
        if(!fullFinancial&&!emailCollectionEnabled&&job.kind!=='payment_ready'&&job.accessProvider!=='firebase'&&(job.kind==='notification'||job.prepared?.notificationId)){await store.finishMail(job.id,'cancelled',null);continue;}
        if(!fullFinancial&&emailCollectionEnabled&&!paymentNotificationsEnabled&&job.kind==='receipt'){await store.finishMail(job.id,'cancelled',null);continue;}
        if(job.kind==='customer_access' && ((!job.message&&job.accessProvider!=='firebase') || job.expiresAt<=clock())) {await store.finishMail(job.id,'cancelled',null);continue;}
        if(!eligibleNotification(record,job)){await store.finishMail(job.id,'cancelled',null);continue;}
        const recipient=job.email||record.customer.email;
        if(await store.isEmailSuppressed(recipient)) {await store.finishMail(job.id,'cancelled',null);if(record&&job.kind!=='customer_access')await store.mutate(record.bookingId,current=>({...current,email:{...current.email,[job.kind]:'failed'}}));continue;}
        let providerAttempted=false;
        try {
          let message=job.prepared;
          if(!message) {
            if(fullFinancial||emailCollectionEnabled||job.kind==='payment_ready'||job.accessProvider==='firebase') {
              if(!job.notification)throw Object.assign(new Error('EMAIL_SNAPSHOT_REVIEW_REQUIRED'),{definitelyNotSent:true});
              let links=job.kind==='customer_access'?job.authorisedLinks:job.kind==='extra_payment_ready'?{primary:record.payment.extraPayment.link,secondary:bookingEmailLinks(record,job.notification,origin,token(record.bookingId)).primary}:bookingEmailLinks(record,job.notification,origin,token(record.bookingId));
              if(job.accessProvider==='firebase') {
                if(!createCustomerAccessLink||job.notification.templateId!=='magic_link'||job.notification.renderData.accessType!=='firebase_email_link')throw Object.assign(new Error('EMAIL_PREPARATION_FAILED'),{definitelyNotSent:true});
                const locale=languageForBackgroundEmail(job.notification.languageSnapshot);
                const primary=await createCustomerAccessLink(recipient,locale);
                links={primary,secondary:new URL(`/kontakt?lang=${locale}`,origin).href};
              }
              message=prepareCustomerEnvelope(job.notification,links,origin);
              // Keep the old stable job/provider key across a renderer rollout.
              message={...message,idempotencyKey:`kraken-booking:${job.id}`};
            } else {
              const rendered=job.kind==='customer_access'?job.message:renderBookingEmail(record,job.kind,origin,token(record.bookingId));
              message={from:sender,to:job.email||record.customer.email,...rendered,idempotencyKey:`kraken-booking:${job.id}`};
            }
            if(typeof store.prepareMail==='function')message=await store.prepareMail(job.id,message,clock(),job.expiresAt);
            else if(fullFinancial||emailCollectionEnabled||job.accessProvider==='firebase')throw Object.assign(new Error('EMAIL_PREPARATION_STORE_REQUIRED'),{definitelyNotSent:true});
            if(!message)continue;
          }
          if(job.preparedExpiresAt&&job.preparedExpiresAt<=clock()){await store.finishMail(job.id,'cancelled',null);continue;}
          if(await store.isEmailSuppressed(message.to)){await store.finishMail(job.id,'cancelled',null);continue;}
          if(!eligibleNotification(job.bookingId?await store.get(job.bookingId):null,job)){await store.finishMail(job.id,'cancelled',null);continue;}
          providerAttempted=true;
          const accepted=await sendEmail(message);
          await store.finishMail(job.id,'sent',accepted.id);
          if(job.kind!=='customer_access')await store.mutate(record.bookingId,current=>({...current,email:{...current.email,[job.kind]:'sent'}}));
          sent++;
        } catch(cause:any) {
          // Rendering/credential-link/storage failures happen before transport.
          // They need review, not an invented language or an unknown delivery.
          const failure=providerAttempted?cause:{code:cause?.code,message:cause?.message,definitelyNotSent:true,retryable:false};
          const definitive=failure?.definitelyNotSent===true;
          const attempts=Number.isSafeInteger(job.attempts)?job.attempts:1;
          const retry=definitive&&failure?.retryable===true&&attempts<3;
          const status=retry?'queued':definitive?'failed':'delivery_unknown';
          const retryAfterMs=Number.isSafeInteger(cause?.retryAfterMs)&&cause.retryAfterMs>=0?cause.retryAfterMs:0;
          await store.finishMail(job.id,status,null,retry?clock()+Math.max(15*60000,retryAfterMs):undefined,safeMailFailure(failure,clock()));
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
  let operatorAuth:Promise<import('firebase-admin/auth').Auth>|null=null;
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
      const providerEmail=emailReady?createResendEmailAdapter(env.RESEND_API_KEY!,fetcher,clock):null;
      // Full access is isolated to reminder scheduling/cancellation. Ordinary mail always uses the sending-only key.
      const schedulingEmail=emailReady&&env.RESEND_SCHEDULING_API_KEY?.trim()?createResendEmailAdapter(env.RESEND_SCHEDULING_API_KEY,fetcher,clock):null;
      const sendEmail=providerEmail?Object.assign(async(message:any)=>{if(await store.isEmailSuppressed(message.to)){const error:any=new BookingError('EMAIL_SUPPRESSED');error.definitelyNotSent=true;throw error;}return providerEmail(message);},{
        schedule:async(message:any,scheduledAt:string)=>{if(!schedulingEmail)throw new BookingError('EMAIL_SCHEDULE_NOT_CONFIGURED',503);if(await store.isEmailSuppressed(message.to))throw new BookingError('EMAIL_SUPPRESSED');return schedulingEmail.schedule(message,scheduledAt);},
        cancel:async(id:string)=>{if(!schedulingEmail)throw new BookingError('EMAIL_SCHEDULE_NOT_CONFIGURED',503);return schedulingEmail.cancel(id);},
        canSchedule:()=>schedulingEmail?schedulingEmail.canSchedule():Promise.resolve(false),
      }):null;
      const emailCollection=collectionConfiguration(env,origin);
      const service=createBookingService({store,tokenSecret:secret,origin,mode,payment,sendEmail,sender:env.BOOKING_EMAIL_FROM,clock,emailCollectionEnabled:emailCollection.enabled,paymentNotificationsEnabled:env.BOOKING_EMAIL_COLLECTION_PAYMENTS_ENABLED==='true'});
      const remindersEnabled=env.BOOKING_RECOVERY_REMINDERS_ENABLED==='true'&&(env.RESEND_WEBHOOK_SECRET||'').length>=32&&Boolean(suppressionScope(env));
      const recovery=emailReady&&(env.RECOVERY_TOKEN_SECRET||'').length>=32&&(env.CRON_SECRET||'').length>=32?createRecoveryService({store:createFirestoreRecoveryStore(db),calculatePrice,sendEmail,resolveBookingForRecovery:service.resolveBookingForRecovery,publicBaseUrl:origin,sender:env.BOOKING_EMAIL_FROM!,tokenSecret:env.RECOVERY_TOKEN_SECRET!,remindersEnabled,emailCollection,clock}):null;
      const customerAccess=env.BOOKING_CUSTOMER_ACCESS_ENABLED==='true'&&emailReady&&Boolean(recovery);
      let auth=null;
      if(customerAccess){
        phase='sdk_auth_import';
        const {getAuth}=await import('firebase-admin/auth');
        phase='auth';
        auth=getAuth(app);
        service.setCustomerAccessLink((email,locale)=>firebaseCustomerAccessLink(auth,email,locale,origin,firebaseConfig.authDomain));
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
  const getOperatorAuth=()=>operatorAuth||=(async()=>{
    const runtime=await initialize();if(!runtime.service)throw new BookingError('BOOKING_NOT_CONFIGURED',503);
    const {getApps}=await import('firebase-admin/app'),{getAuth}=await import('firebase-admin/auth');
    const app=getApps().find(value=>value.name==='kraken-booking');if(!app)throw new BookingError('BOOKING_NOT_CONFIGURED',503);
    return getAuth(app);
  })().catch(error=>{operatorAuth=null;throw error;});
  const operator=createBookingOperatorHandler({getRuntime:initialize,getAuth:getOperatorAuth,validCapture:(req,runtime)=>Boolean(cookieSession(req.get('cookie')||'',runtime.secret,clock())),clock});
  let accessRecovery:any=null;
  const recoveryOptions=(runtime:Runtime)=>({secret:runtime.secret,origin:runtime.origin,store:runtime.store!,resolveBookingAccess:(id:string)=>runtime.service!.browserAccess(id),clock});
  const recoveryAccess=(runtime:Runtime)=>accessRecovery||=createBookingAccessRecovery(recoveryOptions(runtime));
  async function middleware(req:Request,res:Response,next:any) {
    if(!/^\/api\/(?:booking(?:\/|$)|bookings\/activity|recovery\/|customer\/)/.test(req.path)&&req.path!=='/recovery/unsubscribe')return next();
    privateResponse(res);
    try {
      if(req.path.startsWith('/api/booking/operator/'))return await operator(req,res,next);
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
      let verifiedMissingOrigin=false;
      if(req.method!=='GET') {
        if(req.get('Origin')!==runtime.origin){
          let proof:ReturnType<typeof missingOriginRequestProof>|undefined;
          if(req.get('Origin')===undefined){
            let cookieValid=false;
            try{cookieValid=Boolean(cookieSession(req.get('cookie')||'',runtime.secret,clock()));}catch{}
            proof=missingOriginRequestProof(req,runtime.origin,cookieValid);
            verifiedMissingOrigin=proof.allowed;
          }
          if(!verifiedMissingOrigin){logRecoveryOriginRejection(req,'booking',proof?.evidence);throw new BookingError('ORIGIN_NOT_ALLOWED',403);}
        }
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
        return res.json({available:Boolean(runtime.service),paymentReady:runtime.paymentReady,emailReady:runtime.emailReady,mode:runtime.mode,termsVersion:BOOKING_TERMS_VERSION,termsDocuments:currentTermsDocuments(),paymentModel:'full_prepayment',scheduledRemindersReady:runtime.service?await runtime.service.remindersReady():false});
      }
      if(req.path.startsWith('/api/recovery/')||req.path==='/api/bookings/activity'||req.path==='/recovery/unsubscribe') {
        const headers=new Headers();for(const [key,value]of Object.entries(req.headers))if(typeof value==='string')headers.set(key,value);
        // The standalone recovery adapter keeps its exact-Origin gate. Supply
        // the configured origin only after this request's first-party proof passed.
        if(verifiedMissingOrigin)headers.set('Origin',runtime.origin);
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
        res.setHeader('Set-Cookie',issueBookingBrowserCookie({bookingId:created.bookingId,secret:runtime.secret,now:clock()}));
        return res.status(201).json(result);
      }
      if(req.method==='POST'&&['/api/booking/access-requests','/api/booking/link-access','/api/booking/browser-access'].includes(req.path)){
        const access=recoveryAccess(runtime);
        if(req.path==='/api/booking/access-requests'){
          if(!runtime.emailReady)throw new BookingError('EMAIL_NOT_CONFIGURED',503);
          const result=await pinnedAccessRequest({schedule:schedulePaymentEmails,
            request:dispatchMail=>createBookingAccessRecovery({...recoveryOptions(runtime),dispatchMail}).requestAccess(req.body,{rateKey:remote}),
            dispatch:jobId=>runtime.service!.runDue({jobId,limit:1}),onDispatchError:()=>console.warn('[booking:email-dispatch]',{phase:'access'})});
          return res.status(202).json(result);
        }
        const pair=req.path==='/api/booking/link-access'?await access.redeemLink(req.body):await access.redeemBrowserAccess({...req.body,cookieHeader:req.get('cookie')||''});
        if(req.path==='/api/booking/link-access'&&!redeemBookingBrowserCookie({bookingId:pair.id,cookieHeader:req.get('cookie')||'',secret:runtime.secret,now:clock()}))res.setHeader('Set-Cookie',issueBookingBrowserCookie({bookingId:pair.id,secret:runtime.secret,now:clock()}));
        return res.json(pair);
      }
      const match=/^\/api\/booking\/requests\/([A-Za-z0-9_-]{1,128})(\/(?:checkout|language))?$/.exec(req.path);
      if(match) {
        if(req.method==='GET'&&!match[2]){
          if(req.get('X-Kraken-Browser-Access')==='establish'){
            await runtime.service.authenticated(match[1],bearer(req));
            if(!redeemBookingBrowserCookie({bookingId:match[1],cookieHeader:req.get('cookie')||'',secret:runtime.secret,now:clock()}))res.setHeader('Set-Cookie',issueBookingBrowserCookie({bookingId:match[1],secret:runtime.secret,now:clock()}));
          }
          return res.json(await runtime.service.read(match[1],bearer(req)));
        }
        if(req.method==='POST'&&match[2]==='/checkout')return res.json(await runtime.service.checkout(match[1],bearer(req),req.body));
        if(req.method==='PATCH'&&match[2]==='/language')return res.json(await runtime.service.changeEmailLanguage(match[1],bearer(req),req.body));
        throw new BookingError('METHOD_NOT_ALLOWED',405);
      }
      if(req.path==='/api/customer/access'&&req.method==='POST') {
        if(!runtime.customerAccess||!runtime.recovery)throw new BookingError('CUSTOMER_ACCESS_NOT_CONFIGURED',503);
        if(!validEmail(req.body?.email))throw new BookingError('INVALID_EMAIL');
        const email=req.body.email.trim().toLowerCase(),locale=language(req.body.language);
        const idempotencyKey=string(req.body.idempotencyKey,128,'INVALID_IDEMPOTENCY_KEY',16);
        if(!/^[A-Za-z0-9_-]+$/.test(idempotencyKey))throw new BookingError('INVALID_IDEMPOTENCY_KEY');
        const draft=await runtime.recovery.read(req.body.recovery?.id,req.body.recovery?.accessToken);
        if(draft.email!==email)throw new BookingError('RECOVERY_EMAIL_MISMATCH',403);
        if(await runtime.store.isEmailSuppressed(email))throw new BookingError('EMAIL_SUPPRESSED',409);
        const job=customerAccountAccessJob({draftId:draft.id,email,language:locale,idempotencyKey,now:clock()});
        if(!await runtime.store.getMail(job.id)) {
          if(!await runtime.store.consumeRate(`access:${digest(email)}`,clock(),86400000,3))throw new BookingError('TOO_MANY_REQUESTS',429);
          await runtime.store.addMail(job);
        }
        // Persist before generating the provider link, then dispatch only this
        // request. Firebase verifies ownership; queueing creates no account.
        await runtime.service.runDue({jobId:job.id,limit:1});
        const mail=await runtime.store.getMail(job.id);
        if(!mail||['failed','cancelled'].includes(mail.status))throw new BookingError('CUSTOMER_ACCESS_UNAVAILABLE',503);
        return res.status(202).json({status:'queued',mailStatus:mail.status});
      }
      if(req.path==='/api/customer/bookings'&&req.method==='GET') {
        if(!runtime.customerAccess)throw new BookingError('CUSTOMER_ACCESS_NOT_CONFIGURED',503);
        const claims=await runtime.auth.verifyIdToken(bearer(req),true).catch(()=>null);
        if(claims?.email_verified!==true||!validEmail(claims.email))throw new BookingError('UNAUTHORIZED',401);
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
      const match=/^([A-Za-z0-9_-]{24})-(r\d+|extra-r\d+)$/.exec(reference||'');
      if(!match)throw new BookingError('UNKNOWN_REFERENCE',404);
      if(match[2].startsWith('extra-'))await runtime.service.reconcileExtra(match[1]);else await runtime.service.reconcile(match[1],{scheduleEmails:schedulePaymentEmails});
      return res.json({received:true});
    }catch(cause){return res.status(cause instanceof BookingError?cause.status:503).json({code:cause instanceof BookingError?cause.code:'PAYMENT_VERIFICATION_UNAVAILABLE'});}
  };
  const emailWebhook:RequestHandler=async(req,res)=>{
    privateResponse(res);
    try {
      const runtime=await initialize();
      const domain=suppressionScope(env);
      if(!runtime.store||!env.RESEND_WEBHOOK_SECRET||!domain)throw new BookingError('EMAIL_WEBHOOK_NOT_CONFIGURED',503);
      const {id,event}=verifyResendWebhook(req.body,{'svix-id':req.get('svix-id')||'','svix-timestamp':req.get('svix-timestamp')||'','svix-signature':req.get('svix-signature')||''},env.RESEND_WEBHOOK_SECRET);
      return res.json(await applyVerifiedSuppression({event,id,fingerprint:digest(req.body.toString('utf8')),domain,store:runtime.store,recovery:runtime.recovery,now:clock()}));
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
