import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuthSession, type SessionState } from '../src/auth/session.ts';
import { isStaffIdentity, needsAuthSession } from '../src/auth/access.ts';

type Person = { uid: string };
const deferred = <T>() => { let resolve!: (value: T) => void; let reject!: (error: unknown) => void; const promise = new Promise<T>((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
const flush = () => new Promise<void>(resolve => setImmediate(resolve));
function harness(resolve: (person: Person) => Promise<Person> = async person => person, load?: () => Promise<void>) {
  const states: SessionState<Person>[] = [], observers = new Set<(person: Person | null) => void>();
  const sdk = { person: null as Person | null };
  let loads = 0, subscriptions = 0, signsOut = 0;
  const emit = (person: Person | null) => { sdk.person = person; observers.forEach(receive => receive(person)); };
  const session = createAuthSession({
    load: async () => { loads++; await load?.(); return sdk; },
    current: sdk => sdk.person,
    resolve,
    subscribe: (_sdk, receive) => { subscriptions++; observers.add(receive); receive(sdk.person); return () => observers.delete(receive); },
    signOut: async () => { signsOut++; emit(null); },
    changed: state => states.push(state),
  });
  return { session, sdk, states, emit, observers, get loads() { return loads; }, get subscriptions() { return subscriptions; }, get signsOut() { return signsOut; } };
}

test('staff access requires a verified exact owner or a verified boolean admin claim', () => {
  assert.equal(isStaffIdentity(null), false);
  for (const email of ['staff@krakenpfm.ch', 'someone@krakenpfm.ch', 'kai+test@krakenpfm.ch', 'kai@krakenpfm.ch.other.example']) assert.equal(isStaffIdentity({ email, emailVerified: true }), false);
  assert.equal(isStaffIdentity({ email: 'kai@krakenpfm.ch', emailVerified: false, admin: true }), false);
  assert.equal(isStaffIdentity({ email: 'KAI@KRAKENPFM.CH', emailVerified: true }), true);
  assert.equal(isStaffIdentity({ email: 'customer@example.test', emailVerified: true, admin: true }), true);
  assert.equal(isStaffIdentity({ email: 'customer@example.test', emailVerified: true, admin: 'true' }), false);
  for (const path of ['/', '/es/', '/umzugsreinigung/zuerich', '/en/offerte', '/fr/ueber-uns']) assert.equal(needsAuthSession(path), false);
  for (const path of ['/login', '/es/register', '/fr/dashboard', '/pt/admin']) assert.equal(needsAuthSession(path), true);
});

test('a public mount loads no SDK and StrictMode cleanup cannot create duplicate subscriptions', async () => {
  const gate = deferred<void>(), h = harness(undefined, () => gate.promise);
  h.session.mount(); assert.equal(h.loads, 0);
  const first = h.session.start(); h.session.unmount(); h.session.mount(); const second = h.session.start();
  gate.resolve(); await Promise.all([first, second]);
  assert.equal(h.subscriptions, 1); assert.equal(h.observers.size, 1);
  h.session.unmount(); assert.equal(h.observers.size, 0);
});

test('a late token read cannot restore a signed-out or superseded identity', async () => {
  const first = deferred<Person>(), second = deferred<Person>();
  const h = harness(person => person.uid === 'first' ? first.promise : second.promise);
  h.session.mount(); await h.session.start();
  h.emit({ uid: 'first' }); h.emit({ uid: 'second' }); second.resolve({ uid: 'second' }); await flush();
  first.resolve({ uid: 'first' }); await flush();
  assert.equal(h.states.filter(state => 'user' in state).at(-1)?.user?.uid, 'second');
  h.emit({ uid: 'first' }); await h.session.logout(); await flush();
  assert.equal(h.states.filter(state => 'user' in state).at(-1)?.user, null);
  h.session.unmount();
});

test('logout serializes behind an in-flight login and suppresses its stale completion', async () => {
  const login = deferred<Person>(), h = harness();
  h.session.mount(); await h.session.start();
  const request = h.session.authenticate(async () => login.promise);
  const cancelled = assert.rejects(request, { code: 'auth/operation-cancelled' });
  await flush(); const logout = h.session.logout();
  h.emit({ uid: 'late-login' }); login.resolve({ uid: 'late-login' });
  await Promise.all([cancelled, logout]); await flush();
  assert.equal(h.sdk.person, null); assert.equal(h.signsOut, 1);
  assert.equal(h.states.filter(state => 'user' in state).at(-1)?.user, null);
  assert.equal(h.states.some(state => state.user?.uid === 'late-login'), false);
  h.session.unmount();
});

test('an unmount rejects pending UI completion and a failed SDK load can be retried', async () => {
  const claim = deferred<Person>(), h = harness(() => claim.promise);
  h.session.mount(); await h.session.start();
  const request = h.session.authenticate(async sdk => { sdk.person = { uid: 'pending' }; return sdk.person; });
  const cancelled = assert.rejects(request, { code: 'auth/operation-cancelled' });
  await flush(); h.session.unmount(); const count = h.states.length;
  claim.resolve({ uid: 'pending' }); await cancelled; await flush(); assert.equal(h.states.length, count);
  let failed = true;
  const retry = harness(undefined, async () => { if (failed) { failed = false; throw Error('offline'); } });
  retry.session.mount(); await retry.session.start(); await retry.session.start();
  assert.equal(retry.subscriptions, 1); retry.session.unmount();
});
