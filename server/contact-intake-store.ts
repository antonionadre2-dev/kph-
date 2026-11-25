import { createHash } from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';
import type { ContactFields } from '../src/contact/intake-contract.ts';

export class ContactIntakeError extends Error { constructor(public code: string, public status = 400) { super(code); } }
export type ContactRecord = ContactFields & { id: string; reference: string; language: string; effectiveChannel: string; subject: string; status: 'new'; createdAt: number };
export type ContactJob = { id: string; recordId: string; status: string; dueAt: number; attempts: number; leaseUntil?: number; envelope: Record<string, unknown> };
export interface ContactIntakeStore {
  previous(key: string, fingerprint: string): Promise<ContactRecord | null>;
  consumeRate(bucket: string, now: number, windowMs: number, limit: number): Promise<boolean>;
  create(key: string, fingerprint: string, record: ContactRecord, job: ContactJob | null): Promise<ContactRecord>;
  due(now: number): Promise<ContactJob[]>;
  claim(id: string, now: number): Promise<ContactJob | null>;
  finish(id: string, status: string, fields?: Record<string, unknown>): Promise<void>;
}
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
export function createFirestoreContactIntakeStore(db: Firestore): ContactIntakeStore {
  const messages = db.collection('contact_messages'), keys = db.collection('kraken_contact_idempotency');
  const rates = db.collection('kraken_contact_rates'), outbox = db.collection('kraken_contact_outbox');
  return {
    async previous(key, fingerprint) {
      const saved = (await keys.doc(hash(key)).get()).data();
      if (!saved) return null;
      if (saved.fingerprint !== fingerprint) throw new ContactIntakeError('idempotency_conflict', 409);
      const record = (await messages.doc(saved.id).get()).data();
      if (!record) throw new ContactIntakeError('unavailable', 503);
      return record as ContactRecord;
    },
    async consumeRate(bucket, now, windowMs, limit) {
      return db.runTransaction(async tx => {
        const ref = rates.doc(hash(bucket)), current = (await tx.get(ref)).data();
        const record = current && current.expiresAt > now ? { ...current, count: current.count + 1 } : { count: 1, expiresAt: now + windowMs, deleteAfter: new Date(now + windowMs + 86_400_000) };
        tx.set(ref, record); return record.count <= limit;
      });
    },
    async create(key, fingerprint, record, job) {
      return db.runTransaction(async tx => {
        const keyRef = keys.doc(hash(key)), saved = (await tx.get(keyRef)).data();
        if (saved) {
          if (saved.fingerprint !== fingerprint) throw new ContactIntakeError('idempotency_conflict', 409);
          const previous = (await tx.get(messages.doc(saved.id))).data();
          if (!previous) throw new ContactIntakeError('unavailable', 503);
          return previous as ContactRecord;
        }
        tx.create(messages.doc(record.id), record);
        tx.create(keyRef, { id: record.id, fingerprint, createdAt: record.createdAt });
        if (job) tx.create(outbox.doc(hash(job.id)), job);
        return record;
      });
    },
    async due(now) {
      // Single-field queries avoid a new compound index. Expired in-flight
      // provider calls become unknown rather than silently sending a duplicate.
      for (const row of (await outbox.where('status', '==', 'sending').limit(20).get()).docs) {
        await db.runTransaction(async tx => {
          const current = (await tx.get(row.ref)).data();
          if (current?.status === 'sending' && current.leaseUntil <= now) tx.update(row.ref, { status: 'delivery_unknown' });
        });
      }
      return (await outbox.where('status', '==', 'queued').limit(20).get()).docs.map(row => row.data() as ContactJob).filter(job => job.dueAt <= now);
    },
    async claim(id, now) {
      return db.runTransaction(async tx => {
        const ref = outbox.doc(hash(id)), job = (await tx.get(ref)).data() as ContactJob | undefined;
        if (!job || job.status !== 'queued' || job.dueAt > now) return null;
        const next = { ...job, status: 'sending', attempts: job.attempts + 1, leaseUntil: now + 60_000 };
        tx.set(ref, next); return next;
      });
    },
    async finish(id, status, fields = {}) {
      await db.runTransaction(async tx => {
        const ref = outbox.doc(hash(id)), job = (await tx.get(ref)).data();
        if (job?.status === 'sending') tx.update(ref, { ...fields, status });
      });
    },
  };
}
