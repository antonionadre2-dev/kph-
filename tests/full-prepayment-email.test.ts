import test from 'node:test';
import assert from 'node:assert/strict';
import {calculatePrice,defaultSelection} from '../src/booking/pricing.ts';
import {CURRENT_TERMS_VERSION} from '../src/legal/terms-version.ts';
import {selectedEmailSnapshot,notificationForBooking,prepareCustomerEnvelope} from '../server/customer-notifications.ts';
import {createResendEmailAdapter} from '../server/booking-email.ts';
import {TEMPLATE_REVISION,LEGACY_TEMPLATE_REVISION,catalogs} from '../integrations/email-collection/index.mjs';
const origin='https://kraken.example',links={primary:origin+'/quote#access=synthetic',secondary:origin+'/kontakt'};
function fixture(language='de'){
 const selection=defaultSelection('endOfTenancy'),quote=calculatePrice(selection);
 return {bookingId:'synthetic-booking',reference:'K-SYNTHETIC',mode:'test',confirmedAt:Date.parse('2026-11-30T09:00:00Z'),termsVersion:CURRENT_TERMS_VERSION,language,languageSnapshot:selectedEmailSnapshot(language),selection,quote,customer:{name:'Synthetic',email:'synthetic@example.test',city:'Schaffhausen',address:'Testweg 1',postalCode:'8203'},scheduling:{status:'confirmed',date:'2026-12-10',time:'10:00'},payment:{model:'full_prepayment',billingMode:'single',totalDueCents:56000,amountDueNowCents:56000,amountPaidCents:0,refundedCents:0,paymentDueAt:'2026-12-03T09:00:00.000Z'}};
}
test('six current catalogues contain no superseded payment model while historical snapshots retain it',()=>{
 for(const lang of ['de','en','es','pt','it','fr']){
  assert.doesNotMatch(JSON.stringify(Object.values(catalogs[lang]).map(({event,...visible})=>visible)),lang==='it'?/acconto|caparra|15\s?%/i:/Anzahlung|Restbetrag|15\s?%|\banticipo\b|\bseñal\b|\bsaldo\b|deposit|acompte|solde|\bsinal\b|adiantamento/i,lang);
  const record=fixture(lang),current=notificationForBooking(record,'payment_requested','synthetic-current-'+lang);
  assert.equal(current.templateRevision,TEMPLATE_REVISION);
  const email=prepareCustomerEnvelope(current,links,origin);assert.match(email.text,/560[.,]00/);
  assert.ok(email.text.includes('Europe/Zurich')||email.text.includes('Zürich')||email.text.includes('Zúrich'));
 }
 const old:any=fixture('de');old.termsVersion='kraken-agb-2026-11-26-v2';old.payment={amountDueNowCents:8400,amountPaidCents:8400,remainingBalanceCents:47600};
 const snapshot=notificationForBooking(old,'deposit_received','synthetic-old');assert.equal(snapshot.templateRevision,LEGACY_TEMPLATE_REVISION);
 assert.match(prepareCustomerEnvelope(snapshot,links,origin).text,/Anzahlung/);
});
test('reminders and after-work invoices show real deadlines and do not reuse upfront instructions',()=>{
 for(const lang of ['de','es']){
  const record=fixture(lang),reminder=notificationForBooking(record,'payment_requested','synthetic-reminder-'+lang,{paymentReminder:true});
  const email=prepareCustomerEnvelope(reminder,links,origin);
  assert.match(email.subject,lang==='de'?/Erinnerung/:/Recordatorio/);assert.match(email.text,/2026.*10:00/);
  const extra=notificationForBooking(record,'payment_requested','synthetic-extra-'+lang,{extraPayment:true,paymentDueAt:'2026-12-17T09:00:00.000Z',pricing:{currency:'CHF',totalRappen:60500,paidRappen:56000,vatRappen:0,transactionRappen:4500}});
  const message=prepareCustomerEnvelope(extra,links,origin);
  assert.match(message.subject,lang==='de'?/Zusätzliche Rechnung/:/Factura adicional/);
  assert.match(message.text,/45[.,]00/);assert.match(message.text,lang==='de'?/7 Tagen/:/7 días/);
  assert.doesNotMatch(message.text,lang==='de'?/spätestens 48 Stunden vor Arbeitsbeginn/:/como máximo, 48 horas antes del inicio/);
 }
});
test('an overestimate is described as a pending refund credit without claiming provider acceptance',()=>{
 const record:any=fixture('es');record.payment.amountPaidCents=56000;record.workSettlement={finalTotalCents:50000};
 const n=notificationForBooking(record,'booking_updated','synthetic-credit'),email=prepareCustomerEnvelope(n,links,origin);
 assert.equal(n.renderData.pricing.refundCreditRappen,6000);assert.match(email.text,/Reembolso previsto · todavía no iniciado/);assert.match(email.text,/60[.,]00/);
 const bad=structuredClone(n);bad.renderData.pricing.refundCreditRappen=1;assert.throws(()=>prepareCustomerEnvelope(bad,links,origin),/specific reviewed message|Inconsistent refund credit/);
 record.payment.refundedCents=6000;
 const refunded=notificationForBooking(record,'booking_updated','synthetic-credit-refunded');assert.equal(refunded.renderData.pricing.refundCreditRappen,undefined);
 assert.doesNotThrow(()=>prepareCustomerEnvelope(refunded,links,origin));
});
test('Resend schedules exactly once with a future timestamp and cancels only a validated provider identifier',async()=>{
 const instant=Date.parse('2026-11-28T10:00:00Z'),calls:any[]=[];
 const adapter=createResendEmailAdapter('synthetic-not-real',async(url,init)=>{calls.push({url,body:init?.body?JSON.parse(String(init.body)):null});return Response.json({id:'10000000-0000-4000-8000-000000000001'});},()=>instant);
 const message={from:{name:'Kraken',email:'kai@krakenpfm.ch'},to:'synthetic@example.test',subject:'Synthetic only',text:'Synthetic only',html:'<p>Synthetic only</p>',idempotencyKey:'synthetic-event'};
 await adapter.schedule(message,'2026-11-30T10:00:00.000Z');assert.equal(calls[0].body.scheduled_at,'2026-11-30T10:00:00.000Z');
 await adapter.cancel('10000000-0000-4000-8000-000000000001');assert.ok(String(calls[1].url).endsWith('/cancel'));
 await assert.rejects(adapter.cancel('../foreign'),{code:'EMAIL_SCHEDULE_ID_INVALID'});
 await assert.rejects(adapter.schedule(message,'2026-12-05T10:00:00.000Z'),{code:'EMAIL_SCHEDULE_INVALID'});assert.equal(calls.length,2);
 let probes=0;const capability=createResendEmailAdapter('synthetic',async(url,init)=>{probes++;assert.equal(url,'https://api.resend.com/api-keys');assert.equal(init?.method,'GET');return Response.json({object:'list',data:[]});});
 assert.equal(await capability.canSchedule(),true);assert.equal(await capability.canSchedule(),true);assert.equal(probes,1);
 for(const status of [401,403,404]){const restricted=createResendEmailAdapter('synthetic',async()=>new Response(null,{status}));assert.equal(await restricted.canSchedule(),false);}
});
