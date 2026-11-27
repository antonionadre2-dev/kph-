import crypto from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';
import { mailRetryBlock } from './booking-mail-safety.ts';

export const digest = (value:string) => crypto.createHash('sha256').update(value).digest('hex');
const clean = <T>(value:T):T => JSON.parse(JSON.stringify(value));
export class BookingError extends Error { constructor(public code:string, public status=400) { super(code); } }

/** Only Admin SDK calls may access this namespace. All idempotency/leases are durable. */
export function createFirestoreBookingStore(db:Firestore) {
  const bookings=db.collection('kraken_bookings');
  const keys=db.collection('kraken_booking_idempotency');
  const outbox=db.collection('kraken_booking_outbox');
  const rate=db.collection('kraken_booking_rates');
  const emailSuppressions=db.collection('kraken_booking_email_suppressions');
  const emailEvents=db.collection('kraken_booking_email_events');
  return {
    async get(id:string):Promise<any> { return (await bookings.doc(id).get()).data() || null; },
    async listForOperator(reference?:string){
      const query=reference?bookings.where('reference','==',reference).limit(25):bookings.orderBy('createdAt','desc').limit(25);
      return (await query.get()).docs.map(row=>row.data());
    },
    async findByReferenceEmail(reference:string,email:string){
      const result=await bookings.where('reference','==',reference).where('customer.email','==',email).limit(1).get();
      return result.empty?null:result.docs[0].data();
    },
    async listMailForBooking(id:string){return (await outbox.where('bookingId','==',id).limit(50).get()).docs.map(row=>row.data());},
    async requeueFailedMail(bookingId:string,jobId:string,expectedAttempts:number,operatorId:string,now:number){
      return db.runTransaction(async tx=>{
        const ref=outbox.doc(digest(jobId)),job=(await tx.get(ref)).data(),bookingRef=bookings.doc(bookingId),record=(await tx.get(bookingRef)).data();
        if(!record||!job||job.bookingId!==bookingId)throw new BookingError('BOOKING_NOT_FOUND',404);
        const suppressed=(await tx.get(emailSuppressions.doc(digest(record.customer.email)))).exists;
        if(job.attempts!==expectedAttempts)throw new BookingError('EMAIL_STATE_CHANGED',409);
        const reason=mailRetryBlock(job,record,suppressed);if(reason)throw new BookingError(reason,409);
        tx.update(ref,{status:'queued',dueAt:now,leaseUntil:null,lastRetryAt:now,lastRetryBy:operatorId,manualRetries:(job.manualRetries||0)+1});
        tx.update(bookingRef,{email:{...record.email,[job.kind]:'queued'}});
        return job.id;
      });
    },
    async create(key:string, fingerprint:string, record:any, mail:any) {
      return db.runTransaction(async tx=>{
        const ref=keys.doc(digest(key)), previous=(await tx.get(ref)).data();
        if(previous) {
          if(previous.fingerprint!==fingerprint)throw new BookingError('IDEMPOTENCY_CONFLICT',409);
          const existing=(await tx.get(bookings.doc(previous.id))).data();
          if(!existing)throw new BookingError('REQUEST_UNAVAILABLE',503);
          return existing;
        }
        const recoveryRef=record.recoveryId?keys.doc(digest(`recovery:${record.recoveryId}`)):null;
        const linked=recoveryRef?(await tx.get(recoveryRef)).data():null;
        if(linked) {
          const existing=(await tx.get(bookings.doc(linked.id))).data();
          if(!existing || existing.customer.email!==record.customer.email)throw new BookingError('RECOVERY_EMAIL_MISMATCH',409);
          tx.create(ref,{id:existing.bookingId,fingerprint,createdAt:record.createdAt});
          return existing;
        }
        tx.create(bookings.doc(record.bookingId),clean(record));
        tx.create(ref,{id:record.bookingId,fingerprint,createdAt:record.createdAt});
        if(recoveryRef)tx.create(recoveryRef,{id:record.bookingId,createdAt:record.createdAt});
        if(mail)tx.create(outbox.doc(digest(mail.id)),clean(mail));
        return record;
      });
    },
    async mutate(id:string, transform:(current:any)=>any) {
      return db.runTransaction(async tx=>{
        const ref=bookings.doc(id), current=(await tx.get(ref)).data();
        if(!current)throw new BookingError('BOOKING_NOT_FOUND',404);
        const next=transform(current);
        if(next)tx.set(ref,clean(next));
        return next || current;
      });
    },
    async mutateWithMail(id:string, transform:(current:any)=>any, makeJob:(next:any)=>any) {
      return db.runTransaction(async tx=>{
        const ref=bookings.doc(id),current=(await tx.get(ref)).data();
        if(!current)throw new BookingError('BOOKING_NOT_FOUND',404);
        const next=transform(current), made=makeJob(next), jobs=Array.isArray(made)?made:made?[made]:[];
        const pending=[];
        for(const job of jobs){const ref=outbox.doc(digest(job.id));pending.push({ref,job,exists:(await tx.get(ref)).exists});}
        tx.set(ref,clean(next));
        for(const item of pending)if(!item.exists)tx.create(item.ref,clean(item.job));
        return next;
      });
    },
    async addMail(job:any) {
      return db.runTransaction(async tx=>{const ref=outbox.doc(digest(job.id));if((await tx.get(ref)).exists)return false;tx.create(ref,clean(job));return true;});
    },
    async getMail(id:string) {
      return (await outbox.doc(digest(id)).get()).data()||null;
    },
    async prepareMail(id:string,message:any,preparedAt:number,expiresAt?:number) {
      return db.runTransaction(async tx=>{
        const ref=outbox.doc(digest(id)),current=(await tx.get(ref)).data();
        if(!current||current.status!=='sending')return null;
        if(current.prepared)return current.prepared;
        const prepared=clean(message);
        tx.update(ref,{prepared,preparedAt,...(expiresAt?{preparedExpiresAt:expiresAt}:{})});
        return prepared;
      });
    },
    async updateLanguageAndPending(id:string,languageSnapshot:any,now:number,updateNotification:(notification:any)=>any) {
      return db.runTransaction(async tx=>{
        const ref=bookings.doc(id),record=(await tx.get(ref)).data();
        if(!record)throw new BookingError('BOOKING_NOT_FOUND',404);
        const pending=await tx.get(outbox.where('bookingId','==',id));
        for(const doc of pending.docs){const job=doc.data();if(job.status==='queued'&&!(job.attempts>0)&&!job.prepared&&job.notification)tx.update(doc.ref,{notification:clean(updateNotification(job.notification))});}
        const next={...record,language:languageSnapshot.language,languageSnapshot,communicationPreferenceUpdatedAt:now,revision:record.revision+1};
        tx.set(ref,clean(next));return next;
      });
    },
    async listDueMail(now:number,limit=20) {
      return (await outbox.where('status','==','queued').where('dueAt','<=',now).orderBy('dueAt').limit(Math.max(1,Math.min(20,Math.floor(limit)))).get()).docs.map(doc=>doc.data());
    },
    async claimMail(id:string, now:number):Promise<any> {
      return db.runTransaction(async tx=>{const ref=outbox.doc(digest(id)), current=(await tx.get(ref)).data();if(!current || current.status!=='queued' || current.dueAt>now)return null;const attempts=Number.isSafeInteger(current.attempts)&&current.attempts>=0?current.attempts:0;const next={...current,status:'sending',attempts:attempts+1,leaseUntil:now+60000};tx.set(ref,next);return next;});
    },
    async finishMail(id:string, status:string, providerId:string|null, retryAt?:number,failure?:any) {
      await db.runTransaction(async tx=>{const ref=outbox.doc(digest(id)), current=(await tx.get(ref)).data();if(current?.status==='sending')tx.update(ref,{status,providerId,leaseUntil:null,...(failure?{failure:clean(failure)}:status==='sent'?{failure:null}:{}),...(status==='queued'&&Number.isSafeInteger(retryAt)?{dueAt:retryAt}:{}),...(current.kind==='customer_access'&&status!=='queued'?{message:null,prepared:null,authorisedLinks:null}:{})});});
    },
    async markStaleMail(now:number,{limit=20,deadlineAt=Infinity}={}) {
      for(const doc of (await outbox.where('status','==','sending').where('leaseUntil','<=',now).limit(Math.max(1,Math.min(20,Math.floor(limit)))).get()).docs) {
        if(performance.now()+15000>=deadlineAt)break;
        await db.runTransaction(async tx=>{
        const current=(await tx.get(doc.ref)).data();
        const bookingRef=current?.bookingId?bookings.doc(current.bookingId):null;
        const booking=bookingRef?(await tx.get(bookingRef)).data():null;
        if(current?.status==='sending' && current.leaseUntil<=now) {
          tx.update(doc.ref,{status:'delivery_unknown',...(current.kind==='customer_access'?{message:null,prepared:null,authorisedLinks:null}:{})});
          if(bookingRef&&booking&&current.kind!=='customer_access')tx.update(bookingRef,{email:{...booking.email,[current.kind]:'delivery_unknown'}});
        }
        });
      }
    },
    async consumeRate(key:string, now:number, windowMs:number, limit:number) {
      return db.runTransaction(async tx=>{const ref=rate.doc(digest(key)), current=(await tx.get(ref)).data();const next=current && current.expiresAt>now ? {...current,count:current.count+1} : {count:1,expiresAt:now+windowMs};tx.set(ref,next);return next.count<=limit;});
    },
    async listByEmail(email:string) { return (await bookings.where('customer.email','==',email).limit(50).get()).docs.map(doc=>doc.data()); },
    async isEmailSuppressed(email:string) { return (await emailSuppressions.doc(digest(email)).get()).exists; },
    async suppressEmail(email:string, reason:string, now:number) {
      await db.runTransaction(async tx=>{const ref=emailSuppressions.doc(digest(email)),current=(await tx.get(ref)).data();tx.set(ref,{reason:current?.reason==='complaint'?'complaint':reason,createdAt:current?.createdAt||now});});
      const matching=await bookings.where('customer.email','==',email).get();
      const queries=[outbox.where('email','==',email),...matching.docs.map(doc=>outbox.where('bookingId','==',doc.id))];
      for(const query of queries)for(const doc of (await query.get()).docs)await db.runTransaction(async tx=>{const job=(await tx.get(doc.ref)).data();if(job?.status==='queued')tx.update(doc.ref,{status:'cancelled',...(job.kind==='customer_access'?{message:null,prepared:null,authorisedLinks:null}:{})});});
      for(const doc of matching.docs)await db.runTransaction(async tx=>{const record=(await tx.get(doc.ref)).data();if(record){const email=Object.fromEntries(Object.entries(record.email||{}).map(([kind,status])=>[kind,status==='queued'||status==='sending'?'failed':status]));tx.update(doc.ref,{email,emailDelivery:{status:reason,updatedAt:now}});}});
    },
    async emailEventProcessed(id:string, fingerprint:string) {const result=(await emailEvents.doc(digest(id)).get()).data();if(result&&result.fingerprint!==fingerprint)throw new BookingError('EVENT_CONFLICT',409);return Boolean(result);},
    async finishEmailEvent(id:string,fingerprint:string,now:number) {await db.runTransaction(async tx=>{const ref=emailEvents.doc(digest(id)),current=(await tx.get(ref)).data();if(current&&current.fingerprint!==fingerprint)throw new BookingError('EVENT_CONFLICT',409);if(!current)tx.create(ref,{fingerprint,processedAt:now});});},
  };
}
export type BookingStore = ReturnType<typeof createFirestoreBookingStore>;
