import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import {createHmac} from 'node:crypto';
import {Webhook} from 'svix';
import { createRequire } from 'node:module';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)),require=createRequire(import.meta.url),origin='https://kraken.example';
let bundle;
async function mockedHandlers(){
  if(bundle)return bundle;
  mkdirSync(path.join(root,'node_modules/.cache'),{recursive:true});
  const dir=mkdtempSync(path.join(root,'node_modules/.cache/customer-access-')),outfile=path.join(dir,'handlers.cjs');
  const adapters={
    control:'export const state={}; export const getReminderGate=()=>state.remindersEnabled; export const setFixture=value=>{for(const key of Object.keys(state))delete state[key];Object.assign(state,value);};',
    store:`import {state} from 'fixture-control'; import {createHash} from 'node:crypto'; export const createFirestoreBookingStore=()=>state.store; export const digest=value=>createHash('sha256').update(value).digest('hex'); export class BookingError extends Error{constructor(code,status=400){super(code);this.code=code;this.status=status;}}`,
    auth:`import {state} from 'fixture-control'; export const getAuth=()=>state.auth;`,
    sdk:'export const getApps=()=>[];export const initializeApp=()=>({});export const cert=()=>({});export const applicationDefault=()=>({});export const getFirestore=()=>({});',
    recovery:`import {state} from 'fixture-control';export const createRecoveryService=options=>{state.remindersEnabled=options.remindersEnabled;return state.recovery;};`,
    recoveryStore:'export const createFirestoreRecoveryStore=()=>({});',
  };
  try{
    await build({stdin:{contents:"export {createBookingHandlers} from './server/booking.ts';export {setFixture,getReminderGate} from 'fixture-control';",resolveDir:root,loader:'ts'},outfile,bundle:true,platform:'node',format:'cjs',packages:'external',logLevel:'silent',plugins:[{name:'mock-account-adapters',setup(b){
      b.onResolve({filter:/^fixture-control$/},()=>({path:'control',namespace:'mock'}));
      b.onResolve({filter:/\/booking-store\.ts$/},()=>({path:'store',namespace:'mock'}));
      b.onResolve({filter:/^firebase-admin\//},args=>({path:args.path.endsWith('/auth')?'auth':'sdk',namespace:'mock'}));
      b.onResolve({filter:/recovery\/service\.mjs$/},()=>({path:'recovery',namespace:'mock'}));
      b.onResolve({filter:/recovery\/firestore-store\.mjs$/},()=>({path:'recoveryStore',namespace:'mock'}));
      b.onLoad({filter:/.*/,namespace:'mock'},args=>({loader:'js',contents:adapters[args.path]}));
    }}]});bundle=require(outfile);return bundle;
  }finally{delete require.cache[outfile];rmSync(dir,{recursive:true,force:true});}
}
const env=overrides=>({APP_URL:origin,BOOKING_ENABLED:'true',BOOKING_TOKEN_SECRET:'synthetic-booking-secret-over-thirty-two-characters',FIREBASE_SERVICE_ACCOUNT_JSON:'{}',RESEND_API_KEY:'synthetic-key',BOOKING_EMAIL_FROM:'Kraken <kai@krakenpfm.ch>',RECOVERY_TOKEN_SECRET:'synthetic-recovery-secret-over-thirty-two-characters',CRON_SECRET:'synthetic-cron-secret-over-thirty-two-characters',BOOKING_CUSTOMER_ACCESS_ENABLED:'true',BOOKING_EMAIL_COLLECTION_ENABLED:'true',...overrides});
async function invoke(handlers,path,{method='GET',body={},headers={}}={}){
  const cookieValue=`syntheticnonce000000000000000.${Date.now()+3600000}`;
  const cookie=`kraken_capture=${cookieValue}.${createHmac('sha256','synthetic-booking-secret-over-thirty-two-characters').update(cookieValue).digest('base64url')}`;
  const normalized={'content-type':'application/json',origin,cookie,...Object.fromEntries(Object.entries(headers).map(([key,value])=>[key.toLowerCase(),value]))};
  const res={statusCode:200,body:null,set(){return this;},status(value){this.statusCode=value;return this;},json(value){this.body=value;return this;}};
  await handlers.middleware({path,method,body,socket:{remoteAddress:'synthetic-account-client'},get:name=>normalized[name.toLowerCase()],is:()=>true},res,()=>{throw new Error('Unexpected next');});return res;
}
function fixture(){
  const mail=new Map(),sent=[],lookups=[],verified=[],state={claims:{email_verified:true,email:'CLIENT@EXAMPLE.TEST'}};
  let generated=0;
  const store={async addMail(job){if(mail.has(job.id))return false;mail.set(job.id,structuredClone(job));return true;},async getMail(id){return structuredClone(mail.get(id)||null);},async consumeRate(){return true;},async isEmailSuppressed(){return false;},async claimMail(id){const job=mail.get(id);if(job?.status!=='queued')return null;Object.assign(job,{status:'sending',attempts:1});return structuredClone(job);},async prepareMail(id,message){mail.get(id).prepared=structuredClone(message);return message;},async finishMail(id,status){Object.assign(mail.get(id),{status});},async listByEmail(email){lookups.push(email);return [{bookingId:'own-booking',customer:{email},quote:{totalCents:10000},scheduling:{},payment:{}}];}};
  const auth={async generateSignInWithEmailLink(){generated++;return 'https://vivid-kite-477020-h6.firebaseapp.com/__/auth/action?mode=signIn&oobCode=synthetic-code';},async verifyIdToken(token,revoked){verified.push([token,revoked]);if(state.reject)throw new Error('revoked token');return state.claims;}};
  const recovery={config:{enabled:true},async read(id,token){if(id!=='synthetic-draft'||token!=='synthetic-draft-capability')throw new Error('wrong capability');return {id,email:'client@example.test'};}};
  const fetcher=async(url,init)=>{assert.equal(url,'https://api.resend.com/emails');const message=JSON.parse(init.body);sent.push(message);assert.equal([...mail.values()][0].status,'sending');assert.ok([...mail.values()][0].prepared);return Response.json({id:'synthetic-accepted'});};
  return {store,auth,recovery,fetcher,mail,sent,lookups,verified,state,generated:()=>generated};
}

test('Firebase account access is immediately dispatched, locale-persisted, idempotent and rejects mismatched capabilities',async t=>{
  t.mock.method(console,'info',()=>{});const {createBookingHandlers,setFixture}=await mockedHandlers(),f=fixture();setFixture(f);
  const handlers=createBookingHandlers({env:env({}),fetcher:f.fetcher});
  const body={email:'client@example.test',language:'fr',idempotencyKey:'synthetic-idempotency-000',recovery:{id:'synthetic-draft',accessToken:'synthetic-draft-capability'}};
  for(let i=0;i<2;i++){const res=await invoke(handlers,'/api/customer/access',{method:'POST',body});assert.equal(res.statusCode,202,JSON.stringify(res.body));assert.equal(res.body.mailStatus,'sent');}
  assert.equal(f.generated(),1);assert.equal(f.sent.length,1);assert.equal(f.mail.size,1);assert.match(f.sent[0].html,/<html lang="fr">/);
  assert.equal([...f.mail.values()][0].notification.languageSnapshot.language,'fr');
  const bad=await invoke(handlers,'/api/customer/access',{method:'POST',body:{...body,email:'other@example.test'}});assert.equal(bad.statusCode,403);assert.equal(f.generated(),1);
  const invalid=await invoke(handlers,'/api/customer/access',{method:'POST',body:{...body,idempotencyKey:'bad key'}});assert.equal(invalid.statusCode,400);assert.equal(f.generated(),1);
});

test('the account list uses only the token’s verified email, checks revocation and never accepts a client email filter',async t=>{
  t.mock.method(console,'info',()=>{});const {createBookingHandlers,setFixture}=await mockedHandlers(),f=fixture();setFixture(f);
  const handlers=createBookingHandlers({env:env({}),fetcher:f.fetcher}),headers={Authorization:'Bearer synthetic_firebase_token_over_twenty_chars'};
  const res=await invoke(handlers,'/api/customer/bookings',{headers,body:{email:'victim@example.test'}});
  assert.equal(res.statusCode,200,JSON.stringify(res.body));assert.deepEqual(f.lookups,['client@example.test']);assert.equal(res.body.bookings[0].customer.email,'client@example.test');assert.equal(res.body.bookings[0].publicToken,undefined);
  assert.deepEqual(f.verified,[['synthetic_firebase_token_over_twenty_chars',true]]);
  for(const claims of [{email_verified:false,email:'victim@example.test'},{email_verified:'true',email:'victim@example.test'},{email_verified:true,email:42},{email_verified:true,email:'bad\r\n@value.test'},null]){
    f.state.claims=claims;assert.equal((await invoke(handlers,'/api/customer/bookings',{headers})).statusCode,401);
  }
  f.state.reject=true;assert.equal((await invoke(handlers,'/api/customer/bookings',{headers})).statusCode,401);assert.equal(f.lookups.length,1);
});

test('account access stays disabled by default, and reminder opt-in alone cannot bypass an unscoped webhook',async t=>{
  t.mock.method(console,'info',()=>{});const {createBookingHandlers,setFixture,getReminderGate}=await mockedHandlers();
  for(const overrides of [{BOOKING_CUSTOMER_ACCESS_ENABLED:'false'},{BOOKING_RECOVERY_REMINDERS_ENABLED:'true',RESEND_WEBHOOK_SECRET:'synthetic-webhook-secret-over-thirty-two-bytes',BOOKING_CUSTOMER_ACCESS_ENABLED:'false'}]){
    const f=fixture();setFixture(f);const handlers=createBookingHandlers({env:env(overrides),fetcher:f.fetcher});const runtime=await handlers.initialize();
    assert.equal(runtime.customerAccess,false);assert.equal(getReminderGate(),false);assert.equal((await invoke(handlers,'/api/customer/bookings')).statusCode,503);assert.equal(f.lookups.length,0);assert.equal(f.generated(),0);
    assert.equal((await invoke(handlers,'/api/customer/access/config')).body.enabled,false);
  }
});

test('the actual raw Resend route verifies signatures before ignoring foreign account brands',async t=>{
  t.mock.method(console,'info',()=>{});const {createBookingHandlers,setFixture}=await mockedHandlers(),f=fixture();setFixture(f);
  const calls=[];Object.assign(f.store,{async emailEventProcessed(){calls.push('lookup');return false;},async finishEmailEvent(){calls.push('finish');},async suppressEmail(email){calls.push(['booking',email]);}});
  f.recovery.suppressEmail=async email=>calls.push(['recovery',email]);
  const secret=`whsec_${Buffer.from('synthetic-webhook-secret-over-thirty-two-chars').toString('base64')}`,signer=new Webhook(secret);
  const handlers=createBookingHandlers({env:env({RESEND_WEBHOOK_SECRET:secret,RESEND_WEBHOOK_SENDER_DOMAIN:'krakenpfm.ch'}),fetcher:f.fetcher});
  async function deliver(from,forged=false){
    const raw=JSON.stringify({type:'email.bounced',data:{from,to:['client@example.test']}}),date=new Date(),id='svix_synthetic_scoped_'+calls.length;
    const headers={'svix-id':id,'svix-timestamp':String(Math.floor(date.getTime()/1000)),'svix-signature':forged?'v1,invalid':signer.sign(id,date,raw)};
    const res={statusCode:200,body:null,set(){return this;},status(value){this.statusCode=value;return this;},json(value){this.body=value;return this;}};
    await handlers.emailWebhook({body:Buffer.from(raw),get:name=>headers[name]},res,()=>{});return res;
  }
  assert.deepEqual((await deliver('Other <sender@other.test>')).body,{received:true,ignored:true});assert.deepEqual(calls,[]);
  assert.equal((await deliver('kai@krakenpfm.ch',true)).statusCode,401);assert.deepEqual(calls,[]);
  const res=await deliver('Kraken PFM <kai@krakenpfm.ch>');assert.equal(res.statusCode,200);assert.deepEqual(calls,['lookup',['booking','client@example.test'],['recovery','client@example.test'],'finish']);
});
