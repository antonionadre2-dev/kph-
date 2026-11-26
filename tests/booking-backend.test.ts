import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createBookingHandlers, createBookingService, validateBookingRequest, validateAppointment, BOOKING_TERMS_VERSION } from '../server/booking.ts';
import { calculatePrice, defaultSelection, PRICING_VERSION } from '../src/booking/pricing.ts';
import { BookingError } from '../server/booking-store.ts';
import { createPayrexxAdapter } from '../server/booking-payrexx.ts';
import { renderBookingEmail, createResendEmailAdapter } from '../server/booking-email.ts';
import { generateKeyPairSync } from 'node:crypto';
import { deleteApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const now=Date.parse('2026-11-24T10:00:00Z');
const clone=(value:any)=>structuredClone(value);
function memoryStore() {
  const records=new Map<string,any>(),keys=new Map<string,any>(),mail=new Map<string,any>();
  return {records,mail,
    async get(id:string){return clone(records.get(id)||null);},
    async create(key:string,fingerprint:string,record:any,job:any){const previous=keys.get(key);if(previous){if(previous.fingerprint!==fingerprint)throw new BookingError('IDEMPOTENCY_CONFLICT',409);return clone(records.get(previous.id));}if(record.recoveryId){const linked=[...records.values()].find(row=>row.recoveryId===record.recoveryId);if(linked)return clone(linked);}records.set(record.bookingId,clone(record));keys.set(key,{id:record.bookingId,fingerprint});mail.set(job.id,clone(job));return clone(record);},
    async mutate(id:string,transform:any){const next=transform(clone(records.get(id)));records.set(id,clone(next));return clone(next);},
    async mutateWithMail(id:string,transform:any,makeJob:any){const next=transform(clone(records.get(id))),job=makeJob(next);records.set(id,clone(next));if(job&&!mail.has(job.id))mail.set(job.id,clone(job));return clone(next);},
    async addMail(job:any){if(mail.has(job.id))return false;mail.set(job.id,clone(job));return true;},
    async listDueMail(time:number){return [...mail.values()].filter(job=>job.status==='queued'&&job.dueAt<=time).map(clone);},
    async claimMail(id:string,time:number){const job=mail.get(id);if(job?.status!=='queued')return null;job.status='sending';return clone(job);},
    async finishMail(id:string,status:string,providerId:string){Object.assign(mail.get(id),{status,providerId});},
    async markStaleMail(){},async consumeRate(){return true;},async isEmailSuppressed(){return false;},async listByEmail(email:string){return [...records.values()].filter(record=>record.customer.email===email);},
  };
}
const request=(overrides:any={})=>{
  const selection=defaultSelection('regular');
  return {selection,customer:{name:'Test Customer',email:'test@example.test',phone:'+41770000000',address:'Teststrasse 1',postalCode:'8200',city:'Schaffhausen'},requestedDate:'2026-11-25',requestedTime:'10:00',notes:'',language:'es',termsAccepted:true,termsVersion:BOOKING_TERMS_VERSION,pricingVersion:PRICING_VERSION,acceptedTotalCents:calculatePrice(selection).totalCents,idempotencyKey:'test_idempotency_123456',...overrides};
};
function serviceFixture(payment:any=null,sendEmail:any=null) {
  const store=memoryStore();const service=createBookingService({store:store as any,tokenSecret:'server-private-test-secret-over-32-characters',origin:'https://krakenpfm.ch',mode:'live',payment,sendEmail,sender:'test@example.test',clock:()=>now});return {service,store};
}
test('server uses proposal version and rejects a browser amount/version change',()=>{
  assert.equal(validateBookingRequest(request(),now).quote.pricingVersion,PRICING_VERSION);
  assert.throws(()=>validateBookingRequest(request({acceptedTotalCents:1}),now),{code:'PRICE_CHANGED'});
  assert.throws(()=>validateBookingRequest(request({pricingVersion:'old'}),now),{code:'PRICE_CHANGED'});
  assert.throws(()=>validateBookingRequest(request({termsAccepted:false}),now),{code:'TERMS_REQUIRED'});
  assert.throws(()=>validateBookingRequest(request({termsVersion:'kraken-2026-11-24'}),now),{code:'TERMS_REQUIRED'});
});
test('server validates Zurich calendar, future date, hours and Swiss postcode',()=>{
  assert.equal(validateAppointment('2026-11-25','10:00',now),Date.parse('2026-11-25T09:00:00Z'));
  assert.equal(validateAppointment('2027-07-01','10:00',now),Date.parse('2027-07-01T08:00:00Z'));
  assert.throws(()=>validateAppointment('2027-02-30','10:00',now),{code:'INVALID_DATE'});
  assert.throws(()=>validateAppointment('2026-11-25','02:15',now),{code:'INVALID_TIME'});
  assert.throws(()=>validateAppointment('2026-11-23','10:00',now),{code:'DATE_OUT_OF_RANGE'});
  assert.throws(()=>validateBookingRequest(request({customer:{...request().customer,postalCode:'12345'}}),now),{code:'INVALID_POSTAL_CODE'});
});
test('identical request retries return the same booking and one request email; altered payload conflicts',async()=>{
  const {service,store}=serviceFixture();const first=await service.create(request()),second=await service.create(request());
  assert.equal(first.bookingId,second.bookingId);assert.equal(store.records.size,1);assert.equal(store.mail.size,1);
  assert.equal(first.scheduling.status,'requested');assert.equal(first.canCheckout,false);assert.equal(first.email.receipt,undefined);
  assert.equal(first.payment.amountDueNowCents,Math.round(first.quote.totalCents*0.15));assert.equal(first.payment.amountPaidCents,0);
  await assert.rejects(service.create(request({notes:'different scope'})),{code:'IDEMPOTENCY_CONFLICT'});
  await assert.rejects(service.read(first.bookingId,'wrong-token-with-enough-length'),{code:'BOOKING_NOT_FOUND'});
});
test('manual review cannot become a confirmed payable booking',async()=>{
  const {service}=serviceFixture({create(){throw new Error('must not call');}});
  const selection={service:'moving' as const,details:'Legacy personal scope'};const booking=await service.create(request({selection,acceptedTotalCents:null}));
  assert.equal(booking.quote.totalCents,null);assert.equal(booking.canCheckout,false);
  await assert.rejects(service.confirmAppointment(booking.bookingId,{operatorId:'operator',holdExpiresAt:'2026-11-24T14:00:00Z'}),{code:'MANUAL_REVIEW_REQUIRED'});
});
test('only a server-authorized written offer resolves manual review as a newly accepted revision',async()=>{
  const {service}=serviceFixture({async create(){return {id:1,link:'https://test.payrexx.com/valid'};}});
  const booking=await service.create(request({selection:{service:'moving' as const,details:'Legacy personal scope'},acceptedTotalCents:null}));
  await assert.rejects(service.approveManualQuote(booking.bookingId,{operatorId:'',totalCents:25000,scopeNotes:'Written approved moving scope'}),{code:'INVALID_APPROVED_PRICE'});
  await service.approveManualQuote(booking.bookingId,{operatorId:'authorized-operator',totalCents:25000,scopeNotes:'Written approved moving scope'});
  await service.confirmAppointment(booking.bookingId,{operatorId:'authorized-operator',holdExpiresAt:'2026-11-24T14:00:00Z'});
  assert.equal((await service.read(booking.bookingId,booking.publicToken)).scheduling.status,'held');
  const revised=await service.read(booking.bookingId,booking.publicToken);assert.equal(revised.quoteRevision,2);assert.equal(revised.quote.totalCents,25000);assert.equal(revised.payment.amountDueNowCents,3750);assert.equal(revised.scopeNotes,'Written approved moving scope');
  await assert.rejects(service.checkout(booking.bookingId,booking.publicToken,{acceptedQuoteRevision:1,termsAccepted:true,termsVersion:BOOKING_TERMS_VERSION,language:'es'}),{code:'PRICE_CHANGED'});
});
test('checkout requires authorized confirmation, stays idempotent, charges 15% and never trusts a redirect',async()=>{
  let calls=0;const payment={async create(record:any){calls++;assert.equal(record.payment.amountDueNowCents,Math.round(record.quote.totalCents*.15));return {id:1,link:'https://test.payrexx.com/valid'};},async verify(){return {status:'pending',transactionId:'1'};}};
  const {service,store}=serviceFixture(payment);const booking=await service.create(request());
  const body={acceptedQuoteRevision:1,termsAccepted:true,termsVersion:BOOKING_TERMS_VERSION,language:'es'};
  await assert.rejects(service.checkout(booking.bookingId,booking.publicToken,body),{code:'CHECKOUT_NOT_AVAILABLE'});
  await service.confirmAppointment(booking.bookingId,{operatorId:'authorized-operator',holdExpiresAt:'2026-11-24T14:00:00Z'});
  const first=await service.checkout(booking.bookingId,booking.publicToken,body),second=await service.checkout(booking.bookingId,booking.publicToken,body);
  assert.deepEqual(first,second);assert.equal(calls,1);
  const state=await service.read(booking.bookingId,booking.publicToken);assert.equal(state.payment.status,'pending');assert.equal(state.scheduling.status,'held');assert.equal(state.payment.amountPaidCents,0);assert.equal(store.mail.size,1);
});
test('existing bookings retain their accepted terms and amounts when the public version changes',async()=>{
  let calls=0;const {service,store}=serviceFixture({async create(){calls++;return {id:42,link:'https://test.payrexx.com/existing'};}});
  const booking=await service.create(request());const record=store.records.get(booking.bookingId);record.termsVersion='kraken-2026-11-24';
  await service.confirmAppointment(booking.bookingId,{operatorId:'authorized-operator',holdExpiresAt:'2026-11-24T14:00:00Z'});
  const input={acceptedQuoteRevision:1,termsAccepted:true,termsVersion:'kraken-2026-11-24',language:'es'};
  await assert.rejects(service.checkout(booking.bookingId,booking.publicToken,{...input,termsVersion:BOOKING_TERMS_VERSION}),{code:'TERMS_REQUIRED'});
  await assert.rejects(service.checkout(booking.bookingId,booking.publicToken,{...input,termsAccepted:false}),{code:'TERMS_REQUIRED'});
  assert.equal(calls,0);
  const result=await service.checkout(booking.bookingId,booking.publicToken,input);assert.equal(result.link,'https://test.payrexx.com/existing');assert.equal(calls,1);
  const saved=store.records.get(booking.bookingId);assert.equal(saved.termsVersion,'kraken-2026-11-24');assert.equal(saved.quote.totalCents,booking.quote.totalCents);assert.equal(saved.payment.amountDueNowCents,booking.payment.amountDueNowCents);
});
test('new Payrexx checkout and all returns use the current validated presentation language without changing communications',async()=>{
  for(const locale of ['de','en','es','fr-CH','it','pt']) {
    const expected=locale.split('-')[0];let gatewayRequest:any,calls=0;
    const adapter=createPayrexxAdapter({instance:'kraken-test',secret:'synthetic-not-real',mode:'live',origin:'https://krakenpfm.ch'},async(_url:any,options:any)=>{
      calls++;assert.equal(options.method,'POST');gatewayRequest=JSON.parse(options.body);
      return Response.json({status:'success',data:[{id:42,link:'https://kraken-test.payrexx.com/isolated-checkout'}]});
    });
    const {service,store}=serviceFixture(adapter),booking=await service.create(request({language:'es'}));
    const snapshot=structuredClone(store.records.get(booking.bookingId).languageSnapshot);
    await service.confirmAppointment(booking.bookingId,{operatorId:'isolated-test-operator',holdExpiresAt:new Date(now+30*60000).toISOString()});
    const input={termsAccepted:true,termsVersion:BOOKING_TERMS_VERSION,acceptedQuoteRevision:booking.quoteRevision,language:locale};
    await assert.rejects(service.checkout(booking.bookingId,booking.publicToken,{...input,language:'invalid'}),{code:'INVALID_LANGUAGE'});
    assert.equal(calls,0,'Invalid presentation language must not create a provider request');
    const checkout=await service.checkout(booking.bookingId,booking.publicToken,input);
    assert.equal(gatewayRequest.language,expected);
    for(const field of ['successRedirectUrl','failedRedirectUrl','cancelRedirectUrl']) {
      const target=new URL(gatewayRequest[field]);
      assert.equal(target.origin,'https://krakenpfm.ch');assert.equal(target.searchParams.get('lang'),expected);
      assert.equal(target.searchParams.get('booking'),booking.bookingId);
      assert.equal(new URLSearchParams(target.hash.slice(1)).get('access'),booking.publicToken);
    }
    const persisted=store.records.get(booking.bookingId);
    assert.equal(persisted.language,'es');assert.deepEqual(persisted.languageSnapshot,snapshot);
    assert.equal(persisted.payment.amountDueNowCents,Math.round(persisted.quote.totalCents*.15));
    assert.deepEqual(await service.checkout(booking.bookingId,booking.publicToken,input),checkout);
    assert.equal(calls,1,'A presentation-language fix must not weaken checkout idempotency');
  }
});
test('uncertain checkout creation is blocked from automatic retries',async()=>{
  let calls=0;const {service}=serviceFixture({async create(){calls++;throw new Error('timeout');}});
  const booking=await service.create(request());await service.confirmAppointment(booking.bookingId,{operatorId:'operator',holdExpiresAt:'2026-11-24T14:00:00Z'});
  const body={acceptedQuoteRevision:1,termsAccepted:true,termsVersion:BOOKING_TERMS_VERSION,language:'es'};
  await assert.rejects(service.checkout(booking.bookingId,booking.publicToken,body),{code:'PAYMENT_RECONCILIATION_REQUIRED'});
  await assert.rejects(service.checkout(booking.bookingId,booking.publicToken,body),{code:'PAYMENT_RECONCILIATION_REQUIRED'});assert.equal(calls,1);
});
test('verified paid update atomically queues one receipt, preserves balance and no duplicate provider email',async()=>{
  let emails=0;const {service,store}=serviceFixture({async create(){return {id:1,link:'https://test.payrexx.com/valid'};},async verify(){return {status:'paid',transactionId:'tx-1'};}},async()=>({id:`email-${++emails}`}));
  const booking=await service.create(request());await service.confirmAppointment(booking.bookingId,{operatorId:'operator',holdExpiresAt:'2026-11-24T14:00:00Z'});
  await service.checkout(booking.bookingId,booking.publicToken,{acceptedQuoteRevision:1,termsAccepted:true,termsVersion:BOOKING_TERMS_VERSION,language:'fr'});
  await service.reconcile(booking.bookingId);const second=await service.reconcile(booking.bookingId);
  assert.equal(second.payment.amountPaidCents,second.payment.amountDueNowCents);assert.equal(second.payment.remainingBalanceCents,second.quote.totalCents-second.payment.amountPaidCents);assert.equal(second.scheduling.status,'confirmed');
  assert.equal(second.language,'es');assert.equal(store.mail.size,2);
  await service.runDue();await service.runDue();assert.equal(emails,2);assert.equal((await service.read(booking.bookingId,booking.publicToken)).email.receipt,'sent');
});
test('a slow verified paid response cannot revive a booking after a newer terminal refund result',async()=>{
  let finishPaid:(value:any)=>void;let calls=0;
  const {service,store}=serviceFixture({async create(){return {id:1,link:'https://test.payrexx.com/valid'};},async verify(){calls++;if(calls===1)return new Promise(resolve=>{finishPaid=resolve;});return {status:'refunded',transactionId:'refund-1'};}});
  const booking=await service.create(request());await service.confirmAppointment(booking.bookingId,{operatorId:'operator',holdExpiresAt:'2026-11-24T14:00:00Z'});
  await service.checkout(booking.bookingId,booking.publicToken,{acceptedQuoteRevision:1,termsAccepted:true,termsVersion:BOOKING_TERMS_VERSION,language:'es'});
  const slow=service.reconcile(booking.bookingId);await new Promise(resolve=>setImmediate(resolve));
  await service.reconcile(booking.bookingId);finishPaid!({status:'paid',transactionId:'paid-1'});await slow;
  assert.equal(store.records.get(booking.bookingId).payment.status,'refunded');assert.equal(store.mail.size,1);
});
test('concurrent requests with one recovery draft resume one booking even with distinct client keys',async()=>{
  const {service,store}=serviceFixture();service.setRecovery({async read(){return {email:'test@example.test',bookingId:null};},async linkBooking(){return {linked:true};}});
  const recovery={id:'valid_saved_draft_123456789',accessToken:'valid_capability_token_123456789012345678901234'};
  const [first,second]=await Promise.all([service.create(request({recovery,idempotencyKey:'first_client_key_123456789'})),service.create(request({recovery,idempotencyKey:'second_client_key_123456789'}))]);assert.equal(first.bookingId,second.bookingId);assert.equal(store.records.size,1);assert.equal(store.mail.size,1);
});
test('email uncertain acceptance becomes delivery_unknown and is not blindly resent',async()=>{
  let calls=0;const {service,store}=serviceFixture(null,async()=>{calls++;throw new Error('socket closed');});await service.create(request());await service.runDue();await service.runDue();assert.equal(calls,1);assert.equal([...store.mail.values()][0].status,'delivery_unknown');
});
test('provider suppression blocks pending transaction emails and optional account links',async()=>{
  let calls=0;const {service,store}=serviceFixture(null,async()=>{calls++;return {id:'must-not-send'};});
  const booking=await service.create(request());
  await store.addMail({id:'customer-access-test',bookingId:null,kind:'customer_access',email:'test@example.test',status:'queued',dueAt:now,expiresAt:now+60000,message:{subject:'test',html:'test',text:'test'}});
  store.isEmailSuppressed=async()=>true;
  await service.runDue();assert.equal(calls,0);
  assert.ok([...store.mail.values()].every(job=>job.status==='cancelled'));
  assert.equal(store.records.get(booking.bookingId).email.request,'failed');
});
test('transactional email templates support six languages and distinguish requested from confirmed',async()=>{
  const {service,store}=serviceFixture();const booking=await service.create(request());const record=store.records.get(booking.bookingId);
  for(const locale of ['de','en','es','fr','it','pt']) {
    const rendered=renderBookingEmail({...record,language:locale},'request','https://krakenpfm.ch','test-token');
    assert.ok(rendered.text.includes('Europe/Zurich'));assert.ok(rendered.text.includes(booking.reference));assert.ok(!rendered.text.includes('service.regular'));assert.ok(!rendered.text.includes('individualReview'));assert.ok(rendered.html.includes(`<html lang="${locale}">`));
  }
  const testReceipt=renderBookingEmail({...record,mode:'test'},'receipt','https://krakenpfm.ch','test-token');assert.match(testReceipt.subject,/TEST.*NO LIVE PAYMENT/);
});
function providerFixture(overrides:any={}) {
  const record={checkout:{gatewayId:42,reference:'booking-r1'},payment:{amountDueNowCents:1500}};
  const fixture={id:42,invoices:[{referenceId:'booking-r1',currency:'CHF',transactions:[{id:9,referenceId:'booking-r1',amount:1500,status:'confirmed',mode:'LIVE',instance:{name:'kraken-test'},...overrides}]}]};
  const adapter=createPayrexxAdapter({instance:'kraken-test',secret:'not-real',mode:'live',origin:'https://krakenpfm.ch'},async(url:any,options:any)=>{assert.equal(options.headers['X-API-KEY'],'not-real');assert.match(String(url),/Gateway\/42/);return new Response(JSON.stringify({status:'success',data:[fixture]}),{status:200});});
  return {adapter,record,fixture};
}
test('Payrexx authenticated verification rejects amount, mode and currency mismatch',async()=>{
  const valid=providerFixture();assert.equal((await valid.adapter.verify(valid.record)).status,'paid');
  for(const mismatch of [{amount:1},{mode:'TEST'},{referenceId:'different'}]) {const {adapter,record}=providerFixture(mismatch);if(mismatch.referenceId)assert.equal((await adapter.verify(record)).status,'pending');else await assert.rejects(adapter.verify(record),{code:'PAYMENT_MISMATCH'});}
  const currency=providerFixture();currency.fixture.invoices[0].currency='EUR';await assert.rejects(currency.adapter.verify(currency.record),{code:'PAYMENT_MISMATCH'});
});
test('Payrexx cannot settle a transaction without a positive safe-integer provider ID',async()=>{
  const valid=providerFixture();
  assert.deepEqual(await valid.adapter.verify(valid.record),{status:'paid',transactionId:'9'});
  for(const id of [undefined,null,'9','',0,-1,1.5,Number.MAX_SAFE_INTEGER+1,{},[]]) {
    const {adapter,record}=providerFixture({id});
    await assert.rejects(adapter.verify(record),{code:'PAYMENT_MISMATCH'},`invalid provider ID: ${JSON.stringify(id)}`);
  }
});
test('a malformed confirmed Payrexx result never records paid money or queues a receipt',async()=>{
  let gatewayRequest:any;
  const adapter=createPayrexxAdapter({instance:'kraken-test',secret:'synthetic-not-real',mode:'live',origin:'https://krakenpfm.ch'},async(_url:any,options:any)=>{
    if(options.method==='POST') {
      gatewayRequest=JSON.parse(options.body);
      return Response.json({status:'success',data:[{id:42,link:'https://kraken-test.payrexx.com/isolated-checkout'}]});
    }
    return Response.json({status:'success',data:[{id:42,invoices:[{currency:'CHF',referenceId:gatewayRequest.referenceId,transactions:[{amount:gatewayRequest.amount,status:'confirmed',mode:'LIVE',instance:{name:'kraken-test'}}]}]}]});
  });
  const {service,store}=serviceFixture(adapter);
  const booking=await service.create(request());
  await service.confirmAppointment(booking.bookingId,{operatorId:'isolated-test-operator',holdExpiresAt:new Date(now+30*60000).toISOString()});
  await service.checkout(booking.bookingId,booking.publicToken,{termsAccepted:true,termsVersion:BOOKING_TERMS_VERSION,acceptedQuoteRevision:booking.quoteRevision,language:'es'});
  await assert.rejects(service.reconcile(booking.bookingId),{code:'PAYMENT_MISMATCH'});
  const saved=store.records.get(booking.bookingId);
  assert.equal(saved.payment.status,'reconciliation_required');
  assert.equal(saved.payment.amountPaidCents,0);
  assert.equal([...store.mail.values()].some(job=>job.kind==='receipt'),false);
});
test('refund/chargeback replaces previous paid state instead of reviving an active receipt',async()=>{
  const {adapter,record,fixture}=providerFixture();fixture.invoices[0].transactions.push({...fixture.invoices[0].transactions[0],id:10,status:'chargeback'});assert.equal((await adapter.verify(record)).status,'chargeback');
});
test('Resend adapter sends real provider idempotency, does not claim delivery on an uncertain result',async()=>{
  let header='';const send=createResendEmailAdapter('not-real',async(_url:any,options:any)=>{header=options.headers['Idempotency-Key'];return new Response('{"id":"accepted-id"}',{status:200});});
  assert.deepEqual(await send({from:'from@example.test',to:'to@example.test',subject:'test',html:'test',text:'test',idempotencyKey:'stable-key'}),{id:'accepted-id'});assert.equal(header,'stable-key');
  await assert.rejects(createResendEmailAdapter('not-real',async()=>{throw new Error('timeout');})({}),{code:'EMAIL_OUTCOME_UNKNOWN'});
});
test('unconfigured HTTP backend is explicit, private and never manufactures activity or a successful booking',async()=>{
  const app=express(),handlers=createBookingHandlers({env:{},clock:()=>now});app.use(express.json({limit:'32kb'}));app.use(handlers.middleware);
  const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.on('listening',resolve));
  try {
    const address=server.address() as any,origin=`http://127.0.0.1:${address.port}`;
    const config=await fetch(`${origin}/api/booking/config`);assert.equal(config.headers.get('cache-control'),'private, no-store');assert.deepEqual(await config.json(),{available:false,paymentReady:false,emailReady:false,mode:'unconfigured',termsVersion:BOOKING_TERMS_VERSION,depositPercent:15});
    const response=await fetch(`${origin}/api/booking/requests`,{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://krakenpfm.ch'},body:JSON.stringify(request())});assert.equal(response.status,503);assert.deepEqual(await response.json(),{code:'BOOKING_NOT_CONFIGURED'});
    const activity=await fetch(`${origin}/api/bookings/activity`);assert.deepEqual(await activity.json(),{events:[],cursor:null});
    const crossOrigin=await fetch(`${origin}/api/booking/requests`,{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://attacker.invalid'},body:'{}'});assert.equal(crossOrigin.status,403);
  }finally {await new Promise<void>(resolve=>server.close(()=>resolve()));}
});

test('booking HTTP config reports email readiness independently of booking and saved-quote availability', async (t) => {
  const diagnostics:any[][]=[];
  t.mock.method(console,'info',(...args:any[])=>diagnostics.push(args));
  // A synthetic in-memory signing key initializes the SDK locally. No Firebase,
  // Payrexx or Resend operation is performed by these configuration GETs.
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } });
  const credential = JSON.stringify({ type: 'service_account', project_id: 'kraken-email-test',
    client_email: 'booking-test@kraken-email-test.iam.gserviceaccount.com', private_key: privateKey });
  for (const emailConfigured of [false, true]) {
    diagnostics.length=0;
    const env = { BOOKING_ENABLED: 'true', BOOKING_TOKEN_SECRET: 'synthetic-booking-secret-over-thirty-two-characters',
      FIREBASE_SERVICE_ACCOUNT_JSON: credential, BOOKING_FIREBASE_PROJECT_ID: 'kraken-email-test', BOOKING_FIREBASE_DATABASE_ID: 'email-test-db',
      APP_URL: 'https://krakenpfm.ch', BOOKING_CUSTOMER_ACCESS_ENABLED: 'false',
      ...(emailConfigured ? { RESEND_API_KEY: 'synthetic-not-a-provider-key', BOOKING_EMAIL_FROM: 'test@example.test' } : {}) };
    const handlers = createBookingHandlers({ env, fetcher: async () => { throw new Error('Provider requests are forbidden in this test'); } });
    const app = express(); app.use(handlers.middleware);
    const server = app.listen(0, '127.0.0.1'); await new Promise<void>(resolve => server.on('listening', resolve));
    try {
      const origin = `http://127.0.0.1:${(server.address() as any).port}`;
      const configResponse = await fetch(origin + '/api/booking/config');
      const config = await configResponse.json();
      assert.equal(config.available, true, 'no mail provider must not disable durable booking requests');
      assert.equal(config.emailReady, emailConfigured);
      assert.equal(config.paymentReady, false);
      assert.equal(configResponse.headers.get('cache-control'), 'private, no-store');
      const recovery = await (await fetch(origin + '/api/recovery/config')).json();
      assert.equal(recovery.enabled, false, 'a mail provider alone does not configure saved-quote recovery');
      assert.equal((await (await fetch(origin + '/api/customer/access/config')).json()).enabled, false);
      assert.deepEqual(diagnostics,[['[booking:initialize]',{bookingEnabled:true,tokenSecretReady:true,adminCredentialProvided:true,phase:'ready',error:{name:null,code:null}}]]);
    } finally {
      await new Promise<void>(resolve => server.close(() => resolve()));
      const adminApp = getApps().find(value => value.name === 'kraken-booking');
      if (adminApp) { await getFirestore(adminApp, 'email-test-db').terminate(); await deleteApp(adminApp); }
    }
  }
});

test('checkout readiness requires its separate webhook secret without disabling durable booking requests',async(t)=>{
  t.mock.method(console,'info',()=>{});
  const {privateKey}=generateKeyPairSync('rsa',{modulusLength:2048,privateKeyEncoding:{type:'pkcs8',format:'pem'},publicKeyEncoding:{type:'spki',format:'pem'}});
  const credential=JSON.stringify({type:'service_account',project_id:'kraken-payment-test',client_email:'booking-test@kraken-payment-test.iam.gserviceaccount.com',private_key:privateKey});
  let providerCalls=0;
  for(const webhookSecret of [undefined,'','   ','synthetic-separate-webhook-secret']) {
    const configured=Boolean(webhookSecret?.trim());
    const handlers=createBookingHandlers({env:{BOOKING_ENABLED:'true',BOOKING_TOKEN_SECRET:'synthetic-booking-secret-over-thirty-two-characters',FIREBASE_SERVICE_ACCOUNT_JSON:credential,BOOKING_FIREBASE_PROJECT_ID:'kraken-payment-test',BOOKING_FIREBASE_DATABASE_ID:'payment-test-db',APP_URL:'https://krakenpfm.ch',PAYREXX_INSTANCE:'synthetic-test',PAYREXX_API_SECRET:'synthetic-api-key',PAYREXX_MODE:'live',PAYREXX_WEBHOOK_SECRET:webhookSecret},fetcher:async()=>{providerCalls++;throw new Error('No provider request is allowed');},clock:()=>now});
    const app=express();app.use(handlers.middleware);
    const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.on('listening',resolve));
    try {
      const config=await (await fetch(`http://127.0.0.1:${(server.address() as any).port}/api/booking/config`)).json();
      assert.equal(config.available,true,'Missing webhook setup must not disable durable booking requests');
      assert.equal(config.paymentReady,configured);
      assert.equal(config.mode,'live');assert.equal(config.depositPercent,15);
      const runtime=await handlers.initialize();
      assert.equal(runtime.service!.canCheckout({status:'confirmed',scheduling:{status:'held',holdExpiresAt:new Date(now+60000).toISOString()},quote:{totalCents:1000,manualReviewReasons:[]},payment:{status:'not_started'}}),configured);
      assert.equal(providerCalls,0,'Configuration/readiness checks do not create provider transactions');
    }finally{
      await new Promise<void>(resolve=>server.close(()=>resolve()));
      const adminApp=getApps().find(value=>value.name==='kraken-booking');
      if(adminApp){await getFirestore(adminApp,'payment-test-db').terminate();await deleteApp(adminApp);}
    }
  }
});

