/** Local HTTP checks; never submit a message to a configured recipient. */
import { request } from 'node:http';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { getContactCopy } from '../src/contact/contact-copy.ts';
import { footerText } from '../components/home/footerTranslations.ts';
import { publicHref } from '../src/routing/site-paths.ts';

const origin = new URL(process.argv[2] || 'http://127.0.0.1:3031');
assert.ok(['127.0.0.1','localhost'].includes(origin.hostname),'Local preview only');
const call = (path, method='GET', data, extra={}) => new Promise((resolve,reject) => {
  const body=data===undefined?undefined:JSON.stringify(data);
  const req=request({hostname:origin.hostname,port:origin.port,path,method,headers:{Host:'krakenpfm.ch',...(body?{'Content-Type':'application/json',Origin:'https://krakenpfm.ch'}:{}),...extra}},res=>{
    let text='';res.setEncoding('utf8');res.on('data',part=>text+=part);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:text}));
  });req.on('error',reject);req.end(body);
});
const escape=value=>value.replace(/&/g,'&amp;').replace(/'/g,'&#x27;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const pages=[];
for(const language of ['de','en','es','fr','it','pt']){
  const path=publicHref('/kontakt',language),r=await call(path),copy=getContactCopy(language);
  assert.equal(r.status,200,path);
  assert.ok(r.body.includes('rel="canonical" href="https://krakenpfm.ch'+path+'"'));
  assert.equal((r.body.match(/hreflang=/g)||[]).length,7);
  assert.ok(r.body.includes('data-contact-header="true"'));
  assert.ok(r.body.includes('Properties &amp; Facilities Management'));
  assert.ok(r.body.includes('Seewadelstrasse 3'));
  assert.ok(r.body.includes('seociety.ch'));
  assert.ok(!r.body.includes(escape(footerText(language,'visits'))),'No office invitation on contact');
  assert.doesNotMatch(r.body,/contact-(?:exterior|interior|marker)\.webp|kr-geography|kr-gallery|Europe\/Zurich/);
  assert.ok(r.body.includes('action="/api/contact/messages"'));
  assert.ok(r.body.includes('href="'+publicHref('/quote',language)+'"'));
  assert.ok(r.body.includes('href="'+publicHref('/gdpr',language)+'"'));
  const schema=JSON.parse(r.body.match(/id="kraken-page-schema" type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];
  assert.equal(schema.filter(node=>node['@type']==='LocalBusiness').length,1);
  assert.equal(schema.filter(node=>node['@type']==='ContactPage').length,1);
  const faq=schema.find(node=>node['@type']==='FAQPage');
  assert.deepEqual(faq.mainEntity.map(item=>({question:item.name,answer:item.acceptedAnswer.text})),copy.faqs);
  for(const item of copy.faqs)for(const text of Object.values(item))assert.ok(r.body.includes(escape(text)));
  assert.match(r.headers['content-security-policy-report-only'],/script-src[^;]*https:\/\/challenges.cloudflare.com/);
  assert.match(r.headers['content-security-policy-report-only'],/frame-src[^;]*https:\/\/challenges.cloudflare.com/);
  pages.push({path,status:200,faqs:copy.faqs.length,alternates:7});
}
const home=await call('/');assert.ok(home.body.includes(escape(footerText('de','visits'))),'Other footers remain unchanged');
const config=await call('/api/contact/intake/config');
assert.deepEqual(JSON.parse(config.body),{available:false,challenge:null},'Refuse to exercise a configured intake');
assert.match(config.headers['cache-control'],/no-store/);
const fields={name:'Synthetic local QA',email:'qa@example.test',phone:'',channel:'whatsapp',service:'unsure',postalCode:'8200',message:'Synthetic local HTTP validation only.',language:'es',website:'',idempotencyKey:randomUUID(),turnstileToken:'local-unused'};
const unavailable=await call('/api/contact/messages','POST',fields);assert.equal(unavailable.status,503);assert.equal(JSON.parse(unavailable.body).accepted,false);
const invalid=await call('/api/contact/messages','POST',{...fields,postalCode:'123'});assert.equal(invalid.status,400);assert.equal(JSON.parse(invalid.body).error.code,'validation');
const otherOrigin=await call('/api/contact/messages','POST',fields,{Origin:'https://other.example'});assert.equal(otherOrigin.status,403);
const oversized=await call('/api/contact/messages','POST',{...fields,message:'x'.repeat(30_000)});assert.equal(oversized.status,400);assert.match(oversized.body,/invalid_request/);assert.ok(!oversized.body.includes('Synthetic'));
const maintenance=await call('/api/contact/maintenance');assert.equal(maintenance.status,403);
for(const filename of ['coverage-region.svg','coverage-region-mobile.svg']){const r=await call('/kraken-contact/assets/'+filename);assert.equal(r.status,200);assert.match(r.headers['content-type'],/image\/svg\+xml/);assert.doesNotMatch(r.body,/<script|foreignObject|(?:href|xlink:href)=["']https?:\/\//i);}
const result={checkedAt:new Date().toISOString(),origin:origin.origin,productionChanged:false,pages,configuredReceiverExercised:false,formUnavailableHonest:true,noContactOfficeInvitation:true,phoneOptional:true,messageStatuses:{unconfigured:503,invalid:400,origin:403,oversized:400,maintenanceUnauthorized:403},faqMatchesSchema:true,staticMaps:2};
if(process.argv[3])writeFileSync(process.argv[3],JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
