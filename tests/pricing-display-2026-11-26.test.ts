import test from 'node:test';
import assert from 'node:assert/strict';
import {calculatePrice,defaultSelection} from '../src/booking/pricing.ts';
import {pricingUiText} from '../src/booking/pricingUiCopy.ts';
import {bookingLineLabel,bookingText} from '../src/booking/uiCopy.ts';
import {cleanSelection} from '../integrations/recovery/policy.mjs';
import {renderRecoveryEmail} from '../integrations/recovery/emails.mjs';
import {renderEmail,catalogs,brandForLanguage,labels} from '../integrations/email-collection/index.mjs';
import {getTermsTranslation} from '../components/legal/terms.ts';

const languages=['de','en','es','pt','it','fr'];
test('extra-area cap and moving price lines have complete customer translations',()=>{
 const capped=calculatePrice({...defaultSelection('endOfTenancy'),rooms:1.5,areaM2:70}).lines.find(l=>l.id==='eot-extra-area')!;
 const moving=calculatePrice({...defaultSelection('moving'),team:2,additionalHelpers:1,estimatedHours:4});
 assert.equal(capped.totalCents,11000);
 for(const language of languages){
  const cap=bookingLineLabel(language,capped);
  assert.match(cap,/20/);assert.match(cap,/110/);assert.match(cap,/560/);assert.doesNotMatch(cap,/\{[^}]+\}/);
  for(const line of moving.lines){const label=bookingLineLabel(language,line);assert.doesNotMatch(label,/\{[^}]+\}|^line\./);if(language!=='de')assert.notEqual(label,line.label);}
  for(const code of ['moving_photos_required','moving_fixed_scope','moving_distance_required','moving_rooms_over_limit','eot_excess_area_over_limit'])assert.doesNotMatch(bookingText(language,'notice.'+code),/^notice\.|\{[^}]+\}/);
 }
 assert.match(bookingLineLabel('es',capped),/^Superficie adicional:/);
});
test('one-off regular cleaning is not relabelled as deep cleaning',()=>{
 const regular=calculatePrice({...defaultSelection('regular'),frequency:'once'}).lines[0];
 const deep=calculatePrice({...defaultSelection('regular'),cleaningKind:'deep',frequency:'once',hours:3}).lines[0];
 assert.equal(bookingLineLabel('es',regular),'Limpieza regular');
 assert.equal(bookingLineLabel('es',deep),'Limpieza profunda');
});
test('saving moving and combined cleaning preserves quantities while excluding injected prices and contact fields',()=>{
 const selection={...defaultSelection('moving'),mode:'fixed',distanceKm:10,rooms:2.5,cleaning:{...defaultSelection('endOfTenancy'),areaM2:70,address:'private address',totalCents:1},sameAddress:true,totalCents:1,customerEmail:'private@example.com'};
 const saved=cleanSelection(selection);
 assert.equal(calculatePrice(saved).totalCents,129000);
 assert.equal(saved.totalCents,undefined);assert.equal(saved.customerEmail,undefined);
 assert.equal(saved.cleaning.address,undefined);assert.equal(saved.cleaning.totalCents,undefined);
});
test('saved emails never render a hypothetical tax comparison, including legacy snapshots',()=>{
 for(const language of languages){
  const message=renderRecoveryEmail({draft:{language,selection:{service:'moving'},quote:{totalCents:34500,priceType:'estimate',vatComparisonCents:2795}},kind:'saved',resumeUrl:'https://kraken.example/offerte#resume=safe',unsubscribeUrl:'https://kraken.example/unsubscribe',publicBaseUrl:'https://kraken.example'});
  assert.ok(message.text.includes(pricingUiText(language,'estimate')));
  assert.ok(message.text.includes(pricingUiText(language,'finalPrice')));
  assert.doesNotMatch(message.html+message.text,/8[,.]1|27[,.]95|hypothet|Nettopreis/i);
 }
});
test('all six current legal documents display VAT status, the deposit clause and a readable date',()=>{
 for(const language of languages){const terms=getTermsTranslation(language);assert.match(terms.sections[2].content,/100['.,]000/);assert.match(terms.lastUpdated,/2026/);assert.doesNotMatch(terms.lastUpdated,/pricing-moving|kraken-agb/);assert.match(terms.sections[3].content,/15\s*%/);}
});
test('collection price summaries distinguish hourly estimates and omit VAT amounts/comparisons',()=>{
 for(const language of languages){
  const data={language,customer:{firstName:'TEST'},service:'moving',reference:'TEST-PRICING',pricing:{currency:'CHF',totalRappen:34500,paidRappen:0,vatRappen:0,priceType:'estimate'},links:{primary:'https://kraken.example/offerte'}};
  const result=renderEmail('quote_saved',data,{mode:'preview',catalogs,brand:brandForLanguage(language,'https://kraken.example')});
  assert.ok(result.text.includes(labels[language].estimatedTotal));
  assert.ok(result.text.includes(pricingUiText(language,'finalPrice')));
  assert.doesNotMatch(result.text+result.html,/8[,.]1|hypothet|Nettopreis/i);
 }
});
