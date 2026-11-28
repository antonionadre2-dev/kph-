import test from 'node:test';
import assert from 'node:assert/strict';
import {createBookingService,BOOKING_TERMS_VERSION,validateAppointment} from '../server/booking.ts';
import {createPayrexxAdapter} from '../server/booking-payrexx.ts';
import {BookingError} from '../server/booking-store.ts';
import {calculatePrice,calculateLegacyPrice,defaultSelection,PRICING_VERSION} from '../src/booking/pricing.ts';
import {fullPaymentDeadline,depositPaymentDeadline} from '../src/booking/paymentDeadline.ts';
import {settledHourlyQuote,cancellationRefundQuote,monthlyBillingPeriod} from '../src/booking/fullPrepayment.ts';
import {termsMetadata} from '../src/legal/terms-registry.ts';

const initial=Date.parse('2026-11-28T10:00:00Z'),day=86400000,clone=(v:any)=>structuredClone(v);
function fixture(overrides:any={}){
  let now=initial,tail=Promise.resolve(),refundTotal=0,unknownRefund=false,verifiedPaid=false;const records=new Map<string,any>(),mail=new Map<string,any>(),calls:any[]=[];
  const mutate=(id:string,fn:any,jobs?:any)=>{const p=tail.then(()=>{const next=fn(clone(records.get(id)));records.set(id,clone(next));const made=jobs?.(next);for(const job of(Array.isArray(made)?made:[made]).filter(Boolean))if(!mail.has(job.id))mail.set(job.id,clone(job));return clone(next);});tail=p.then(()=>{},()=>{});return p;};
  const store:any={get:async(id:string)=>clone(records.get(id)),create:async(_key:any,_fingerprint:any,r:any,j:any)=>{records.set(r.bookingId,clone(r));mail.set(j.id,clone(j));return clone(r);},mutate:(id:string,fn:any)=>mutate(id,fn),mutateWithMail:mutate};
  const payment={async create(record:any,_token:string,minutes:number){calls.push({kind:'create',amount:record.payment.amountDueNowCents,reference:record.checkout.reference,minutes});return {id:calls.length,link:'https://isolated.payrexx.com/checkout'};},async verify(record:any){return {status:verifiedPaid?'test_paid':'pending',transactionId:verifiedPaid?'42':null};},async refund(_record:any,amount:number){calls.push({kind:'refund',amount});if(unknownRefund)throw Error('isolated network interruption');refundTotal+=amount;},async verifyRefund(_record:any,target:number){calls.push({kind:'verify-refund'});return {verified:refundTotal>=target,refundedCents:refundTotal,id:'42'};},...overrides};
  const service=createBookingService({store,payment,mode:'test',origin:'https://kraken.example',tokenSecret:'isolated-test-server-secret-more-than32chars',clock:()=>now});
  async function create(selection:any={...defaultSelection('endOfTenancy'),mode:'hourly',hours:4},date='2026-12-10',time='10:00',customer:any={}){return service.create({selection,customer:{name:'Isolated Customer',email:'customer@example.test',phone:'+41770000000',address:'Testweg 1',postalCode:'8203',city:'Schaffhausen',...customer},requestedDate:date,requestedTime:time,language:'es',termsAccepted:true,termsVersion:BOOKING_TERMS_VERSION,pricingVersion:PRICING_VERSION,acceptedTotalCents:calculatePrice(selection).totalCents,idempotencyKey:'isolated_prepayment_1234567'});}
  const get=(b:any)=>records.get(b.bookingId);
  const confirm=(b:any,extra:any={})=>service.confirmAppointment(b.bookingId,{operatorId:'isolated-staff',expectedRevision:get(b).revision,notifyPaymentReady:true,...extra});
  const checkout=(b:any,extra:any={})=>service.checkout(b.bookingId,b.publicToken,{termsAccepted:true,termsVersion:get(b).termsVersion,acceptedQuoteRevision:get(b).quoteRevision,acceptedTotalDueCents:get(b).payment.totalDueCents,language:'es',...extra});
  async function paid(b:any){await checkout(b);verifiedPaid=true;await service.reconcile(b.bookingId);}
  return{service,records,mail,calls,create,confirm,checkout,paid,get,setTime:(t:number)=>{now=t;},setRefundUnknown:(v:boolean)=>{unknownRefund=v;},proveRefund:(n:number)=>{refundTotal=n;}};
}

