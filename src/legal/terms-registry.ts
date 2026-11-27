import manifest from './terms-manifest.json' with {type:'json'};
import {CURRENT_TERMS_VERSION} from './terms-version.ts';
export type TermsLanguage='de'|'en'|'es'|'pt'|'it'|'fr';
export interface TermsMetadata {version:string;language:string;sourceLanguage:string;date:string;sha256:string;documentUrl:string;pdfUrl:string}
export interface TermsAcceptance {version:string;acceptedAt:number;language:TermsLanguage;sourceLanguage:string;documentSha256:string;germanSha256:string;documentUrl:string;pdfUrl:string}
const normalize=(value:unknown):TermsLanguage=>typeof value==='string'&&['de','en','es','pt','it','fr'].includes(value.split('-')[0].toLowerCase())?value.split('-')[0].toLowerCase() as TermsLanguage:'de';
export function termsMetadata(version:string,language:unknown):TermsMetadata|null {
  const versions=manifest.versions as Record<string,Record<string,TermsMetadata>>;
  return Object.hasOwn(versions,version)?versions[version][normalize(language)]||null:null;
}
export function currentTermsDocuments(){return manifest.versions[CURRENT_TERMS_VERSION];}
/** All values are from the server's immutable registry and clock, never a browser timestamp/hash. */
export function createTermsAcceptance(language:unknown,acceptedAt:number):TermsAcceptance {
  if(!Number.isFinite(acceptedAt))throw new TypeError('Invalid acceptance time');
  const shown=normalize(language),document=termsMetadata(CURRENT_TERMS_VERSION,shown)!,german=termsMetadata(CURRENT_TERMS_VERSION,'de')!;
  return {version:CURRENT_TERMS_VERSION,acceptedAt,language:shown,sourceLanguage:document.sourceLanguage,documentSha256:document.sha256,germanSha256:german.sha256,documentUrl:document.documentUrl,pdfUrl:document.pdfUrl};
}
