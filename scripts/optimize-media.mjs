import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const publicRoot=path.join(root,'public');
const output=path.join(publicRoot,'media');
const manifestDirectory=path.join(root,'src/media');
const directories=['home-approved/assets','transit-quality','about-approved/assets'];
const atlases=new Set([
  'holiday-decor.webp','kai-rest-v3.webp','kai-tasks-cold-v3.webp','kai-tasks.webp',
  'kai-windows-cold-v3.webp','kai-windows.webp','seasons-window.webp',
  'service-scenes-branded-v4.webp','transit-loading-v4.webp',
]);
const kaiGrids={
  'kai-tasks.webp':{columns:3,rows:2},'kai-tasks-cold-v3.webp':{columns:3,rows:2},
  'kai-windows.webp':{columns:2,rows:1},'kai-windows-cold-v3.webp':{columns:2,rows:1},'kai-rest-v3.webp':{columns:2,rows:1},
};

await fs.mkdir(output,{recursive:true});
await fs.mkdir(manifestDirectory,{recursive:true});
const cropsOnly=process.argv.includes('--crops-only');
const kaiOnly=process.argv.includes('--kai-only');
const manifest=cropsOnly||kaiOnly?JSON.parse(await fs.readFile(path.join(manifestDirectory,'manifest.json'),'utf8')):{version:1,generator:'sharp-webp-v1',assets:{}};
for(const directory of cropsOnly?[]:kaiOnly?['home-approved/assets']:directories){
  const files=(await fs.readdir(path.join(publicRoot,directory))).filter(name=>name.endsWith('.webp')&&(!kaiOnly||kaiGrids[name])).sort();
  for(const file of files){
    const original='/'+directory+'/'+file;
    const buffer=await fs.readFile(path.join(publicRoot,directory,file));
    const metadata=await sharp(buffer).metadata();
    const atlas=directory==='home-approved/assets'&&atlases.has(file);
    const grid=directory==='home-approved/assets'?kaiGrids[file]:undefined;
    const logo=file.includes('logo');
    const widths=atlas?[...(grid?[768]:[]),metadata.width]:[...new Set([...(logo?[160]:[]),320,640,960,metadata.width].filter(width=>width<=metadata.width))].sort((a,b)=>a-b);
    const variants=[];
    for(const width of widths){
      const existing=kaiOnly&&width===metadata.width?manifest.assets[original]?.variants.find(variant=>variant.width===width):null;
      if(existing){variants.push(existing);continue;}
      let pipeline=sharp(buffer);
      if(width!==metadata.width)pipeline=pipeline.resize({width,withoutEnlargement:true});
      let encoded=await pipeline.webp({quality:atlas||logo?82:78,alphaQuality:100,effort:6,smartSubsample:true}).toBuffer();
      // Never replace an already smaller natural WebP with a larger re-encoding.
      if(width===metadata.width&&encoded.length>=buffer.length)encoded=buffer;
      const dimensions=await sharp(encoded).metadata();
      if(atlas&&width===metadata.width&&(dimensions.width!==metadata.width||dimensions.height!==metadata.height))throw new Error('Natural atlas geometry changed: '+original);
      if(grid&&(dimensions.width%grid.columns!==0||dimensions.height%grid.rows!==0))throw new Error('Kai cell geometry changed: '+original);
      if(metadata.hasAlpha&&!dimensions.hasAlpha)throw new Error('Transparency was removed: '+original);
      const hash=createHash('sha256').update(encoded).digest('hex').slice(0,12);
      const filename=path.basename(file,'.webp')+'-'+width+'-'+hash+'.webp';
      await fs.writeFile(path.join(output,filename),encoded);
      variants.push({src:'/media/'+filename,width:dimensions.width,height:dimensions.height,bytes:encoded.length});
    }
    manifest.assets[original]={width:metadata.width,height:metadata.height,hasAlpha:!!metadata.hasAlpha,kind:atlas?'atlas':'image',...(grid?{grid}:{}),originalBytes:buffer.length,variants};
  }
}
// The landscape atlas contains four independent seasons. Preserve its compatibility
// derivative above, but let the live scene request only the exact quarter it displays.
const seasonOriginal='/home-approved/assets/seasons-window.webp';
const seasonBuffer=await fs.readFile(path.join(publicRoot,seasonOriginal));
const seasonMetadata=await sharp(seasonBuffer).metadata();
const quarter=seasonMetadata.width/2;
if(!Number.isInteger(quarter)||seasonMetadata.height!==seasonMetadata.width)throw new Error('Unexpected season atlas geometry.');
for(const [season,[left,top]] of Object.entries({spring:[0,0],summer:[quarter,0],autumn:[0,quarter],winter:[quarter,quarter]})){
  const variants=[];
  for(const width of [320,quarter].filter(width=>width<=quarter)){
    const encoded=await sharp(seasonBuffer).extract({left,top,width:quarter,height:quarter}).resize({width,withoutEnlargement:true}).webp({quality:78,effort:6,smartSubsample:true}).toBuffer();
    const hash=createHash('sha256').update(encoded).digest('hex').slice(0,12);
    const filename=`season-${season}-${width}-${hash}.webp`;
    await fs.writeFile(path.join(output,filename),encoded);
    variants.push({src:'/media/'+filename,width,height:width,bytes:encoded.length});
  }
  manifest.assets[`/home-approved/assets/seasons-window-${season}.webp`]={width:quarter,height:quarter,hasAlpha:false,kind:'image',derivedFrom:seasonOriginal,crop:{left,top,width:quarter,height:quarter},originalBytes:0,variants};
}
await fs.writeFile(path.join(manifestDirectory,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
const assets=Object.entries(manifest.assets);
const originals=assets.filter(([,asset])=>!asset.derivedFrom);
const originalBytes=originals.reduce((sum,[,asset])=>sum+asset.originalBytes,0);
const naturalBytes=originals.reduce((sum,[,asset])=>sum+asset.variants.at(-1).bytes,0);
const kib=bytes=>(bytes/1024).toFixed(1)+' KiB';
const report=[
  '# Optimización de imágenes — 25 de noviembre de 2026','',
  'Generación reproducible: `node scripts/optimize-media.mjs` con sharp 0.35.5. Los originales se conservan. Los derivados WebP tienen hash SHA-256 de sus bytes y se sirven desde `/media/`.','',
  `Total de ${originals.length} originales: ${kib(originalBytes)}. Derivados naturales: ${kib(naturalBytes)} (${(100-naturalBytes/originalBytes*100).toFixed(1)} % menos). Los dispositivos eligen derivados menores mediante srcset.`,
  '', '| Original | Original | Natural optimizado | Variante 640 px | Modo |','| --- | ---: | ---: | ---: | --- |',
  ...assets.map(([name,asset])=>`| ${name} | ${asset.derivedFrom?'Cuadrante exacto del atlas':kib(asset.originalBytes)} | ${kib(asset.variants.at(-1).bytes)} | ${asset.variants.find(variant=>variant.width===640)?kib(asset.variants.find(variant=>variant.width===640).bytes):'—'} | ${asset.kind==='atlas'?'Atlas, geometría original':'Responsive'} |`),
  '', 'Todos los atlas conservan una variante de tamaño natural y su canal alfa. Kai añade una variante 768 px proporcional con celdas enteras: 768×512 para 3×2 y 768×384 para 2×1. Se elige según tamaño visible, columnas y DPR, con tope móvil 768. No se recortan poses ni logos. Las imágenes individuales se generan a 320/640/960 px y tamaño natural, sin ampliación; los logos añaden 160 px. No se generan imágenes nuevas ni se cambia su contenido.',
  '', 'El primer sprite espera la temperatura hasta 500 ms. Si no llega, su ropa sigue la fecha de Zúrich; cuando llega una observación válida se actualiza. Solo se asigna la URL del sprite activo, de modo que no se precargan simultáneamente los dos climas. Kai sigue reproduciéndose automáticamente y respeta la pausa y reduced motion.',
  '', 'El paisaje de estaciones añade cuatro derivados que recortan exactamente sus cuadrantes originales de 627 × 627 px. La escena solicita solo el cuadrante de la estación activa; conserva el encuadre del SVG. El atlas completo original y su derivado de compatibilidad se mantienen.',
  '', 'El HTML usa srcset/sizes y conserva las dimensiones intrínsecas para evitar saltos de layout. Los atlas de la escena se solicitan al aproximarse la escena a la pantalla; el atlas de servicios y las secciones inferiores esperan a su visibilidad. La reproducción automática de Kai, la temperatura y los controles de movimiento se mantienen.',
  '', 'Las capas de una ilustración compuesta mantienen alt vacío y aria-hidden; el contenedor tiene una descripción traducida que el controlador actualiza. Las imágenes informativas conservan su texto alternativo. Las cifras Lighthouse antes/después se documentan por separado sobre la compilación completa.',
];
await fs.mkdir(path.join(root,'docs'),{recursive:true});
await fs.writeFile(path.join(root,'docs/MEDIA-OPTIMIZATION-2026-11-25.md'),report.join('\n')+'\n');
console.log(`Optimized ${assets.length} images: ${kib(originalBytes)} → ${kib(naturalBytes)} natural derivatives.`);
