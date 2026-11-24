import test from 'node:test';
import assert from 'node:assert/strict';
import { loadContactConfig, searchContactAddresses, calculateContactRoute, ContactApiError } from '../components/contact/contact-api';

function mock(context:any, replies:any[]) {
  const original = globalThis.fetch;
  const calls:{path:string,init:RequestInit}[]=[];
  globalThis.fetch = (async (path:any,init:any) => {calls.push({path:String(path),init});const next=replies.shift();return new Response(typeof next.body==='string'?next.body:JSON.stringify(next.body),{status:next.status??200,headers:{'Content-Type':'application/json'}});}) as typeof fetch;
  context.after(()=>{globalThis.fetch=original;});
  return calls;
}
const candidate={id:'address:1',label:'Bahnhofstrasse 29, 8200 Schaffhausen',coordinates:[8.634,47.697] as [number,number],kind:'address' as const};

test('public contact requests keep address data out of URLs and preserve abort/locale/direction',async context=>{
  const calls=mock(context,[{body:{geocoding:true,routing:{available:true,provider:'openrouteservice'},coverage:'CH'}},{body:{candidates:[candidate]}},{body:{route:{distance_m:2400,duration_s:300,geometry:{type:'LineString',coordinates:[[8.65,47.69],[8.634,47.697]]}}}}]);
  const signal=new AbortController().signal;
  assert.equal((await loadContactConfig(signal)).routing.available,true);
  assert.deepEqual(await searchContactAddresses('Bahnhofstrasse 29, 8200 Schaffhausen','es',signal),[candidate]);
  assert.equal((await calculateContactRoute(candidate,'inbound',signal)).distance_m,2400);
  assert.deepEqual(calls.map(call=>call.path),['/api/contact/config','/api/contact/geocode','/api/contact/route']);
  assert.deepEqual(JSON.parse(String(calls[1].init.body)),{query:candidate.label,language:'es'});
  assert.deepEqual(JSON.parse(String(calls[2].init.body)),{coordinates:candidate.coordinates,direction:'inbound'});
  for(const call of calls){assert.equal(call.init.signal,signal);assert.equal(call.init.cache,'no-store');assert.equal(call.init.credentials,'same-origin');assert.ok(!('Authorization' in (call.init.headers as object)));}
});

test('a missing provider, failed service or malformed route never returns fabricated metrics',async context=>{
  mock(context,[{status:503,body:{error:{code:'not_configured'}}},{status:200,body:'<html>failed proxy</html>'},{body:{route:{distance_m:1,duration_s:1,geometry:{type:'LineString',coordinates:[[8,47]]}}}},{status:429,body:{error:{code:'rate_limited'}}}]);
  const signal=new AbortController().signal;
  await assert.rejects(()=>calculateContactRoute(candidate,'outbound',signal),(error:any)=>error instanceof ContactApiError&&error.code==='not_configured');
  await assert.rejects(()=>searchContactAddresses('8001','es',signal),{code:'unavailable'});
  await assert.rejects(()=>calculateContactRoute(candidate,'inbound',signal),{code:'unavailable'});
  await assert.rejects(()=>searchContactAddresses('8001','es',signal),{code:'rate_limited'});
});
