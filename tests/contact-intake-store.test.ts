import test from 'node:test';
import assert from 'node:assert/strict';
import { createFirestoreContactIntakeStore, type ContactRecord, type ContactJob } from '../server/contact-intake-store.ts';

/** A strict transactional double: all reads precede writes; commits are atomic. */
function firestoreDouble() {
  const rows = new Map<string, any>(); let queue = Promise.resolve(), failCommit = false;
  const reference = (pathname: string): any => ({ path: pathname, id: pathname.split('/').at(-1), async get() { return snapshot(pathname); } });
  const snapshot = (pathname: string) => ({ exists: rows.has(pathname), data: () => rows.get(pathname), ref: reference(pathname) });
  const db: any = {
    collection(name: string) {
      return {
        doc(id: string) { return reference(name + '/' + id); },
        where(field: string, operator: string, value: unknown) {
          assert.equal(operator, '==');
          return { limit(count: number) { return { async get() { return { docs: [...rows.keys()].filter(key => key.startsWith(name + '/') && rows.get(key)[field] === value).slice(0, count).map(snapshot) }; } }; } };
        },
      };
    },
    runTransaction(callback: (transaction: any) => Promise<unknown>) {
      const result = queue.then(async () => {
        const writes: [string, any][] = []; let writing = false;
        const transaction = {
          async get(ref: any) { assert.equal(writing, false, 'Firestore does not permit transaction reads after writes'); return snapshot(ref.path); },
          create(ref: any, value: any) { writing = true; assert.equal(rows.has(ref.path) || writes.some(([key]) => key === ref.path), false, 'create must not overwrite an existing document'); writes.push([ref.path, value]); },
          set(ref: any, value: any) { writing = true; writes.push([ref.path, value]); },
          update(ref: any, fields: any) { writing = true; assert.ok(rows.has(ref.path)); writes.push([ref.path, { ...rows.get(ref.path), ...fields }]); },
        };
        const value = await callback(transaction);
        if (failCommit) { failCommit = false; throw new Error('Isolated transaction commit failure'); }
        for (const [key, row] of writes) rows.set(key, row);
        return value;
      });
      queue = result.then(() => undefined, () => undefined);
      return result;
    },
  };
  return { db, rows, failNextCommit() { failCommit = true; } };
}
const record = (id: string): ContactRecord => ({ id, reference: 'KCT-' + 'A'.repeat(20), name: 'Test Person', email: 'person@example.test', phone: '', channel: 'phone', effectiveChannel: 'email', service: 'end', postalCode: '8203', message: 'Isolated test message.', language: 'fr', subject: 'Test service · 8203', status: 'new', createdAt: 1000 });
const job = (id: string): ContactJob => ({ id: 'contact-received:' + id, recordId: id, status: 'queued', dueAt: 1000, attempts: 0, envelope: { to: 'person@example.test' } });

test('Firestore adapter atomically stores one enquiry, idempotency row and job under concurrent duplicate creates', async () => {
  const fake = firestoreDouble(), store = createFirestoreContactIntakeStore(fake.db);
  const saved = await Promise.all(Array.from({ length: 12 }, (_, index) => store.create('same-key', 'same-fingerprint', record('record-' + index), job('record-' + index))));
  assert.ok(saved.every(value => value.id === saved[0].id));
  for (const collection of ['contact_messages', 'kraken_contact_idempotency', 'kraken_contact_outbox']) assert.equal([...fake.rows.keys()].filter(key => key.startsWith(collection + '/')).length, 1);
  const anotherInstance = createFirestoreContactIntakeStore(fake.db);
  assert.equal((await anotherInstance.previous('same-key', 'same-fingerprint'))!.id, saved[0].id);
  await assert.rejects(anotherInstance.create('same-key', 'changed-fingerprint', record('other'), null), { code: 'idempotency_conflict', status: 409 });
  await assert.rejects(anotherInstance.previous('same-key', 'changed-fingerprint'), { code: 'idempotency_conflict', status: 409 });
});

test('transaction failure leaves no partial message, retry key or email job', async () => {
  const fake = firestoreDouble(), store = createFirestoreContactIntakeStore(fake.db); fake.failNextCommit();
  await assert.rejects(store.create('key', 'fingerprint', record('record-1'), job('record-1')));
  assert.equal(fake.rows.size, 0); assert.equal(await store.previous('key', 'fingerprint'), null);
});

test('durable rate counters survive instances, bound concurrent use and reset after their window', async () => {
  const fake = firestoreDouble(), store = createFirestoreContactIntakeStore(fake.db);
  const allowed = await Promise.all(Array.from({ length: 8 }, () => store.consumeRate('keyed-ip', 1000, 60000, 3)));
  assert.equal(allowed.filter(Boolean).length, 3);
  assert.equal(await createFirestoreContactIntakeStore(fake.db).consumeRate('keyed-ip', 2000, 60000, 3), false);
  assert.equal(await store.consumeRate('keyed-ip', 61001, 60000, 3), true);
  const persisted = [...fake.rows.values()][0]; assert.ok(persisted.deleteAfter instanceof Date);
  assert.equal(JSON.stringify([...fake.rows.keys()]).includes('keyed-ip'), false);
});

test('outbox claims are exclusive; expired ambiguous sends are quarantined without retransmission', async () => {
  const fake = firestoreDouble(), store = createFirestoreContactIntakeStore(fake.db);
  await store.create('key', 'fingerprint', record('record-1'), job('record-1'));
  const claims = await Promise.all([store.claim('contact-received:record-1', 1000), store.claim('contact-received:record-1', 1000)]);
  assert.equal(claims.filter(Boolean).length, 1);
  assert.deepEqual(await store.due(62000), []);
  const pending = [...fake.rows.entries()].find(([key]) => key.startsWith('kraken_contact_outbox/'))![1];
  assert.equal(pending.status, 'delivery_unknown');
  await store.finish('contact-received:record-1', 'sent');
  assert.equal(pending.status, 'delivery_unknown', 'A stale worker cannot rewrite quarantined provider state');
});
