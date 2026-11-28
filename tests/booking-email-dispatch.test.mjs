import {currentTermsDocuments} from '../src/legal/terms-registry.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createHmac } from 'node:crypto';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBookingService, BOOKING_TERMS_VERSION } from '../server/booking.ts';
import { BookingError, createFirestoreBookingStore } from '../server/booking-store.ts';
import { createResendEmailAdapter } from '../server/booking-email.ts';
import { calculatePrice, defaultSelection, PRICING_VERSION } from '../src/booking/pricing.ts';
import { createVercelPaymentEmailScheduler } from '../server/booking-lifecycle.ts';

const now = Date.parse('2026-11-24T10:00:00Z');
const origin = 'https://kraken.example';
const secret = 'synthetic-booking-secret-over-thirty-two-characters';
const cronSecret = 'synthetic-cron-secret-over-thirty-two-characters';
const clone = value => structuredClone(value);

function memoryStore() {
  const records = new Map(), keys = new Map(), mail = new Map(), suppressed = new Set();
  const calls = { scans: 0, staleScans: 0, claims: 0 };
  return {
    records, mail, suppressed, calls,
    async get(id) { return clone(records.get(id) || null); },
    async create(key, fingerprint, record, job) {
      const previous = keys.get(key);
      if (previous) {
        if (previous.fingerprint !== fingerprint) throw new BookingError('IDEMPOTENCY_CONFLICT', 409);
        return clone(records.get(previous.id));
      }
      records.set(record.bookingId, clone(record));
      keys.set(key, { id: record.bookingId, fingerprint });
      mail.set(job.id, clone(job));
      return clone(record);
    },
    async mutate(id, transform) {
      const next = transform(clone(records.get(id)));
      records.set(id, clone(next));
      return clone(next);
    },
    async mutateWithMail(id, transform, makeJob) {
      const next = transform(clone(records.get(id))), job = makeJob(next);
      records.set(id, clone(next));
      for (const item of (Array.isArray(job)?job:[job]).filter(Boolean)) if (!mail.has(item.id)) mail.set(item.id, clone(item));
      return clone(next);
    },
    async listMailForBooking(id) {return [...mail.values()].filter(job=>job.bookingId===id).map(clone);},
    async mutateMail(id,transform) {const current=mail.get(id);if(!current)return null;const next=transform(clone(current));mail.set(id,clone(next));return clone(next);},
    async prepareMail(id,message) {const job=mail.get(id);if(!job||!['sending','scheduling'].includes(job.status))return null;job.prepared??=clone(message);return clone(job.prepared);},
    async addMail(job) {
      if (mail.has(job.id)) return false;
      mail.set(job.id, clone(job));
      return true;
    },
    async listDueMail(time, limit = 20) {
      calls.scans++;
      return [...mail.values()].filter(job => job.status === 'queued' && job.dueAt <= time)
        .sort((a, b) => a.dueAt - b.dueAt).slice(0, limit).map(clone);
    },
    async claimMail(id, time) {
      calls.claims++;
      const job = mail.get(id);
      if (!job || job.status !== 'queued' || job.dueAt > time) return null;
      job.status = 'sending';
      job.attempts = (Number.isSafeInteger(job.attempts) ? job.attempts : 0) + 1;
      job.leaseUntil = time + 60000;
      return clone(job);
    },
    async finishMail(id, status, providerId, retryAt) { Object.assign(mail.get(id), { status, providerId, leaseUntil: null, ...(status === 'queued' && Number.isSafeInteger(retryAt) ? { dueAt: retryAt } : {}) }); },
    async markStaleMail() { calls.staleScans++; },
    async consumeRate() { return true; },
    async isEmailSuppressed(email) { return suppressed.has(email); },
    async listByEmail(email) { return [...records.values()].filter(record => record.customer.email === email).map(clone); },
  };
}

function request(key = 'synthetic_request_123456', email = 'client@example.test') {
  const selection = {...defaultSelection('regular'),frequency:'once'};
  return {
    selection, customer: { name: 'Synthetic Customer', email, phone: '+41770000000', address: 'Teststrasse 1', postalCode: '8200', city: 'Schaffhausen' },
    requestedDate: '2026-11-25', requestedTime: '10:00', notes: '', language: 'es',
    termsAccepted: true, termsVersion: BOOKING_TERMS_VERSION, pricingVersion: PRICING_VERSION,
    acceptedTotalCents: calculatePrice(selection).totalCents, idempotencyKey: key,
  };
}

function fixture(sendEmail, payment = null, clock = () => now) {
  const store = memoryStore();
  const service = createBookingService({ store, tokenSecret: secret, origin, mode: 'live', payment, sendEmail, sender: 'sender@example.test', clock });
  return { service, store };
}

test('targeted dispatch never scans another queue and concurrent retries send only once', async () => {
  const sent = [], { service, store } = fixture(async message => { sent.push(message); return { id: 'accepted-1' }; });
  const first = await service.create(request());
  const other = await service.create(request('synthetic_unrelated_123456', 'other@example.test'));
  const jobId = `${first.bookingId}:request:1`;
  await Promise.all([service.runDue({ jobId, limit: 1 }), service.runDue({ jobId, limit: 1 })]);
  await service.runDue({ jobId, limit: 1 });
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, 'client@example.test');
  assert.equal(sent[0].idempotencyKey, `kraken-booking:${jobId}`);
  assert.equal((await store.get(first.bookingId)).email.request, 'sent');
  assert.equal(store.mail.get(`${other.bookingId}:request:1`).status, 'queued');
  assert.equal(store.calls.scans, 0);
  assert.equal(store.calls.staleScans, 0);
});

test('an uncertain provider result is retained and is never retried by targeted dispatch', async () => {
  let attempts = 0;
  const { service, store } = fixture(async () => { attempts++; throw new Error('Synthetic uncertain provider response'); });
  const booking = await service.create(request());
  const jobId = `${booking.bookingId}:request:1`;
  assert.deepEqual(await service.runDue({ jobId, limit: 1 }), { sent: 0, unknown: 1 });
  await service.runDue({ jobId, limit: 1 });
  assert.equal(attempts, 1);
  assert.equal(store.mail.get(jobId).status, 'delivery_unknown');
  assert.equal((await store.get(booking.bookingId)).email.request, 'delivery_unknown');
});

test('targeted delivery honours suppression and a missing provider without false sent state', async () => {
  let attempts = 0;
  const suppressed = fixture(async () => { attempts++; return { id: 'must-not-be-used' }; });
  const booking = await suppressed.service.create(request());
  suppressed.store.suppressed.add('client@example.test');
  await suppressed.service.runDue({ jobId: `${booking.bookingId}:request:1`, limit: 1 });
  assert.equal(attempts, 0);
  assert.equal(suppressed.store.mail.get(`${booking.bookingId}:request:1`).status, 'cancelled');
  assert.equal((await suppressed.store.get(booking.bookingId)).email.request, 'failed');

  const disabled = fixture(null);
  const pending = await disabled.service.create(request());
  assert.deepEqual(await disabled.service.runDue({ jobId: `${pending.bookingId}:request:1`, limit: 1 }), { sent: 0, unknown: 0, disabled: true });
  assert.equal((await disabled.store.get(pending.bookingId)).email.request, 'queued');
  assert.equal(disabled.store.calls.scans, 0);
  assert.equal(disabled.store.calls.claims, 0);
});

