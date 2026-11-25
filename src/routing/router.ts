import { toLegacyPath } from './site-paths.ts';
import { getRouteDisposition } from './route-policy.ts';

export const PATH_TO_PAGE_MAP: Record<string,string> = {
  '/':'home','/quote':'consultation','/quote-demo':'calculator-demo','/customer-access':'customer-access',
  '/about':'about','/leistungen':'approved-services','/kontakt':'kontakt','/einsatzgebiete':'coverage-hub',
  '/impressum':'impressum','/gdpr':'gdpr','/terms':'terms','/login':'login','/register':'register','/dashboard':'dashboard',
  '/commercial-quote':'commercial-quote','/review-invite':'review-invite','/reviews':'review-invite','/reviewsvip':'review-invite','/dejar-opinion':'review-invite',
};
export function isRouteValid(path: string): boolean {
  try { return [200,301].includes(getRouteDisposition(path).status); } catch { return false; }
}
export function parsePath(path: string): {page:string;cityId:string;serviceId:string} {
  const missing={page:'404',cityId:'',serviceId:''};
  if(!isRouteValid(path))return missing;
  const legacy=toLegacyPath(path);
  if(PATH_TO_PAGE_MAP[legacy])return {page:PATH_TO_PAGE_MAP[legacy],cityId:'',serviceId:''};
  const region=/^\/reinigung\/(kanton-schaffhausen|region-winterthur|region-zuerich)$/.exec(legacy);
  if(region)return {page:'region-hub',cityId:region[1]==='kanton-schaffhausen'?'schaffhausen':region[1]==='region-winterthur'?'winterthur':'zuerich',serviceId:''};
  const service=/^\/services\/(schaffhausen|zurich|winterthur)\/([^/]+)$/.exec(legacy);
  return service ? {page:'seo-landing',cityId:service[1],serviceId:service[2]} : missing;
}
