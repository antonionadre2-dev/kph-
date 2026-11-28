import test from 'node:test';
import assert from 'node:assert/strict';
import {createBookingService,BOOKING_TERMS_VERSION} from '../server/booking.ts';
import {defaultSelection,calculatePrice,PRICING_VERSION} from '../src/booking/pricing.ts';
import {seedStoredV2} from './helpers/legacy-booking.ts';

const initial=Date.parse('2026-11-28T10:00:00Z'),clone=(v:any)=>structuredClone(v);
function fixture(options:any={}){
 let now=initial,tail=Promise.resolve();const records=new Map<string,any>(),mail=new Map<string,any>(),calls:any[]=[];
 const atomic=(work:any)=>{const p=tail.then(work);tail=p.catch(()=>{});return p;};
 const store:any={get:async(id:string)=>clone(records.get(id)),create:async(_key:any,_fingerprint:any,record:any,job:any)=>{records.set(record.bookingId,clone(record));mail.set(job.id,clone(job));return clone(record);},mutate:(id:string,fn:any)=>atomic(()=>{const r=fn(clone(records.get(id)));records.set(id,clone(r));return clone(r);}),mutateWithMail:(id:string,fn:any,jobs:any)=>atomic(()=>{const r=fn(clone(records.get(id)));records.set(id,clone(r));for(const j of[jobs(r)].flat().filter(Boolean))if(!mail.has(j.id))mail.set(j.id,clone(j));return clone(r);}),mutateMail:(id:string,fn:any)=>atomic(()=>{const r=fn(clone(mail.get(id)));if(r)mail.set(id,clone(r));return clone(r);}),listMailForBooking:async(id:string)=>[...mail.values()].filter(j=>j.bookingId===id).map(clone),prepareMail:(id:string,message:any)=>atomic(()=>{const j=mail.get(id);if(!j||!['scheduling','sending'].includes(j.status))return null;j.prepared??=clone(message);return clone(j.prepared);}),isEmailSuppressed:async()=>options.suppressed===true,markStaleMail:async()=>{},listDueMail:async()=>[...mail.values()].filter(j=>j.status==='queued'&&j.dueAt<=now).map(clone),claimMail:(id:string)=>atomic(()=>{const j=mail.get(id);if(!j||j.status!=='queued'||j.dueAt>now)return null;j.status='sending';return clone(j);}),finishMail:async(id:string,status:string,providerId:any)=>{Object.assign(mail.get(id),{status,providerId});}};
 const send=Object.assign(async(message:any)=>{calls.push({kind:'send',key:message.idempotencyKey});return{id:'ordinary-id'};},{canSchedule:async()=>{calls.push({kind:'capability'});return options.ready!==false;},schedule:async(message:any,at:string)=>{calls.push({kind:'schedule',at,message:clone(message)});if(options.schedule)return options.schedule(message,at);return{id:'00000000-0000-4000-8000-000000000001',scheduledAt:at};},cancel:async(id:string)=>{calls.push({kind:'cancel',id});if(options.cancel)return options.cancel(id);return{id};}});
 const service=createBookingService({store,tokenSecret:'isolated-reminder-secret-more-than32characters',origin:'https://kraken.example',mode:'test',clock:()=>now,sendEmail:send,payment:{create:async()=>({id:1,link:'https://isolated.payrexx.com/pay'}),verify:async()=>({status:'test_paid',transactionId:'42'})}});
 async function create(){const selection=defaultSelection('windows');return service.create({selection,customer:{name:'Isolated Customer',email:'customer@example.test',phone:'+41770000000',address:'Testweg 1',postalCode:'8203',city:'Schaffhausen'},requestedDate:'2026-12-10',requestedTime:'10:00',language:'es',notes:'',termsAccepted:true,termsVersion:BOOKING_TERMS_VERSION,pricingVersion:PRICING_VERSION,acceptedTotalCents:calculatePrice(selection).totalCents,idempotencyKey:'isolated_scheduled_request_123'});}
 const get=(b:any)=>records.get(b.bookingId),reminder=()=>[...mail.values()].find(j=>j.kind==='payment_reminder');
 const confirm=(b:any)=>service.confirmAppointment(b.bookingId,{expectedRevision:get(b).revision,operatorId:'isolated-staff',notifyPaymentReady:false});
 return{store,service,create,confirm,get,reminder,calls,mail,setTime:(t:number)=>{now=t;}};
}

