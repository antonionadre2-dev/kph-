import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {mkdirSync,mkdtempSync,readFileSync,rmSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {aboutTranslationRows,aboutText} from '../components/about/aboutTranslations.ts';
import {whyTranslationRows,whyTranslations} from '../components/home/whyTranslations.ts';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const languages=['de','en','es','pt','it','fr'];
const cache=path.join(root,'node_modules/.cache');mkdirSync(cache,{recursive:true});
const temporary=mkdtempSync(path.join(cache,'about-test-'));
let render;
try {
  const outfile=path.join(temporary,'render.cjs');
  await build({stdin:{contents:`import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {AboutContent} from './components/about/ApprovedAbout.tsx';import {ServicesContent} from './components/services/ApprovedServices.tsx';import WhyKrakenSection from './components/home/WhyKrakenSection.tsx';import {whyTranslations} from './components/home/whyTranslations.ts';import {homeText} from './components/home/homeTranslations.ts';export const render=language=>({about:renderToStaticMarkup(React.createElement(AboutContent,{language})),services:renderToStaticMarkup(React.createElement(ServicesContent,{language})),why:renderToStaticMarkup(React.createElement(WhyKrakenSection,{t:source=>whyTranslations[language]?.[source]??homeText(language,source)}))});`,resolveDir:root,loader:'tsx'},outfile,bundle:true,platform:'node',format:'cjs',packages:'external',loader:{'.css':'empty'},logLevel:'warning'});
  render=createRequire(import.meta.url)(outfile).render;
} finally {rmSync(temporary,{recursive:true,force:true});}

test('About and Warum copy covers six languages without blank or duplicate source rows',()=>{
  for(const rows of [aboutTranslationRows,whyTranslationRows]){
    assert.equal(new Set(rows.map(r=>r[0])).size,rows.length);
    for(const row of rows){assert.equal(row.length,6);for(const text of row) assert.ok(text.trim());}
  }
  for(const lang of languages){
    assert.ok(aboutText(lang,'Ihre Auswahl ist bereit. Das Bild konnte gerade nicht geladen werden.').trim());
    assert.ok(whyTranslations[lang]['Keine MwSt.']);
  }
});

test('About initial HTML contains the complete story, comic and working links before JavaScript',()=>{
  for(const lang of languages){
    const {about}=render(lang);
    assert.equal((about.match(/<h1\b/g)||[]).length,1,lang);
    for(const id of ['story-london','story-uk','story-switzerland','story-kraken','kai-origin','kai-character','kai-help']){
      assert.ok(about.includes(`id="${id}"`),lang+': '+id);
      assert.ok(!new RegExp(`<article[^>]*id="${id}"[^>]*hidden`).test(about),lang+': readable chapter');
    }
    assert.match(about,/2015/);assert.match(about,/2026/);assert.match(about,/Antonio Nadre Gomes Mendes/);
    assert.match(about,/kai-comic-cover\.webp/);assert.match(about,/kai-rheinfall-awakening\.webp/);assert.match(about,/kai-evolution\.webp/);
    assert.equal((about.match(/data-help-scene="/g)||[]).length,5);
    assert.equal((about.match(/data-help-choice/g)||[]).length,5);
    assert.match(about,new RegExp('/quote\\?lang='+lang));
    assert.doesNotMatch(about,/<iframe|kraken-codex-source|data:image\//);
    assert.doesNotMatch(about,/kraken_consultation_data_v2|(?:CHF|EUR)\s*\d/);
    if(lang!=='de') assert.ok(!about.includes('Die Menschen. Die Idee. Der Kraken.'));
  }
});

test('Warum explains confirmation and scope without a hypothetical tax saving',()=>{
  const {why}=render('de');
  const text=why.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
  assert.match(text,/Vor der Bestätigung kennen Sie den vereinbarten Umfang, den Preis und den Termin/);
  assert.match(text,/Ihr Wunschtermin ist noch keine bestätigte Buchung/);
  assert.doesNotMatch(why,/7,5|7,49|8,1|Betriebshaftpflichtversichert/);
  assert.equal((why.match(/<details\b/g)||[]).length,2);
  assert.equal((why.match(/id="warum-kraken"/g)||[]).length,1);
  assert.equal((why.match(/id="ueber-uns"/g)||[]).length,1);
  assert.match(why,/href="\/quote"/);assert.match(why,/data-calculator/);
  assert.doesNotMatch(why,/<img|<iframe|8,1 % günstiger|0 % MwSt\.|steuerfrei/);
});


test('native commercial links retain service and language when opened in another tab before hydration',()=>{
  for(const lang of languages){
    const {about,services}=render(lang);
    for(const html of [about,services]){
      const anchors=[...html.matchAll(/<a\b[^>]*data-service="[^"]+"[^>]*>/g)].map(match=>match[0]);
      assert.ok(anchors.length>=5);
      for(const anchor of anchors){
        const service=/data-service="([^"]+)"/.exec(anchor)[1];
        const href=/href="([^"]+)"/.exec(anchor)[1].replaceAll('&amp;','&');
        const url=new URL(href,'https://krakenpfm.ch');
        assert.equal(url.pathname,'/quote');
        assert.equal(url.searchParams.get('lang'),lang);
        assert.equal(url.searchParams.get('service'),service);
      }
    }
  }
});
