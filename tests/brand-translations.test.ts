import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getBrandTranslation, publicTranslations, KRAKEN_COMPANY_DESCRIPTOR } from '../src/i18n/public-translations.ts';

const expected = {
  de: ['Reinigung & kleine Umzüge', 'Startseite'],
  en: ['Cleaning & small moves', 'Home'],
  es: ['Limpieza y pequeñas mudanzas', 'Inicio'],
  pt: ['Limpeza e pequenas mudanças', 'Início'],
  it: ['Pulizie e piccoli traslochi', 'Home'],
  fr: ['Nettoyage et petits déménagements', 'Accueil'],
} as const;

test('the brand tagline and logo accessible name use the six exact approved translations', () => {
  assert.equal(KRAKEN_COMPANY_DESCRIPTOR, 'Properties & Facilities Management');
  for (const [language, [tagline, home]] of Object.entries(expected)) {
    assert.equal(getBrandTranslation(language, 'header.tagline'), tagline);
    assert.equal(getBrandTranslation(language, 'header.logoAria'), `Kraken ${KRAKEN_COMPANY_DESCRIPTOR} – ${home}`);
    assert.equal(publicTranslations[language as keyof typeof publicTranslations]['header.tagline'], tagline);
  }
});

test('Swiss German and regional language variants select the same public brand copy immediately', () => {
  for (const alias of ['de-CH', 'de-DE', 'DE_ch']) {
    assert.equal(getBrandTranslation(alias, 'header.tagline'), expected.de[0]);
    assert.equal(getBrandTranslation(alias, 'header.logoAria'), getBrandTranslation('de', 'header.logoAria'));
  }
  assert.equal(publicTranslations['de-CH']['header.tagline'], publicTranslations.de['header.tagline']);
  for (const alias of ['en-GB', 'es-CH', 'pt-PT', 'it-CH', 'fr-CH']) {
    const language = alias.split('-')[0];
    assert.equal(getBrandTranslation(alias, 'header.tagline'), expected[language as keyof typeof expected][0]);
  }
});

test('unknown or missing locales and missing localized keys fall back to German without changing other translations', () => {
  for (const language of [undefined, null, '', 'zh', '__proto__', 'constructor', 1]) {
    assert.equal(getBrandTranslation(language, 'header.tagline'), expected.de[0]);
    assert.equal(getBrandTranslation(language, 'header.logoAria'), getBrandTranslation('de', 'header.logoAria'));
  }
  const missing = { de: publicTranslations.de, en: { 'header.logoAria': 'English fixture' } };
  assert.equal(getBrandTranslation('en', 'header.tagline', missing), expected.de[0]);
  assert.equal(getBrandTranslation('en', 'header.logoAria', missing), 'English fixture');
  assert.equal(getBrandTranslation('en', 'header.tagline', { en: { 'header.tagline': '' } }), expected.de[0]);
  assert.equal(getBrandTranslation('fr', 'header.logoAria', {}), getBrandTranslation('de', 'header.logoAria'));
  assert.equal(publicTranslations.en['nav.contact'], 'Contact Us');
});
