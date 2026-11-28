import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { I18nProvider } from '../i18n.ts';
import Section6FAQ from '../components/Section6FAQ.tsx';
import { legacyTranslations } from '../src/i18n/legacy-translations.ts';
import { businessHoursLabel, businessHoursLongLabel } from '../src/config/business-hours.mjs';

const languages = ['de', 'en', 'es', 'pt', 'it', 'fr'] as const;

test('the reusable FAQ never promises round-the-clock human phone or WhatsApp support', () => {
  for (const language of languages) {
    const html = renderToStaticMarkup(React.createElement(I18nProvider, { initialLanguage: language, children: React.createElement(Section6FAQ) }));
    assert.ok(html.includes(businessHoursLongLabel(language)), language);
    assert.doesNotMatch(html, /24\/7|rund um die Uhr/, language);
  }
});

test('deferred support copy gives visitors the same seven-day contact schedule', () => {
  for (const language of languages) {
    const support = legacyTranslations[language]['segment.commercial.bullet4'];
    assert.ok(support.includes(businessHoursLabel(language)), language);
    assert.doesNotMatch(support, /24\/7/, language);
  }
  assert.equal(legacyTranslations['de-CH']['segment.commercial.bullet4'], legacyTranslations.de['segment.commercial.bullet4']);
});
