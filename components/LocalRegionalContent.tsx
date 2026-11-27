import {publicPolicyContent} from '../src/kai/policyContent';
import {normalizeHomeLanguage} from './home/homeTranslations';
import {getKaiFaqs} from '../src/kai/facts';
import {servicesText} from './services/servicesTranslations';
import React, { useEffect, useRef, useState } from 'react';
import KrakenServiceIcon from './KrakenServiceIcon';
import { getRegionalPage, getRegionalPages, getRegionalHubCopy, type RegionalPage } from '../src/seo/regional-content';
import { localHref, type LocalSeoRoute } from '../src/seo/local-content';
import { responsiveImage } from '../src/media/images';
import { calculatorCta } from '../src/home/cta';

const SERVICE_CONFIG = {
  windows: { id: 'window-cleaning', calculator: 'windows', icon: 'windows' },
  moveout: { id: 'end-of-tenancy', calculator: 'end', icon: 'endOfTenancy' },
  regular: { id: 'daily-cleaning', calculator: 'regular', icon: 'regular' },
  deep: { id: 'deep-cleaning', calculator: 'deep', icon: 'deep' },
  construction: {id:'post-construction',calculator:'construction',icon:'construction'},
  moving: { id: 'moving-furniture', calculator: 'moving', icon: 'moving' },
} as const;
const ART: Record<string, string> = {
  zuerich: '/home-approved/assets/service-windows-v5.webp',
  schaffhausen: '/home-approved/assets/service-end-v5.webp',
  winterthur: '/home-approved/assets/service-regular-v5.webp',
};

function RegionSwitcher({ language, current }: { language: string; current?: string }) {
  return <nav className="regional-switcher" aria-label={getRegionalHubCopy(language).areas}>
    {getRegionalPages(language).map(page => <a key={page.id} href={localHref(page.slug, language)} aria-current={current === page.id ? 'page' : undefined}>{page.city}</a>)}
  </nav>;
}

function Contact({ language }: { language: string }) {
  const copy = getRegionalHubCopy(language);
  return <section className="local-seo-contact" aria-labelledby="regional-contact-title">
    <div><p className="local-seo-eyebrow">Kraken PFM</p><h2 id="regional-contact-title">{copy.contactTitle}</h2><p>{copy.hours}</p><p>{copy.appointment}</p><a href={localHref('/kontakt', language)}>{copy.contact}</a></div>
    <address>Seewadelstrasse 3<br />8203 Schaffhausen<br /><a href="tel:+41774505705">+41 77 450 57 05</a><br /><a href="mailto:kai@krakenpfm.ch">kai@krakenpfm.ch</a></address>
  </section>;
}

function Preparation({ page, language }: { page: RegionalPage; language: string }) {
  const copy = getRegionalHubCopy(language);
  const [checked, setChecked] = useState<string[]>([]);
  return <section className="regional-planning" aria-labelledby="regional-planning-title">
    <div className="local-seo-container">
      <div className="regional-section-heading"><div><p className="local-seo-eyebrow">{page.city}</p><h2 id="regional-planning-title">{page.planning.title}</h2></div><p>{page.planning.intro}</p></div>
      <div className="regional-checklist">{page.planning.steps.map((step, index) => {
        const id = `${page.id}-preparation-${index}`;
        return <div className="regional-check-item" key={id}>
          <label htmlFor={id}><input id={id} type="checkbox" checked={checked.includes(id)} onChange={event => setChecked(items => event.target.checked ? [...items, id] : items.filter(item => item !== id))} /><span>{step.title}</span></label>
          <p>{step.body}</p>
          {step.sourceIds?.map(sourceId => {
            const resource = page.localResources.find(item => item.sourceId === sourceId);
            return resource ? <a className="regional-source-inline" href={resource.url} key={sourceId}>{resource.label}</a> : null;
          })}
        </div>;
      })}</div>
      <div className="regional-check-progress"><label htmlFor="regional-progress">{copy.planningLabel}</label><progress id="regional-progress" max={page.planning.steps.length} value={checked.length} /><output aria-live="polite">{checked.length}/{page.planning.steps.length} {copy.progress}</output></div>
      <p className="regional-check-note">{copy.checklistNote}</p>
    </div>
  </section>;
}

