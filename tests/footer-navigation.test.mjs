import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { footerInformationHref, serviceInformationLinks, serviceInformationTarget } from '../src/home/serviceInformation.ts';
import { footerText } from '../components/home/footerTranslations.ts';
import { homeText } from '../components/home/homeTranslations.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bundle = await build({
  stdin: { contents: `
    import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';
    import {FooterContent} from './components/Footer.tsx';
    import {ServicesContent} from './components/services/ApprovedServices.tsx';
    export const renderFooter=language=>renderToStaticMarkup(<FooterContent language={language}/>);
    export const renderServices=language=>renderToStaticMarkup(<ServicesContent language={language}/>);
  `, resolveDir: root, loader: 'tsx' },
  bundle: true, platform: 'node', format: 'cjs', packages: 'external', write: false,
  loader: { '.css': 'empty' }, logLevel: 'warning',
});
const module = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);
const { renderFooter, renderServices } = module.exports;
const languages = ['de', 'en', 'es', 'pt', 'it', 'fr'];
const decode = value => value.replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'");

test('all footer service links are native information destinations with real service details in six languages', () => {
  for (const language of languages) {
    const html = renderFooter(language);
    const servicesHtml = renderServices(language);
    const nav = html.match(/<div class="footer-services">([\s\S]*?)<\/nav>/)?.[1];
    assert.ok(nav);
    const links = [...nav.matchAll(/<a([^>]*)href="([^"]+)"([^>]*)>([\s\S]*?)<\/a>/g)];
    assert.equal(links.length, 6);
    const expectedLinks=[...serviceInformationLinks,{service:'construction',section:'baureinigung',label:'Baureinigung'}];
    for (let index = 0; index < links.length; index++) {
      const [, before, href, after, label] = links[index];
      const expected = expectedLinks[index];
      const url = new URL(decode(href), 'https://krakenpfm.ch');
      assert.equal(url.pathname, (language === 'de' ? '' : '/' + language) + '/leistungen');
      assert.equal(url.hash, '#' + expected.section);
      assert.equal(url.searchParams.get('lang'), null);
      assert.ok(label.includes(homeText(language, expected.label)));
      assert.doesNotMatch(before + after, /data-(?:calculator|service|open-kai)|onclick|target=/);
      if(expected.service==='construction'){
        assert.match(servicesHtml,/<details[^>]*id="baureinigung"/);
        assert.ok(servicesHtml.includes('href="'+footerInformationHref('/quote?service=construction',language)+'"'));
      }else assert.match(servicesHtml, new RegExp('<details[^>]*id="' + expected.section + '"[^>]*data-service-detail="' + expected.service + '"'));
    }
    // The shared footer must not alter the visitor's saved calculator draft or intercept navigation.
    assert.doesNotMatch(html, /data-calculator|data-service=|data-open-kai|onclick=/);
  }
});

test('footer keeps one actual office, local contact hours, verified social destinations and real local/legal pages', () => {
  for (const language of languages) {
    const html = renderFooter(language);
    const destinations = [...html.matchAll(/href="([^"]+)"/g)].map(([,href])=>decode(href));
    for (const route of ['/quote', '/leistungen', '/about', '/kontakt', '/einsatzgebiete', '/impressum', '/gdpr', '/terms', '/reinigung/region-zuerich', '/reinigung/kanton-schaffhausen', '/reinigung/region-winterthur']) {
      assert.ok(destinations.includes(footerInformationHref(route, language)), language + ': ' + route);
    }
    assert.equal((html.match(/Seewadelstrasse 3/g)||[]).length, 1);
    assert.ok(html.includes(footerText(language, 'hours')));
    assert.ok(html.includes(footerText(language, 'localTime')));
    assert.ok(html.includes(footerText(language, 'visits')));
    for (const href of ['tel:+41774505705', 'mailto:kai@krakenpfm.ch', 'https://wa.me/41774505705', 'https://www.linkedin.com/company/krakenpfm/', 'https://seociety.ch']) assert.ok(destinations.includes(href));
    assert.doesNotMatch(html, /Instagram|href="#"|Buchung und Versand sind deaktiviert/);
  }
  assert.equal(new Set(languages.map(language=>footerText(language,'allServices'))).size, 6);
});

test('information targets retain native query and fragment order and can reopen a fragment already in the URL', () => {
  const current = 'https://krakenpfm.ch/leistungen?lang=es#fensterreinigung';
  for (const {section,service} of serviceInformationLinks) {
    const href = footerInformationHref('/leistungen#'+section,'es');
    assert.equal(href, '/es/leistungen#'+section);
    assert.equal(serviceInformationTarget(href,current),service);
  }
  assert.equal(serviceInformationTarget(current,current),'windows');
  assert.equal(serviceInformationTarget('#fensterreinigung',current),'windows');
  assert.equal(footerInformationHref('/leistungen?hl=en#fensterreinigung','de-CH'),'/leistungen#fensterreinigung');
  for (const invalid of ['/quote?service=windows', '/about#fensterreinigung', '/leistungen#missing', 'https://example.com/leistungen#fensterreinigung']) assert.equal(serviceInformationTarget(invalid,current),null);
  assert.throws(()=>footerInformationHref('https://example.com/leistungen','es'));
});
