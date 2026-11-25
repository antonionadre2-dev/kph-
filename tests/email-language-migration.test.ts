import assert from 'node:assert/strict';
import test from 'node:test';
import { calculatePrice } from '../src/booking/pricing.ts';
import { migrateEmailLanguages, planLanguageRecord } from '../server/email-language-migration.ts';
import { migrationArguments, runEmailLanguageMigrationCli } from '../scripts/migrate-email-language.ts';

const clone=(value:any)=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
const selection={service:'regular',frequency:'weekly',hours:2.5,extras:{}};
const quote=calculatePrice(selection as any);
const snapshot=(language='es')=>({language,source:'selected',version:1});
function booking(id='booking-a',language:any='es') {
  return {bookingId:id,reference:`K-${id}`,language,selection,quote,
    customer:{name:'Synthetic Customer',email:'synthetic@example.test',city:'Schaffhausen',address:'Example3',postalCode:'8203'},
    payment:{status:'paid',amountDueNowCents:1500,amountPaidCents:1500,remainingBalanceCents:8500,transactionId:'synthetic-payment'},
    checkout:{reference:`${id}-r1`},revision:1};
}
function draft(id='draft-abcdefghijklmnop',language:any='fr') {
  return {id,language,email:'draft@example.test',selection,quote,status:'active',reminderConsent:false,version:1};
}

class MemoryDatabase {
  rows=new Map<string,Map<string,any>>(); transactions=0; writes=0;
  beforeTransaction:(()=>void)|null=null; retryFirst=false;
  constructor(seed:Record<string,Record<string,any>>={}) {for(const [collection,rows]of Object.entries(seed))this.rows.set(collection,new Map(Object.entries(clone(rows))));}
  row(collection:string,id:string) {return clone(this.rows.get(collection)?.get(id));}
  put(collection:string,id:string,value:any) {if(!this.rows.has(collection))this.rows.set(collection,new Map());this.rows.get(collection)!.set(id,clone(value));}
  collection(name:string) {return new MemoryQuery(this,name);}
  async runTransaction<T>(work:(tx:any)=>Promise<T>) {
    this.transactions++;this.beforeTransaction?.();this.beforeTransaction=null;
    const attempt=async(commit:boolean)=>{
      const pending:{ref:any;patch:any}[]=[];
      const result=await work({get:async(ref:any)=>new MemorySnapshot(this,ref.collection,ref.id),update:(ref:any,patch:any)=>pending.push({ref,patch})});
      if(commit)for(const {ref,patch}of pending){this.put(ref.collection,ref.id,{...this.row(ref.collection,ref.id),...clone(patch)});this.writes++;}
      return result;
    };
    if(this.retryFirst){this.retryFirst=false;await attempt(false);}
    return attempt(true);
  }
}
class MemorySnapshot {
  ref:any; exists:boolean; private value:any;
  constructor(db:MemoryDatabase,public collection:string,public id:string) {this.ref={collection,id};this.value=db.row(collection,id);this.exists=this.value!==undefined;}
  data(){return clone(this.value);}
}
class MemoryQuery {
  constructor(private db:MemoryDatabase,private name:string,private filters:any[]=[],private count=Infinity,private cursor:any=null){}
  orderBy(field:string){assert.equal(field,'__name__');return this;}
  where(field:string,operator:string,value:any){assert.equal(operator,'==');return new MemoryQuery(this.db,this.name,[...this.filters,[field,value]],this.count,this.cursor);}
  limit(count:number){assert.ok(count<=50);return new MemoryQuery(this.db,this.name,this.filters,count,this.cursor);}
  startAfter(cursor:any){return new MemoryQuery(this.db,this.name,this.filters,this.count,cursor.id);}
  async get(){return {docs:[...(this.db.rows.get(this.name)||new Map()).keys()].sort().filter(id=>(!this.cursor||id>this.cursor)&&this.filters.every(([field,value])=>this.db.row(this.name,id)[field]===value)).slice(0,this.count).map(id=>new MemorySnapshot(this.db,this.name,id))};}
}
const request=(id='booking-a')=>({id:`${id}:request:1`,bookingId:id,kind:'request',status:'queued',dueAt:1});
const saved=(id='draft-abcdefghijklmnop')=>({id:`${id}:saved`,draft_id:id,kind:'saved',status:'queued',attempts:0,lease_until:null,due_at:1});

