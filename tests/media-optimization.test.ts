import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import sharp from 'sharp';
import manifest from '../src/media/manifest.json';
import { mediaAsset, responsiveImage } from '../src/media/images';
import { initDeferredHomeMedia } from '../components/home/deferred-media';

const root=path.resolve(import.meta.dirname,'..');
test('optimized bytes match their immutable hash and retain dimensions, aspect ratio and transparency',async()=>{
  for(const [original,asset] of Object.entries(manifest.assets)){
    if(!('derivedFrom' in asset)){
      assert.equal(statSync(path.join(root,'public',original)).size,asset.originalBytes,original);
      assert.ok(asset.variants.at(-1)!.bytes<=asset.originalBytes,original+': natural variant must not be larger');
    }
    for(const variant of asset.variants){
      const buffer=readFileSync(path.join(root,'public',variant.src));
      const hash=createHash('sha256').update(buffer).digest('hex').slice(0,12);
      assert.ok(variant.src.endsWith('-'+hash+'.webp'),variant.src);
      assert.equal(buffer.length,variant.bytes);
      const metadata=await sharp(buffer).metadata();
      assert.equal(metadata.width,variant.width);assert.equal(metadata.height,variant.height);
      assert.ok(variant.width<=asset.width && variant.height<=asset.height,original);
      assert.ok(Math.abs(variant.height-variant.width*asset.height/asset.width)<=1,original);
      if(asset.hasAlpha)assert.equal(metadata.hasAlpha,true,original+': alpha preserved');
      if(asset.kind==='atlas'){
        const natural=asset.variants.at(-1)!;
        assert.equal(natural.width,asset.width);assert.equal(natural.height,asset.height);
        if('grid' in asset){
          assert.equal(variant.width%asset.grid.columns,0);
          assert.equal(variant.height%asset.grid.rows,0);
          assert.equal(asset.variants[0].width,768);
        }else{
          assert.equal(variant.width,asset.width);assert.equal(variant.height,asset.height);
          assert.equal(asset.variants.length,1);
        }
      }
    }
  }
});

test('responsive API publishes truthful candidates and leaves unknown resources intact',()=>{
  for(const [original,asset] of Object.entries(manifest.assets)){
    const props=responsiveImage(original,'(max-width:760px) 100vw, 50vw');
    assert.equal(props.src,asset.variants.at(-1)!.src);
    assert.equal(mediaAsset(original),props.src);
    assert.equal(props.width,asset.width);assert.equal(props.height,asset.height);
    if(asset.variants.length>1){
      assert.equal(props.sizes,'(max-width:760px) 100vw, 50vw');
      assert.equal(props.srcSet,asset.variants.map(v=>v.src+' '+v.width+'w').join(', '));
    }else assert.equal(props.srcSet,undefined);
  }
  assert.deepEqual(responsiveImage('/untouched.svg'),{src:'/untouched.svg'});
  assert.equal(mediaAsset('/untouched.svg'),'/untouched.svg');
  assert.equal(mediaAsset('/home-approved/assets/logo.webp',160),manifest.assets['/home-approved/assets/logo.webp'].variants[0].src);
});

test('the active seasonal landscape is an exact atlas quarter instead of loading all four seasons',()=>{
  for(const [season,[left,top]] of Object.entries({spring:[0,0],summer:[627,0],autumn:[0,627],winter:[627,627]})){
    const asset=manifest.assets[('/home-approved/assets/seasons-window-'+season+'.webp') as keyof typeof manifest.assets];
    assert.ok('crop' in asset);
    assert.deepEqual(asset.crop,{left,top,width:627,height:627});
    assert.equal(asset.width,627);assert.equal(asset.height,627);
    assert.ok(asset.variants.at(-1)!.bytes<manifest.assets['/home-approved/assets/seasons-window.webp'].originalBytes/2);
  }
});

test('hidden cargo images wait for visibility and detached callbacks cannot request more media',()=>{
  let intersectionCallback: IntersectionObserverCallback,mutationCallback:()=>void;
  let disconnected=0,hidden=true,loads=0,atlas=0;
  const globals={window:globalThis.window,IntersectionObserver:globalThis.IntersectionObserver,MutationObserver:globalThis.MutationObserver};
  const image={dataset:{mediaSource:'/transit-quality/transit-empty-v1.webp'},closest:()=>hidden?{}:null,set src(value:string){loads++;assert.ok(value.startsWith('/media/'));}};
  const services={style:{setProperty:()=>atlas++}};
  const root={querySelectorAll:()=>[image],querySelector:()=>services};
  class IntersectionMock{constructor(callback:IntersectionObserverCallback){intersectionCallback=callback;}observe(){}unobserve(){}disconnect(){disconnected++;}}
  class MutationMock{constructor(callback:()=>void){mutationCallback=callback;}observe(){}disconnect(){disconnected++;}}
  Object.assign(globalThis,{window:{IntersectionObserver:IntersectionMock},IntersectionObserver:IntersectionMock,MutationObserver:MutationMock});
  try{
    const cleanup=initDeferredHomeMedia(root as unknown as HTMLElement);
    intersectionCallback!([{isIntersecting:true,target:image}] as unknown as IntersectionObserverEntry[],{} as IntersectionObserver);
    assert.equal(loads,0);
    hidden=false;mutationCallback!();assert.equal(loads,1);
    cleanup();
    intersectionCallback!([{isIntersecting:true,target:services}] as unknown as IntersectionObserverEntry[],{} as IntersectionObserver);
    assert.equal(atlas,0);assert.equal(loads,1);assert.equal(disconnected,2);
  }finally{Object.assign(globalThis,globals);}
});
