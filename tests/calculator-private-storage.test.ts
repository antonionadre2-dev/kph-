import test from 'node:test';
import assert from 'node:assert/strict';
import { readPrivateCart, writePrivateCart, clearPrivateDrafts, PRIVATE_CART_KEY, PRIVATE_CONTACT_KEY, PRIVATE_CART_TTL_MS } from '../src/booking/privateStorage.ts';
import { buildQuoteWhatsAppHref, CONFIRMATION_WINDOW_COPY } from '../src/booking/calculatorFriction.ts';
import { calculatePrice, defaultSelection } from '../src/booking/pricing.ts';

function fixture() {
  const items = new Map<string, string>();
  return { items, getItem: (key: string) => items.get(key) ?? null, setItem: (key: string, value: string) => { items.set(key, value); }, removeItem: (key: string) => { items.delete(key); } };
}
const NOW = 1_800_000_000_000;
test('legacy drafts migrate only anonymous service options and immediately remove every contact field', t => {
  t.mock.method(Date, 'now', () => NOW);
  const storage = fixture();
  storage.setItem(PRIVATE_CONTACT_KEY, JSON.stringify({ name: 'Private Person', email: 'secret@example.test', address: 'Private street', token: 'secret-token' }));
  storage.setItem(PRIVATE_CART_KEY, JSON.stringify([{ id: 'secret-id', type: 'end-of-tenancy', price: 1, customer: { email: 'nested@example.test' }, details: { roomsCount: 2.5, bathroomsCount: 1, address: 'Private street', postcode: '8001', notes: 'Private note', amount: 1, publicToken: 'secret-token', heavySoiling: false, frequency: 'secret@example.test' } }]));
  assert.deepEqual(readPrivateCart(storage), [{ type: 'end-of-tenancy', details: { roomsCount: 2.5, bathroomsCount: 1, heavySoiling: false } }]);
  assert.equal(storage.getItem(PRIVATE_CONTACT_KEY), null);
  const saved = JSON.parse(storage.getItem(PRIVATE_CART_KEY)!);
  assert.equal(saved.savedAt, NOW);
  assert.equal(saved.expiresAt, NOW + PRIVATE_CART_TTL_MS);
  assert.doesNotMatch(JSON.stringify(saved), /secret|Private|email|address|postcode|token|amount|price|customer|notes/);
});

test('drafts expire, reject malformed and extended retention, and reads do not renew the expiry', t => {
  let now = NOW;
  t.mock.method(Date, 'now', () => now);
  const storage = fixture();
  writePrivateCart([{ type: 'windows', details: { standard: 4, difficultAccess: false } }], storage);
  const envelope = JSON.parse(storage.getItem(PRIVATE_CART_KEY)!);
  now += 1000;
  assert.equal(readPrivateCart(storage).length, 1);
  assert.equal(JSON.parse(storage.getItem(PRIVATE_CART_KEY)!).expiresAt, envelope.expiresAt);
  now = envelope.expiresAt;
  assert.deepEqual(readPrivateCart(storage), []);
  assert.equal(storage.getItem(PRIVATE_CART_KEY), null);
  for (const malformed of ['{invalid', 'null', '{}', JSON.stringify({ ...envelope, expiresAt: NOW + PRIVATE_CART_TTL_MS * 2 }), JSON.stringify({ ...envelope, savedAt: now + 1, expiresAt: now + 2 })]) {
    storage.setItem(PRIVATE_CART_KEY, malformed);
    assert.deepEqual(readPrivateCart(storage), []);
    assert.equal(storage.getItem(PRIVATE_CART_KEY), null);
  }
});

test('clear after a successful request removes drafts while retaining payment and recovery capabilities', () => {
  const storage = fixture();
  for (const key of [PRIVATE_CART_KEY, PRIVATE_CONTACT_KEY, 'kraken.booking.book1', 'kraken.recovery.draft1', 'language']) storage.setItem(key, key);
  clearPrivateDrafts(storage);
  assert.equal(storage.getItem(PRIVATE_CART_KEY), null);
  assert.equal(storage.getItem(PRIVATE_CONTACT_KEY), null);
  assert.equal(storage.getItem('kraken.booking.book1'), 'kraken.booking.book1');
  assert.equal(storage.getItem('kraken.recovery.draft1'), 'kraken.recovery.draft1');
  assert.equal(storage.getItem('language'), 'language');
  const blocked = { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); }, removeItem() { throw Error('blocked'); } };
  assert.deepEqual(readPrivateCart(blocked), []);
  assert.deepEqual(writePrivateCart([{ type: 'moving' }], blocked), [{ type: 'moving' }]);
  assert.doesNotThrow(() => clearPrivateDrafts(blocked));
});

test('WhatsApp includes only calculated service lines and never free text, personal details or capability tokens', () => {
  for (const language of ['de', 'en', 'es', 'fr', 'it', 'pt']) {
    const selection = defaultSelection('endOfTenancy');
    const href = new URL(buildQuoteWhatsAppHref({ ...selection, name: 'Private Name', email: 'secret@example.test', address: 'Private street', publicToken: 'private-token' } as typeof selection, 'endOfTenancy', language));
    assert.equal(href.origin, 'https://wa.me');
    assert.equal(href.pathname, '/41774505705');
    assert.ok(href.searchParams.get('text')!.includes(String(calculatePrice(selection).totalCents! / 100)));
    assert.doesNotMatch(href.searchParams.get('text')!, /Private|secret|private-token|publicToken/);
    const moving = buildQuoteWhatsAppHref({ ...defaultSelection('moving'), details: 'Private street 1, contact secret@example.test' }, 'moving', language);
    assert.doesNotMatch(decodeURIComponent(moving), /Private|secret|street/);
    assert.equal(CONFIRMATION_WINDOW_COPY[language as keyof typeof CONFIRMATION_WINDOW_COPY], '');
  }
});
