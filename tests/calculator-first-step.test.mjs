import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bookingLineLabel, bookingText } from '../src/booking/uiCopy.ts';
import { frictionText } from '../src/booking/calculatorFriction.ts';
import { writeCalculatorDraft } from '../src/booking/calculatorDraft.ts';
import { calculatePrice, defaultSelection } from '../src/booking/pricing.ts';
import { pricingUiText } from '../src/booking/pricingUiCopy.ts';
import { publicHref } from '../src/routing/site-paths.ts';
import { accessRecoveryText } from '../src/booking/accessRecoveryCopy.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bundle = await build({
  stdin: { contents: `import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {I18nProvider} from './i18n.ts';import ServiceCalculatorPage from './components/ServiceCalculatorPage.tsx';export const render=(language)=>renderToStaticMarkup(<I18nProvider initialLanguage={language}><ServiceCalculatorPage onNavigate={()=>{}}/></I18nProvider>);`, resolveDir: root, loader: 'tsx' },
  bundle: true, platform: 'node', format: 'cjs', packages: 'external', write: false, loader: { '.css': 'empty' }, logLevel: 'warning',
});
const mod = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports);
function render(language, service, draft, fragment='') {
  const previous = globalThis.window;
  const store=()=>{const items=new Map();return{getItem:key=>items.get(key)||null,setItem:(key,value)=>items.set(key,value),removeItem:key=>items.delete(key)};};
  const local=store(),session=store();
  if(draft)writeCalculatorDraft(draft,local,session);
  const search=service?`?service=${service}`:'';
  globalThis.window = { location: { search, href: 'https://krakenpfm.ch'+publicHref('/quote',language)+search+fragment }, localStorage:local,sessionStorage:session };
  try { return mod.exports.render(language); } finally { if (previous) globalThis.window = previous; else delete globalThis.window; }
}
const escaped = text => text.replaceAll('&', '&amp;').replaceAll("'", '&#x27;');
test('end-of-tenancy is the first service and is selected by default or the existing end CTA alias', () => {
  for (const language of ['de', 'en', 'es', 'fr', 'it', 'pt']) for (const service of [undefined, 'end', 'end-of-tenancy']) {
    const html = render(language, service);
    const buttons = [...html.matchAll(/<button[^>]*class="kr-calc-service ([^"]*)"[^>]*>(.*?)<\/button>/gs)];
    assert.ok(buttons.length >= 5);
    assert.ok(buttons[0][1].includes('is-selected'));
    assert.ok(buttons[0][2].includes(escaped(bookingText(language, 'endOfTenancy'))));
    assert.ok(html.indexOf('id="kr-calc-postal"') < html.indexOf('class="kr-calc-services'));
    assert.ok(html.includes(escaped(frictionText(language, 'postcodeHint'))));
    assert.equal((html.match(/class="kr-calc-secondary-tools"/g) || []).length, 1);
    assert.ok(html.includes(escaped(frictionText(language, 'secondary'))));
    assert.doesNotMatch(html, /kr-calc-save-progress|type="submit"[^>]*>[^<]*Payrexx|TWINT|Visa|Mastercard/);
    assert.match(html, /wa\.me\/41774505705/);
  }
});

test('entry recovery stays in a closed disclosure and missing/proof links never mount a new booking form',()=>{
  for(const language of ['de','en','es','fr','it','pt']) {
    const entry=render(language,'end');
    const disclosure=entry.match(/<details\b[^>]*class="kr-calc-access-tools"[^>]*>/)?.[0];
    assert.ok(disclosure);assert.doesNotMatch(disclosure,/\bopen/);
    assert.ok(entry.includes(escaped(accessRecoveryText(language,'title'))));
    const missing=render(language,'end&booking=synthetic_booking_12345678');
    assert.match(missing,/kr-booking-access-recovery/);
    assert.doesNotMatch(missing,/data-step="[012]"|kr-calc-final-consent|class="kr-calc-access-tools"/);
    const proof=render(language,'end&booking=synthetic_booking_12345678',undefined,'#recover=synthetic-proof');
    assert.match(proof,/kr-booking-access-recovery/);
    assert.doesNotMatch(proof,/data-step="[012]"|synthetic-proof/);
    const personal=render(language,'end&booking=synthetic_booking_12345678',undefined,'#access='+ 'a'.repeat(43));
    assert.match(personal,/kr-calc-loading/);
    assert.doesNotMatch(personal,/data-step="[012]"|kr-booking-access-recovery|a{43}/);
  }
});

