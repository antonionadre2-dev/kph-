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
            :'export const getApps=()=>[]; export const initializeApp=()=>({}); export const cert=()=>({}); export const applicationDefault=()=>({}); export const getFirestore=()=>({}); export const getAuth=()=>({});'}));
        }}],
      });
      diagnostics.length=0;
      const {createBookingHandlers}=require(outfile);
      const handlers=createBookingHandlers({env:{BOOKING_ENABLED:'true',BOOKING_TOKEN_SECRET:'PRIVATE_TOKEN_CANARY_more-than-thirty-two-characters',FIREBASE_SERVICE_ACCOUNT_JSON:'PRIVATE_CREDENTIAL_CANARY'}});
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
