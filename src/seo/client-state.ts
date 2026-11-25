import { publicHref, pathLanguage, routeLanguage, toPublicPath, SITE_ORIGIN } from '../routing/site-paths.ts';
import { getRouteDisposition } from '../routing/route-policy.ts';
import { isIndexablePath, isPrivateUrl } from './crawl-policy.ts';

/** Small routing facts only: no page copy, FAQs, prices, schema or language dictionaries. */
export function clientSeoState(pathOrUrl:string,language?:unknown,allowIndexing=true) {
  const url=new URL(pathOrUrl,SITE_ORIGIN),locale=routeLanguage(language)||pathLanguage(url.href)||'de';
  const base=toPublicPath(url.pathname);
  const indexable=isIndexablePath(base)&&!isPrivateUrl(url.pathname+url.search);
  const robots=allowIndexing ? indexable?'index, follow':'noindex, follow' : 'noindex, nofollow';
  const documentLanguage=locale==='de'?'de-CH':locale;
  const canonical=SITE_ORIGIN+publicHref(base,locale);
  // Only reviewed/static route keys enter the marker. Query capabilities and unknown paths never do.
  const key=getRouteDisposition(base).status===200?base:'unlisted';
  return {canonical,language:documentLanguage,indexable,robots,marker:`v1|${key}|${documentLanguage}|${robots}`};
}
export type ClientSeoState=ReturnType<typeof clientSeoState>;
export function headHasCurrentSeo(doc:Document,state:ClientSeoState):boolean {
  if(doc.documentElement.lang!==state.language)return false;
  if(doc.querySelector('meta[name="kraken-route-seo"]')?.getAttribute('content')!==state.marker)return false;
  if(doc.querySelector('link[rel="canonical"]')?.getAttribute('href')!==state.canonical)return false;
  if(doc.querySelector('meta[name="robots"]')?.getAttribute('content')!==state.robots)return false;
  if(doc.querySelectorAll('link[rel="alternate"][hreflang]').length!==(state.indexable?7:0))return false;
  const schema=doc.querySelector('#kraken-page-schema');
  if(!schema)return false;
  if(!state.indexable){try{if(JSON.parse(schema.textContent||'{}')['@graph']?.length!==0)return false;}catch{return false;}}
  return true;
}
/** Sensitive URLs must become private synchronously, before any deferred SEO code downloads. */
export function protectPrivateHead(doc:Document,state:ClientSeoState):void {
  if(state.indexable)return;
  let robots=doc.querySelector<HTMLMetaElement>('meta[name="robots"]');
  if(!robots){robots=doc.createElement('meta');robots.name='robots';doc.head.appendChild(robots);}
  robots.content=state.robots;
  let canonical=doc.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if(!canonical){canonical=doc.createElement('link');canonical.rel='canonical';doc.head.appendChild(canonical);}
  canonical.href=state.canonical;
  doc.querySelectorAll('link[rel="alternate"][hreflang]').forEach(element=>element.remove());
  doc.querySelectorAll('script[type="application/ld+json"]').forEach(element=>element.remove());
  doc.querySelector('meta[name="kraken-route-seo"]')?.remove();
}

export function createClientSeoScheduler(load:()=>Promise<{syncClientSeo:(path:string,language:string,isCurrent:()=>boolean)=>void}>,readPath:()=>string) {
  let revision=0;
  return {
    synchronize(path:string,language:string,doc:Document,allowIndexing:boolean) {
      const ticket=++revision;
      let active=true;
      const state=clientSeoState(path,language,allowIndexing);
      const isCurrent=()=>active&&ticket===revision&&readPath()===path;
      if(!headHasCurrentSeo(doc,state)){
        protectPrivateHead(doc,state);
        void load().then(module=>{if(isCurrent())module.syncClientSeo(path,language,isCurrent);}).catch(()=>{});
      }
      return ()=>{active=false;};
    },
  };
}
