import test from 'node:test';
import assert from 'node:assert/strict';
import {createBookingService, BOOKING_TERMS_VERSION} from '../server/booking.ts';
import {BookingError} from '../server/booking-store.ts';
import {calculatePrice,defaultSelection,PRICING_VERSION} from '../src/booking/pricing.ts';
import {depositPaymentDeadline} from '../src/booking/paymentDeadline.ts';
import {paymentUiState} from '../src/booking/paymentUi.ts';
import {bookingTermsPresentation,termsPresentationText} from '../src/booking/termsPresentation.ts';

const initial=Date.parse('2026-11-27T10:00:00Z'),day=86400000,clone=(value:any)=>structuredClone(value);
function fixture(provider:any={}){
  let now=initial,tail=Promise.resolve();const records=new Map<string,any>(),mail=new Map<string,any>();
  const mutation=(id:string,transform:any,jobs?:any)=>{
    const work=tail.then(()=>{const next=transform(clone(records.get(id)));records.set(id,clone(next));const nextJobs=jobs?.(next);for(const job of (Array.isArray(nextJobs)?nextJobs:[nextJobs]).filter(Boolean))if(!mail.has(job.id))mail.set(job.id,clone(job));return clone(next);});tail=work.then(()=>{},()=>{});return work;
  };
  const store:any={get:async(id:string)=>clone(records.get(id)||null),create:async(_key:string,_fingerprint:string,record:any,job:any)=>{records.set(record.bookingId,clone(record));mail.set(job.id,clone(job));return clone(record);},mutate:(id:string,transform:any)=>mutation(id,transform),mutateWithMail:(id:string,transform:any,jobs:any)=>mutation(id,transform,jobs)};
  let calls=0;const minutes:number[]=[];
  const payment={async create(record:any,token:string,validity:number){calls++;minutes.push(validity);return provider.create?provider.create(record,token,validity):{id:42,link:'https://synthetic.payrexx.com/one-gateway'};},async verify(record:any){return provider.verify?provider.verify(record):{status:'pending',transactionId:null};}};
  const service=createBookingService({store,origin:'https://kraken.example',tokenSecret:'synthetic-server-secret-over-32-characters',mode:'test',payment,clock:()=>now});
  async function create(date='2026-12-10',time='10:00'){
    const selection=defaultSelection('endOfTenancy');return service.create({selection,requestedDate:date,requestedTime:time,language:'es',customer:{name:'Synthetic Customer',email:'client@example.test',phone:'+41770000000',address:'Testweg 1',postalCode:'8203',city:'Schaffhausen'},notes:'',termsAccepted:true,termsVersion:BOOKING_TERMS_VERSION,pricingVersion:PRICING_VERSION,acceptedTotalCents:calculatePrice(selection).totalCents,idempotencyKey:'synthetic_deadline_request_123456'});
  }
  const checkout=(booking:any)=>service.checkout(booking.bookingId,booking.publicToken,{termsAccepted:true,termsVersion:records.get(booking.bookingId).termsVersion,acceptedQuoteRevision:1,language:'es'});
  return{service,store,records,mail,create,checkout,minutes,setTime:(value:number)=>{now=value;},get calls(){return calls;}};
}

test('three Zurich calendar days preserve local time across DST and stop before the actual appointment',()=>{
  const spring=Date.parse('2027-03-26T20:00:00Z');
  assert.equal(depositPaymentDeadline(spring,spring+10*day),Date.parse('2027-03-29T19:00:00Z'));
  const autumn=Date.parse('2027-10-29T20:00:00Z');
  assert.equal(depositPaymentDeadline(autumn,autumn+10*day),Date.parse('2027-11-01T21:00:00Z'));
  const gap=Date.parse('2027-03-25T01:30:00Z');
  assert.equal(depositPaymentDeadline(gap,gap+10*day),Date.parse('2027-03-28T01:30:00Z'));
  const fold=Date.parse('2027-10-28T00:30:00Z');
  assert.equal(depositPaymentDeadline(fold,fold+10*day),Date.parse('2027-10-31T00:30:00Z'));
  assert.equal(depositPaymentDeadline(initial,initial+6*3600000),initial+6*3600000);
  assert.throws(()=>depositPaymentDeadline(initial,initial),RangeError);
});

