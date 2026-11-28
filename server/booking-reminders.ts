import crypto from 'node:crypto';
import {usesFullPrepayment} from '../src/booking/fullPrepayment.ts';
import {bookingEmailLinks,prepareCustomerEnvelope} from './customer-notifications.ts';

/** Scheduling is an email-provider operation, never a payment or marketing operation. */
export function createBookingReminders({store,sendEmail,origin,token,eligible,clock=Date.now}:any) {
  let readiness:Promise<boolean>|undefined;
  const ready=()=>readiness??=Promise.resolve().then(()=>typeof sendEmail?.schedule==='function'&&typeof sendEmail?.cancel==='function'&&typeof sendEmail?.canSchedule==='function'?sendEmail.canSchedule():false).then(value=>value===true,()=>false);
  const note=async(id:string,status:string,dueAt?:number)=>store.mutate(id,(record:any)=>({...record,payment:{...record.payment,reminder:{status,...(dueAt?{dueAt:new Date(dueAt).toISOString()}:{}),updatedAt:clock()}}}));
  const update=async(id:string,fn:any)=>store.mutateMail(id,fn);
  async function cancelJob(job:any) {
    const attempt=crypto.randomUUID();
    const claimed=await update(job.id,(current:any)=>{
      if(!current||current.kind!=='payment_reminder'||['cancelled','sent'].includes(current.status))return current;
      if(current.status==='queued')return {...current,status:'cancelled',cancelRequestedAt:clock()};
      if(['scheduling','schedule_unknown'].includes(current.status))return {...current,cancelRequestedAt:clock()};
      if(current.status==='cancelling'&&current.leaseUntil>clock())return current;
      if(!['scheduled','cancel_unknown','cancelling'].includes(current.status)||!current.providerId)return current;
      return {...current,status:'cancelling',cancelRequestedAt:clock(),cancelAttempt:attempt,leaseUntil:clock()+60000};
    });
    if(claimed?.status==='cancelled'){await note(job.bookingId,'cancelled',job.dueAt);return;}
    if(claimed?.status==='schedule_unknown'){await note(job.bookingId,'schedule_unknown',job.dueAt);return;}
    if(claimed?.cancelAttempt!==attempt||claimed.status!=='cancelling')return;
    await note(job.bookingId,'cancelling',job.dueAt);
    try{
      await sendEmail.cancel(claimed.providerId);
      await update(job.id,(current:any)=>current.cancelAttempt===attempt?{...current,status:'cancelled',leaseUntil:null,cancelledAt:clock()}:current);
      await note(job.bookingId,'cancelled',job.dueAt);
    }catch{
      await update(job.id,(current:any)=>current.cancelAttempt===attempt?{...current,status:'cancel_unknown',leaseUntil:null}:current);
      await note(job.bookingId,'cancel_unknown',job.dueAt);
    }
  }
  async function cancel(bookingId:string) {
    if(typeof store.mutateMail!=='function'||typeof store.listMailForBooking!=='function')return;
    const record=await store.get(bookingId);if(!usesFullPrepayment(record))return;
    for(const job of await store.listMailForBooking(bookingId))if(job.kind==='payment_reminder')await cancelJob(job);
  }
  async function schedule(bookingId:string) {
    const record=await store.get(bookingId);if(!usesFullPrepayment(record))return;
    if(typeof store.mutateMail!=='function'||typeof store.listMailForBooking!=='function'){await note(bookingId,'unavailable');return;}
    const jobs=(await store.listMailForBooking(bookingId)).filter((job:any)=>job.kind==='payment_reminder'&&job.dueAt>clock());
    if(!jobs.length)return;
    for(const job of jobs){
      if(job.status!=='queued'||job.scheduleRejectedAt)continue;
      if(!await ready()){await note(bookingId,'unavailable',job.dueAt);continue;}
      const attempt=crypto.randomUUID();
      const claimed=await update(job.id,(current:any)=>current?.status==='queued'&&current.dueAt>clock()&&!current.cancelRequestedAt?{...current,status:'scheduling',scheduleAttempt:attempt,leaseUntil:clock()+60000,attempts:(current.attempts||0)+1}:current);
      if(claimed?.scheduleAttempt!==attempt||claimed.status!=='scheduling')continue;
      await note(bookingId,'scheduling',job.dueAt);
      let providerAttempted=false;
      try{
        const current=await store.get(bookingId);
        if(!eligible(current,claimed)||await store.isEmailSuppressed(current.customer.email)){
          await update(job.id,(row:any)=>({...row,status:'cancelled',leaseUntil:null}));await note(bookingId,'cancelled',job.dueAt);continue;
        }
        let message=claimed.prepared;
        if(!message){
          message={...prepareCustomerEnvelope(claimed.notification,bookingEmailLinks(current,claimed.notification,origin,token(bookingId)),origin),idempotencyKey:`kraken-booking:${job.id}`};
          message=await store.prepareMail(job.id,message,clock());
          if(!message)throw Error('PREPARATION_UNAVAILABLE');
        }
        const fresh=await store.get(bookingId),pending=await update(job.id,(row:any)=>row);
        if(pending.cancelRequestedAt||!eligible(fresh,pending)||await store.isEmailSuppressed(message.to)){
          await update(job.id,(row:any)=>({...row,status:'cancelled',leaseUntil:null}));await note(bookingId,'cancelled',job.dueAt);continue;
        }
        providerAttempted=true;
        const accepted=await sendEmail.schedule(message,new Date(job.dueAt).toISOString());
        if(typeof accepted?.id!=='string'||!accepted.id||accepted.id.length>200)throw Error('SCHEDULE_OUTCOME_UNKNOWN');
        const saved=await update(job.id,(row:any)=>row.scheduleAttempt===attempt?{...row,status:'scheduled',providerId:accepted.id,scheduledAt:new Date(job.dueAt).toISOString(),leaseUntil:null}:row);
        await note(bookingId,'scheduled',job.dueAt);
        if(saved.cancelRequestedAt||!eligible(await store.get(bookingId),saved))await cancelJob(saved);
      }catch(cause:any){
        const rejected=providerAttempted&&cause?.definitelyNotSent===true;
        await update(job.id,(row:any)=>row.scheduleAttempt===attempt&&row.status==='scheduling'?{...row,status:rejected?'queued':providerAttempted?'schedule_unknown':'failed',...(rejected?{scheduleRejectedAt:clock()}:{}),leaseUntil:null}:row);
        await note(bookingId,providerAttempted&&!rejected?'schedule_unknown':'unavailable',job.dueAt);
      }
    }
  }
  return {ready,schedule,cancel};
}
