import { resolveSiteLanguage, normalizeSiteLanguage, type SiteLanguage } from '../locale.ts';
import { routeLanguage, toPublicPath } from './site-paths.ts';

/** Only a complete server-rendered App Home may be hydrated with its exact initial locale. */
export function homeHydrationLanguage({ marked, pathname, search='', saved=null, browserLanguage='', ssrLanguage }: {
  marked: string | null; pathname:string; search?:string; saved?:unknown; browserLanguage?:string; ssrLanguage:string;
}): SiteLanguage | null {
  if(marked!=='true'||toPublicPath(pathname)!=='/')return null;
  const server=normalizeSiteLanguage(ssrLanguage);
  if(!server)return null;
  const selected=resolveSiteLanguage({pathname,search,saved,browserLanguage});
  if(routeLanguage(selected)!==routeLanguage(server))return null;
  return routeLanguage(server)==='de'?'de-CH':server;
}
