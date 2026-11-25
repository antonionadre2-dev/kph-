/** Framework-neutral SEO helpers. Call from the server/build, not from hydration.
 * The caller supplies verified content and the published canonical origin.
 * Preview is deliberately the default. Merge this graph with an existing graph;
 * do not emit a second competing LocalBusiness for the same company.
 */
export const COMPANY = Object.freeze({
  name: 'Kraken Properties and Facilities Management',
  legalName: 'Kraken Properties and Facilities Management Gomes Mendes',
  telephone: '+41774505705', email: 'kai@krakenpfm.ch',
  streetAddress: 'Seewadelstrasse 3', postalCode: '8203', addressLocality: 'Schaffhausen',
  cities: ['Zürich', 'Schaffhausen', 'Winterthur']
});

export const SERVICE_LINKS = Object.freeze([
  { id: 'windows', name: 'Fensterreinigung', anchor: 'fensterreinigung', calculator: 'windows' },
  { id: 'moveout', name: 'Umzugsreinigung', anchor: 'umzugsreinigung', calculator: 'end-of-tenancy' },
  { id: 'regular', name: 'Regelmässige Reinigung', anchor: 'regelmaessige-reinigung', calculator: 'daily-cleaning' },
  { id: 'deep', name: 'Grundreinigung', anchor: 'grundreinigung', calculator: 'deep-cleaning' },
  { id: 'moving', name: 'Kleine Umzüge', anchor: 'kleine-umzuege', calculator: 'moving' }
]);

export function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
}

