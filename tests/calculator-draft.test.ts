import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePrice, defaultSelection } from '../src/booking/pricing.ts';
import { CALCULATOR_DRAFT_KEY, CALCULATOR_CONTACT_KEY, CALCULATOR_SUBMISSION_KEY, CALCULATOR_DRAFT_TTL_MS, CALCULATOR_SESSION_TTL_MS, writeCalculatorDraft, readCalculatorDraft, clearCalculatorDraft, purgeExpiredCalculatorSession, calculatorSubmission, type CalculatorDraftState } from '../src/booking/calculatorDraft.ts';

const NOW = Date.parse('2026-11-26T08:00:00Z');
const fixture = () => { const items=new Map<string,string>(); return { items, getItem:(key:string)=>items.get(key)??null, setItem:(key:string,value:string)=>{items.set(key,value);}, removeItem:(key:string)=>{items.delete(key);} }; };
const state = (): CalculatorDraftState => ({ choice:'endOfTenancy',selection:{...defaultSelection('endOfTenancy'),rooms:3.5,areaM2:80},wizardStep:2,customer:{name:'Synthetic QA',email:'qa@example.test',phone:'+41000000000',address:'Synthetic test 1',postalCode:'8203',city:'Schaffhausen'},requestedDate:'2026-12-12',requestedTime:'10:15',notes:'Synthetic note' });

test('reload/back restores the calculation and short-lived form, never prices, consent or access tokens',()=>{
  const local=fixture(),session=fixture(), original=state();
  writeCalculatorDraft({...original,quote:{totalCents:1},termsAccepted:true,publicToken:'forbidden',customer:{...original.customer!,token:'forbidden'}} as any,local,session,NOW);
  const restored=readCalculatorDraft(local,session,NOW+1000)!;
  assert.deepEqual(restored.selection,original.selection);
  assert.deepEqual(restored.customer,original.customer);
  assert.equal(restored.wizardStep,2);assert.equal(restored.requestedDate,original.requestedDate);assert.equal(restored.requestedTime,'10:15');assert.equal(restored.notes,original.notes);
  const raw=local.getItem(CALCULATOR_DRAFT_KEY)!;
  assert.doesNotMatch(raw,/Synthetic|qa@example|phone|address|postalCode|city|notes|requestedDate|requestedTime|quote|totalCents|termsAccepted|publicToken|forbidden/);
  assert.doesNotMatch(session.getItem(CALCULATOR_CONTACT_KEY)!,/termsAccepted|publicToken|forbidden|totalCents|quote/);
});

test('reads, remount-equivalent writes and step-only navigation do not renew the original expiry',()=>{
  const local=fixture(),session=fixture(),original=state();writeCalculatorDraft(original,local,session,NOW);
  const expiry=JSON.parse(local.getItem(CALCULATOR_DRAFT_KEY)!).expiresAt,contactExpiry=JSON.parse(session.getItem(CALCULATOR_CONTACT_KEY)!).expiresAt;
  const restored=readCalculatorDraft(local,session,NOW+1000)!;writeCalculatorDraft(restored,local,session,NOW+1000);
  writeCalculatorDraft({...restored,wizardStep:1},local,session,NOW+2000);
  assert.equal(JSON.parse(local.getItem(CALCULATOR_DRAFT_KEY)!).expiresAt,expiry);
  assert.equal(JSON.parse(session.getItem(CALCULATOR_CONTACT_KEY)!).expiresAt,contactExpiry);
  assert.equal(expiry,NOW+CALCULATOR_DRAFT_TTL_MS);assert.equal(contactExpiry,NOW+CALCULATOR_SESSION_TTL_MS);
});

test('contact expiry keeps anonymous calculation but returns to data entry; anonymous expiry removes the draft',()=>{
  const local=fixture(),session=fixture();writeCalculatorDraft(state(),local,session,NOW);
  const restored=readCalculatorDraft(local,session,NOW+CALCULATOR_SESSION_TTL_MS)!;
  assert.equal(restored.customer,undefined);assert.equal(restored.notes,undefined);assert.equal(restored.requestedDate,undefined);assert.equal(restored.wizardStep,1);
  assert.equal(session.getItem(CALCULATOR_CONTACT_KEY),null);
  assert.deepEqual(restored.selection,state().selection);
  writeCalculatorDraft({...restored,customer:{name:'',email:'',phone:'',address:'',postalCode:'',city:''}},local,session,NOW+CALCULATOR_SESSION_TTL_MS);
  assert.equal(JSON.parse(local.getItem(CALCULATOR_DRAFT_KEY)!).expiresAt,NOW+CALCULATOR_DRAFT_TTL_MS);
  assert.equal(readCalculatorDraft(local,session,NOW+CALCULATOR_DRAFT_TTL_MS),null);
  assert.equal(local.getItem(CALCULATOR_DRAFT_KEY),null);assert.equal(session.getItem(CALCULATOR_CONTACT_KEY),null);
});

