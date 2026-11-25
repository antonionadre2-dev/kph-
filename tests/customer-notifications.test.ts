import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePrice,defaultSelection } from '../src/booking/pricing.ts';
import { selectedEmailSnapshot,notificationForBooking,prepareCustomerEnvelope } from '../server/customer-notifications.ts';

test('a provider TEST payment remains visibly labelled in the new persisted receipt',()=>{
  const selection=defaultSelection('regular'),quote=calculatePrice(selection);
  const record={bookingId:'synthetic-booking',reference:'K-SYNTHETIC',mode:'test',selection,quote,language:'es',languageSnapshot:selectedEmailSnapshot('es'),
    customer:{name:'Cliente de prueba',email:'synthetic@example.test',city:'Schaffhausen',postalCode:'8203',address:'Dirección sintética 1'},
    scheduling:{status:'confirmed',date:'2026-12-01',time:'10:00'},payment:{amountDueNowCents:1500,amountPaidCents:1500,remainingBalanceCents:8500,status:'test_paid'}};
  const notification=notificationForBooking(record,'deposit_received','synthetic-settled-event');
  const envelope=prepareCustomerEnvelope(notification,{primary:'https://kraken.example/quote?lang=es',secondary:'https://kraken.example/kontakt?lang=es'},'https://kraken.example');
  assert.match(envelope.subject,/^\[TEST\]/);assert.match(envelope.text,/PRUEBA · Sin pago real/);assert.match(envelope.html,/PRUEBA · Sin pago real/);
  assert.equal(envelope.language,'es');assert.equal(envelope.to,'synthetic@example.test');
});
