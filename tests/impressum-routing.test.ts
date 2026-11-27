import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {getRouteDisposition} from '../src/routing/route-policy.ts';
import {pathLanguage,publicHref,toPublicPath} from '../src/routing/site-paths.ts';
import {parsePath} from '../src/routing/router.ts';
import {resolveSiteLanguage,restoredLanguageUrl} from '../src/locale.ts';
import {getPageSeo} from '../src/seo/metadata.ts';
import {getImpressumMetadata} from '../src/legal/impressum-metadata.ts';
import {getSitemapUrls} from '../scripts/generate-sitemap.mjs';

const languages=['de','en','es','fr','it','pt'] as const;
const origin='https://krakenpfm.ch';
const copy=JSON.parse(readFileSync(new URL('../src/legal/impressum-copy.json',import.meta.url),'utf8'));

test('legal-notice suffix and query aliases resolve to one real localized document without losing context',()=>{
  for(const language of languages){
    const canonical=language==='de'?'/impressum':'/'+language+'/impressum';
    for(const path of ['/impressum/'+language,'/impressum/'+language+'/', '/impressum?lang='+language, '/impressum?hl='+language]){
      const source=new URL(path,origin);source.searchParams.append('utm','a');source.searchParams.append('utm','b');source.hash='register';
      const actual=getRouteDisposition(source.href);
      const target=canonical+'?utm=a&utm=b'+(language==='de'?'&lang=de':'')+'#register';
      if(language==='de'&&source.pathname==='/impressum'&&source.searchParams.has('lang')){
        // An explicit German query remains until i18n persists that preference.
        assert.deepEqual(actual,{status:200});
        assert.equal(getPageSeo(source.href).canonical,origin+canonical);
      }else{
        assert.equal(actual.status,301,source.href);
        assert.equal(actual.location,target,source.href);
      }
      assert.equal(getRouteDisposition(target).status,200,target);
      assert.equal(pathLanguage(target),language);
      assert.equal(parsePath(path).page,'impressum');
      assert.equal(toPublicPath(path),'/impressum');
      assert.equal(getPageSeo(path).canonical,origin+canonical);
    }
    assert.equal(getRouteDisposition(canonical).status,200);
  }
  assert.deepEqual(getRouteDisposition('/es/impressum?lang=fr'),{status:301,location:'/es/impressum'});
  assert.deepEqual(getRouteDisposition('/fr/impressum/es'),{status:301,location:'/fr/impressum'});
  assert.equal(getRouteDisposition('/impressum/xx').status,404);
  assert.equal(getRouteDisposition('/impressum/es/extra').status,404);
});

test('an explicit German legal alias overrides a saved Spanish preference without changing canonical or other routes',()=>{
  for(const source of ['/impressum/de','/impressum/de?lang=es#company','/de/impressum','/de/impressum/?lang=fr']){
    const disposition=getRouteDisposition(source);assert.equal(disposition.status,301);
    const destination=new URL(disposition.location!,origin);
    assert.equal(destination.pathname,'/impressum');assert.equal(destination.searchParams.get('lang'),'de');
    const resolved=resolveSiteLanguage({pathname:destination.pathname,search:destination.search,saved:'es'});
    assert.equal(resolved,'de');
    const restored=restoredLanguageUrl(destination.href,resolved)!;
    assert.equal(new URL(restored,origin).pathname,'/impressum');
    assert.equal(new URL(restored,origin).search,'');
    assert.equal(getPageSeo(destination.href).canonical,origin+'/impressum');
  }
  assert.deepEqual(getRouteDisposition('/de/offerte'),{status:301,location:'/offerte'});
  assert.equal(publicHref('/impressum/es#company','it'),'/it/impressum#company');
});

test('legal-notice metadata matches the supplied source and links six real languages while retaining existing indexing policy',()=>{
  const alternates=languages.map(language=>origin+(language==='de'?'/impressum':'/'+language+'/impressum'));
  for(const language of languages){
    const path=publicHref('/impressum',language),metadata=getPageSeo(path);
    assert.deepEqual(getImpressumMetadata(language),{title:copy.locales[language].title,lead:copy.locales[language].lead});
    assert.equal(metadata.title,copy.locales[language].title+' | Kraken PFM');
    assert.equal(metadata.description,copy.locales[language].lead);
    assert.equal(metadata.canonical,origin+path);
    assert.equal(metadata.robots,'noindex, follow');assert.equal(metadata.indexable,false);
    assert.deepEqual(metadata.structuredData,[]);
    assert.equal(metadata.hreflangs.length,7);
    assert.deepEqual(new Set(metadata.hreflangs.filter(item=>item.lang!=='x-default').map(item=>item.href)),new Set(alternates));
    assert.ok(metadata.hreflangs.every(item=>getRouteDisposition(item.href).status===200&&!new URL(item.href).search));
    assert.deepEqual(getPageSeo(path+'?booking=private-capability').hreflangs,[]);
  }
  const sitemap=getSitemapUrls();assert.ok(sitemap.every(url=>!url.includes('/impressum')&&!url.includes('/entrega/')));
  for(const path of ['/entrega/impressum.zip','/entrega/impressum-codigo.txt','/entrega/impressum-prompt.txt'])assert.equal(getRouteDisposition(path).status,404);
});
