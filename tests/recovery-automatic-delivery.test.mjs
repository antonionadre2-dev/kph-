import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { createD1RecoveryStore } from '../integrations/recovery/d1-store.mjs';
import { createRecoveryService } from '../integrations/recovery/service.mjs';
import { createRecoveryHandler } from '../integrations/recovery/http.mjs';
import { CONSENT_VERSION, HOUR_MS, DAY_MS } from '../integrations/recovery/policy.mjs';
import { calculatePrice, defaultSelection } from '../src/booking/pricing.ts';

function fixture(sendOverride,options={}) {
  const db=new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../integrations/recovery/schema.sql',import.meta.url),'utf8'));
  const prepare=(sql,values=[])=>{
    const statement=db.prepare(sql);
    return {bind(...args){return prepare(sql,args);},first(){return statement.get(...values)||null;},all(){return {results:statement.all(...values)};},run(){return {meta:{changes:Number(statement.run(...values).changes)}};}};
  };
  const store=createD1RecoveryStore({prepare,async batch(statements){db.exec('BEGIN IMMEDIATE');try{const rows=statements.map(s=>s.run());db.exec('COMMIT');return rows;}catch(error){db.exec('ROLLBACK');throw error;}}});
  let now=Date.parse('2026-11-24T08:00:00Z');
  const sent=[];
  const service=createRecoveryService({store,calculatePrice,publicBaseUrl:'https://kraken.example',sender:'Kraken <test@example.test>',tokenSecret:'synthetic-recovery-secret-over-thirty-two-characters',clock:()=>now,
    sendEmail:sendOverride|| (async message=>{sent.push(message);return {id:`synthetic-${sent.length}`};}),remindersEnabled:true,...options});
  const handler=createRecoveryHandler({service,publicBaseUrl:'https://kraken.example',authorizeCapture:async()=>({rateKey:'synthetic-verified-origin'})});
  const input=(key,reminderConsent=false)=>({email:'customer@example.test',selection:defaultSelection('regular'),language:'es',reminderConsent,consentVersion:CONSENT_VERSION,idempotencyKey:key});
  const request=body=>handler(new Request('https://kraken.example/api/recovery/drafts',{method:'POST',headers:{Origin:'https://kraken.example','Content-Type':'application/json'},body:JSON.stringify(body)}));
  return {db,store,service,sent,input,request,clock:()=>now,advance:ms=>{now+=ms;}};
}

test('saving over HTTP awaits only its own email and an idempotent retry cannot send twice',async()=>{
  const f=fixture();
  try {
    const other=await f.service.capture(f.input('unrelated-capture-key-001'),{rateKey:'synthetic-verified-origin'});
    const body=f.input('http-capture-stable-key-001');
    const first=await f.request(body),saved=await first.json();
    assert.equal(first.status,201);assert.equal(saved.mailStatus,'sent');assert.equal(f.sent.length,1);
    assert.equal(f.sent[0].tags.draftId,saved.id);
    assert.equal((await f.store.getJob(`${other.id}:saved`)).status,'queued');
    const again=await f.request(body),retry=await again.json();
    assert.equal(again.status,201);assert.equal(retry.id,saved.id);assert.equal(retry.mailStatus,'sent');assert.equal(f.sent.length,1);
  } finally {f.db.close();}
});

test('the HTTP response waits for provider acceptance rather than a detached promise',async()=>{
  let release,started;
  const providerStarted=new Promise(resolve=>{started=resolve;});
  const providerResult=new Promise(resolve=>{release=resolve;});
  const f=fixture(async()=>{started();await providerResult;return {id:'synthetic-provider-acceptance'};});
  try {
    let completed=false;
    const pending=f.request(f.input('awaited-capture-key-001')).then(response=>{completed=true;return response;});
    await providerStarted;assert.equal(completed,false);
    release();const response=await pending;assert.equal((await response.json()).mailStatus,'sent');
  } finally {release?.();f.db.close();}
});

test('an uncertain provider outcome is preserved without a duplicate send on capture retry',async()=>{
  let attempts=0;const f=fixture(async()=>{attempts++;throw new Error('synthetic unknown result');});
  try {
    const body=f.input('uncertain-capture-key-001');
    assert.equal((await (await f.request(body)).json()).mailStatus,'delivery_unknown');
    assert.equal((await (await f.request(body)).json()).mailStatus,'delivery_unknown');
    await f.service.runDue();assert.equal(attempts,1);
  } finally {f.db.close();}
});

