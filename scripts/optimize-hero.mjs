import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

// Format conversion only: keep the original scene, proportions, alpha and logos.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const assets={};
for(const phase of ['day','night']){
  const original=`/home-approved/assets/hero-room-${phase}-v4.webp`;
  const input=path.join(root,'public',original);
  const metadata=await sharp(input).metadata();
  const variants=[];
  for(const width of [320,640,768,960,metadata.width]){
    const encoded=await sharp(input).resize({width,withoutEnlargement:true}).avif({quality:60,effort:5,chromaSubsampling:'4:4:4'}).toBuffer();
    const result=await sharp(encoded).metadata();
    if(result.width!==width||result.height!==Math.round(width*metadata.height/metadata.width)||!result.hasAlpha)throw Error('Hero geometry/alpha changed');
    const hash=createHash('sha256').update(encoded).digest('hex').slice(0,12);
    const name=`hero-room-${phase}-v4-${width}-${hash}.avif`;
    await fs.writeFile(path.join(root,'public/media',name),encoded);
    variants.push({src:'/media/'+name,width:result.width,height:result.height,bytes:encoded.length});
  }
  assets[original]={type:'image/avif',width:metadata.width,height:metadata.height,variants};
}
await fs.writeFile(path.join(root,'src/media/hero-formats.json'),JSON.stringify({version:1,generator:'sharp-avif-60-444-v1',assets},null,2)+'\n');
console.log(JSON.stringify(Object.entries(assets).map(([source,asset])=>({source,variants:asset.variants.map(({width,bytes})=>({width,bytes}))})),null,2));
