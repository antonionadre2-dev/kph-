import test from 'node:test';
import assert from 'node:assert/strict';
import { applyKaiBookingTransfer, kaiBookingPreview, type KaiCalculatorState } from '../src/booking/kaiTransfer';
import { defaultSelection, calculatePrice } from '../src/booking/pricing';
import { emptyKaiDraft, type KaiDraft } from '../src/kai/types';
import { getKaiTransferPreview, registerKaiCalculationPreview } from '../src/kai/draft';
const initial = (choice: KaiCalculatorState['choice'] = null): KaiCalculatorState => ({ choice, selection: choice ? choice === 'deep' ? { ...defaultSelection('regular'), frequency: 'once', hours: 3 } : defaultSelection(choice) : null, customer: { name:'',email:'',phone:'',address:'',postalCode:'',city:'' }, requestedDate:'', notes:'', touchedSelection:[] });
const draft = (service: KaiDraft['service'], fields: KaiDraft['fields']): KaiDraft => ({ ...emptyKaiDraft('es'), service, services: service ? [service] : [], fields });

test('Kai transfers explicit facts without deriving a price or person-hours from rooms', () => {
  const before = initial('regular');
  const applied = applyKaiBookingTransfer(before, draft('regular', { city:'Zürich', postcode:'8001', bedrooms:'3', bathrooms:'2', frequency:'semanal', priorities:'La cocina', notes:'Tengo un perro' }), 'preserve');
  assert.equal(applied.customer.city,'Zürich'); assert.equal(applied.customer.postalCode,'8001');
  assert.equal(applied.selection?.service,'regular');
  assert.equal((applied.selection as any).hours,2.5);
  assert.match(applied.notes,/Dormitorios: 3/); assert.match(applied.notes,/Baños: 2/);
  assert.match(applied.notes,/La cocina/); assert.match(applied.notes,/Tengo un perro/);
  assert.deepEqual(before.customer,initial('regular').customer,'pure mapping does not mutate the live draft');
});

test('preserve protects explicit edits, replace applies chosen facts, and conflicts remain reviewable', () => {
  const before = { ...initial('endOfTenancy'), customer: { ...initial().customer, city:'Winterthur',postalCode:'8400' }, requestedDate:'2026-12-20', notes:'Keep my note', selection:{...defaultSelection('endOfTenancy'),rooms:4.5}, touchedSelection:['rooms'] };
  const incoming = draft('end', { city:'Schaffhausen',postcode:'8200',date:'2026-12-24',rooms:'3,5',bathrooms:'2',priorities:'Horno' });
  const preserve = applyKaiBookingTransfer(before,incoming,'preserve');
  assert.equal(preserve.customer.city,'Winterthur'); assert.equal(preserve.requestedDate,'2026-12-20'); assert.equal((preserve.selection as any).rooms,4.5);
  assert.ok(preserve.conflicts.includes('rooms')); assert.match(preserve.notes,/3,5/); assert.match(preserve.notes,/Keep my note/);
  const replace = applyKaiBookingTransfer(before,incoming,'replace');
  assert.equal(replace.customer.city,'Schaffhausen'); assert.equal(replace.requestedDate,'2026-12-24'); assert.equal((replace.selection as any).rooms,3.5);
  assert.equal((replace.selection as any).bathrooms,2);
});

test('windows count requires an exact type and does not add the example quantities', () => {
  const typed = applyKaiBookingTransfer(initial(),draft('windows',{windowsCount:'8',windowType:'ventanas dobles'}),'preserve');
  assert.equal(typed.selection?.service,'windows');
  assert.equal((typed.selection as any).double,8); assert.equal((typed.selection as any).standard,0);
  assert.equal(calculatePrice(typed.selection!).totalCents,19200);
  const ambiguous = applyKaiBookingTransfer(initial(),draft('windows',{windowsCount:'8',windowType:'grandes y pequeñas'}),'preserve');
  assert.deepEqual(ambiguous.selection,defaultSelection('windows'));
  assert.match(ambiguous.notes,/Número de ventanas: 8/);
  const vague = applyKaiBookingTransfer(initial(),draft('windows',{windowsCount:'unas 8',windowType:'double'}),'replace');
  assert.deepEqual(vague.selection,defaultSelection('windows'));
});

test('moving inventory and access stay verbatim; invalid dates or units are never inferred', () => {
  const applied = applyKaiBookingTransfer(initial(),draft('moving',{ origin:'8400 Winterthur',destination:'8200 Schaffhausen',inventory:'Sofá y 8 cajas',originAccess:'Tercer piso sin ascensor',destinationAccess:'Entrada estrecha',date:'mañana' }),'preserve');
  assert.equal(applied.requestedDate,'');
  assert.match((applied.selection as any).details,/Sofá y 8 cajas/);
  assert.match(applied.notes,/Tercer piso sin ascensor/);
  assert.ok(!applied.notes.includes('mañana'));
  assert.ok(!applied.notes.includes('Sofá y 8 cajas'),'inventory has its own real calculator control');
  assert.equal(calculatePrice(applied.selection!).totalCents,null);
});