const RegionArticle: React.FC<{ page: RegionalPage; language: string }> = ({ page, language }) => {
  const copy = getRegionalHubCopy(language);
  const href = (path: string) => localHref(path, language);
  const cityRouteId = page.id === 'zuerich' ? 'zurich' : page.id;
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const openFragment = (fragment: string) => {
      const target = [...element.querySelectorAll<HTMLDetailsElement>('details.regional-service')].find(detail => detail.id === fragment);
      if (target) target.open = true;
    };
    const onHashChange = () => openFragment(window.location.hash.slice(1));
    const onClick = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !(event.target instanceof Element)) return;
      const anchor = event.target.closest<HTMLAnchorElement>('a[href^="#"]');
      if (anchor && element.contains(anchor)) openFragment(anchor.getAttribute('href')!.slice(1));
    };
    onHashChange();
    element.addEventListener('click', onClick);
    window.addEventListener('hashchange', onHashChange);
    return () => {
      element.removeEventListener('click', onClick);
      window.removeEventListener('hashchange', onHashChange);
    };
  }, [page.id]);
  return <main ref={root} id="main" className="local-seo local-regional" data-local-page="region">
    <section className="local-seo-hero" aria-labelledby="local-page-title"><div className="local-seo-container">
      <nav className="local-seo-breadcrumb" aria-label={copy.breadcrumb}><a href={href('/')}>{copy.home}</a><span aria-hidden="true">/</span><a href={href('/einsatzgebiete')}>{copy.areas}</a><span aria-hidden="true">/</span><span aria-current="page">{page.city}</span></nav>
      <RegionSwitcher language={language} current={page.id} />
      <div className="local-seo-hero-grid"><div><p className="local-seo-eyebrow">{page.eyebrow}</p><h1 id="local-page-title">{page.h1}</h1><p className="local-seo-lead">{page.intro[0]}</p><div className="local-seo-actions"><a className="local-seo-button" href={href('/quote')}>{calculatorCta(language)}</a><a className="local-seo-text-link" href="#local-services">{copy.discover}</a></div></div><figure className="regional-art"><img className="local-seo-hero-image" {...responsiveImage(ART[page.id],'(max-width:760px) 100vw, 50vw')} alt={copy.art} width="1254" height="1254" fetchPriority="high" /><figcaption>{page.city}<span>{copy.prep}</span></figcaption></figure></div>
      <ul className="regional-facts">{page.heroFacts.map(fact => <li key={fact}>{fact}</li>)}</ul>
    </div></section>
    <div className="local-seo-container">
      <div className="regional-intro"><p>{page.intro[1]}</p><p className="regional-scope">{copy.scope}</p></div>
      <section id="local-services" className="local-seo-section" aria-labelledby="local-services-title">
        <div className="regional-section-heading"><h2 id="local-services-title">{page.servicesTitle}</h2><p>{page.servicesIntro}</p></div>
        <nav className="local-seo-service-nav" aria-label={copy.discover}>{page.services.map(service => <a key={service.id} href={'#' + SERVICE_CONFIG[service.id as keyof typeof SERVICE_CONFIG].id}>{service.title}</a>)}</nav>
        <div className="regional-service-list">{page.services.map((service, index) => {
          const config = SERVICE_CONFIG[service.id as keyof typeof SERVICE_CONFIG];
          return <details className="regional-service" id={config.id} key={service.id} open={index === 0}>
            <summary><KrakenServiceIcon name={config.icon} size={46} /><h3>{service.title}</h3><span className="regional-plus" aria-hidden="true">+</span></summary>
            <div className="regional-service-body"><p>{service.body}{service.id==='moveout' && <>{' '}{publicPolicyContent(normalizeHomeLanguage(language)).guaranteeScope}{' '}<a href={href('/terms#agb-9')}>{servicesText(language,'AGB ansehen')}</a></>}</p><div className="regional-service-actions"><a className="local-seo-button" href={href(`/quote?service=${config.calculator}`)}>{calculatorCta(language,config.calculator)}</a><a className="local-seo-text-link" href={href(service.id==='construction'?'/leistungen#baureinigung':`/services/${cityRouteId}/${config.id}`)}>{copy.details}</a></div></div>
          </details>;
        })}</div>
      </section>
    </div>
    <Preparation page={page} language={language} />
    <div className="local-seo-container local-seo-body">
      <section className="local-seo-section" aria-labelledby="regional-why-title"><div className="regional-section-heading"><h2 id="regional-why-title">{page.why.title}</h2><p>{page.why.body}</p></div><div className="regional-reasons">{page.why.points.map(point => <article key={point.title}><h3>{point.title}</h3><p>{point.body}</p></article>)}</div></section>
      <section className="local-seo-section" aria-labelledby="regional-resources-title"><h2 id="regional-resources-title">{page.localResourcesTitle}</h2><div className="regional-resources">{page.localResources.map(resource => <article key={resource.sourceId}><p className="local-seo-eyebrow">{page.city}</p><h3><a href={resource.url}>{resource.label}</a></h3><p>{resource.description}</p><span>{copy.source}</span></article>)}</div><p className="regional-source-note">{copy.sourceNote}</p></section>
      <section className="local-seo-section" aria-labelledby="local-faq-title"><h2 id="local-faq-title">{page.faqTitle}</h2><div className="local-seo-faqs">{page.faqs.map(faq => <details key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}{getKaiFaqs(language,['payment','cancellation','guarantee','preparation']).map(faq=><details key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}{' '}<a href={href(`/terms#agb-${faq.termsSection}`)}>{servicesText(language,'AGB ansehen')}</a></p></details>)}</div></section>
      <section className="regional-closing" aria-labelledby="regional-closing-title"><div><h2 id="regional-closing-title">{page.closing.title}</h2><p>{page.closing.body}</p></div><a className="local-seo-button" href={href('/quote')}>{calculatorCta(language)}</a></section>
      <nav className="regional-neighbours" aria-label={copy.nearby}><div><h2>{copy.nearby}</h2><RegionSwitcher language={language} current={page.id} /></div><div className="regional-more-links"><a href={href('/einsatzgebiete')}>{copy.overview}</a><a href={href('/leistungen')}>{copy.services}</a></div></nav>
      <Contact language={language} />
    </div>
  </main>;
}