test('v3 pays 100% only after staff confirmation, has no new deposit fields and queues a durable 24h reminder',async()=>{
  const f=fixture(),b=await f.create();assert.equal(b.payment.model,'full_prepayment');assert.equal(b.payment.amountDueNowCents,b.quote.totalCents);assert.equal(Object.hasOwn(b.payment,'depositPercent'),false);assert.equal(Object.hasOwn(b.quote,'depositBasisCents'),false);assert.equal(b.canCheckout,false);
  await assert.rejects(f.checkout(b),{code:'CHECKOUT_NOT_AVAILABLE'});const saved=await f.confirm(b);assert.equal(saved.payment.paymentDueAt,'2026-12-01T10:00:00.000Z');assert.equal(saved.scheduling.status,'confirmed');assert.equal(f.service.view(saved).canStart,false);
  const reminder=[...f.mail.values()].find(j=>j.kind==='payment_reminder');assert.equal(reminder.dueAt,Date.parse(saved.payment.paymentDueAt)-day);assert.equal(reminder.paymentDueAt,saved.payment.paymentDueAt);
  await assert.rejects(f.checkout(b,{acceptedTotalDueCents:1}),{code:'PRICE_CHANGED'});await f.checkout(b);await f.checkout(b);assert.equal(f.calls.length,1);assert.equal(f.calls[0].amount,b.quote.totalCents);await f.paid(b);assert.equal(f.get(b).payment.outstandingCents,0);assert.equal(f.service.view(f.get(b)).canStart,true);
});

test('Zurich three-calendar-day deadline respects DST, start minus48h and same-day immediate payment',async()=>{
  assert.equal(fullPaymentDeadline(Date.parse('2027-03-26T20:00:00Z'),Date.parse('2027-04-10T08:00:00Z')),Date.parse('2027-03-29T19:00:00Z'));
  assert.equal(fullPaymentDeadline(Date.parse('2027-10-29T20:00:00Z'),Date.parse('2027-11-10T09:00:00Z')),Date.parse('2027-11-01T21:00:00Z'));
  assert.equal(fullPaymentDeadline(initial,initial+4*day),initial+2*day);assert.equal(fullPaymentDeadline(initial,initial+3600000),initial);
  assert.equal(validateAppointment('2026-11-28','12:00',initial),initial+3600000);
  const f=fixture(),b=await f.create(defaultSelection('windows'),'2026-11-28','12:00');await f.confirm(b);assert.equal(f.get(b).payment.paymentDueAt,new Date(initial).toISOString());assert.equal(f.service.view(f.get(b)).canCheckout,true);await f.checkout(b);assert.equal(f.calls[0].minutes,60);assert.equal([...f.mail.values()].some(j=>j.kind==='payment_reminder'),false);
});

test('monthly confirmation requires an explicit natural-month period and actual operator-confirmed visits',async()=>{
  const f=fixture(),selection={...defaultSelection('regular'),hours:4},b=await f.create(selection);
  assert.equal(b.payment.totalDueCents,null);await assert.rejects(f.confirm(b),{code:'BILLING_PERIOD_REQUIRED'});await assert.rejects(f.confirm(b,{billingPeriod:{start:'2026-12-01',end:'2027-01-01',visits:4}}),{code:'BILLING_PERIOD_REQUIRED'});
  await f.confirm(b,{billingPeriod:{start:'2026-12-01',end:'2026-12-31',visits:5}});assert.equal(f.get(b).payment.totalDueCents,calculatePrice(selection).totalCents!*5);assert.equal(f.get(b).payment.billingPeriod.visits,5);await f.checkout(b);assert.equal(f.calls[0].amount,80000);
  assert.throws(()=>monthlyBillingPeriod({start:'2026-12-01',end:'2026-12-31',visits:0},10000,'2026-12-10'));
  assert.equal(settledHourlyQuote(selection,12.5,5).minimumHours,12.5);assert.equal(settledHourlyQuote(selection,12.5,5).finalTotalCents,50000);
});