test('legacy planning preserves six valid choices, selects customer then explicit historical German',()=>{
  for(const language of ['de','en','es','fr','it','pt']) {
    const plan=planLanguageRecord({language});assert.deepEqual(plan.patch,{language,languageSnapshot:{language,source:'booking',version:1}});
  }
  assert.deepEqual(planLanguageRecord({language:'pt-BR'}).languageSnapshot,{language:'pt',source:'booking',version:1});
  assert.deepEqual(planLanguageRecord({customer:{language:'fr-CH'}}).languageSnapshot,{language:'fr',source:'legacy-customer',version:1});
  assert.deepEqual(planLanguageRecord({}).languageSnapshot,{language:'de',source:'legacy-default',version:1});
});

test('existing valid snapshot is preserved and corruption or disagreement never falls back',()=>{
  const record={language:'es',languageSnapshot:snapshot('es')};assert.equal(planLanguageRecord(record).patch,null);
  for(const language of ['', 'xx',false,{}, ['es']])assert.throws(()=>planLanguageRecord({language}));
  for(const bad of [{},'',{language:'es',source:'selected',version:2},{language:'es',source:'callback',version:1}])assert.throws(()=>planLanguageRecord({language:'es',languageSnapshot:bad}));
  assert.throws(()=>planLanguageRecord({language:'de',languageSnapshot:snapshot('es')}),/LANGUAGE_SNAPSHOT_MISMATCH/);
  assert.throws(()=>planLanguageRecord({languageSnapshot:snapshot('es')}));
});

test('default dry-run plans paginated records and jobs without a transaction or private output',async()=>{
  const first=booking('booking-a'),second=booking('booking-b','it');
  const db=new MemoryDatabase({kraken_bookings:{'booking-a':first,'booking-b':second},kraken_booking_outbox:{hash1:request(),hash2:request('booking-b')},kraken_recovery_drafts:{'draft-abcdefghijklmnop':draft()},kraken_recovery_outbox:{hash3:saved()}});
  const before=JSON.stringify([...db.rows]);
  const result=await migrateEmailLanguages({db,pageSize:1,maxPages:20});
  assert.deepEqual(result.scanned,{bookings:2,drafts:1,jobs:3});assert.deepEqual(result.planned,{records:3,notifications:3});
  assert.deepEqual(result.applied,{records:0,notifications:0});assert.equal(result.truncated,false);
  assert.equal(db.transactions,0);assert.equal(db.writes,0);assert.equal(JSON.stringify([...db.rows]),before);
  assert.doesNotMatch(JSON.stringify(result),/synthetic@|booking-a|draft-abcdefghijklmnop|Example3/);
});

test('apply updates language and matching old queue rows atomically while preserving IDs and event identity',async()=>{
  const record=booking();
  const receipt={...request(),id:'booking-a:receipt:booking-a-r1',kind:'receipt',attempts:0};
  const db=new MemoryDatabase({kraken_bookings:{'booking-a':record},kraken_booking_outbox:{oldSha1:request(),oldSha2:receipt},kraken_recovery_drafts:{'draft-abcdefghijklmnop':draft()},kraken_recovery_outbox:{oldSha3:saved()}});
  db.retryFirst=true;
  const result=await migrateEmailLanguages({db,apply:true,operatorId:'synthetic-operator',clock:()=>123,pageSize:1,maxPages:20});
  assert.deepEqual(result.applied,{records:2,notifications:3});
  assert.deepEqual(db.row('kraken_bookings','booking-a').languageSnapshot,{language:'es',source:'booking',version:1});
  assert.deepEqual(db.row('kraken_bookings','booking-a').emailLanguageMigration,{version:1,operatorId:'synthetic-operator',migratedAt:123});
  const first=db.row('kraken_booking_outbox','oldSha1'),paid=db.row('kraken_booking_outbox','oldSha2');
  assert.equal(first.id,request().id);assert.equal(first.notification.eventId,'booking-a:requested:1');assert.equal(first.notification.templateId,'request_received');
  assert.equal(paid.id,receipt.id);assert.equal(paid.notification.eventId,'booking-a:settled:booking-a-r1');assert.equal(paid.notification.templateId,'deposit_received');
  assert.equal(paid.status,'queued');assert.equal(paid.attempts,0);assert.equal(paid.dueAt,1);
  assert.equal(db.row('kraken_recovery_outbox','oldSha3').notification.templateId,'quote_saved');
  const frozen=JSON.stringify([...db.rows]);
  const again=await migrateEmailLanguages({db,apply:true,operatorId:'different-operator',clock:()=>456,pageSize:1,maxPages:20});
  assert.deepEqual(again.applied,{records:0,notifications:0});assert.equal(JSON.stringify([...db.rows]),frozen);
});

