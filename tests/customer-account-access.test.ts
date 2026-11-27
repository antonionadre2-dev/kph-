import test from 'node:test';
import assert from 'node:assert/strict';
import { createBookingService } from '../server/booking.ts';
import { customerAccountAccessJob, firebaseCustomerAccessLink } from '../server/customer-account-access.ts';
import { prepareCustomerEnvelope } from '../server/customer-notifications.ts';
import { labels } from '../integrations/email-collection/index.mjs';

const origin='https://kraken.example',authDomain='vivid-kite-477020-h6.firebaseapp.com',now=Date.parse('2026-11-27T10:00:00Z');
const accountLink=`https://${authDomain}/__/auth/action?mode=signIn&oobCode=synthetic-not-a-real-code&apiKey=synthetic-key`;
function fixture(options:any={}) {
  let time=now,links=0;const jobs=new Map<string,any>(),sent:any[]=[];
  const store:any={async get(){throw new Error('Account access cannot read an arbitrary booking');},async claimMail(id:string){const job=jobs.get(id);if(!job||job.status!=='queued'||job.dueAt>time)return null;job.status='sending';job.attempts=(job.attempts||0)+1;return structuredClone(job);},async prepareMail(id:string,message:any){if(options.storageFailure)throw new Error('synthetic persistence failure');jobs.get(id).prepared=structuredClone(message);return structuredClone(message);},async finishMail(id:string,status:string,_provider:any,retryAt:number){Object.assign(jobs.get(id),{status,...(retryAt?{dueAt:retryAt}:{})});},async isEmailSuppressed(){return options.suppressed===true;}};
  const service=createBookingService({store,tokenSecret:'synthetic-booking-secret-over-thirty-two-bytes',origin,clock:()=>time,emailCollectionEnabled:options.enabled!==false,sendEmail:async(message:any)=>{sent.push(structuredClone(message));assert.deepEqual(jobs.values().next().value.prepared,message,'Envelope must be durable before transport');if(options.unknown)throw new Error('synthetic uncertain transport');if(options.rejected&&sent.length===1)throw Object.assign(new Error('documented rejection'),{definitelyNotSent:true,retryable:true});return {id:'synthetic-provider-accepted'};}});
  service.setCustomerAccessLink(async(email,language)=>{links++;assert.equal(email,'client@example.test');assert.equal(language,options.language||'es');if(options.linkFailure)throw Object.assign(new Error('EMAIL_PREPARATION_FAILED'),{definitelyNotSent:true});return accountLink;});
  const job=customerAccountAccessJob({draftId:'synthetic-saved-draft',email:'client@example.test',language:options.language||'es',idempotencyKey:'synthetic-key-000000000',now});jobs.set(job.id,structuredClone(job));
  return {service,jobs,sent,job,links:()=>links,advance:(ms:number)=>time+=ms};
}

test('all six Firebase account links use the selected collection locale and never invent a provider expiry',async()=>{
  for(const language of ['de','en','es','fr','it','pt']) {
    const f=fixture({language});
    assert.equal(f.job.notification.renderData.expiresAt,undefined);
    assert.equal('message' in f.job,false,'No secret link exists in an unclaimed job');
    await f.service.runDue({jobId:f.job.id,limit:1});
    assert.equal(f.sent.length,1);assert.equal(f.links(),1);
    assert.equal(f.sent[0].headers['Content-Language'],language);assert.ok(f.sent[0].text.includes(accountLink));
    assert.match(f.sent[0].html,/email-magic_link\.png/);
    assert.ok(!f.sent[0].text.includes(`${labels[language].until}:`),'Queue delivery TTL is not a login-code expiry');
    assert.doesNotMatch(f.sent[0].text,/15\s*(?:min|Minuten|minutes|minutos|minuti)/);
    await f.service.runDue({jobId:f.job.id,limit:1});assert.equal(f.links(),1);assert.equal(f.sent.length,1);
    assert.throws(()=>prepareCustomerEnvelope({...f.job.notification,renderData:{...f.job.notification.renderData,expiresAt:new Date(now+900000).toISOString()}},{primary:accountLink,secondary:`${origin}/kontakt?lang=${language}`},origin),/do not invent an expiry/);
  }
});

test('Firebase access remains branded and durable even before the general collection rollout',async()=>{
  const f=fixture({enabled:false});await f.service.runDue({jobId:f.job.id,limit:1});
  assert.equal(f.sent.length,1);assert.match(f.sent[0].html,/email-magic_link\.png/);assert.equal(f.jobs.get(f.job.id).status,'sent');
});

test('suppressed or expired requests never generate an account link, and unknown deliveries never regenerate one',async()=>{
  for(const options of [{suppressed:true},{expired:true}]) {
    const f=fixture(options);if(options.expired)f.advance(15*60000);
    await f.service.runDue({jobId:f.job.id,limit:1});assert.equal(f.links(),0);assert.equal(f.sent.length,0);assert.equal(f.jobs.get(f.job.id).status,'cancelled');
  }
  const f=fixture({unknown:true});await f.service.runDue({jobId:f.job.id,limit:1});await f.service.runDue({jobId:f.job.id,limit:1});
  assert.equal(f.links(),1);assert.equal(f.sent.length,1);assert.equal(f.jobs.get(f.job.id).status,'delivery_unknown');
});

test('provider-declined retries cannot outlive the delivery TTL and do not regenerate the Firebase code',async()=>{
  const f=fixture({rejected:true});await f.service.runDue({jobId:f.job.id,limit:1});assert.equal(f.jobs.get(f.job.id).status,'queued');
  f.advance(15*60000);await f.service.runDue({jobId:f.job.id,limit:1});
  assert.equal(f.jobs.get(f.job.id).status,'cancelled');assert.equal(f.links(),1);assert.equal(f.sent.length,1);
  const noLink=fixture({linkFailure:true});await noLink.service.runDue({jobId:noLink.job.id,limit:1});assert.equal(noLink.sent.length,0);assert.equal(noLink.jobs.get(noLink.job.id).status,'failed');
});

test('Firebase returns its signed URL unchanged and only from an authorized HTTPS action handler',async()=>{
  let settings:any,recipient:any;
  const auth={async generateSignInWithEmailLink(email:string,value:any){recipient=email;settings=value;return accountLink;}};
  assert.equal(await firebaseCustomerAccessLink(auth,'client@example.test','fr',origin,authDomain),accountLink);
  assert.equal(recipient,'client@example.test');assert.deepEqual(settings,{url:`${origin}/customer-access?lang=fr`,handleCodeInApp:true});
  for(const value of [accountLink.replace('https:','http:'),accountLink.replace(authDomain,`${authDomain}.evil.test`),accountLink.replace('/__/auth/action','/arbitrary'),`https://user:secret@${authDomain}/__/auth/action`]) {
    await assert.rejects(firebaseCustomerAccessLink({generateSignInWithEmailLink:async()=>value},'client@example.test','es',origin,authDomain),{message:'EMAIL_PREPARATION_FAILED',definitelyNotSent:true});
  }
});

test('an interrupted durable preparation never attempts transport or regenerates a code automatically',async()=>{
  const f=fixture({storageFailure:true});await f.service.runDue({jobId:f.job.id,limit:1});await f.service.runDue({jobId:f.job.id,limit:1});
  assert.equal(f.sent.length,0);assert.equal(f.links(),1);assert.equal(f.jobs.get(f.job.id).status,'failed');
});
