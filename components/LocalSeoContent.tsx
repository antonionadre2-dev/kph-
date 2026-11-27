import "../src/styles/route-utilities.css";
import React from 'react';
import {servicesText} from './services/servicesTranslations';
import {
  getLocalRoutePlace, getLocalSeoDescriptor, getLocalService, LOCAL_ADDRESS_CONFIRMATION,
  LOCAL_CITIES, LOCAL_SCOPE, LOCAL_SERVICES, localHref, type LocalSeoRoute,
} from '../src/seo/local-content';
import { getServicePageFaqs } from '../src/seo/page-faqs';
import { localText } from '../src/seo/local-translations';
import { LocalRegionalContent } from './LocalRegionalContent';
import { EndOfTenancyLanding } from './EndOfTenancyLanding';
import { SelectedServicePrice } from './SelectedServicePrice';
import { calculatorCta } from '../src/home/cta';
import './local-seo.css';

interface LocalSeoContentProps {
  route: LocalSeoRoute;
  language: string;
}

function routePath(route: LocalSeoRoute): string {
  if (route.kind === 'coverage') return '/einsatzgebiete';
  if (route.kind === 'service') return `/services/${route.cityId}/${route.serviceId}`;
  if (route.kind === 'municipality') return `/reinigung/${route.municipalitySlug}`;
  return LOCAL_CITIES.find(city => city.regionId === route.regionId)?.regionPath || '/einsatzgebiete';
}

/** Pure content: the server renderer and interactive routes use this same component. */
export function LocalSeoContent({ route, language }: LocalSeoContentProps) {
  if (route.kind === 'region' || route.kind === 'coverage') return <LocalRegionalContent route={route} language={language} />;
  if (route.kind === 'service' && route.serviceId === 'end-of-tenancy' && ['zurich', 'zuerich', 'schaffhausen', 'winterthur'].includes(route.cityId)) return <EndOfTenancyLanding cityId={route.cityId} language={language} />;
  return <LegacyLocalSeoContent route={route} language={language} />;
}