test('full payment selects payment_received and valid snapshots retain their source',async()=>{
  const record={...booking(),languageSnapshot:snapshot('es'),payment:{...booking().payment,remainingBalanceCents:0}};
  const db=new MemoryDatabase({kraken_bookings:{'booking-a':record},kraken_booking_outbox:{oldSha:{...request(),kind:'receipt'}}});
  const result=await migrateEmailLanguages({db,apply:true,operatorId:'operator',clock:()=>1});
  assert.equal(result.applied.records,0);assert.deepEqual(db.row('kraken_bookings','booking-a'),record);
  assert.equal(db.row('kraken_booking_outbox','oldSha').notification.templateId,'payment_received');
  assert.deepEqual(db.row('kraken_booking_outbox','oldSha').notification.languageSnapshot,snapshot('es'));
});

test('attempted, prepared, existing, sent and uncertain messages are immutable; access links need renewal',async()=>{
  const jobs:any={};
  for(const [index,changes]of [
    {status:'sent'},{status:'sending'},{status:'delivery_unknown'},{status:'failed'},
    {attempts:1},{attempts:3},{attempts:'0'},{prepared:{html:'immutable',text:'immutable'}},
    {preparedAt:1},{providerId:'already-accepted'},{notification:{id:'existing-notification'}},
    {kind:'customer_access',message:{html:'old-link'}},
  ].entries())jobs[`sha${index}`]={...request(),attempts:0,...changes};
  const db=new MemoryDatabase({kraken_bookings:{'booking-a':{...booking(),languageSnapshot:snapshot()}},kraken_booking_outbox:jobs});
  const result=await migrateEmailLanguages({db,apply:true,operatorId:'operator',clock:()=>1,pageSize:3});
  assert.equal(result.applied.notifications,0);assert.deepEqual(Object.fromEntries(db.rows.get('kraken_booking_outbox')!),jobs);
  assert.equal(result.skips.ACCESS_REQUIRES_RENEWAL,1);assert.equal(result.skips.JOB_ALREADY_ATTEMPTED,3);
});

test('corrupt languages produce only fixed error counts and do not overwrite source or jobs',async()=>{
  const record=booking('booking-a','not-a-supported-language');const db=new MemoryDatabase({kraken_bookings:{'booking-a':record},kraken_booking_outbox:{hash:request()}});
  const result=await migrateEmailLanguages({db,apply:true,operatorId:'operator'});
  assert.equal(Object.values(result.errors).reduce((a,b)=>a+b,0),1);assert.equal(result.applied.records,0);assert.equal(result.applied.notifications,0);
  assert.deepEqual(db.row('kraken_bookings','booking-a'),record);assert.deepEqual(db.row('kraken_booking_outbox','hash'),request());
  assert.doesNotMatch(JSON.stringify(result),/not-a-supported-language|synthetic@example/);
});

