import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  BUSINESS_HOURS, businessHoursLabel, businessHoursLongLabel, businessHoursSentence,
  businessHoursTimeZoneLabel, businessOpeningHoursSpecification, isBusinessOpen,
} from '../src/config/business-hours.mjs';
import { footerText } from '../components/home/footerTranslations.ts';
import { getContactCopy } from '../src/contact/contact-copy.ts';
import { getGDPRTranslation } from '../components/legal/privacy.ts';
import { getPageSeo } from '../src/seo/metadata.ts';
import { INDEXABLE_PATHS } from '../src/seo/crawl-policy.ts';
import { LocalBusinessSchema } from '../components/SchemaComponents.tsx';

const languages = ['de', 'en', 'es', 'pt', 'it', 'fr'];

test('the published schedule is every day and all public interfaces read it in their selected language', () => {
  assert.deepEqual(BUSINESS_HOURS.days, ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']);
  assert.equal(BUSINESS_HOURS.opens, '09:00');
  assert.equal(BUSINESS_HOURS.closes, '19:00');
  assert.equal(BUSINESS_HOURS.timeZone, 'Europe/Zurich');
  assert.equal(businessHoursLabel('de'), 'Mo–So · 09:00–19:00');
  assert.equal(businessHoursLabel('missing'), businessHoursLabel('de'));
  assert.equal(footerText('de', 'visits'), 'Besuche nach Vereinbarung');
  for (const language of languages) {
    assert.equal(footerText(language, 'hours'), businessHoursLabel(language));
    assert.equal(footerText(language, 'localTime'), businessHoursTimeZoneLabel(language));
    assert.equal(getContactCopy(language).hero.hours, businessHoursLabel(language));
    assert.ok(getContactCopy(language).meta.description.includes(BUSINESS_HOURS.opens));
    assert.ok(getContactCopy(language).meta.description.includes(BUSINESS_HOURS.closes));
    assert.ok(getGDPRTranslation(language).introP1.includes(businessHoursLongLabel(language)));
    assert.ok(businessHoursSentence(language).includes(BUSINESS_HOURS.opens));
  }
});

test('all 150 public language pages and the React schema expose the same seven-day opening specification', () => {
  const expected = businessOpeningHoursSpecification();
  let checked = 0;
  for (const pathname of INDEXABLE_PATHS) for (const language of languages) {
    const business = getPageSeo(pathname, language).structuredData.find(item => item['@type'] === 'LocalBusiness');
    assert.ok(business, pathname + ':' + language);
    assert.deepEqual(business.openingHoursSpecification, expected, pathname + ':' + language);
    checked++;
  }
  assert.equal(checked, 150);
  const markup = renderToStaticMarkup(React.createElement(LocalBusinessSchema));
  const json = JSON.parse(markup.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, ''));
  assert.deepEqual(json.openingHoursSpecification, expected);
});

test('open/closed boundaries follow Zurich in winter, summer, Sundays and both DST transitions', () => {
  const cases: [string, boolean][] = [
    ['2026-11-28T07:59:59Z', false], ['2026-11-28T08:00:00Z', true],
    ['2026-11-28T17:59:59Z', true], ['2026-11-28T18:00:00Z', false],
    ['2026-07-12T06:59:59Z', false], ['2026-07-12T07:00:00Z', true],
    ['2026-07-12T16:59:59Z', true], ['2026-07-12T17:00:00Z', false],
    ['2026-03-29T06:59:59Z', false], ['2026-03-29T07:00:00Z', true],
    ['2026-10-25T07:59:59Z', false], ['2026-10-25T08:00:00Z', true],
  ];
  for (const [instant, expected] of cases) assert.equal(isBusinessOpen(new Date(instant)), expected, instant);
  for (let day = 23; day <= 29; day++) assert.equal(isBusinessOpen(new Date(`2026-11-${day}T12:00:00Z`)), true);
});

test('the visitor or server timezone cannot change the Zurich opening state', () => {
  const moduleUrl = new URL('../src/config/business-hours.mjs', import.meta.url).href;
  const code = `import {isBusinessOpen} from ${JSON.stringify(moduleUrl)}; process.stdout.write(JSON.stringify([isBusinessOpen(new Date('2026-11-28T08:00:00Z')),isBusinessOpen(new Date('2026-07-12T17:00:00Z'))]));`;
  for (const timezone of ['UTC', 'Pacific/Honolulu', 'Asia/Tokyo']) {
    const result = execFileSync(process.execPath, ['--input-type=module', '-e', code], { encoding: 'utf8', env: { ...process.env, TZ: timezone } });
    assert.deepEqual(JSON.parse(result), [true, false]);
  }
});
