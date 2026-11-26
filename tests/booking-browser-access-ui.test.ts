import test from 'node:test';
import assert from 'node:assert/strict';
import { createBrowserAccessUiGate } from '../src/booking/browserAccessUi.ts';

const id = 'synthetic_booking_12345678';
const token = 'a'.repeat(43);
test('only the first marked authenticated read may establish browser access',()=>{
  const gate=createBrowserAccessUiGate();
  assert.deepEqual(gate.headers(id,token),{Authorization:`Bearer ${token}`});
  gate.establish(id,token);
  assert.deepEqual(gate.headers(id,token),{Authorization:`Bearer ${token}`,'X-Kraken-Browser-Access':'establish'});
  for(let index=0;index<25;index++)assert.deepEqual(gate.headers(id,token),{Authorization:`Bearer ${token}`});
  gate.establish(id,token);
  assert.equal(gate.headers(id,token)['X-Kraken-Browser-Access'],undefined,'replayed effects cannot renew the cookie through polling');
});
test('a mark cannot establish access for another booking or an invalid supplied capability',()=>{
  const gate=createBrowserAccessUiGate();gate.establish(id,token);
  assert.equal(gate.headers('another_synthetic_booking',token)['X-Kraken-Browser-Access'],undefined);
  assert.equal(gate.headers(id,token)['X-Kraken-Browser-Access'],'establish');
  gate.establish('invalid/id',token);assert.equal(gate.headers('invalid/id',token)['X-Kraken-Browser-Access'],undefined);
  gate.establish('new_synthetic_booking','short');assert.equal(gate.headers('new_synthetic_booking','short')['X-Kraken-Browser-Access'],undefined);
});
