import test from 'node:test';
import assert from 'node:assert/strict';
import { bookingRequestLanguage, communicationLanguageToRestore, communicationPreferenceDiffers } from '../src/booking/communicationLanguage';

test('reading a saved booking never changes the interface language, even with no explicit query',()=>{
  assert.equal(communicationLanguageToRestore('es','?booking=synthetic'), null);
  assert.equal(communicationLanguageToRestore('es','?booking=synthetic&lang=de'),null);
  assert.equal(communicationLanguageToRestore('es','?booking=synthetic&hl=fr'),null);
  assert.equal(communicationLanguageToRestore('es','?lang=unsupported'),null);
  for (const language of ['de','en','es','fr','it','pt']) {
    assert.equal(communicationLanguageToRestore('en',`/${language}/offerte?booking=synthetic`),null);
    assert.equal(communicationLanguageToRestore('en',`/offerte?lang=${language}&booking=synthetic`),null);
  }
  assert.equal(communicationLanguageToRestore(undefined,'?booking=synthetic'),null);
  assert.equal(communicationLanguageToRestore('corrupt','?booking=synthetic'),null);
});

test('new requests use explicit prefix/query choice before the interface and default to German',()=>{
  for (const language of ['de','en','es','fr','it','pt']) {
    const path=language==='de'?'/offerte?lang=de':`/${language}/offerte`;
    assert.equal(bookingRequestLanguage('en',path),language);
    assert.equal(bookingRequestLanguage('en',`/quote?service=end&lang=${language}`),language);
    assert.equal(bookingRequestLanguage(language,'/offerte'),language);
  }
  assert.equal(bookingRequestLanguage('de-CH','/offerte'),'de');
  assert.equal(bookingRequestLanguage(undefined,'/offerte'),'de');
  assert.equal(bookingRequestLanguage('invalid','/offerte'),'de');
  assert.equal(bookingRequestLanguage('de','/fr/offerte?lang=en'),'fr');
});

test('a different page language offers an explicit choice without treating canonical aliases as changes',()=>{
  assert.equal(communicationPreferenceDiffers('de','es'),true);
  assert.equal(communicationPreferenceDiffers('es','es'),false);
  assert.equal(communicationPreferenceDiffers('de-CH','de'),false);
  assert.equal(communicationPreferenceDiffers('pt-BR','pt'),false);
  assert.equal(communicationPreferenceDiffers('invalid','es'),false);
});
