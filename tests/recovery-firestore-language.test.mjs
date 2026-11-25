import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createFirestoreRecoveryStore } from '../integrations/recovery/firestore-store.mjs';

const clone=value=>value===undefined?undefined:structuredClone(value);
const hash=value=>createHash('sha256').update(value).digest('hex');
const snapshot=language=>({language,source:'selected',version:1});

function fixture() {
  const rows=new Map();
  const ref=(collection,id)=>({collection,id,key:`${collection}/${id}`,async get(){const value=clone(rows.get(`${collection}/${id}`));return {exists:value!==undefined,data:()=>value};}});
  const db={collection:collection=>({doc:id=>ref(collection,id)}),async runTransaction(action){
    const writes=[];let writing=false;
    const result=await action({async get(target){assert.equal(writing,false,'Firestore reads must precede writes');const value=clone(rows.get(target.key));return {exists:value!==undefined,data:()=>value};},
      create(target,value){writing=true;assert.equal(rows.has(target.key),false);writes.push({target,value:clone(value)});},
      set(target,value){writing=true;writes.push({target,value:clone(value)});},
      update(target,fields){writing=true;writes.push({target,value:{...clone(rows.get(target.key)),...clone(fields)}});}});
    for(const {target,value}of writes)rows.set(target.key,value);return result;
  }};
  return {store:createFirestoreRecoveryStore(db),put(collection,id,value){rows.set(`${collection}/${id}`,clone(value));},get(collection,id){return clone(rows.get(`${collection}/${id}`));}};
}

test('Firestore creates the draft and its language-bearing notification in one durable transaction',async()=>{
  const f=fixture(),draft={id:'synthetic-draft',idempotencyKey:'synthetic-key',language:'es',languageSnapshot:snapshot('es'),version:1,expiresAt:9000};
  const notification={id:'n-synthetic',languageSnapshot:snapshot('es')};
  await f.store.createDraft(draft,[{id:'synthetic-draft:saved',kind:'saved',dueAt:1000,notification}]);
  assert.deepEqual((await f.store.getDraft(draft.id)).languageSnapshot,snapshot('es'));
  assert.deepEqual((await f.store.getJob('synthetic-draft:saved')).notification,notification);
});

test('Firestore preference CAS updates only unattempted, unprepared queued notifications',async()=>{
  const f=fixture(),id='synthetic-draft',draft={id,language:'de',languageSnapshot:snapshot('de'),version:1};
  f.put('kraken_recovery_drafts',id,draft);
  const old={languageSnapshot:snapshot('de')},next={languageSnapshot:snapshot('es')};
  const jobs=[{kind:'saved',status:'sent',attempts:1},{kind:'reminder1',status:'queued',attempts:1,prepared:{language:'de',html:'original'}},{kind:'reminder2',status:'queued',attempts:0}];
  for(const job of jobs)f.put('kraken_recovery_outbox',hash(`${id}:${job.kind}`),{...job,id:`${id}:${job.kind}`,notification:old});
  assert.equal(await f.store.updateDraftAndPending({...draft,language:'es',languageSnapshot:snapshot('es')},1,jobs.map(job=>({id:`${id}:${job.kind}`,notification:next}))),true);
  assert.equal((await f.store.getDraft(id)).version,2);
  assert.deepEqual((await f.store.getJob(`${id}:saved`)).notification,old);
  assert.deepEqual((await f.store.getJob(`${id}:reminder1`)).notification,old);
  assert.deepEqual((await f.store.getJob(`${id}:reminder2`)).notification,next);
  assert.equal(await f.store.updateDraftAndPending({...draft,language:'fr'},1,[{id:`${id}:reminder2`,notification:{languageSnapshot:snapshot('fr')}}]),false);
  assert.deepEqual((await f.store.getJob(`${id}:reminder2`)).notification,next);
});

test('Firestore preparation CAS preserves its original envelope and refuses a resolved or unclaimed job',async()=>{
  const f=fixture(),id='synthetic:saved',key=hash(id),envelope={language:'es',html:'original',idempotencyKey:'synthetic-stable'};
  f.put('kraken_recovery_outbox',key,{id,status:'sending',attempts:1,notification:{languageSnapshot:snapshot('es')}});
  const first=await f.store.prepareJob(id,envelope,{preparedAt:1000,expiresAt:9000});assert.deepEqual(first.prepared,envelope);
  const repeated=await f.store.prepareJob(id,{...envelope,html:'must not replace'},{preparedAt:2000,expiresAt:9999});assert.deepEqual(repeated,first);
  f.put('kraken_recovery_outbox',key,{...first,status:'sent'});assert.equal(await f.store.prepareJob(id,envelope,{preparedAt:3000,expiresAt:9999}),null);
  f.put('kraken_recovery_outbox',key,{...first,status:'queued'});assert.equal(await f.store.prepareJob(id,envelope,{preparedAt:3000,expiresAt:9999}),null);
});
