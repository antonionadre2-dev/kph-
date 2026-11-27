import test from 'node:test';
import assert from 'node:assert/strict';
import { senderMailbox, suppressionScope, applyVerifiedSuppression } from '../server/booking-email-suppression.ts';

const domain='krakenpfm.ch';
function fixture(){
  const calls:any[]=[],events=new Map<string,string>();
  const store={async emailEventProcessed(id:string,fingerprint:string){const old=events.get(id);if(old&&old!==fingerprint)throw Object.assign(new Error('EVENT_CONFLICT'),{code:'EVENT_CONFLICT'});return Boolean(old);},async suppressEmail(...args:any[]){calls.push(['booking',...args]);},async finishEmailEvent(id:string,fingerprint:string){events.set(id,fingerprint);calls.push(['event',id]);}};
  const recovery={async suppressEmail(...args:any[]){calls.push(['recovery',...args]);}};
  const apply=(event:any,id='svix_synthetic',fingerprint='exact-body-hash')=>applyVerifiedSuppression({event,id,fingerprint,domain,store,recovery,now:1000});
  return {calls,events,apply,recovery};
}

test('scope is explicit and matches the configured sender, without suffix or subdomain wildcards',()=>{
  assert.equal(senderMailbox('Kraken PFM <Kai@KRAKENPFM.CH>'),'kai@krakenpfm.ch');
  assert.equal(senderMailbox('kai@krakenpfm.ch'),'kai@krakenpfm.ch');
  for(const value of ['a@krakenpfm.ch, b@other.ch','Kraken <kai@krakenpfm.ch> trailing','Kraken <kai@krakenpfm.ch>\r\nBcc:x@other.ch','x@krakenpfm.ch.evil.test','x@sub.krakenpfm.ch']) {
    assert.equal(suppressionScope({BOOKING_EMAIL_FROM:value,RESEND_WEBHOOK_SENDER_DOMAIN:domain}),null,value);
  }
  assert.equal(suppressionScope({BOOKING_EMAIL_FROM:'Kraken <kai@krakenpfm.ch>'}),null);
  assert.equal(suppressionScope({BOOKING_EMAIL_FROM:'Kraken <kai@krakenpfm.ch>',RESEND_WEBHOOK_SENDER_DOMAIN:'*.krakenpfm.ch'}),null);
  assert.equal(suppressionScope({BOOKING_EMAIL_FROM:'Kraken <kai@krakenpfm.ch>',RESEND_WEBHOOK_SENDER_DOMAIN:domain}),domain);
});

test('signed foreign-domain events never read or mutate Kraken recipients, event IDs or suppressions',async()=>{
  const f=fixture();
  for(const from of ['other@other.test','x@krakenpfm.ch.other.test','Other <x@sub.krakenpfm.ch>']) {
    // Even an unusable foreign recipient must not be processed or persisted.
    assert.deepEqual(await f.apply({type:'email.complained',data:{from,to:'foreign data'}}),{received:true,ignored:true});
  }
  assert.equal(f.events.size,0);assert.deepEqual(f.calls,[]);
});

test('only valid single-recipient events suppress both queues, once per exact event',async()=>{
  const f=fixture(),event={type:'email.complained',data:{from:'Kraken PFM <kai@krakenpfm.ch>',to:['Client@Example.test']}};
  assert.deepEqual(await f.apply(event),{received:true});
  assert.deepEqual(f.calls,[['booking','client@example.test','complaint',1000],['recovery','client@example.test','complaint'],['event','svix_synthetic']]);
  await f.apply(event);assert.equal(f.calls.length,3);
  await assert.rejects(f.apply(event,'svix_synthetic','different-body'),{code:'EVENT_CONFLICT'});
  for(const data of [{to:['client@example.test']},{from:'x@krakenpfm.ch',to:[]},{from:'x@krakenpfm.ch',to:['a@example.test','b@example.test']},{from:'x@krakenpfm.ch',to:['a@example.test\r\nBcc:b@example.test']}])await assert.rejects(f.apply({type:'email.bounced',data},'different-id'),{code:'INVALID_EMAIL_EVENT'});
  assert.equal(f.calls.length,3);
});

test('a partial suppression failure is not acknowledged as completed and can retry safely',async()=>{
  const f=fixture();let fail=true;
  f.recovery.suppressEmail=async(...args:any[])=>{if(fail)throw new Error('synthetic storage outage');f.calls.push(['recovery',...args]);};
  const event={type:'email.bounced',data:{from:'kai@krakenpfm.ch',to:['client@example.test']}};
  await assert.rejects(f.apply(event));assert.equal(f.events.size,0);
  fail=false;await f.apply(event);assert.equal(f.events.size,1);
  assert.equal(f.calls.filter(call=>call[0]==='event').length,1);
});