test('outside-area requests remain accepted and require recorded staff review',async()=>{
 const f=fixture(),b=await f.create(defaultSelection('windows'),'2026-12-10','10:00',{postalCode:'3011',city:'Bern'});assert.equal(b.coverageReview,'outside');assert.equal(b.manualReviewRequired,true);assert.deepEqual(b.reviewReasons,['outside_service_area']);await f.confirm(b);assert.equal(f.service.view(f.get(b)).manualReviewRequired,false);assert.equal(f.get(b).coverageReviewedBy,'isolated-staff');
});

test('moving from-price requires written final approval and acceptance of its revised full price',async()=>{
 const f=fixture(),selection={...defaultSelection('moving'),mode:'fixed' as const,rooms:3.5,distanceKm:10},b=await f.create(selection);assert.equal(b.quote.totalCents,null);await assert.rejects(f.confirm(b),{code:'MANUAL_REVIEW_REQUIRED'});
 await assert.rejects(f.service.approveManualQuote(b.bookingId,{expectedRevision:1,operatorId:'isolated-staff',totalCents:1,scopeNotes:'Final written approved moving scope'}),{code:'INVALID_APPROVED_PRICE'});
 await f.service.approveManualQuote(b.bookingId,{expectedRevision:1,operatorId:'isolated-staff',totalCents:150000,scopeNotes:'Final written approved moving scope',scopeLanguage:'es'});await f.confirm(b);await assert.rejects(f.checkout(b,{acceptedQuoteRevision:1}),{code:'PRICE_CHANGED'});await f.checkout(b);assert.equal(f.calls[0].amount,150000);
});

test('actual hourly work preserves minimum; additional gateway is explicit and idempotent',async()=>{
 const f=fixture(),b=await f.create();await f.confirm(b);await f.paid(b);assert.equal(f.service.view(f.get(b)).canSettleWork,true);
 const settled=await f.service.settleWork(b.bookingId,{expectedRevision:f.get(b).revision,operatorId:'isolated-staff',actualHours:5});assert.equal(settled.workSettlement.finalTotalCents,22500);assert.equal(settled.workSettlement.extraDueCents,4500);assert.equal(f.calls.filter(c=>c.kind==='create').length,1);
 const options={expectedRevision:settled.revision,operatorId:'isolated-staff'};await f.service.createExtraPayment(b.bookingId,options);await f.service.createExtraPayment(b.bookingId,options);assert.equal(f.calls.filter(c=>c.kind==='create').length,2);assert.equal(f.calls.at(-1).amount,4500);
 await f.service.reconcileExtra(b.bookingId);await f.service.reconcileExtra(b.bookingId);assert.equal(f.get(b).payment.amountPaidCents,22500);assert.equal(f.get(b).payment.outstandingCents,0);await f.service.reconcile(b.bookingId);assert.equal(f.get(b).payment.amountPaidCents,22500);assert.equal(f.get(b).scheduling.status,'completed');
 assert.equal(settledHourlyQuote({...defaultSelection('endOfTenancy'),mode:'hourly'},0).finalTotalCents,13500);
});

test('hourly overestimate refund is bounded by minimum and recorded only after provider verification',async()=>{
 const f=fixture(),b=await f.create();await f.confirm(b);await f.paid(b);await f.service.settleWork(b.bookingId,{expectedRevision:f.get(b).revision,operatorId:'isolated-staff',actualHours:1});assert.equal(f.get(b).workSettlement.finalTotalCents,13500);assert.equal(f.get(b).workSettlement.refundDueCents,4500);
 const options={expectedRevision:f.get(b).revision,operatorId:'isolated-staff',amountCents:4500,idempotencyKey:'isolated_refund_adjustment_123'};await f.service.refund(b.bookingId,options);await f.service.refund(b.bookingId,options);assert.equal(f.get(b).payment.refundedCents,4500);assert.equal(f.calls.filter(c=>c.kind==='refund').length,1);assert.equal(f.get(b).payment.refunds[0].status,'verified');assert.equal(f.get(b).payment.outstandingCents,0);
});

