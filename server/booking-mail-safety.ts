const providerNames=new Set(['invalid_idempotency_key','validation_error','missing_api_key','restricted_api_key','invalid_permission','suspended_api_key','not_found','method_not_allowed','concurrent_idempotent_requests','invalid_idempotent_request','invalid_attachment','invalid_parameter','missing_required_field','missing_required_parameter','daily_quota_exceeded','monthly_quota_exceeded','rate_limit_exceeded','application_error','dns_lookup_failed','service_unavailable']);
const failureCodes=new Set(['EMAIL_PROVIDER_REJECTED','EMAIL_OUTCOME_UNKNOWN','EMAIL_SUPPRESSED','EMAIL_SNAPSHOT_REVIEW_REQUIRED','EMAIL_PREPARATION_STORE_REQUIRED','EMAIL_PREPARATION_FAILED']);
export function safeProviderName(value:unknown):string|null{return typeof value==='string'&&providerNames.has(value)?value:null;}
/** No response text, stack, recipient, link or credential may be persisted here. */
export function safeMailFailure(cause:any,now:number){
  const candidate=cause?.code||cause?.message;
  return {code:failureCodes.has(candidate)?candidate:cause?.definitelyNotSent===true?'EMAIL_PREPARATION_FAILED':'EMAIL_OUTCOME_UNKNOWN',definitelyNotSent:cause?.definitelyNotSent===true,
    httpStatus:Number.isSafeInteger(cause?.providerStatus)&&cause.providerStatus>=400&&cause.providerStatus<=599?cause.providerStatus:null,
    providerName:safeProviderName(cause?.providerName),retryable:cause?.retryable===true,recordedAt:Number.isSafeInteger(now)&&now>=0?now:null};
}
export function mailRetryBlock(job:any,record:any,suppressed:boolean):string|null{
  if(suppressed)return 'EMAIL_SUPPRESSED';
  if(job?.status!=='failed')return job?.status==='delivery_unknown'?'EMAIL_OUTCOME_UNKNOWN':'EMAIL_NOT_RETRYABLE';
  if(job.failure?.code!=='EMAIL_PROVIDER_REJECTED'||job.failure?.definitelyNotSent!==true)return 'EMAIL_REVIEW_REQUIRED';
  if(job.kind==='customer_access'||!job.prepared||job.prepared.to!==record.customer?.email||job.prepared.idempotencyKey!==`kraken-booking:${job.id}`)return 'EMAIL_REVIEW_REQUIRED';
  if(!Number.isSafeInteger(job.attempts)||job.attempts<1||job.attempts>=6)return 'EMAIL_RETRY_LIMIT';
  return null;
}
export function operatorMailView(job:any,record:any,suppressed:boolean){
  const failure=job.failure?safeMailFailure({...job.failure,providerStatus:job.failure.httpStatus},job.failure.recordedAt):null;
  const blockedReason=mailRetryBlock(job,record,suppressed);
  return {id:job.id,kind:job.kind,template:job.notification?.templateId||null,status:job.status,attempts:job.attempts||0,failure,canRetry:blockedReason===null,blockedReason};
}