test('booking initialization logs only safe gate booleans once when disabled',async(t)=>{
  const diagnostics:any[][]=[];
  for(const method of ['info','warn','error'] as const)t.mock.method(console,method,(...args:any[])=>diagnostics.push(args));
  const scenarios=[
    {env:{},gates:{bookingEnabled:false,tokenSecretReady:false,adminCredentialProvided:false}},
    {env:{BOOKING_ENABLED:'true',BOOKING_TOKEN_SECRET:'short-token-canary',FIREBASE_SERVICE_ACCOUNT_JSON:'credential-canary'},gates:{bookingEnabled:true,tokenSecretReady:false,adminCredentialProvided:true}},
    {env:{BOOKING_ENABLED:'true',BOOKING_TOKEN_SECRET:'token-canary-longer-than-thirty-two-characters'},gates:{bookingEnabled:true,tokenSecretReady:true,adminCredentialProvided:false}},
  ];
  for(const {env,gates} of scenarios){
    diagnostics.length=0;
    const handlers=createBookingHandlers({env});
    const [first,second]=await Promise.all([handlers.initialize(),handlers.initialize()]);
    assert.equal(first,second);assert.equal(first.service,null);
    await handlers.initialize();
    assert.deepEqual(diagnostics,[['[booking:initialize]',{...gates,phase:'gates',error:{name:null,code:null}}]]);
    assert.doesNotMatch(JSON.stringify(diagnostics),/canary|credential-canary|short-token/);
  }
});

