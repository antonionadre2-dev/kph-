import { CONSENT_VERSION, DRAFT_TTL_MS, HOUR_MS, SOCIAL_TTL_MS, STOP_REASONS, LANGUAGES, RecoveryError, normaliseCapture, normaliseEmail, reminderDue, socialEventShape, isServiceWindow, nextServiceWindow, cleanSelection, cleanGuidePreferences } from './policy.mjs';
import { renderRecoveryEmail } from './emails.mjs';

const encoder = new TextEncoder();
const safeId = /^[A-Za-z0-9_-]{16,128}$/;
const safeToken = /^[A-Za-z0-9_-]{43}$/;
const canonical = value => JSON.stringify(value && typeof value === 'object' ? Array.isArray(value) ? value.map(v => JSON.parse(canonical(v))) : Object.fromEntries(Object.keys(value).sort().map(key=>[key,JSON.parse(canonical(value[key]))])) : value);
const base64url = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
const equal = (a,b) => { if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false; let difference=0; for(let i=0;i<a.length;i++) difference|=a.charCodeAt(i)^b.charCodeAt(i); return difference===0; };
const randomId = () => base64url(crypto.getRandomValues(new Uint8Array(18)));

function checkedQuote(quote) {
  if (!quote || quote.currency !== 'CHF' || !Array.isArray(quote.lines) || typeof quote.pricingVersion !== 'string' ||
    (quote.totalCents !== null && (!Number.isSafeInteger(quote.totalCents) || quote.totalCents < 0)) || !Number.isSafeInteger(quote.subtotalCents) || quote.subtotalCents < 0 ||
    quote.taxStatus !== 'not_registered' || quote.vatCents !== 0) throw new RecoveryError('INVALID_SERVER_QUOTE',500);
  return {
    pricingVersion:quote.pricingVersion,currency:'CHF',service:quote.service,lines:quote.lines,
    subtotalCents:quote.subtotalCents,totalCents:quote.totalCents,taxStatus:'not_registered',vatCents:0,
    vatComparisonCents:quote.totalCents === null ? null : Math.round(quote.totalCents * 810 / 10_000),
    manualReviewReasons:Array.isArray(quote.manualReviewReasons) ? quote.manualReviewReasons : [],
    notices:Array.isArray(quote.notices) ? quote.notices : []
  };
}