export function safeJson(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

export function canonicalUrl(path, origin = 'https://krakenpfm.ch') {
  const base = new URL(origin);
  if (base.protocol !== 'https:' || base.username || base.password || base.pathname !== '/' || base.search || base.hash) throw new Error('Use a public HTTPS origin without credentials, path or query.');
  if (!path.startsWith('/') || path.startsWith('//') || /[?#]/.test(path)) throw new Error('Provide an absolute canonical route without query or fragment.');
  const url = new URL(path, base);
  if (url.origin !== base.origin) throw new Error('Canonical must stay on the configured origin.');
  return url.href;
}

export function publicAssetUrl(path, { origin = 'https://krakenpfm.ch', assetBase = '/home-approved/assets' } = {}) {
  if (!assetBase.startsWith('/') || assetBase.startsWith('//') || /[?#]/.test(assetBase)) throw new Error('Use a verified same-origin public asset directory.');
  const deployedPath = path.startsWith('/assets/') ? assetBase.replace(/\/$/,'') + '/' + path.slice('/assets/'.length) : path;
  return canonicalUrl(deployedPath, origin);
}

export function localStructuredData(page, { origin = 'https://krakenpfm.ch', assetBase = '/home-approved/assets' } = {}) {
  const home = canonicalUrl('/', origin);
  const url = canonicalUrl(page.path, origin);
  const businessId = home + '#business';
  const graph = [
    { '@type':'WebSite', '@id':home + '#website', url:home, name:'Kraken PFM', inLanguage:'de-CH', publisher:{'@id':businessId} },
    { '@type':'LocalBusiness', '@id':businessId, name:COMPANY.name, legalName:COMPANY.legalName, url:home,
      telephone:COMPANY.telephone, email:COMPANY.email,
      logo:publicAssetUrl('/assets/logo.webp', {origin,assetBase}),
      address:{'@type':'PostalAddress', streetAddress:COMPANY.streetAddress, postalCode:COMPANY.postalCode, addressLocality:COMPANY.addressLocality, addressCountry:'CH'},
      areaServed:COMPANY.cities.map(name => ({'@type':'City', name})),
      openingHoursSpecification:[{'@type':'OpeningHoursSpecification', dayOfWeek:['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'], opens:'09:00', closes:'19:00'}],
      sameAs:['https://www.linkedin.com/company/krakenpfm/']
    },
    { '@type':'WebPage', '@id':url + '#webpage', url, name:page.title, description:page.description,
      inLanguage:'de-CH', isPartOf:{'@id':home + '#website'}, about:{'@id':businessId},
      ...(page.breadcrumbs ? {breadcrumb:{'@id':url + '#breadcrumb'}} : {})
    }
  ];
  if (page.breadcrumbs) graph.push({'@type':'BreadcrumbList','@id':url + '#breadcrumb',itemListElement:page.breadcrumbs.map((crumb,index) => ({'@type':'ListItem',position:index + 1,name:crumb.name,item:canonicalUrl(crumb.path,origin)}))});
  if (page.city) {
    const serviceIds = [];
    for (const service of SERVICE_LINKS) {
      const id = `${url}#service-${service.id}`;
      serviceIds.push({'@id':id});
      graph.push({'@type':'Service','@id':id,name:`${service.name} in ${page.city}`,serviceType:service.name,
        provider:{'@id':businessId},areaServed:{'@type':'City',name:page.city},url: url + '#' + service.anchor});
    }
    graph.find(item=>item['@type']==='WebPage').mainEntity = serviceIds;
  }
  return {'@context':'https://schema.org','@graph':graph};
}

export function renderSeoHead(page, { preview = true, origin = 'https://krakenpfm.ch', assetBase = '/home-approved/assets' } = {}) {
  const url = canonicalUrl(page.path, origin);
  const image = publicAssetUrl(page.productionImage || page.image || '/assets/services-hero-v5.webp', {origin,assetBase});
  const tags = [
    '<!-- Kraken SEO: generated from verified page content -->',
    `<title>${escapeHtml(page.title)}</title>`,
    `<meta name="description" content="${escapeHtml(page.description)}">`,
    `<meta name="robots" content="${preview ? 'noindex,nofollow' : page.noindex ? 'noindex,follow' : 'index,follow,max-image-preview:large'}">`,
    ...(!preview ? [`<link rel="canonical" href="${escapeHtml(url)}">`] : []),
    '<meta property="og:type" content="website">',
    '<meta property="og:locale" content="de_CH">',
    '<meta property="og:site_name" content="Kraken PFM">',
    `<meta property="og:title" content="${escapeHtml(page.title)}">`,
    `<meta property="og:description" content="${escapeHtml(page.description)}">`,
    ...(!preview ? [`<meta property="og:url" content="${escapeHtml(url)}">`] : []),
    `<meta property="og:image" content="${escapeHtml(image)}">`,
    `<meta property="og:image:alt" content="${escapeHtml(page.imageAlt || 'Reinigung und kleine Umzüge für Privathaushalte mit Kraken')}">`,
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${escapeHtml(page.title)}">`,
    `<meta name="twitter:description" content="${escapeHtml(page.description)}">`,
    `<meta name="twitter:image" content="${escapeHtml(image)}">`,
    `<script type="application/ld+json">${safeJson(localStructuredData(page,{origin,assetBase}))}</script>`,
    '<!-- /Kraken SEO -->'
  ];
  // No hreflang here: only German content is in this change. Production must
  // retain its existing reciprocal set for genuinely translated page variants.
  return tags.join('\n  ');
}

export function applySeoHead(html, page, options) {
  let cleaned = html.replace(/<!-- Kraken SEO:[\s\S]*?<!-- \/Kraken SEO -->\s*/g,'');
  if (/<script\b[^>]*type=["']application\/ld\+json["']/i.test(cleaned)) throw new Error('Existing structured data found. Merge the page nodes into the existing server SEO graph; do not append another graph.');
  cleaned = cleaned.replace(/<title>[\s\S]*?<\/title>\s*/gi,'')
    .replace(/<meta\b[^>]*(?:name=["'](?:description|robots|twitter:[^"']+)["']|property=["']og:[^"']+["'])[^>]*>\s*/gi,'')
    .replace(/<link\b[^>]*rel=["']canonical["'][^>]*>\s*/gi,'');
  return cleaned.replace('</head>',`  ${renderSeoHead(page,options)}\n</head>`);
}
