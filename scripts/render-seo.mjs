import { build } from 'esbuild';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Render the same public components for people, search crawlers and JavaScript. */
export async function renderSeoHtml(root) {
  const manifest = JSON.parse(readFileSync(path.join(root, 'dist/.vite/manifest.json'), 'utf8'));
  const stylesFor = (...entries) => {
    const files = new Set(); const seen = new Set();
    const visit = key => {
      if (seen.has(key)) return; seen.add(key);
      const entry = manifest[key]; if (!entry) return;
      for (const file of entry.css || []) files.add(file);
      for (const imported of entry.imports || []) visit(imported);
    };
    entries.forEach(visit);
    return [...files].map(file => `<link rel="stylesheet" href="/${file}">`).join('');
  };
  const cache = path.join(root, 'node_modules/.cache'); mkdirSync(cache, { recursive: true });
  const temporary = mkdtempSync(path.join(cache, 'kraken-seo-'));
  const outfile = path.join(temporary, 'render.cjs');
  try {
    await build({
      stdin: { contents: `
        import React from 'react'; import {renderToStaticMarkup,renderToString} from 'react-dom/server';
        import {I18nProvider} from './i18n.ts';
        import Application from './components/Application.tsx';
        import ApprovedHeader from './components/home/ApprovedHeader.tsx';
        import Footer from './components/Footer.tsx';
        import ImpressumPage from './components/ImpressumPage.tsx';
        import GDPRPage from './components/GDPRPage.tsx';
        import TermsPage from './components/TermsPage.tsx';
        import {LocalSeoContent} from './components/LocalSeoContent.tsx';
        import {resolveLocalSeoRoute,LOCAL_SERVICES} from './src/seo/local-content.ts';
        import {INDEXABLE_PATHS} from './src/seo/crawl-policy.ts';
        import {seoFragmentName,LEGAL_DOCUMENT_PATHS,HOME_APP_SSR_MARKER} from './src/seo/render-contract.ts';
        import {bookingText} from './src/booking/uiCopy.ts';
        import {publicHref} from './src/routing/site-paths.ts';
        import {HERO_DAY,heroImage} from './src/home/hero-media.ts';
        import {getContactCopy} from './src/contact/contact-copy.ts';
        export const routes=[...INDEXABLE_PATHS,...LEGAL_DOCUMENT_PATHS]; export const filename=seoFragmentName;
        const noop=()=>{};
        const wrap=(language,child)=>renderToStaticMarkup(<I18nProvider initialLanguage={language}>{child}</I18nProvider>);
        export const header=(language,page='local')=>wrap(language,<div className="kraken-home"><ApprovedHeader onNavigate={noop} page={page} contactQuoteLabel={page==='contact'?getContactCopy(language).hero.calculate:undefined}/></div>);
        export const footer=(language,contactPage=false)=>wrap(language,<Footer onNavigate={noop} contactPage={contactPage}/>);
        export const home=language=>{
          const image=heroImage(HERO_DAY).source;
          const preload=image?renderToStaticMarkup(<link rel="preload" as="image" type={image.type} imageSrcSet={image.srcSet} imageSizes={image.sizes} fetchPriority="high"/>):'';
          return HOME_APP_SSR_MARKER+preload+renderToString(<Application initialLanguage={language==='de'?'de-CH':language}/>);
        };
        export const local=(pathname,language)=>wrap(language,<><div className="kraken-home"><ApprovedHeader onNavigate={noop} page="local"/></div><LocalSeoContent route={resolveLocalSeoRoute(pathname)} language={language}/><Footer onNavigate={noop}/></>);
        export const legal=(pathname,language)=>wrap(language,<><div className="kraken-home"><ApprovedHeader onNavigate={noop} page="local"/></div>{pathname==='/impressum'?<ImpressumPage onNavigate={noop}/>:pathname==='/gdpr'?<GDPRPage/>:<TermsPage onNavigate={noop}/>}<Footer onNavigate={noop}/></>);
        export const quote=language=>{const t=key=>bookingText(language,key);return wrap(language,<>
          <div className="kraken-home"><ApprovedHeader onNavigate={noop} page="calculator"/></div>
          <main id="main" className="kr-service-calculator" lang={language}><div className="kr-calc-shell"><header className="kr-calc-intro"><p className="kr-calc-eyebrow">{t('eyebrow')}</p><h1>{t('titleStart')} <span>{t('titleAccent')}</span></h1><p className="kr-calc-lead">{t('intro')}</p></header>
          <section className="kr-calc-card"><h2>{t('configureTitle')}</h2><nav className="kr-calc-services" aria-label={t('serviceTitle')}>{LOCAL_SERVICES.map(service=><a className="kr-calc-secondary" key={service.id} href={publicHref('/offerte?service='+service.calculatorService,language)}>{t(service.calculatorService==='end'?'endOfTenancy':service.calculatorService)}</a>)}</nav><p>{t('personal')}</p><p><a href={publicHref('/kontakt',language)}>{t('contactPage')}</a> · <a href="tel:+41774505705">+41 77 450 57 05</a> · <a href="mailto:kai@krakenpfm.ch">kai@krakenpfm.ch</a></p></section></div></main><Footer onNavigate={noop}/></>);};
      `, resolveDir: root, loader: 'tsx' },
      outfile, bundle: true, platform: 'node', format: 'cjs', packages: 'external',
      loader: { '.css': 'empty' }, logLevel: 'warning',
    });
    const render = createRequire(import.meta.url)(outfile);
    const baseStyles = stylesFor('index.html', 'components/home/ApprovedHome.tsx');
    for (const language of ['de', 'en', 'es', 'fr', 'it', 'pt']) {
      const header = render.header(language), footer = render.footer(language);
      writeFileSync(path.join(root, `dist/seo-shell-${language}.html`), baseStyles + header + '<!-- seo-route-content -->' + footer);
      for (const pathname of render.routes) {
        let body, styles = baseStyles;
        if (pathname === '/') body = render.home(language);
        else if (['/leistungen', '/ueber-uns', '/kontakt'].includes(pathname)) {
          const kind = ({ '/leistungen': 'services', '/ueber-uns': 'about', '/kontakt': 'contact' })[pathname];
          const fragment = readFileSync(path.join(root, `dist/${kind}-content-${language}.html`), 'utf8');
          const extra = fragment.match(/<link rel="stylesheet" href="[^"]+">/g) || [];
          styles += extra.join(''); body = (pathname === '/kontakt' ? render.header(language,'contact') : header) + fragment.replace(/<link rel="stylesheet" href="[^"]+">/g, '') + (pathname === '/kontakt' ? render.footer(language,true) : footer);
        } else if (pathname === '/offerte') {
          styles += stylesFor('components/calculator/CalculatorRoute.tsx'); body = render.quote(language);
        } else if (['/impressum','/gdpr','/terms'].includes(pathname)) {
          // The existing legal documents must be readable before JavaScript too.
          // Rendering them does not change their indexing policy or legal copy.
          styles += stylesFor('components/ImpressumPage.tsx','components/GDPRPage.tsx','components/TermsPage.tsx');
          body = render.legal(pathname,language);
        } else {
          styles += stylesFor('components/RegionHubPage.tsx', 'components/CoverageHubPage.tsx', 'components/SeoServiceCityPage.tsx');
          body = render.local(pathname, language);
        }
        if ((body.match(/<h1\b/g) || []).length !== 1) throw new Error(`Expected one public H1: ${pathname} (${language})`);
        if (!body.includes('/reinigung/region-zuerich')) throw new Error(`Public regional navigation is missing: ${pathname}`);
        writeFileSync(path.join(root, 'dist', render.filename(pathname, language)), styles + body);
      }
    }
  } finally { rmSync(temporary, { recursive: true, force: true }); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await renderSeoHtml(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
}
