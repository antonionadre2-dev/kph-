import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase/app';
import { connectFirestoreEmulator, getFirestore, doc, setDoc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs, serverTimestamp, terminate, setLogLevel } from 'firebase/firestore';

const emulator = process.env.FIRESTORE_EMULATOR_HOST;
const local = emulator && /^(?:127\.0\.0\.1|localhost):\d+$/.test(emulator);
const options = { skip: !local ? 'Requires a local Firestore emulator loaded with firestore.rules.' : false };
const denied = async promise => assert.rejects(promise, error => error.code === 'permission-denied');
let counter = 0;
const unique = prefix => `${prefix}-${Date.now()}-${counter++}`;
// SDK mock tokens are unsigned emulator-only identities; no account, credential or Auth service is used.
const principal = (claims) => {
  const app = initializeApp({ projectId: 'demo-kraken-rules-audit', apiKey: 'demo-local-only' }, unique('rules'));
  const db = getFirestore(app);
  const [host, port] = emulator.split(':');
  connectFirestoreEmulator(db, host, Number(port), claims ? { mockUserToken: claims } : {});
  return { db, async close() { await terminate(db); await deleteApp(app); } };
};
const seedContact = async id => {
  assert.ok(local, 'Privileged REST seeds are restricted to a localhost emulator');
  const url = `http://${emulator}/v1/projects/demo-kraken-rules-audit/databases/(default)/documents/contact_messages/${encodeURIComponent(id)}`;
  const data = { name: 'Synthetic QA', email: 'qa@example.test', phone: '', channel: 'email', service: 'end', postalCode: '8203', message: 'Synthetic local test', language: 'en', status: 'new' };
  const fields = Object.fromEntries(Object.entries(data).map(([key, value]) => [key, { stringValue: value }]));
  fields.createdAt = { timestampValue: new Date().toISOString() };
  // The emulator recognizes owner as its privileged test token. No real credential or ADC lookup.
  const response = await fetch(url, { method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }) });
  assert.equal(response.status, 200);
  assert.ok((await response.json()).name.endsWith('/contact_messages/' + id));
};
const ownerClaims = { sub: 'synthetic-client-a', email: 'client-a@example.test', email_verified: true };
const otherClaims = { sub: 'synthetic-client-b', email: 'client-b@example.test', email_verified: true };
const staffClaims = { sub: 'synthetic-staff', email: 'kai@krakenpfm.ch', email_verified: true };
const pending = id => ({ id, userId: ownerClaims.sub, client: 'Synthetic QA', email: ownerClaims.email, phone: '', address: 'Synthetic test 1', service: 'Endreinigung', date: '2026-12-01', status: 'Pending', priority: 'Medium', amount: 560, notes: '', mediaUrls: [], mediaNames: [], createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
if (local) setLogLevel('silent'); // Expected denials are asserted below, not mistaken for SDK failures.
// Run against a locally started emulator loaded with firestore.rules. Never uses project credentials.
test('legacy commercial intake remains validated while contact creation denies every browser principal', options, async () => {
  const app = initializeApp({ projectId: 'demo-kraken-rules-audit', apiKey: 'demo-local-only' }, `rules-${Date.now()}`);
  const db = getFirestore(app);
  const [host, port] = emulator.split(':');
  connectFirestoreEmulator(db, host, Number(port));
  const denied = async promise => assert.rejects(promise, error => error.code === 'permission-denied');
  let id = 0;
  const write = (collection, data) => setDoc(doc(db, collection, `synthetic-${Date.now()}-${id++}`), data);
  const contact = () => ({ name: 'Synthetic QA', email: 'qa@example.test', subject: '', message: 'Local rules test', language: 'de', status: 'new', createdAt: serverTimestamp() });
  const owner = principal(ownerClaims), staff = principal(staffClaims);
  const quote = () => ({ type: 'commercial_b2b', buildingType: 'office', numBuildings: 2, totalArea: 2400,
    services: { dailyCleaning: true, deepCleaning: false, maintenance: true, gardening: false, gutterCare: false, wasteLogistics: true },
    frequency: 'daily', protocols: { ecoOnly: false, emergency: false, security: false, portal: true }, postalCode: '8203', city: 'Schaffhausen', hours: 4, address: 'Synthetic test 1', companyName: 'Synthetic QA', contactName: 'QA', contactEmail: 'qa@example.test', contactPhone: '', floorPlans: [], estimatedMonthlyBudget: 850, estimatedAnnualBudget: 10200, language: 'de-CH', status: 'pending', createdAt: serverTimestamp() });
  try {
    await denied(write('contact_messages', contact()));
    for (const client of [owner, staff]) {
      await denied(setDoc(doc(client.db, 'contact_messages', unique('blocked-contact')), contact()));
      await denied(setDoc(doc(client.db, 'contact_messages', unique('blocked-contact-v2')), { name: 'Synthetic QA', email: 'qa@example.test', phone: '', channel: 'email', service: 'end', postalCode: '8203', message: 'Synthetic API shape', language: 'de', status: 'new', createdAt: serverTimestamp() }));
    }
    for (const change of [{ status: 'done' }, { admin: true }, { message: 'x'.repeat(5001) }, { language: 'unsupported' }, { createdAt: new Date(0) }, { email: 42 }]) await denied(write('contact_messages', { ...contact(), ...change }));
    await write('b2b_quotes', quote());
    await write('b2b_quotes', { ...quote(), floorPlans: Array.from({ length: 5 }, (_, index) => ({ name: `synthetic-${index}.txt`, size: '1 KB', content: 'x'.repeat(100) })) });
    await denied(write('b2b_quotes', { ...quote(), floorPlans: Array.from({ length: 5 }, () => ({ name: 'test.txt', size: '150 KB', content: 'x'.repeat(150001) })) }));
    for (const change of [{ status: 'paid' }, { payment: { paid: true } }, { contactEmail: 'x'.repeat(255) }, { services: { admin: true } }, { protocols: { portal: 'true' } }, { floorPlans: [{ name: 'test.pdf', size: '1 MB', content: 'x'.repeat(750001) }] }]) await denied(write('b2b_quotes', { ...quote(), ...change }));
    await denied(getDoc(doc(db, 'contact_messages', 'synthetic-private')));
    await denied(getDoc(doc(db, 'b2b_quotes', 'synthetic-private')));
  } finally { await terminate(db); await deleteApp(app); await Promise.all([owner.close(), staff.close()]); }
});

test('pending requests enforce owner identity, query scope and immutable price/status fields', options, async () => {
  const owner = principal(ownerClaims), other = principal(otherClaims), anonymous = principal();
  const id = unique('pending'), ref = doc(owner.db, 'maintenance_requests', id);
  try {
    await setDoc(ref, pending(id));
    assert.equal((await getDoc(ref)).data().status, 'Pending');
    assert.ok((await getDocs(query(collection(owner.db, 'maintenance_requests'), where('userId', '==', ownerClaims.sub)))).docs.some(item => item.id === id));
    await denied(getDocs(collection(owner.db, 'maintenance_requests')));
    for (const db of [other.db, anonymous.db]) {
      await denied(getDoc(doc(db, 'maintenance_requests', id)));
      await denied(updateDoc(doc(db, 'maintenance_requests', id), { notes: 'unauthorised', updatedAt: serverTimestamp() }));
      await denied(deleteDoc(doc(db, 'maintenance_requests', id)));
    }
    await updateDoc(ref, { address: 'Synthetic test 2', notes: 'Owner update', updatedAt: serverTimestamp() });
    for (const change of [{ amount: 1 }, { status: 'Completed' }, { userId: otherClaims.sub }, { createdAt: new Date(0) }, { teamNotes: [{ text: 'spoofed staff' }] }, { payment: { paid: true } }]) {
      await denied(updateDoc(ref, { ...change, updatedAt: serverTimestamp() }));
    }
    for (const change of [{ status: 'Completed' }, { userId: otherClaims.sub }, { teamNotes: [] }, { amount: -1 }, { admin: true }]) {
      const rejectedId = unique('injected');
      await denied(setDoc(doc(owner.db, 'maintenance_requests', rejectedId), { ...pending(rejectedId), ...change }));
    }
    const anonymousId = unique('anonymous');
    await denied(setDoc(doc(anonymous.db, 'maintenance_requests', anonymousId), pending(anonymousId)));
    await deleteDoc(ref);
    // A deleted document has no owner; verify deletion through the authorized owner query.
    assert.ok(!(await getDocs(query(collection(owner.db, 'maintenance_requests'), where('userId', '==', ownerClaims.sub)))).docs.some(item => item.id === id));
  } finally { await Promise.all([owner.close(), other.close(), anonymous.close()]); }
});

test('verified staff can manage a request while clients cannot reopen or delete completed work', options, async () => {
  const owner = principal(ownerClaims), staff = principal(staffClaims);
  const unverified = principal({ ...staffClaims, sub: 'synthetic-unverified', email_verified: false });
  const outsider = principal(otherClaims);
  const id = unique('completed'), ref = doc(owner.db, 'maintenance_requests', id);
  try {
    await setDoc(ref, pending(id));
    for (const db of [unverified.db, outsider.db]) {
      await denied(getDoc(doc(db, 'maintenance_requests', id)));
      await denied(updateDoc(doc(db, 'maintenance_requests', id), { status: 'Completed', updatedAt: serverTimestamp() }));
    }
    assert.equal((await getDoc(doc(staff.db, 'maintenance_requests', id))).exists(), true);
    await getDocs(collection(staff.db, 'maintenance_requests'));
    await updateDoc(doc(staff.db, 'maintenance_requests', id), { status: 'Completed', teamNotes: [{ text: 'Synthetic staff note' }], updatedAt: serverTimestamp() });
    await denied(updateDoc(ref, { notes: 'Reopen', updatedAt: serverTimestamp() }));
    await denied(deleteDoc(ref));
    await denied(updateDoc(doc(staff.db, 'maintenance_requests', id), { userId: otherClaims.sub, updatedAt: serverTimestamp() }));
    await deleteDoc(doc(staff.db, 'maintenance_requests', id));
  } finally { await Promise.all([owner.close(), staff.close(), unverified.close(), outsider.close()]); }
});

test('job applications remain private to applicant and verified staff', options, async () => {
  const owner = principal(ownerClaims), other = principal(otherClaims), staff = principal(staffClaims), anonymous = principal();
  const id = unique('application'), ref = doc(owner.db, 'job_applications', id);
  const application = { id, userId: ownerClaims.sub, name: 'Synthetic QA', phone: '+41000000000', position: 'Cleaning', status: 'Pending', createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
  try {
    await setDoc(ref, application);
    const fullId=unique('full-application');
    await setDoc(doc(owner.db, 'job_applications', fullId), {...application,id:fullId,region:'Schaffhausen',permit:'Ja',startDate:'2026-12-01',pensum:'Part-time',certificates:'',languages:'de',message:'',cvName:'qa.txt',cvData:'synthetic',cvUrl:'',cvType:'text/plain'});
    for(const change of [{staffNotes:'Injected'},{teamNotes:['Injected']},{admin:true},{status:'Approved'}]){
      const injected=unique('injected-application');
      await denied(setDoc(doc(owner.db,'job_applications',injected),{...application,id:injected,...change}));
    }
    for (const db of [other.db, anonymous.db]) await denied(getDoc(doc(db, 'job_applications', id)));
    await updateDoc(ref, { message: 'Synthetic update', updatedAt: serverTimestamp() });
    await denied(updateDoc(ref, { status: 'Approved', updatedAt: serverTimestamp() }));
    await denied(updateDoc(ref, { userId: otherClaims.sub, updatedAt: serverTimestamp() }));
    await denied(updateDoc(ref, { staffNotes: 'Injected', updatedAt: serverTimestamp() }));
    await getDoc(doc(staff.db, 'job_applications', id));
    await updateDoc(doc(staff.db, 'job_applications', id), { status: 'Reviewed', updatedAt: serverTimestamp() });
    await denied(updateDoc(ref, { message: 'Cannot edit reviewed application', updatedAt: serverTimestamp() }));
    await deleteDoc(doc(staff.db, 'job_applications', id));
  } finally { await Promise.all([owner.close(), other.close(), staff.close(), anonymous.close()]); }
});

test('public intake management requires verified staff, including custom-claim administrators', options, async () => {
  const anonymous = principal(), owner = principal(ownerClaims), staff = principal(staffClaims);
  const unverified = principal({ ...staffClaims, sub: 'synthetic-unverified', email_verified: false });
  const admin = principal({ sub: 'synthetic-admin', email: 'admin@example.test', email_verified: true, admin: true });
  const id = unique('contact');
  try {
    // Seed through the emulator's privileged REST endpoint; client identities still obey the rules.
    await seedContact(id);
    for (const db of [anonymous.db, owner.db, unverified.db]) {
      await denied(getDoc(doc(db, 'contact_messages', id)));
      await denied(getDocs(collection(db, 'contact_messages')));
      await denied(updateDoc(doc(db, 'contact_messages', id), { status: 'done' }));
      await denied(deleteDoc(doc(db, 'contact_messages', id)));
    }
    await getDoc(doc(staff.db, 'contact_messages', id));
    await updateDoc(doc(staff.db, 'contact_messages', id), { status: 'done' });
    await getDoc(doc(admin.db, 'contact_messages', id));
    await deleteDoc(doc(admin.db, 'contact_messages', id));
  } finally { await Promise.all([anonymous.close(), owner.close(), staff.close(), unverified.close(), admin.close()]); }
});

test('booking, recovery, payments and outbox namespaces deny every browser principal', options, async () => {
  const principals = [principal(), principal(ownerClaims), principal(staffClaims)];
  // Actual Admin SDK stores; none is made public by staff status in client rules.
  const namespaces = ['kraken_bookings', 'kraken_booking_idempotency', 'kraken_booking_outbox', 'kraken_booking_rates', 'kraken_booking_email_suppressions', 'kraken_booking_email_events', 'kraken_recovery_drafts', 'kraken_recovery_outbox','kraken_recovery_rates','kraken_recovery_suppressions','kraken_recovery_idempotency','kraken_booking_activity','kraken_contact_idempotency','kraken_contact_rates','kraken_contact_outbox'];
  try {
    for (const { db } of principals) for (const namespace of namespaces) {
      const ref = doc(db, namespace, 'synthetic-protected');
      await denied(setDoc(ref, { status: 'paid', userId: ownerClaims.sub }));
      await denied(getDoc(ref));
      await denied(getDocs(collection(db, namespace)));
      await denied(deleteDoc(ref));
    }
  } finally { await Promise.all(principals.map(client => client.close())); }
});

test('internal request notes are staff-only and never enter the owner-readable request', options, async () => {
  const owner=principal(ownerClaims),staff=principal(staffClaims),other=principal(otherClaims),anonymous=principal();
  const id=unique('private-notes');
  try {
    await setDoc(doc(owner.db,'maintenance_requests',id),pending(id));
    const history={requestId:id,revision:1,teamNotes:[{id:'synthetic-note',author:'Synthetic staff',text:'Private synthetic note',createdAt:'2026-11-27'}],updatedAt:serverTimestamp()};
    await setDoc(doc(staff.db,'maintenance_request_internal',id),history);
    assert.equal((await getDoc(doc(staff.db,'maintenance_request_internal',id))).data().teamNotes.length,1);
    const publicRecord=(await getDoc(doc(owner.db,'maintenance_requests',id))).data();
    assert.equal(publicRecord.teamNotes,undefined);assert.equal(publicRecord.notes,'');
    for(const client of [owner,other,anonymous]){
      await denied(getDoc(doc(client.db,'maintenance_request_internal',id)));
      await denied(getDocs(collection(client.db,'maintenance_request_internal')));
      await denied(setDoc(doc(client.db,'maintenance_request_internal',id),history));
      await denied(deleteDoc(doc(client.db,'maintenance_request_internal',id)));
    }
    await denied(updateDoc(doc(owner.db,'maintenance_requests',id),{teamNotes:history.teamNotes,updatedAt:serverTimestamp()}));
    await deleteDoc(doc(staff.db,'maintenance_request_internal',id));
  }finally{await Promise.all([owner.close(),staff.close(),other.close(),anonymous.close()]);}
});
