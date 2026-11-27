import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRecoveryService } from '../integrations/recovery/service.mjs';
import { createD1RecoveryStore } from '../integrations/recovery/d1-store.mjs';
import { prepareServerEmail } from '../integrations/email-collection/server-email.mjs';
import { labels } from '../integrations/email-collection/labels.mjs';
import { CONSENT_VERSION, HOUR_MS } from '../integrations/recovery/policy.mjs';
import { calculatePrice, defaultSelection } from '../src/booking/pricing.ts';

const languages=['de','en','es','fr','it','pt'];
const catalogs=Object.fromEntries(languages.map(language=>[language,JSON.parse(readFileSync(new URL(`../integrations/email-collection/content/catalog.${language}.json`,import.meta.url),'utf8'))]));
const kinds={saved:'quote_saved',reminder1:'quote_reminder_1',reminder2:'quote_reminder_2'};
const origin='https://kraken.example';

function fixture(t,options={}) {
  const sqlite=new DatabaseSync(':memory:');t.after(()=>sqlite.close());
  sqlite.exec(readFileSync(new URL('../integrations/recovery/schema.sql',import.meta.url),'utf8'));
  function prepare(sql,values=[]) {
    const query=sqlite.prepare(sql);
    return {bind(...args){return prepare(sql,args);},first(){return query.get(...values)||null;},all(){return {results:query.all(...values)};},run(){const result=query.run(...values);return {meta:{changes:Number(result.changes)}};}};
  }
  const db={prepare,async batch(statements){sqlite.exec('BEGIN IMMEDIATE');try{const result=statements.map(statement=>statement.run());sqlite.exec('COMMIT');return result;}catch(error){sqlite.exec('ROLLBACK');throw error;}}};
  const store=createD1RecoveryStore(db),sent=[];
  let now=Date.parse('2026-11-25T08:00:00Z'),count=0,prepareCalls=0;
  const snapshot=(draft,kind)=>{
    const templateId=kinds[kind],eventId=`${draft.id}:${kind}`,recipientIdentity=`draft:${draft.id}`;
    return {id:'n'+createHash('sha256').update(eventId).digest('hex'),eventId,eventType:catalogs.de[templateId].event,entityId:draft.id,recipientIdentity,recipientEmail:draft.email,templateId,templateRevision:'1.2.0',languageSnapshot:structuredClone(draft.languageSnapshot),renderData:{customer:{id:recipientIdentity,firstName:'Synthetic',email:draft.email},reference:`Q-${draft.id.slice(0,8)}`,service:'regular',frequency:Object.fromEntries(languages.map(language=>[language,labels[language].weekly])),pricing:{currency:'CHF',totalRappen:draft.quote.totalCents,paidRappen:0,vatRappen:0},consent:{reminder_consented:draft.reminderConsent}}};
  };
  const collection={enabled:options.enabled!==false,snapshot,async prepare(notification,links){prepareCalls++;if(options.beforePrepare)await options.beforePrepare(notification);return prepareServerEmail({templateId:notification.templateId,notificationSnapshot:notification,links},{catalogs,brand:{name:'Kraken PFM',email:'kai@kraken.example',privacyUrl:`${origin}/gdpr?lang=${notification.languageSnapshot.language}`},assetBaseUrl:`${origin}/kraken-emails/assets`});}};
  const service=createRecoveryService({store,sendEmail:async message=>{sent.push(structuredClone(message));return options.send?options.send(message,sent.length):{id:`synthetic-accepted-${sent.length}`};},calculatePrice,resolveBookingForRecovery:options.resolveBookingForRecovery,publicBaseUrl:origin,sender:'Kraken <kai@kraken.example>',tokenSecret:'synthetic-recovery-secret-at-least-thirty-two-bytes',clock:()=>now,remindersEnabled:true,emailCollection:collection});
  const capture=(overrides={})=>service.capture({email:'synthetic@example.test',selection:defaultSelection('regular'),language:'es',reminderConsent:false,consentVersion:CONSENT_VERSION,idempotencyKey:`synthetic-capture-${++count}-0000`,...overrides},{rateKey:'synthetic-server-verified'});
  return {sqlite,store,service,sent,capture,advance:ms=>now+=ms,clock:()=>now,prepares:()=>prepareCalls};
}

