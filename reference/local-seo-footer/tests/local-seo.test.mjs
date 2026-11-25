import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { applySeoHead, canonicalUrl, localStructuredData, renderSeoHead, safeJson } from '../integrations/local-seo.mjs';
const content=JSON.parse(await readFile(new URL('../content/locations.de.json',import.meta.url),'utf8'));
const page={path:content.pages[0].slug,title:content.pages[0].seo.title,description:content.pages[0].seo.description,city:content.pages[0].city};

test('private preview and production have deliberately separate indexing output',()=>{
  const preview=renderSeoHead(page);
  assert.match(preview,/noindex,nofollow/);
  assert.doesNotMatch(preview,/rel="canonical"|hreflang/);
  const live=renderSeoHead(page,{preview:false});
  assert.match(live,/content="index,follow,max-image-preview:large"/);
  assert.match(live,/rel="canonical" href="https:\/\/krakenpfm.ch\/reinigung\/region-zuerich"/);
  assert.doesNotMatch(live,/noindex|hreflang|chatgpt\.site/);
  assert.match(live,/https:\/\/krakenpfm.ch\/home-approved\/assets\/services-hero-v5.webp/);
});
test('structured data preserves one real company and correct city service coverage',()=>{
  for(const local of content.pages){
    const graph=localStructuredData({...page,path:local.slug,city:local.city})['@graph'];
    const business=graph.filter(n=>n['@type']==='LocalBusiness');
    assert.equal(business.length,1);
    assert.equal(business[0].address.addressLocality,'Schaffhausen');
    assert.equal(business[0].address.streetAddress,'Seewadelstrasse 3');
    assert.equal(graph.filter(n=>n['@type']==='Service').length,5);
    assert.ok(graph.filter(n=>n['@type']==='Service').every(n=>n.areaServed.name===local.city));
    assert.ok(graph.every(n=>!n.aggregateRating&&!n.review&&!n.priceRange));
  }
});
test('metadata handles special characters without double escaping or script injection',()=>{
  const title='Fenster & Umzüge </script><script>alert(1)</script>';
  const encoded=safeJson({title});
  assert.equal(JSON.parse(encoded).title,title);
  assert.doesNotMatch(encoded,/<script|<\/script|\\u0026/);
  const head=renderSeoHead({...page,title},{preview:false});
  assert.match(head,/Fenster &amp; Umzüge &lt;\/script&gt;/);
  assert.equal((head.match(/<script/g)||[]).length,1);
});
test('metadata regeneration produces one title, description and graph',()=>{
  let html='<html><head><title>Old</title><meta name="description" content="old"><meta name="robots" content="noindex,nofollow"></head><body>content</body></html>';
  html=applySeoHead(applySeoHead(html,page),page);
  assert.equal((html.match(/<title>/g)||[]).length,1);
  assert.equal((html.match(/name="description"/g)||[]).length,1);
  assert.equal((html.match(/application\/ld\+json/g)||[]).length,1);
  assert.throws(()=>applySeoHead('<head><script type="application/ld+json">{"@type":"LocalBusiness"}</script></head>',page),/Existing structured data/);
});
test('canonical cannot escape to an unrelated or credential-bearing origin',()=>{
  assert.throws(()=>canonicalUrl('//example.com/steal'));
  assert.throws(()=>canonicalUrl('/quote?booking=private'));
  assert.throws(()=>canonicalUrl('/','https://user:pass@krakenpfm.ch'));
  assert.equal(canonicalUrl('/reinigung/region-winterthur'),'https://krakenpfm.ch/reinigung/region-winterthur');
});
test('native calculator links preserve selected service and supported language',async()=>{
  const oldWindow=globalThis.window,oldDocument=globalThis.document;
  try{
    globalThis.window={location:{href:'https://preview.example/reinigung/region-zuerich?lang=fr',search:'?lang=fr',origin:'https://preview.example'}};
    globalThis.document={documentElement:{lang:'de-CH'}};
    const {calculatorHref}=await import('../web/calculator.js');
    for(const [service,expected] of Object.entries({windows:'windows',end:'end-of-tenancy',regular:'daily-cleaning',deep:'deep-cleaning',moving:'moving'})){
      const url=new URL(calculatorHref(service));
      assert.equal(url.pathname,'/quote'); assert.equal(url.searchParams.get('service'),expected); assert.equal(url.searchParams.get('lang'),'fr');
    }
  }finally{if(oldWindow===undefined)delete globalThis.window;else globalThis.window=oldWindow;if(oldDocument===undefined)delete globalThis.document;else globalThis.document=oldDocument;}
});