test('parent changed after scan causes no write from stale language or business data',async()=>{
  const db=new MemoryDatabase({kraken_bookings:{'booking-a':booking()},kraken_booking_outbox:{hash:request()}});
  db.beforeTransaction=()=>db.put('kraken_bookings','booking-a',{...booking(),language:'it',revision:2});
  const result=await migrateEmailLanguages({db,apply:true,operatorId:'operator',clock:()=>1});
  assert.equal(result.skips.RECORD_CHANGED,1);assert.deepEqual(result.applied,{records:0,notifications:0});
  assert.equal(db.row('kraken_bookings','booking-a').language,'it');assert.equal(db.row('kraken_booking_outbox','hash').notification,undefined);
});

test('worker claim or first envelope prepared after scan is re-read and never overwritten',async()=>{
  for(const changes of [{status:'sending',attempts:1},{prepared:{html:'original-first-attempt'},attempts:1},{status:'sent',providerId:'accepted'}]) {
    const db=new MemoryDatabase({kraken_bookings:{'booking-a':booking()},kraken_booking_outbox:{hash:request()}});
    db.beforeTransaction=()=>db.put('kraken_booking_outbox','hash',{...request(),...changes});
    const result=await migrateEmailLanguages({db,apply:true,operatorId:'operator',clock:()=>1});
    assert.equal(result.skips.JOB_CHANGED,1);assert.equal(result.applied.notifications,0);
    assert.deepEqual(db.row('kraken_booking_outbox','hash'),{...request(),...changes});
  }
});

test('recovery reminder migration retains revoked consent and does not activate or enqueue anything',async()=>{
  const record=draft();const original={...saved(),kind:'reminder1',id:`${record.id}:reminder1`};
  const db=new MemoryDatabase({kraken_recovery_drafts:{[record.id]:record},kraken_recovery_outbox:{sha:original}});
  const result=await migrateEmailLanguages({db,apply:true,operatorId:'operator',clock:()=>1});
  assert.equal(result.applied.notifications,1);const job=db.row('kraken_recovery_outbox','sha');
  assert.equal(job.notification.templateId,'quote_reminder_1');assert.equal(job.notification.renderData.consent.reminder_consented,false);
  assert.equal(db.row('kraken_recovery_drafts',record.id).reminderConsent,false);assert.equal(job.due_at,original.due_at);assert.equal(db.rows.get('kraken_recovery_outbox')!.size,1);
});

test('CLI default dry-run and help use injected database only; apply requires operator before connecting',async()=>{
  assert.equal(migrationArguments([],{}).apply,false);
  assert.throws(()=>migrationArguments(['--apply'],{}),/OPERATOR_REQUIRED/);
  assert.throws(()=>migrationArguments(['--apply','--dry-run'],{BOOKING_OPERATOR_ID:'operator'}),/INVALID_ARGUMENTS/);
  assert.throws(()=>migrationArguments(['--page-size=51'],{}),/INVALID_ARGUMENTS/);
  let connections=0,closed=0;const output:string[]=[];
  const connect=async()=>{connections++;return {db:new MemoryDatabase(),close:async()=>{closed++;}};};
  assert.equal(await runEmailLanguageMigrationCli({argv:['--help'],env:{},connect,write:text=>output.push(text)}),0);assert.equal(connections,0);
  assert.equal(await runEmailLanguageMigrationCli({argv:[],env:{},connect,write:text=>output.push(text)}),0);
  assert.equal(JSON.parse(output.at(-1)!).mode,'dry-run');assert.equal(connections,1);assert.equal(closed,1);
  await assert.rejects(runEmailLanguageMigrationCli({argv:['--apply'],env:{},connect,write:text=>output.push(text)}),/OPERATOR_REQUIRED/);
  assert.equal(connections,1);
});

test('bounded scans report truncation and missing apply identity prevents every database write',async()=>{
  const db=new MemoryDatabase({kraken_bookings:{'booking-a':booking(),'booking-b':booking('booking-b')}});
  const result=await migrateEmailLanguages({db,pageSize:1,maxPages:1});assert.equal(result.scanned.bookings,1);assert.equal(result.truncated,true);
  await assert.rejects(migrateEmailLanguages({db,apply:true}),/OPERATOR_REQUIRED/);assert.equal(db.transactions,0);
});
