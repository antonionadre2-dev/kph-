import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { HERO_DAY, HERO_NIGHT, HERO_ROOM_SIZES, heroImage } from '../src/home/hero-media.ts';

test('both house states keep proportional transparent sources and a complete WebP fallback',async()=>{
  for(const original of [HERO_DAY,HERO_NIGHT]){
    const image=heroImage(original);
    assert.equal(image.source?.type,'image/avif');
    assert.equal(image.source?.sizes,HERO_ROOM_SIZES);
    assert.match(image.fallback.src,/\.webp$/);
    assert.equal(image.fallback.sizes,image.source?.sizes);
    const entries=image.source!.srcSet.split(', ').map(entry=>{const [src,width]=entry.split(' ');return{src,width:parseInt(width,10)};});
    assert.deepEqual(entries.map(x=>x.width),[320,640,768,960,1536]);
    for(const entry of entries){
      const bytes=fs.readFileSync('public'+entry.src);
      const metadata=await sharp(bytes).metadata();
      assert.equal(metadata.width,entry.width);assert.equal(metadata.height,Math.round(entry.width*2/3));assert.equal(metadata.hasAlpha,true);
      assert.ok(entry.src.includes(createHash('sha256').update(bytes).digest('hex').slice(0,12)));
    }
    const variant=entries.find(x=>x.width===960)!;
    const encoded=fs.readFileSync('public'+variant.src);
    const originalPixels=await sharp('public'+original).resize({width:960}).ensureAlpha().raw().toBuffer();
    const decoded=await sharp(encoded).ensureAlpha().raw().toBuffer();
    assert.equal(decoded.length,originalPixels.length);
    let squared=0;for(let i=0;i<decoded.length;i++)squared+=(decoded[i]-originalPixels[i])**2;
    const psnr=10*Math.log10(255**2/(squared/decoded.length));
    assert.ok(psnr>37,original+' retains high image fidelity');
    assert.ok(encoded.length<42000,original+' reduces the critical image transfer');
  }
});