test('cancellation tiers use the v3 confirmed price at exact48h and12h boundaries',()=>{
 const record={quote:{totalCents:18000,minimumChargeCents:13500},payment:{totalDueCents:18000,amountPaidCents:18000,refundedCents:0}};
 for(const [hours,percent,refund]of[[48,100,18000],[47.999,50,9000],[12,50,9000],[11.999,0,0]]){const result=cancellationRefundQuote(record,initial+hours*3600000,initial);assert.equal(result.refundPercent,percent);assert.equal(result.refundCents,refund);}
 assert.equal(cancellationRefundQuote({...record,payment:{...record.payment,amountPaidCents:2000}},initial+24*3600000,initial).refundCents,0);
});

test('unknown refund POST is never blindly repeated and can be reconciled by the same explicit operation',async()=>{
 const f=fixture(),b=await f.create();await f.confirm(b);await f.paid(b);await f.service.cancel(b.bookingId,{expectedRevision:f.get(b).revision,operatorId:'isolated-staff'});const options={expectedRevision:f.get(b).revision,operatorId:'isolated-staff',amountCents:18000,idempotencyKey:'isolated_unknown_refund_123'};f.setRefundUnknown(true);await assert.rejects(f.service.refund(b.bookingId,options),{code:'REFUND_RECONCILIATION_REQUIRED'});assert.equal(f.get(b).payment.refundedCents,0);
 await f.service.refund(b.bookingId,options);assert.equal(f.calls.filter(c=>c.kind==='refund').length,1);assert.equal(f.get(b).payment.refunds[0].status,'pending');f.proveRefund(18000);await f.service.refund(b.bookingId,options);assert.equal(f.get(b).payment.refundedCents,18000);assert.equal(f.get(b).payment.outstandingCents,0);assert.equal(f.get(b).scheduling.status,'cancelled');assert.equal(f.service.view(f.get(b)).canStart,false);
});

test('stored v2 financial and legal snapshots retain15% minimum and original v2 deadline',async()=>{
 const f=fixture(),selection={...defaultSelection('endOfTenancy'),mode:'hourly' as const,hours:4},b=await f.create(selection),record=f.get(b),version='kraken-agb-2026-11-26-v2',meta=termsMetadata(version,'es')!,german=termsMetadata(version,'de')!;
 record.quote=calculateLegacyPrice(selection);record.termsVersion=version;record.termsAcceptance={version,acceptedAt:initial-10*day,language:'es',sourceLanguage:meta.sourceLanguage,documentSha256:meta.sha256,germanSha256:german.sha256,documentUrl:meta.documentUrl,pdfUrl:meta.pdfUrl};record.payment={status:'not_started',depositPercent:15,amountDueNowCents:2025,amountPaidCents:0,remainingBalanceCents:18000};const before=clone(record);
 await f.confirm(b);await f.checkout(b);assert.equal(f.calls[0].amount,2025);assert.equal(f.get(b).payment.depositDueAt,new Date(depositPaymentDeadline(initial,Date.parse('2026-12-10T09:00:00Z'))).toISOString());assert.deepEqual(f.get(b).quote,before.quote);assert.deepEqual(f.get(b).termsAcceptance,before.termsAcceptance);assert.equal(f.get(b).payment.model,undefined);await assert.rejects(f.service.cancel(b.bookingId,{expectedRevision:f.get(b).revision,operatorId:'isolated-staff'}),{code:'LEGACY_BOOKING_REVIEW_REQUIRED'});
});

test('real Payrexx adapter sends exact full cents and verifies refund cumulative provider state',async()=>{
 let refunded=0;const calls:any[]=[],booking:any={termsVersion:BOOKING_TERMS_VERSION,bookingId:'isolated123',reference:'K-2026-ISOLATED',language:'es',checkout:{reference:'isolated123-r1',gatewayId:1},payment:{amountDueNowCents:18000,initialChargeCents:18000,transactionId:'42'}};
 const transaction=()=>({id:42,referenceId:'isolated123-r1',mode:'TEST',status:'confirmed',partiallyRefundable:true,refundable:true,invoice:{currency:'CHF',originalAmount:18000,refundedAmount:refunded}});
 const adapter=createPayrexxAdapter({instance:'isolated',secret:'not-real',mode:'test',origin:'https://kraken.example'},async(url,options)=>{calls.push({url:String(url),method:options?.method,body:options?.body?JSON.parse(String(options.body)):null});if(options?.method==='POST'&&String(url).includes('Gateway/'))return Response.json({status:'success',data:[{id:1,link:'https://isolated.payrexx.com/checkout'}]});if(options?.method==='POST'){refunded+=JSON.parse(String(options.body)).amount;return Response.json({status:'success',data:[{id:99,status:'refund_pending'}]});}return Response.json({status:'success',data:[transaction()]});});
 await adapter.create(booking,'isolated-token',60);assert.equal(calls[0].body.amount,18000);await adapter.refund(booking,4500);const result=await adapter.verifyRefund(booking,4500);assert.equal(result.verified,true);assert.equal(result.refundedCents,4500);assert.equal(calls.filter(c=>c.method==='POST'&&c.url.includes('/refund')).length,1);assert.deepEqual(calls.find(c=>c.url.includes('/refund')).body,{amount:4500});
});