test('a reloaded review restores typed form values with legal links in new tabs and consent unchecked',()=>{
  const day=new Date(Date.now()+7*86400000).toISOString().slice(0,10);
  const draft={choice:'endOfTenancy',selection:{...defaultSelection('endOfTenancy'),rooms:3.5,areaM2:80},wizardStep:2,customer:{name:'Synthetic QA',email:'qa@example.test',phone:'+41000000000',address:'Synthetic test 1',postalCode:'8203',city:'Schaffhausen'},requestedDate:day,requestedTime:'10:15',notes:'Synthetic note'};
  for(const language of ['de','en','es','fr','it','pt']) {
    const html=render(language,'end',draft);
    assert.match(html,/data-step="2"/);
    assert.match(html,/Synthetic QA/);assert.match(html,/qa@example.test/);assert.match(html,/Synthetic test 1/);assert.match(html,/10:15/);
    for(const page of ['/terms','/gdpr'])assert.ok(html.includes(`href="${publicHref(page,language)}" target="_blank" rel="noopener noreferrer"`),`${language}:${page}`);
    const consent=html.match(/<input[^>]*id="kr-calc-final-consent"[^>]*>/)?.[0];
    assert.ok(consent);assert.doesNotMatch(consent,/checked/);
  }
  const different=render('es','windows',draft);
  assert.match(different,/data-step="0"/);assert.doesNotMatch(different,/Synthetic QA/);
  const booking=render('de','end&booking=synthetic',draft);
  assert.doesNotMatch(booking,/Synthetic QA/,'An existing booking URL cannot import an unrelated local form');
});
test('an explicit different service is preserved and an unknown intent is not silently booked as end-of-tenancy', () => {
  for (const language of ['de', 'en', 'es', 'fr', 'it', 'pt']) for (const service of ['windows', 'regular', 'deep', 'moving']) {
    const html = render(language, service);
    const selected = [...html.matchAll(/<button[^>]*class="kr-calc-service is-selected"[^>]*>(.*?)<\/button>/gs)].map(match => match[1]);
    assert.equal(selected.length, 1);
    assert.ok(selected[0].includes(escaped(bookingText(language, service))));
  }
  const unsupported = render('de', 'invented-service');
  assert.ok(unsupported.includes(bookingText('de', 'unsupportedIntent')));
  assert.doesNotMatch(unsupported, /class="kr-calc-service is-selected"/);
});

test('moving renders an unchanged hourly estimate with full payment after confirmation in all six languages',()=>{
  const selected={...defaultSelection('moving'),estimatedHours:3};
  const quote=calculatePrice(selected);
  assert.equal(quote.totalCents,34500);assert.equal(quote.minimumChargeCents,25000);assert.equal('depositBasisCents' in quote,false);
  for(const language of ['de','en','es','fr','it','pt']){
    const html=render(language,'moving',{choice:'moving',selection:selected,wizardStep:0});
    assert.match(html,/id="kr-calc-team"/);assert.match(html,/id="kr-calc-estimatedHours"/);
    assert.ok(html.includes(escaped(pricingUiText(language,'estimate'))));
    assert.ok(html.includes(escaped(pricingUiText(language,'finalPrice'))));
    assert.ok(html.includes(escaped(bookingText(language,'paymentBeforeService'))));
    assert.doesNotMatch(html,/Anzahlung|deposit|anticipo|sinal|acconto|acompte/i);
    assert.doesNotMatch(html,/id="kr-calc-distanceKm"|kr-calc-vat-card|vatComparison/);
    const description=html.match(/<textarea[^>]*id="kr-calc-moving-details"[^>]*>/)?.[0];
    assert.ok(description);assert.doesNotMatch(description,/required/);
  }
});

test('hourly cleaning shows an unchanged estimate and full prepayment without promising a fixed price',()=>{
  const cases=[
    {service:'regular',selected:{...defaultSelection('regular'),hours:4},amount:1500},
    {service:'end',selected:{...defaultSelection('endOfTenancy'),mode:'hourly',hours:4},amount:2025},
    {service:'construction',selected:{...defaultSelection('construction'),mode:'hourly',hours:5},amount:2880},
  ];
  for(const {service,selected,amount} of cases)for(const language of ['de','en','es','fr','it','pt']){
    const html=render(language,service,{choice:selected.service,selection:selected,wizardStep:0});
    const quote=calculatePrice(selected);
    assert.equal(quote.priceType,'estimate');
    assert.equal(quote.minimumChargeCents,Math.round(amount/0.15));assert.equal('depositBasisCents' in quote,false);
    assert.ok(html.includes(escaped(bookingText(language,'paymentBeforeService'))),`${language}/${service}`);
    assert.ok(html.includes(escaped(pricingUiText(language,'estimate'))));
    assert.doesNotMatch(html,/kr-calc-deposit-preview|Anzahlung|anticipo|Restbetrag/);
    if(service==='end')assert.equal(html.split(escaped(bookingText(language,'notice.hourly_no_handover_guarantee'))).length-1,1);
  }
});

