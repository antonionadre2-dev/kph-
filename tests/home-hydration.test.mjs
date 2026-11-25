import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { homeHydrationLanguage } from '../src/routing/hydration.ts';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
test('only an explicitly marked Home with a matching resolved visitor locale may hydrate',()=>{
  const state={marked:'true',pathname:'/',ssrLanguage:'de-CH'};
  assert.equal(homeHydrationLanguage(state),'de-CH');
  assert.equal(homeHydrationLanguage({...state,saved:'de'}),'de-CH');
  assert.equal(homeHydrationLanguage({...state,browserLanguage:'de-DE'}),'de-CH');
  assert.equal(homeHydrationLanguage({...state,saved:'es'}),null);
  assert.equal(homeHydrationLanguage({...state,marked:null}),null);
  assert.equal(homeHydrationLanguage({...state,pathname:'/offerte'}),null);
  assert.equal(homeHydrationLanguage({...state,ssrLanguage:'invalid'}),null);
  assert.equal(homeHydrationLanguage({...state,search:'?booking=opaque&draft=a%2Bb'}),'de-CH');
  for(const language of ['en','es','pt','it','fr'])assert.equal(homeHydrationLanguage({...state,pathname:`/${language}/`,ssrLanguage:language,saved:'de-CH'}),language);
});

test('the actual server/browser Application trees have identical first Home markup in all six languages',async()=>{
  const built=await build({stdin:{contents:`import React from 'react';import{renderToString}from'react-dom/server';import Application from './components/Application.tsx';export const render=language=>renderToString(<Application initialLanguage={language}/>);`,resolveDir:root,loader:'tsx'},bundle:true,platform:'node',format:'cjs',packages:'external',write:false,loader:{'.css':'empty'},logLevel:'silent'});
  const module={exports:{}};new Function('require','module','exports',built.outputFiles[0].text)(createRequire(import.meta.url),module,module.exports);
  const previous=globalThis.window;
  try{
    for(const language of ['de-CH','en','es','pt','it','fr']){
      globalThis.window=undefined;const server=module.exports.render(language);
      const pathname=language==='de-CH'?'/':`/${language}/`;
      const store=new Map([['kraken_cart_persistent',JSON.stringify([{type:'end',details:{rooms:2.5}}])]]);
      globalThis.window={location:{pathname,search:'',hash:'',href:'https://krakenpfm.ch'+pathname,origin:'https://krakenpfm.ch'},localStorage:{getItem:key=>store.get(key)||null,setItem:(key,value)=>store.set(key,value),removeItem:key=>store.delete(key)}};
      const browser=module.exports.render(language);
      assert.equal(browser,server,language);
      assert.equal((server.match(/id="sceneRoom"/g)||[]).length,1);
      assert.equal((server.match(/<h1\b/g)||[]).length,1);
      assert.match(server,/<!--\$-->/);assert.doesNotMatch(server,/<!--\$!-->/);
    }
  }finally{globalThis.window=previous;}
});
