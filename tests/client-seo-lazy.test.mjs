import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { injectPageSeo } from '../src/seo/html.ts';
import { clientSeoState, headHasCurrentSeo, createClientSeoScheduler } from '../src/seo/client-state.ts';
import { syncClientSeo } from '../src/seo/client.ts';
import { getPageSeo } from '../src/seo/metadata.ts';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const decode=value=>value.replaceAll('&quot;','"').replaceAll('&#39;',"'").replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&amp;','&');
class Element {
  constructor(tag,owner){this.tag=tag;this.owner=owner;this.attrs={};this.textContent='';}
  getAttribute(key){return this.attrs[key]??null;}setAttribute(key,value){this.attrs[key]=String(value);}
  remove(){this.owner.nodes=this.owner.nodes.filter(node=>node!==this);}
}
for(const key of ['name','content','id','type','href','rel'])Object.defineProperty(Element.prototype,key,{get(){return this.getAttribute(key)||'';},set(value){this.setAttribute(key,value);}});
function documentFrom(html){
  const doc={nodes:[],title:decode(html.match(/<title>([\s\S]*?)<\/title>/)?.[1]||''),documentElement:{lang:html.match(/<html[^>]*lang="([^"]+)"/)?.[1]||'de-CH'}};
  doc.createElement=tag=>new Element(tag,doc);
  doc.querySelectorAll=selector=>doc.nodes.filter(node=>{
    const tag=selector.match(/^[a-z]+/)?.[0];if(tag&&node.tag!==tag)return false;
    if(selector.startsWith('#')&&node.id!==selector.slice(1))return false;
    return [...selector.matchAll(/\[([\w:-]+)(?:="([^"]*)")?\]/g)].every(([,key,value])=>value===undefined?node.getAttribute(key)!==null:node.getAttribute(key)===value);
  });
  doc.querySelector=selector=>doc.querySelectorAll(selector)[0]||null;
  doc.head={querySelector:doc.querySelector,querySelectorAll:doc.querySelectorAll,appendChild:node=>doc.nodes.push(node)};
  for(const match of html.matchAll(/<(meta|link|script)\b([^>]*)>/g)){
    const node=doc.createElement(match[1]);
    for(const [,key,value]of match[2].matchAll(/([\w:-]+)="([^"]*)"/g))node.setAttribute(key,decode(value));
    if(match[1]==='script')node.textContent=html.slice(match.index+match[0].length,html.indexOf('</script>',match.index));
    doc.nodes.push(node);
  }
  return doc;
}
const template='<html lang="de-CH"><head><title>Fixture</title></head><body></body></html>';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done;});return{promise,resolve};};

test('the initial App graph has lightweight routing and no full metadata, FAQ or regional body dependency',async()=>{
  const result=await build({entryPoints:[path.join(root,'components/App.tsx')],bundle:true,write:false,metafile:true,platform:'browser',format:'esm',splitting:true,outdir:path.join(root,'node_modules/.cache/seo-graph'),packages:'external',loader:{'.css':'empty'},logLevel:'silent'});
  const seen=new Set();
  function visit(key){if(seen.has(key))return;seen.add(key);for(const item of result.metafile.inputs[key]?.imports||[])if(!item.external&&item.kind!=='dynamic-import')visit(item.path);}
  visit('components/App.tsx');
  assert.ok(seen.has('src/routing/router.ts'));
  for(const file of seen)assert.doesNotMatch(file,/(?:^seoConfig\.ts$|src\/seo\/(?:metadata\.ts$|client\.ts$|local-metadata|regional-metadata|page-faqs|end-of-tenancy)|src\/seo\/regions\/)/,file);
});

test('complete matching SSR heads skip deferred metadata on production, preview and private entry',()=>{
  for(const [url,language,allow]of [['/','de',true],['/fr/umzugsreinigung/zuerich','fr',true],['/es/offerte?booking=opaque-capability','es',true],['/','de',false]]){
    const doc=documentFrom(injectPageSeo(template,url,language,{allowIndexing:allow}));let loads=0;
    const scheduler=createClientSeoScheduler(async()=>{loads++;return{syncClientSeo};},()=>url);
    scheduler.synchronize(url,language,doc,allow);
    assert.equal(headHasCurrentSeo(doc,clientSeoState(url,language,allow)),true,url);assert.equal(loads,0,url);
    assert.doesNotMatch(doc.querySelector('meta[name="kraken-route-seo"]').content,/opaque-capability|booking=/);
  }
});

test('actual SPA head synchronization updates locale/schema, makes private routes safe immediately and cancels obsolete work',async()=>{
  const previousDocument=globalThis.document,previousWindow=globalThis.window;
  try{
    const doc=documentFrom(injectPageSeo(template,'/','de'));globalThis.document=doc;globalThis.window={location:{hostname:'krakenpfm.ch'}};
    let current='/';const requests=[];
    const scheduler=createClientSeoScheduler(()=>{const request=deferred();requests.push(request);return request.promise;},()=>current);
    current='/fr/umzugsreinigung/zuerich';scheduler.synchronize(current,'fr',doc,true);
    assert.equal(requests.length,1);requests[0].resolve({syncClientSeo});await flush();
    assert.equal(doc.title,getPageSeo(current).title);assert.equal(headHasCurrentSeo(doc,clientSeoState(current,'fr')),true);
    assert.equal(doc.querySelector('meta[property="og:locale"]').content,'fr_CH');
    assert.ok(JSON.parse(doc.querySelector('#kraken-page-schema').textContent)['@graph'].some(item=>item['@type']==='FAQPage'));
    current='/es/offerte?booking=opaque-private';scheduler.synchronize(current,'es',doc,true);
    assert.equal(doc.querySelector('meta[name="robots"]').content,'noindex, follow');
    assert.equal(doc.querySelectorAll('link[rel="alternate"][hreflang]').length,0);assert.equal(doc.querySelector('#kraken-page-schema'),null);
    requests[1].resolve({syncClientSeo});await flush();
    assert.equal(headHasCurrentSeo(doc,clientSeoState(current,'es')),true);
    assert.deepEqual(JSON.parse(doc.querySelector('#kraken-page-schema').textContent)['@graph'],[]);
    assert.doesNotMatch(doc.querySelector('link[rel="canonical"]').href,/opaque-private/);
    current='/en/ueber-uns';scheduler.synchronize(current,'en',doc,true);
    current='/';scheduler.synchronize(current,'de',doc,true);
    requests[3].resolve({syncClientSeo});await flush();const title=doc.title;
    requests[2].resolve({syncClientSeo});await flush();
    assert.equal(doc.title,title);assert.equal(headHasCurrentSeo(doc,clientSeoState('/','de')),true);
  }finally{globalThis.document=previousDocument;globalThis.window=previousWindow;}
});
