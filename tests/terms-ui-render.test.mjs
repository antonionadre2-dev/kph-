import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {mkdtempSync,mkdirSync,rmSync,readFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const plain=html=>html.replace(/<wbr\s*\/?>/g,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/g,'').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&#x27;|&#39;|&apos;/g,"'").replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ').trim();
test('terms server render contains all17 fullsections, localized tools and safe immutablePDFlinks',async()=>{
 mkdirSync(path.join(root,'node_modules/.cache'),{recursive:true});const folder=mkdtempSync(path.join(root,'node_modules/.cache/kraken-terms-ui-'));
 try{
  const outfile=path.join(folder,'terms.cjs');
  await build({stdin:{contents:`import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {I18nProvider} from './i18n.ts';import Terms from './components/TermsPage.tsx';export const render=language=>renderToStaticMarkup(<I18nProvider initialLanguage={language}><Terms onNavigate={()=>{}}/></I18nProvider>);`,resolveDir:root,loader:'tsx'},outfile,bundle:true,platform:'node',format:'cjs',packages:'external',loader:{'.css':'empty'},logLevel:'silent'});
  const {render}=createRequire(import.meta.url)(outfile);
  for(const locale of ['de','en','es','pt','it','fr']){
   const source=JSON.parse(readFileSync(path.join(root,'src/legal/versions/kraken-agb-2026-11-28-v3',locale+'.json'),'utf8'));
   const html=render(locale),article=html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/)?.[1];assert.ok(article,locale);const text=plain(article);
   assert.equal((html.match(/<h1\b/g)||[]).length,1);assert.equal(plain(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)[1]),source.title);if(locale==='de')assert.match(html,/<wbr\s*\/?>/);assert.equal((article.match(/<h2\b/g)||[]).length,17);
   for(const section of source.sections){
    assert.equal((html.match(new RegExp(`id="agb-${section.number}"`,'g'))||[]).length,1);
    assert.ok(text.includes(section.title),section.title);
    for(const block of section.blocks)for(const legalText of block.type==='paragraph'?[block.text]:block.items)assert.ok(text.includes(legalText.replace(/\s+/g,' ').trim()),`${locale}: ${legalText.slice(0,80)}`);
   }
   assert.ok(plain(html).includes(source.dateLabel));assert.ok(html.includes(`/legal/terms/${source.version}/${locale}.pdf`));
   if(locale!=='de'){assert.ok(plain(html).includes(source.translationNotice));assert.match(html,/href="\/terms\?lang=de"/);}
   assert.doesNotMatch(plain(html),/kraken-agb-2026-11-26-v2|pricing-moving/);
   for(const anchor of ['#agb-4','#agb-7','#agb-9'])assert.ok(html.includes('href="'+anchor+'"'));
  }
 }finally{rmSync(folder,{recursive:true,force:true});}
});