test('paid reconciliation awaits only its receipt and repeated reconciliation cannot resend it', async () => {
  const sent = [], payment = {
    async create() { return { id: 1, link: 'https://synthetic.payrexx.com/checkout' }; },
    async verify() { return { status: 'paid', transactionId: 'synthetic-transaction' }; },
  };
  const { service, store } = fixture(async message => { sent.push(message); return { id: 'receipt-accepted' }; }, payment);
  const booking = await service.create(request());
  const other = await service.create(request('synthetic_unrelated_123456', 'other@example.test'));
  await service.confirmAppointment(booking.bookingId, { operatorId: 'synthetic-operator', holdExpiresAt: '2026-11-24T14:00:00Z' });
  await service.checkout(booking.bookingId, booking.publicToken, { acceptedQuoteRevision: 1, termsAccepted: true, termsVersion: BOOKING_TERMS_VERSION, acceptedTotalDueCents: booking.payment.totalDueCents, language: 'es' });
  const reconciled = await service.reconcile(booking.bookingId);
  assert.equal(reconciled.email.receipt, 'sent');
  assert.equal(reconciled.payment.status, 'paid');
  assert.equal(sent.length, 1);
  assert.equal(sent[0].idempotencyKey, `kraken-booking:${booking.bookingId}:receipt:${booking.bookingId}-r1`);
  await service.reconcile(booking.bookingId);
  assert.equal(sent.length, 1);
  for (const id of [booking.bookingId, other.bookingId]) assert.equal(store.mail.get(`${id}:request:1`).status, 'queued');
  assert.equal(store.calls.scans, 0);
  assert.equal(store.calls.staleScans, 0);
});

test('an expired worker budget cannot claim or send a job', async () => {
  let attempts = 0;
  const { service, store } = fixture(async () => { attempts++; return { id: 'must-not-be-used' }; });
  await service.create(request());
  assert.deepEqual(await service.runDue({ limit: 6, deadlineAt: performance.now() }), { sent: 0, unknown: 0 });
  assert.equal(attempts, 0);
  assert.equal(store.calls.scans, 0);
  assert.equal(store.calls.claims, 0);
});

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
let mockedHandlers;

async function handlersBundle() {
  if (mockedHandlers) return mockedHandlers;
  const cache = path.join(root, 'node_modules/.cache');
  mkdirSync(cache, { recursive: true });
  const temporary = mkdtempSync(path.join(cache, 'booking-email-dispatch-'));
  const outfile = path.join(temporary, 'handlers.cjs');
  try {
    await build({
      stdin: { contents: "export {createBookingHandlers} from './server/booking.ts'; export {setStore} from 'synthetic-booking-store';", resolveDir: root, loader: 'ts' },
      outfile, bundle: true, platform: 'node', format: 'cjs', packages: 'external', logLevel: 'silent',
      plugins: [{ name: 'synthetic-booking-adapters', setup(builder) {
        builder.onResolve({ filter: /(?:^synthetic-booking-store$|\/booking-store\.ts$)/ }, () => ({ path: 'store', namespace: 'synthetic-adapter' }));
        builder.onResolve({ filter: /^firebase-admin\/(?:app|firestore|auth)$/ }, args => ({ path: args.path, namespace: 'synthetic-adapter' }));
        builder.onLoad({ filter: /.*/, namespace: 'synthetic-adapter' }, args => ({ loader: 'js', contents: args.path === 'store' ? `
          import {createHash} from 'node:crypto'; let store;
          export const setStore=value=>{store=value}; export const createFirestoreBookingStore=()=>store;
          export const digest=value=>createHash('sha256').update(value).digest('hex');
          export class BookingError extends Error {constructor(code,status=400){super(code);this.code=code;this.status=status}}
        ` : args.path === 'firebase-admin/auth'
          ? 'throw new Error("Optional customer access must remain disabled"); export const getAuth=()=>({});'
          : 'export const getApps=()=>[]; export const initializeApp=()=>({}); export const cert=()=>({}); export const applicationDefault=()=>({}); export const getFirestore=()=>({});' }));
      } }],
    });
    mockedHandlers = require(outfile);
    return mockedHandlers;
  } finally { delete require.cache[outfile]; rmSync(temporary, { recursive: true, force: true }); }
}

function environment(overrides = {}) {
  return {
    APP_URL: origin, BOOKING_ENABLED: 'true', BOOKING_TOKEN_SECRET: secret,
    FIREBASE_SERVICE_ACCOUNT_JSON: '{}', BOOKING_CUSTOMER_ACCESS_ENABLED: 'false',
    RESEND_API_KEY: 'synthetic-resend-key', BOOKING_EMAIL_FROM: 'Kraken <sender@example.test>', CRON_SECRET: cronSecret,
    ...overrides,
  };
}

async function invoke(handlers, pathname, { method = 'GET', headers = {}, body = {} } = {}) {
  const normalized = Object.fromEntries(Object.entries(headers).map(([name, value]) => [name.toLowerCase(), value]));
  const response = {
    statusCode: 200, headers: {}, cookies: [], body: undefined,
    set(name, value) { if (typeof name === 'string') this.headers[name.toLowerCase()] = value; else for (const [key, item] of Object.entries(name)) this.headers[key.toLowerCase()] = item; return this; },
    status(value) { this.statusCode = value; return this; },
    cookie(name, value, options) { this.cookies.push({ name, value, options }); return this; },
    json(value) { this.body = value; return this; },
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; return this; },
    send(value) { this.body = value; return this; },
  };
  await handlers.middleware({ path: pathname, originalUrl: pathname, method, body, socket: { remoteAddress: 'synthetic-test-client' }, get: name => normalized[name.toLowerCase()], is: type => normalized['content-type']?.startsWith(type) }, response, () => { throw new Error('Unexpected middleware fall-through'); });
  return response;
}

test('a signed Payrexx webhook acknowledges durable payment before lifecycle-pinned email completes', {timeout:10000}, async t => {
  t.mock.method(console,'info',()=>{});
  const {createBookingHandlers,setStore}=await handlersBundle();
  const store=memoryStore();setStore(store);
  const contextKey=Symbol.for('@vercel/request-context'),previousContext=globalThis[contextKey],pinned=[];
  let releaseProvider,providerEntered,attempts=0;
  const entered=new Promise(resolve=>{providerEntered=resolve;});
  const released=new Promise(resolve=>{releaseProvider=resolve;});
  globalThis[contextKey]={get:()=>({waitUntil(work){
    const current=[...store.records.values()][0];
    assert.equal(current.payment.status,'paid');
    assert.ok(store.mail.has(`${current.bookingId}:receipt:${current.checkout.reference}`),'Outbox is durable before background work is registered');
    pinned.push(work);
  }})};
  let gatewayRequest;
  const webhookSecret='synthetic-separate-webhook-secret';
  const handlers=createBookingHandlers({env:environment({PAYREXX_INSTANCE:'synthetic',PAYREXX_API_SECRET:'synthetic-api-key',PAYREXX_MODE:'live',PAYREXX_WEBHOOK_SECRET:webhookSecret}),clock:()=>now,schedulePaymentEmails:createVercelPaymentEmailScheduler(true),fetcher:async(url,init)=>{
    if(url==='https://api.resend.com/emails'){
      attempts++;providerEntered();await released;
      return Response.json({id:'synthetic-receipt-provider-id'});
    }
    if(init.method==='POST'){
      gatewayRequest=JSON.parse(init.body);
      return Response.json({status:'success',data:[{id:42,link:'https://synthetic.payrexx.com/isolated-checkout'}]});
    }
    return Response.json({status:'success',data:[{id:42,invoices:[{referenceId:gatewayRequest.referenceId,currency:'CHF',transactions:[{id:51,referenceId:gatewayRequest.referenceId,amount:gatewayRequest.amount,status:'confirmed',mode:'LIVE',instance:{name:'synthetic'}}]}]}]});
  }});
  const runtime=await handlers.initialize(),booking=await runtime.service.create(request());
  await runtime.service.confirmAppointment(booking.bookingId,{operatorId:'synthetic-operator',holdExpiresAt:'2026-11-24T14:00:00Z'});
  await runtime.service.checkout(booking.bookingId,booking.publicToken,{acceptedQuoteRevision:1,termsAccepted:true,termsVersion:BOOKING_TERMS_VERSION,acceptedTotalDueCents:booking.payment.totalDueCents,language:'es'});
  const app=express();app.post('/webhook',express.raw({type:'application/json'}),handlers.webhook);
  const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.on('listening',resolve));
  const raw=JSON.stringify({transaction:{referenceId:gatewayRequest.referenceId}});
  const signature=createHmac('sha256',webhookSecret).update(raw).digest('hex');
  const call=()=>fetch(`http://127.0.0.1:${server.address().port}/webhook`,{method:'POST',headers:{'Content-Type':'application/json','X-Webhook-Signature':signature},body:raw,signal:AbortSignal.timeout(4000)});
  try{
    const response=await call();assert.equal(response.status,200);assert.deepEqual(await response.json(),{received:true});
    await entered;
    assert.equal(attempts,1);assert.equal(pinned.length,1);
    const current=await store.get(booking.bookingId),receiptId=`${booking.bookingId}:receipt:${current.checkout.reference}`;
    assert.equal(current.payment.status,'paid');assert.equal(current.email.receipt,'queued');assert.equal(store.mail.get(receiptId).status,'sending');
    assert.equal((await call()).status,200);assert.equal(attempts,1,'Duplicated webhooks do not resend an in-flight receipt');
    releaseProvider();await Promise.all(pinned);
    assert.equal((await store.get(booking.bookingId)).email.receipt,'sent');assert.equal(attempts,1);
    assert.equal(store.calls.scans,0,'Background dispatch cannot drain unrelated customer jobs');
  }finally{
    releaseProvider();await Promise.all(pinned);
    await new Promise(resolve=>server.close(resolve));
    if(previousContext===undefined)delete globalThis[contextKey];else globalThis[contextKey]=previousContext;
  }
});

