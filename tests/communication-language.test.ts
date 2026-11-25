import test from 'node:test';
import assert from 'node:assert/strict';
import { communicationLanguageToRestore, communicationPreferenceDiffers } from '../src/booking/communicationLanguage';

test('a saved Spanish booking restores on a German browser without an explicit URL choice',()=>{
  assert.equal(communicationLanguageToRestore('es','?booking=synthetic'), 'es');
  assert.equal(communicationLanguageToRestore('es','?booking=synthetic&lang=de'),null);
  assert.equal(communicationLanguageToRestore('es','?booking=synthetic&hl=fr'),null);
  assert.equal(communicationLanguageToRestore('es','?lang=unsupported'),'es');
  assert.equal(communicationLanguageToRestore(undefined,'?booking=synthetic'),null);
  assert.equal(communicationLanguageToRestore('corrupt','?booking=synthetic'),null);
});

test('a different page language offers an explicit choice without treating canonical aliases as changes',()=>{
  assert.equal(communicationPreferenceDiffers('de','es'),true);
  assert.equal(communicationPreferenceDiffers('es','es'),false);
  assert.equal(communicationPreferenceDiffers('de-CH','de'),false);
  assert.equal(communicationPreferenceDiffers('pt-BR','pt'),false);
  assert.equal(communicationPreferenceDiffers('invalid','es'),false);
});