test('refund adapter refuses mismatched original charge and cannot fabricate a verified refund from pending provider state',async()=>{
 const booking:any={termsVersion:BOOKING_TERMS_VERSION,checkout:{reference:'isolated-r1',gatewayId:1},payment:{amountDueNowCents:18000,initialChargeCents:18000,transactionId:'42'}};
 for(const mutation of [{referenceId:'foreign-r1'},{mode:'LIVE'},{invoice:{currency:'CHF',refundedAmount:0}},{invoice:{currency:'CHF',currencyAlpha3:'EUR',originalAmount:18000,refundedAmount:0}},{invoice:{currency:'CHF',originalAmount:18001,refundedAmount:0}},{invoice:{currency:'CHF',originalAmount:18000,refundedAmount:-1}}]){
  let posts=0;const adapter=createPayrexxAdapter({instance:'isolated',secret:'not-real',mode:'test',origin:'https://kraken.example'},async(_url,options)=>{if(options?.method==='POST')posts++;return Response.json({status:'success',data:[{id:42,referenceId:'isolated-r1',mode:'TEST',status:'confirmed',partiallyRefundable:true,invoice:{currency:'CHF',originalAmount:18000,refundedAmount:0},...mutation}]});});
  await assert.rejects(adapter.refund(booking,4500),{code:'PAYMENT_MISMATCH'});assert.equal(posts,0);
 }
 const pending=createPayrexxAdapter({instance:'isolated',secret:'not-real',mode:'test',origin:'https://kraken.example'},async()=>Response.json({status:'success',data:[{id:42,referenceId:'isolated-r1',mode:'TEST',status:'refund_pending',invoice:{currency:'CHF',originalAmount:18000,refundedAmount:4500}}]}));
 assert.equal((await pending.verifyRefund(booking,4500)).verified,false);
});

test('v3 refund-terminal gateway verification requires original amount and bounded cumulative refund, preserving the original charge ID',async()=>{
 const booking:any={termsVersion:BOOKING_TERMS_VERSION,checkout:{reference:'isolated-r1',gatewayId:1},payment:{amountDueNowCents:18000,transactionId:'42'}};
 function adapter(invoice:any){return createPayrexxAdapter({instance:'isolated',secret:'not-real',mode:'test',origin:'https://kraken.example'},async()=>Response.json({status:'success',data:[{id:1,invoices:[{currency:'CHF',referenceId:'isolated-r1',originalAmount:18000,refundedAmount:4500,...invoice,transactions:[{id:99,amount:-4500,status:'partially-refunded',originalTransactionId:42,mode:'TEST',referenceId:'isolated-r1'}]}]}]}));}
 const result=await adapter({}).verify(booking);assert.equal(result.status,'partially_refunded');assert.equal(result.transactionId,'42');assert.equal(result.refundedCents,4500);
 for(const data of [{originalAmount:undefined},{refundedAmount:-1},{refundedAmount:18001},{refundedAmount:'4500'}])await assert.rejects(adapter(data).verify(booking),{code:'PAYMENT_MISMATCH'});
});