test('missing Vercel context or failed lifecycle registration falls back to awaited email',async t=>{
  t.mock.method(console,'warn',()=>{});
  const contextKey=Symbol.for('@vercel/request-context'),previousContext=globalThis[contextKey];
  delete globalThis[contextKey];
  try{
    assert.equal(createVercelPaymentEmailScheduler(false),undefined);
    for(const scheduler of [createVercelPaymentEmailScheduler(true),()=>{throw new Error('Synthetic lifecycle registration failure');}]){
      let releaseProvider,providerEntered,completed=false;
      const entered=new Promise(resolve=>{providerEntered=resolve;});
      const released=new Promise(resolve=>{releaseProvider=resolve;});
      const payment={async create(){return{id:1,link:'https://synthetic.payrexx.com/checkout'};},async verify(){return{status:'paid',transactionId:'synthetic-transaction'};}};
      const {service,store}=fixture(async()=>{providerEntered();await released;return{id:'accepted'};},payment);
      const booking=await service.create(request());
      await service.confirmAppointment(booking.bookingId,{operatorId:'synthetic-operator',holdExpiresAt:'2026-11-24T14:00:00Z'});
      await service.checkout(booking.bookingId,booking.publicToken,{acceptedQuoteRevision:1,termsAccepted:true,termsVersion:BOOKING_TERMS_VERSION,acceptedTotalDueCents:booking.payment.totalDueCents,language:'es'});
      const pending=service.reconcile(booking.bookingId,{scheduleEmails:scheduler}).then(value=>{completed=true;return value;});
      await entered;assert.equal(completed,false,'An unpinned email task must remain awaited');
      releaseProvider();assert.equal((await pending).email.receipt,'sent');
      assert.equal((await store.get(booking.bookingId)).payment.status,'paid');
    }
  }finally{if(previousContext!==undefined)globalThis[contextKey]=previousContext;}
});

test('webhook deferral cannot run when payment verification is malformed',async t=>{
  t.mock.method(console,'info',()=>{});
  const {createBookingHandlers,setStore}=await handlersBundle();
  const store=memoryStore();setStore(store);let gatewayRequest,scheduled=0,sent=0;
  const webhookSecret='synthetic-separate-webhook-secret';
  const handlers=createBookingHandlers({env:environment({PAYREXX_INSTANCE:'synthetic',PAYREXX_API_SECRET:'synthetic-api-key',PAYREXX_MODE:'live',PAYREXX_WEBHOOK_SECRET:webhookSecret}),clock:()=>now,schedulePaymentEmails:()=>{scheduled++;return true;},fetcher:async(url,init)=>{
    if(url==='https://api.resend.com/emails'){sent++;return Response.json({id:'must-not-send'});}
    if(init.method==='POST'){gatewayRequest=JSON.parse(init.body);return Response.json({status:'success',data:[{id:42,link:'https://synthetic.payrexx.com/isolated-checkout'}]});}
    return Response.json({status:'success',data:[{id:42,invoices:[{referenceId:gatewayRequest.referenceId,currency:'CHF',transactions:[{amount:gatewayRequest.amount,status:'confirmed',mode:'LIVE'}]}]}]});
  }});
  const runtime=await handlers.initialize(),booking=await runtime.service.create(request());
  await runtime.service.confirmAppointment(booking.bookingId,{operatorId:'synthetic-operator',holdExpiresAt:'2026-11-24T14:00:00Z'});
  await runtime.service.checkout(booking.bookingId,booking.publicToken,{acceptedQuoteRevision:1,termsAccepted:true,termsVersion:BOOKING_TERMS_VERSION,acceptedTotalDueCents:booking.payment.totalDueCents,language:'es'});
  const raw=Buffer.from(JSON.stringify({transaction:{referenceId:gatewayRequest.referenceId}}));
  let responseBody,responseStatus=200;
  const res={set(){return this;},status(value){responseStatus=value;return this;},json(value){responseBody=value;return this;}};
  await handlers.webhook({body:raw,get:name=>name==='X-Webhook-Signature'?createHmac('sha256',webhookSecret).update(raw).digest('hex'):undefined},res,()=>{});
  assert.equal(responseStatus,409);assert.equal(responseBody.code,'PAYMENT_MISMATCH');
  assert.equal(scheduled,0);assert.equal(sent,0);assert.equal([...store.mail.values()].some(job=>job.kind==='receipt'),false);
  assert.equal((await store.get(booking.bookingId)).payment.amountPaidCents,0);
});

test('a lifecycle-pinned provider failure retains paid state and quarantines its uncertain outbox job',async()=>{
  const pinned=[];
  const payment={async create(){return{id:1,link:'https://synthetic.payrexx.com/checkout'};},async verify(){return{status:'paid',transactionId:'synthetic-transaction'};}};
  const {service,store}=fixture(async()=>{throw new Error('Synthetic private provider error');},payment);
  const booking=await service.create(request());
  await service.confirmAppointment(booking.bookingId,{operatorId:'synthetic-operator',holdExpiresAt:'2026-11-24T14:00:00Z'});
  await service.checkout(booking.bookingId,booking.publicToken,{acceptedQuoteRevision:1,termsAccepted:true,termsVersion:BOOKING_TERMS_VERSION,acceptedTotalDueCents:booking.payment.totalDueCents,language:'es'});
  const result=await service.reconcile(booking.bookingId,{scheduleEmails:work=>{pinned.push(work);return true;}});
  assert.equal(result.payment.status,'paid');assert.equal(pinned.length,1);
  await Promise.all(pinned);
  const current=await store.get(booking.bookingId);
  assert.equal(current.payment.status,'paid');assert.equal(current.email.receipt,'delivery_unknown');
  assert.equal(store.mail.get(`${booking.bookingId}:receipt:${current.checkout.reference}`).status,'delivery_unknown');
});

