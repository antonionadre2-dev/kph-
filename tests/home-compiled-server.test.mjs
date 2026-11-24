import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, symlinkSync, rmSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('compiled server graph runs under plain Node without source .ts files and serves localized public pages', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'kraken-compiled-server-'));
  try {
    const configuration = ts.readConfigFile(path.join(root, 'tsconfig.json'), ts.sys.readFile);
    const { options } = ts.parseJsonConfigFileContent(configuration.config, ts.sys, root);
    assert.equal(options.rewriteRelativeImportExtensions, true);
    for (const name of ['server.ts', 'seoConfig.ts', 'i18n.ts', 'src/data/locations.ts', 'server/homeWeather.ts', 'src/locale.ts', 'components/home/homeTranslations.ts', 'components/contact/contactTranslations.ts', 'server/kaiAssistant.ts', 'server/kaiKnowledge.ts', 'src/kai/types.ts', 'src/contact/routing-server.ts', 'server/booking.ts', 'server/booking-store.ts', 'server/booking-payrexx.ts', 'server/booking-email.ts', 'src/booking/pricing.ts', 'src/booking/uiCopy.ts', 'src/booking/journeyCopy.ts']) {
      const output = ts.transpileModule(readFileSync(path.join(root, name), 'utf8'), { fileName: name, compilerOptions: options }).outputText;
      assert.doesNotMatch(output, /from\s*["']\.\.?\/[^"']+\.ts["']/);
      const destination = path.join(directory, name.replace(/\.ts$/, '.js'));
      mkdirSync(path.dirname(destination), { recursive: true });
      writeFileSync(destination, output);
    }
    for (const source of ['src/booking/customerAccessCopy.ts', 'server/booking-webhooks.ts']) {
      const destination = path.join(directory, source.replace(/\.ts$/, '.js'));
      writeFileSync(destination, ts.transpileModule(readFileSync(path.join(root, source), 'utf8'), { fileName: source, compilerOptions: options }).outputText);
    }
    for (const name of ['firebase-applet-config.json', ...['service', 'http', 'policy', 'emails', 'firestore-store'].map(name => `integrations/recovery/${name}.mjs`)]) {
      const destination = path.join(directory, name);
      mkdirSync(path.dirname(destination), { recursive: true });
      writeFileSync(destination, readFileSync(path.join(root, name)));
    }
    writeFileSync(path.join(directory, 'package.json'), '{"type":"module"}');
    symlinkSync(path.join(root, 'node_modules'), path.join(directory, 'node_modules'), 'dir');
    mkdirSync(path.join(directory, 'dist'));
    writeFileSync(path.join(directory, 'dist/index.html'), '<html><head><title>fixture</title></head><body><div id="root"><main id="home-loading"><div><h1>Home</h1>COMPILED_TEMPLATE</div></main></div><!-- kraken-root-end --></body></html>');
    for (const language of ['de', 'en', 'es', 'pt', 'it', 'fr']) {
      writeFileSync(path.join(directory, 'dist/why-content-' + language + '.html'), '<section id="warum-kraken">WHY_' + language + '</section>');
      writeFileSync(path.join(directory, 'dist/about-content-' + language + '.html'), '<link rel="stylesheet" href="/assets/about.css"><main><h1>ABOUT_' + language + '</h1><p>STORY_' + language + '</p></main>');
      writeFileSync(path.join(directory, 'dist/services-content-' + language + '.html'), '<link rel="stylesheet" href="/assets/services.css"><main><h1>SERVICES_' + language + '</h1><details><summary>Service</summary>BODY_' + language + '</details></main>');
      writeFileSync(path.join(directory, 'dist/contact-content-' + language + '.html'), '<link rel="stylesheet" href="/assets/contact.css"><main><h1>CONTACT_' + language + '</h1><p>DETAILS_' + language + '</p><a href="tel:+41774505705">+41 77 450 57 05</a></main>');
    }
    const driver = `
      import assert from 'node:assert/strict';
      import { createServer, request } from 'node:http';
      globalThis.fetch = () => { throw new Error('No upstream request is allowed'); };
      const { default: app, appReady } = await import(${JSON.stringify(pathToFileURL(path.join(directory, 'server.js')).href)});
      await appReady;
      const server = createServer(app);
      await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
      const get = pathname => new Promise((resolve, reject) => {
        const call = request({ hostname:'127.0.0.1', port:server.address().port, path:pathname, headers:{Host:'krakenpfm.ch'} }, response => {
          let body='';response.setEncoding('utf8');response.on('data', chunk => body+=chunk);
          response.on('end', () => resolve({status:response.statusCode,body,headers:response.headers}));
        });call.on('error',reject);call.end();
      });
      const post = (pathname, body) => new Promise((resolve,reject)=>{
        const call=request({hostname:'127.0.0.1',port:server.address().port,path:pathname,method:'POST',headers:{Host:'krakenpfm.ch','Content-Type':'application/json'}},response=>{
          let text='';response.setEncoding('utf8');response.on('data',chunk=>text+=chunk);response.on('end',()=>resolve({status:response.statusCode,payload:JSON.parse(text)}));
        });call.on('error',reject);call.end(body);
      });
      try {
        assert.deepEqual(JSON.parse((await get('/api/health')).body), {status:'ok'});
        const contactConfig = await get('/api/contact/config');
        assert.equal(contactConfig.status,200);
        assert.deepEqual(JSON.parse(contactConfig.body),{geocoding:true,routing:{available:false,provider:'openrouteservice'},coverage:'CH'});
        for(const body of ['{invalid',JSON.stringify({query:'x'.repeat(5000)})]){
          const invalid=await post('/api/contact/geocode',body);assert.equal(invalid.status,400);assert.deepEqual(invalid.payload,{error:{code:'invalid_request'}});
        }
        const routingMissing=await post('/api/contact/route',JSON.stringify({coordinates:[8.632696,47.698002],direction:'outbound'}));
        assert.equal(routingMissing.status,503);assert.deepEqual(routingMissing.payload,{error:{code:'not_configured'}});
        for (const route of ['/', '/quote?lang=es']) {
          const result=await get(route);
          assert.equal(result.status,200,route);
          assert.ok(result.body.includes('COMPILED_TEMPLATE'));
          assert.ok(!result.body.includes('<title>fixture</title>'));
        }
        for (const language of ['de', 'en', 'es', 'pt', 'it', 'fr']) {
          const result = await get('/leistungen?lang=' + language);
          assert.equal(result.status, 200);
          assert.ok(result.body.includes('SERVICES_' + language));
          assert.ok(result.body.includes('BODY_' + language));
          assert.ok(result.body.indexOf('stylesheet') < result.body.indexOf('</head>'));
          assert.equal(result.body.indexOf('stylesheet', result.body.indexOf('<div id="root">')), -1);
        }
        for (const language of ['de','en','es','pt','it','fr']) {
          const result=await get('/about?lang='+language);
          assert.equal(result.status,200);assert.ok(result.body.includes('ABOUT_'+language));assert.ok(result.body.includes('STORY_'+language));assert.ok(!result.body.includes('COMPILED_TEMPLATE'));
          assert.ok((await get('/?lang='+language)).body.includes('WHY_'+language));
          assert.equal((result.body.match(/<h1\\b/g)||[]).length,1);
          const redirect=await get('/ueber-kraken?lang='+language);
          assert.equal(redirect.status,301);assert.equal(redirect.headers.location,'/about?lang='+language);
          const trailing=await get('/about/?lang='+language);
          assert.equal(trailing.status,301);assert.equal(trailing.headers.location,'/about?lang='+language);
          const contact=await get('/kontakt?lang='+language);
          assert.equal(contact.status,200);assert.ok(contact.body.includes('CONTACT_'+language));assert.ok(contact.body.includes('DETAILS_'+language));assert.ok(!contact.body.includes('COMPILED_TEMPLATE'));
          assert.ok(contact.body.indexOf('stylesheet')<contact.body.indexOf('</head>'));
          assert.equal(contact.body.indexOf('stylesheet',contact.body.indexOf('<div id="root">')),-1);
          assert.equal((contact.body.match(/<h1\\b/g)||[]).length,1);
          assert.ok(contact.body.includes('href="tel:+41774505705"'));
          for (const alias of ['/contact','/contacto']) {
            const redirect=await get(alias+'?lang='+language);
            assert.equal(redirect.status,301);assert.equal(redirect.headers.location,'/kontakt?lang='+language);
          }
        }
        console.log('COMPILED_SERVER_OK');
      } finally {await new Promise(resolve => server.close(resolve));}
    `;
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', driver], {
      cwd: directory,
      env: { ...process.env, VERCEL: '1', NODE_ENV: 'production', CONTACT_ROUTING_API_KEY: '' },
      encoding: 'utf8',
      timeout: 15000
    });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stdout, /COMPILED_SERVER_OK/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
