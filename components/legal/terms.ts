import type {TermsTranslation} from './types';
import {getTermsDocument} from '../../src/legal/terms-document.ts';
import {routeLanguage} from '../../src/routing/site-paths.ts';
const cache=new Map<string,TermsTranslation>();
/** Compatibility accessor for consumers; /terms renders structured paragraphs and lists directly. */
export function getTermsTranslation(language:unknown):TermsTranslation {
 const locale=routeLanguage(language)||'de';
 if(!cache.has(locale)){
  const document=getTermsDocument(locale);
  cache.set(locale,{title:document.title,description:document.translationNotice,sections:document.sections.map(section=>({title:section.title,content:section.blocks.map(block=>block.type==='paragraph'?block.text:block.items.map(item=>'- '+item).join('\n')).join('\n\n')})),verificationTitle:document.title,lastUpdated:document.dateLabel,companyInfo:document.contact,backHome:({de:'Startseite',en:'Home',es:'Inicio',pt:'Início',it:'Home',fr:'Accueil'})[locale]});
 }
 return cache.get(locale)!;
}