test('current terms use one server-owned three-day deadline despite a short client hold and preserve financial snapshot',async()=>{
  const f=fixture(),booking=await f.create(),before=clone(f.records.get(booking.bookingId));
  const confirmed=await f.service.confirmAppointment(booking.bookingId,{operatorId:'synthetic-operator',holdExpiresAt:new Date(initial+30*60000).toISOString()});
  const due=initial+3*day;
  assert.equal(confirmed.payment.depositDueAt,new Date(due).toISOString());assert.equal(confirmed.scheduling.holdExpiresAt,confirmed.payment.depositDueAt);
  assert.deepEqual(confirmed.quote,before.quote);assert.equal(confirmed.payment.amountDueNowCents,before.payment.amountDueNowCents);
  const link=await f.checkout(booking);assert.deepEqual(f.minutes,[4320]);
  f.setTime(initial+31*60000);
  assert.deepEqual(await f.checkout(booking),link);assert.equal(f.calls,1);
  const view=await f.service.read(booking.bookingId,booking.publicToken);
  assert.equal(Date.parse(view.payment.checkoutExpiresAt),due);assert.equal(paymentUiState(view,initial+31*60000).canOpenCheckout,true);
  f.setTime(due);
  await assert.rejects(f.checkout(booking),{code:'CHECKOUT_NOT_AVAILABLE'});assert.equal(f.calls,1);
  assert.equal(f.records.get(booking.bookingId).status,'confirmed');assert.equal(f.records.get(booking.bookingId).scheduling.status,'held','expiry never releases an appointment without a staff reminder/review');
});

test('payment deadline is capped before early work and the same recorded timestamp appears in confirmations',async()=>{
  const f=fixture(),booking=await f.create('2026-11-28','09:00');
  const confirmed=await f.service.confirmAppointment(booking.bookingId,{operatorId:'synthetic-operator'});
  assert.equal(confirmed.payment.depositDueAt,'2026-11-28T08:00:00.000Z');
  await f.checkout(booking);assert.deepEqual(f.minutes,[1320]);
  const summary=bookingTermsPresentation('es',{booking:confirmed});
  assert.match(summary.rows.find(row=>row.label===termsPresentationText('es','depositDue'))!.value,/28 de noviembre de 2026.*9:00.*Europe\/Zurich/);
  const record=f.records.get(booking.bookingId);record.selection=defaultSelection('regular');
  assert.match(bookingTermsPresentation('es',{booking:record}).rows.find(row=>row.label===termsPresentationText('es','depositDue'))!.value,/28 de noviembre de 2026.*9:00/,'a real regular-cleaning confirmation date is shown instead of an invented generic schedule');
});

test('an existing historical contract keeps its accepted hold, amount and original checkout without a second gateway',async()=>{
  const f=fixture(),booking=await f.create();const historical=f.records.get(booking.bookingId);historical.termsVersion='kraken-2026-11-24';delete historical.termsAcceptance;
  const before=clone(historical);
  const confirmed=await f.service.confirmAppointment(booking.bookingId,{operatorId:'synthetic-operator',holdExpiresAt:new Date(initial+3600000).toISOString()});
  assert.equal(confirmed.scheduling.holdExpiresAt,new Date(initial+3600000).toISOString());assert.equal(confirmed.payment.depositDueAt,undefined);
  assert.equal(confirmed.termsVersion,before.termsVersion);assert.deepEqual(confirmed.quote,before.quote);assert.equal(confirmed.payment.amountDueNowCents,before.payment.amountDueNowCents);
  await f.checkout(booking);assert.deepEqual(f.minutes,[30]);f.setTime(initial+31*60000);
  await assert.rejects(f.checkout(booking),{code:'CHECKOUT_EXPIRED'});assert.equal(f.calls,1);
});

