/** Firestore Admin adapter. Never expose these collections to browser SDKs. */
import { createHash } from 'node:crypto';

const key = value => createHash('sha256').update(value).digest('hex');
const data = snapshot => snapshot.exists ? snapshot.data() : null;
export function createFirestoreRecoveryStore(db) {
  const drafts = db.collection('kraken_recovery_drafts');
  const jobs = db.collection('kraken_recovery_outbox');
  const rates = db.collection('kraken_recovery_rates');
  const suppressions = db.collection('kraken_recovery_suppressions');
  const activity = db.collection('kraken_booking_activity');
  const indexes = db.collection('kraken_recovery_idempotency');
  const getDraft = async id => data(await drafts.doc(id).get());
  async function updateQuery(query, transform, deadlineAt=Infinity) {
    const result = await query.get();
    for (const doc of result.docs) {
      if(performance.now()+15000>=deadlineAt)break;
      await db.runTransaction(async tx => {
      const current = await tx.get(doc.ref);
      if (current.exists) { const fields=transform(current.data()); if(Object.keys(fields).length)tx.update(doc.ref,fields); }
      });
    }
  }
  return {
    getDraft,
    async getByIdempotency(idempotencyKey) {
      const index = data(await indexes.doc(key(idempotencyKey)).get());
      return index ? getDraft(index.draftId) : null;
    },
    async createDraft(draft, pending) {
      return db.runTransaction(async tx => {
        const ref = indexes.doc(key(draft.idempotencyKey));
        const existing = data(await tx.get(ref));
        if (existing) return data(await tx.get(drafts.doc(existing.draftId)));
        const saved = {...draft, version:1};
        tx.create(drafts.doc(draft.id), saved);
        tx.create(ref, {draftId:draft.id, expiresAt:draft.expiresAt});
        for (const job of pending) tx.create(jobs.doc(key(job.id)), {id:job.id,draft_id:draft.id,kind:job.kind,due_at:job.dueAt,status:'queued',attempts:0,lease_until:null,...(job.notification?{notification:JSON.parse(JSON.stringify(job.notification))}:{})});
        return saved;
      });
    },
    async updateDraft(draft, expectedVersion) {
      return db.runTransaction(async tx => {
        const ref = drafts.doc(draft.id), current = data(await tx.get(ref));
        if (!current || current.version !== expectedVersion) return false;
        tx.set(ref, {...draft,version:expectedVersion+1}); return true;
      });
    },
    /** The preference and every still-unattempted snapshot change atomically. */
    async updateDraftAndPending(draft, expectedVersion, pending) {
      return db.runTransaction(async tx=>{
        const ref=drafts.doc(draft.id), current=data(await tx.get(ref));
        if(!current || current.version!==expectedVersion)return false;
        const rows=[];
        for(const item of pending)rows.push({item,ref:jobs.doc(key(item.id)),job:data(await tx.get(jobs.doc(key(item.id))))});
        tx.set(ref,{...draft,version:expectedVersion+1});
        for(const {item,ref:jobRef,job}of rows)if(job?.status==='queued'&&(job.attempts||0)===0&&!job.prepared)tx.update(jobRef,{notification:JSON.parse(JSON.stringify(item.notification))});
        return true;
      });
    },
    async getSuppression(emailHash) { return data(await suppressions.doc(emailHash).get()); },
    async isSuppressed(emailHash) { return (await suppressions.doc(emailHash).get()).exists; },
    async suppress(emailHash, reason, now) {
      await suppressions.doc(emailHash).set({reason,created_at:now});
      await updateQuery(drafts.where('emailHash','==',emailHash), current => ({reminderConsent:false,version:current.version+1,...(['bounced','complaint'].includes(reason) ? {status:reason} : {})}));
      const matching = await drafts.where('emailHash','==',emailHash).get();
      for (const draft of matching.docs) await updateQuery(jobs.where('draft_id','==',draft.id), job => job.status==='queued' && (job.kind!=='saved' || ['bounced','complaint'].includes(reason)) ? {status:'cancelled'} : {});
    },
    async consumeRate(bucket, now, windowMs, limit) {
      return db.runTransaction(async tx => {
        const ref=rates.doc(key(bucket)), current=data(await tx.get(ref));
        const next=current && current.expires_at>now ? {...current,count:current.count+1} : {count:1,expires_at:now+windowMs};
        tx.set(ref,next); return next.count<=limit;
      });
    },
    async getJob(id) { return data(await jobs.doc(key(id)).get()); },
    /** CAS before provider use. Retries receive the original immutable envelope. */
    async prepareJob(id, envelope, {preparedAt,expiresAt}={}) {
      return db.runTransaction(async tx=>{
        const ref=jobs.doc(key(id)), job=data(await tx.get(ref));
        if(job?.status!=='sending')return null;
        if(job.prepared)return job;
        if(!job.notification)return null;
        const fields={prepared:JSON.parse(JSON.stringify(envelope)),preparedAt,preparedExpiresAt:expiresAt};
        tx.update(ref,fields);return {...job,...fields};
      });
    },
    async listDue(now, limit=20) {
      const result=await jobs.where('status','==','queued').where('due_at','<=',now).orderBy('due_at').limit(Math.min(50,limit)).get();
      return result.docs.map(doc=>doc.data());
    },
    async claimJob(id, now) {
      return db.runTransaction(async tx => {
        const ref=jobs.doc(key(id)), job=data(await tx.get(ref));
        if (!job || job.status!=='queued' || job.due_at>now) return false;
        const draft=data(await tx.get(drafts.doc(job.draft_id)));
        if (!draft || draft.status!=='active' || draft.expiresAt<=now) return false;
        tx.update(ref,{status:'sending',attempts:job.attempts+1,lease_until:now+60000});return true;
      });
    },
    async markJob(id, expectedStatus, fields) {
      const allowed=new Set(['status','due_at','lease_until','provider_id','sent_at','last_error_code']);
      const next=Object.fromEntries(Object.entries(fields).filter(([name])=>allowed.has(name)));
      await db.runTransaction(async tx => {const ref=jobs.doc(key(id)), job=data(await tx.get(ref));if(job?.status===expectedStatus) tx.update(ref,next);});
    },
    async cancelQueued(id, remindersOnly=false) { await updateQuery(jobs.where('draft_id','==',id),job=>job.status==='queued' && (!remindersOnly || job.kind!=='saved') ? {status:'cancelled'} : {}); },
    async markStaleSending(now,{limit=20,deadlineAt=Infinity}={}) { await updateQuery(jobs.where('status','==','sending').where('lease_until','<=',now).limit(Math.max(1,Math.min(20,Math.floor(limit)))),job=>job.status==='sending'&&job.lease_until<=now?{status:'delivery_unknown',last_error_code:'DISPATCH_INTERRUPTED'}:{},deadlineAt); },
    async upsertActivity(event) {
      return db.runTransaction(async tx => {
        const ref=activity.doc(event.bookingKey), current=data(await tx.get(ref));
        if(current && current.revision>=event.revision)return false;
        tx.set(ref,{...event,occurred_at:event.occurredAt,expires_at:event.expiresAt});return true;
      });
    },
    async readActivity(now, after, limit) {
      const result=await activity.where('visible','==',true).where('occurred_at','<=',now).orderBy('occurred_at').orderBy('id').startAfter(after.time,after.id).limit(limit).get();
      return result.docs.map(doc=>doc.data()).filter(row=>row.expires_at>now && row.occurred_at<=now && (row.occurred_at>after.time || row.id>after.id)).sort((a,b)=>a.occurred_at-b.occurred_at || a.id.localeCompare(b.id)).slice(0,limit);
    },
    async purge(now,{limit=20,deadlineAt=Infinity}={}) {
      const batchLimit=Math.max(1,Math.min(20,Math.floor(limit)));
      if(performance.now()+15000>=deadlineAt)return;
      const expired=await drafts.where('expiresAt','<=',now).limit(batchLimit).get();
      for(const draft of expired.docs) {
        if(performance.now()+15000>=deadlineAt)return;
        const pending=await jobs.where('draft_id','==',draft.id).get();
        const batch=db.batch();for(const job of pending.docs)batch.delete(job.ref);
        batch.delete(indexes.doc(key(draft.data().idempotencyKey)));batch.delete(draft.ref);await batch.commit();
      }
      if(performance.now()+15000>=deadlineAt)return;
      for(const doc of (await rates.where('expires_at','<=',now).limit(batchLimit).get()).docs) {
        if(performance.now()+15000>=deadlineAt)return;
        await doc.ref.delete();
      }
      if(performance.now()+15000>=deadlineAt)return;
      await updateQuery(activity.where('visible','==',true).where('expires_at','<=',now).limit(batchLimit),()=>({visible:false,service:null,region:null}),deadlineAt);
    }
  };
}
