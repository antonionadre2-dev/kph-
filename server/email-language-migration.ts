import { languageForBackgroundEmail, migrateLegacyEmailLanguage, normalizeEmailLanguage } from '../integrations/email-collection/index.mjs';
import { notificationForBooking, notificationForRecovery } from './customer-notifications.ts';

export const EMAIL_LANGUAGE_MIGRATION_VERSION = 1;
type RecordKind = 'bookings' | 'drafts';
type MigrationDatabase = { collection(name:string):any; runTransaction<T>(work:(transaction:any)=>Promise<T>):Promise<T> };
export class EmailLanguageMigrationError extends Error {
  constructor(public code:string) { super(code); }
}
const clone = <T>(value:T):T => JSON.parse(JSON.stringify(value));
const canonical = (value:any):string => JSON.stringify(value && typeof value==='object'
  ? Array.isArray(value) ? value.map(item=>JSON.parse(canonical(item)))
    : Object.fromEntries(Object.keys(value).sort().map(key=>[key,JSON.parse(canonical(value[key]))])) : value);
const same = (left:any,right:any) => canonical(left)===canonical(right);
const present = (value:any) => value!==undefined && value!==null;
const knownErrors = new Set(['MISSING_EMAIL_LANGUAGE','INVALID_EMAIL_LANGUAGE','UNSUPPORTED_EMAIL_LANGUAGE',
  'INVALID_LANGUAGE_SNAPSHOT','LANGUAGE_SNAPSHOT_MISMATCH','INVALID_RECORD','JOB_RECORD_MISMATCH',
  'RECEIPT_REFERENCE_REQUIRED','INVALID_NOTIFICATION_EVENT','INVALID_NOTIFICATION_RECIPIENT',
  'INVALID_APPOINTMENT_IN_SNAPSHOT','STAFF_SCOPE_LANGUAGE_REQUIRED']);
function safeCode(error:any) {
  const code=error?.code || error?.message;
  return knownErrors.has(code)?code:'MIGRATION_RECORD_INVALID';
}

/** An explicit migration only. Neither rendering nor dispatch uses this fallback. */
export function planLanguageRecord(record:any) {
  if(!record || typeof record!=='object' || Array.isArray(record))throw new EmailLanguageMigrationError('INVALID_RECORD');
  if(present(record.languageSnapshot)) {
    let selected:string;
    try { selected=languageForBackgroundEmail(record.languageSnapshot); }
    catch(error:any) {
      if(knownErrors.has(error?.code))throw error;
      throw new EmailLanguageMigrationError('INVALID_LANGUAGE_SNAPSHOT');
    }
    if(normalizeEmailLanguage(record.language)!==selected)throw new EmailLanguageMigrationError('LANGUAGE_SNAPSHOT_MISMATCH');
    return {languageSnapshot:clone(record.languageSnapshot),patch:null};
  }
  const languageSnapshot=migrateLegacyEmailLanguage({bookingLanguage:record.language,customerLanguage:record.customer?.language});
  return {languageSnapshot:clone(languageSnapshot),patch:{language:languageSnapshot.language,languageSnapshot:clone(languageSnapshot)}};
}

function notificationPlan(kind:RecordKind,record:any,job:any) {
  if(job?.status!=='queued')return {skip:'JOB_NOT_QUEUED'};
  // Old never-attempted jobs did not store attempts. Any other evidence of an
  // attempt freezes the row too; a retry must keep its original envelope.
  if(present(job.attempts) && job.attempts!==0)return {skip:'JOB_ALREADY_ATTEMPTED'};
  if(['prepared','preparedAt','prepared_at','preparedExpiresAt','prepared_expires_at','providerId','provider_id','sentAt','sent_at','leaseUntil','lease_until']
    .some(field=>present(job[field])))return {skip:'JOB_ALREADY_PREPARED'};
  if(present(job.notification))return {skip:'JOB_HAS_NOTIFICATION'};
  if(kind==='bookings') {
    if(job.bookingId!==record.bookingId)throw new EmailLanguageMigrationError('JOB_RECORD_MISMATCH');
    if(job.kind==='customer_access')return {skip:'ACCESS_REQUIRES_RENEWAL'};
    if(job.kind==='request')return {notification:notificationForBooking(record,'request_received',`${record.bookingId}:requested:1`)};
    if(job.kind==='receipt') {
      if(typeof record.checkout?.reference!=='string'||!record.checkout.reference)throw new EmailLanguageMigrationError('RECEIPT_REFERENCE_REQUIRED');
      const template=record.payment?.remainingBalanceCents>0?'deposit_received':'payment_received';
      return {notification:notificationForBooking(record,template,`${record.bookingId}:settled:${record.checkout.reference}`)};
    }
  } else {
    if(job.draft_id!==record.id)throw new EmailLanguageMigrationError('JOB_RECORD_MISMATCH');
    if(['saved','reminder1','reminder2'].includes(job.kind))return {notification:notificationForRecovery(record,job.kind)};
  }
  return {skip:'JOB_KIND_UNSUPPORTED'};
}

const increment=(bucket:Record<string,number>,key:string,amount=1)=>{bucket[key]=(bucket[key]||0)+amount;};
const observedPlan=(kind:RecordKind,record:any,job:any)=>{
  try {return notificationPlan(kind,record,job);}
  catch(error){return {error:safeCode(error)};}
};

/**
 * Reads only in dry-run. Apply re-reads each parent and bounded job page inside
 * a transaction, then skips rows changed since their scan. It never sends mail,
 * changes IDs/status/attempts/dates/consent or replaces an existing notification.
 * The return value intentionally contains counts and fixed codes, not records.
 */
