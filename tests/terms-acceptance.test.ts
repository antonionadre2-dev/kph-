import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {createBookingService,validateBookingRequest,BOOKING_TERMS_VERSION} from '../server/booking.ts';
import {defaultSelection,calculatePrice,PRICING_VERSION} from '../src/booking/pricing.ts';
import {createTermsAcceptance,currentTermsDocuments,termsMetadata} from '../src/legal/terms-registry.ts';
const now=Date.parse('2026-11-27T10:00:00Z');
const input=(extra:any={})=>{const selection=defaultSelection('regular');return {selection,pricingVersion:PRICING_VERSION,acceptedTotalCents:calculatePrice(selection).totalCents,termsAccepted:true,termsVersion:BOOKING_TERMS_VERSION,language:'es',customer:{name:'Local QA',email:'qa@synthetic.invalid',phone:'+41000000000',address:'Testweg 1',postalCode:'8203',city:'Schaffhausen'},requestedDate:'2026-12-03',requestedTime:'10:15',notes:'',idempotencyKey:'terms_qa_0123456789',...extra};};
function fixture(){const records=new Map<string,any>();const clone=(v:any)=>structuredClone(v);const store:any={records,async get(id:string){return clone(records.get(id));},async create(_key:string,_fingerprint:string,record:any){records.set(record.bookingId,clone(record));return clone(record);},async mutate(id:string,fn:any){const value=fn(clone(records.get(id)));records.set(id,clone(value));return clone(value);},async mutateWithMail(id:string,fn:any){return store.mutate(id,fn);}};return {records,service:createBookingService({store,tokenSecret:'synthetic-terms-secret-for-local-tests-only',origin:'https://example.invalid',mode:'test',clock:()=>now})};}
test('server records authoritative version, selected language, immutable hashes and server acceptance time',async()=>{
 const {service,records}=fixture();const booking=await service.create(input({termsAcceptedAt:1,termsAcceptance:{version:'forged',acceptedAt:1}}));const record=records.get(booking.bookingId);
 assert.equal(record.termsAcceptedAt,now);assert.deepEqual(record.termsAcceptance,createTermsAcceptance('es',now));assert.equal(record.termsAcceptance.documentSha256,currentTermsDocuments().es.sha256);assert.notEqual(record.termsAcceptance.documentSha256,record.termsAcceptance.germanSha256);assert.equal(record.payment.amountPaidCents,0);assert.equal(booking.status,'awaiting_confirmation');assert.equal(booking.canCheckout,false);
});
test('stale or tampered acceptance cannot silently become an acceptance of the new document',()=>{
 for(const values of [{termsVersion:'kraken-2026-11-26-pricing-moving'},{termsAccepted:false},{termsHash:'0'.repeat(64)},{termsHash:currentTermsDocuments().fr.sha256}])assert.throws(()=>validateBookingRequest(input(values),now),{code:'TERMS_REQUIRED'});
 assert.equal(validateBookingRequest(input({termsHash:currentTermsDocuments().es.sha256}),now).termsHash,currentTermsDocuments().es.sha256);
});
test('reading an older booking preserves its version and acceptance time without inventing historical hashes',async()=>{
 const {service,records}=fixture();const booking=await service.create(input());const old=records.get(booking.bookingId);old.termsVersion='kraken-2026-11-24';old.termsAcceptedAt=123456;delete old.termsAcceptance;
 const result=await service.read(booking.bookingId,booking.publicToken);assert.equal(result.termsVersion,'kraken-2026-11-24');assert.equal(result.termsAcceptance,undefined);assert.equal(records.get(booking.bookingId).termsAcceptedAt,123456);assert.ok(termsMetadata(result.termsVersion,'es')?.pdfUrl.includes('/kraken-2026-11-24/es.pdf'));
});
test('all accepted document metadata hashes match the canonical public source, including archived versions',async()=>{
 const versions=['kraken-2026-11-24','kraken-2026-11-25-fixed-scope','kraken-2026-11-26-pricing-moving',BOOKING_TERMS_VERSION];
 for(const version of versions)for(const language of ['de','en','es','pt','it','fr']){
  const metadata=termsMetadata(version,language)!;const document=JSON.parse(await readFile(new URL('../public'+metadata.documentUrl,import.meta.url),'utf8'));const {sha256,...canonical}=document;assert.equal(createHash('sha256').update(JSON.stringify(canonical)).digest('hex'),metadata.sha256);assert.equal(sha256,metadata.sha256);assert.equal(document.sections.length,17);
 }
 assert.equal(termsMetadata('__proto__','es'),null);
});
