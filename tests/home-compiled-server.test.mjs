import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, writeFileSync, symlinkSync, rmSync, cpSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { INDEXABLE_PATHS } from '../src/seo/crawl-policy.ts';
import { seoFragmentName, LEGAL_DOCUMENT_PATHS, HOME_APP_SSR_MARKER } from '../src/seo/render-contract.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
test('compiled server serves migrated language URLs and real HTTP redirect/removal policies under plain Node', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'kraken-compiled-server-'));
  try {
    const config = ts.readConfigFile(path.join(root, 'tsconfig.json'), ts.sys.readFile);
    const { options } = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
    assert.equal(options.rewriteRelativeImportExtensions, true);
    const names = [
      'src/auth/access.ts', 'server.ts', 'seoConfig.ts', 'i18n.ts', 'src/locale.ts', 'src/data/locations.ts',
      'components/home/homeTranslations.ts', 'components/contact/contactTranslations.ts', 'components/services/servicesTranslations.ts',
      'src/contact/routing-server.ts', 'src/booking/pricing.ts', 'src/booking/publicPricing.ts', 'src/booking/publicPricingCopy.ts',
      'src/booking/kaiTransfer.ts', 'src/booking/privateStorage.ts', 'src/home/calculator.ts',
      'src/home/hero-media.ts', 'src/home/hero-response.ts', 'src/home/scene-calendar.ts', 'src/media/images.ts',
      'src/booking/termsPresentation.ts', 'src/booking/paymentDeadline.ts', 'src/booking/uiCopy.ts', 'src/booking/pricingConfig.ts', 'src/booking/pricingUiCopy.ts', 'src/booking/terms.ts', 'src/home/paint-start.ts', 'src/booking/journeyCopy.ts', 'src/booking/customerAccessCopy.ts',
      ...['server', 'src/kai', 'src/seo', 'src/routing', 'src/i18n', 'src/contact', 'src/legal'].flatMap(folder => readdirSync(path.join(root, folder)).filter(name => name.endsWith('.ts')).map(name => `${folder}/${name}`)),
    ];
    for (const name of new Set(names)) {
      const output = ts.transpileModule(readFileSync(path.join(root, name), 'utf8'), { fileName: name, compilerOptions: options }).outputText;
      assert.doesNotMatch(output, /from\s*["']\.\.?\/[^"']+\.ts["']/);
      const destination = path.join(directory, name.replace(/\.ts$/, '.js'));
      mkdirSync(path.dirname(destination), { recursive: true }); writeFileSync(destination, output);
    }
    for (const name of ['src/legal/terms-manifest.json', 'src/legal/terms-policy.generated.json', 'firebase-applet-config.json', 'src/media/manifest.json', 'src/media/hero-formats.json', ...['service', 'http', 'policy', 'emails', 'firestore-store'].map(name => `integrations/recovery/${name}.mjs`)]) {
      const destination = path.join(directory, name); mkdirSync(path.dirname(destination), { recursive: true });
      writeFileSync(destination, readFileSync(path.join(root, name)));
    }
    cpSync(path.join(root, 'src/legal/versions'), path.join(directory, 'src/legal/versions'), {recursive:true});
    cpSync(path.join(root, 'integrations/email-collection'), path.join(directory, 'integrations/email-collection'), { recursive: true });
    writeFileSync(path.join(directory, 'package.json'), '{"type":"module"}');
    symlinkSync(path.join(root, 'node_modules'), path.join(directory, 'node_modules'), 'dir');
    mkdirSync(path.join(directory, 'dist'));
    mkdirSync(path.join(directory, 'dist/assets'));
    writeFileSync(path.join(directory, 'dist/assets/index-12345678.css'), '.scene-room{width:100%}');
    writeFileSync(path.join(directory, 'dist/index.html'), '<html lang="de-CH"><head><title>fixture</title><link rel="stylesheet" crossorigin href="/shared.css"><link rel="stylesheet" crossorigin href="/assets/index-12345678.css"></head><body><div id="root">OLD_TEMPLATE</div><!-- kraken-root-end --></body></html>');
    for (const language of ['de', 'en', 'es', 'pt', 'it', 'fr']) for (const route of [...INDEXABLE_PATHS, ...LEGAL_DOCUMENT_PATHS]) {
      const marker=route==='/'?HOME_APP_SSR_MARKER+'<link rel="preload" as="image" href="/test-room.webp"/><link rel="preload" as="image" type="image/avif" imageSrcSet="/test-room.avif 960w" imageSizes="100vw"/>':'';
      writeFileSync(path.join(directory, 'dist', seoFragmentName(route, language)), marker+`<link rel="stylesheet" href="/shared.css"><main id="main"><h1>${route} ${language}</h1><p>RENDERED_BODY</p></main>`);
    }
    const driver = `
      import assert from 'node:assert/strict';import {createServer,request} from 'node:http';
      globalThis.fetch=()=>{throw Error('No upstream request is allowed');};
      const {publicHref}=await import('./src/routing/site-paths.js');
      const {INDEXABLE_PATHS}=await import('./src/seo/crawl-policy.js');
      const {default:app,appReady}=await import(${JSON.stringify(pathToFileURL(path.join(directory, 'server.js')).href)});await appReady;
      const server=createServer(app);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
      const call=(pathname,method='GET',body=null,extra={})=>new Promise((resolve,reject)=>{
        const req=request({hostname:'127.0.0.1',port:server.address().port,path:pathname,method,headers:{Host:'krakenpfm.ch',...(body?{'Content-Type':'application/json'}:{}),...extra}},res=>{
          let text='';res.setEncoding('utf8');res.on('data',chunk=>text+=chunk);res.on('end',()=>resolve({status:res.statusCode,body:text,headers:res.headers}));
        });req.on('error',reject);req.end(body);
      });
      try{
        assert.equal((await call('/api/health')).status,200);
        const explicitGerman=await call('/?lang=de');
        assert.equal(explicitGerman.status,200);
        assert.equal(explicitGerman.headers.location,undefined);
        assert.match(explicitGerman.body,/<html lang="de-CH"/);
        assert.ok(explicitGerman.body.includes('rel="canonical" href="https://krakenpfm.ch/"'));
        for(const language of ['de','en','es','pt','it','fr'])for(const route of INDEXABLE_PATHS){
          const destination=publicHref(route,language),result=await call(destination);
          assert.equal(result.status,200,destination);assert.ok(result.body.includes('RENDERED_BODY'),destination);
          assert.equal(result.body.split('/shared.css').length-1,1,'No duplicate stylesheet across differing attributes');
          assert.equal(result.body.split('/assets/index-12345678.css').length-1,1,'Entry stylesheet remains one cacheable link');
          assert.doesNotMatch(result.body,/data-kraken-inline-css/);
          assert.equal((result.body.match(/<h1\\b/g)||[]).length,1);
          assert.ok(result.body.includes('rel="canonical" href="https://krakenpfm.ch'+destination+'"'),destination);
          assert.equal((result.body.match(/hreflang=/g)||[]).length,7);
          assert.equal(result.headers['x-powered-by'],undefined);
          assert.equal(result.headers['x-content-type-options'],'nosniff');
          assert.ok(result.headers['content-security-policy-report-only']);
          if(route==='/'){
            assert.match(result.body,/id="root" data-kraken-home-ssr="true"/);
            assert.ok(result.body.indexOf('/test-room.webp')<result.body.indexOf('<link rel="stylesheet"'), 'Image discovery precedes the stylesheet');
            assert.ok(result.body.indexOf('/test-room.avif')<result.body.indexOf('<link rel="stylesheet"'), 'Responsive preload without href is retained in the head');
            assert.doesNotMatch(result.body.slice(result.body.indexOf('<div id="root"')),/test-room\.webp|kraken-home-app-ssr/);
          }else{
            assert.doesNotMatch(result.body,/data-kraken-home-ssr="true"/);
            assert.ok(result.body.includes('<link rel="stylesheet" crossorigin href="/assets/index-12345678.css">'));
          }
        }
        for(const [source,destination] of [
          ['/about','/ueber-uns'],['/quote?lang=es&service=end&draft=a%2Bb%26c','/es/offerte?service=end&draft=a%2Bb%26c'],
          ['/services/zurich/end-of-tenancy?hl=fr','/fr/umzugsreinigung/zuerich'],
          ['/reinigung/uster?lang=it','/it/reinigung/region-zuerich'],['/reinigung/neuhausen-am-rheinfall','/reinigung/kanton-schaffhausen'],
          ['/en/about?lang=es','/en/ueber-uns'],['/de/offerte','/offerte'],
          ['/index.html?lang=de','/?lang=de'],['/about?lang=de','/ueber-uns?lang=de'],['/en/index.html','/en/'],
        ]){const result=await call(source);assert.equal(result.status,301,source);assert.equal(result.headers.location,destination);}
        for(const route of ['/services/zurich/gardening','/reinigung-zurich-property-managers','/commercial','/en/blog/iot-smart-facility-management-schweizer-bueros']){
          const result=await call(route);assert.equal(result.status,410,route);assert.equal(result.headers['x-robots-tag'],'noindex, follow');
        }
        assert.equal((await call('/missing-page')).status,404);
        for(const route of ['/es/login','/fr/register','/dashboard','/es/offerte?booking=opaque','/en/customer-access','/quote-demo','/commercial-quote']){
          const result=await call(route);assert.equal(result.status,200,route);assert.equal(result.headers['x-robots-tag'],'noindex, follow',route);
          assert.match(result.body,/name="robots" content="noindex, follow"/);
          if(route.includes('offerte')){assert.equal(result.headers['referrer-policy'],'no-referrer');assert.match(result.headers['cache-control'],/no-store/);}
        }
        const config=await call('/api/contact/config');assert.deepEqual(JSON.parse(config.body),{geocoding:true,routing:{available:false,provider:'openrouteservice'},coverage:'CH'});
        const invalid=await call('/api/contact/geocode','POST','{invalid');assert.equal(invalid.status,400);
        assert.equal((await call('/api/contact/route','POST',JSON.stringify({coordinates:[8.632696,47.698002],direction:'outbound'}))).status,503);
        assert.equal((await call('/api/health','GET',null,{Origin:'https://other.example'})).status,403);
        assert.equal((await call('/api/health','GET',null,{Origin:'https://krakenpfm.ch'})).headers['access-control-allow-origin'],'https://krakenpfm.ch');
        for(const route of ['/seo-page-home-de.html','/contact-content-de.html','/server.cjs'])assert.equal((await call(route)).status,404);
        console.log('COMPILED_SERVER_OK');
      }finally{await new Promise(resolve=>server.close(resolve));}
    `;
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', driver], { cwd: directory, env: { ...process.env, VERCEL: '1', NODE_ENV: 'production', CONTACT_ROUTING_API_KEY: '' }, encoding: 'utf8', timeout: 20000 });
    assert.equal(result.status, 0, result.stdout + result.stderr); assert.match(result.stdout, /COMPILED_SERVER_OK/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
