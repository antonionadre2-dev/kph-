import test from 'node:test';
import assert from 'node:assert/strict';
import {createBookingOperatorHandler} from '../server/booking-operator.ts';
import {createFirestoreBookingStore,BookingError,digest} from '../server/booking-store.ts';
import {createBookingService,BOOKING_TERMS_VERSION} from '../server/booking.ts';
import {calculatePrice,defaultSelection,PRICING_VERSION} from '../src/booking/pricing.ts';
import {safeMailFailure,mailRetryBlock,operatorMailView} from '../server/booking-mail-safety.ts';
import {createResendEmailAdapter} from '../server/booking-email.ts';
import {createOperatorClient} from '../src/booking/operator-client.ts';
import {pinnedAccessRequest} from '../server/booking-access-dispatch.ts';
import {isStaffIdentity} from '../src/auth/access.ts';

const now=Date.parse('2026-11-26T10:00:00Z'),origin='https://krakenpfm.ch',secret='synthetic-booking-secret-over-32-characters';
const clone=(v:any)=>structuredClone(v);
function transactionalStore(){
 const values=new Map<string,any>();let tail=Promise.resolve(),reads=0;
 const snapshot=(key:string)=>({exists:values.has(key),data:()=>clone(values.get(key)),ref:{key}});
 const query=(name:string,filters:any[]=[],ordering?:string,direction='asc',limit=1000):any=>({
  doc:(id:string)=>({key:`${name}/${id}`,get:async()=>{reads++;return snapshot(`${name}/${id}`);}}),
  where:(field:string,op:string,value:any)=>query(name,[...filters,[field,op,value]],ordering,direction,limit),
  orderBy:(field:string,dir='asc')=>query(name,filters,field,dir,limit),limit:(size:number)=>query(name,filters,ordering,direction,size),
  async get(){reads++;let rows=[...values.keys()].filter(k=>k.startsWith(name+'/')).map(k=>snapshot(k));
   const field=(v:any,key:string)=>key.split('.').reduce((a,k)=>a?.[k],v);
   rows=rows.filter(row=>filters.every(([key,op,value])=>op==='=='?field(row.data(),key)===value:field(row.data(),key)<=value));
   if(ordering)rows.sort((a,b)=>(field(a.data(),ordering)-field(b.data(),ordering))*(direction==='desc'?-1:1));
   rows=rows.slice(0,limit);return{docs:rows,empty:!rows.length};}
 });
 const db:any={collection:(name:string)=>query(name),runTransaction:(fn:any)=>{
  const result=tail.then(async()=>{const writes:Array<()=>void>=[];const result=await fn({get:async(ref:any)=>{reads++;return ref.key?snapshot(ref.key):ref.get();},create:(ref:any,data:any)=>writes.push(()=>{assert.equal(values.has(ref.key),false);values.set(ref.key,clone(data));}),set:(ref:any,data:any)=>writes.push(()=>values.set(ref.key,clone(data))),update:(ref:any,data:any)=>writes.push(()=>{assert.ok(values.has(ref.key));values.set(ref.key,{...values.get(ref.key),...clone(data)});})});writes.forEach(fn=>fn());return result;});tail=result.catch(()=>{});return result;
 }};
 return{values,store:createFirestoreBookingStore(db),get reads(){return reads;}};
}
function input(){const selection=defaultSelection('regular');return{selection,customer:{name:'Synthetic Customer',email:'client@example.test',phone:'+41770000000',address:'Teststrasse 1',postalCode:'8200',city:'Schaffhausen'},requestedDate:'2026-11-28',requestedTime:'10:00',notes:'Synthetic customer scope',language:'es',termsAccepted:true,termsVersion:BOOKING_TERMS_VERSION,pricingVersion:PRICING_VERSION,acceptedTotalCents:calculatePrice(selection).totalCents,idempotencyKey:'synthetic_idempotency_123456'};}
async function fixture(){const db=transactionalStore(),sent:any[]=[];let gatewayCalls=0;
 const service=createBookingService({store:db.store,tokenSecret:secret,origin,mode:'test',payment:{async create(){gatewayCalls++;throw Error('Gateway must not be called by the operator');}},sendEmail:async(message:any)=>{sent.push(clone(message));return{id:'synthetic-mail-accepted'};},sender:'sender@example.test',clock:()=>now});
 const booking=await service.create(input());
 const claims:any={uid:'verified-operator',email:'kai@krakenpfm.ch',email_verified:true};let revoked=false,capture=true,authCalls=0;
 const runtime={store:db.store,service,paymentReady:true,emailReady:true,origin};
 const handler=createBookingOperatorHandler({getRuntime:async()=>runtime,getAuth:async()=>({verifyIdToken:async(_token:string,checkRevoked:boolean)=>{authCalls++;assert.equal(checkRevoked,true);if(revoked)throw Error('private identity rejection');return claims;}}),validCapture:()=>capture,clock:()=>now});
 return{db,service,booking,sent,claims,runtime,handler,setRevoked:(v:boolean)=>{revoked=v;},setCapture:(v:boolean)=>{capture=v;},get authCalls(){return authCalls;},get gatewayCalls(){return gatewayCalls;}};
}
async function invoke(handler:any,path:string,{method='GET',body={},headers={}}:any={}){
 const normalized:any=Object.fromEntries(Object.entries({Authorization:'Bearer synthetic.Firebase.id_token_123456789',Origin:origin,'Content-Type':'application/json',...headers}).map(([k,v])=>[k.toLowerCase(),v]));
 const res:any={statusCode:200,headers:{},set(data:any){Object.assign(this.headers,data);return this;},status(code:number){this.statusCode=code;return this;},json(value:any){this.body=value;return this;}};
 await handler({path,method,body,get:(name:string)=>normalized[name.toLowerCase()],is:()=>normalized['content-type']==='application/json'},res,()=>{throw Error('Unexpected fall-through');});return res;
}
const base='/api/booking/operator/requests';
test('staff requires a verified exact owner or verified admin; a similar email/domain is never sufficient',()=>{
 assert.equal(isStaffIdentity({email:'kai@krakenpfm.ch',emailVerified:false,admin:true}),false);
 assert.equal(isStaffIdentity({email:'client@krakenpfm.ch',emailVerified:true}),false);
 assert.equal(isStaffIdentity({email:'kai@krakenpfm.ch.attacker.example',emailVerified:true}),false);
 assert.equal(isStaffIdentity({email:'kai@krakenpfm.ch',emailVerified:true}),true);
 assert.equal(isStaffIdentity({email:'admin@example.test',emailVerified:true,admin:true}),true);
});
test('operator read checks revoked server identity before any booking query and never reconciles payments',async()=>{
 const f=await fixture(),start=f.db.reads;
 assert.equal((await invoke(f.handler,base,{headers:{Authorization:''}})).statusCode,401);assert.equal(f.db.reads,start);
 f.claims.email_verified=false;assert.equal((await invoke(f.handler,base)).statusCode,403);assert.equal(f.db.reads,start);
 f.claims.email_verified=true;f.claims.email='client@krakenpfm.ch';assert.equal((await invoke(f.handler,base)).statusCode,403);assert.equal(f.db.reads,start);
 f.claims.email='kai@krakenpfm.ch';f.setRevoked(true);assert.equal((await invoke(f.handler,base)).statusCode,401);assert.equal(f.db.reads,start);f.setRevoked(false);
 f.service.read=async()=>{throw Error('Read must never reconcile in staff list');};
 const result=await invoke(f.handler,base);assert.equal(result.statusCode,200);assert.equal(result.body.bookings[0].bookingId,f.booking.bookingId);
 assert.equal(result.body.bookings[0].revision,1);assert.equal(result.headers['Cache-Control'],'private, no-store');
 assert.doesNotMatch(JSON.stringify(result.body),/publicToken|id_token|secret|checkout.*link/);assert.equal(f.gatewayCalls,0);
});
test('confirm requires same origin, capture, explicit availability, current revision and future bounded hold',async()=>{
 const f=await fixture(),path=`${base}/${f.booking.bookingId}/confirm`,body={expectedRevision:1,availabilityChecked:true,holdExpiresAt:new Date(now+3600000).toISOString()};
 for(const headers of [{Origin:'https://attacker.example'},{'Content-Type':'text/plain'}])assert.ok((await invoke(f.handler,path,{method:'POST',body,headers})).statusCode>=400);
 f.setCapture(false);assert.equal((await invoke(f.handler,path,{method:'POST',body})).statusCode,403);f.setCapture(true);
 assert.equal((await invoke(f.handler,path,{method:'POST',body:{...body,availabilityChecked:false}})).body.code,'AVAILABILITY_REVIEW_REQUIRED');
 assert.equal((await invoke(f.handler,path,{method:'POST',body:{...body,expectedRevision:2}})).statusCode,409);
 for(const expiry of [now-1,now+8*86400000])assert.equal((await invoke(f.handler,path,{method:'POST',body:{...body,holdExpiresAt:new Date(expiry).toISOString()}})).body.code,'INVALID_HOLD');
 assert.equal((await f.db.store.get(f.booking.bookingId)).scheduling.status,'requested');assert.equal(f.sent.length,0);
});
test('operator approval changes the real store and canCheckout, queues one approved personal payment email, and never opens a gateway',async()=>{
 const f=await fixture(),path=`${base}/${f.booking.bookingId}/confirm`,body={expectedRevision:1,availabilityChecked:true,holdExpiresAt:new Date(now+3600000).toISOString()};
 const result=await invoke(f.handler,path,{method:'POST',body});assert.equal(result.statusCode,200);
 const record=await f.db.store.get(f.booking.bookingId);assert.equal(record.scheduling.status,'held');assert.equal(record.confirmedBy,'verified-operator');assert.equal(result.body.booking.canCheckout,true);assert.equal(record.revision,2);
 assert.equal(record.quote.totalCents,f.booking.quote.totalCents);assert.equal(record.payment.amountDueNowCents,f.booking.payment.amountDueNowCents);assert.equal(record.payment.status,'not_started');assert.equal(f.gatewayCalls,0);
 assert.equal(f.sent.length,1);assert.equal(f.sent[0].to,input().customer.email);assert.match(f.sent[0].html,/<html[^>]*lang="es"/);
 const job=(await f.db.store.listMailForBooking(record.bookingId)).find(j=>j.kind==='payment_ready');assert.equal(job.notification.templateId,'payment_requested');assert.equal(job.status,'sent');assert.equal(job.prepared.idempotencyKey,`kraken-booking:${job.id}`);
 assert.equal(job.notification.renderData.pricing.totalRappen,record.quote.totalCents);assert.equal(job.notification.renderData.pricing.transactionRappen,record.payment.amountDueNowCents);
 assert.ok(f.sent[0].text.includes(record.reference));assert.ok(f.sent[0].text.includes('#access='));
 assert.equal((await invoke(f.handler,path,{method:'POST',body})).statusCode,409);assert.equal(f.sent.length,1);
 assert.doesNotMatch(JSON.stringify(result.body),/publicToken|#access=|prepared|<html|synthetic-mail-accepted/);
});
test('current terms operator confirmation needs no browser hold and emails the same server-owned capped deadline',async()=>{
 const f=await fixture(),path=`${base}/${f.booking.bookingId}/confirm`;
 const result=await invoke(f.handler,path,{method:'POST',body:{expectedRevision:1,availabilityChecked:true}});
 assert.equal(result.statusCode,200);
 const record=await f.db.store.get(f.booking.bookingId);
 assert.equal(record.payment.depositDueAt,'2026-11-28T09:00:00.000Z');
 assert.equal(record.scheduling.holdExpiresAt,record.payment.depositDueAt);
 assert.equal(record.confirmedAt,now);assert.equal(f.gatewayCalls,0);
 assert.equal(f.sent.length,1);assert.match(f.sent[0].text,/28 de noviembre de 2026.*10:00.*Europe\/Zurich/);
 assert.equal(result.body.booking.payment.depositDueAt,record.payment.depositDueAt);
});
test('operator lookup uses exact reference in POST body and unavailable mail/payment cannot imply approval',async()=>{
 const f=await fixture();const result=await invoke(f.handler,base+'/search',{method:'POST',body:{reference:f.booking.reference.toLowerCase()}});
 assert.equal(result.statusCode,200);assert.equal(result.body.bookings.length,1);
 assert.equal((await invoke(f.handler,base+'/search',{method:'POST',body:{reference:'client@example.test'}})).statusCode,400);
 f.runtime.emailReady=false;const response=await invoke(f.handler,`${base}/${f.booking.bookingId}/confirm`,{method:'POST',body:{expectedRevision:1,availabilityChecked:true,holdExpiresAt:new Date(now+3600000).toISOString()}});assert.equal(response.statusCode,503);assert.equal((await f.db.store.get(f.booking.bookingId)).revision,1);
});
test('Resend rejection persists only allowlisted status/name, and ambiguous provider outcomes remain blocked',async()=>{
 const send=createResendEmailAdapter('synthetic-not-real',async()=>Response.json({name:'validation_error',message:'SECRET_RAW_CUSTOMER_CANARY',stack:'PRIVATE_STACK'},{status:422}));
 let error:any;try{await send({from:'sender@example.test',to:'client@example.test',idempotencyKey:'synthetic-key'});}catch(cause){error=cause;}
 const safe=safeMailFailure(error,now);assert.deepEqual(safe,{code:'EMAIL_PROVIDER_REJECTED',definitelyNotSent:true,httpStatus:422,providerName:'validation_error',retryable:false,recordedAt:now});assert.doesNotMatch(JSON.stringify(safe),/CANARY|PRIVATE|@|synthetic/);
 const unknown=safeMailFailure({message:'PRIVATE_RAW',stack:'PRIVATE_STACK',providerName:'PRIVATE_NAME',providerStatus:200},now);assert.equal(unknown.code,'EMAIL_OUTCOME_UNKNOWN');assert.equal(unknown.providerName,null);assert.equal(unknown.httpStatus,null);
});
test('safe retry uses the same durable job/envelope/key once; competing retries, suppression and unknown acceptance cannot send again',async()=>{
 const f=await fixture(),id=`${f.booking.bookingId}:request:1`,key=`kraken_booking_outbox/${digest(id)}`;
 const prepared={from:'sender@example.test',to:input().customer.email,subject:'Prepared',html:'<p>Prepared</p>',text:'Prepared',idempotencyKey:`kraken-booking:${id}`};
 f.db.values.set(key,{...f.db.values.get(key),status:'failed',attempts:1,prepared,failure:safeMailFailure({code:'EMAIL_PROVIDER_REJECTED',definitelyNotSent:true,providerStatus:403,providerName:'validation_error'},now)});
 const before=clone(f.db.values.get(key).prepared);
 const attempts=await Promise.allSettled([f.db.store.requeueFailedMail(f.booking.bookingId,id,1,'operator',now),f.db.store.requeueFailedMail(f.booking.bookingId,id,1,'operator',now)]);
 assert.equal(attempts.filter(row=>row.status==='fulfilled').length,1);assert.equal(f.db.values.get(key).status,'queued');assert.deepEqual(f.db.values.get(key).prepared,before);
 await f.service.runDue({jobId:id,limit:1});assert.equal(f.sent.length,1);assert.deepEqual(f.sent[0],prepared);assert.equal(f.db.values.get(key).attempts,2);
 await assert.rejects(f.db.store.requeueFailedMail(f.booking.bookingId,id,2,'operator',now),{code:'EMAIL_NOT_RETRYABLE'});
 const record=await f.db.store.get(f.booking.bookingId),safeJob={id,kind:'request',status:'failed',attempts:1,prepared,failure:{code:'EMAIL_PROVIDER_REJECTED',definitelyNotSent:true}};
 for(const status of ['sent','sending','queued','delivery_unknown','cancelled'])assert.ok(mailRetryBlock({...safeJob,status},record,false));
 assert.equal(mailRetryBlock(safeJob,record,true),'EMAIL_SUPPRESSED');
 assert.equal(mailRetryBlock({...safeJob,failure:null},record,false),'EMAIL_REVIEW_REQUIRED');
 assert.equal(mailRetryBlock({...safeJob,prepared:{...prepared,to:'different@example.test'}},record,false),'EMAIL_REVIEW_REQUIRED');
 assert.equal(mailRetryBlock({...safeJob,attempts:6},record,false),'EMAIL_RETRY_LIMIT');
 const view=operatorMailView({...safeJob,prepared:{...prepared,html:'PRIVATE_HTML'},failure:{...safeJob.failure,message:'PRIVATE_RAW',httpStatus:403,providerName:'validation_error',recordedAt:now}},record,false);assert.equal(view.canRetry,true);assert.doesNotMatch(JSON.stringify(view),/PRIVATE|prepared|@/);
});
test('client sends only Firebase authorization and body-only reference, and discards a response after identity change',async()=>{
 let current:any={uid:'operator-one',getIdToken:async()=>'synthetic.id.token'},release!:()=>void;
 const calls:any[]=[];const client=createOperatorClient({uid:'operator-one',currentUser:()=>current,fetcher:async(url:any,options:any)=>{calls.push({url,options});if(url==='/api/booking/config')return Response.json({});await new Promise<void>(resolve=>{release=resolve;});return Response.json({bookings:[]});}});
 const pending=client(base+'/search',{reference:'K-2026-XXXXXXXX'});await new Promise(resolve=>setImmediate(resolve));assert.equal(calls[0].url,'/api/booking/config');assert.equal(calls[1].url,base+'/search');assert.equal(calls[1].options.method,'POST');assert.equal(calls[1].options.headers.Authorization,'Bearer synthetic.id.token');assert.equal(calls[1].options.body,'{"reference":"K-2026-XXXXXXXX"}');assert.equal(calls[1].options.cache,'no-store');
 current={uid:'operator-two'};release();await assert.rejects(pending,{message:'UNAUTHORIZED'});
});
test('anonymous access pins before any lookup and acknowledges before provider; unsupported schedulers never look up a recipient',async()=>{
 for(const schedule of [undefined,()=>false,()=>{throw Error('No host lifecycle');}]){let reads=0,sends=0;await assert.rejects(pinnedAccessRequest({schedule,request:async()=>{reads++;return{};},dispatch:async()=>{sends++;}}),{code:'ACCESS_EMAIL_DISPATCH_UNAVAILABLE'});assert.equal(reads,0);assert.equal(sends,0);}
 let pinned:Promise<unknown>|null=null,release!:()=>void,started=false;
 const result=await pinnedAccessRequest({schedule:work=>{pinned=work;return true;},request:async queued=>{assert.ok(pinned);await queued('exact-durable-job');return{status:'accepted'};},dispatch:async id=>{assert.equal(id,'exact-durable-job');started=true;await new Promise<void>(resolve=>{release=resolve;});}});
 assert.deepEqual(result,{status:'accepted'});assert.ok(started);release();await pinned;
});