test('future reminder is scheduled exactly once at due minus24h and normal worker cannot send it early or again',async()=>{
 const f=fixture(),b=await f.create();await f.confirm(b);const job=f.reminder();assert.equal(job.status,'scheduled');assert.equal(job.dueAt,Date.parse(f.get(b).payment.paymentDueAt)-86400000);assert.equal(f.get(b).payment.reminder.status,'scheduled');assert.equal(f.calls.filter(c=>c.kind==='schedule').length,1);const scheduled=f.calls.find(c=>c.kind==='schedule');assert.equal(scheduled.at,new Date(job.dueAt).toISOString());assert.equal(scheduled.message.to,'customer@example.test');assert.equal(scheduled.message.idempotencyKey,`kraken-booking:${job.id}`);assert.equal(job.notification.renderData.paymentReminder,true);assert.equal(job.notification.renderData.pricing.transactionRappen,f.get(b).payment.outstandingCents);
 await f.service.schedulePaymentReminders(b.bookingId);await f.service.runDue({jobId:job.id});f.setTime(job.dueAt+1);await f.service.runDue({jobId:job.id});assert.equal(f.calls.filter(c=>c.kind==='send').length,0);assert.equal(f.calls.filter(c=>c.kind==='schedule').length,1);assert.equal(f.calls.filter(c=>c.kind==='capability').length,1);
});

test('verified payment cancels the exact scheduled provider ID without another reminder send',async()=>{
 const f=fixture(),b=await f.create();await f.confirm(b);await f.service.checkout(b.bookingId,b.publicToken,{termsAccepted:true,termsVersion:BOOKING_TERMS_VERSION,acceptedQuoteRevision:1,acceptedTotalDueCents:f.get(b).payment.totalDueCents,language:'es'});await f.service.reconcile(b.bookingId);assert.equal(f.reminder().status,'cancelled');assert.equal(f.calls.filter(c=>c.kind==='cancel').length,1);assert.equal(f.calls.find(c=>c.kind==='cancel').id,'00000000-0000-4000-8000-000000000001');await f.service.reconcile(b.bookingId);assert.equal(f.calls.filter(c=>c.kind==='cancel').length,1);assert.equal(f.get(b).payment.reminder.status,'cancelled');
});

test('operator cancellation cancels a scheduled reminder and an in-flight scheduling response is cancelled before returning',async()=>{
 const f=fixture(),b=await f.create();await f.confirm(b);await f.service.cancel(b.bookingId,{expectedRevision:f.get(b).revision,operatorId:'isolated-staff'});assert.equal(f.reminder().status,'cancelled');assert.equal(f.calls.filter(c=>c.kind==='cancel').length,1);
 let release!:(v:any)=>void,entered!:()=>void;const started=new Promise<void>(resolve=>{entered=resolve;});const g=fixture({schedule:()=>{entered();return new Promise(resolve=>{release=resolve;});}}),other=await g.create();const pending=g.confirm(other);await started;assert.equal(g.reminder().status,'scheduling');await g.service.cancel(other.bookingId,{expectedRevision:g.get(other).revision,operatorId:'isolated-staff'});release({id:'00000000-0000-4000-8000-000000000002'});await pending;assert.equal(g.reminder().status,'cancelled');assert.equal(g.calls.filter(c=>c.kind==='cancel').length,1);assert.equal(g.get(other).payment.reminder.status,'cancelled');
});

