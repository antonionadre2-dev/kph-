import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { bookingTermsPresentation, termsPresentationText } from '../src/booking/termsPresentation.ts';
import { CURRENT_TERMS_VERSION } from '../src/legal/terms-version.ts';
import { createTermsAcceptance } from '../src/legal/terms-registry.ts';
import { defaultSelection, calculatePrice } from '../src/booking/pricing.ts';
import { renderBookingEmail } from '../server/booking-email.ts';
import { notificationForBooking, prepareCustomerEnvelope, selectedEmailSnapshot } from '../server/customer-notifications.ts';
import BookingTermsSummary from '../components/BookingTermsSummary.tsx';

function fixture(language='es') {
  const selection=defaultSelection('endOfTenancy'),quote=calculatePrice(selection);
  return { bookingId:'synthetic-terms-booking',reference:'K-SYNTHETIC',language,languageSnapshot:selectedEmailSnapshot(language),mode:'test',status:'confirmed',
    selection,quote,quoteRevision:1,termsVersion:CURRENT_TERMS_VERSION,termsAcceptance:createTermsAcceptance(language,Date.parse('2026-11-27T08:00:00Z')),
    termsAcceptedAt:Date.parse('2026-11-27T08:00:00Z'),confirmedAt:Date.parse('2026-12-01T11:00:00Z'),
    scheduling:{status:'confirmed',date:'2026-12-05',time:'10:00'},
    customer:{name:'Synthetic Customer',email:'synthetic@example.test',address:'Testweg 1',postalCode:'8203',city:'Schaffhausen'},
    payment:{model:'full_prepayment',billingMode:'single',status:'not_started',totalDueCents:quote.totalCents!,amountDueNowCents:quote.totalCents!,amountPaidCents:0,outstandingCents:quote.totalCents!,paymentDueAt:'2026-12-03T09:00:00.000Z'},
  };
}
const asText=(value:unknown)=>JSON.stringify(value);

test('calculator review is four concise rows with the actual amount and a conditional guarantee',()=>{
  for(const language of ['de','en','es','pt','it','fr']) {
    const selection=defaultSelection('endOfTenancy'), quote=calculatePrice(selection);
    const fixed=bookingTermsPresentation(language,{selection,quote});
    assert.equal(fixed.rows.length,4);
    assert.match(fixed.rows[0].value,/560/);
    assert.deepEqual(fixed.sections.map(section=>section.clause),[4,7,9]);
    assert.ok(fixed.sections.every(section=>section.href.endsWith('#agb-'+section.clause)));
    const hourly=bookingTermsPresentation(language,{selection:{...selection,mode:'hourly'},quote});
    assert.equal(hourly.sections.filter(section=>section.clause===9).length,0);
    const html=renderToStaticMarkup(React.createElement(BookingTermsSummary,{language,selection,quote,compact:true}));
    assert.equal((html.match(/<dd/g)||[]).length,4);
    assert.equal((html.match(/<a /g)||[]).length,1);
    assert.ok(!html.includes(fixed.sections[0].text),'compact review does not reproduce the full clause');
    assert.doesNotMatch(asText(fixed),/pricing-moving|Anzahlung|Restbetrag|Versicherungsnachweis|erfahrenes Team/);
  }
});

test('presentation displays the persisted Zurich payment deadline and never recomputes a charge',()=>{
  const record=fixture(),before=asText(record),summary=bookingTermsPresentation('es',{booking:record});
  assert.equal(asText(record),before);
  assert.match(summary.rows[1].value,/3 de diciembre de 2026.*10:00/);
  assert.match(summary.rows[0].value,/560/);
  record.payment.paymentDueAt='2027-03-29T18:00:00.000Z';
  assert.match(bookingTermsPresentation('en',{booking:record}).rows[1].value,/29 March 2027.*20:00/);
});

test('request, confirmation and verified payment are distinct and no money is charged during request',()=>{
  const record:any=fixture();delete record.confirmedAt;record.scheduling.status='requested';record.status='awaiting_confirmation';delete record.payment.paymentDueAt;
  const request=bookingTermsPresentation('es',{booking:record});
  assert.match(request.state,/Solicitud recibida/);
  assert.equal(request.rows[1].value,termsPresentationText('es','paymentSchedule'));
  record.confirmedAt=Date.parse('2026-12-01T11:00:00Z');record.scheduling.status='held';record.status='confirmed';
  assert.equal(bookingTermsPresentation('es',{booking:record}).state,termsPresentationText('es','confirmed'));
  record.mode='live';record.payment.status='paid';record.payment.amountPaidCents=record.payment.totalDueCents;
  const paid=bookingTermsPresentation('es',{booking:record});
  assert.equal(paid.state,termsPresentationText('es','paid'));
  assert.equal(paid.rows[1].value,termsPresentationText('es','paidNotice'));
  record.payment.status='test_paid';
  assert.equal(bookingTermsPresentation('es',{booking:record}).state,termsPresentationText('es','testPaid'));
});

