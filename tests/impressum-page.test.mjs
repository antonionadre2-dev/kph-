import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {publicHref} from '../src/routing/site-paths.ts';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=JSON.parse(readFileSync(path.join(root,'src/legal/impressum-copy.json'),'utf8'));
const bundle=await build({stdin:{contents:`import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {I18nProvider} from './i18n.ts';import Impressum from './components/ImpressumPage.tsx';export const render=language=>renderToStaticMarkup(<I18nProvider initialLanguage={language}><Impressum onNavigate={()=>{}}/></I18nProvider>);`,resolveDir:root,loader:'tsx'},bundle:true,platform:'node',format:'cjs',packages:'external',write:false,loader:{'.css':'empty'},logLevel:'silent'});
const mod={exports:{}};new Function('require','module','exports',bundle.outputFiles[0].text)(createRequire(import.meta.url),mod,mod.exports);
const rendered=Object.fromEntries(Object.keys(source.locales).map(language=>[language,mod.exports.render(language)]));
const text=html=>html.replace(/<wbr\s*\/?\s*>/gi,'').replace(/<(?:svg|style)\b[^>]*>[\s\S]*?<\/(?:svg|style)>/gi,'').replace(/<[^>]+>/g,' ').replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt|nbsp);/gi,(match,entity)=>entity[0]==='#'?String.fromCodePoint(parseInt(entity.slice(entity[1].toLowerCase()==='x'?2:1),entity[1].toLowerCase()==='x'?16:10)):({amp:'&',quot:'"',apos:"'",lt:'<',gt:'>',nbsp:' '})[entity.toLowerCase()]||match).replace(/\s+/gu,' ').trim();
const nodes=(html,tag)=>[...html.matchAll(new RegExp('<'+tag+'\\b[^>]*>([\\s\\S]*?)<\\/'+tag+'>','gi'))].map(match=>text(match[1]));
const section=(html,id)=>{const match=html.match(new RegExp('<section\\b[^>]*\\bid="'+id+'"[^>]*>([\\s\\S]*?)<\\/section>'));assert.ok(match,id);return match[1];};

test('the actual React render preserves all seven supplied legal sections, rows, paragraphs and dates in six languages',()=>{
  for(const [language,copy] of Object.entries(source.locales)){
    const html=rendered[language];
    assert.deepEqual(nodes(html,'h1'),[copy.title],language);
    assert.ok(html.includes('<time dateTime="2026-11-27">'+copy.date+'</time>')||html.includes('<time datetime="2026-11-27">'+copy.date+'</time>'));
    assert.match(html,/<main id="main"[^>]*class="kr-impressum-page"/);
    for(const expected of copy.sections){
      const actual=section(html,expected.id);
      assert.deepEqual(nodes(actual,'h2'),[expected.title],language+': '+expected.id);
      if(expected.rows){assert.deepEqual(nodes(actual,'dt'),expected.rows.map(row=>row.label));assert.deepEqual(nodes(actual,'dd'),expected.rows.map(row=>row.value));}
      if(expected.paragraphs)assert.deepEqual(nodes(actual,'p'),expected.paragraphs,language+': '+expected.id);
    }
    assert.doesNotMatch(nodes(html,'h1').concat(nodes(html,'h2'),nodes(html,'h3')).join(' '),/\p{Extended_Pictographic}/u);
    assert.doesNotMatch(html,/iframe|opacity:0(?:;|"|\s)/i);
  }
});

test('real contact, UID and policy links are complete native links that retain the current locale',()=>{
  for(const [language,html] of Object.entries(rendered)){
    const register=section(html,'register'),contact=section(html,'contact'),more=section(html,'more');
    assert.match(register,/<a[^>]+href="https:\/\/www\.uid\.admin\.ch\/Detail\.aspx\?uid_id=CHE-435\.882\.969"[^>]+target="_blank"[^>]+rel="noopener noreferrer"/);
    if(language==='it'){assert.doesNotMatch(text(register),/\bUID\b/);assert.match(text(register),/IDI CHE-435\.882\.969/);}
    assert.ok(contact.includes('href="mailto:kai@krakenpfm.ch"'));assert.ok(contact.includes('href="tel:+41774505705"'));
    for(const path of ['/gdpr','/terms'])assert.ok(more.includes('href="'+publicHref(path,language)+'"'),language+path);
    for(const id of ['company','register','contact','liability','links','copyright','more']){
      assert.ok(html.includes('href="#'+id+'"'));
      assert.ok(html.includes('id="impressum-title-'+id+'" tabindex="-1"'));
    }
  }
});

test('page styles and original decorative artwork do not introduce a replacement shell, external fonts or public delivery endpoints',()=>{
  const css=readFileSync(path.join(root,'components/legal/impressum-page.css'),'utf8');
  const component=readFileSync(path.join(root,'components/ImpressumPage.tsx'),'utf8');
  assert.doesNotMatch(css,/text-transform\s*:\s*(?:uppercase|capitalize)\b/);
  assert.doesNotMatch(css,/fonts\.googleapis|@font-face|^\s*(?:html|:root|a|button|body|\*)\s*\{/m);
  assert.match(css,/body:has\(\.kr-impressum-page\)/);
  assert.match(css,/@media\s+print/);assert.match(css,/prefers-reduced-motion/);
  assert.doesNotMatch(component,/<(?:header|footer)\b|<iframe|location\.assign|legal-notice\.js|\/entrega\//);
  const art=readFileSync(path.join(root,'public/legal/impressum-document.svg'));
  assert.equal(createHash('sha256').update(art).digest('hex'),'feccf9c350b5014750737d5d70aa9c018fea597519b6685af72072983560467a');
  for(const html of Object.values(rendered))assert.match(html,/<img[^>]+src="\/legal\/impressum-document\.svg"[^>]+alt=""[^>]+aria-hidden="true"/);
});
