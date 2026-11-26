import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const knownCodes=['ERR_REQUIRE_ESM','ERR_REQUIRE_ASYNC_MODULE','ERR_AMBIGUOUS_MODULE_SYNTAX','ERR_INTERNAL_ASSERTION','ERR_DLOPEN_FAILED','ERR_UNSUPPORTED_DIR_IMPORT','ERR_IMPORT_ATTRIBUTE_MISSING','ERR_REQUIRE_CYCLE_MODULE','ENOENT','EACCES'];
const categories={dynamicRequire:true,missingModule:true,missingPackage:true,notSupported:true,requireCall:true,packageJson:true,cannotLoad:true,missingExport:true};
const markerMessage='Dynamic require Cannot find module Cannot find package not supported require() package.json Cannot load does not provide an export PRIVATE_MESSAGE_CANARY';

test('each SDK import phase logs only category booleans and permitted Node codes',async(t)=>{
  const diagnostics=[];
  for(const method of ['info','warn','error'])t.mock.method(console,method,(...args)=>diagnostics.push(args));
  const cache=path.join(root,'node_modules/.cache');mkdirSync(cache,{recursive:true});
  const temporary=mkdtempSync(path.join(cache,'booking-import-diagnostic-test-'));
  const require=createRequire(import.meta.url);
  try{
    for(const [index,code]of [...knownCodes,'PRIVATE_CODE_CANARY'].entries()){
      const sdk=['app','firestore','auth'][index%3];
      const message=index===knownCodes.length?'PRIVATE_MESSAGE_CANARY':markerMessage;
      const outfile=path.join(temporary,`case-${index}.cjs`);
      await build({
        entryPoints:[path.join(root,'server/booking.ts')],outfile,bundle:true,platform:'node',format:'cjs',packages:'external',logLevel:'silent',
        plugins:[{name:'synthetic-sdk-import-failure',setup(build){
          build.onResolve({filter:/^firebase-admin\/(?:app|firestore|auth)$/},args=>({path:args.path,namespace:'synthetic-sdk'}));
          build.onLoad({filter:/.*/,namespace:'synthetic-sdk'},args=>({loader:'js',contents:args.path===`firebase-admin/${sdk}`
            ?`throw Object.assign(new Error(${JSON.stringify(message)}),{code:${JSON.stringify(code)}}); export {};`
            :'export const getApps=()=>[]; export const initializeApp=()=>({}); export const cert=()=>({}); export const applicationDefault=()=>({}); export const getFirestore=()=>({collection:()=>({})}); export const getAuth=()=>({});'}));
        }}],
      });
      diagnostics.length=0;
      const {createBookingHandlers}=require(outfile);
      const handlers=createBookingHandlers({env:{BOOKING_ENABLED:'true',BOOKING_TOKEN_SECRET:'PRIVATE_TOKEN_CANARY_more-than-thirty-two-characters',FIREBASE_SERVICE_ACCOUNT_JSON:'{"private_key":"PRIVATE_CREDENTIAL_CANARY"}',BOOKING_CUSTOMER_ACCESS_ENABLED:'true',RESEND_API_KEY:'synthetic-key',BOOKING_EMAIL_FROM:'test@example.test',RECOVERY_TOKEN_SECRET:'synthetic-recovery-secret-more-than-thirty-two-characters',CRON_SECRET:'PRIVATE_CRON_CANARY_more-than-thirty-two-characters'}});
      const [first,second]=await Promise.all([handlers.initialize(),handlers.initialize()]);
      assert.equal(first,second);assert.equal(first.service,null);await handlers.initialize();
      assert.deepEqual(diagnostics,[['[booking:initialize]',{
        bookingEnabled:true,tokenSecretReady:true,adminCredentialProvided:true,phase:`sdk_${sdk}_import`,
        error:{name:'Error',code:knownCodes.includes(code)?code:null},
        errorCategory:index===knownCodes.length?Object.fromEntries(Object.keys(categories).map(key=>[key,false])):categories,
      }]]);
      assert.doesNotMatch(JSON.stringify(diagnostics),/CANARY|Dynamic require|Cannot find|not supported|require\(\)|package\.json|Cannot load|does not provide an export/);
      delete require.cache[outfile];
    }
  }finally{rmSync(temporary,{recursive:true,force:true});}
});

