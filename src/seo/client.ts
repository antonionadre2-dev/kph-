import { getPageSeo } from './metadata.ts';
import { clientSeoState } from './client-state.ts';

export function syncClientSeo(pathOrUrl:string,language:string,isCurrent:()=>boolean=()=>true):void {
  const publicHost=['krakenpfm.ch','www.krakenpfm.ch'].includes(window.location.hostname);
  const state=clientSeoState(pathOrUrl,language,publicHost);
    const meta = getPageSeo(pathOrUrl,language);
    if(!isCurrent())return;

    document.documentElement.lang = meta.language;
    const robots = document.querySelector('meta[name="robots"]');
    if (robots) {
      const publicHost = ['krakenpfm.ch', 'www.krakenpfm.ch'].includes(window.location.hostname);
      robots.setAttribute('content', state.robots);
    }

    document.title = meta.title;
    let desc = document.querySelector('meta[name="description"]');
    if (!desc) {
      desc = document.createElement('meta');
      desc.setAttribute('name', 'description');
      document.head.appendChild(desc);
    }
    desc.setAttribute('content', meta.description);

    // Canonical link
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', meta.canonical);

    // Keep the same reciprocal language links as the initial server response.
    const alternates = document.querySelectorAll('link[rel="alternate"][hreflang]');
    alternates.forEach(el => el.remove());
    meta.hreflangs.forEach(({ lang, href }) => {
      const alternate = document.createElement('link');
      alternate.setAttribute('rel', 'alternate');
      alternate.setAttribute('hreflang', lang);
      alternate.setAttribute('href', href);
      document.head.appendChild(alternate);
    });

    // Synchronize OG and Twitter tags dynamically
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', meta.title);

    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', meta.description);
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute('content', meta.canonical);
    const syncMeta = (attribute: 'name' | 'property', key: string, value: string) => {
      let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, key);
        document.head.appendChild(element);
      }
      element.content = value;
    };
    syncMeta('property', 'og:image', meta.ogImage);
    syncMeta('property', 'og:image:width', meta.ogImageWidth);
    syncMeta('property', 'og:image:height', meta.ogImageHeight);
    syncMeta('property', 'og:image:type', meta.ogImageType);
    syncMeta('property', 'og:locale', ({ de: 'de_CH', en: 'en', es: 'es', pt: 'pt', it: 'it_CH', fr: 'fr_CH' } as Record<string, string>)[meta.language.slice(0, 2)] || 'de_CH');
    syncMeta('name', 'twitter:image', meta.ogImage);
    let schema = document.querySelector<HTMLScriptElement>('#kraken-page-schema');
    if (!schema) {
      document.head.querySelectorAll('script[type="application/ld+json"]').forEach(element => element.remove());
      schema = document.createElement('script');
      schema.id = 'kraken-page-schema'; schema.type = 'application/ld+json';
      document.head.appendChild(schema);
    }
    schema.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': meta.structuredData });

    const twTitle = document.querySelector('meta[name="twitter:title"]');
    if (twTitle) twTitle.setAttribute('content', meta.title);

    const twDesc = document.querySelector('meta[name="twitter:description"]');
    if (twDesc) twDesc.setAttribute('content', meta.description);
  let marker=document.querySelector<HTMLMetaElement>('meta[name="kraken-route-seo"]');
  if(!marker){marker=document.createElement('meta');marker.name='kraken-route-seo';document.head.appendChild(marker);}
  marker.content=state.marker;
}
