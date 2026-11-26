import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { frontendAssetManifest } from '../scripts/frontend-asset-contract.mjs';
import { assertVercelBuildMode } from '../scripts/build-vercel.mjs';
import { makeVercelPrebuilt } from '../scripts/make-vercel-prebuilt.mjs';

function fixture() {
  const root=mkdtempSync(path.join(tmpdir(),'kraken-asset-contract-')),files=new Map();
  const write=(name,source)=>{const filename=path.join(root,name);mkdirSync(path.dirname(filename),{recursive:true});writeFileSync(filename,source);return filename;};
  const asset=(name,source)=>files.set(name,write('public/'+name,source));
  const runtimeHtml=[{name:'index.html',source:write('dist/index.html','<script type="module" src="/assets/index.js"></script><link rel="stylesheet" href="/assets/index.css">')}];
  asset('assets/index.js','import "./shared.js"; const lazy=["assets/lazy.js","assets/lazy.css"];import("./lazy.js");');
  asset('assets/shared.js','export const shared=true;');asset('assets/lazy.js','import "./nested/chart.js";');asset('assets/nested/chart.js','import "../shared.js";');
  asset('assets/index.css','@import "./colors.css"; .a{background:url("../media/bg.webp")} @font-face{src:url("/fonts/manrope.woff2")}');
  asset('assets/colors.css','.a{color:#062d52}');asset('assets/lazy.css','.a{background:url(data:image/png;base64,AAAA)}');
  asset('fonts/manrope.woff2','FONT');asset('media/bg.webp','IMAGE');
  return{root,files,runtimeHtml,write,asset};
}
test('manifest checks all lazy imports, nested chunks, CSS imports and public fonts/images',()=>{
  const f=fixture();try{
    const manifest=frontendAssetManifest(f.files,f.runtimeHtml);
    assert.equal(manifest.assets.length,9);
    assert.deepEqual(manifest.assets.find(row=>row.path==='/assets/index.js').dependencies,['/assets/lazy.css','/assets/lazy.js','/assets/shared.js']);
    assert.deepEqual(manifest.assets.find(row=>row.path==='/assets/nested/chart.js').dependencies,['/assets/shared.js']);
    assert.deepEqual(manifest.assets.find(row=>row.path==='/assets/index.css').dependencies,['/assets/colors.css','/fonts/manrope.woff2','/media/bg.webp']);
    assert.ok(manifest.assets.every(row=>/^[a-f0-9]{64}$/.test(row.sha256)&&row.bytes>0));
    assert.deepEqual(frontendAssetManifest(f.files,f.runtimeHtml),manifest,'The verification manifest is deterministic');
  }finally{rmSync(f.root,{recursive:true,force:true});}
});
test('an HTML 200 fixture cannot hide missing entry, lazy JavaScript, CSS or font files',()=>{
  for(const missing of ['assets/index.js','assets/index.css','assets/lazy.js','assets/lazy.css','assets/shared.js','assets/colors.css','fonts/manrope.woff2']){
    const f=fixture();try{f.files.delete(missing);assert.throws(()=>frontendAssetManifest(f.files,f.runtimeHtml),/unpublished frontend file|Missing published frontend dependency/);}finally{rmSync(f.root,{recursive:true,force:true});}
  }
  const f=fixture();try{f.write('dist/index.html','<script src="/assets/index.js"></script>');assert.throws(()=>frontendAssetManifest(f.files,f.runtimeHtml),/JavaScript and CSS/);}finally{rmSync(f.root,{recursive:true,force:true});}
});
test('relative dependency traversal cannot read files outside the public artifact',()=>{
  const f=fixture();try{f.asset('assets/index.js','import "../../private.js";');assert.throws(()=>frontendAssetManifest(f.files,f.runtimeHtml),/escapes the public directory/);}finally{rmSync(f.root,{recursive:true,force:true});}
});
test('ordinary local QA is allowed; unverified Vercel source builds fail closed',()=>{
  assert.doesNotThrow(()=>assertVercelBuildMode({}));
  assert.throws(()=>assertVercelBuildMode({VERCEL:'1'}),/source build blocked/);
  assert.throws(()=>assertVercelBuildMode({VERCEL:'1',KRAKEN_PREBUILT_BUILD:'true'}),/source build blocked/);
  assert.doesNotThrow(()=>assertVercelBuildMode({VERCEL:'1',KRAKEN_PREBUILT_BUILD:'1'}));
});
test('local packaging requires reviewed preview settings, builds once, then prepares and verifies without pull or deployment',()=>{
  const f=fixture();let runs=0;const calls=[];
  const run=(_command,args,options)=>{runs++;assert.deepEqual(args,['build']);assert.equal(options.env.KRAKEN_PREBUILT_BUILD,'1');assert.equal(options.cwd,f.root);return{status:0};};
  const prepare=(_root,options)=>{calls.push(options);return{missing:0};};
  try{
    assert.throws(()=>makeVercelPrebuilt(f.root,{run,prepare}),/local preview|Local preview/);assert.equal(runs,0);
    f.write('.vercel/project.json',JSON.stringify({projectId:'prj_synthetic',orgId:'team_synthetic',settings:{framework:'express',buildCommand:'npm run build:vercel'}}));
    f.write('.vercel/.env.production.local','BOOKING_ENABLED=false\n');
    assert.throws(()=>makeVercelPrebuilt(f.root,{run,prepare}),/production environment files are not used/);assert.equal(runs,0);
    f.write('.vercel/.env.preview.local','BOOKING_ENABLED=false\n');
    assert.deepEqual(makeVercelPrebuilt(f.root,{cli:'/local/vercel',run,prepare}),{missing:0});assert.equal(runs,1);
    assert.deepEqual(calls,[undefined,{verifyOnly:true}]);
    f.write('.vercel/output/frontend-asset-manifest.json','STALE');
    assert.throws(()=>makeVercelPrebuilt(f.root,{run:()=>({status:1}),prepare:()=>{throw Error('must not verify');}}),/build failed/);
    assert.equal(existsSync(path.join(f.root,'.vercel/output/frontend-asset-manifest.json')),false);
  }finally{rmSync(f.root,{recursive:true,force:true});}
});