test('moving descriptions remain session-only and incomplete numeric inputs do not silently become defaults',()=>{
  const local=fixture(),session=fixture();
  writeCalculatorDraft({...state(),choice:'moving',selection:{service:'moving',details:'Synthetic sofa at private address'}},local,session,NOW);
  assert.doesNotMatch(local.getItem(CALCULATOR_DRAFT_KEY)!,/Synthetic|private|details/);
  assert.equal((readCalculatorDraft(local,session,NOW+1)!.selection as any).details,'Synthetic sofa at private address');
  const incomplete={...state(),selection:{...defaultSelection('endOfTenancy'),areaM2:NaN}};
  writeCalculatorDraft(incomplete,local,session,NOW+2);
  assert.ok(Number.isNaN((readCalculatorDraft(local,session,NOW+3)!.selection as any).areaM2));
});

test('structured moving and combined cleaning survive reload without storing nested private data or supplied prices',()=>{
  const local=fixture(),session=fixture();
  const moving={...defaultSelection('moving'),mode:'fixed' as const,rooms:2.5,distanceKm:10,originFloor:3,originLift:false,details:'Private address and furniture description',sameAddress:true,
    cleaning:{...defaultSelection('endOfTenancy'),rooms:2.5,areaM2:70,customer:{email:'private@example.test'},address:'Private address',totalCents:1,accessToken:'forbidden'},
    customer:{name:'Private Name'},quote:{totalCents:1},totalCents:1,address:'Private address',token:'forbidden'};
  writeCalculatorDraft({...state(),choice:'moving',selection:moving} as any,local,session,NOW);
  const saved=readCalculatorDraft(local,session,NOW+1)!;
  assert.equal(saved.selection.service,'moving');
  if(saved.selection.service!=='moving')throw Error('wrong service');
  assert.equal(saved.selection.distanceKm,10);assert.equal(saved.selection.originFloor,3);assert.equal(saved.selection.originLift,false);
  assert.equal(saved.selection.sameAddress,true);assert.equal(saved.selection.cleaning?.areaM2,70);
  assert.equal(saved.selection.details,moving.details);
  assert.equal(calculatePrice(saved.selection).totalCents,137000);
  assert.doesNotMatch(local.getItem(CALCULATOR_DRAFT_KEY)!,/Private|private@|"customer"|"address"|"details"|totalCents|quote|token|forbidden/i);
  assert.doesNotMatch(session.getItem(CALCULATOR_CONTACT_KEY)!,/forbidden|totalCents|quote/);
  const expired=readCalculatorDraft(local,session,NOW+CALCULATOR_SESSION_TTL_MS)!;
  assert.equal(expired.selection.service,'moving');
  assert.equal((expired.selection as any).details,undefined);
  assert.deepEqual((expired.selection as any).cleaning,saved.selection.cleaning);
});

test('unknown moving distance remains absent and nested cleaning cannot inject another draft or recurse',()=>{
  const local=fixture(),session=fixture();
  writeCalculatorDraft({...state(),choice:'moving',selection:{...defaultSelection('moving'),mode:'fixed',distanceKm:undefined}},local,session,NOW);
  const saved=readCalculatorDraft(local,session,NOW+1)!;
  assert.equal((saved.selection as any).distanceKm,undefined);
  assert.equal(calculatePrice(saved.selection).priceType,'personal');
  assert.equal(calculatePrice(saved.selection).totalCents,null);
  const envelope=JSON.parse(local.getItem(CALCULATOR_DRAFT_KEY)!);
  envelope.data.selection.cleaning={service:'moving',cleaning:{service:'moving',details:'private'}};
  local.setItem(CALCULATOR_DRAFT_KEY,JSON.stringify(envelope));
  assert.equal(readCalculatorDraft(local,session,NOW+2),null);
});

test('a restored one-off regular cleaning cannot be relabelled as deep cleaning',()=>{
  const regular={...defaultSelection('regular'),frequency:'once' as const,hours:2.5};
  const local=fixture(),session=fixture();
  writeCalculatorDraft({...state(),choice:'regular',selection:regular},local,session,NOW);
  assert.equal(readCalculatorDraft(local,session,NOW+1)?.choice,'regular');
  const forged=JSON.parse(local.getItem(CALCULATOR_DRAFT_KEY)!);forged.data.choice='deep';
  local.setItem(CALCULATOR_DRAFT_KEY,JSON.stringify(forged));
  assert.equal(readCalculatorDraft(local,session,NOW+2),null);
  const {cleaningKind:omitted,...legacy}=regular;
  writeCalculatorDraft({...state(),choice:'deep',selection:{...legacy,hours:3}},local,session,NOW+3);
  const saved=readCalculatorDraft(local,session,NOW+4)!;
  assert.equal(saved.choice,'deep');assert.equal((saved.selection as any).cleaningKind,undefined);
  assert.equal(calculatePrice(saved.selection).totalCents,13200);
});