test('competing checkout creation, timed-out POST and repeated waiting reads never issue another payable gateway',async()=>{
  let resolveCreate!:(value:any)=>void;
  const f=fixture({create:()=>new Promise(resolve=>{resolveCreate=resolve;})}),booking=await f.create();
  await f.service.confirmAppointment(booking.bookingId,{operatorId:'synthetic-operator'});
  const first=f.checkout(booking);await new Promise(resolve=>setImmediate(resolve));
  await assert.rejects(f.checkout(booking),{code:'PAYMENT_RECONCILIATION_REQUIRED'});
  resolveCreate({id:42,link:'https://synthetic.payrexx.com/one-gateway'});await first;
  f.setTime(initial+2*day);await f.service.read(booking.bookingId,booking.publicToken);await f.checkout(booking);assert.equal(f.calls,1);
  const unknown=fixture({create:async()=>{throw Error('synthetic timeout');}}),other=await unknown.create();await unknown.service.confirmAppointment(other.bookingId,{operatorId:'synthetic-operator'});
  await assert.rejects(unknown.checkout(other),{code:'PAYMENT_RECONCILIATION_REQUIRED'});unknown.setTime(initial+2*day);
  await assert.rejects(unknown.checkout(other),{code:'PAYMENT_RECONCILIATION_REQUIRED'});assert.equal(unknown.calls,1);
});

test('a cancellation during provider creation retains the gateway for review and a late payment never resurrects the slot',async()=>{
  let resolveCreate!:(value:any)=>void;
  const f=fixture({create:()=>new Promise(resolve=>{resolveCreate=resolve;}),verify:async()=>({status:'test_paid',transactionId:'synthetic-paid-42'})}),booking=await f.create();
  await f.service.confirmAppointment(booking.bookingId,{operatorId:'synthetic-operator'});
  const pending=f.checkout(booking);await new Promise(resolve=>setImmediate(resolve));
  await f.store.mutate(booking.bookingId,(record:any)=>({...record,status:'cancelled',scheduling:{...record.scheduling,status:'needs_reschedule'}}));
  resolveCreate({id:42,link:'https://synthetic.payrexx.com/one-gateway'});await assert.rejects(pending,{code:'PAYMENT_RECONCILIATION_REQUIRED'});
  assert.equal(f.records.get(booking.bookingId).checkout.gatewayId,42);assert.equal(f.records.get(booking.bookingId).checkout.status,'review_required');
  const verified=await f.service.reconcile(booking.bookingId);
  assert.equal(verified.status,'cancelled');assert.equal(verified.scheduling.status,'needs_reschedule');assert.equal(verified.payment.status,'reconciliation_required');
  assert.equal(verified.payment.transactionId,'synthetic-paid-42');assert.equal(verified.payment.amountPaidCents,verified.payment.amountDueNowCents);assert.equal(verified.payment.verifiedPaymentStatus,'test_paid');
  assert.equal(f.mail.size,1,'no receipt claiming a confirmed appointment or duplicate confirmation');
});

test('a stale provider verification cannot overwrite another gateway even if its reference was reused',async()=>{
  let resolveVerify!:(value:any)=>void;
  const f=fixture({verify:()=>new Promise(resolve=>{resolveVerify=resolve;})}),booking=await f.create();await f.service.confirmAppointment(booking.bookingId,{operatorId:'synthetic-operator'});await f.checkout(booking);
  const pending=f.service.reconcile(booking.bookingId);await new Promise(resolve=>setImmediate(resolve));
  await f.store.mutate(booking.bookingId,(record:any)=>({...record,checkout:{...record.checkout,gatewayId:43}}));
  resolveVerify({status:'test_paid',transactionId:'synthetic-stale-42'});
  await assert.rejects(pending,{code:'PAYMENT_MISMATCH'});assert.equal(f.records.get(booking.bookingId).payment.amountPaidCents,0);assert.equal(f.mail.size,1);
});