/** No provider or database is configured implicitly. This module never calls an external API by itself. */
export function createRecoveryService({ store, sendEmail, calculatePrice, resolveBookingForRecovery, publicBaseUrl, sender, tokenSecret, clock=Date.now, requirePaidSocialProof=true }) {
  if (!store || typeof sendEmail !== 'function' || typeof calculatePrice !== 'function') throw new Error('RECOVERY_ADAPTERS_REQUIRED');
  const origin = new URL(publicBaseUrl).origin;
  if (!origin.startsWith('https://') || typeof sender !== 'string' || /[\r\n]/.test(sender) || !sender.includes('@')) throw new Error('VERIFIED_HTTPS_ORIGIN_AND_SENDER_REQUIRED');
  if (typeof tokenSecret !== 'string' || tokenSecret.length < 32) throw new Error('RANDOM_SERVER_TOKEN_SECRET_REQUIRED');
  const key = crypto.subtle.importKey('raw',encoder.encode(tokenSecret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const keyed = async text => base64url(await crypto.subtle.sign('HMAC',await key,encoder.encode(text)));
  const hash = async text => base64url(await crypto.subtle.digest('SHA-256',encoder.encode(text)));
  const accessFor = id => keyed(`access:${id}`);
  const unsubscribeFor = id => keyed(`unsubscribe:${id}`);

  async function authenticated(id, accessToken, includeStopped=false) {
    if (!safeId.test(id || '') || !safeToken.test(accessToken || '')) throw new RecoveryError('DRAFT_NOT_FOUND',404);
    const draft=await store.getDraft(id);
    if (!draft || draft.expiresAt <= clock() || !equal(await hash(accessToken),draft.accessHash)) throw new RecoveryError('DRAFT_NOT_FOUND',404);
    if (!includeStopped && draft.status !== 'active') throw new RecoveryError('DRAFT_CLOSED',409);
    return draft;
  }
  async function mutate(id, transform) {
    for(let i=0;i<6;i++) {
      const current=await store.getDraft(id);
      if(!current) return null;
      const next=transform({...current});
      if(!next) return current;
      if(await store.updateDraft(next,current.version)) return {...next,version:current.version+1};
    }
    throw new RecoveryError('RETRY_UPDATE',409);
  }
  function exposed(draft) {
    return { id:draft.id,email:draft.email,language:draft.language,selection:draft.selection,guidePreferences:cleanGuidePreferences(draft.guidePreferences),quote:draft.quote,
      stage:draft.stage,bookingId:draft.bookingId || null,reminderConsent:draft.reminderConsent,expiresAt:new Date(draft.expiresAt).toISOString() };
  }
  async function capture(input, context) {
    const value=normaliseCapture(input);
    if (!context || typeof context.rateKey !== 'string' || context.rateKey.length < 8 || context.rateKey.length > 512) throw new RecoveryError('CAPTURE_VERIFICATION_REQUIRED',403);
    const now=clock();
    const emailHash=await keyed(`email:${value.email}`);
    const idempotencyKey=await keyed(`capture:${value.idempotencyKey}`);
    const fingerprint=await hash(canonical({email:value.email,selection:value.selection,guidePreferences:value.guidePreferences,language:value.language,reminderConsent:value.reminderConsent,consentVersion:value.consentVersion}));
    let draft=await store.getByIdempotency(idempotencyKey);
    if(draft) {
      if (!equal(draft.fingerprint,fingerprint) || draft.expiresAt<=now || draft.status!=='active') throw new RecoveryError('IDEMPOTENCY_CONFLICT',409);
    } else {
      if(!await store.consumeRate(`email-hour:${emailHash}`,now,HOUR_MS,3) || !await store.consumeRate(`email-day:${emailHash}`,now,24*HOUR_MS,5) || !await store.consumeRate(await keyed(`origin:${context.rateKey}`),now,HOUR_MS,20)) throw new RecoveryError('TOO_MANY_REQUESTS',429);
      const suppressed=await store.getSuppression(emailHash);
      if(suppressed && ['bounced','complaint'].includes(suppressed.reason)) throw new RecoveryError('DELIVERY_UNAVAILABLE',422);
      let quote;
      try { quote=checkedQuote(await calculatePrice(value.selection)); }
      catch(cause) { if(cause instanceof RecoveryError) throw cause; throw new RecoveryError('INVALID_SELECTION'); }
      const id=randomId(); const accessToken=await accessFor(id);
      const reminderConsent=value.reminderConsent && !suppressed;
      const record={id,idempotencyKey,fingerprint,emailHash,email:value.email,language:value.language,selection:value.selection,guidePreferences:value.guidePreferences,quote,
        accessHash:await hash(accessToken),createdAt:now,expiresAt:now+DRAFT_TTL_MS,status:'active',stage:'quote',lastActivityAt:now,
        reminderConsent,consentVersion:value.consentVersion,consentedAt:value.reminderConsent ? now : null,
        consentSource:'quote-save-explicit',requestedEmailAt:now,version:1};
      const jobs=[{id:`${id}:saved`,kind:'saved',dueAt:now}];
      if(reminderConsent) for(const kind of ['reminder1','reminder2']) jobs.push({id:`${id}:${kind}`,kind,dueAt:reminderDue(kind,now)});
      draft=await store.createDraft(record,jobs);
      if(!equal(draft.fingerprint,fingerprint)) throw new RecoveryError('IDEMPOTENCY_CONFLICT',409);
    }
    const job=await store.getJob(`${draft.id}:saved`);
    return {id:draft.id,accessToken:await accessFor(draft.id),expiresAt:new Date(draft.expiresAt).toISOString(),mailStatus:job?.status || 'failed',remindersEnabled:draft.reminderConsent};
  }
  async function resolveBooking(draft) {
    if(!draft.bookingId) return {draft,resumeBooking:null};
    if(typeof resolveBookingForRecovery!=='function') throw new RecoveryError('BOOKING_RECOVERY_UNAVAILABLE',503);
    const state=await resolveBookingForRecovery(draft.bookingId,draft.email);
    if(!state || state.bookingId!==draft.bookingId || !/^[A-Za-z0-9_-]{20,512}$/.test(state.publicToken || '')) throw new RecoveryError('BOOKING_RECOVERY_UNAVAILABLE',503);
    if(state.email && normaliseEmail(state.email)!==draft.email) throw new RecoveryError('BOOKING_RECOVERY_UNAVAILABLE',503);
    const paid=['paid','test_paid','refunded','partially_refunded','chargeback'].includes(state.paymentStatus);
    const closed=['cancelled','completed','expired'].includes(state.status);
    if(draft.status==='active' && (paid || closed)) {
      await stopDraft(draft.id,paid ? 'paid' : state.status==='completed' ? 'completed' : 'cancelled');
      draft=await store.getDraft(draft.id);
    }
    const holdUntil=typeof state.holdExpiresAt==='number' ? state.holdExpiresAt : Date.parse(state.holdExpiresAt);
    const canCheckout=draft.status==='active' && state.mode==='live' && state.canCheckout===true && state.status==='confirmed' && Number.isFinite(holdUntil) && holdUntil>clock();
    const stage=canCheckout ? 'payment_ready' : 'awaiting_confirmation';
    if(draft.status==='active' && draft.stage!==stage) {
      draft=await mutate(draft.id,current=>current.status==='active' ? {...current,stage,lastActivityAt:canCheckout ? clock() : current.lastActivityAt} : null);
    }
    return {draft,resumeBooking:{bookingId:state.bookingId,publicToken:state.publicToken,canCheckout,status:state.status}};
  }
  async function read(id, token) {
    const resolved=await resolveBooking(await authenticated(id,token,true));
    return {...exposed(resolved.draft),resumeBooking:resolved.resumeBooking};
  }
  async function activity(id, token, input={}) {
    await authenticated(id,token);
    if(!input || typeof input!=='object' || Array.isArray(input)) throw new RecoveryError('INVALID_BODY');
    // An explicit site preference controls future messages. Changing it does not create consent or send mail.
    const language=input.language;
    if(language!==undefined && (typeof language!=='string' || !LANGUAGES.includes(language))) throw new RecoveryError('INVALID_LANGUAGE');
    const guidePreferences=input.guidePreferences===undefined ? undefined : cleanGuidePreferences(input.guidePreferences);
    let selection,quote;
    if(input.selection!==undefined) {
      selection=cleanSelection(input.selection);
      try { quote=checkedQuote(await calculatePrice(selection)); } catch { throw new RecoveryError('INVALID_SELECTION'); }
    }
    const next=await mutate(id,current=>current.status==='active' ? {...current,lastActivityAt:clock(),...(selection ? {selection,quote} : {}),...(language!==undefined ? {language} : {}),...(guidePreferences!==undefined ? {guidePreferences} : {})} : null);
    return {updated:next?.status==='active'};
  }
  async function withdrawConsent(id, token) {
    const draft=await authenticated(id,token,true);
    await store.suppress(draft.emailHash,'unsubscribed',clock());
    return {reminderConsent:false};
  }
  async function unsubscribe(id, token) {
    if (!safeId.test(id || '') || !safeToken.test(token || '') || !equal(token,await unsubscribeFor(id))) throw new RecoveryError('INVALID_UNSUBSCRIBE_LINK',404);
    const draft=await store.getDraft(id);
    // The same expired/deleted link remains a successful no-op, without revealing account state.
    if(draft) await store.suppress(draft.emailHash,'unsubscribed',clock());
    return {unsubscribed:true};
  }
  async function suppressEmail(email, reason) {
    if(!['unsubscribed','bounced','complaint'].includes(reason)) throw new RecoveryError('INVALID_STOP_REASON');
    await store.suppress(await keyed(`email:${normaliseEmail(email)}`),reason,clock());
  }
  async function stopDraft(id, reason) {
    if(!STOP_REASONS.includes(reason)) throw new RecoveryError('INVALID_STOP_REASON');
    await mutate(id,current=>({...current,status:reason,reminderConsent:false,stoppedAt:clock()}));
    await store.cancelQueued(id);
  }
  /** Server-only hook: a submitted request pauses reminders until confirmation is resolved. */
  async function attachCheckout(id, bookingId) {
    if(typeof bookingId!=='string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(bookingId)) throw new RecoveryError('INVALID_BOOKING');
    await mutate(id,current=>{
      if(current.bookingId && current.bookingId!==bookingId)throw new RecoveryError('BOOKING_ALREADY_LINKED',409);
      return current.status==='active' ? {...current,stage:'awaiting_confirmation',bookingId,lastActivityAt:clock()} : null;
    });
  }
  async function linkBooking({id,accessToken,email,bookingId,completed=false}) {
    const draft=await authenticated(id,accessToken);
    if(draft.email!==normaliseEmail(email)) throw new RecoveryError('RECOVERY_EMAIL_MISMATCH',409);
    await attachCheckout(id,bookingId);
    if(completed) await stopDraft(id,'completed');
    return {linked:true};
  }
  /** Call only with a state verified by the payment/booking backend, never with a browser payload. */
  async function recordBookingEvent(input) {
    const event=socialEventShape(input,clock(),requirePaidSocialProof);
    if(!event) return {published:false};
    const bookingKey=await keyed(`booking:${event.bookingId}`);
    const changed=await store.upsertActivity({...event,id:await keyed(`public-event:${event.bookingId}`),bookingKey});
    if(changed && input.draftId && input.mode==='live' && (input.paymentStatus==='paid' || ['completed','cancelled','refunded'].includes(input.status))) {
      await stopDraft(input.draftId,input.paymentStatus==='paid' ? 'paid' : input.status==='completed' ? 'completed' : 'cancelled');
    }
    return {published:changed && event.visible};
  }
  async function publicActivity(cursor=null, limit=10) {
    let after={time:clock()-SOCIAL_TTL_MS,id:''};
    if(cursor) {
      try {
        const value=JSON.parse(atob(cursor.replaceAll('-','+').replaceAll('_','/')));
        if(!Number.isSafeInteger(value[0]) || typeof value[1]!=='string' || !/^[A-Za-z0-9_-]{0,64}$/.test(value[1]) || value[0]>clock()+60_000) throw new Error();
        after={time:Math.max(after.time,value[0]),id:value[1]};
      } catch { throw new RecoveryError('INVALID_CURSOR'); }
    }
    const rows=await store.readActivity(clock(),after,Math.max(1,Math.min(20,Number.isSafeInteger(limit)?limit:10)));
    const events=rows.map(row=>({id:row.id,service:row.service,region:row.region,occurredAt:new Date(row.occurred_at).toISOString(),status:'confirmed'}));
    const last=rows.at(-1);
    return {events,cursor:last ? base64url(encoder.encode(JSON.stringify([last.occurred_at,last.id]))) : cursor};
  }
  async function runDue({limit=20}={}) {
    const now=clock();
    await store.markStaleSending(now);
    await store.purge(now);
    const report={sent:0,cancelled:0,deferred:0,failed:0,unknown:0};
    for(const candidate of await store.listDue(now,limit)) {
      if(!await store.claimJob(candidate.id,now)) continue;
      let draft=await store.getDraft(candidate.draft_id);
      const cancel=async()=>{await store.markJob(candidate.id,'sending',{status:'cancelled',lease_until:null});report.cancelled++;};
      if(!draft || draft.status!=='active' || draft.expiresAt<=now) {await cancel();continue;}
      if(draft.bookingId) {
        try { draft=(await resolveBooking(draft)).draft; }
        catch {
          await store.markJob(candidate.id,'sending',{status:'queued',due_at:now+HOUR_MS,lease_until:null,last_error_code:'BOOKING_STATUS_UNAVAILABLE'});report.deferred++;continue;
        }
        if(draft.status!=='active') {await cancel();continue;}
        if(candidate.kind!=='saved' && draft.stage!=='payment_ready') {
          await store.markJob(candidate.id,'sending',{status:'queued',due_at:now+HOUR_MS,lease_until:null});report.deferred++;continue;
        }
      }
      if(candidate.kind!=='saved') {
        if(!draft.reminderConsent || await store.isSuppressed(draft.emailHash)) {await cancel();continue;}
        const first=await store.getJob(`${draft.id}:reminder1`);
        const firstSent=first?.status==='sent' ? first.sent_at : null;
        const due=Math.max(reminderDue(candidate.kind,draft.lastActivityAt,firstSent),isServiceWindow(now) ? 0 : nextServiceWindow(now));
        if(due>now || (candidate.kind==='reminder2' && first?.status!=='sent')) {
          await store.markJob(candidate.id,'sending',{status:'queued',due_at:Math.max(due,now+HOUR_MS),lease_until:null});report.deferred++;continue;
        }
      }
      const resumeUrl=`${origin}/quote?draft=${encodeURIComponent(draft.id)}&lang=${draft.language}#resume=${await accessFor(draft.id)}`;
      const unsubscribeUrl=`${origin}/recovery/unsubscribe?draft=${encodeURIComponent(draft.id)}&lang=${draft.language}#token=${await unsubscribeFor(draft.id)}`;
      const rendered=renderRecoveryEmail({draft,kind:candidate.kind,resumeUrl,unsubscribeUrl,publicBaseUrl:origin});
      // Check again after rendering and before the irreversible provider call.
      draft=await store.getDraft(draft.id);
      if(!draft || draft.status!=='active' || draft.expiresAt<=clock() || (candidate.kind!=='saved' && (!draft.reminderConsent || await store.isSuppressed(draft.emailHash)))) {await cancel();continue;}
      try {
        const result=await sendEmail({from:sender,to:draft.email,...rendered,idempotencyKey:`kraken-recovery:${candidate.id}`,tags:{draftId:draft.id,kind:candidate.kind}});
        if(!result || typeof result.id!=='string' || !result.id || result.id.length>200) throw new Error('UNCERTAIN_PROVIDER_RESULT');
        await store.markJob(candidate.id,'sending',{status:'sent',provider_id:result.id,sent_at:clock(),lease_until:null});report.sent++;
      } catch(cause) {
        // Unknown outcomes must be reconciled with the provider, never blindly retried.
        const definitive=cause?.definitelyNotSent===true;
        const job=await store.getJob(candidate.id);
        const retry=definitive && cause?.retryable===true && job.attempts<3;
        const status=retry ? 'queued' : definitive ? 'failed' : 'delivery_unknown';
        await store.markJob(candidate.id,'sending',{status,due_at:clock()+15*60_000,lease_until:null,last_error_code:definitive?'PROVIDER_REJECTED':'PROVIDER_OUTCOME_UNKNOWN'});
        if(status==='delivery_unknown') report.unknown++; else report.failed++;
      }
    }
    return report;
  }
  return {capture,read,activity,withdrawConsent,unsubscribe,suppressEmail,stopDraft,attachCheckout,linkBooking,recordBookingEvent,publicActivity,runDue,
    config:{enabled:true,emailReady:true,socialProofReady:true,consentVersion:CONSENT_VERSION}};
}