test('malformed, excessive-retention or unsupported records fail closed and injected fields are scrubbed without renewing',()=>{
  const local=fixture(),session=fixture();
  for(const raw of ['{bad','null','{}',JSON.stringify({version:1,savedAt:NOW,expiresAt:NOW+CALCULATOR_DRAFT_TTL_MS+1,data:state()}),JSON.stringify({version:1,savedAt:NOW+1,expiresAt:NOW+100,data:state()})]) {
    local.setItem(CALCULATOR_DRAFT_KEY,raw);assert.equal(readCalculatorDraft(local,session,NOW),null);
  }
  writeCalculatorDraft(state(),local,session,NOW);
  const envelope=JSON.parse(local.getItem(CALCULATOR_DRAFT_KEY)!);envelope.data.customer={email:'injected@example.test'};envelope.data.selection.totalCents=1;envelope.privateToken='secret';
  local.setItem(CALCULATOR_DRAFT_KEY,JSON.stringify(envelope));
  assert.ok(readCalculatorDraft(local,session,NOW+1));
  assert.doesNotMatch(local.getItem(CALCULATOR_DRAFT_KEY)!,/injected|totalCents|privateToken|secret/);
  assert.equal(JSON.parse(local.getItem(CALCULATOR_DRAFT_KEY)!).expiresAt,envelope.expiresAt);
});

test('unchanged submission survives a reload with the same idempotency nonce and no persisted payload',async()=>{
  const session=fixture(),payload={selection:state().selection,customer:state().customer,language:'de',acceptedTotalCents:69000,termsAccepted:true};let count=0;
  const newKey=()=>`synthetic_nonce_${++count}`;
  const first=await calculatorSubmission(payload,null,newKey,session,NOW);
  const retry=await calculatorSubmission({customer:payload.customer,termsAccepted:true,acceptedTotalCents:69000,selection:payload.selection,language:'de'},null,newKey,session,NOW+1000);
  assert.deepEqual(retry,first);assert.equal(count,1);
  assert.equal(JSON.parse(session.getItem(CALCULATOR_SUBMISSION_KEY)!).expiresAt,NOW+CALCULATOR_SESSION_TTL_MS);
  assert.doesNotMatch(session.getItem(CALCULATOR_SUBMISSION_KEY)!,/Synthetic QA|qa@example|address|acceptedTotal|termsAccepted|customer/);
  assert.notEqual((await calculatorSubmission({...payload,language:'es'},retry,newKey,session,NOW+2000)).key,first.key);
});

test('successful creation clears only calculator drafts and storage failure leaves the live form usable',()=>{
  const local=fixture(),session=fixture();writeCalculatorDraft(state(),local,session,NOW);
  session.setItem(CALCULATOR_SUBMISSION_KEY,'synthetic');session.setItem('kraken.booking.synthetic','existing-capability');
  clearCalculatorDraft(local,session);assert.equal(readCalculatorDraft(local,session,NOW+1),null);assert.equal(session.getItem(CALCULATOR_SUBMISSION_KEY),null);assert.equal(session.getItem('kraken.booking.synthetic'),'existing-capability');
  const blocked={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');},removeItem(){throw Error('blocked');}};
  assert.doesNotThrow(()=>writeCalculatorDraft(state(),blocked,blocked,NOW));assert.equal(readCalculatorDraft(blocked,blocked,NOW),null);assert.doesNotThrow(()=>clearCalculatorDraft(blocked,blocked));
});

test('open-page cleanup removes expired session data without touching a valid draft or extending retention',()=>{
  const local=fixture(),session=fixture();writeCalculatorDraft(state(),local,session,NOW);
  const original=session.getItem(CALCULATOR_CONTACT_KEY);
  purgeExpiredCalculatorSession(session,NOW+1);assert.equal(session.getItem(CALCULATOR_CONTACT_KEY),original);
  purgeExpiredCalculatorSession(session,NOW+CALCULATOR_SESSION_TTL_MS);assert.equal(session.getItem(CALCULATOR_CONTACT_KEY),null);
  assert.ok(local.getItem(CALCULATOR_DRAFT_KEY));
});

test('impossible stored calendar dates cannot reach date formatting in the review',()=>{
  const local=fixture(),session=fixture();
  for(const requestedDate of ['2026-99-99','2026-02-30','2026-13-01']) {
    writeCalculatorDraft({...state(),requestedDate},local,session,NOW);
    assert.equal(readCalculatorDraft(local,session,NOW+1)!.requestedDate,'');
  }
});
