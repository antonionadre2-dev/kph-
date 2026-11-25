import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { mkdtempSync, mkdirSync, rmSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LEGAL_DOCUMENT_PATHS, seoFragmentName } from '../src/seo/render-contract.ts';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
test('the existing legal documents render complete readable content in all six languages',async()=>{
  mkdirSync(path.join(root,'node_modules/.cache'),{recursive:true});
  const folder=mkdtempSync(path.join(root,'node_modules/.cache/kraken-legal-test-'));
  try{
    const outfile=path.join(folder,'legal.cjs');
    await build({stdin:{contents:`
      import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';
      import {I18nProvider} from './i18n.ts';
      import Impressum from './components/ImpressumPage.tsx';import Privacy from './components/GDPRPage.tsx';import Terms from './components/TermsPage.tsx';
      export const render=(kind,language)=>renderToStaticMarkup(<I18nProvider initialLanguage={language}>{kind==='impressum'?<Impressum onNavigate={()=>{}}/>:kind==='gdpr'?<Privacy/>:<Terms onNavigate={()=>{}}/>}</I18nProvider>);
    `,resolveDir:root,loader:'tsx'},outfile,bundle:true,platform:'node',format:'cjs',packages:'external',loader:{'.css':'empty'},logLevel:'silent'});
    const {render}=createRequire(import.meta.url)(outfile);
    for(const language of ['de','en','es','fr','it','pt'])for(const kind of ['impressum','gdpr','terms']){
      const html=render(kind,language),text=html.replace(/<[^>]*>/g,' ');
      assert.equal((html.match(/<h1\b/g)||[]).length,1,kind+language);
      assert.match(html,/<main id="main"/);
      assert.ok(text.length>(kind==='impressum'?1500:3500),kind+language+' must contain the real document, not an introduction');
      assert.ok((html.match(/<h[234]\b/g)||[]).length>=3,kind+language);
      if(kind==='impressum'){assert.match(text,/CHE-435\.882\.969/);assert.match(text,/Seewadelstrasse 3/);assert.doesNotMatch(html,/opacity:0(?:[;"\s]|$)/);}
      if(kind==='gdpr'){assert.match(text,/Resend/);assert.match(text,/Outlook/);}
      if(kind==='terms'){assert.match(text,/Payrexx/);assert.ok((html.match(/<h2\b/g)||[]).length>=15);}
    }
  }finally{rmSync(folder,{recursive:true,force:true});}
});

test('the build and runtime verification include legal fragments without adding sitemap routes',()=>{
  const source=readFileSync(path.join(root,'scripts/render-seo.mjs'),'utf8');
  const prepare=readFileSync(path.join(root,'scripts/prepare-vercel-output.mjs'),'utf8');
  assert.match(source,/LEGAL_DOCUMENT_PATHS/);assert.match(prepare,/\.\.\.legalPages/);
  assert.equal(LEGAL_DOCUMENT_PATHS.length,3);
  assert.equal(seoFragmentName('/gdpr','es'),'seo-page-gdpr-es.html');
});
