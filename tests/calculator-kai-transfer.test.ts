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
  assert.match((applied.selection as any).details,/Tercer piso sin ascensor/);
  assert.match(applied.notes,/mañana/);
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
