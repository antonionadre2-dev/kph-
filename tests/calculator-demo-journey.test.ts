import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultSelection } from '../src/booking/pricing';
import { createDemoBooking, confirmDemoAppointment, settleDemoPayment } from '../src/booking/demoJourney';
const customer={name:'Demo',email:'preview@example.com',phone:'+41790000000',address:'Example 1',postalCode:'8000',city:'Zürich'};
test('current demo waits for confirmation and then charges the full unchanged calculator total',()=>{
  const draft=createDemoBooking(defaultSelection('endOfTenancy'),customer,'2026-12-01','09:00','de');
  assert.equal(draft.canCheckout,false);assert.equal(draft.payment.amountPaidCents,0);assert.equal(draft.payment.amountDueNowCents,0);
  assert.equal(settleDemoPayment(draft,'paid','es').payment.amountPaidCents,0);
  assert.equal(draft.termsVersion,'kraken-agb-2026-11-28-v3');assert.equal('depositPercent' in draft.payment,false);assert.equal('depositBasisCents' in draft.quote,false);
  const confirmed=confirmDemoAppointment(draft);assert.equal(confirmed.canCheckout,true);assert.equal(confirmed.payment.amountDueNowCents,draft.quote.totalCents);
  const paid=settleDemoPayment(confirmed,'paid','es');
  assert.equal(paid.language,'es');assert.equal(paid.scheduling.status,'confirmed');assert.equal(paid.canCheckout,false);
  assert.equal(paid.payment.amountPaidCents,draft.quote.totalCents);assert.equal(paid.payment.outstandingCents,0);
  assert.equal(settleDemoPayment(paid,'failed','es'),paid,'A paid demo cannot become unpaid from a stale retry');
});
test('declined and pending demos never report money collected',()=>{
  const confirmed=confirmDemoAppointment(createDemoBooking({...defaultSelection('regular'),frequency:'once'},customer,'2026-12-01','09:00','fr'));
  for(const status of ['failed','pending'] as const) {
    const result=settleDemoPayment(confirmed,status,'fr');assert.equal(result.payment.amountPaidCents,0);assert.equal(result.canCheckout,status==='failed');assert.equal(result.payment.status,status);assert.equal(result.payment.outstandingCents,confirmed.payment.totalDueCents);
  }
});
test('moving inspection does not invent an amount to complete a payment demo',()=>{
  const draft=createDemoBooking({service:'moving',details:'Example move'},customer,'2026-12-01','09:00','it');
  assert.equal(draft.quote.totalCents,null);assert.equal(confirmDemoAppointment(draft).canCheckout,false);
  assert.equal(settleDemoPayment(draft,'paid','it').payment.status,'not_started');
});
test('hourly moving demo charges its genuine estimate, with no new tariff or percentage',()=>{
  const draft=createDemoBooking({...defaultSelection('moving'),team:2,estimatedHours:4,additionalHelpers:1},customer,'2026-12-01','09:00','es');assert.equal(draft.quote.totalCents,84000);
  const paid=settleDemoPayment(confirmDemoAppointment(draft),'paid','es');assert.equal(paid.payment.amountPaidCents,84000);assert.equal(paid.payment.outstandingCents,0);
});
test('monthly demo requires a real explicit period and visits rather than assuming four weeks',()=>{
  const draft=createDemoBooking(defaultSelection('regular'),customer,'2026-12-01','09:00','de');
  assert.equal(draft.payment.totalDueCents,null);assert.equal(confirmDemoAppointment(draft),draft);
  for(const period of [{start:'2026-12-01',end:'2027-01-01',visits:4},{start:'2026-12-02',end:'2026-12-31',visits:4},{start:'2026-12-01',end:'2026-12-31',visits:0}])assert.equal(confirmDemoAppointment(draft,period),draft);
  const confirmed=confirmDemoAppointment(draft,{start:'2026-12-01',end:'2026-12-31',visits:5});assert.equal(confirmed.payment.totalDueCents,draft.quote.totalCents!*5);assert.equal(confirmed.payment.billingPeriod?.visits,5);
  const paid=settleDemoPayment(confirmed,'paid','de');assert.equal(paid.payment.amountPaidCents,draft.quote.totalCents!*5);assert.equal(paid.payment.outstandingCents,0);
});