test('unknown scheduling outcome is quarantined and never retried through scheduling or the normal due worker',async()=>{
 const f=fixture({schedule:async()=>{throw Error('isolated uncertain response');}}),b=await f.create();await f.confirm(b);assert.equal(f.reminder().status,'schedule_unknown');assert.equal(f.get(b).payment.reminder.status,'schedule_unknown');await f.service.schedulePaymentReminders(b.bookingId);f.setTime(f.reminder().dueAt+1);await f.service.runDue({jobId:f.reminder().id});assert.equal(f.calls.filter(c=>c.kind==='schedule').length,1);assert.equal(f.calls.filter(c=>c.kind==='send').length,0);await f.service.cancel(b.bookingId,{expectedRevision:f.get(b).revision,operatorId:'isolated-staff'});assert.equal(f.reminder().status,'schedule_unknown');assert.ok(f.reminder().cancelRequestedAt);assert.equal(f.calls.filter(c=>c.kind==='cancel').length,0);
});

test('unavailable permission leaves a due-only queue with an honest staff state, and suppression prevents scheduling',async()=>{
 const f=fixture({ready:false}),b=await f.create();await f.confirm(b);assert.equal(f.reminder().status,'queued');assert.equal(f.get(b).payment.reminder.status,'unavailable');await f.service.runDue({jobId:f.reminder().id});assert.equal(f.calls.filter(c=>c.kind==='send').length,0);assert.equal(f.calls.filter(c=>c.kind==='schedule').length,0);f.setTime(f.reminder().dueAt);await f.service.runDue({jobId:f.reminder().id});assert.equal(f.calls.filter(c=>c.kind==='send').length,1);
 const suppressed=fixture({suppressed:true}),other=await suppressed.create();await suppressed.confirm(other);assert.equal(suppressed.reminder().status,'cancelled');assert.equal(suppressed.calls.filter(c=>c.kind==='schedule').length,0);
});

test('uncertain cancellation retains provider ID for safe cancellation reconciliation without recreating an email',async()=>{
 let attempts=0;const f=fixture({cancel:async(id:string)=>{if(++attempts===1)throw Error('isolated cancel interruption');return{id};}}),b=await f.create();await f.confirm(b);await f.service.cancel(b.bookingId,{expectedRevision:f.get(b).revision,operatorId:'isolated-staff'});assert.equal(f.reminder().status,'cancel_unknown');assert.ok(f.reminder().providerId);assert.equal(f.get(b).payment.reminder.status,'cancel_unknown');await f.service.cancelPaymentReminders(b.bookingId);assert.equal(f.reminder().status,'cancelled');assert.equal(f.calls.filter(c=>c.kind==='schedule').length,1);
});

test('persisted v2 confirmations never acquire a scheduled new-policy reminder',async()=>{
 const f=fixture(),b=await f.create();seedStoredV2(f.get(b));await f.confirm(b);assert.equal(f.reminder(),undefined);assert.equal(f.calls.filter(c=>c.kind==='schedule').length,0);assert.equal(f.get(b).payment.reminder,undefined);
});

test('a definitive schedule rejection retains the due-only prepared job and never retries scheduling automatically',async()=>{
 const f=fixture({schedule:async()=>{throw Object.assign(Error('isolated rejection'),{definitelyNotSent:true});}}),b=await f.create();await f.confirm(b);assert.equal(f.reminder().status,'queued');assert.equal(f.get(b).payment.reminder.status,'unavailable');assert.ok(f.reminder().prepared);await f.service.schedulePaymentReminders(b.bookingId);assert.equal(f.calls.filter(c=>c.kind==='schedule').length,1);await f.service.runDue({jobId:f.reminder().id});assert.equal(f.calls.filter(c=>c.kind==='send').length,0);f.setTime(f.reminder().dueAt);await f.service.runDue({jobId:f.reminder().id});assert.equal(f.calls.filter(c=>c.kind==='send').length,1);assert.equal(f.reminder().status,'sent');
});
