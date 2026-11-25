import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {languages} from '../src/labels.mjs';
import {renderEmail} from '../src/render.mjs';
import {demoData} from '../src/demo-data.mjs';
import {emailArtwork} from '../src/artwork.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const catalogs=Object.fromEntries(languages.map(lang=>[lang,JSON.parse(readFileSync(join(root,`content/catalog.${lang}.json`),'utf8'))]));
const ids=Object.keys(catalogs.de);
// Embed only the assets the emails actually use. Old reference images remain
// available in the source package but do not inflate the standalone gallery.
const usedAssets=['kraken-logo.png',...Object.values(emailArtwork).map(art=>art.file)];
const assets=Object.fromEntries(usedAssets.map(name=>[name,`data:image/png;base64,${readFileSync(join(root,'assets',name)).toString('base64')}`]));
let maxBytes=0;
for(const language of languages){
  const directory=join(root,'samples',language);mkdirSync(directory,{recursive:true});
  for(const id of ids){
    const result=renderEmail(id,demoData(id,language),{catalogs,assetBaseUrl:'../../assets',mode:'preview'});
    writeFileSync(join(directory,`${id}.html`),result.html);
    writeFileSync(join(directory,`${id}.txt`),`Subject: ${result.subject}\nPreheader: ${result.preheader}\n\n${result.text}`);
    maxBytes=Math.max(maxBytes,Buffer.byteLength(result.html));
  }
}
// Bundle our own dependency-free ES modules into the standalone review file.
const engine=['language','labels','preparation','artwork','render','demo-data'].map(name=>readFileSync(join(root,`src/${name}.mjs`),'utf8').replace(/^import .*?;\s*$/gm,'').replace(/^export\s+(const|function|class)\s/gm,'$1 ')).join('\n');
const json=value=>JSON.stringify(value).replace(/<\//g,'<\\/');
const shell=readFileSync(join(root,'src/studio.html'),'utf8');
const gallery=shell.replace('__ENGINE__',()=>engine).replace('__CATALOGS__',()=>json(catalogs)).replace('__ASSETS__',()=>json(assets));
writeFileSync(join(root,'ABRIR_EMAIL_STUDIO.html'),gallery);
const inventory={created:'2026-11-25',timezone:'Europe/Zurich',templates:ids.length,languages,uniqueIllustrations:Object.keys(emailArtwork).length,htmlSamples:ids.length*languages.length,textSamples:ids.length*languages.length,maxEmailHtmlBytes:maxBytes,demonstrationOnly:true,noEmailsSent:true,templatesById:ids.map(id=>({id,title:catalogs.es[id].title,event:catalogs.de[id].event,kind:catalogs.de[id].kind,artwork:emailArtwork[id].file}))};
writeFileSync(join(root,'EMAIL_CATALOG.json'),JSON.stringify(inventory,null,2));
console.log(JSON.stringify({templates:ids.length,uniqueIllustrations:Object.keys(emailArtwork).length,languages:languages.length,htmlSamples:180,plainTextSamples:180,maxEmailHtmlBytes:maxBytes,standaloneStudio:'ABRIR_EMAIL_STUDIO.html'},null,2));