test('end-of-tenancy hands rooms, area, bathrooms, location and ISO date to their real controls', () => {
  const incoming=draft('end',{rooms:'3.5',area:'85',bathrooms:'1',city:'Zürich',postcode:'8001',date:'2026-12-15'});
  const applied=applyKaiBookingTransfer(initial(),incoming,'preserve');
  assert.equal(applied.selection?.service,'endOfTenancy');
  assert.equal((applied.selection as any).rooms,3.5);
  assert.equal((applied.selection as any).areaM2,85);
  assert.equal((applied.selection as any).bathrooms,1);
  assert.equal(applied.customer.city,'Zürich');
  assert.equal(applied.customer.postalCode,'8001');
  assert.equal(applied.requestedDate,'2026-12-15');
  assert.equal(applied.notes,'');
  assert.deepEqual(applied.remainingFields,{});
  assert.equal(calculatePrice(applied.selection!).totalCents,69_000);
});

test('area supports exact two-decimal quantities and conflicts respect explicit preserve/replace', () => {
  const before={...initial('endOfTenancy'),selection:{...defaultSelection('endOfTenancy'),areaM2:110},touchedSelection:['areaM2']};
  const incoming=draft('end',{rooms:'3,5',area:'85,75'});
  const preserved=applyKaiBookingTransfer(before,incoming,'preserve');
  assert.equal((preserved.selection as any).areaM2,110);
  assert.ok(preserved.conflicts.includes('area'));
  assert.equal(preserved.remainingFields.area,'85,75');
  const replaced=applyKaiBookingTransfer(before,incoming,'replace');
  assert.equal((replaced.selection as any).areaM2,85.75);
  assert.equal(replaced.remainingFields.area,undefined);
  assert.equal(replaced.notes,'');
});

test('legacy decimal room counts and impossible dates never reach a date control or residual notes', () => {
  for (const invalid of ['3.5','2.5','mañana','2026-02-30']) {
    const applied=applyKaiBookingTransfer(initial(),draft('end',{rooms:'3.5',area:'85',date:invalid}),'replace');
    assert.equal(applied.requestedDate,'');
    assert.equal(applied.remainingFields.date,undefined);
    assert.equal(applied.notes,'');
    assert.equal((applied.selection as any).rooms,3.5);
  }
});

test('a weekly three-hour request uses the calculator frequency and hours without repeating mapped facts', () => {
  const applied=applyKaiBookingTransfer(initial(),draft('regular',{hours:'3',frequency:'jede Woche',postcode:'8200',city:'Schaffhausen'}),'preserve');
  assert.equal((applied.selection as any).frequency,'weekly');
  assert.equal((applied.selection as any).hours,3);
  assert.equal(calculatePrice(applied.selection!).totalCents,12_000);
  assert.equal(applied.notes,'');
  assert.deepEqual(applied.remainingFields,{});
  const before={...initial('regular'),selection:{...defaultSelection('regular'),hours:4},touchedSelection:['hours']};
  const preserve=applyKaiBookingTransfer(before,draft('regular',{hours:'3'}),'preserve');
  assert.equal((preserve.selection as any).hours,4);
  assert.ok(preserve.conflicts.includes('hours'));
  assert.equal(preserve.remainingFields.hours,'3');
  assert.equal((applyKaiBookingTransfer(before,draft('regular',{hours:'3'}),'replace').selection as any).hours,3);
});

test('known extras map to real controls while kitchen, oven and windows stay included in the end clean', () => {
  const incoming=draft('end',{rooms:'3.5',area:'85',priorities:'Küche, Backofen, Fenster, 1 kleiner Balkon'});
  const applied=applyKaiBookingTransfer(initial(),incoming,'preserve');
  assert.equal((applied.selection as any).smallBalconies,1);
  assert.equal((applied.selection as any).oven,undefined);
  assert.equal(calculatePrice(applied.selection!).totalCents,73_500);
  assert.equal(applied.remainingFields.priorities,'Küche, Backofen, Fenster');
  assert.ok(!applied.notes.includes('Balkon'));
  assert.equal(incoming.fields.priorities,'Küche, Backofen, Fenster, 1 kleiner Balkon','mapping must stay pure');
  const regular=applyKaiBookingTransfer(initial(),draft('regular',{hours:'3',priorities:'Horno, nevera, suelos'}),'preserve');
  assert.equal((regular.selection as any).oven,true);
  assert.equal((regular.selection as any).fridge,true);
  assert.equal(regular.remainingFields.priorities,'suelos');
});

