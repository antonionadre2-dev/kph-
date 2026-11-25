import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bookingText } from '../src/booking/uiCopy.ts';
import { frictionText } from '../src/booking/calculatorFriction.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bundle = await build({
  stdin: { contents: `import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {I18nProvider} from './i18n.ts';import ServiceCalculatorPage from './components/ServiceCalculatorPage.tsx';export const render=(language)=>renderToStaticMarkup(<I18nProvider initialLanguage={language}><ServiceCalculatorPage onNavigate={()=>{}}/></I18nProvider>);`, resolveDir: root, loader: 'tsx' },
  bundle: true, platform: 'node', format: 'cjs', packages: 'external', write: false, loader: { '.css': 'empty' }, logLevel: 'warning',
});
const mod = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports);
function render(language, service) {
  const previous = globalThis.window;
  globalThis.window = { location: { search: service ? `?service=${service}` : '', href: 'https://krakenpfm.ch/offerte' } };
  try { return mod.exports.render(language); } finally { if (previous) globalThis.window = previous; else delete globalThis.window; }
}
const escaped = text => text.replaceAll('&', '&amp;').replaceAll("'", '&#x27;');
test('end-of-tenancy is the first service and is selected by default or the existing end CTA alias', () => {
  for (const language of ['de', 'en', 'es', 'fr', 'it', 'pt']) for (const service of [undefined, 'end', 'end-of-tenancy']) {
    const html = render(language, service);
    const buttons = [...html.matchAll(/<button[^>]*class="kr-calc-service ([^"]*)"[^>]*>(.*?)<\/button>/gs)];
    assert.ok(buttons.length >= 5);
    assert.ok(buttons[0][1].includes('is-selected'));
    assert.ok(buttons[0][2].includes(escaped(bookingText(language, 'endOfTenancy'))));
    assert.ok(html.indexOf('id="kr-calc-postal"') < html.indexOf('class="kr-calc-services'));
    assert.ok(html.includes(escaped(frictionText(language, 'postcodeHint'))));
    assert.equal((html.match(/class="kr-calc-secondary-tools"/g) || []).length, 1);
    assert.ok(html.includes(escaped(frictionText(language, 'secondary'))));
    assert.doesNotMatch(html, /kr-calc-save-progress|type="submit"[^>]*>[^<]*Payrexx|TWINT|Visa|Mastercard/);
    assert.match(html, /wa\.me\/41774505705/);
  }
});
test('an explicit different service is preserved and an unknown intent is not silently booked as end-of-tenancy', () => {
  for (const service of ['windows', 'regular', 'deep', 'moving']) {
    const html = render('de', service);
    const selected = [...html.matchAll(/<button[^>]*class="kr-calc-service is-selected"[^>]*>(.*?)<\/button>/gs)].map(match => match[1]);
    assert.equal(selected.length, 1);
    assert.ok(selected[0].includes(bookingText('de', service)));
  }
  const unsupported = render('de', 'invented-service');
  assert.ok(unsupported.includes(bookingText('de', 'unsupportedIntent')));
  assert.doesNotMatch(unsupported, /class="kr-calc-service is-selected"/);
});
