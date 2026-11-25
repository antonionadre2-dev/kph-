import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renderEmail} from '../src/render.mjs';
import {demoData} from '../src/demo-data.mjs';
import {languages} from '../src/labels.mjs';

const catalogs=Object.fromEntries(languages.map(language=>[language,JSON.parse(readFileSync(new URL(`../content/catalog.${language}.json`,import.meta.url),'utf8'))]));
const options={catalogs,mode:'production',assetBaseUrl:'https://assets.example.com/kraken',brand:{privacyUrl:'https://example.com/privacy'}};
function fixture(id='booking_confirmed',language='es',service='end') {
  const data=demoData(id,language,service);
  data.event={id:`fixture-${id}`,type:catalogs[language][id].event};
  data.links={primary:'https://example.com/booking?lang='+language,secondary:'https://example.com/help?lang='+language,unsubscribe:'https://example.com/unsubscribe'};
  return data;
}

test('production requires the saved language, while preview may default to German',()=>{
  const data=fixture();delete data.language;
  assert.throws(()=>renderEmail('booking_confirmed',data,options),/language.*required/i);
  assert.equal(renderEmail('booking_confirmed',data,{catalogs}).language,'de');
  for(const invalid of ['','nl','es_CR','not-a-language']) {
    data.language=invalid;
    assert.throws(()=>renderEmail('booking_confirmed',data,options),/language/i);
  }
});

test('regional locale values select the matching complete catalog',()=>{
  const aliases={de:'de-CH',en:'en-GB',es:'es-ES',fr:'fr-CH',it:'it-CH',pt:'pt-BR'};
  for(const [language,locale] of Object.entries(aliases)) {
    const data=fixture('booking_confirmed',language);
    const canonical=renderEmail('booking_confirmed',data,options);
    data.language=locale;
    const result=renderEmail('booking_confirmed',data,options);
    assert.equal(result.language,language);
    assert.ok(result.html.includes(`<html lang="${language}">`));
    assert.equal(result.subject,canonical.subject);
    assert.equal(result.html,canonical.html);
  }
});

test('selected-language scope and extras must not disappear or render object strings',()=>{
  for(const [field,value] of [['frequency',{de:'Wöchentlich'}],['serviceScope',{de:'Wohnung reinigen'}],['extras',{de:['Backofen']}]] ) {
    const data=fixture('booking_confirmed','es','regular');data[field]=value;
    assert.throws(()=>renderEmail('booking_confirmed',data,options),new RegExp(`Missing es translation for ${field}`));
  }
  const data=fixture('booking_confirmed','es','regular');
  data.frequency={es:'Semanal'};data.serviceScope={es:'Cocina, baño y suelos'};data.extras={es:['Interior del horno']};
  const result=renderEmail('booking_confirmed',data,options);
  for(const expected of ['Semanal','Cocina, baño y suelos','Interior del horno']) assert.ok(result.html.includes(expected)&&result.text.includes(expected));
  assert.doesNotMatch(result.html,/\[object Object\]/);
});

test('raw localized service fields require a matching language declaration',()=>{
  const data=fixture('booking_confirmed','es','regular');data.frequency='Semanal';
  assert.throws(()=>renderEmail('booking_confirmed',data,options),/contentLanguage/);
  data.localizedContentLanguage='de';
  assert.throws(()=>renderEmail('booking_confirmed',data,options),/must match/);
  data.localizedContentLanguage='es';
  assert.ok(renderEmail('booking_confirmed',data,options).text.includes('Semanal'));
});

test('staff-written details are checked against the recipient language',()=>{
  for(const id of ['support_reply','issue_resolved','details_required']) {
    const data=fixture(id,'es');
    delete data.staffContentLanguage;
    assert.throws(()=>renderEmail(id,data,options),/contentLanguage/);
    data.staffContentLanguage='de';
    assert.throws(()=>renderEmail(id,data,options),/must match/);
    data.staffContentLanguage='es';
    assert.equal(renderEmail(id,data,options).language,'es');
  }
  const mapped=fixture('support_reply','es');delete mapped.staffContentLanguage;
  mapped.staffReply={es:'Hemos anotado tus indicaciones.',de:'Wir haben Ihre Hinweise notiert.'};
  const result=renderEmail('support_reply',mapped,options);
  assert.ok(result.text.includes('Hemos anotado tus indicaciones.'));
  assert.ok(!result.text.includes('Wir haben Ihre Hinweise notiert.'));
});