function LegacyLocalSeoContent({ route, language }: LocalSeoContentProps) {
  const t = (source: string) => localText(language, source);
  const href = (path: string) => localHref(path, language);
  const descriptor = getLocalSeoDescriptor(routePath(route), language)!;
  const { city, name } = getLocalRoutePlace(route);
  const service = route.kind === 'service' ? getLocalService(route.serviceId) : undefined;
  const isConfirmedService = route.kind === 'service' && !!city && !!service;
  const isAddressRequest = route.kind === 'municipality' || (route.kind === 'service' && !isConfirmedService);
  const quotePath = service ? `/quote?service=${service.calculatorService}` : '/quote';
  const shownServices = isConfirmedService ? [service] : LOCAL_SERVICES;
  const imageService = isConfirmedService ? service.calculatorService : '';
  const imagePath = imageService ? `/home-approved/assets/service-${imageService === 'windows' ? 'windows' : imageService}-${imageService === 'moving' ? 'v6' : 'v5'}.webp` : '/home-approved/assets/services-hero-v5.webp';
  const planningText = city?.id === 'schaffhausen'
    ? 'Unser Ausgangspunkt ist die Seewadelstrasse 3, 8203 Schaffhausen. Bitte nennen Sie trotzdem die genaue Einsatzadresse und den Zugang zur Wohnung; der Firmenstandort ersetzt diese Angaben nicht.'
    : city?.id === 'zurich'
      ? 'Für die Planung in Zürich benötigen wir die vollständige Adresse, das Stockwerk und Angaben zu Lift und Parkmöglichkeiten. Bei einem kleinen Umzug bitte auch die Zieladresse und die Zugänge dort angeben.'
      : city?.id === 'winterthur'
        ? 'Für einen Auftrag in Winterthur helfen uns genaue Angaben zu Räumen und Zugängen. Beim Umzug nennen Sie Start und Ziel, Möbelmasse, Stockwerke und Lift; bei Reinigung die betroffenen Räume und Ihren gewünschten Schwerpunkt.'
        : 'Der Einsatz wird für Ihre konkrete Adresse abgestimmt. Für Orte ausserhalb der drei genannten Städte fragen Sie bitte mit vollständiger Adresse und gewünschtem Termin an.';
  const faqs = getServicePageFaqs(service?.calculatorService, language);

  return (
    <main id="main" className="local-seo" data-local-page={route.kind}>
      <section className="local-seo-hero" aria-labelledby="local-page-title">
        <div className="local-seo-container">
          <nav className="local-seo-breadcrumb" aria-label={t('Brotkrumennavigation')}>
            <a href={href('/')}>{t('Startseite')}</a><span aria-hidden="true">/</span>
            {route.kind !== 'coverage' && <><a href={href('/einsatzgebiete')}>{t('Einsatzgebiete')}</a><span aria-hidden="true">/</span></>}
            {isConfirmedService && <><a href={href(city.regionPath)}>{name}</a><span aria-hidden="true">/</span></>}
            <span aria-current="page">{isConfirmedService ? t(service.title) : route.kind === 'coverage' ? t('Einsatzgebiete') : name}</span>
          </nav>
          <div className="local-seo-hero-grid">
            <div>
              <p className="local-seo-eyebrow">{t('Leistungen für Privathaushalte')}</p>
              <h1 id="local-page-title">{descriptor.h1}</h1>
              <p className="local-seo-lead">{t(LOCAL_SCOPE)}</p>
              {isAddressRequest && <p className="local-seo-address-note">{t(LOCAL_ADDRESS_CONFIRMATION)}</p>}
              {route.kind === 'service' && !service && <p>{t('Für andere Aufgaben besprechen wir zuerst, ob sie zu unserem Angebot für Privathaushalte passen. Die fünf aktuellen Leistungen finden Sie hier.')}</p>}
              <div className="local-seo-actions">
                <a className="local-seo-button" href={href(quotePath)}>{calculatorCta(language,service?.calculatorService)}</a>
                <a className="local-seo-text-link" href="#local-services">{t('Leistungen für Ihr Zuhause')} <span aria-hidden="true">↓</span></a>
              </div>
            </div>
            <img className="local-seo-hero-image" src={imagePath} alt={isConfirmedService ? `${t(service.title)} · ${name} · Kraken` : ''} aria-hidden={isConfirmedService ? undefined : true} width="1254" height="1254" fetchPriority="high" />
          </div>
        </div>
      </section>

      <div className="local-seo-container local-seo-body">
        {route.kind === 'coverage' && <section className="local-seo-section" aria-labelledby="local-areas-title">
          <h2 id="local-areas-title">{t('Einsatzgebiete')}</h2>
          <p>{t('Wählen Sie eine Stadt und erfahren Sie, welche Angaben wir für Reinigung oder einen kleinen Umzug benötigen. Die genaue Adresse und der gewünschte Termin werden bei der Anfrage geprüft.')}</p>
          <div className="local-seo-city-grid">
            {LOCAL_CITIES.map(item => <article className="local-seo-card" key={item.id}>
              <h3><a href={href(item.regionPath)}>{item.name}</a></h3>
              <ul className="local-seo-city-services">{LOCAL_SERVICES.map(itemService => <li key={itemService.id}><a href={href(`/services/${item.id}/${itemService.id}`)}>{t(itemService.title)}</a></li>)}</ul>
            </article>)}
            {!isConfirmedService && <article id="local-construction" className="local-seo-service"><h3>{servicesText(language,'Baureinigung')}</h3><p>{servicesText(language,'Nach Bau- oder Renovationsarbeiten reinigen wir die vereinbarten Bereiche. Beschreiben Sie Fläche, Bauzustand und Rückstände; den Leistungsumfang bestätigt Antonio schriftlich.')}</p><a className="local-seo-text-link" href={href('/leistungen#baureinigung')}>{t('Leistungsdetails ansehen')}</a></article>}
          </div>
        </section>}

        {route.kind !== 'coverage' && <section className="local-seo-section local-seo-planning" aria-labelledby="local-planning-title">
          <div><p className="local-seo-eyebrow">{name}</p><h2 id="local-planning-title">{t('Gut vorbereitet vor Ort')}</h2></div>
          <div><p>{t(planningText)}</p><p>{t('Bitte halten Sie die zu reinigenden Bereiche zugänglich und nennen Sie empfindliche Oberflächen oder besondere Verschmutzungen vorab. Den vereinbarten Umfang klären wir anhand Ihrer Angaben.')}</p></div>
        </section>}

        <section id="local-services" className="local-seo-section" aria-labelledby="local-services-title">
          <h2 id="local-services-title">{isConfirmedService ? t('Leistungsdetails ansehen') : t('Leistungen für Ihr Zuhause')}</h2>
          {!isConfirmedService && <nav className="local-seo-service-nav" aria-label={t('Leistung entdecken')}>
            {LOCAL_SERVICES.map(item => <a key={item.id} href={'#' + item.id}>{t(item.title)}</a>)}<a href="#local-construction">{servicesText(language,'Baureinigung')}</a>
          </nav>}
          <div className="local-seo-service-list">
            {shownServices.map(item => <article id={item.id} className="local-seo-service" key={item.id}>
              <h3>{t(item.title)}</h3>
              <p>{t(item.description)}</p>
              <div className="local-seo-preparation"><h4>{t('Welche Angaben braucht meine Anfrage?')}</h4><p>{t(item.preparation)}</p></div>
              {item.calculatorService === 'moving' && <details className="local-seo-cargo"><summary>{t('So viel Platz hat der Laderaum.')}</summary><p>{t(getServicePageFaqs('moving', language)[0].answer)}</p></details>}
              <a className="local-seo-text-link" href={href(isConfirmedService ? `/quote?service=${item.calculatorService}` : city ? `/services/${city.id}/${item.id}` : `/leistungen#${item.anchor}`)}>
                {isConfirmedService ? calculatorCta(language,item.calculatorService) : t('Leistungsdetails ansehen')} <span aria-hidden="true">→</span>
              </a>
            </article>)}
          </div>
        </section>

        {isConfirmedService && <SelectedServicePrice service={service.calculatorService as 'regular' | 'windows' | 'end' | 'deep' | 'moving'} language={language} />}

        <section className="local-seo-section local-seo-price-plan" aria-labelledby="local-price-plan-title">
          <h2 id="local-price-plan-title">{t('Umfang, Preis und Termin planen')}</h2>
          <p>{t('Preise und die Angaben zu Ihrem Auftrag finden Sie im Rechner. Der Aufwand hängt von Umfang, Zustand, Zugängen und beim Umzug auch von Strecke und Umzugsgut ab.')}</p>
          <p>{t('Eine Anfrage ist noch keine Terminbestätigung. Besondere Anforderungen besprechen wir vor dem Auftrag.')}</p>
          <a className="local-seo-button" href={href(quotePath)}>{calculatorCta(language,service?.calculatorService)}</a>
        </section>

        <section className="local-seo-section" aria-labelledby="local-faq-title">
          <h2 id="local-faq-title">{t('Fragen zur Planung vor Ort')}</h2>
          <div className="local-seo-faqs">{faqs.map(faq => <details key={faq.question}>
            <summary>{t(faq.question)}</summary><p>{t(faq.answer)}{faq.termsSection && <>{' '}<a href={href(`/terms#agb-${faq.termsSection}`)}>{servicesText(language,'AGB ansehen')}</a></>}</p>
          </details>)}</div>
        </section>

        <nav className="local-seo-section local-seo-related" aria-label={t('Weitere Einsatzgebiete')}>
          {isConfirmedService && <div><h2>{t('Weitere Leistungen')}</h2><ul>{LOCAL_SERVICES.filter(item => item.id !== service.id).map(item => <li key={item.id}><a href={href(`/services/${city.id}/${item.id}`)}>{t(item.title)} · {name}</a></li>)}</ul></div>}
          <div><h2>{t('Weitere Einsatzgebiete')}</h2><ul>
            {LOCAL_CITIES.filter(item => item.id !== city?.id).map(item => <li key={item.id}><a href={href(isConfirmedService ? `/services/${item.id}/${service.id}` : item.regionPath)}>{isConfirmedService ? `${t(service.title)} · ` : ''}{item.name}</a></li>)}
            {city && route.kind !== 'region' && <li><a href={href(city.regionPath)}>{t('Region')} · {city.name}</a></li>}
            <li><a href={href('/einsatzgebiete')}>{t('Einsatzgebiete')}</a></li>
            <li><a href={href('/leistungen')}>{t('Unsere Leistungen im Detail')}</a></li>
          </ul></div>
        </nav>

        <section className="local-seo-contact" aria-labelledby="local-contact-title">
          <div><p className="local-seo-eyebrow">Kraken PFM</p><h2 id="local-contact-title">{t('Persönlich erreichbar')}</h2><p>{t('Montag–Sonntag, 09:00–19:00 Uhr (Europe/Zurich)')}</p><a href={href('/kontakt')}>{t('Kontakt und Adresse')} <span aria-hidden="true">→</span></a></div>
          <address>Seewadelstrasse 3<br />8203 Schaffhausen<br /><a href="tel:+41774505705">+41 77 450 57 05</a><br /><a href="mailto:kai@krakenpfm.ch">kai@krakenpfm.ch</a></address>
        </section>
      </div>
    </main>
  );
}

export default LocalSeoContent;
