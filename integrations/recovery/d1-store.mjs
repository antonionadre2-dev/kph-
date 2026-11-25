/** Cloudflare D1 adapter. All user values are bound; batch writes are transactional. */
export function createD1RecoveryStore(db) {
  if (!db?.prepare || !db?.batch) throw new Error('D1_BINDING_REQUIRED');
  const statement = (sql, values = []) => db.prepare(sql).bind(...values);
  const first = (sql, values) => statement(sql, values).first();
  const all = async (sql, values) => (await statement(sql, values).all()).results || [];
  const run = (sql, values) => statement(sql, values).run();
  const unpack = row => row ? { ...JSON.parse(row.data_json), version:row.version, status:row.status, reminderConsent:row.reminder_consent === 1, lastActivityAt:row.last_activity_at } : null;
  const unpackJob = row => row ? {...row,...(row.notification_json?{notification:JSON.parse(row.notification_json)}:{}),...(row.prepared_json?{prepared:JSON.parse(row.prepared_json)}:{}),preparedAt:row.prepared_at,preparedExpiresAt:row.prepared_expires_at}:null;
  const getDraft = async id => unpack(await first('SELECT * FROM recovery_drafts WHERE id=?', [id]));
  const getByIdempotency = async key => unpack(await first('SELECT * FROM recovery_drafts WHERE idempotency_key=?', [key]));
  return {
    getDraft, getByIdempotency,
    async createDraft(draft, jobs) {
      const actions = [statement(`INSERT INTO recovery_drafts (id,idempotency_key,fingerprint,email_hash,created_at,expires_at,status,last_activity_at,reminder_consent,version,data_json)
        VALUES (?,?,?,?,?,?,?,?,?,1,?) ON CONFLICT(idempotency_key) DO NOTHING`,
        [draft.id,draft.idempotencyKey,draft.fingerprint,draft.emailHash,draft.createdAt,draft.expiresAt,draft.status,draft.lastActivityAt,Number(draft.reminderConsent),JSON.stringify(draft)])];
      for (const job of jobs) actions.push(statement(`INSERT INTO recovery_outbox(id,draft_id,kind,due_at,status,notification_json)
        SELECT ?,id,?,?,'queued',? FROM recovery_drafts WHERE id=? ON CONFLICT(id) DO NOTHING`, [job.id,job.kind,job.dueAt,job.notification?JSON.stringify(job.notification):null,draft.id]));
      await db.batch(actions);
      return getByIdempotency(draft.idempotencyKey);
    },
    async updateDraft(draft, expectedVersion) {
      const result = await run(`UPDATE recovery_drafts SET status=?,last_activity_at=?,reminder_consent=?,data_json=?,version=version+1 WHERE id=? AND version=?`,
        [draft.status,draft.lastActivityAt,Number(draft.reminderConsent),JSON.stringify(draft),draft.id,expectedVersion]);
      return result.meta?.changes === 1;
    },
    async updateDraftAndPending(draft, expectedVersion, pending) {
      const serialized=JSON.stringify(draft);
      const actions=[statement(`UPDATE recovery_drafts SET status=?,last_activity_at=?,reminder_consent=?,data_json=?,version=version+1 WHERE id=? AND version=?`,[draft.status,draft.lastActivityAt,Number(draft.reminderConsent),serialized,draft.id,expectedVersion])];
      for(const item of pending)actions.push(statement(`UPDATE recovery_outbox SET notification_json=? WHERE id=? AND draft_id=? AND status='queued' AND attempts=0 AND prepared_json IS NULL AND EXISTS(SELECT 1 FROM recovery_drafts WHERE id=? AND version=? AND data_json=?)`,[JSON.stringify(item.notification),item.id,draft.id,draft.id,expectedVersion+1,serialized]));
      const results=await db.batch(actions);return results[0].meta?.changes===1;
    },
    async getSuppression(emailHash) { return first('SELECT reason FROM recovery_suppressions WHERE email_hash=?',[emailHash]); },
    async isSuppressed(emailHash) { return Boolean(await first('SELECT email_hash FROM recovery_suppressions WHERE email_hash=?',[emailHash])); },
    async suppress(emailHash, reason, now) {
      await db.batch([
        statement('INSERT INTO recovery_suppressions(email_hash,reason,created_at) VALUES(?,?,?) ON CONFLICT(email_hash) DO UPDATE SET reason=excluded.reason,created_at=excluded.created_at',[emailHash,reason,now]),
        statement("UPDATE recovery_drafts SET reminder_consent=0,status=CASE WHEN ? IN ('bounced','complaint') THEN ? ELSE status END,version=version+1 WHERE email_hash=?",[reason,reason,emailHash]),
        statement("UPDATE recovery_outbox SET status='cancelled' WHERE (kind<>'saved' OR ? IN ('bounced','complaint')) AND status='queued' AND draft_id IN (SELECT id FROM recovery_drafts WHERE email_hash=?)",[reason,emailHash])
      ]);
    },
    async consumeRate(key, now, windowMs, limit) {
      const result = await first(`INSERT INTO recovery_rate_limits(bucket_key,count,expires_at) VALUES(?,1,?)
        ON CONFLICT(bucket_key) DO UPDATE SET count=CASE WHEN expires_at<=? THEN 1 ELSE count+1 END,
        expires_at=CASE WHEN expires_at<=? THEN excluded.expires_at ELSE expires_at END RETURNING count`,[key,now+windowMs,now,now]);
      return result.count <= limit;
    },
    async getJob(id) { return unpackJob(await first('SELECT * FROM recovery_outbox WHERE id=?',[id])); },
    async prepareJob(id,envelope,{preparedAt,expiresAt}={}) {
      await run(`UPDATE recovery_outbox SET prepared_json=?,prepared_at=?,prepared_expires_at=? WHERE id=? AND status='sending' AND prepared_json IS NULL AND notification_json IS NOT NULL`,[JSON.stringify(envelope),preparedAt,expiresAt,id]);
      const row=unpackJob(await first('SELECT * FROM recovery_outbox WHERE id=?',[id]));return row?.status==='sending'&&row.prepared?row:null;
    },
    async listDue(now, limit=20) { return (await all("SELECT * FROM recovery_outbox WHERE status='queued' AND due_at<=? ORDER BY due_at,id LIMIT ?",[now,Math.min(50,limit)])).map(unpackJob); },
    async claimJob(id, now) {
      const result = await run(`UPDATE recovery_outbox SET status='sending',attempts=attempts+1,lease_until=?
        WHERE id=? AND status='queued' AND due_at<=? AND EXISTS(SELECT 1 FROM recovery_drafts d WHERE d.id=recovery_outbox.draft_id AND d.status='active' AND d.expires_at>?)`,[now+60_000,id,now,now]);
      return result.meta?.changes === 1;
    },
    async markJob(id, expectedStatus, fields) {
      const allowed = new Set(['status','due_at','lease_until','provider_id','sent_at','last_error_code']);
      const pairs = Object.entries(fields).filter(([key]) => allowed.has(key));
      if (!pairs.length) return;
      await run(`UPDATE recovery_outbox SET ${pairs.map(([key])=>`${key}=?`).join(',')} WHERE id=? AND status=?`,[...pairs.map(([,value])=>value),id,expectedStatus]);
    },
    async cancelQueued(id, remindersOnly=false) {
      await run(`UPDATE recovery_outbox SET status='cancelled' WHERE draft_id=? AND status='queued'${remindersOnly ? " AND kind<>'saved'" : ''}`,[id]);
    },
    async markStaleSending(now) { await run("UPDATE recovery_outbox SET status='delivery_unknown',last_error_code='DISPATCH_INTERRUPTED' WHERE status='sending' AND lease_until<=?",[now]); },
    async upsertActivity(event) {
      const result = await run(`INSERT INTO recovery_booking_activity(id,booking_key,revision,visible,service,region,occurred_at,expires_at) VALUES(?,?,?,?,?,?,?,?)
        ON CONFLICT(booking_key) DO UPDATE SET revision=excluded.revision,visible=excluded.visible,service=excluded.service,region=excluded.region,occurred_at=excluded.occurred_at,expires_at=excluded.expires_at
        WHERE excluded.revision>recovery_booking_activity.revision`,[event.id,event.bookingKey,event.revision,Number(event.visible),event.service,event.region,event.occurredAt,event.expiresAt]);
      return result.meta?.changes === 1;
    },
    async readActivity(now, after, limit) {
      return all(`SELECT id,service,region,occurred_at FROM recovery_booking_activity WHERE visible=1 AND expires_at>? AND occurred_at<=?
        AND (occurred_at>? OR (occurred_at=? AND id>?)) ORDER BY occurred_at,id LIMIT ?`,[now,now,after.time,after.time,after.id,limit]);
    },
    async purge(now) {
      await db.batch([
        statement('DELETE FROM recovery_drafts WHERE expires_at<=?',[now]),
        statement('DELETE FROM recovery_rate_limits WHERE expires_at<=?',[now]),
        statement('UPDATE recovery_booking_activity SET visible=0,service=NULL,region=NULL WHERE expires_at<=? AND visible=1',[now])
      ]);
    }
  };
}