test('suppression before targeted dispatch never sends and returns a valid failure state',async()=>{
  const f=fixture();
  try {
    const captured=await f.service.capture(f.input('suppressed-capture-key-001'),{rateKey:'synthetic-verified-origin'});
    const draft=await f.store.getDraft(captured.id);await f.store.suppress(draft.emailHash,'bounced',f.clock());
    assert.equal(await f.service.sendSaved(captured.id),'failed');assert.equal(f.sent.length,0);
  } finally {f.db.close();}
});

test('an overdue saved email and its first reminder are never delivered in the same run',async()=>{
  const f=fixture();
  try {
    const captured=await f.service.capture(f.input('delayed-capture-key-001',true),{rateKey:'synthetic-verified-origin'});
    f.advance(2*DAY_MS);assert.equal((await f.service.runDue()).sent,1);
    assert.deepEqual(f.sent.map(m=>m.tags.kind),['saved']);
    assert.equal((await f.store.getJob(`${captured.id}:reminder1`)).status,'queued');
    f.advance(HOUR_MS);assert.equal((await f.service.runDue()).sent,0);
  } finally {f.db.close();}
});

test('daily runs send at most one reminder per draft and preserve the second reminder separation',async()=>{
  const f=fixture();
  try {
    const response=await f.request(f.input('daily-capture-key-001',true)),captured=await response.json();
    assert.equal(captured.mailStatus,'sent');f.advance(2*DAY_MS);
    assert.equal((await f.service.runDue()).sent,1);
    const first=await f.store.getJob(`${captured.id}:reminder1`),second=await f.store.getJob(`${captured.id}:reminder2`);
    assert.equal(first.status,'sent');assert.equal(second.status,'queued');assert.ok(second.due_at>=first.sent_at+20*HOUR_MS);
    assert.equal((await f.service.runDue()).sent,0);
    f.advance(DAY_MS);assert.equal((await f.service.runDue()).sent,1);
    assert.ok((await f.store.getJob(`${captured.id}:reminder2`)).sent_at>=first.sent_at+20*HOUR_MS);
    assert.deepEqual(f.sent.map(m=>m.tags.kind),['saved','reminder1','reminder2']);
  } finally {f.db.close();}
});

test('batch and exhausted time budgets do not make unbounded provider requests',async()=>{
  const f=fixture();
  try {
    await f.service.capture(f.input('bounded-capture-key-001'),{rateKey:'synthetic-verified-origin'});
    await f.service.capture(f.input('bounded-capture-key-002'),{rateKey:'synthetic-verified-origin'});
    assert.equal((await f.service.runDue({deadlineAt:-1})).sent,0);assert.equal(f.sent.length,0);
    assert.equal((await f.service.runDue({limit:1})).sent,1);assert.equal(f.sent.length,1);
  } finally {f.db.close();}
});

test('a persisted capture still succeeds when provider acceptance cannot be recorded',async(t)=>{
  const diagnostics=[];t.mock.method(console,'warn',(...args)=>diagnostics.push(args));
  const f=fixture();const finish=f.store.markJob;
  f.store.markJob=async(id,expected,fields)=>{
    if(['sent','delivery_unknown'].includes(fields.status))throw new Error('PRIVATE_FINISH_CANARY customer@example.test');
    return finish(id,expected,fields);
  };
  try {
    const body=f.input('capture-finish-failure-001');
    const response=await f.request(body),saved=await response.json();
    assert.equal(response.status,201);assert.equal(saved.mailStatus,'queued');assert.ok(await f.store.getDraft(saved.id));
    assert.equal(f.sent.length,1);assert.equal((await f.store.getJob(`${saved.id}:saved`)).status,'sending');
    const retry=await f.request(body);assert.equal(retry.status,201);assert.notEqual((await retry.json()).mailStatus,'sent');assert.equal(f.sent.length,1);
    assert.deepEqual(diagnostics,[['[recovery:email-dispatch]',{phase:'saved'}]]);
    assert.doesNotMatch(JSON.stringify(diagnostics),/CANARY|@|stack|accessToken|draftId/);
  } finally {f.store.markJob=finish;f.db.close();}
});

