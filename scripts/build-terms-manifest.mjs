import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {CURRENT_TERMS_VERSION,HISTORICAL_TERMS_VERSIONS,TERMS_EFFECTIVE_DATE} from '../src/legal/terms-version.ts';
const languages=['de','en','es','pt','it','fr'];
const manifestFile=new URL('../src/legal/terms-manifest.json',import.meta.url);
const previous=await readFile(manifestFile,'utf8').then(JSON.parse).catch(error=>{if(error.code==='ENOENT')return null;throw error;});
const manifest={currentVersion:CURRENT_TERMS_VERSION,algorithm:'sha256',versions:{}};
for(const version of [...HISTORICAL_TERMS_VERSIONS,CURRENT_TERMS_VERSION]){
  const entries={};
  for(const language of languages){
    const file=new URL(`../src/legal/versions/${version}/${language}.json`,import.meta.url);
    const document=JSON.parse(await readFile(file,'utf8'));
    if(document.version!==version||document.language!==language||document.sections.length!==17)throw new Error('Incomplete terms document: '+version+'/'+language);
    const content={version,language,title:document.title,dateLabel:document.dateLabel,translationNotice:document.translationNotice,sections:document.sections,contact:document.contact};
    const canonical=JSON.stringify(content);
    const sha256=createHash('sha256').update(canonical).digest('hex');
    const recordedHash=previous?.versions?.[version]?.[language]?.sha256;
    if(recordedHash&&recordedHash!==sha256)throw new Error('An immutable terms document changed: '+version+'/'+language+'. Create a new version identifier.');
    const base=`/legal/terms/${version}/${language}`;
    entries[language]={version,language,sourceLanguage:language,date:version===CURRENT_TERMS_VERSION?TERMS_EFFECTIVE_DATE:version.includes('11-24')?'2026-11-24':version.includes('11-25')?'2026-11-25':'2026-11-26',sha256,documentUrl:base+'.json',pdfUrl:base+'.pdf'};
    const output=new URL(`../public/legal/terms/${version}/`,import.meta.url);
    await mkdir(output,{recursive:true});
    await writeFile(new URL(language+'.json',output),JSON.stringify({...content,sha256},null,2)+'\n');
  }
  manifest.versions[version]=entries;
}
await writeFile(manifestFile,JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({termsVersions:Object.keys(manifest.versions).length,documents:languages.length*Object.keys(manifest.versions).length,currentVersion:CURRENT_TERMS_VERSION}));
