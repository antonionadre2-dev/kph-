import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultSelection } from '../src/booking/pricing';
import { createDemoBooking, confirmDemoAppointment, settleDemoPayment } from '../src/booking/demoJourney';
const customer={name:'Demo',email:'preview@example.com',phone:'+41790000000',address:'Example 1',postalCode:'8000',city:'Zürich'};
test('demo distinguishes request, held appointment and paid deposit without losing the remainder',()=>{
  const draft=createDemoBooking(defaultSelection('endOfTenancy'),customer,'2026-12-01','09:00','de');
  assert.equal(draft.canCheckout,false);assert.equal(draft.payment.amountPaidCents,0);
  assert.equal(settleDemoPayment(draft,'paid','es').payment.amountPaidCents,0);
  const held=confirmDemoAppointment(draft); assert.equal(held.canCheckout,true);
  const paid=settleDemoPayment(held,'paid','es');
  assert.equal(paid.language,'es');assert.equal(paid.scheduling.status,'confirmed');assert.equal(paid.canCheckout,false);
  assert.equal(paid.payment.amountPaidCents,Math.round(draft.quote.totalCents!*0.15));
  assert.equal(paid.payment.amountPaidCents+paid.payment.remainingBalanceCents!,draft.quote.totalCents);
});
test('declined and pending demos never report money collected',()=>{
  const held=confirmDemoAppointment(createDemoBooking(defaultSelection('regular'),customer,'2026-12-01','09:00','fr'));
  for(const status of ['failed','pending'] as const) {
    const result=settleDemoPayment(held,status,'fr');assert.equal(result.payment.amountPaidCents,0);assert.equal(result.canCheckout,status==='failed');assert.equal(result.payment.status,status);
  }
});
test('moving inspection does not invent an amount to complete a payment demo',()=>{
  const draft=createDemoBooking({...defaultSelection('moving'),details:'Example move'},customer,'2026-12-01','09:00','it');
  assert.equal(draft.quote.totalCents,null);assert.equal(confirmDemoAppointment(draft).canCheckout,false);
  assert.equal(settleDemoPayment(draft,'paid','it').payment.status,'not_started');
});