test('a post-dispatch read failure keeps the saved capture successful and retry recovers its real sent state',async(t)=>{
  const diagnostics=[];t.mock.method(console,'warn',(...args)=>diagnostics.push(args));
  const f=fixture();const read=f.store.getJob;let failRead=true;
  f.store.getJob=async(id)=>{const job=await read(id);if(failRead&&job?.status==='sent')throw new Error('PRIVATE_READ_CANARY');return job;};
  try {
    const body=f.input('capture-read-failure-001');
    const response=await f.request(body),saved=await response.json();
    assert.equal(response.status,201);assert.equal(saved.mailStatus,'queued');assert.ok(await f.store.getDraft(saved.id));assert.equal(f.sent.length,1);
    failRead=false;const retry=await f.request(body),restored=await retry.json();
    assert.equal(retry.status,201);assert.equal(restored.id,saved.id);assert.equal(restored.mailStatus,'sent');assert.equal(f.sent.length,1);
    assert.deepEqual(diagnostics,[['[recovery:email-dispatch]',{phase:'saved'}]]);
  } finally {f.store.getJob=read;f.db.close();}
});

test('capture errors before persistence still fail rather than manufacturing a saved quote',async(t)=>{
  const diagnostics=[];t.mock.method(console,'warn',(...args)=>diagnostics.push(args));
  const f=fixture();
  f.service.capture=async()=>{throw new Error('PRIVATE_CREATE_CANARY');};
  try {
    const response=await f.request(f.input('capture-create-failure-001'));
    assert.equal(response.status,503);assert.deepEqual(await response.json(),{code:'RECOVERY_UNAVAILABLE'});
    assert.equal(f.db.prepare('SELECT COUNT(*) AS count FROM recovery_drafts').get().count,0);
    assert.equal(f.sent.length,0);assert.deepEqual(diagnostics,[]);
  } finally {f.db.close();}
});

test('reminders are off by default while the explicitly requested saved email still works',async()=>{
  const f=fixture(undefined,{remindersEnabled:undefined});
  try {
    const body=f.input('default-off-capture-key-001',true);
    const response=await f.request(body),saved=await response.json();
    assert.equal(response.status,201);assert.equal(saved.mailStatus,'sent');assert.equal(saved.remindersEnabled,false);
    assert.equal(f.service.config.enabled,true);assert.equal(f.service.config.emailReady,true);assert.equal(f.service.config.remindersEnabled,false);
    const draft=await f.store.getDraft(saved.id);
    assert.equal(draft.reminderConsent,false);assert.equal(draft.consentVersion,null);assert.equal(draft.consentedAt,null);
    assert.equal(await f.store.getJob(`${saved.id}:reminder1`),null);assert.equal(await f.store.getJob(`${saved.id}:reminder2`),null);
    f.advance(2*DAY_MS);assert.equal((await f.service.runDue()).sent,0);assert.equal(f.sent.length,1);
  } finally {f.db.close();}
});

test('turning the reminder gate off blocks existing queued reminders and reports effective consent',async()=>{
  const f=fixture();
  try {
    const body=f.input('old-reminder-capture-key-001',true);
    const captured=await (await f.request(body)).json();assert.equal(captured.remindersEnabled,true);
    const disabled=createRecoveryService({store:f.store,calculatePrice,publicBaseUrl:'https://kraken.example',sender:'Kraken <test@example.test>',tokenSecret:'synthetic-recovery-secret-over-thirty-two-characters',clock:f.clock,
      sendEmail:async message=>{f.sent.push(message);return {id:'must-not-send'};}});
    assert.equal((await disabled.capture(body,{rateKey:'synthetic-verified-origin'})).remindersEnabled,false);
    assert.equal((await disabled.read(captured.id,captured.accessToken)).reminderConsent,false);
    f.advance(2*DAY_MS);const report=await disabled.runDue();
    assert.equal(report.sent,0);assert.equal(report.cancelled,2);assert.equal(f.sent.length,1);
    assert.equal((await f.store.getJob(`${captured.id}:reminder1`)).status,'cancelled');
    assert.equal((await f.store.getJob(`${captured.id}:reminder2`)).status,'cancelled');
  } finally {f.db.close();}
});
