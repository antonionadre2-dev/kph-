import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldSubmitKaiMessage, kaiLauncherClearance, kaiCalculatorNavigationTarget } from '../src/kai/ui.ts';
import { kaiText, kaiFieldLabel } from '../src/kai/copy.ts';
import { publicHref } from '../src/routing/site-paths.ts';
import { localizedNavigationUrl } from '../src/locale.ts';

const enter = { key: 'Enter', shiftKey: false, isComposing: false, keyCode: 13 };

test('Kai Enter sends a nonempty message once; newline and IME confirmation stay in the composer', () => {
  assert.equal(shouldSubmitKaiMessage(enter, '3.5 Zimmer, 85 m²', false), true);
  assert.equal(shouldSubmitKaiMessage({ ...enter, shiftKey: true }, 'Line one', false), false);
  assert.equal(shouldSubmitKaiMessage({ ...enter, isComposing: true }, '清掃', false), false);
  assert.equal(shouldSubmitKaiMessage({ ...enter, keyCode: 229 }, '清掃', false), false);
  assert.equal(shouldSubmitKaiMessage(enter, '   ', false), false);
  assert.equal(shouldSubmitKaiMessage(enter, 'Wait', true), false);
  assert.equal(shouldSubmitKaiMessage({ ...enter, key: 'a' }, 'Wait', false), false);
});

test('launcher clears translated mobile price bars of varying heights and remains visible without one', () => {
  for (const height of [74, 96.4, 135, 192.2]) assert.ok(kaiLauncherClearance(height) - height >= 12);
  assert.equal(kaiLauncherClearance(0), 16);
  assert.equal(kaiLauncherClearance(Number.NaN), 16);
});

test('Kai labels explain AI authority and expose area, hours and date handoff in all six languages', () => {
  const expected = { de:'Termin wählen', en:'Choose a date', es:'Elegir fecha', pt:'Escolher data', it:'Scegliere la data', fr:'Choisir une date' };
  for (const [language, dateLabel] of Object.entries(expected)) {
    assert.equal(kaiText(language, 'chooseDate'), dateLabel);
    assert.match(kaiFieldLabel(language, 'area'), /m²/);
    assert.ok(kaiFieldLabel(language, 'hours').length > 0);
    assert.ok(kaiText(language, 'aiLabel').length > 45);
    assert.ok(!/\{\w+\}/.test(kaiText(language, 'aiLabel')));
  }
  assert.equal(kaiText('de', 'aiLabel'), 'KI-Assistent. Verbindlich sind Rechner und Auftragsbestätigung.');
});

test('calculator handoff keeps a conversation language different from the surrounding page', () => {
  const chatDestination = kaiCalculatorNavigationTarget('/offerte?service=end', 'en');
  const next = localizedNavigationUrl(chatDestination, 'https://krakenpfm.ch/leistungen?lang=de', 'de');
  assert.equal(next, '/en/offerte?service=end');
  assert.equal(publicHref('/es/offerte?service=regular', 'fr'), '/fr/offerte?service=regular');
  const germanTarget = kaiCalculatorNavigationTarget('/es/offerte?service=end', 'de');
  assert.equal(localizedNavigationUrl(germanTarget, 'https://krakenpfm.ch/es/leistungen', 'es'), '/offerte?service=end');
});