test('fixed move exposes distance, stairs, extras and a request-only from price without assuming a route',()=>{
  for(const language of ['de','en','es','fr','it','pt']){
    const absent=render(language,'moving',{choice:'moving',selection:{...defaultSelection('moving'),mode:'fixed'},wizardStep:0});
    const distance=absent.match(/<input[^>]*id="kr-calc-distanceKm"[^>]*>/)?.[0];
    assert.ok(distance);assert.match(distance,/value=""/);assert.doesNotMatch(distance,/required/);
    assert.ok(absent.includes(escaped(pricingUiText(language,'distanceMissing'))));
    for(const name of ['originFloor','destinationFloor','largeWardrobes','disposalM3','boxes','originLift','destinationLift'])assert.ok(absent.includes(`id="kr-calc-${name}"`));
    const from=render(language,'moving',{choice:'moving',selection:{...defaultSelection('moving'),mode:'fixed',rooms:3.5,distanceKm:10},wizardStep:0});
    assert.ok(from.includes(escaped(pricingUiText(language,'fromHint'))));
    assert.ok(from.includes(escaped(pricingUiText(language,'fromLabel'))));
    assert.equal(calculatePrice({...defaultSelection('moving'),mode:'fixed',rooms:3.5,distanceKm:10}).totalCents,null);
    assert.doesNotMatch(from,/class="kr-calc-payment-card"/);
  }
});

test('combined move restores matching structured cleaning with the discount and unchecked booking consent',()=>{
  const selected={...defaultSelection('moving'),mode:'fixed',rooms:2.5,distanceKm:10,sameAddress:true,cleaning:{...defaultSelection('endOfTenancy'),rooms:2.5,areaM2:70}};
  assert.equal(calculatePrice(selected).totalCents,129000);
  const draft={choice:'moving',selection:selected,wizardStep:2,customer:{name:'Synthetic QA',email:'qa@example.test',phone:'+41000000000',address:'Synthetic test 1',postalCode:'8203',city:'Schaffhausen'},requestedDate:'2026-12-12',requestedTime:'10:15'};
  for(const language of ['de','en','es','fr','it','pt']){
    const html=render(language,'moving',draft);
    assert.match(html,/data-step="2"/);
    assert.ok(html.includes(escaped(bookingText(language,'line.moving-combo'))));
    assert.doesNotMatch(html,/<input[^>]*id="kr-calc-final-consent"[^>]*checked/);
    const fields=render(language,'moving',{...draft,wizardStep:0});
    assert.match(fields,/id="kr-calc-cleaning-areaM2"/);assert.match(fields,/id="kr-calc-sameAddress"[^>]*checked/);
    assert.ok(fields.includes(escaped(pricingUiText(language,'comboRoomsMatch'))));
  }
});

test('end-of-tenancy extra area is a separate capped line and deep cleaning keeps its own minimum',()=>{
  const selected={...defaultSelection('endOfTenancy'),rooms:1.5,areaM2:70};
  const quote=calculatePrice(selected),surcharge=quote.lines.find(line=>line.id==='eot-extra-area');
  assert.equal(quote.totalCents,56000);assert.equal(surcharge?.totalCents,11000);assert.equal(surcharge?.params?.capped,true);
  for(const language of ['de','en','es','fr','it','pt']){
    const html=render(language,'end',{choice:'endOfTenancy',selection:selected,wizardStep:0});
    assert.ok(html.includes(escaped(bookingLineLabel(language,surcharge))));
    assert.ok(html.includes(escaped(pricingUiText(language,'eotAreaRule',{area:50,rate:new Intl.NumberFormat(language==='de'?'de-CH':language,{style:'currency',currency:'CHF',minimumFractionDigits:2}).format(6),max:20}))));
    const deep=render(language,'deep');
    const hours=deep.match(/<input[^>]*id="kr-calc-hours"[^>]*>/)?.[0];
    assert.match(hours,/min="3"/);assert.match(hours,/value="3"/);
    const once=render(language,'regular',{choice:'regular',selection:{...defaultSelection('regular'),frequency:'once',hours:2.5},wizardStep:0});
    assert.match(once.match(/<input[^>]*id="kr-calc-hours"[^>]*>/)?.[0],/min="2.5"/);
  }
});

test('historical inventory-only moving drafts remain personal and never select an hourly tariff on reload',()=>{
  const html=render('de','moving',{choice:'moving',selection:{service:'moving',details:'Synthetic inventory'},wizardStep:0});
  assert.ok(html.includes(`<option value="" disabled="" selected="">${escaped(pricingUiText('de','chooseMovingMode'))}</option>`));
  assert.doesNotMatch(html,/id="kr-calc-estimatedHours"|kr-calc-deposit-preview/);
  assert.match(html,/Synthetic inventory/);
});

test('a recurring cleaning quote is explicitly per visit until Kraken confirms the actual month',()=>{
 for(const language of ['de','en','es','pt','it','fr']){
  const html=render(language,'regular');
  assert.ok(html.includes(escaped(bookingText(language,'perVisitPrice'))));
  assert.ok(html.includes(escaped(bookingText(language,'monthlyPaymentNote'))));
  assert.ok(!html.includes(escaped(bookingText(language,'monthlyTotal'))),'An unconfirmed monthly total must not be invented');
 }
});