test('a stale verification failure cannot quarantine a different gateway while a refund stays terminal',async()=>{
  let rejectVerify!:(cause:any)=>void;
  const f=fixture({verify:()=>new Promise((_resolve,reject)=>{rejectVerify=reject;})}),booking=await f.create();await f.service.confirmAppointment(booking.bookingId,{operatorId:'synthetic-operator'});await f.checkout(booking);
  const pending=f.service.reconcile(booking.bookingId);await new Promise(resolve=>setImmediate(resolve));
  await f.store.mutate(booking.bookingId,(record:any)=>({...record,checkout:{...record.checkout,gatewayId:43}}));
  rejectVerify(new BookingError('PAYMENT_MISMATCH',409));await assert.rejects(pending,{code:'PAYMENT_MISMATCH'});
  assert.equal(f.records.get(booking.bookingId).payment.status,'pending');
  const refunded=fixture({verify:async()=>({status:'test_paid',transactionId:'synthetic-stale-paid'})}),other=await refunded.create();await refunded.service.confirmAppointment(other.bookingId,{operatorId:'synthetic-operator'});await refunded.checkout(other);
  await refunded.store.mutate(other.bookingId,(record:any)=>({...record,status:'cancelled',scheduling:{...record.scheduling,status:'needs_reschedule'},payment:{...record.payment,status:'refunded',transactionId:'synthetic-refund-43'}}));
  const state=await refunded.service.reconcile(other.bookingId);assert.equal(state.payment.status,'refunded');assert.equal(state.payment.transactionId,'synthetic-refund-43');assert.equal(state.payment.amountPaidCents,0);assert.equal(state.scheduling.status,'needs_reschedule');
});

test('a stretched or malformed hold cannot bypass the persisted payment deadline; only an existing gateway may reopen in the final minute',async()=>{
  const f=fixture(),booking=await f.create();await f.service.confirmAppointment(booking.bookingId,{operatorId:'synthetic-operator'});
  const record=f.records.get(booking.bookingId),due=Date.parse(record.payment.depositDueAt);
  record.scheduling.holdExpiresAt=new Date(due+day).toISOString();
  f.setTime(due);
  assert.equal(f.service.canCheckout(record),false);await assert.rejects(f.checkout(booking),{code:'CHECKOUT_NOT_AVAILABLE'});assert.equal(f.calls,0);
  f.setTime(initial);record.payment.depositDueAt='malformed';assert.equal(f.service.canCheckout(record),false);
  record.payment.depositDueAt=new Date(due).toISOString();f.setTime(due-30000);
  await assert.rejects(f.checkout(booking),{code:'CHECKOUT_NOT_AVAILABLE'});assert.equal(f.calls,0,'never round 30 remaining seconds up to a new minute');
  f.setTime(due-60000);const link=await f.checkout(booking);assert.deepEqual(f.minutes,[1]);
  f.setTime(due-30000);assert.deepEqual(await f.checkout(booking),link);assert.equal(f.calls,1);
});

test('a provider POST that finishes after the deadline preserves subsequently verified paid money without confirming the appointment',async()=>{
  let resolveCreate!:(value:any)=>void;
  const f=fixture({create:()=>new Promise(resolve=>{resolveCreate=resolve;}),verify:async()=>({status:'test_paid',transactionId:'synthetic-late-paid-42'})}),booking=await f.create();
  await f.service.confirmAppointment(booking.bookingId,{operatorId:'synthetic-operator'});
  const due=Date.parse(f.records.get(booking.bookingId).payment.depositDueAt);f.setTime(due-90000);
  const pending=f.checkout(booking);await new Promise(resolve=>setImmediate(resolve));f.setTime(due+1);
  resolveCreate({id:42,link:'https://synthetic.payrexx.com/one-gateway'});await assert.rejects(pending,{code:'PAYMENT_RECONCILIATION_REQUIRED'});
  const paid=await f.service.reconcile(booking.bookingId);
  assert.equal(paid.payment.status,'reconciliation_required');assert.equal(paid.payment.amountPaidCents,paid.payment.amountDueNowCents);assert.equal(paid.payment.transactionId,'synthetic-late-paid-42');
  assert.equal(paid.payment.verifiedPaymentStatus,'test_paid');assert.equal(paid.payment.settlementNeedsReview,true);assert.equal(paid.scheduling.status,'held');assert.equal(f.mail.size,1);
});