test('an explicit one-time regular clean uses its real frequency and rate in every language',()=>{
  for(const frequency of ['einmalig','once','one-time','one-off','una vez','uma vez','uma única vez','una sola volta','ponctuel','une seule fois']){
    const applied=applyKaiBookingTransfer(initial(),draft('regular',{hours:'3',frequency}),'preserve');
    assert.equal((applied.selection as any).frequency,'once',frequency);
    assert.equal((applied.selection as any).cleaningKind,'regular',frequency);
    assert.equal(calculatePrice(applied.selection!).totalCents,13_200,frequency);
    assert.equal(applied.remainingFields.frequency,undefined,frequency);
  }
});

test('a floor description alone never silently adds the window difficult-access surcharge', () => {
  const applied=applyKaiBookingTransfer(initial(),draft('windows',{windowsCount:'12',windowType:'standard',windowAccess:'3. Stock ohne Lift'}),'preserve');
  assert.equal((applied.selection as any).standard,12);
  assert.equal((applied.selection as any).difficultAccess,false);
  assert.equal(applied.remainingFields.windowAccess,'3. Stock ohne Lift');
  assert.equal(applied.remainingFields.windowsCount,undefined);
  const difficult=applyKaiBookingTransfer(initial(),draft('windows',{windowsCount:'12',windowType:'standard',windowAccess:'schwer zugänglich'}),'preserve');
  assert.equal((difficult.selection as any).difficultAccess,true);
  assert.equal(difficult.remainingFields.windowAccess,undefined);
});

test('explicitly excluded regular extras never become charges and corrections respect user merge choices', () => {
  for(const excluded of ['ohne Backofen','kein Backofen','Backofen doch nicht','without oven','no oven','sin horno','sem forno','senza forno','sans four','pas de four']) {
    const applied=applyKaiBookingTransfer(initial(),draft('regular',{hours:'3',frequency:'weekly',priorities:excluded}),'preserve');
    assert.equal((applied.selection as any).oven,false,excluded);
    assert.equal(calculatePrice(applied.selection!).totalCents,12_000,excluded);
    assert.equal(applied.remainingFields.priorities,undefined,excluded);
  }
  const before={...initial('regular'),selection:{...defaultSelection('regular'),hours:3,oven:true,fridge:true},touchedSelection:['oven','fridge']};
  const incoming=draft('regular',{priorities:'Backofen doch nicht, sin nevera'});
  const preserved=applyKaiBookingTransfer(before,incoming,'preserve');
  assert.equal((preserved.selection as any).oven,true);
  assert.equal((preserved.selection as any).fridge,true);
  assert.ok(preserved.conflicts.includes('priorities'));
  assert.match(preserved.remainingFields.priorities!,/Backofen doch nicht/);
  const replaced=applyKaiBookingTransfer(before,incoming,'replace');
  assert.equal((replaced.selection as any).oven,false);
  assert.equal((replaced.selection as any).fridge,false);
  assert.equal(calculatePrice(replaced.selection!).totalCents,12_000);
  assert.equal(replaced.remainingFields.priorities,undefined,'accepted replacements have real controls and need no residual note');
});

test('moving maps an explicit numeric floor and absent lift without selecting a priced contract', () => {
  const applied=applyKaiBookingTransfer(initial(),draft('moving',{rooms:'2.5',hours:'3',originAccess:'3. Stock ohne Lift',inventory:'Sofa und 8 Kartons'}),'preserve');
  assert.equal((applied.selection as any).rooms,2.5);
  assert.equal((applied.selection as any).originFloor,3);
  assert.equal((applied.selection as any).originLift,false);
  assert.equal((applied.selection as any).mode,undefined);
  assert.equal((applied.selection as any).estimatedHours,undefined);
  assert.equal((applied.selection as any).details,'Sofa und 8 Kartons');
  assert.equal(applied.remainingFields.originAccess,undefined);
  assert.equal(applied.remainingFields.inventory,undefined);
  assert.equal(applied.remainingFields.hours,'3','hours alone do not authorize an hourly team/contract');
  assert.equal(calculatePrice(applied.selection!).totalCents,null);
});

test('live Kai conflict review includes the new windows controls without personal-data storage', () => {
  const current = { ...initial('windows'), selection:{...defaultSelection('windows'),double:5}, touchedSelection:['double'] };
  const incoming = draft('windows',{windowsCount:'8',windowType:'double'});
  const unregister = registerKaiCalculationPreview(value=>kaiBookingPreview(current,value));
  try {
    const storage = { getItem:()=>null, setItem:()=>{throw new Error('must not write');}, removeItem:()=>{throw new Error('must not delete');} };
    assert.ok(getKaiTransferPreview(incoming,storage).conflicts.includes('windowsCount'));
  } finally { unregister(); }
});