test('temporary private connection checks run only from Vercel config GET and never change its public response',async t=>{
  const logs=[];t.mock.method(console,'info',(...args)=>logs.push(args));
  const {createBookingHandlers,setStore}=await handlersBundle();
  for(const [index,scenario]of [
    {vercel:'1',flag:new Date(now+600000).toISOString(),status:200,expectedCalls:2},
    {vercel:'0',flag:new Date(now+600000).toISOString(),status:200,expectedCalls:0},
    {vercel:'1',flag:new Date(now-1000).toISOString(),status:200,expectedCalls:0},
    {vercel:'1',flag:new Date(now+600000).toISOString(),status:403,expectedCalls:1},
  ].entries()){
    const store=memoryStore();setStore(store);let calls=0;logs.length=0;
    const handlers=createBookingHandlers({env:environment({VERCEL:scenario.vercel,PAYREXX_INSTANCE:`probe-test-${index}`,PAYREXX_API_SECRET:'PRIVATE_API_KEY_CANARY',PAYREXX_MODE:'live',PAYREXX_WEBHOOK_SECRET:'synthetic-webhook-secret',PAYREXX_CONNECTION_CHECK_UNTIL:scenario.flag}),clock:()=>now,fetcher:async(url,init)=>{
      if(String(url).includes('api.resend.com'))return Response.json({name:'not_found'},{status:403});calls++;assert.equal(init.method,'GET');assert.equal(new URL(url).origin,'https://api.payrexx.com');
      if(scenario.status!==200)return Response.json({private:'PRIVATE_PROVIDER_BODY_CANARY'},{status:scenario.status});
      return Response.json({status:'success',data:url.includes('/PaymentProvider/')?[{id:11,activePaymentMethods:['visa']}]:[{id:'visa',options_by_psp:{11:{currencies:['CHF'],payment_types:['one-time'],mode:'live'}}}]});
    }});
    const runtime=await handlers.initialize();assert.equal(calls,0,'Initialization and webhooks do not wait for a deployment diagnostic');
    const response=await invoke(handlers,'/api/booking/config');
    assert.equal(response.statusCode,200);assert.equal(calls,scenario.expectedCalls);
    assert.deepEqual(response.body,{available:true,paymentReady:true,emailReady:true,mode:'live',termsVersion:BOOKING_TERMS_VERSION,termsDocuments:currentTermsDocuments(),paymentModel:'full_prepayment',scheduledRemindersReady:false});
    await invoke(handlers,'/api/booking/config');assert.equal(calls,scenario.expectedCalls,'One private probe per runtime/window');
    assert.equal(runtime.paymentReady,true,'A diagnostic failure must not disable booking requests');
    const checks=logs.filter(([prefix])=>prefix==='[booking:payrexx-connection-check]');
    assert.equal(checks.length,scenario.expectedCalls?1:0);
    if(checks.length){
      assert.deepEqual(Object.keys(checks[0][1]).sort(),['authStatus','methodsChecked','liveCHFOneTimeAvailable','testCHFOneTimeAvailable','unknownModePresent'].sort());
      assert.equal(checks[0][1].authStatus,scenario.status===403?'http_403':'accepted');
      if(scenario.status===200){assert.equal(checks[0][1].methodsChecked,true);assert.equal(checks[0][1].liveCHFOneTimeAvailable,true);assert.equal(checks[0][1].testCHFOneTimeAvailable,false);}
    }
    assert.doesNotMatch(JSON.stringify(logs),/PRIVATE_|probe-test-|options_by_psp|currencies|\b11\b/);
  }
});