export async function migrateEmailLanguages({db,apply=false,operatorId,pageSize=20,maxPages=1000,clock=Date.now}:{
  db:MigrationDatabase;apply?:boolean;operatorId?:string;pageSize?:number;maxPages?:number;clock?:()=>number;
}) {
  if(!db?.collection || !db.runTransaction)throw new EmailLanguageMigrationError('DATABASE_REQUIRED');
  if(!Number.isInteger(pageSize)||pageSize<1||pageSize>50||!Number.isInteger(maxPages)||maxPages<1||maxPages>10000)throw new EmailLanguageMigrationError('INVALID_BATCH_SIZE');
  if(apply && (typeof operatorId!=='string'||!operatorId.trim()||operatorId.length>128||/[\r\n\u0000]/.test(operatorId)))throw new EmailLanguageMigrationError('OPERATOR_REQUIRED');
  const report={mode:apply?'apply':'dry-run',version:EMAIL_LANGUAGE_MIGRATION_VERSION,
    scanned:{bookings:0,drafts:0,jobs:0},planned:{records:0,notifications:0},applied:{records:0,notifications:0},
    preservedRecords:0,skips:{} as Record<string,number>,errors:{} as Record<string,number>,truncated:false};
  const definitions:[RecordKind,string,string,string][]=[['bookings','kraken_bookings','kraken_booking_outbox','bookingId'],['drafts','kraken_recovery_drafts','kraken_recovery_outbox','draft_id']];
  for(const [kind,collectionName,outboxName,foreignKey] of definitions) {
    let recordCursor:any=null;
    for(let recordPage=0;recordPage<maxPages;recordPage++) {
      let query=db.collection(collectionName).orderBy('__name__').limit(pageSize);
      if(recordCursor)query=query.startAfter(recordCursor);
      const page=await query.get();
      for(const document of page.docs) {
        report.scanned[kind]++;
        let expected=document.data(),languagePlan:ReturnType<typeof planLanguageRecord>;
        try {languagePlan=planLanguageRecord(expected);}
        catch(error){increment(report.errors,safeCode(error));continue;}
        if(languagePlan.patch)report.planned.records++;else report.preservedRecords++;
        let jobCursor:any=null,changed=false;
        for(let jobPage=0;jobPage<maxPages;jobPage++) {
          // Query by the persisted identity. Document IDs remain their existing
          // SHA hashes; the migration never creates a second queue row.
          const entityId=kind==='bookings'?expected.bookingId:expected.id;
          if(typeof entityId!=='string'||!entityId) {increment(report.errors,'INVALID_RECORD');break;}
          let pending=db.collection(outboxName).where(foreignKey,'==',entityId).orderBy('__name__').limit(pageSize);
          if(jobCursor)pending=pending.startAfter(jobCursor);
          const jobs=await pending.get();
          const selectedRecord={...expected,...languagePlan.patch};
          for(const job of jobs.docs) {
            report.scanned.jobs++;
            const plan=observedPlan(kind,selectedRecord,job.data());
            if('notification'in plan)report.planned.notifications++;
            else if(!apply)increment('error'in plan?report.errors:report.skips,('error'in plan?plan.error:plan.skip)!);
          }
          if(apply) {
            const outcome=await db.runTransaction(async tx=>{
              const parent=await tx.get(document.ref);
              if(!parent.exists||!same(parent.data(),expected))return {changed:true,record:null,recordWrites:0,jobWrites:0,skips:{RECORD_CHANGED:1},errors:{}};
              const current=parent.data();
              const freshPlan=planLanguageRecord(current);
              const migrated={...current,...freshPlan.patch};
              const currentJobs=await Promise.all(jobs.docs.map((job:any)=>tx.get(job.ref)));
              const skips:Record<string,number>={},errors:Record<string,number>={},updates:{ref:any;notification:any}[]=[];
              for(let index=0;index<jobs.docs.length;index++) {
                const scanned=jobs.docs[index],fresh=currentJobs[index];
                if(!fresh.exists||!same(fresh.data(),scanned.data())){increment(skips,'JOB_CHANGED');continue;}
                const plan=observedPlan(kind,migrated,fresh.data());
                if('notification'in plan)updates.push({ref:fresh.ref,notification:plan.notification});
                else increment('error'in plan?errors:skips,('error'in plan?plan.error:plan.skip)!);
              }
              const now=clock();
              if(!Number.isSafeInteger(now)||now<0)throw new EmailLanguageMigrationError('INVALID_CLOCK');
              const audit={version:EMAIL_LANGUAGE_MIGRATION_VERSION,operatorId:operatorId!.trim(),migratedAt:now};
              const patch=freshPlan.patch?{...freshPlan.patch,emailLanguageMigration:audit}:null;
              if(patch)tx.update(document.ref,clone(patch));
              for(const update of updates)tx.update(update.ref,{notification:clone(update.notification),emailLanguageMigration:audit});
              return {changed:false,record:patch?{...current,...patch}:current,recordWrites:patch?1:0,jobWrites:updates.length,skips,errors};
            });
            report.applied.records+=outcome.recordWrites;report.applied.notifications+=outcome.jobWrites;
            for(const [code,count]of Object.entries(outcome.skips))increment(report.skips,code,count as number);
            for(const [code,count]of Object.entries(outcome.errors))increment(report.errors,code,count as number);
            if(outcome.changed){changed=true;break;}
            expected=outcome.record;languagePlan=planLanguageRecord(expected);
          }
          if(jobs.docs.length<pageSize)break;
          jobCursor=jobs.docs.at(-1);
          if(jobPage===maxPages-1)report.truncated=true;
        }
        if(changed)continue;
      }
      if(page.docs.length<pageSize)break;
      recordCursor=page.docs.at(-1);
      if(recordPage===maxPages-1)report.truncated=true;
    }
  }
  return report;
}
