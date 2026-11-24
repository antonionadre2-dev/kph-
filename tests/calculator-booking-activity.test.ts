import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { parseBookingActivity } from '../src/booking/bookingActivity';

const NOW = Date.parse('2026-11-24T14:00:00.000Z');
const HOUR = 60 * 60 * 1000;
const at = (millisecondsBeforeNow: number) => new Date(NOW - millisecondsBeforeNow).toISOString();
const liveEvent = (overrides: Record<string, unknown> = {}) => ({
  id: 'booking_001',
  service: 'windows',
  region: 'Schaffhausen',
  occurredAt: at(5 * 60 * 1000),
  status: 'confirmed',
  ...overrides,
});

test('only an explicitly confirmed booking may become customer-facing social proof', () => {
  const unconfirmedStatuses: unknown[] = [undefined, null, '', false, 'pending', 'requested', 'paid', 'checkout_started', 'cancelled', 'refunded'];
  for (const status of unconfirmedStatuses) {
    assert.deepEqual(parseBookingActivity({ events: [liveEvent({ status })] }, NOW), [], `status ${String(status)} must not create a notice`);
  }
  const absentStatus = liveEvent();
  delete (absentStatus as Record<string, unknown>).status;
  assert.deepEqual(parseBookingActivity({ events: [absentStatus] }, NOW), [], 'a missing confirmation is not a confirmed booking');
  assert.equal(parseBookingActivity({ events: [liveEvent()] }, NOW).length, 1);
});

test('test, demonstration and refunded events cannot be promoted to real bookings', () => {
  for (const marker of ['test', 'demo', 'refunded']) {
    assert.deepEqual(parseBookingActivity({ events: [liveEvent({ [marker]: true })] }, NOW), [], `${marker} event must remain hidden`);
  }
  assert.equal(parseBookingActivity({ events: [liveEvent({ test: false, demo: false, refunded: false })] }, NOW).length, 1);
});

test('activity excludes invalid, future and stale timestamps while keeping the exact 24-hour boundary', () => {
  const events = [
    liveEvent({ id: 'event_now', occurredAt: at(0) }),
    liveEvent({ id: 'event_day', occurredAt: at(24 * HOUR) }),
    liveEvent({ id: 'event_old', occurredAt: at(24 * HOUR + 1) }),
    liveEvent({ id: 'event_future', occurredAt: at(-1) }),
    liveEvent({ id: 'event_bad_date', occurredAt: 'not-a-date' }),
    liveEvent({ id: 'event_numeric', occurredAt: NOW }),
    liveEvent({ id: 'event_missing', occurredAt: undefined }),
  ];
  assert.deepEqual(parseBookingActivity({ events }, NOW).map(event => event.id), ['event_now', 'event_day']);
});

test('duplicate IDs produce one notice and an invalid row does not suppress a later valid booking', () => {
  const duplicate = liveEvent({ id: 'event_duplicate', occurredAt: at(HOUR) });
  const invalidThenValid = liveEvent({ id: 'event_recovered', occurredAt: at(2 * HOUR) });
  const events = [
    { ...invalidThenValid, status: 'pending' },
    duplicate,
    { ...duplicate },
    invalidThenValid,
    liveEvent({ id: 'event_newest', occurredAt: at(60_000) }),
  ];
  const parsed = parseBookingActivity({ events }, NOW);
  assert.deepEqual(parsed.map(event => event.id), ['event_newest', 'event_duplicate', 'event_recovered']);
  assert.equal(new Set(parsed.map(event => event.id)).size, parsed.length);
});

test('public activity exposes only anonymous service, broad region, event ID and time', () => {
  const incoming = liveEvent({
    name: 'Private customer',
    email: 'private@example.test',
    phone: '+41 00 000 00 00',
    address: 'Private street 17',
    postalCode: '0000',
    amountPaidCents: 69000,
    customer: { name: 'Nested private customer', notes: 'Private appointment details' },
    message: '<img src=x onerror=alert(1)>',
    checkoutToken: 'must-never-be-exposed',
  });
  const [parsed] = parseBookingActivity({ events: [incoming] }, NOW);
  assert.deepEqual(parsed, {
    id: 'booking_001', service: 'windows', region: 'Schaffhausen', occurredAt: at(5 * 60 * 1000),
  });
  assert.notEqual(parsed, incoming, 'the output must be a separate allowlisted object');
  assert.equal((incoming as Record<string, unknown>).email, 'private@example.test', 'parsing must not mutate the input');
});

test('malformed payloads and unrecognised service or region labels cannot inject notification copy', () => {
  for (const payload of [null, undefined, 'events', [], {}, { events: null }, { events: 'not-an-array' }]) {
    assert.deepEqual(parseBookingActivity(payload, NOW), []);
  }
  const events = [
    null,
    42,
    'not-an-event',
    liveEvent({ id: '<script>bad</script>' }),
    liveEvent({ id: 'short' }),
    liveEvent({ service: 'Someone just paid! Book now!' }),
    liveEvent({ region: 'Private street 17, apartment 3' }),
    liveEvent(),
  ];
  assert.deepEqual(parseBookingActivity({ events }, NOW).map(event => event.id), ['booking_001']);
});
