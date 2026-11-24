import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMovingGuide, guidePreferencesFromQuery, movingGuideHtml, movingGuideLink } from '../src/booking/movingGuide';
import { bookingText } from '../src/booking/uiCopy';
import { customerAccessText } from '../src/booking/customerAccessCopy';
import { fieldErrorKey } from '../src/booking/fieldValidation';

test('downloaded guide escapes customer content and never treats a preferred date as confirmed', () => {
  const guide = buildMovingGuide({ language: 'es', service: 'moving', customer: { name: '<script>alert(1)</script>', address: 'Privatstrasse 1', postalCode: '8001', city: 'Zürich' }, requestedDate: '2026-12-18', appointmentConfirmed: false });
  const date = guide.context.find(item => item.label === guide.copy.date);
  assert.ok(date?.value.includes(guide.copy.unconfirmed));
  const html = movingGuideHtml(guide);
  assert.ok(html.startsWith('<!doctype html><html lang="es">'));
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes("default-src 'none'"));
  const confirmed = buildMovingGuide({ language: 'es', requestedDate: '2026-12-18', appointmentConfirmed: true });
  assert.ok(confirmed.context.some(item => item.label === confirmed.copy.dateConfirmed));
});

test('guide links restore only allowlisted public preferences without personal data', () => {
  const link = movingGuideLink('pt', { from: 'zurich', to: 'schaffhausen', vehicle: true }, 'moving');
  const url = new URL(link, 'https://krakenpfm.ch');
  assert.equal(url.searchParams.get('guide'), '1');
  assert.deepEqual(guidePreferencesFromQuery(url.search), { from: 'zurich', to: 'schaffhausen', vehicle: true });
  assert.deepEqual(guidePreferencesFromQuery('?guideFrom=private@example.com&guideTo=SomeStreet&guideVehicle=true'), { from: 'unknown', to: 'unknown', vehicle: false });
  assert.ok(!link.includes('email'));
  assert.ok(!link.includes('token'));
});

test('field errors and optional account access have explicit text in all six locales', () => {
  const titles = new Set<string>();
  for (const language of ['de', 'en', 'es', 'fr', 'it', 'pt']) {
    for (const key of ['requiredField', 'invalidEmailField', 'invalidPostalField', 'invalidPhoneField']) {
      assert.notEqual(bookingText(language, key), key);
      assert.ok(bookingText(language, key).length > 10);
    }
    titles.add(customerAccessText(language, 'title'));
    assert.ok(customerAccessText(language, 'queued').length > 15);
  }
  assert.equal(titles.size, 6);
  assert.equal(fieldErrorKey('kr-calc-email', false), 'invalidEmailField');
  assert.equal(fieldErrorKey('kr-calc-postal', false), 'invalidPostalField');
  assert.equal(fieldErrorKey('kr-calc-date', false), 'invalidDate');
  assert.equal(fieldErrorKey('kr-calc-email', true), 'requiredField');
});
