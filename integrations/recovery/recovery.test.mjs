import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { createD1RecoveryStore } from './d1-store.mjs';
import { createRecoveryService } from './service.mjs';
import { createRecoveryHandler } from './http.mjs';
import { EMAIL_COPY, MOVING_GUIDE_EMAIL_COPY, renderRecoveryEmail } from './emails.mjs';
import { CONSENT_VERSION, DAY_MS, HOUR_MS, DRAFT_TTL_MS, isServiceWindow, nextServiceWindow } from './policy.mjs';

function fixture(options={}) {
  const sqlite=new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('./schema.sql',import.meta.url),'utf8'));
  function prepare(sql,values=[]) {
    const statement=sqlite.prepare(sql);
    return {bind(...args){return prepare(sql,args);},first(){return statement.get(...values)||null;},all(){return {results:statement.all(...values)};},run(){const result=statement.run(...values);return {meta:{changes:Number(result.changes)}};}};
  }
  const db={prepare,async batch(statements){sqlite.exec('BEGIN IMMEDIATE');try{const results=[];for(const statement of statements)results.push(statement.run());sqlite.exec('COMMIT');return results;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
  const store=createD1RecoveryStore(db);
  let now=Date.parse('2026-11-24T08:00:00Z');
  const sent=[];
  const price=selection=>{if(selection.service!=='regular'||!Number.isFinite(selection.hours)||selection.hours<2.5)throw new Error('Bad selection');return {service:'regular',pricingVersion:'test-authoritative',currency:'CHF',taxStatus:'not_registered',vatCents:0,subtotalCents:Math.round(selection.hours*4000),totalCents:Math.round(selection.hours*4000),lines:[{id:'labour',label:'Labour',quantity:selection.hours,unit:'hour',unitPriceCents:4000,totalCents:Math.round(selection.hours*4000)}],manualReviewReasons:[],notices:[],maxAffordablePersonHours:99};};
  const service=createRecoveryService({store,calculatePrice:price,publicBaseUrl:'https://kraken.example',sender:'Kraken <kai@kraken.example>',tokenSecret:'test-only-secret-that-is-at-least-thirty-two-bytes',clock:()=>now,sendEmail:async message=>{sent.push(message);return {id:`provider-${sent.length}`};},remindersEnabled:true,...options});
  let count=0;
  const capture=(overrides={})=>service.capture({email:'lead@example.com',selection:{service:'regular',hours:2.5,frequency:'weekly',materials:false,oven:false,fridge:false,ironingHours:0},language:'de',reminderConsent:false,consentVersion:CONSENT_VERSION,idempotencyKey:`request-idempotency-${String(++count).padStart(4,'0')}`,...overrides},{rateKey:'verified-ip-test'});
  return {db:sqlite,store,service,sent,capture,clock:()=>now,advance:ms=>now+=ms,setNow:value=>now=typeof value==='number'?value:Date.parse(value)};
}

test('a draft cannot be relinked to a distinct booking after an authenticated request',async()=>{
  const f=fixture();const saved=await f.capture();
  await f.service.linkBooking({id:saved.id,accessToken:saved.accessToken,email:'lead@example.com',bookingId:'booking_one'});
  await assert.rejects(f.service.linkBooking({id:saved.id,accessToken:saved.accessToken,email:'lead@example.com',bookingId:'booking_two'}),/BOOKING_ALREADY_LINKED/);
  assert.equal((await f.store.getDraft(saved.id)).bookingId,'booking_one');
});

test('explicit requested email is separate from optional consent; only server prices survive',async()=>{
  const f=fixture();const captured=await f.capture({acceptedTotalCents:1,selection:{service:'regular',hours:3,frequency:'weekly',totalCents:1,address:'must not persist'}});
  assert.equal(captured.mailStatus,'queued');assert.equal(captured.remindersEnabled,false);
  const draft=await f.service.read(captured.id,captured.accessToken);
  assert.equal(draft.quote.totalCents,12_000);assert.equal(draft.quote.vatComparisonCents,972);
  assert.equal(draft.selection.address,undefined);assert.equal(draft.selection.totalCents,undefined);assert.equal(draft.quote.maxAffordablePersonHours,undefined);
  await f.service.runDue();assert.equal(f.sent.length,1);
  f.advance(5*DAY_MS);await f.service.runDue();assert.equal(f.sent.length,1);
});

test('consent is explicit, versioned and capped at two reminders',async()=>{
  const f=fixture();await assert.rejects(f.capture({reminderConsent:undefined}),/CONSENT_REQUIRED/);
  await assert.rejects(f.capture({reminderConsent:true,consentVersion:'old'}),/CONSENT_VERSION_CHANGED/);
  const capture=await f.capture({reminderConsent:true});await f.service.runDue();
  f.advance(4*HOUR_MS);await f.service.runDue();assert.equal(f.sent.length,2);
  f.advance(20*HOUR_MS);await f.service.runDue();assert.equal(f.sent.length,3);
  f.advance(3*DAY_MS);await f.service.runDue();assert.equal(f.sent.length,3);
  const record=await f.store.getDraft(capture.id);assert.equal(record.consentVersion,CONSENT_VERSION);assert.ok(record.consentedAt);assert.equal(record.consentSource,'quote-save-explicit');
});

test('quiet hours respect Zürich summer/winter time and both DST transitions',()=>{
  for(const [start,expected] of [
    ['2026-03-29T00:30:00Z','2026-03-29T07:00:00.000Z'],
    ['2026-10-25T00:30:00Z','2026-10-25T08:00:00.000Z'],
    ['2026-07-01T17:00:00Z','2026-07-02T07:00:00.000Z'],
    ['2026-11-24T18:00:00Z','2026-11-25T08:00:00.000Z']
  ]) assert.equal(new Date(nextServiceWindow(Date.parse(start))).toISOString(),expected);
  assert.equal(isServiceWindow(Date.parse('2026-11-24T17:59:59Z')),true);
  assert.equal(isServiceWindow(Date.parse('2026-11-24T18:00:00Z')),false);
});

test('new activity updates selection, reprices and postpones unsent reminders',async()=>{
  const f=fixture();const draft=await f.capture({reminderConsent:true});await f.service.runDue();f.advance(3*HOUR_MS);
  await f.service.activity(draft.id,draft.accessToken,{selection:{service:'regular',frequency:'weekly',hours:4,totalCents:1}});
  f.advance(HOUR_MS);await f.service.runDue();assert.equal(f.sent.length,1);
  f.advance(3*HOUR_MS);await f.service.runDue();assert.equal(f.sent.length,2);assert.match(f.sent.at(-1).text,/160/);
  await assert.rejects(f.service.activity(draft.id,'a'.repeat(43)),/DRAFT_NOT_FOUND/);
});

test('explicit language preference persists and controls future reminders without sending immediately',async()=>{
  const f=fixture();const saved=await f.capture({reminderConsent:true,language:'de'});await f.service.runDue();
  assert.equal(f.sent[0].subject,EMAIL_COPY.de.savedSubject);
  const before=await f.store.getDraft(saved.id);f.advance(HOUR_MS);
  await f.service.activity(saved.id,saved.accessToken,{language:'es'});
  const changed=await f.service.read(saved.id,saved.accessToken);
  assert.equal(changed.language,'es');assert.equal(changed.reminderConsent,true);assert.equal(f.sent.length,1);
  const stored=await f.store.getDraft(saved.id);assert.equal(stored.consentedAt,before.consentedAt);assert.equal(stored.consentVersion,before.consentVersion);
  f.advance(4*HOUR_MS);await f.service.runDue();assert.equal(f.sent.length,2);
  assert.equal(f.sent[1].subject,EMAIL_COPY.es.firstSubject);assert.match(f.sent[1].html,/<html lang="es">/);assert.match(f.sent[1].text,/lang=es#resume=/);
});

test('invalid language updates are atomic and language changes never opt a customer into reminders',async()=>{
  const f=fixture();const saved=await f.capture({language:'fr',reminderConsent:false});await f.service.runDue();
  const before=await f.store.getDraft(saved.id);f.advance(HOUR_MS);
  for(const language of ['zz','de_CH','',null,42,{},[]]) {
    await assert.rejects(f.service.activity(saved.id,saved.accessToken,{language,selection:{service:'regular',frequency:'weekly',hours:4}}),/INVALID_LANGUAGE/);
    assert.deepEqual(await f.store.getDraft(saved.id),before);
  }
  await f.service.activity(saved.id,saved.accessToken,{language:'it'});
  const changed=await f.service.read(saved.id,saved.accessToken);assert.equal(changed.language,'it');assert.equal(changed.reminderConsent,false);assert.equal(f.sent.length,1);
  f.advance(2*DAY_MS);await f.service.runDue();assert.equal(f.sent.length,1);
});

test('idempotent capture and competing dispatchers do not duplicate mail',async()=>{
  const f=fixture();const input={idempotencyKey:'same-request-idempotency',reminderConsent:true};
  const a=await f.capture(input);const b=await f.capture(input);assert.deepEqual(a,b);
  await Promise.all([f.service.runDue(),f.service.runDue()]);assert.equal(f.sent.length,1);
  await assert.rejects(f.capture({...input,email:'different@example.com'}),/IDEMPOTENCY_CONFLICT/);
});

test('payment, cancellation, consent withdrawal and provider suppression stop reminders',async()=>{
  for(const action of ['paid','cancelled','withdraw','bounce','complaint']) {
    const f=fixture();const draft=await f.capture({reminderConsent:true});await f.service.runDue();
    if(action==='withdraw')await f.service.withdrawConsent(draft.id,draft.accessToken);
    else if(action==='bounce'||action==='complaint')await f.service.suppressEmail('lead@example.com',action==='bounce'?'bounced':'complaint');
    else await f.service.stopDraft(draft.id,action);
    f.advance(DAY_MS);await f.service.runDue();assert.equal(f.sent.length,1,action);
  }
});

test('valid unsubscribe link works without login and no reminders survive repeat capture',async()=>{
  const f=fixture();await f.capture({reminderConsent:true});await f.service.runDue();
  const link=f.sent[0].text.match(/https:\/\/kraken\.example\/recovery\/unsubscribe[^\s]+/)[0];const url=new URL(link);const token=new URLSearchParams(url.hash.slice(1)).get('token');
  assert.deepEqual(await f.service.unsubscribe(url.searchParams.get('draft'),token),{unsubscribed:true});
  assert.equal((await f.capture({reminderConsent:true})).remindersEnabled,false);
  await f.service.runDue();f.advance(DAY_MS);await f.service.runDue();assert.equal(f.sent.length,2);
});

test('unknown provider delivery is not automatically retried',async()=>{
  let attempts=0;const f=fixture({sendEmail:async()=>{attempts++;throw new Error('connection failed after provider might have accepted');}});
  const draft=await f.capture();assert.equal((await f.service.runDue()).unknown,1);
  f.advance(HOUR_MS);await f.service.runDue();assert.equal(attempts,1);
  assert.equal((await f.store.getJob(`${draft.id}:saved`)).status,'delivery_unknown');
});

test('draft data and outbox are deleted after seven days',async()=>{
  const f=fixture();const draft=await f.capture({reminderConsent:true});f.advance(DRAFT_TTL_MS+1);await f.service.runDue();
  assert.equal(await f.store.getDraft(draft.id),null);assert.equal(await f.store.getJob(`${draft.id}:saved`),null);
  await assert.rejects(f.service.read(draft.id,draft.accessToken),/DRAFT_NOT_FOUND/);
});

test('public proof contains only confirmed paid live bookings; stale refund replays cannot republish',async()=>{
  const f=fixture();const base={bookingId:'booking-123',revision:1,status:'confirmed',mode:'live',paymentStatus:'paid',service:'windows',region:'Zürich',occurredAt:f.clock(),email:'never-public@example.com',name:'Never public',address:'Never public'};
  assert.equal((await f.service.recordBookingEvent({...base,mode:'test'})).published,false);
  assert.equal((await f.service.publicActivity()).events.length,0);
  await f.service.recordBookingEvent(base);const result=await f.service.publicActivity();assert.equal(result.events.length,1);
  assert.deepEqual(Object.keys(result.events[0]).sort(),['id','occurredAt','region','service','status']);assert.equal(result.events[0].status,'confirmed');assert.equal(JSON.stringify(result).includes('Never'),false);
  assert.equal((await f.service.publicActivity(result.cursor)).events.length,0);
  await f.service.recordBookingEvent({...base,revision:2,paymentStatus:'refunded'});await f.service.recordBookingEvent(base);
  assert.equal((await f.service.publicActivity()).events.length,0);
});

test('unpaid booking is paused until live confirmation and valid hold, then resumes the existing booking',async()=>{
  let state={bookingId:'existing-booking',publicToken:'b'.repeat(43),canCheckout:false,status:'awaiting_confirmation',mode:'live',paymentStatus:'pending'};
  const f=fixture({resolveBookingForRecovery:async(id,email)=>{assert.equal(id,state.bookingId);assert.equal(email,'lead@example.com');return state;}});
  const draft=await f.capture({reminderConsent:true});await f.service.runDue();
  await assert.rejects(f.service.linkBooking({id:draft.id,accessToken:draft.accessToken,email:'wrong@example.com',bookingId:state.bookingId}),/RECOVERY_EMAIL_MISMATCH/);
  await f.service.linkBooking({id:draft.id,accessToken:draft.accessToken,email:'lead@example.com',bookingId:state.bookingId});
  f.advance(4*HOUR_MS);await f.service.runDue();assert.equal(f.sent.length,1);
  state={...state,status:'confirmed',canCheckout:true,holdExpiresAt:f.clock()+2*DAY_MS};
  const restored=await f.service.read(draft.id,draft.accessToken);assert.equal(restored.stage,'payment_ready');assert.equal(restored.resumeBooking.bookingId,state.bookingId);
  f.advance(4*HOUR_MS);await f.service.runDue();assert.equal(f.sent.length,2);
  state={...state,paymentStatus:'paid',canCheckout:false};f.advance(DAY_MS);await f.service.runDue();assert.equal(f.sent.length,2);
});

test('missing booking resolver fails closed and never sends a payment reminder',async()=>{
  const f=fixture();const draft=await f.capture({reminderConsent:true});await f.service.runDue();
  await f.service.linkBooking({id:draft.id,accessToken:draft.accessToken,email:'lead@example.com',bookingId:'existing-booking'});
  await assert.rejects(f.service.read(draft.id,draft.accessToken),/BOOKING_RECOVERY_UNAVAILABLE/);
  f.advance(DAY_MS);await f.service.runDue();assert.equal(f.sent.length,1);
});

test('all six email languages include price, personal help, opt-out and no booking guarantee',()=>{
  for(const language of ['de','en','es','fr','it','pt']) {
    const message=renderRecoveryEmail({draft:{language,selection:{service:'windows'},quote:{totalCents:69000,vatComparisonCents:5589}},kind:'reminder1',resumeUrl:'https://kraken.example/quote?draft=safe#resume=safe',unsubscribeUrl:'https://kraken.example/recovery/unsubscribe?draft=safe#token=safe',publicBaseUrl:'https://kraken.example'});
    assert.match(message.html,new RegExp(`<html lang="${language}">`));assert.ok(message.text.includes(EMAIL_COPY[language].conditions));assert.ok(message.text.includes(EMAIL_COPY[language].unsub));assert.ok(message.text.includes('kai@krakenpfm.ch'));
    assert.equal(/tracking|pixel|countdown|only \d left/i.test(message.html),false);
  }
});

test('HTTP boundary enforces same-origin, consent/token authentication and disabled defaults',async()=>{
  const f=fixture();const handler=createRecoveryHandler({service:f.service,publicBaseUrl:'https://kraken.example',authorizeCapture:async()=>({rateKey:'verified-http-client'})});
  const body={email:'lead@example.com',selection:{service:'regular',hours:2.5,frequency:'weekly'},language:'en',reminderConsent:false,consentVersion:CONSENT_VERSION,idempotencyKey:'http-idempotency-key'};
  assert.equal((await handler(new Request('https://kraken.example/api/recovery/drafts',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://attacker.example'},body:JSON.stringify(body)}))).status,403);
  const response=await handler(new Request('https://kraken.example/api/recovery/drafts',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://kraken.example'},body:JSON.stringify(body)}));assert.equal(response.status,201);const saved=await response.json();
  assert.equal((await handler(new Request(`https://kraken.example/api/recovery/drafts/${saved.id}`))).status,404);
  assert.equal((await handler(new Request(`https://kraken.example/api/recovery/drafts/${saved.id}`,{headers:{Authorization:`Bearer ${saved.accessToken}`}}))).status,200);
  const disabled=createRecoveryHandler();assert.equal((await (await disabled(new Request('https://kraken.example/api/recovery/config'))).json()).enabled,false);
  assert.deepEqual(await (await disabled(new Request('https://kraken.example/api/bookings/activity'))).json(),{events:[],cursor:null});
});


test('moving guide choices persist, restore and participate in idempotency without changing consent',async()=>{
  const f=fixture();const initial={from:'zurich',to:'schaffhausen',vehicle:true};
  const input={guidePreferences:initial,idempotencyKey:'saved-guide-idempotency'};
  const saved=await f.capture(input);
  assert.deepEqual((await f.service.read(saved.id,saved.accessToken)).guidePreferences,initial);
  assert.deepEqual((await f.store.getDraft(saved.id)).guidePreferences,initial);
  assert.deepEqual(await f.capture({...input,guidePreferences:{vehicle:true,to:'schaffhausen',from:'zurich'}}),saved);
  await assert.rejects(f.capture({...input,guidePreferences:{...initial,to:'winterthur'}}),/IDEMPOTENCY_CONFLICT/);
  const next={from:'sh',to:'winterthur',vehicle:false};
  await f.service.activity(saved.id,saved.accessToken,{guidePreferences:next,language:'pt'});
  await f.service.activity(saved.id,saved.accessToken,{selection:{service:'regular',frequency:'weekly',hours:4}});
  const restored=await f.service.read(saved.id,saved.accessToken);
  assert.deepEqual(restored.guidePreferences,next);assert.equal(restored.language,'pt');assert.equal(restored.reminderConsent,false);assert.equal(f.sent.length,0);
  const generic=await f.capture({idempotencyKey:'generic-guide-idempotency'});
  const defaults={from:'unknown',to:'unknown',vehicle:false};
  assert.deepEqual((await f.service.read(generic.id,generic.accessToken)).guidePreferences,defaults);
  assert.deepEqual(await f.capture({idempotencyKey:'generic-guide-idempotency',guidePreferences:defaults}),generic);
});

test('guide preferences reject free text, unknown keys and invalid types before any update',async()=>{
  const f=fixture();const saved=await f.capture();const before=await f.store.getDraft(saved.id);f.advance(HOUR_MS);
  const good={from:'unknown',to:'zh',vehicle:false};
  const invalid=[null,[],{},'zurich',{...good,from:'Street 17'},{...good,to:'ZH'},{...good,vehicle:'false'},{...good,vehicle:1},{...good,email:'private@example.com'},{from:'unknown',to:'sh'},{...good,from:['zurich']}];
  for(const guidePreferences of invalid) {
    await assert.rejects(f.capture({guidePreferences}),/INVALID_GUIDE_PREFERENCES/);
    await assert.rejects(f.service.activity(saved.id,saved.accessToken,{guidePreferences,language:'es',selection:{service:'regular',frequency:'weekly',hours:4}}),/INVALID_GUIDE_PREFERENCES/);
    assert.deepEqual(await f.store.getDraft(saved.id),before);
  }
  assert.equal(f.sent.length,0);
});

test('moving emails in all six languages open the saved guide without leaking choices or customer details',()=>{
  for(const language of ['de','en','es','fr','it','pt']) for(const service of ['moving','endOfTenancy','regular','windows','construction']) for(const kind of ['saved','reminder1','reminder2']) {
    const resumeUrl=`https://kraken.example/quote?draft=opaque&lang=${language}#resume=opaque-access-token`;
    const message=renderRecoveryEmail({draft:{language,email:'private@example.com',name:'Private Name',guidePreferences:{from:'zurich',to:'schaffhausen',vehicle:true},selection:{service},quote:{totalCents:69000,vatComparisonCents:5589}},kind,resumeUrl,unsubscribeUrl:'https://kraken.example/recovery/unsubscribe?draft=opaque#token=separate-token',publicBaseUrl:'https://kraken.example'});
    const hrefs=[...message.html.matchAll(/href="([^"]+)"/g)].map(match=>match[1].replaceAll('&amp;','&'));
    const guideLinks=hrefs.filter(href=>href.includes('guide=1'));
    if(['moving','endOfTenancy'].includes(service)) {
      assert.equal(guideLinks.length,1);
      const link=new URL(guideLinks[0]);assert.equal(link.hash,'#resume=opaque-access-token');
      assert.equal(link.searchParams.get('draft'),'opaque');assert.equal(link.searchParams.get('lang'),language);
      assert.deepEqual([...link.searchParams.keys()].sort(),['draft','guide','lang']);
      assert.ok(message.text.includes(MOVING_GUIDE_EMAIL_COPY[language].cta));assert.ok(message.text.includes(guideLinks[0]));assert.ok(message.text.includes(MOVING_GUIDE_EMAIL_COPY[language].body));
    } else { assert.equal(guideLinks.length,0);assert.equal(message.text.includes(MOVING_GUIDE_EMAIL_COPY[language].cta),false); }
    assert.equal(/private@example\.com|Private Name|guideFrom|guideTo|guideVehicle/.test(message.html),false);
    assert.equal(Object.hasOwn(message,'attachments'),false);
  }
});

test('HTTP round trip keeps guide choices in the protected draft and accepts explicit updates',async()=>{
  const f=fixture();const handler=createRecoveryHandler({service:f.service,publicBaseUrl:'https://kraken.example',authorizeCapture:async()=>({rateKey:'verified-guide-http'})});
  const headers={'Content-Type':'application/json',Origin:'https://kraken.example'};
  const body={email:'lead@example.com',selection:{service:'regular',hours:2.5,frequency:'weekly'},language:'es',reminderConsent:false,consentVersion:CONSENT_VERSION,idempotencyKey:'guide-http-idempotency',guidePreferences:{from:'zh',to:'sh',vehicle:true}};
  const created=await handler(new Request('https://kraken.example/api/recovery/drafts',{method:'POST',headers,body:JSON.stringify(body)}));assert.equal(created.status,201);const saved=await created.json();
  const url=`https://kraken.example/api/recovery/drafts/${saved.id}`;headers.Authorization=`Bearer ${saved.accessToken}`;
  const restored=await(await handler(new Request(url,{headers}))).json();assert.deepEqual(restored.guidePreferences,body.guidePreferences);
  const next={from:'sh',to:'winterthur',vehicle:false};
  assert.equal((await handler(new Request(`${url}/activity`,{method:'POST',headers,body:JSON.stringify({guidePreferences:next})}))).status,200);
  assert.deepEqual((await(await handler(new Request(url,{headers}))).json()).guidePreferences,next);
});