function CoverageHub({ language }: { language: string }) {
  const copy = getRegionalHubCopy(language);
  const pages = getRegionalPages(language);
  const href = (path: string) => localHref(path, language);
  return <main id="main" className="local-seo local-regional" data-local-page="coverage">
    <section className="local-seo-hero regional-hub-hero" aria-labelledby="local-page-title"><div className="local-seo-container"><nav className="local-seo-breadcrumb" aria-label={copy.breadcrumb}><a href={href('/')}>{copy.home}</a><span aria-hidden="true">/</span><span aria-current="page">{copy.areas}</span></nav><p className="local-seo-eyebrow">{copy.hubEyebrow}</p><h1 id="local-page-title">{copy.h1}</h1><p className="local-seo-lead">{copy.hubIntro}</p><div className="local-seo-actions"><a className="local-seo-button" href={href('/quote')}>{calculatorCta(language)}</a><a className="local-seo-text-link" href={href('/leistungen')}>{copy.services}</a></div></div></section>
    <div className="local-seo-container local-seo-body"><section className="local-seo-section" aria-label={copy.areas}><div className="regional-hub-grid">{pages.map((page, index) => <article key={page.id}><a className="regional-hub-image" href={href(page.slug)} aria-label={`${copy.cityCta}: ${page.city}`}><img {...responsiveImage(ART[page.id],'(max-width:760px) 100vw, 50vw')} alt="" width="1254" height="1254" loading="lazy" /></a><div className="regional-hub-copy"><p className="local-seo-eyebrow">{page.eyebrow}</p><h2><a href={href(page.slug)}>{page.city}</a></h2><p>{copy.citySummaries[index]}</p><a className="local-seo-text-link" href={href(page.slug)}>{copy.cityCta}</a></div></article>)}</div></section>
    <section className="regional-closing" aria-labelledby="regional-closing-title"><div><h2 id="regional-closing-title">{copy.surroundingTitle}</h2><p>{copy.surroundingBody}</p></div><a className="local-seo-button" href={href('/quote')}>{calculatorCta(language)}</a></section>
    <section className="local-seo-section" aria-labelledby="regional-all-services"><h2 id="regional-all-services">{copy.services}</h2><p>{copy.scope}</p><div className="regional-service-directory">{pages.map(page => <div key={page.id}><h3><a href={href(page.slug)}>{page.city}</a></h3><ul>{page.services.map(service => <li key={service.id}><a href={href(service.id==='construction'?'/leistungen#baureinigung':`/services/${page.id === 'zuerich' ? 'zurich' : page.id}/${SERVICE_CONFIG[service.id as keyof typeof SERVICE_CONFIG].id}`)}>{service.title}</a></li>)}</ul></div>)}</div></section><Contact language={language} /></div>
  </main>;
}

/** Shared by prerendering and React; all article text and links exist without JavaScript. */
export function LocalRegionalContent({ route, language }: { route: Extract<LocalSeoRoute, { kind: 'region' | 'coverage' }>; language: string }) {
  if (route.kind === 'coverage') return <CoverageHub language={language} />;
  const page = getRegionalPage(route.regionId, language);
  return page ? <RegionArticle key={page.id + language} page={page} language={language} /> : null;
}