test('malformed credentials and SDK failures never log input, messages, stacks or arbitrary error fields',async(t)=>{
  const diagnostics:any[][]=[];
  for(const method of ['info','warn','error'] as const)t.mock.method(console,method,(...args:any[])=>diagnostics.push(args));
  // No initialized app may bypass parsing these deliberately invalid synthetic inputs.
  assert.equal(getApps().some(app=>app.name==='kraken-booking'),false);
  const originalParse=JSON.parse;
  t.mock.method(JSON,'parse',((input:string,reviver?:Parameters<typeof JSON.parse>[1])=>{
    if(input==='INJECTED_ERROR_CANARY'){
      const error:any=new Error('MESSAGE_CANARY');error.name='NAME_CANARY';error.code='CODE_CANARY';error.stack='STACK_CANARY';throw error;
    }
    return originalParse(input,reviver);
  }) as typeof JSON.parse);
  const scenarios=[
    {credential:'{"private_key":"MALFORMED_JSON_CANARY',phase:'credential_json',error:{name:'SyntaxError',code:null}},
    {credential:JSON.stringify({type:'service_account',project_id:'PROJECT_CANARY',client_email:'EMAIL_CANARY@example.test',private_key:'-----BEGIN PRIVATE KEY-----\nPEM_CANARY\n-----END PRIVATE KEY-----'}),phase:'firebase_credential',error:{name:'Error',code:'app/invalid-credential'}},
    {credential:'INJECTED_ERROR_CANARY',phase:'credential_json',error:{name:'UnknownError',code:null}},
  ];
  for(const {credential,phase,error}of scenarios){
    diagnostics.length=0;
    const handlers=createBookingHandlers({env:{BOOKING_ENABLED:'true',BOOKING_TOKEN_SECRET:'TOKEN_CANARY_longer-than-thirty-two-characters',FIREBASE_SERVICE_ACCOUNT_JSON:credential}});
    const [first,second]=await Promise.all([handlers.initialize(),handlers.initialize()]);
    assert.equal(first,second);assert.equal(first.service,null);
    await handlers.initialize();
    assert.deepEqual(diagnostics,[['[booking:initialize]',{bookingEnabled:true,tokenSecretReady:true,adminCredentialProvided:true,phase,error}]]);
    assert.doesNotMatch(JSON.stringify(diagnostics),/CANARY|private_key|client_email|project_id|message|stack|BEGIN PRIVATE KEY/i);
    assert.equal(getApps().some(app=>app.name==='kraken-booking'),false);
  }
});

