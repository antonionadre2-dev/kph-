import test from 'node:test';
import assert from 'node:assert/strict';
import {
  emailLanguages, EmailLanguageError, normalizeEmailLanguage,
  resolveWebsiteLanguage, languageFromAcceptLanguage, snapshotEmailLanguage,
  languageForBackgroundEmail, migrateLegacyEmailLanguage
} from '../src/language.mjs';

test('six supported choices and valid regional tags map to the existing email catalogs', () => {
  assert.deepEqual(emailLanguages, ['de', 'en', 'es', 'fr', 'it', 'pt']);
  for (const language of emailLanguages) assert.equal(normalizeEmailLanguage(language), language);
  for (const [tag, expected] of [
    ['de-CH', 'de'], ['EN-gb', 'en'], ['es-MX', 'es'], ['fr-CH', 'fr'],
    ['it-CH', 'it'], ['pt-BR', 'pt'], [' pt-PT ', 'pt'], ['en-US-u-ca-gregory', 'en']
  ]) assert.equal(normalizeEmailLanguage(tag), expected, tag);
  for (const value of [null, undefined, '', ' ', 'nl', 'zh-Hant', 'German', 'de_CH', 'en\n', {}, ['en'], 1]) {
    assert.throws(() => normalizeEmailLanguage(value), EmailLanguageError, String(value));
  }
});

test('the website selection wins over application, document and browser languages', () => {
  for (const selectedLanguage of emailLanguages) {
    assert.equal(resolveWebsiteLanguage({ selectedLanguage, siteLanguage: 'de', documentLanguage: 'en', browserLanguages: ['fr-CH'] }), selectedLanguage);
  }
  assert.equal(resolveWebsiteLanguage({ siteLanguage: 'pt-BR', documentLanguage: 'de', browserLanguages: ['en'] }), 'pt');
  assert.equal(resolveWebsiteLanguage({ documentLanguage: 'it-CH', browserLanguages: ['fr'] }), 'it');
  assert.equal(resolveWebsiteLanguage({ documentLanguage: 'xx', browserLanguages: ['nl-NL', 'es-ES', 'en'] }), 'es');
  assert.equal(resolveWebsiteLanguage({ browserLanguages: ['nl', 'zh'] }), 'de');
});

test('invalid explicit or application state cannot silently become German', () => {
  for (const selectedLanguage of ['', 'xx', 'de_CH']) {
    assert.throws(() => resolveWebsiteLanguage({ selectedLanguage, siteLanguage: 'de' }), EmailLanguageError);
  }
  assert.throws(() => resolveWebsiteLanguage({ siteLanguage: '', documentLanguage: 'de' }), EmailLanguageError);
  assert.throws(() => resolveWebsiteLanguage({ browserLanguages: 'en-US' }), /array/);
});

test('Accept-Language fallback respects supported ranges, quality and exclusions', () => {
  assert.equal(languageFromAcceptLanguage('de;q=0,fr-CH;q=0.9,en;q=0.8'), 'fr');
  assert.equal(languageFromAcceptLanguage('nl-NL,pt-BR;q=0.9,de;q=0.7'), 'pt');
  assert.equal(languageFromAcceptLanguage('fr;q=0.8,it;q=0.8'), 'fr');
  assert.equal(languageFromAcceptLanguage('es;q=1.2,pt;q=no,de;q=0.2'), 'de');
  assert.equal(languageFromAcceptLanguage('en;q=0,*;q=1'), null);
  assert.equal(languageFromAcceptLanguage('nl,zh;q=0.9'), null);
  assert.equal(languageFromAcceptLanguage('en\r\nX-Test:value'), null);
  assert.equal(languageFromAcceptLanguage(null), null);
});

test('synchronous snapshots capture the deliberate choice and preserve validated stored fallbacks', () => {
  for (const language of emailLanguages) {
    const snapshot = snapshotEmailLanguage({ selectedLanguage: language, bookingLanguage: 'fr', customerLanguage: 'it', acceptLanguage: 'de' });
    assert.deepEqual(snapshot, { language, source: 'selected', version: 1 });
    assert.ok(Object.isFrozen(snapshot));
  }
  assert.deepEqual(snapshotEmailLanguage({ bookingLanguage: 'es-MX', customerLanguage: 'it', acceptLanguage: 'de' }), { language: 'es', source: 'booking', version: 1 });
  assert.deepEqual(snapshotEmailLanguage({ customerLanguage: 'fr-CH', acceptLanguage: 'en' }), { language: 'fr', source: 'customer', version: 1 });
  assert.deepEqual(snapshotEmailLanguage({ acceptLanguage: 'nl,pt-BR;q=0.9' }), { language: 'pt', source: 'accept-language', version: 1 });
  assert.deepEqual(snapshotEmailLanguage(), { language: 'de', source: 'default', version: 1 });
  for (const fields of [
    { selectedLanguage: '', bookingLanguage: 'de' },
    { selectedLanguage: 'xx', acceptLanguage: 'en' },
    { bookingLanguage: 'invalid', customerLanguage: 'de' },
    { customerLanguage: '', acceptLanguage: 'en' }
  ]) assert.throws(() => snapshotEmailLanguage(fields), EmailLanguageError);
});

test('background emails use the persisted event language even after browser or profile changes', () => {
  const persisted = JSON.parse(JSON.stringify(snapshotEmailLanguage({ selectedLanguage: 'es-ES' })));
  const workerInput = { ...persisted, browserLanguage: 'de', customerLanguage: 'fr', acceptLanguage: 'en', webhookLanguage: 'it' };
  assert.equal(languageForBackgroundEmail(workerInput), 'es');
  assert.equal(languageForBackgroundEmail(snapshotEmailLanguage({ selectedLanguage: 'pt' })), 'pt');
  assert.throws(() => languageForBackgroundEmail(undefined), /required/);
  assert.throws(() => languageForBackgroundEmail('de'), /required/);
  assert.throws(() => languageForBackgroundEmail({ language: 'en' }), /persisted/);
  assert.throws(() => languageForBackgroundEmail({ ...persisted, version: 2 }), /persisted/);
  assert.throws(() => languageForBackgroundEmail({ ...persisted, source: 'webhook' }), /persisted/);
  assert.throws(() => languageForBackgroundEmail({ ...persisted, language: '' }), EmailLanguageError);
});

test('only an explicit legacy migration may supply a missing historic language', () => {
  assert.deepEqual(migrateLegacyEmailLanguage({ bookingLanguage: 'it-CH', customerLanguage: 'en' }), { language: 'it', source: 'booking', version: 1 });
  assert.deepEqual(migrateLegacyEmailLanguage({ customerLanguage: 'pt-PT' }), { language: 'pt', source: 'legacy-customer', version: 1 });
  assert.deepEqual(migrateLegacyEmailLanguage(), { language: 'de', source: 'legacy-default', version: 1 });
  assert.equal(languageForBackgroundEmail(migrateLegacyEmailLanguage({ customerLanguage: 'fr' })), 'fr');
  assert.throws(() => migrateLegacyEmailLanguage({ bookingLanguage: '', customerLanguage: 'en' }), EmailLanguageError);
  assert.throws(() => migrateLegacyEmailLanguage({ customerLanguage: 'unsupported' }), EmailLanguageError);
});