test('six saved languages survive persistence, use real collection artwork and remain independent of a later browser',async t=>{
  for(const language of languages) {
    const f=fixture(t),saved=await f.capture({language});
    const draft=await f.store.getDraft(saved.id),job=await f.store.getJob(`${saved.id}:saved`);
    assert.deepEqual(draft.languageSnapshot,{language,source:'selected',version:1});
    assert.deepEqual(job.notification.languageSnapshot,draft.languageSnapshot);
    await f.service.sendSaved(saved.id);
    assert.equal(f.sent.length,1);assert.equal(f.sent[0].headers['Content-Language'],language);
    assert.equal(f.sent[0].to,'synthetic@example.test');assert.equal(f.sent[0].subject,catalogs[language].quote_saved.subject.replace('{{firstName}}','Synthetic'));
    assert.match(f.sent[0].html,new RegExp(`<html lang="${language}">`));
    assert.match(f.sent[0].html,/https:\/\/kraken\.example\/kraken-emails\/assets\/email-quote_saved\.png/);
    assert.ok(f.sent[0].text.includes(`lang=${language}#resume=`));
    assert.doesNotMatch(f.sent[0].html,/#preview-|data:image/);
    const persisted=await f.store.getJob(`${saved.id}:saved`);assert.deepEqual(persisted.prepared,f.sent[0]);
    assert.equal(persisted.preparedAt,f.clock());assert.equal(persisted.preparedExpiresAt,draft.expiresAt);
    assert.equal((await f.service.read(saved.id,saved.accessToken)).language,language);
  }
});

test('new recovery captures require a supported language and canonicalise supported regional tags',async t=>{
  const f=fixture(t);
  for(const language of [undefined,null,'','zz','de_CH',42,{},[]])await assert.rejects(f.capture({language}),{code:'INVALID_LANGUAGE'});
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS total FROM recovery_drafts').get().total,0);
  for(const [tag,language]of [['de-CH','de'],['en-GB','en'],['pt-BR','pt']]) {
    const saved=await f.capture({language:tag});assert.equal((await f.service.read(saved.id,saved.accessToken)).language,language);
  }
});

test('an explicit preference changes only unattempted notifications; a 429 retry reuses its exact persisted envelope',async t=>{
  const f=fixture(t,{send(_message,attempt){if(attempt===1){const error=new Error('synthetic documented rejection');Object.assign(error,{definitelyNotSent:true,retryable:true,retryAfterMs:60000});throw error;}return {id:`synthetic-accepted-${attempt}`};}});
  const saved=await f.capture({language:'de',reminderConsent:true});await f.service.sendSaved(saved.id);
  const first=await f.store.getJob(`${saved.id}:saved`);assert.equal(first.status,'queued');assert.equal(first.attempts,1);
  f.advance(1000);await f.service.activity(saved.id,saved.accessToken,{language:'es',selection:{...defaultSelection('regular'),hours:4}});
  const changed=await f.store.getDraft(saved.id),attempted=await f.store.getJob(`${saved.id}:saved`),future=await f.store.getJob(`${saved.id}:reminder1`);
  assert.equal(changed.languageSnapshot.language,'es');assert.deepEqual(attempted.prepared,first.prepared);assert.equal(attempted.notification.languageSnapshot.language,'de');
  assert.equal(future.notification.languageSnapshot.language,'es');assert.equal(future.notification.renderData.pricing.totalRappen,16000);
  f.advance(16*60_000);await f.service.sendSaved(saved.id);
  assert.equal(f.sent.length,2);assert.deepEqual(f.sent[0],f.sent[1]);assert.equal(f.prepares(),1);
  assert.equal((await f.store.getJob(`${saved.id}:saved`)).status,'sent');
  await f.service.sendSaved(saved.id);assert.equal(f.sent.length,2);
});

test('the prepared envelope is durable before provider use and an interrupted prepare never sends',async t=>{
  const f=fixture(t),saved=await f.capture();
  f.store.prepareJob=async()=>{throw new Error('synthetic durable storage failure');};
  await f.service.sendSaved(saved.id);
  assert.equal(f.sent.length,0);assert.equal((await f.store.getJob(`${saved.id}:saved`)).last_error_code,'EMAIL_PREPARATION_REQUIRED');
});

test('a consent withdrawal during preparation prevents a voluntary reminder provider call',async t=>{
  let active;
  const f=fixture(t,{async beforePrepare(notification){if(notification.templateId==='quote_reminder_1')await f.service.withdrawConsent(active.id,active.accessToken);}});
  active=await f.capture({reminderConsent:true});await f.service.sendSaved(active.id);f.advance(4*HOUR_MS);
  await f.service.runDue();assert.equal(f.sent.length,1);assert.equal((await f.store.getJob(`${active.id}:reminder1`)).status,'cancelled');
});

test('payment or cancellation during reminder preparation stops the pending provider call',async t=>{
  for(const terminal of ['paid','test_paid','cancelled']) {
    let state='confirmed';
    const f=fixture(t,{resolveBookingForRecovery:async(id,email)=>({bookingId:id,email,publicToken:'synthetic-access-token-over-twenty-chars',mode:'live',status:state==='cancelled'?'cancelled':'confirmed',paymentStatus:state==='cancelled'?'not_started':state,canCheckout:state==='confirmed',holdExpiresAt:'2026-12-01T10:00:00Z'}),beforePrepare(notification){if(notification.templateId==='quote_reminder_1')state=terminal;}});
    const saved=await f.capture({reminderConsent:true});await f.service.sendSaved(saved.id);
    await f.service.linkBooking({id:saved.id,accessToken:saved.accessToken,email:'synthetic@example.test',bookingId:'synthetic-booking-id-000000'});
    await f.service.read(saved.id,saved.accessToken);f.advance(4*HOUR_MS);
    await f.service.runDue();
    assert.equal(f.sent.length,1,terminal);
    assert.equal((await f.store.getJob(`${saved.id}:reminder1`)).status,'cancelled',terminal);
    assert.equal((await f.store.getDraft(saved.id)).status,terminal==='cancelled'?'cancelled':'paid');
  }
});

test('a lost booking-status read or fresh activity during preparation defers the reminder',async t=>{
  for(const change of ['unavailable','activity']) {
    let unavailable=false,active;
    const f=fixture(t,{resolveBookingForRecovery:async(id,email)=>{if(unavailable)throw new Error('synthetic unavailable');return {bookingId:id,email,publicToken:'synthetic-access-token-over-twenty-chars',mode:'live',status:'confirmed',paymentStatus:'not_started',canCheckout:true,holdExpiresAt:'2026-12-01T10:00:00Z'};},async beforePrepare(notification){if(notification.templateId==='quote_reminder_1'){if(change==='unavailable')unavailable=true;else await f.service.activity(active.id,active.accessToken,{});}}});
    active=await f.capture({reminderConsent:true});await f.service.sendSaved(active.id);
    await f.service.linkBooking({id:active.id,accessToken:active.accessToken,email:'synthetic@example.test',bookingId:'synthetic-booking-id-000000'});
    await f.service.read(active.id,active.accessToken);f.advance(4*HOUR_MS);
    const result=await f.service.runDue();
    assert.equal(f.sent.length,1,change);assert.equal(result.deferred,1,change);
    assert.equal((await f.store.getJob(`${active.id}:reminder1`)).status,'queued',change);
  }
});

test('legacy language migration is explicit, preserves an old valid choice and never silently repairs corrupt values',async t=>{
  for(const [legacy,language,source]of [['es','es','booking'],[undefined,'de','legacy-default']]) {
    const f=fixture(t),saved=await f.capture(),draft=await f.store.getDraft(saved.id);delete draft.languageSnapshot;delete draft.language;
    if(legacy!==undefined)draft.language=legacy;
    f.sqlite.prepare('UPDATE recovery_drafts SET data_json=? WHERE id=?').run(JSON.stringify(draft),saved.id);
    f.sqlite.prepare('UPDATE recovery_outbox SET notification_json=NULL WHERE draft_id=?').run(saved.id);
    const migrated=await f.service.migrateLegacyLanguage(saved.id);
    assert.deepEqual(migrated.languageSnapshot,{language,source,version:1});assert.equal((await f.store.getJob(`${saved.id}:saved`)).notification.languageSnapshot.language,language);
    await f.service.sendSaved(saved.id);assert.equal(f.sent[0].headers['Content-Language'],language);
  }
  const f=fixture(t),saved=await f.capture(),draft=await f.store.getDraft(saved.id);delete draft.languageSnapshot;draft.language='corrupt';
  f.sqlite.prepare('UPDATE recovery_drafts SET data_json=? WHERE id=?').run(JSON.stringify(draft),saved.id);
  await assert.rejects(f.service.migrateLegacyLanguage(saved.id));assert.equal(f.sent.length,0);
});

test('inactive collection preserves the existing transport while still recording snapshots',async t=>{
  const f=fixture(t,{enabled:false}),saved=await f.capture();await f.service.sendSaved(saved.id);
  assert.equal(f.sent.length,1);assert.equal(f.prepares(),0);assert.ok((await f.store.getJob(`${saved.id}:saved`)).notification.languageSnapshot);
  assert.equal((await f.store.getJob(`${saved.id}:saved`)).prepared,undefined);
});

test('the explicit D1 migration preserves existing recovery rows while adding nullable envelope columns',t=>{
  const sqlite=new DatabaseSync(':memory:');t.after(()=>sqlite.close());
  const current=readFileSync(new URL('../integrations/recovery/schema.sql',import.meta.url),'utf8');
  const previous=current.split('\n').filter(line=>!/^\s*(notification_json|prepared_json|prepared_at|prepared_expires_at)\b/.test(line)).join('\n');
  sqlite.exec(previous);
  sqlite.prepare('INSERT INTO recovery_drafts(id,idempotency_key,fingerprint,email_hash,created_at,expires_at,status,last_activity_at,reminder_consent,data_json) VALUES(?,?,?,?,?,?,?,?,?,?)').run('legacy','legacy-idempotency','fingerprint','keyed-email',1,9000,'active',1,0,JSON.stringify({language:'es'}));
  sqlite.prepare("INSERT INTO recovery_outbox(id,draft_id,kind,due_at,status) VALUES(?,?,'saved',?,'queued')").run('legacy:saved','legacy',1);
  sqlite.exec(readFileSync(new URL('../integrations/recovery/migrations/2026-11-25-email-collection.sql',import.meta.url),'utf8'));
  const row=sqlite.prepare('SELECT * FROM recovery_outbox WHERE id=?').get('legacy:saved');assert.equal(row.status,'queued');assert.equal(row.notification_json,null);assert.equal(row.prepared_json,null);
  assert.equal(JSON.parse(sqlite.prepare('SELECT data_json FROM recovery_drafts WHERE id=?').get('legacy').data_json).language,'es');
});
