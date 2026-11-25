import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase/app';
import { connectFirestoreEmulator, getFirestore, doc, setDoc, getDoc, serverTimestamp, terminate } from 'firebase/firestore';

const emulator = process.env.FIRESTORE_EMULATOR_HOST;
const local = emulator && /^(?:127\.0\.0\.1|localhost):\d+$/.test(emulator);
// Run against a locally started emulator loaded with firestore.rules. Never uses project credentials.
test('public Firestore intake accepts valid legacy forms and rejects privilege, size and status injection', { skip: !local ? 'Requires a local Firestore emulator with this ruleset; Java runtime is not installed in this environment.' : false }, async () => {
  const app = initializeApp({ projectId: 'demo-kraken-rules-audit', apiKey: 'demo-local-only' }, `rules-${Date.now()}`);
  const db = getFirestore(app);
  const [host, port] = emulator.split(':');
  connectFirestoreEmulator(db, host, Number(port));
  const denied = async promise => assert.rejects(promise, error => error.code === 'permission-denied');
  let id = 0;
  const write = (collection, data) => setDoc(doc(db, collection, `synthetic-${Date.now()}-${id++}`), data);
  const contact = () => ({ name: 'Synthetic QA', email: 'qa@example.test', subject: '', message: 'Local rules test', language: 'de', status: 'new', createdAt: serverTimestamp() });
  const quote = () => ({ type: 'commercial_b2b', buildingType: 'office', numBuildings: 2, totalArea: 2400,
    services: { dailyCleaning: true, deepCleaning: false, maintenance: true, gardening: false, gutterCare: false, wasteLogistics: true },
    frequency: 'daily', protocols: { ecoOnly: false, emergency: false, security: false, portal: true }, postalCode: '8203', city: 'Schaffhausen', hours: 4, address: 'Synthetic test 1', companyName: 'Synthetic QA', contactName: 'QA', contactEmail: 'qa@example.test', contactPhone: '', floorPlans: [], estimatedMonthlyBudget: 850, estimatedAnnualBudget: 10200, language: 'de-CH', status: 'pending', createdAt: serverTimestamp() });
  try {
    await write('contact_messages', contact());
    for (const change of [{ status: 'done' }, { admin: true }, { message: 'x'.repeat(5001) }, { language: 'unsupported' }, { createdAt: new Date(0) }, { email: 42 }]) await denied(write('contact_messages', { ...contact(), ...change }));
    await write('b2b_quotes', quote());
    for (const change of [{ status: 'paid' }, { payment: { paid: true } }, { contactEmail: 'x'.repeat(255) }, { services: { admin: true } }, { protocols: { portal: 'true' } }, { floorPlans: [{ name: 'test.pdf', size: '1 MB', content: 'x'.repeat(750001) }] }]) await denied(write('b2b_quotes', { ...quote(), ...change }));
    await denied(getDoc(doc(db, 'contact_messages', 'synthetic-private')));
    await denied(getDoc(doc(db, 'b2b_quotes', 'synthetic-private')));
  } finally { await terminate(db); await deleteApp(app); }
});
