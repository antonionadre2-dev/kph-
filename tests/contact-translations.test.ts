import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { CONTACT_TRANSLATIONS, contactText, contactTranslationRows, contactTranslationSources } from '../components/contact/contactTranslations';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const languages = ['de', 'en', 'es', 'pt', 'it', 'fr'] as const;
const placeholders = (value: string) => [...value.matchAll(/\{([A-Za-z][A-Za-z0-9_]*)\}/g)].map(match => match[1]).sort();

test('Contact copy covers all six languages with unique nonempty source rows', () => {
  assert.deepEqual(Object.keys(CONTACT_TRANSLATIONS).sort(), [...languages].sort());
  assert.equal(new Set(contactTranslationSources).size, contactTranslationSources.length);
  for (const row of contactTranslationRows) {
    assert.equal(row.length, 6, row[0]);
    for (const value of row) assert.ok(value.trim(), row[0]);
  }
  for (const language of languages) {
    assert.deepEqual(Object.keys(CONTACT_TRANSLATIONS[language]).sort(), [...contactTranslationSources].sort());
    for (const source of contactTranslationSources) {
      assert.equal(contactText(language, source), CONTACT_TRANSLATIONS[language][source]);
      assert.deepEqual(placeholders(contactText(language, source)), placeholders(source), `${language}: ${source}`);
    }
  }
});

test('Contact translations preserve route values literally and handle regional languages safely', () => {
  for (const language of languages) {
    const route = '<Kraken> $& → Rheinfall';
    assert.ok(contactText(language, 'Karte mit Beispielroute {route}', { route }).includes(route));
    assert.ok(contactText(language, 'ca. {minutes} Min.', { minutes: 12 }).includes('12'));
    assert.ok(contactText(language, 'Adresssuche: swisstopo · Route: {provider}', { provider: 'OSRM $&' }).includes('OSRM $&'));
    assert.ok(contactText(language, 'Eingegebene Adresse: {address}', { address: '<Address> $&' }).includes('<Address> $&'));
  }
  assert.equal(contactText('de-CH', 'Offerte berechnen'), 'Offerte berechnen');
  assert.equal(contactText('es-ES', 'Offerte berechnen'), 'Calcular un presupuesto');
  assert.equal(contactText('fr-CH', 'Offerte berechnen'), 'Calculer un devis');
  assert.equal(contactText('xx', 'Offerte berechnen'), 'Offerte berechnen');
  assert.equal(contactText('__proto__', 'Offerte berechnen'), 'Offerte berechnen');
  for (const source of ['__proto__', 'constructor', 'toString', 'Unknown source']) assert.equal(contactText('en', source), source);
  assert.equal(contactText('es', 'ca. {minutes} Min.', Object.create({ minutes: 7 })), 'aprox. {minutes} min');
});

test('The office concept disclaimer explains the images in each selected language', () => {
  const source = 'Konzeptbilder · keine Fotos des Standorts';
  const expected = {
    de: source,
    en: 'Concept images · not photos of the location',
    es: 'Imágenes conceptuales · no son fotos del local',
    pt: 'Imagens conceptuais · não são fotografias do local',
    it: 'Immagini concettuali · non sono foto della sede',
    fr: 'Images conceptuelles · pas de photos du site',
  };
  for (const language of languages) {
    assert.equal(contactText(language, source), expected[language]);
    if (language !== 'de') assert.notEqual(contactText(language, source), source);
  }
});

