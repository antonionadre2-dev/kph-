import test from 'node:test';
import assert from 'node:assert/strict';
import {getTermsUiCopy,searchTermsSections,termsPdfHref,type SearchableTermsSection} from '../src/legal/terms-tools.ts';
const sections:SearchableTermsSection[]=[
 {number:4,title:'4. Anzahlung und Zahlung',blocks:[{type:'paragraph',text:'4.1 Die Anzahlung beträgt 15 % und ist innert 3 Tagen zahlbar.'}]},
 {number:7,title:'7. Stornierung und Verschiebung',blocks:[{type:'paragraph',text:'7.2 Es gelten die folgenden Fristen:'},{type:'list',items:['bis 48 Stunden: kostenlos;','weniger als 48 und bis 12 Stunden: 50 %;','weniger als 12 Stunden: 100 %.']}]},
 {number:9,title:'9. Umzugsreinigung mit Abnahmegarantie',blocks:[{type:'paragraph',text:'Übergabe innert 72 Stunden. Eigentümer müssen Zugang gewähren.'}]},
];
test('terms search covers headings, paragraphs and list items without changing the document',()=>{
 const original=JSON.stringify(sections);
 assert.deepEqual(searchTermsSections(sections,'Anzahlung').map(row=>row.number),[4]);
 assert.deepEqual(searchTermsSections(sections,'50 %').map(row=>row.id),['agb-7']);
 assert.deepEqual(searchTermsSections(sections,'ubergabe').map(row=>row.number),[9]);
 assert.equal(searchTermsSections(sections,'48   Stunden').length,1);
 assert.equal(searchTermsSections(sections,'not present').length,0);
 assert.equal(searchTermsSections(sections,'   ').length,0);
 assert.equal(JSON.stringify(sections),original);
});
test('terms search treats markup-looking input as ordinary text and keeps small excerpts',()=>{
 assert.deepEqual(searchTermsSections(sections,'<script>alert(1)</script>'),[]);
 const large=[{number:17,title:'17. Contact',blocks:[{type:'paragraph' as const,text:'before '.repeat(80)+'needle '+'after '.repeat(80)}]}];
 const [result]=searchTermsSections(large,'NEEDLE');assert.match(result.snippet,/needle/);assert.ok(result.snippet.length<=192);assert.equal(result.id,'agb-17');
});
test('every locale has localized document tools and the safe German fallback',()=>{
 for(const locale of ['de','en','es','pt','it','fr']){
  const copy=getTermsUiCopy(locale);for(const value of [copy.search,copy.clear,copy.noResults,copy.download,copy.print,copy.mobileContents,copy.german,copy.seoTitle,copy.seoDescription])assert.ok(value.length>2);
  assert.equal(copy.groups.length,3);assert.equal(copy.quickMobile.length,3);assert.ok(copy.quickMobile.every(label=>label.length<=13));assert.ok(copy.resultCount(1));assert.ok(copy.resultCount(2));
 }
 assert.deepEqual(getTermsUiCopy('unavailable'),getTermsUiCopy('de'));
});
test('PDF links always name an immutable version and a supported locale',()=>{
 assert.equal(termsPdfHref('kraken-agb-2026-11-26-v2','es'),'/legal/terms/kraken-agb-2026-11-26-v2/es.pdf');
 assert.equal(termsPdfHref('kraken-2026-11-24','bad'),'/legal/terms/kraken-2026-11-24/de.pdf');
 assert.throws(()=>termsPdfHref('../../private','es'));
 assert.throws(()=>termsPdfHref('version?token=x','es'));
});