test('new end-of-tenancy and moving requests recalculate the approved tariff and reject manipulated totals or combo data',async()=>{
  const selections=[{...defaultSelection('endOfTenancy'),rooms:1.5,areaM2:70},{...defaultSelection('moving'),team:2 as const,additionalHelpers:1,estimatedHours:4},{...defaultSelection('moving'),mode:'fixed' as const,rooms:2.5,distanceKm:10,cleaning:{...defaultSelection('endOfTenancy'),rooms:2.5,areaM2:70},sameAddress:true}];
  for(const selection of selections){const quote=calculatePrice(selection),body=request({selection,acceptedTotalCents:quote.totalCents});assert.equal(validateBookingRequest(body,now).quote.totalCents,quote.totalCents);assert.throws(()=>validateBookingRequest({...body,acceptedTotalCents:quote.totalCents!-1},now),{code:'PRICE_CHANGED'});}
  const valid:any=selections[2];assert.throws(()=>validateBookingRequest(request({selection:{...valid,sameAddress:false},acceptedTotalCents:129000}),now),{code:'INVALID_SELECTION'});
  assert.throws(()=>validateBookingRequest(request({selection:{...valid,discountCents:999999},acceptedTotalCents:129000}),now),{code:'INVALID_SELECTION'});
  assert.throws(()=>validateBookingRequest(request({selection:{...valid,cleaning:{...valid.cleaning,rooms:1.5}},acceptedTotalCents:129000}),now),{code:'INVALID_SELECTION'});
});
test('hourly moving stores and charges 15 percent of selected minimum including helpers and travel, never of estimated total',async()=>{
  let providerDue=0;
  const {service,store}=serviceFixture({async create(record:any){providerDue=record.payment.amountDueNowCents;return{id:42,link:'https://test.payrexx.com/valid'};}});
  const selection={...defaultSelection('moving'),team:2 as const,estimatedHours:4,additionalHelpers:1},quote=calculatePrice(selection);
  const booking=await service.create(request({selection,acceptedTotalCents:quote.totalCents}));
  assert.equal(booking.quote.priceType,'estimate');assert.equal(booking.quote.totalCents,84000);assert.equal(booking.quote.depositBasisCents,64500);assert.equal(booking.payment.amountDueNowCents,9675);assert.equal(booking.payment.amountPaidCents,0);assert.equal(booking.canCheckout,false);
  await service.confirmAppointment(booking.bookingId,{operatorId:'synthetic-operator',holdExpiresAt:new Date(now+3600000).toISOString()});
  await service.checkout(booking.bookingId,booking.publicToken,{termsAccepted:true,termsVersion:BOOKING_TERMS_VERSION,acceptedQuoteRevision:1,language:'es'});
  assert.equal(providerDue,9675);assert.equal(store.records.get(booking.bookingId).payment.remainingBalanceCents,84000);
});
test('moving combo deposit uses only the minimum moving work plus approved cleaning minus one discount',async()=>{
  const {service}=serviceFixture();
  const selection={...defaultSelection('moving'),rooms:2.5,estimatedHours:3,cleaning:{...defaultSelection('endOfTenancy'),rooms:2.5,areaM2:70},sameAddress:true},quote=calculatePrice(selection);
  const booking=await service.create(request({selection,acceptedTotalCents:quote.totalCents}));assert.equal(booking.quote.totalCents,84500);assert.equal(booking.quote.depositBasisCents,75000);assert.equal(booking.payment.amountDueNowCents,11250);
});
test('a from-price stays unpaid until a written manual quote replaces provisional metadata and uses its full approved deposit basis',async()=>{
  const {service}=serviceFixture({create(){throw Error('Must not open checkout before final approval');}}),selection={...defaultSelection('moving'),mode:'fixed' as const,rooms:3.5,distanceKm:10};
  const booking=await service.create(request({selection,acceptedTotalCents:null}));assert.equal(booking.quote.fromPriceCents,115000);assert.equal(booking.quote.depositBasisCents,null);assert.equal(booking.payment.amountDueNowCents,0);
  await assert.rejects(service.confirmAppointment(booking.bookingId,{operatorId:'synthetic-operator',holdExpiresAt:new Date(now+3600000).toISOString()}),{code:'MANUAL_REVIEW_REQUIRED'});
  await service.approveManualQuote(booking.bookingId,{operatorId:'synthetic-operator',totalCents:150000,scopeNotes:'Synthetic confirmed final moving scope'});
  const approved=await service.authenticated(booking.bookingId,booking.publicToken);assert.equal(approved.quote.priceType,'fixed');assert.equal(approved.quote.depositBasisCents,150000);assert.equal(Object.hasOwn(approved.quote,'fromPriceCents'),false);assert.equal(approved.payment.amountDueNowCents,22500);assert.equal(approved.quote.vatComparisonCents,null);assert.equal(approved.originalQuote.fromPriceCents,115000);
});
test('new tariff never recalculates an existing booking price or deposit during read, confirmation or checkout',async()=>{
  let providerDue=0;const {service,store}=serviceFixture({async create(record:any){providerDue=record.payment.amountDueNowCents;return{id:42,link:'https://test.payrexx.com/valid'};}});
  const booking=await service.create(request()),historical=store.records.get(booking.bookingId);
  historical.quote={...historical.quote,pricingVersion:'kraken-private-historical',totalCents:40000,subtotalCents:40000};delete historical.quote.depositBasisCents;delete historical.quote.priceType;
  historical.payment.amountDueNowCents=6000;historical.payment.remainingBalanceCents=40000;
  const read=await service.read(booking.bookingId,booking.publicToken);assert.equal(read.quote.totalCents,40000);assert.equal(read.payment.amountDueNowCents,6000);
  await service.confirmAppointment(booking.bookingId,{operatorId:'synthetic-operator',holdExpiresAt:new Date(now+3600000).toISOString()});
  await service.checkout(booking.bookingId,booking.publicToken,{termsAccepted:true,termsVersion:BOOKING_TERMS_VERSION,acceptedQuoteRevision:1,language:'de'});
  assert.equal(providerDue,6000);assert.equal(store.records.get(booking.bookingId).quote.pricingVersion,'kraken-private-historical');assert.equal(store.records.get(booking.bookingId).quote.totalCents,40000);
});