test('Contact JSX, runtime branches and example destination labels request translated source strings', () => {
  const known = new Set(contactTranslationSources);
  const sources: { file: string; line: number; text: string }[] = [];
  for (const file of ['components/KontaktPage.tsx', 'components/contact/contact-controller.js', 'components/contact/contact-basemap.js']) {
    const parsed = ts.createSourceFile(file, readFileSync(path.join(root, file), 'utf8'), ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.JS);
    function addLiteral(node: ts.Node | undefined): void {
      if (!node) return;
      if (ts.isStringLiteralLike(node)) sources.push({ file, line: parsed.getLineAndCharacterOfPosition(node.getStart()).line + 1, text: node.text });
      else if (ts.isConditionalExpression(node)) { addLiteral(node.whenTrue); addLiteral(node.whenFalse); }
      else if (ts.isParenthesizedExpression(node)) addLiteral(node.expression);
    }
    function walk(node: ts.Node): void {
      if (ts.isCallExpression(node)) {
        const helper = node.expression.getText(parsed);
        if (['t', 'text'].includes(helper)) addLiteral(node.arguments[0]);
        // The basemap's message helper delegates to t(source); its empty
        // string calls clear a status and do not introduce visible copy.
        if (file.endsWith('contact-basemap.js') && helper === 'message'
          && ts.isStringLiteralLike(node.arguments[0]) && node.arguments[0].text) addLiteral(node.arguments[0]);
      }
      ts.forEachChild(node, walk);
    }
    walk(parsed);
  }
  const data = JSON.parse(readFileSync(path.join(root, 'public/kraken-contact/data/contact-map-data.json'), 'utf8'));
  for (const destination of data.destinations) sources.push({ file: 'contact-map-data.json', line: 1, text: destination.label });
  assert.ok(sources.length > 60, 'Inspect static copy, ARIA labels and runtime conditionals');
  assert.deepEqual(sources.filter(source => !known.has(source.text)), [], 'No silent fallback to untranslated German');
});

test('Contact renders real multilingual HTML and usable contact/calculator links before the map loads', async () => {
  const cache = path.join(root, 'node_modules/.cache');
  mkdirSync(cache, { recursive: true });
  const temporary = mkdtempSync(path.join(cache, 'contact-content-test-'));
  try {
    const outfile = path.join(temporary, 'render.cjs');
    await build({
      stdin: { contents: `import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {ContactContent} from './components/KontaktPage.tsx';export const render=language=>renderToStaticMarkup(React.createElement(ContactContent,{language}));`, resolveDir: root, loader: 'tsx' },
      outfile, bundle: true, platform: 'node', format: 'cjs', packages: 'external', loader: { '.css': 'empty' }, logLevel: 'warning',
    });
    const render = createRequire(import.meta.url)(outfile).render as (language: string) => string;
    for (const language of languages) {
      const html = render(language);
      assert.equal((html.match(/<h1\b/g) || []).length, 1, language);
      assert.equal((html.match(/id="kraken-contact-real"/g) || []).length, 1, language);
      assert.match(html, /Seewadelstrasse 3/);
      assert.match(html, /8203 Schaffhausen/);
      assert.match(html, /href="tel:\+41774505705"/);
      assert.match(html, /href="mailto:kai@krakenpfm\.ch"/);
      assert.match(html, new RegExp(`href="/quote\\?lang=${language}"`));
      assert.match(html, /09:00–19:00/);
      assert.match(html, /Europe\/Zurich/);
      assert.match(html, /Properties &amp; Facilities Management/);
      assert.ok(html.includes(contactText(language, 'Konzeptbilder · keine Fotos des Standorts')), language + ': translated office concept disclaimer');
      if (language !== 'de') assert.ok(!html.includes('Konzeptbilder · keine Fotos des Standorts'), language + ': no German disclaimer fallback');
      assert.match(html, /© swisstopo · © OpenStreetMap contributors \/ openrouteservice/);
      assert.ok(html.includes(contactText(language, 'Mo–So')), language + ': seven contact days');
      const initialMetrics = html.match(/<div\b[^>]*class="kr-result"[^>]*>/)?.[0];
      assert.ok(initialMetrics?.includes('hidden'), language + ': no invented route before data loads');
      assert.doesNotMatch(html, /<iframe|data:image\/|(?:CHF|EUR)\s*\d/);
      if (language !== 'de') assert.ok(!html.includes('Persönlich für Sie da.'), language + ': translated heading');
    }
  } finally { rmSync(temporary, { recursive: true, force: true }); }
});
