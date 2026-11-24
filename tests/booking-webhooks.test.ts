import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { Webhook } from 'svix';
import { verifyPayrexxWebhook, verifyResendWebhook } from '../server/booking-webhooks.ts';

test('Payrexx verifies exact original bytes with the separate webhook key',()=>{
  const raw=Buffer.from('{ "transaction": {"referenceId":"booking-r1"} }');
  const secret='webhook-test-secret';const signature=crypto.createHmac('sha256',secret).update(raw).digest('hex');
  assert.equal(verifyPayrexxWebhook(raw,signature,secret).transaction.referenceId,'booking-r1');
  assert.throws(()=>verifyPayrexxWebhook(Buffer.from(JSON.stringify(JSON.parse(raw.toString()))),signature,secret),{code:'INVALID_SIGNATURE'});
  assert.throws(()=>verifyPayrexxWebhook(raw,signature,'different-api-key'),{code:'INVALID_SIGNATURE'});
  assert.throws(()=>verifyPayrexxWebhook(JSON.parse(raw.toString()),signature,secret),{code:'RAW_BODY_REQUIRED'});
});
test('Resend Svix signature accepts only the exact raw body and enforces replay timestamps',()=>{
  const secret=`whsec_${Buffer.from('fake-test-secret-thirty-two-characters').toString('base64')}`;
  const webhook=new Webhook(secret),id='msg_test_signed_event';
  const raw=Buffer.from(JSON.stringify({type:'email.bounced',data:{to:['test@example.test']}}));
  const timestamp=new Date();
  const headers={'svix-id':id,'svix-timestamp':String(Math.floor(timestamp.getTime()/1000)),'svix-signature':webhook.sign(id,timestamp,raw.toString())};
  assert.equal(verifyResendWebhook(raw,headers,secret).event.type,'email.bounced');
  assert.throws(()=>verifyResendWebhook(Buffer.from(raw.toString()+' '),headers,secret),{code:'INVALID_SIGNATURE'});
  assert.throws(()=>verifyResendWebhook(raw,{...headers,'svix-signature':'v1,invalid'},secret),{code:'INVALID_SIGNATURE'});
  const old=new Date(Date.now()-10*60000);
  assert.throws(()=>verifyResendWebhook(raw,{'svix-id':id,'svix-timestamp':String(Math.floor(old.getTime()/1000)),'svix-signature':webhook.sign(id,old,raw.toString())},secret),{code:'INVALID_SIGNATURE'});
  assert.throws(()=>verifyResendWebhook(JSON.parse(raw.toString()),headers,secret),{code:'RAW_BODY_REQUIRED'});
});