test('an external provider refund must be reconciled before another refund POST can exceed the contractual allowance',async()=>{
 let posts=0;const booking:any={termsVersion:BOOKING_TERMS_VERSION,checkout:{reference:'isolated-r1'},payment:{amountDueNowCents:18000,initialChargeCents:18000,transactionId:'42',refundedCents:0}};
 const adapter=createPayrexxAdapter({instance:'isolated',secret:'not-real',mode:'test',origin:'https://kraken.example'},async(_url,options)=>{if(options?.method==='POST')posts++;return Response.json({status:'success',data:[{id:42,referenceId:'isolated-r1',mode:'TEST',status:'partially-refunded',partiallyRefundable:true,invoice:{currency:'CHF',originalAmount:18000,refundedAmount:4500}}]});});
 await assert.rejects(adapter.refund(booking,9000),{code:'REFUND_RECONCILIATION_REQUIRED'});assert.equal(posts,0);
});

test('stale main-charge verification cannot reduce a provider-verified cumulative refund',async()=>{
 const f=fixture({verify:async()=>({status:'test_paid',transactionId:'42',refundedCents:0})}),b=await f.create();await f.confirm(b);await f.paid(b);await f.service.settleWork(b.bookingId,{expectedRevision:f.get(b).revision,operatorId:'isolated-staff',actualHours:1});await f.service.refund(b.bookingId,{expectedRevision:f.get(b).revision,operatorId:'isolated-staff',amountCents:4500,idempotencyKey:'isolated_monotonic_refund_123'});await f.service.reconcile(b.bookingId);assert.equal(f.get(b).payment.refundedCents,4500);assert.equal(f.get(b).payment.status,'partially_refunded');assert.equal(f.get(b).payment.outstandingCents,0);
});

test('documented v1.18+ original payment remains confirmed while invoice cumulative refunds prove accepted refunds',async()=>{
 const booking:any={termsVersion:BOOKING_TERMS_VERSION,checkout:{reference:'isolated-r1'},payment:{amountDueNowCents:10000,initialChargeCents:10000,transactionId:'4711',refundedCents:0}};
 let total=0,posts=0;const adapter=createPayrexxAdapter({instance:'isolated',secret:'not-real',mode:'test',origin:'https://kraken.example'},async(_url,options)=>{if(options?.method==='POST'){posts++;total+=JSON.parse(String(options.body)).amount;return Response.json({status:'success',data:[{id:4712,status:'partially-refunded',amount:-2500,originalTransactionId:4711,invoice:{originalAmount:10000,refundedAmount:2500,currencyAlpha3:'CHF'}}]});}return Response.json({status:'success',data:[{id:4711,referenceId:'isolated-r1',amount:10000,status:'confirmed',mode:'TEST',refundable:true,partiallyRefundable:true,invoice:{originalAmount:10000,refundedAmount:total,currencyAlpha3:'CHF'}}]});});
 assert.equal((await adapter.verifyRefund(booking,2500)).verified,false);await adapter.refund(booking,2500);const verified=await adapter.verifyRefund(booking,2500);assert.equal(verified.verified,true);assert.equal(verified.refundedCents,2500);assert.equal(verified.id,'4711');assert.equal(posts,1);
});

test('main original confirmed invoice can reveal a partial refund without a child in gateway response or an earlier paid read',async()=>{
 const f=fixture({verify:async()=>({status:'test_paid',transactionId:'42',refundedCents:4500})}),b=await f.create();await f.confirm(b);await f.checkout(b);await f.service.reconcile(b.bookingId);assert.equal(f.get(b).payment.amountPaidCents,18000);assert.equal(f.get(b).payment.refundedCents,4500);assert.equal(f.get(b).payment.status,'partially_refunded');assert.equal(f.service.view(f.get(b)).canStart,false);
});

test('a provider refund child linked to a different original transaction cannot change this booking',async()=>{
 const booking:any={termsVersion:BOOKING_TERMS_VERSION,checkout:{reference:'isolated-r1',gatewayId:1},payment:{amountDueNowCents:10000,transactionId:'4711'}};
 const adapter=createPayrexxAdapter({instance:'isolated',secret:'not-real',mode:'test',origin:'https://kraken.example'},async()=>Response.json({status:'success',data:[{id:1,invoices:[{referenceId:'isolated-r1',originalAmount:10000,refundedAmount:2500,currencyAlpha3:'CHF',transactions:[{id:4712,status:'partially-refunded',amount:-2500,originalTransactionId:9999,mode:'TEST',referenceId:'isolated-r1'}]}]}]}));
 await assert.rejects(adapter.verify(booking),{code:'PAYMENT_MISMATCH'});
});
