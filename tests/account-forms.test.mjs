import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const built = await build({ stdin: { contents: `
  import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';
  import {I18nProvider} from './i18n.ts';import {AuthProvider} from './components/Auth.tsx';
  import AccountForm from './components/auth/AccountForm.tsx';import NotFoundPage from './components/NotFoundPage.tsx';
  export const render=(language,mode)=>renderToStaticMarkup(<I18nProvider initialLanguage={language}><AuthProvider>{mode==='404'?<NotFoundPage/>:<AccountForm mode={mode} onNavigate={()=>{}}/>}</AuthProvider></I18nProvider>);
`, resolveDir: root, loader: 'tsx' }, bundle: true, platform: 'node', format: 'cjs', packages: 'external', write: false, loader: { '.css': 'empty' }, logLevel: 'silent' });
const module = { exports: {} };
new Function('require', 'module', 'exports', built.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);

test('six-language account forms render without loading an SDK, prefilled credentials or external submission', () => {
  const titles = new Set();
  const passwordLabels={de:'Passwort',en:'Password',es:'Contraseña',pt:'Palavra-passe',it:'Password',fr:'Mot de passe'};
  for (const language of ['de', 'en', 'es', 'pt', 'it', 'fr']) for (const mode of ['login', 'register']) {
    const html = module.exports.render(language, mode);
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
    assert.match(html, /type="password"/);
    assert.ok(html.includes(passwordLabels[language]));
    assert.match(html, new RegExp('autoComplete="' + (mode === 'register' ? 'new-password' : 'current-password') + '"', 'i'));
    assert.doesNotMatch(html, /<form[^>]+action=|emailjs|https:\/\/hook|value="[^"]+"/i);
    assert.match(html, new RegExp('href="' + (language === 'de' ? '' : '/' + language) + '/' + (mode === 'register' ? 'login' : 'register') + '"'));
    if (mode === 'register') { assert.match(html, /minLength="8"/i); assert.match(html, /name="name"/); }
    else titles.add(html.match(/<h1[^>]*>([^<]+)<\/h1>/)[1]);
  }
  assert.equal(titles.size, 5); // Spanish and Italian legitimately share the same formal heading.
});

test('404 pages have real localized native destinations and no retired business copy', () => {
  const titles = new Set();
  for (const language of ['de', 'en', 'es', 'pt', 'it', 'fr']) {
    const html = module.exports.render(language, '404');
    titles.add(html.match(/<h1[^>]*>([^<]+)<\/h1>/)[1]);
    assert.match(html, /<main id="main"/);
    assert.ok(html.includes((language === 'de' ? '' : '/' + language) + '/offerte?service=end'));
    assert.doesNotMatch(html, /Facility|Immobilien|B2B/);
  }
  assert.equal(titles.size, 6);
});