test('booking avoids Auth loading unless customer access has every prerequisite, and otherwise fails closed',async(t)=>{
  const diagnostics=[];
  for(const method of ['info','warn','error'])t.mock.method(console,method,(...args)=>diagnostics.push(args));
  const cache=path.join(root,'node_modules/.cache');mkdirSync(cache,{recursive:true});
  const temporary=mkdtempSync(path.join(cache,'booking-optional-auth-test-'));
  const outfile=path.join(temporary,'optional-auth.cjs');
  const require=createRequire(import.meta.url);
  try{
    await build({
      entryPoints:[path.join(root,'server/booking.ts')],outfile,bundle:true,platform:'node',format:'cjs',packages:'external',logLevel:'silent',
      plugins:[{name:'unavailable-optional-auth',setup(build){
        build.onResolve({filter:/^firebase-admin\/(?:app|firestore|auth)$/},args=>({path:args.path,namespace:'synthetic-sdk'}));
        build.onLoad({filter:/.*/,namespace:'synthetic-sdk'},args=>({loader:'js',contents:args.path==='firebase-admin/auth'
          ?'throw Object.assign(new Error("require() unavailable PRIVATE_AUTH_MESSAGE_CANARY"),{code:"ERR_REQUIRE_ESM"}); export const getAuth=()=>{throw new Error("getAuth must not run");};'
          :'export const getApps=()=>[]; export const initializeApp=()=>({}); export const cert=()=>({}); export const applicationDefault=()=>({}); export const getFirestore=()=>({collection:()=>({})});'}));
      }}],
    });
    const {createBookingHandlers}=require(outfile);
    const base={BOOKING_ENABLED:'true',BOOKING_TOKEN_SECRET:'synthetic-booking-secret-more-than-thirty-two-characters',FIREBASE_SERVICE_ACCOUNT_JSON:'{}',RESEND_API_KEY:'synthetic-key',BOOKING_EMAIL_FROM:'test@example.test',RECOVERY_TOKEN_SECRET:'synthetic-recovery-secret-more-than-thirty-two-characters',CRON_SECRET:'synthetic-cron-secret-more-than-thirty-two-characters',PAYREXX_INSTANCE:'synthetic-test',PAYREXX_API_SECRET:'synthetic-provider-secret',PAYREXX_WEBHOOK_SECRET:'synthetic-separate-webhook-secret',PAYREXX_MODE:'live'};
    for(const override of [
      {BOOKING_CUSTOMER_ACCESS_ENABLED:'false'},
      {},
      {BOOKING_CUSTOMER_ACCESS_ENABLED:'TRUE'},
      {BOOKING_CUSTOMER_ACCESS_ENABLED:'true',RECOVERY_TOKEN_SECRET:undefined},
      {BOOKING_CUSTOMER_ACCESS_ENABLED:'true',RESEND_API_KEY:undefined},
      {BOOKING_CUSTOMER_ACCESS_ENABLED:'true',CRON_SECRET:undefined},
    ]){
      diagnostics.length=0;
      const handlers=createBookingHandlers({env:{...base,...override},fetcher:async()=>{throw new Error('Network is forbidden in this test');}});
      const runtime=await handlers.initialize();
      assert.ok(runtime.service,'durable booking requests must remain available without optional Auth');
      assert.equal(runtime.paymentReady,true);
      assert.equal(runtime.mode,'live');
      assert.equal(runtime.customerAccess,false);
      assert.equal(runtime.auth,null);
      assert.deepEqual(diagnostics,[['[booking:initialize]',{bookingEnabled:true,tokenSecretReady:true,adminCredentialProvided:true,phase:'ready',error:{name:null,code:null}}]]);
    }
    diagnostics.length=0;
    const handlers=createBookingHandlers({env:{...base,BOOKING_CUSTOMER_ACCESS_ENABLED:'true'}});
    const runtime=await handlers.initialize();
    assert.equal(runtime.service,null,'an explicitly enabled Auth failure must remain fail-closed');
    assert.equal(runtime.customerAccess,false);assert.equal(runtime.auth,null);
    assert.equal(diagnostics.length,1);
    assert.equal(diagnostics[0][1].phase,'sdk_auth_import');
    assert.deepEqual(diagnostics[0][1].error,{name:'Error',code:'ERR_REQUIRE_ESM'});
    assert.equal(diagnostics[0][1].errorCategory.requireCall,true);
    assert.doesNotMatch(JSON.stringify(diagnostics),/CANARY|getAuth must not run/);
  }finally{delete require.cache[outfile];rmSync(temporary,{recursive:true,force:true});}
});