test('the request HTTP route awaits its one email, returns sent state and does not drain unrelated jobs', async t => {
  t.mock.method(console, 'info', () => {});
  const { createBookingHandlers, setStore } = await handlersBundle();
  const store = memoryStore(); setStore(store);
  let providerEntered, releaseProvider, completed = false, attempts = 0;
  const entered = new Promise(resolve => { providerEntered = resolve; });
  const released = new Promise(resolve => { releaseProvider = resolve; });
  const handlers = createBookingHandlers({ env: environment(), clock: () => now, fetcher: async (url, init) => {
    assert.equal(url, 'https://api.resend.com/emails');
    assert.equal(JSON.parse(init.body).to[0], 'client@example.test');
    attempts++; providerEntered(); await released;
    return new Response(JSON.stringify({ id: 'synthetic-provider-accepted' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } });
  const runtime = await handlers.initialize();
  assert.equal(runtime.customerAccess, false);
  const unrelated = await runtime.service.create(request('synthetic_unrelated_123456', 'other@example.test'));
  const config = await invoke(handlers, '/api/booking/config');
  const cookie = config.cookies.map(value => `${value.name}=${value.value}`).join('; ');
  const options = { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', Cookie: cookie }, body: request() };
  const pending = invoke(handlers, '/api/booking/requests', options).then(value => { completed = true; return value; });
  try {
    await entered;
    assert.equal(completed, false, 'the route must not finish while the provider result is pending');
    releaseProvider();
    const result = await pending;
    assert.equal(result.statusCode, 201);
    assert.equal(result.body.email.request, 'sent');
    const retry = await invoke(handlers, '/api/booking/requests', options);
    assert.equal(retry.body.bookingId, result.body.bookingId);
    assert.equal(attempts, 1);
    assert.equal(store.mail.get(`${unrelated.bookingId}:request:1`).status, 'queued');
    assert.equal(store.calls.scans, 0);
    assert.equal(store.calls.staleScans, 0);
  } finally { releaseProvider(); await pending; }
});

test('request submission remains saved and queued when email is not configured', async t => {
  t.mock.method(console, 'info', () => {});
  const { createBookingHandlers, setStore } = await handlersBundle();
  const store = memoryStore(); setStore(store);
  let networkAttempts = 0;
  const handlers = createBookingHandlers({ env: environment({ RESEND_API_KEY: undefined }), clock: () => now, fetcher: async () => { networkAttempts++; throw new Error('Network forbidden'); } });
  const config = await invoke(handlers, '/api/booking/config');
  assert.equal(config.body.emailReady, false);
  const result = await invoke(handlers, '/api/booking/requests', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', Cookie: config.cookies.map(value => `${value.name}=${value.value}`).join('; ') }, body: request() });
  assert.equal(result.statusCode, 201);
  assert.equal(result.body.email.request, 'queued');
  assert.equal(store.records.size, 1);
  assert.equal(networkAttempts, 0);
});

test('maintenance rejects unsupported methods, absent secrets, invalid tokens and missing email configuration', async t => {
  t.mock.method(console, 'info', () => {});
  const { createBookingHandlers, setStore } = await handlersBundle();
  const store = memoryStore(); setStore(store);
  const make = overrides => createBookingHandlers({ env: environment(overrides), clock: () => now, fetcher: async () => { throw new Error('Network forbidden'); } });
  for (const method of ['POST', 'PATCH', 'DELETE', 'HEAD']) {
    const result = await invoke(make({}), '/api/booking/maintenance', { method });
    assert.equal(result.statusCode, 405, method);
    assert.equal(result.headers.allow, 'GET');
    assert.equal(result.body.code, 'METHOD_NOT_ALLOWED');
    assert.match(result.headers['cache-control'], /no-store/);
    assert.match(result.headers['x-robots-tag'], /noindex/);
  }
  for (const missing of [undefined, 'short']) {
    const result = await invoke(make({ CRON_SECRET: missing }), '/api/booking/maintenance');
    assert.equal(result.statusCode, 503);
    assert.equal(result.body.code, 'MAINTENANCE_NOT_CONFIGURED');
  }
  for (const authorization of [undefined, `Bearer ${cronSecret}x`, 'Bearer invalid', '']) {
    const result = await invoke(make({}), '/api/booking/maintenance', { headers: { Authorization: authorization } });
    assert.equal(result.statusCode, 401);
    assert.equal(result.body.code, 'UNAUTHORIZED');
  }
  const notReady = await invoke(make({ RESEND_API_KEY: undefined }), '/api/booking/maintenance', { headers: { Authorization: `Bearer ${cronSecret}` } });
  assert.equal(notReady.statusCode, 503);
  assert.equal(notReady.body.code, 'EMAIL_NOT_CONFIGURED');
  assert.equal(store.calls.scans, 0);
});

test('authorized maintenance returns only bounded counters with private non-indexable response headers', async t => {
  t.mock.method(console, 'info', () => {});
  const { createBookingHandlers, setStore } = await handlersBundle();
  const store = memoryStore(); setStore(store);
  let providerCalls = 0;
  const handlers = createBookingHandlers({ env: environment(), clock: () => now, fetcher: async url => {
    assert.equal(url, 'https://api.resend.com/emails');
    return new Response(JSON.stringify({ id: `synthetic-accepted-${++providerCalls}` }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } });
  const runtime = await handlers.initialize();
  for (let index = 0; index < 8; index++) await runtime.service.create(request(`synthetic_daily_queue_${index}`, `client${index}@example.test`));
  const result = await invoke(handlers, '/api/booking/maintenance', { headers: { Authorization: `Bearer ${cronSecret}` } });
  assert.equal(result.statusCode, 200);
  assert.deepEqual(result.body, { booking: { sent: 6, unknown: 0 }, recovery: { sent: 0, cancelled: 0, deferred: 0, failed: 0, unknown: 0 } });
  assert.equal(providerCalls, 6);
  assert.equal([...store.mail.values()].filter(job => job.status === 'queued').length, 2);
  assert.match(result.headers['cache-control'], /no-store/);
  assert.match(result.headers['x-robots-tag'], /noindex/);
  assert.equal(result.headers['referrer-policy'], 'no-referrer');
  assert.doesNotMatch(JSON.stringify(result.body), /@|bookingId|publicToken|synthetic|Bearer|secret|subject|html/);
});

test('email persistence failures cannot turn an already saved request into an HTTP error', async t => {
  t.mock.method(console, 'info', () => {});
  const warnings = [];
  t.mock.method(console, 'warn', (...args) => warnings.push(args));
  const { createBookingHandlers, setStore } = await handlersBundle();
  for (const failure of ['finishMail', 'postDispatchLookup']) {
    await t.test(failure, async () => {
      warnings.length = 0;
      const store = memoryStore(); setStore(store);
      const originalGet = store.get;
      let failNextGet = false, providerCalls = 0;
      store.get = async id => {
        if (failNextGet) { failNextGet = false; throw new Error('PRIVATE_LOOKUP_FAILURE_CANARY'); }
        return originalGet(id);
      };
      if (failure === 'finishMail') store.finishMail = async () => { throw new Error('PRIVATE_FINISH_MAIL_CANARY'); };
      const handlers = createBookingHandlers({ env: environment(), clock: () => now, fetcher: async url => {
        assert.equal(url, 'https://api.resend.com/emails');
        providerCalls++;
        if (failure === 'postDispatchLookup') failNextGet = true;
        return new Response(JSON.stringify({ id: 'synthetic-provider-accepted' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      } });
      const config = await invoke(handlers, '/api/booking/config');
      const options = { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', Cookie: config.cookies.map(value => `${value.name}=${value.value}`).join('; ') }, body: request() };
      const created = await invoke(handlers, '/api/booking/requests', options);
      assert.equal(created.statusCode, 201);
      assert.equal(created.body.email.request, 'queued', 'an unconfirmed persistence result must not be advertised as sent');
      assert.equal(store.records.size, 1);
      assert.equal((await originalGet(created.body.bookingId)).status, 'awaiting_confirmation');
      const retry = await invoke(handlers, '/api/booking/requests', options);
      assert.equal(retry.statusCode, 201);
      assert.equal(retry.body.bookingId, created.body.bookingId);
      assert.equal(providerCalls, 1, 'a provider-accepted job must not be sent twice after a response retry');
      assert.equal(store.calls.scans, 0);
      assert.deepEqual(warnings, [['[booking:email-dispatch]', { phase: 'request' }]]);
      assert.doesNotMatch(JSON.stringify(warnings), /CANARY|@|synthetic-provider|bookingId/);
      assert.equal(JSON.stringify(warnings).includes(created.body.bookingId), false);
    });
  }
});

test('a verified payment stays paid when receipt persistence or its final lookup fails', async t => {
  const warnings = [];
  t.mock.method(console, 'warn', (...args) => warnings.push(args));
  for (const failure of ['finishMail', 'postDispatchLookup']) {
    await t.test(failure, async () => {
      warnings.length = 0;
      let providerCalls = 0, failNextGet = false;
      const payment = {
        async create() { return { id: 1, link: 'https://synthetic.payrexx.com/checkout' }; },
        async verify() { return { status: 'paid', transactionId: 'synthetic-paid-transaction' }; },
      };
      const { service, store } = fixture(async () => {
        providerCalls++;
        if (failure === 'postDispatchLookup') failNextGet = true;
        return { id: 'synthetic-receipt-accepted' };
      }, payment);
      const originalGet = store.get;
      store.get = async id => {
        if (failNextGet) { failNextGet = false; throw new Error('PRIVATE_RECEIPT_LOOKUP_CANARY'); }
        return originalGet(id);
      };
      if (failure === 'finishMail') store.finishMail = async () => { throw new Error('PRIVATE_RECEIPT_FINISH_CANARY'); };
      const booking = await service.create(request());
      await service.confirmAppointment(booking.bookingId, { operatorId: 'synthetic-operator', holdExpiresAt: '2026-11-24T14:00:00Z' });
      await service.checkout(booking.bookingId, booking.publicToken, { acceptedQuoteRevision: 1, termsAccepted: true, termsVersion: BOOKING_TERMS_VERSION, acceptedTotalDueCents: booking.payment.totalDueCents, language: 'es' });
      const result = await service.reconcile(booking.bookingId);
      assert.equal(result.payment.status, 'paid');
      assert.equal(result.payment.amountPaidCents, result.payment.amountDueNowCents);
      assert.equal(result.scheduling.status, 'confirmed');
      assert.equal(result.email.receipt, 'queued');
      assert.equal((await originalGet(booking.bookingId)).payment.status, 'paid');
      assert.equal((await service.reconcile(booking.bookingId)).payment.status, 'paid');
      assert.equal(providerCalls, 1);
      assert.equal(store.calls.scans, 0);
      assert.deepEqual(warnings, [['[booking:email-dispatch]', { phase: 'receipt' }]]);
      assert.doesNotMatch(JSON.stringify(warnings), /CANARY|@|synthetic-paid|synthetic-receipt/);
      assert.equal(JSON.stringify(warnings).includes(booking.bookingId), false);
    });
  }
});

test('maintenance still reports a worker failure instead of a false successful delivery report', async t => {
  t.mock.method(console, 'info', () => {});
  const { createBookingHandlers, setStore } = await handlersBundle();
  const store = memoryStore(); setStore(store);
  store.listDueMail = async () => { throw new Error('PRIVATE_WORKER_FAILURE_CANARY'); };
  let providerCalls = 0;
  const handlers = createBookingHandlers({ env: environment(), clock: () => now, fetcher: async () => { providerCalls++; throw new Error('Network forbidden'); } });
  const result = await invoke(handlers, '/api/booking/maintenance', { headers: { Authorization: `Bearer ${cronSecret}` } });
  assert.equal(result.statusCode, 503);
  assert.equal(result.body.code, 'BOOKING_UNAVAILABLE');
  assert.doesNotMatch(JSON.stringify(result.body), /CANARY|stack|message|@/);
  assert.equal(providerCalls, 0);
});

test('only documented Resend 429 errors expose safe retry metadata', async () => {
  const message = { from: 'sender@example.test', to: 'client@example.test', subject: 'Synthetic', text: 'Synthetic', idempotencyKey: 'synthetic-fixed-key' };
  for (const name of ['rate_limit_exceeded', 'daily_quota_exceeded', 'monthly_quota_exceeded']) {
    const adapter = createResendEmailAdapter('synthetic-key', async () => Response.json({ name, message: 'PRIVATE_PROVIDER_BODY_CANARY' }, { status: 429, headers: { 'Retry-After': '1200' } }));
    await assert.rejects(adapter(message), error => {
      assert.equal(error.definitelyNotSent, true);
      assert.equal(error.retryable, true);
      assert.equal(error.retryAfterMs, 1200000);
      assert.doesNotMatch(JSON.stringify(error), /PRIVATE_PROVIDER_BODY_CANARY|retry-after/i);
      return true;
    });
  }
  for (const header of [undefined, '-10', 'not-a-delay', '999999999999999999999999999']) {
    const adapter = createResendEmailAdapter('synthetic-key', async () => Response.json({ name: 'rate_limit_exceeded' }, { status: 429, headers: header ? { 'Retry-After': header } : {} }));
    await assert.rejects(adapter(message), error => error.retryable === true && error.retryAfterMs === 0);
  }
});

test('known 429 retries respect persisted dueAt, stable idempotency and three total worker attempts', async () => {
  let currentTime = now, providerCalls = 0;
  const keys = [];
  const adapter = createResendEmailAdapter('synthetic-key', async (_url, init) => {
    providerCalls++; keys.push(init.headers['Idempotency-Key']);
    return Response.json({ name: 'rate_limit_exceeded' }, { status: 429, headers: { 'Retry-After': '1200' } });
  });
  const initial = fixture(adapter, null, () => currentTime), { store } = initial;
  let service = initial.service;
  const booking = await service.create(request()), jobId = `${booking.bookingId}:request:1`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    assert.deepEqual(await service.runDue({ jobId, limit: 1 }), { sent: 0, unknown: 0 });
    assert.equal(providerCalls, attempt);
    assert.equal(store.mail.get(jobId).attempts, attempt);
    if (attempt < 3) {
      assert.equal(store.mail.get(jobId).status, 'queued');
      assert.equal((await store.get(booking.bookingId)).email.request, 'queued');
      const retryAt = currentTime + 1200000;
      assert.equal(store.mail.get(jobId).dueAt, retryAt);
      currentTime = retryAt - 1;
      await service.runDue({ jobId, limit: 1 });
      assert.equal(providerCalls, attempt, 'HTTP retries cannot bypass dueAt');
      currentTime = retryAt;
      service = createBookingService({ store, tokenSecret: secret, origin, mode: 'live', sendEmail: adapter, sender: 'sender@example.test', clock: () => currentTime });
    }
  }
  assert.equal(store.mail.get(jobId).status, 'failed');
  assert.equal((await store.get(booking.bookingId)).email.request, 'failed');
  currentTime += 86400000;
  await service.runDue({ jobId, limit: 1 });
  await service.runDue();
  assert.equal(providerCalls, 3);
  assert.deepEqual([...new Set(keys)], [`kraken-booking:${jobId}`]);
});

test('a known rejection waits at least fifteen minutes and a later accepted email is sent once', async () => {
  let currentTime = now, providerCalls = 0;
  const keys = [];
  const adapter = createResendEmailAdapter('synthetic-key', async (_url, init) => {
    keys.push(init.headers['Idempotency-Key']);
    if (++providerCalls === 1) return Response.json({ name: 'daily_quota_exceeded' }, { status: 429, headers: { 'Retry-After': '1' } });
    return Response.json({ id: 'accepted-after-known-rejection' });
  });
  const { service, store } = fixture(adapter, null, () => currentTime);
  const booking = await service.create(request()), jobId = `${booking.bookingId}:request:1`;
  await service.runDue({ jobId, limit: 1 });
  assert.equal(store.mail.get(jobId).dueAt, now + 15 * 60000);
  currentTime += 15 * 60000;
  assert.deepEqual(await service.runDue({ jobId, limit: 1 }), { sent: 1, unknown: 0 });
  assert.equal((await store.get(booking.bookingId)).email.request, 'sent');
  assert.equal(store.mail.get(jobId).attempts, 2);
  await service.runDue({ jobId, limit: 1 });
  assert.equal(providerCalls, 2);
  assert.equal(new Set(keys).size, 1);
});

test('unrecognised 429, 409, 5xx, timeouts and uncertain successful bodies are never retried', async () => {
  for (const response of [
    () => Response.json({ name: 'unrecognised_limit' }, { status: 429 }),
    () => Response.json({ name: 'rate_limit_exceeded' }, { status: 409 }),
    () => Response.json({ name: 'rate_limit_exceeded' }, { status: 503 }),
    () => { throw new DOMException('Synthetic timeout', 'TimeoutError'); },
    () => Response.json({ unexpected: true }),
  ]) {
    let providerCalls = 0;
    const adapter = createResendEmailAdapter('synthetic-key', async () => { providerCalls++; return response(); });
    const { service, store } = fixture(adapter);
    const booking = await service.create(request()), jobId = `${booking.bookingId}:request:1`;
    assert.deepEqual(await service.runDue({ jobId, limit: 1 }), { sent: 0, unknown: 1 });
    await service.runDue({ jobId, limit: 1 }); await service.runDue();
    assert.equal(providerCalls, 1);
    assert.equal(store.mail.get(jobId).status, 'delivery_unknown');
    assert.equal(store.mail.get(jobId).attempts, 1);
  }
});

test('Firestore transaction records persist attempt counts and deferred dueAt', async () => {
  const documents = new Map();
  const db = {
    collection: name => ({ doc: id => ({ key: `${name}/${id}` }) }),
    async runTransaction(action) {
      return action({
        async get(ref) { return { exists: documents.has(ref.key), data: () => clone(documents.get(ref.key)) }; },
        create(ref, value) { assert.equal(documents.has(ref.key), false); documents.set(ref.key, clone(value)); },
        set(ref, value) { documents.set(ref.key, clone(value)); },
        update(ref, value) { documents.set(ref.key, { ...documents.get(ref.key), ...clone(value) }); },
      });
    },
  };
  const store = createFirestoreBookingStore(db);
  await store.addMail({ id: 'synthetic-persisted-job', kind: 'request', status: 'queued', dueAt: now });
  const first = await store.claimMail('synthetic-persisted-job', now);
  assert.equal(first.attempts, 1);
  await store.finishMail(first.id, 'queued', null, now + 1200000);
  assert.equal(await store.claimMail(first.id, now + 1199999), null);
  const second = await store.claimMail(first.id, now + 1200000);
  assert.equal(second.attempts, 2);
  assert.equal(second.dueAt, now + 1200000);
});

test('real booking middleware persists a browser cookie only on create or explicit authenticated establishment, never ordinary reads',async t=>{
  t.mock.method(console,'info',()=>{});
  const {createBookingHandlers,setStore}=await handlersBundle(),store=memoryStore();setStore(store);
  const handlers=createBookingHandlers({env:environment({RESEND_API_KEY:undefined}),clock:()=>now,fetcher:async()=>{throw Error('No upstream calls');}});
  const config=await invoke(handlers,'/api/booking/config');
  const capture=config.cookies.map(value=>`${value.name}=${value.value}`).join('; ');
  const options={method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:capture},body:request()};
  const created=await invoke(handlers,'/api/booking/requests',options);
  assert.equal(created.statusCode,201);assert.match(created.headers['set-cookie'],/^__Secure-kraken_booking_access=.*HttpOnly; Secure; SameSite=Strict$/);
  const browserCookie=created.headers['set-cookie'].split(';')[0],id=created.body.bookingId,bearer=`Bearer ${created.body.publicToken}`;
  const read=await invoke(handlers,`/api/booking/requests/${id}`,{headers:{Authorization:bearer}});assert.equal(read.statusCode,200);assert.equal(read.headers['set-cookie'],undefined);
  const bad=await invoke(handlers,`/api/booking/requests/${id}`,{headers:{Authorization:'Bearer synthetic-wrong-capability-123456','X-Kraken-Browser-Access':'establish'}});assert.equal(bad.statusCode,404);assert.equal(bad.headers['set-cookie'],undefined);
  const established=await invoke(handlers,`/api/booking/requests/${id}`,{headers:{Authorization:bearer,'X-Kraken-Browser-Access':'establish'}});assert.equal(established.statusCode,200);assert.match(established.headers['set-cookie'],/Max-Age=604800/);
  const restore=await invoke(handlers,'/api/booking/browser-access',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:`${capture}; ${browserCookie}`},body:{bookingId:id}});
  assert.equal(restore.statusCode,200);assert.deepEqual(restore.body,{id,token:created.body.publicToken});assert.equal(restore.headers['set-cookie'],undefined);
  store.records.get(id).tokenRevoked=true;
  const revoked=await invoke(handlers,'/api/booking/browser-access',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:`${capture}; ${browserCookie}`},body:{bookingId:id}});assert.equal(revoked.statusCode,404);assert.equal(revoked.body.token,undefined);
});

test('anonymous recovery route pins before lookup, returns generic acknowledgement before provider and redeems only actual short-lived mail proof',async t=>{
  t.mock.method(console,'info',()=>{});
  const {createBookingHandlers,setStore}=await handlersBundle(),store=memoryStore();setStore(store);
  let lookedUp=0,releaseProvider,providerEntered;const entered=new Promise(resolve=>{providerEntered=resolve;}),release=new Promise(resolve=>{releaseProvider=resolve;});const pinned=[];
  store.findByReferenceEmail=async(reference,email)=>{lookedUp++;assert.ok(pinned.length>0,'The host owns the task before a recipient lookup');return [...store.records.values()].find(row=>row.reference===reference&&row.customer.email===email)||null;};
  const handlers=createBookingHandlers({env:environment(),clock:()=>now,schedulePaymentEmails:work=>{pinned.push(work);return true;},fetcher:async url=>{assert.equal(url,'https://api.resend.com/emails');providerEntered();await release;return Response.json({id:'synthetic-access-accepted'});}});
  const runtime=await handlers.initialize(),booking=await runtime.service.create(request());
  const config=await invoke(handlers,'/api/booking/config'),headers={Origin:origin,'Content-Type':'application/json',Cookie:config.cookies.map(value=>`${value.name}=${value.value}`).join('; ')};
  const body={reference:booking.reference,email:'client@example.test',language:'es',idempotencyKey:'synthetic_access_key_123456'};
  try{
    const missing=await invoke(handlers,'/api/booking/access-requests',{method:'POST',headers,body:{...body,reference:'K-2026-XXXXXXXX'}});
    const matched=await invoke(handlers,'/api/booking/access-requests',{method:'POST',headers,body});
    assert.equal(missing.statusCode,202);assert.equal(matched.statusCode,202);assert.deepEqual(missing.body,matched.body);assert.deepEqual(matched.body,{status:'accepted'});
    await entered;assert.equal(lookedUp,2);
    const job=[...store.mail.values()].find(row=>row.kind==='customer_access');assert.equal(job.status,'sending');assert.equal(job.expiresAt,now+15*60000);
    const proof=new URLSearchParams(new URL(job.authorisedLinks.primary).hash.slice(1)).get('recover');
    const redeemed=await invoke(handlers,'/api/booking/link-access',{method:'POST',headers,body:{bookingId:booking.bookingId,proof}});assert.equal(redeemed.statusCode,200);assert.deepEqual(redeemed.body,{id:booking.bookingId,token:booking.publicToken});assert.match(redeemed.headers['set-cookie'],/HttpOnly; Secure; SameSite=Strict/);
    const forged=await invoke(handlers,'/api/booking/link-access',{method:'POST',headers,body:{bookingId:booking.bookingId,proof:proof+'x'}});assert.equal(forged.statusCode,404);assert.equal(forged.body.token,undefined);
  }finally{releaseProvider();await Promise.all(pinned);}
});

test('anonymous mail recovery without a real lifecycle scheduler fails uniformly before lookup or queueing',async t=>{
  t.mock.method(console,'info',()=>{});
  const {createBookingHandlers,setStore}=await handlersBundle(),store=memoryStore();setStore(store);let lookups=0;
  store.findByReferenceEmail=async()=>{lookups++;throw Error('Must not look up');};
  const handlers=createBookingHandlers({env:environment(),clock:()=>now,fetcher:async()=>{throw Error('No provider allowed');}});
  const config=await invoke(handlers,'/api/booking/config'),headers={Origin:origin,'Content-Type':'application/json',Cookie:config.cookies.map(value=>`${value.name}=${value.value}`).join('; ')};
  for(const reference of ['K-2026-XXXXXXXX','K-2026-YYYYYYYY']){
    const result=await invoke(handlers,'/api/booking/access-requests',{method:'POST',headers,body:{reference,email:'client@example.test',language:'en',idempotencyKey:'synthetic_access_key_123456'}});assert.equal(result.statusCode,503);assert.equal(result.body.code,'ACCESS_EMAIL_DISPATCH_UNAVAILABLE');
  }
  assert.equal(lookups,0);assert.equal(store.mail.size,0);
});

test('real local HTTP: a new email-proof browser keeps its original cookie through closed tabs, expired mail proof and seven-day expiry without renewal',async t=>{
  t.mock.method(console,'info',()=>{});
  const {createBookingHandlers,setStore}=await handlersBundle(),store=memoryStore();setStore(store);
  let instant=now,providerAvailable=true;const tracked=[],envelopes=[];
  store.findByReferenceEmail=async(reference,email)=>[...store.records.values()].find(row=>row.reference===reference&&row.customer.email===email)||null;
  const handlers=createBookingHandlers({env:environment(),clock:()=>instant,schedulePaymentEmails:work=>{tracked.push(work);return true;},fetcher:async(url,options)=>{
    assert.equal(url,'https://api.resend.com/emails');assert.equal(providerAvailable,true,'Reopening after proof expiry must not need the mail provider');envelopes.push(JSON.parse(options.body));return Response.json({id:`synthetic-http-email-${envelopes.length}`});
  }});
  const runtime=await handlers.initialize(),booking=await runtime.service.create(request());
  const app=express();app.use(express.json());app.use(handlers.middleware);
  const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.on('listening',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const local=`http://127.0.0.1:${server.address().port}`;
  const config=async()=>{const response=await fetch(local+'/api/booking/config');assert.equal(response.status,200);return response.headers.get('set-cookie').split(';')[0];};
  const post=(path,body,cookie)=>fetch(local+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify(body)});
  let capture=await config();
  const queued=await post('/api/booking/access-requests',{reference:booking.reference,email:booking.customer.email,language:'es',idempotencyKey:'synthetic_http_access_123456'},capture);
  assert.equal(queued.status,202);await Promise.all(tracked);
  const mail=envelopes.find(row=>row.text.includes('#recover='));assert.ok(mail);
  const accessUrl=new URL(mail.text.match(/https:\/\/[^\s<>]+#recover=[A-Za-z0-9_.-]+/)[0]),proof=new URLSearchParams(accessUrl.hash.slice(1)).get('recover');
  instant+=60000;
  const linked=await post('/api/booking/link-access',{bookingId:booking.bookingId,proof},capture);
  assert.equal(linked.status,200);const pair=await linked.json();assert.deepEqual(pair,{id:booking.bookingId,token:booking.publicToken});
  const setCookie=linked.headers.get('set-cookie');assert.match(setCookie,/HttpOnly; Secure; SameSite=Strict/);assert.match(setCookie,/Max-Age=604800/);
  const cookie=setCookie.split(';')[0],cookieCreatedAt=instant;
  assert.equal(new Date(/Expires=([^;]+)/.exec(setCookie)[1]).getTime(),cookieCreatedAt+7*86400000);
  const replay=await post('/api/booking/link-access',{bookingId:booking.bookingId,proof},`${capture}; ${cookie}`);assert.equal(replay.status,200);assert.equal(replay.headers.get('set-cookie'),null,'A valid existing cookie is preserved even after a valid mail proof');
  const establish=await fetch(local+`/api/booking/requests/${booking.bookingId}`,{headers:{Authorization:`Bearer ${booking.publicToken}`,'X-Kraken-Browser-Access':'establish',Cookie:`${capture}; ${cookie}`}});assert.equal(establish.status,200);assert.equal(establish.headers.get('set-cookie'),null,'Explicit bearer establishment also preserves an already valid cookie');
  // The tab capability is gone. The mailbox link has expired and email is unavailable.
  const tab=new Map([['token',pair.token]]);tab.clear();instant=now+16*60000;providerAvailable=false;
  assert.equal((await post('/api/booking/link-access',{bookingId:booking.bookingId,proof},capture)).status,404);
  const reopened=await post('/api/booking/browser-access',{bookingId:booking.bookingId},`${capture}; ${cookie}`);
  assert.equal(reopened.status,200);assert.deepEqual(await reopened.json(),{id:booking.bookingId,token:booking.publicToken});assert.equal(reopened.headers.get('set-cookie'),null);
  // Refresh only the ordinary CSRF capture, never the booking cookie, after seven days.
  instant=cookieCreatedAt+7*86400000-1;capture=await config();
  const beforeExpiry=await post('/api/booking/browser-access',{bookingId:booking.bookingId},`${capture}; ${cookie}`);assert.equal(beforeExpiry.status,200);assert.equal(beforeExpiry.headers.get('set-cookie'),null);
  instant=cookieCreatedAt+7*86400000;
  const expired=await post('/api/booking/browser-access',{bookingId:booking.bookingId},`${capture}; ${cookie}`);assert.equal(expired.status,404);assert.equal(expired.headers.get('set-cookie'),null);assert.equal((await expired.json()).token,undefined);
  assert.equal(envelopes.length,1,'Only the one explicitly requested mocked access email was sent');
});

test('dedicated scheduler key handles only capability, scheduled send and cancellation while ordinary mail keeps its sending key',async t=>{
 t.mock.method(console,'info',()=>{});
 const {createBookingHandlers,setStore}=await handlersBundle(),store=memoryStore();setStore(store);
 const normalKey='synthetic-limited-sender',schedulerKey='synthetic-dedicated-scheduler',providerId='10000000-0000-4000-8000-000000000007',calls=[];
 let entered,release;const started=new Promise(resolve=>{entered=resolve;}),pending=new Promise(resolve=>{release=resolve;});
 const handlers=createBookingHandlers({env:environment({RESEND_API_KEY:normalKey,RESEND_SCHEDULING_API_KEY:schedulerKey,PAYREXX_INSTANCE:'synthetic',PAYREXX_API_SECRET:'synthetic-payrexx-key',PAYREXX_MODE:'live',PAYREXX_WEBHOOK_SECRET:'synthetic-webhook-secret'}),clock:()=>now,fetcher:async(url,init)=>{
  const payload=init.body?JSON.parse(String(init.body)):null;calls.push({url,method:init.method,payload,key:init.headers.Authorization});
  if(url==='https://api.resend.com/api-keys'){assert.equal(init.headers.Authorization,`Bearer ${schedulerKey}`);return Response.json({object:'list',data:[{id:'PRIVATE_KEY_METADATA_CANARY',name:'PRIVATE_KEY_METADATA_CANARY'}]});}
  if(url===`https://api.resend.com/emails/${providerId}/cancel`){assert.equal(init.headers.Authorization,`Bearer ${schedulerKey}`);return Response.json({object:'email',id:providerId});}
  assert.equal(url,'https://api.resend.com/emails');
  if(payload.scheduled_at){assert.equal(init.headers.Authorization,`Bearer ${schedulerKey}`);entered();await pending;return Response.json({id:providerId});}
  assert.equal(init.headers.Authorization,`Bearer ${normalKey}`);return Response.json({id:'10000000-0000-4000-8000-000000000008'});
 }});
 const runtime=await handlers.initialize(),booking=await runtime.service.create({...request(),requestedDate:'2026-12-10'});
 await runtime.service.runDue({jobId:`${booking.bookingId}:request:1`,limit:1});assert.equal((await store.get(booking.bookingId)).email.request,'sent');
 const confirming=runtime.service.confirmAppointment(booking.bookingId,{operatorId:'synthetic-staff',expectedRevision:1});await started;
 await runtime.service.schedulePaymentReminders(booking.bookingId);
 const confirmed=await store.get(booking.bookingId);await runtime.service.cancel(booking.bookingId,{operatorId:'synthetic-staff',expectedRevision:confirmed.revision});
 release();await confirming;
 const reminder=[...store.mail.values()].find(job=>job.kind==='payment_reminder');assert.equal(reminder.status,'cancelled');assert.equal(reminder.providerId,providerId);assert.equal((await store.get(booking.bookingId)).payment.reminder.status,'cancelled');
 const config=await invoke(handlers,'/api/booking/config');assert.equal(config.body.scheduledRemindersReady,true);assert.doesNotMatch(JSON.stringify(config.body),/synthetic-limited|synthetic-dedicated|PRIVATE_KEY_METADATA/);
 assert.equal(calls.filter(call=>call.url.endsWith('/api-keys')).length,1);assert.equal(calls.filter(call=>call.payload?.scheduled_at).length,1);assert.equal(calls.filter(call=>call.url.endsWith('/cancel')).length,1);assert.equal(calls.filter(call=>call.url.endsWith('/emails')&&!call.payload?.scheduled_at).length,1);
 assert.ok(calls.every(call=>call.payload?.scheduled_at||!call.url.endsWith('/emails')||call.key===`Bearer ${normalKey}`));
});

test('missing or restricted dedicated scheduling key never borrows the normal key and leaves normal delivery available',async t=>{
 t.mock.method(console,'info',()=>{});const {createBookingHandlers,setStore}=await handlersBundle();
 for(const schedulerKey of [undefined,'synthetic-restricted-scheduler']){
  const store=memoryStore();setStore(store);const calls=[];
  const handlers=createBookingHandlers({env:environment({RESEND_SCHEDULING_API_KEY:schedulerKey,PAYREXX_INSTANCE:'synthetic',PAYREXX_API_SECRET:'synthetic-payrexx-key',PAYREXX_MODE:'live',PAYREXX_WEBHOOK_SECRET:'synthetic-webhook-secret'}),clock:()=>now,fetcher:async(url,init)=>{
   const payload=init.body?JSON.parse(String(init.body)):null;calls.push({url,key:init.headers.Authorization,payload});
   if(url==='https://api.resend.com/api-keys'){assert.equal(init.headers.Authorization,`Bearer ${schedulerKey}`);return Response.json({name:'restricted_api_key'},{status:401});}
   assert.equal(url,'https://api.resend.com/emails');assert.equal(init.headers.Authorization,'Bearer synthetic-resend-key');assert.equal(payload.scheduled_at,undefined);return Response.json({id:'10000000-0000-4000-8000-000000000009'});
  }});
  const runtime=await handlers.initialize(),booking=await runtime.service.create({...request(),requestedDate:'2026-12-10'});
  await runtime.service.runDue({jobId:`${booking.bookingId}:request:1`,limit:1});await runtime.service.confirmAppointment(booking.bookingId,{operatorId:'synthetic-staff',expectedRevision:1});
  const reminder=[...store.mail.values()].find(job=>job.kind==='payment_reminder');assert.equal(reminder.status,'queued');assert.equal((await store.get(booking.bookingId)).payment.reminder.status,'unavailable');await runtime.service.runDue({jobId:reminder.id,limit:1});
  const config=await invoke(handlers,'/api/booking/config');assert.equal(config.body.emailReady,true);assert.equal(config.body.scheduledRemindersReady,false);assert.equal(calls.filter(call=>call.url.endsWith('/api-keys')).length,schedulerKey?1:0);assert.equal(calls.filter(call=>call.url.endsWith('/emails')).length,1);assert.equal(calls.filter(call=>call.payload?.scheduled_at||call.url.endsWith('/cancel')).length,0);
 }
});

test('a scheduling key alone cannot enable or replace ordinary email delivery',async t=>{
 t.mock.method(console,'info',()=>{});const {createBookingHandlers,setStore}=await handlersBundle();setStore(memoryStore());let calls=0;
 const handlers=createBookingHandlers({env:environment({RESEND_API_KEY:undefined,RESEND_SCHEDULING_API_KEY:'synthetic-dedicated-scheduler'}),clock:()=>now,fetcher:async()=>{calls++;throw Error('No provider calls without the ordinary sending configuration');}});
 const config=await invoke(handlers,'/api/booking/config');assert.equal(config.body.emailReady,false);assert.equal(config.body.scheduledRemindersReady,false);assert.equal(calls,0);
});
