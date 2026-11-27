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
    payment:{status:'not_started',amountDueNowCents:Math.round(quote.totalCents!*.15),amountPaidCents:0,remainingBalanceCents:quote.totalCents!},
  };
}
const asText=(value:unknown)=>JSON.stringify(value);

test('calculator review uses source clauses and conditional guarantee, with separate cancellation and rescheduling',()=>{
  for(const language of ['de','en','es','pt','it','fr']) {
    const fixed=bookingTermsPresentation(language,{selection:defaultSelection('endOfTenancy')});
    assert.deepEqual(fixed.sections.map(section=>section.clause),[4,4,7,7,9]);
    assert.ok(fixed.sections.every(section=>section.href.endsWith('#agb-'+section.clause)));
    const hourly=bookingTermsPresentation(language,{selection:{...defaultSelection('endOfTenancy'),mode:'hourly'}});
    assert.equal(hourly.sections.filter(section=>section.clause===9).length,0);
    assert.doesNotMatch(asText(fixed),/pricing-moving|bestehende Anzahlung|Versicherungsnachweis|erfahrenes Team/);
  }
});

test('actual confirmation date produces a calendar-day deadline, capped before the real appointment without changing financial data',()=>{
  const record=fixture(),before=asText(record),summary=bookingTermsPresentation('es',{booking:record});
  assert.equal(asText(record),before);
  assert.match(summary.rows.find(row=>row.label===termsPresentationText('es','depositDue'))!.value,/4 de diciembre de 2026/);
  assert.match(summary.rows.find(row=>row.label===termsPresentationText('es','depositAmount'))!.value,/84/);
  assert.equal(summary.rows.some(row=>row.label===termsPresentationText('es','invoiceDue')),false,'no invented invoice date');
  record.scheduling.date='2026-12-02';
  const early=bookingTermsPresentation('es',{booking:record});
  assert.match(early.rows.find(row=>row.label===termsPresentationText('es','depositDue'))!.value,/2 de diciembre de 2026.*10:00.*antes/);
  record.confirmedAt=Date.parse('2027-03-26T20:00:00Z');record.scheduling.date='2027-04-10';
  assert.match(bookingTermsPresentation('en',{booking:record}).rows.find(row=>row.label===termsPresentationText('en','depositDue'))!.value,/29 March 2027/);
});

test('request, confirmed order and verified payment remain distinct; paid deposits are not shown as still due',()=>{
  const record:any=fixture();delete record.confirmedAt;record.scheduling.status='requested';record.status='awaiting_confirmation';
  const request=bookingTermsPresentation('es',{booking:record});
  assert.match(request.state,/Solicitud recibida/);
  assert.equal(request.rows.find(row=>row.label===termsPresentationText('es','depositDue'))!.value,termsPresentationText('es','deadlinePending'));
  record.confirmedAt=Date.parse('2026-12-01T11:00:00Z');record.scheduling.status='held';record.status='confirmed';
  assert.equal(bookingTermsPresentation('es',{booking:record}).state,termsPresentationText('es','confirmed'));
  record.mode='live';record.payment.status='paid';record.payment.amountPaidCents=record.payment.amountDueNowCents;
  const paid=bookingTermsPresentation('es',{booking:record});
  assert.equal(paid.state,termsPresentationText('es','paid'));
  assert.equal(paid.rows.some(row=>row.label===termsPresentationText('es','depositDue')),false);
  record.payment.status='test_paid';
  assert.equal(bookingTermsPresentation('es',{booking:record}).state,termsPresentationText('es','testPaid'));
});

test('materials reflect the actual choice and regular cleaning has no invented payment schedule',()=>{
  const record:any=fixture();record.selection=defaultSelection('regular');
  let summary=bookingTermsPresentation('es',{booking:record});
  assert.equal(summary.rows.find(row=>row.label===termsPresentationText('es','materials'))!.value,termsPresentationText('es','materialsClient'));
  assert.equal(summary.rows.find(row=>row.label===termsPresentationText('es','depositDue'))!.value,termsPresentationText('es','regularSchedule'));
  record.selection.materials=true;
  summary=bookingTermsPresentation('es',{booking:record});
  assert.equal(summary.rows.find(row=>row.label===termsPresentationText('es','materials'))!.value,termsPresentationText('es','materialsKraken'));
  record.selection=defaultSelection('windows');
  assert.equal(bookingTermsPresentation('es',{booking:record}).rows.find(row=>row.label===termsPresentationText('es','materials'))!.value,termsPresentationText('es','materialsPending'));
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

test('both real email render paths retain all six locales and include recorded dates, materials, accepted version and amount',()=>{
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
    assert.ok(envelope.text.includes(termsPresentationText(language,'materialsPending')));
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
