import test from 'node:test';
import assert from 'node:assert/strict';
import { postcodeLocalities } from '../src/booking/postcodeLocation';
test('postcode locality accepts only matching typed postcode results and removes canton suffixes',()=>{
 assert.deepEqual(postcodeLocalities('8200',[{kind:'postcode',label:'CH-8200 Schaffhausen (SH)'},{kind:'postcode',label:'8200 Schaffhausen, SH'},{kind:'address',label:'8200 Wrong street'},{kind:'postcode',label:'3011 Bern'}]),[{postalCode:'8200',locality:'Schaffhausen'}]);
 assert.deepEqual(postcodeLocalities('0800',[{kind:'postcode',label:'0800 Fake'}]),[]);
 assert.deepEqual(postcodeLocalities('8200',[{kind:'postcode',label:'8200 <script>x</script>'},{kind:'postcode',label:'8200 A'}]),[]);
});
test('postcode results preserve ambiguity for the visitor instead of guessing a city',()=>{
 assert.deepEqual(postcodeLocalities('8000',[{kind:'postcode',label:'8000 Zürich'},{kind:'postcode',label:'8000 Other locality'}]),[{postalCode:'8000',locality:'Zürich'},{postalCode:'8000',locality:'Other locality'}]);
 assert.deepEqual(postcodeLocalities('3011',[{kind:'postcode',label:'8200 Schaffhausen'}]),[],'A stale prior query cannot overwrite Ort');
 assert.deepEqual(postcodeLocalities('3011',null),[]);
});
