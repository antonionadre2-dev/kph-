import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bookingText } from '../src/booking/uiCopy.ts';
import { frictionText } from '../src/booking/calculatorFriction.ts';
import { writeCalculatorDraft } from '../src/booking/calculatorDraft.ts';
import { defaultSelection } from '../src/booking/pricing.ts';
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
