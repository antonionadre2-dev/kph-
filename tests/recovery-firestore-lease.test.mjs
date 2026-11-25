import test from 'node:test';
import assert from 'node:assert/strict';
import { createFirestoreRecoveryStore } from '../integrations/recovery/firestore-store.mjs';

function fixture(current) {
  const updates=[];
  // The query observed an expired sending lease; the transaction sees the newer row.
  const snapshot={ref:{id:'synthetic-job'},exists:true,data:()=>({status:'sending',lease_until:100})};
  const query={where(){return this;},limit(){return this;},async get(){return {docs:[snapshot]};}};
  const db={collection:()=>query,async runTransaction(action){return action({get:async()=>({exists:true,data:()=>({...current})}),update(_ref,fields){updates.push(fields);}});}};
  return {store:createFirestoreRecoveryStore(db),updates};
}

test('a stale query cannot overwrite an email that finished before the transaction',async()=>{
  const f=fixture({status:'sent',lease_until:null,provider_id:'synthetic-accepted-id'});
  await f.store.markStaleSending(200);assert.deepEqual(f.updates,[]);
});

test('a stale query cannot overwrite a lease renewed before the transaction',async()=>{
  const f=fixture({status:'sending',lease_until:300});
  await f.store.markStaleSending(200);assert.deepEqual(f.updates,[]);
});

test('an actually expired sending lease retains the uncertain delivery state',async()=>{
  const f=fixture({status:'sending',lease_until:100});
  await f.store.markStaleSending(200);
  assert.deepEqual(f.updates,[{status:'delivery_unknown',last_error_code:'DISPATCH_INTERRUPTED'}]);
});