test('regular cleaning shows a confirmed monthly total, never an invented four-week conversion',()=>{
  const record:any=fixture();record.selection=defaultSelection('regular');
  let summary=bookingTermsPresentation('es',{booking:record});
  assert.equal(summary.rows[0].value,termsPresentationText('es','monthlyPending'));
  record.payment.billingMode='monthly';record.payment.totalDueCents=67500;record.payment.billingPeriod={start:'2026-12-01',end:'2026-12-31',visits:5};
  summary=bookingTermsPresentation('es',{booking:record});
  assert.match(summary.rows[0].value,/675/);
  assert.equal(summary.rows[3].value,termsPresentationText('es','guaranteeNone'));
});

test('old contracts show their recorded version archive and are never assigned the new payment clauses',()=>{
  const record:any=fixture();record.termsVersion='kraken-2026-11-26-pricing-moving';delete record.termsAcceptance;
  const summary=bookingTermsPresentation('es',{booking:record});
  assert.equal(summary.legacy,true);assert.equal(summary.sections.length,0);
  assert.ok(summary.links.some(link=>link.href.includes('/'+record.termsVersion+'/es.pdf')));
  assert.doesNotMatch(asText(summary),/kraken-agb-2026-11-26-v2|3 días|72 horas/);
  const html=renderToStaticMarkup(React.createElement(BookingTermsSummary,{language:'es',booking:record}));
  assert.match(html,/target="_blank"/);assert.match(html,/noopener noreferrer/);
});

test('both real email render paths retain all six locales and include recorded dates, accepted version and full amount',()=>{
  for(const language of ['de','en','es','pt','it','fr']) {
    const record=fixture(language),before=asText(record);
    const legacy=renderBookingEmail(record,'request','https://kraken.example','synthetic-token');
    assert.ok(legacy.text.includes(CURRENT_TERMS_VERSION));
    assert.ok(legacy.text.includes(`/legal/terms/${CURRENT_TERMS_VERSION}/${language}.pdf`));
    assert.match(legacy.html,new RegExp('<html lang="'+language+'"'));
    const notification=notificationForBooking(record,'booking_confirmed','synthetic-confirmation-'+language);
    const envelope=prepareCustomerEnvelope(notification,{primary:'https://kraken.example/offerte#access=synthetic',secondary:'https://kraken.example/kontakt'},'https://kraken.example');
    assert.ok(envelope.text.includes(CURRENT_TERMS_VERSION));
    assert.ok(envelope.text.includes(`/legal/terms/${CURRENT_TERMS_VERSION}/${language}.pdf`));
    assert.ok(envelope.text.includes(bookingTermsPresentation(language,{booking:record}).rows[0].value));
    assert.match(envelope.html,new RegExp('<html lang="'+language+'"'));
    assert.equal(asText(record),before,'rendering never mutates the financial or contractual snapshot');
    assert.equal(notification.renderData.termsSummary.language,language);
    assert.equal(notification.renderData.termsSummary.sections[0].text,bookingTermsPresentation(language,{booking:record}).sections[0].text);
  }
});

test('email legal snapshots reject language mismatch, unsafe links and injected HTML is escaped',()=>{
  const record=fixture(),notification=notificationForBooking(record,'booking_confirmed','synthetic-safety');
  const links={primary:'https://kraken.example/offerte#access=synthetic',secondary:'https://kraken.example/kontakt'};
  const changed=structuredClone(notification);changed.renderData.termsSummary.language='de';
  assert.throws(()=>prepareCustomerEnvelope(changed,links,'https://kraken.example'),/legal snapshot language/);
  const unsafe=structuredClone(notification);unsafe.renderData.termsSummary.links[0].href='https://other.example/terms';
  assert.throws(()=>prepareCustomerEnvelope(unsafe,links,'https://kraken.example'),/versioned terms link/);
  const injected=structuredClone(notification);injected.renderData.termsSummary.rows[0].value='<script>unsafe()</script>';
  const envelope=prepareCustomerEnvelope(injected,links,'https://kraken.example');
  assert.ok(envelope.html.includes('&lt;script&gt;unsafe()&lt;/script&gt;'));
  assert.ok(!envelope.html.includes('<script>unsafe()</script>'));
});
