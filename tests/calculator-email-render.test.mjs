import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bookingText } from '../src/booking/uiCopy.ts';
import { recoveryCopy } from '../src/booking/recoveryCopy.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cache = path.join(root, 'node_modules/.cache');
mkdirSync(cache, { recursive: true });
const temporary = mkdtempSync(path.join(cache, 'email-readiness-test-'));
let render;
try {
  const outfile = path.join(temporary, 'render.cjs');
  await build({
    stdin: { contents: `
      import React from 'react'; import {renderToStaticMarkup} from 'react-dom/server';
      import QuoteRecoveryCard from './components/QuoteRecoveryCard.tsx';
      import {defaultSelection} from './src/booking/pricing.ts';
      export const render=(language,preview)=>renderToStaticMarkup(<QuoteRecoveryCard
        language={language} preview={preview} selection={defaultSelection('regular')}
        selectedService="regular" email="" onEmailAccepted={()=>{}} />);
    `, resolveDir: root, loader: 'tsx' },
    outfile, bundle: true, platform: 'node', format: 'cjs', packages: 'external', loader: { '.css': 'empty' }, logLevel: 'warning',
  });
  render = createRequire(import.meta.url)(outfile).render;
} finally { rmSync(temporary, { recursive: true, force: true }); }

test('the live recovery card offers no email form or reminder consent before availability is confirmed', () => {
  for (const language of ['de', 'en', 'es', 'fr', 'it', 'pt']) {
    const html = render(language, false);
    assert.ok(html.includes(bookingText(language, 'recoveryAvailabilityLoading')), language);
    assert.doesNotMatch(html, /<input|kr-recovery-save|kr-recovery-consent/);
    assert.equal(html.includes(recoveryCopy(language).intro), false, language + ': must not promise an unavailable email');
  }
});

test('the explicitly labelled demo keeps its email preview form independently of live configuration', () => {
  for (const language of ['de', 'en', 'es', 'fr', 'it', 'pt']) {
    const html = render(language, true);
    assert.match(html, /kr-recovery-save/);
    assert.match(html, /kr-recovery-consent/);
    assert.ok(html.includes(recoveryCopy(language).intro), language);
    assert.ok(html.includes(recoveryCopy(language).previewOnly), language);
    assert.equal(html.includes(bookingText(language, 'recoveryAvailabilityLoading')), false);
  }
});
