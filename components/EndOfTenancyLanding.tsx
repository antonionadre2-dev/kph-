import { publicPriceText } from '../src/booking/publicPricingCopy';
import React from 'react';
import KrakenServiceIcon from './KrakenServiceIcon';
import CustomerReviews from './home/CustomerReviews';
import { normalizeHomeLanguage } from './home/homeTranslations';
import { getTermsTranslation } from './legal/terms';
import { bookingText } from '../src/booking/uiCopy';
import { publicHref } from '../src/routing/site-paths';
import { endOfTenancyCityId, endOfTenancyCityName, getEndOfTenancyMetadata, getEndOfTenancyOfferRows } from '../src/seo/end-of-tenancy-metadata';
import { endOfTenancyText, getEndOfTenancyIntro } from '../src/seo/end-of-tenancy-copy';
import { getRegionalPage, getRegionalHubCopy } from '../src/seo/regional-content';
import './end-of-tenancy-landing.css';
import { responsiveImage } from '../src/media/images';
import { calculatorCta } from '../src/home/cta';

/** The same semantic article is rendered at build/server time and after navigation. */
export const EndOfTenancyLanding: React.FC<{ cityId: string; language: string }> = ({ cityId, language }) => {
  const locale = normalizeHomeLanguage(language);
  const city = endOfTenancyCityId(cityId);
  if (!city) return null;
  const metadata = getEndOfTenancyMetadata(city, locale)!;
  const region = getRegionalPage(city, locale)!;
  const intro = getEndOfTenancyIntro(city, locale);
  const name = endOfTenancyCityName(city, locale);
  const text = (key: Parameters<typeof endOfTenancyText>[1], params?: Record<string, string>) => endOfTenancyText(locale, key, params);
  const href = (path: string) => publicHref(path, locale);
  const quoteHref = href('/quote?service=end');
  const rows = getEndOfTenancyOfferRows(locale);
  const number = (value: number) => value.toLocaleString(locale === 'de' ? 'de-CH' : locale);
  const money = (cents: number) => new Intl.NumberFormat(locale === 'de' ? 'de-CH' : locale, { style: 'currency', currency: 'CHF', currencyDisplay: 'code', minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);
  const guarantee = getTermsTranslation(locale).sections.find(section => /^8\./.test(section.title));
  const planning = city === 'zuerich' ? region.planning.steps : city === 'schaffhausen' ? region.planning.steps.slice(1) : region.planning.steps.slice(2);
  const otherCities = ['zuerich', 'schaffhausen', 'winterthur'].filter(id => id !== city);
  const serviceCity = city === 'zuerich' ? 'zurich' : city;
  const extras = ['bathrooms', 'guestWcs', 'slatBlinds', 'rollerShutters', 'smallBalconies', 'largeBalconies', 'storageRooms', 'garages', 'carpetRooms', 'heavySoiling'];
  return <main id="main" className="kr-eot" lang={locale === 'de' ? 'de-CH' : locale} data-local-page="service" data-eot-city={city}>
    <section className="kr-eot-hero" aria-labelledby="eot-title"><div className="kr-eot-container">
      <nav className="kr-eot-breadcrumb" aria-label={getRegionalHubCopy(locale).breadcrumb}><a href={href('/')}>{text('home')}</a><span aria-hidden="true">/</span><a href={href('/einsatzgebiete')}>{text('areas')}</a><span aria-hidden="true">/</span><a href={href(region.slug)}>{name}</a><span aria-hidden="true">/</span><span aria-current="page">{text('title')}</span></nav>
      <div className="kr-eot-hero-grid"><div><p className="kr-eot-eyebrow">Kraken · {name}</p><h1 id="eot-title">{metadata.h1}</h1><p className="kr-eot-lead">{intro[0]}</p><div className="kr-eot-starting">{rows[0].priceCents !== null && <strong>{text('starting', { price: money(rows[0].priceCents) })}</strong>}<span>{publicPriceText(locale,'vat')}</span><span>{text('startScope')}</span></div><p className="kr-eot-guarantee-short">{text('guaranteeShort')}</p><div className="kr-eot-actions"><a className="kr-button kr-button--primary" href={quoteHref}>{calculatorCta(locale,'end')}</a><a className="kr-button kr-button--discreet" href="#eot-prices">{text('pricesTitle')}</a></div><CustomerReviews language={locale} /></div><figure><img {...responsiveImage('/home-approved/assets/service-end-v5.webp','(max-width:760px) 100vw, 50vw')} alt={text('imageAlt')} width="1254" height="1254" fetchPriority="high" /><figcaption>{text('imageCaption')}</figcaption></figure></div>
    </div></section>
    <div className="kr-eot-container"><section className="kr-eot-section kr-eot-intro"><p>{intro[1]}</p></section>
      <section id="eot-prices" className="kr-eot-section" aria-labelledby="eot-prices-title"><div className="kr-eot-heading"><h2 id="eot-prices-title">{text('pricesTitle')}</h2><p>{text('pricesIntro')}</p></div><div className="kr-eot-price-table"><table><caption className="kr-eot-sr-only">{text('pricesTitle')} · {name} · {publicPriceText(locale,'vat')}</caption><thead><tr><th scope="col">{text('rooms')}</th><th scope="col">{text('area')}</th><th scope="col">{text('price')}</th></tr></thead><tbody>{rows.map(row => <tr key={row.rooms}><th scope="row">{number(row.rooms)}</th><td>{number(row.maxAreaM2)} m²</td><td>{row.priceCents === null ? '—' : money(row.priceCents)}</td></tr>)}</tbody></table></div><p className="kr-eot-price-note">{publicPriceText(locale,'vat')}</p><p className="kr-eot-price-note">{text('priceRules')}</p><p className="kr-eot-price-note">{text('totalNote')} <a href={href('/terms')}>{text('terms')}</a></p><a className="kr-button kr-button--primary" href={quoteHref}>{calculatorCta(locale,'end')}</a></section>
      <section className="kr-eot-section" aria-labelledby="eot-included-title"><h2 id="eot-included-title">{text('includedTitle')}</h2><div className="kr-eot-benefits"><article><KrakenServiceIcon name="endOfTenancy" size={52} /><h3>{bookingText(locale, 'eotBenefitKitchenBath')}</h3></article><article><KrakenServiceIcon name="windows" size={52} /><h3>{bookingText(locale, 'eotBenefitWindowsFloors')}</h3></article><article><KrakenServiceIcon name="appointment" size={52} /><h3>{bookingText(locale, 'eotBenefitHandover')}</h3></article></div><p>{bookingText(locale, 'eotIncluded')}</p><p>{text('materials')}</p><details className="kr-eot-extras"><summary>{text('extrasTitle')}</summary><ul>{extras.map(key => <li key={key}>{bookingText(locale, key)}</li>)}</ul></details></section>
      <section className="kr-eot-section" aria-labelledby="eot-process-title"><h2 id="eot-process-title">{text('processTitle')}</h2><ol className="kr-eot-process">{[1, 2, 3, 4].map(step => <li key={step}><h3>{text(`process${step}Title` as Parameters<typeof text>[0])}</h3><p>{text(`process${step}` as Parameters<typeof text>[0])}</p></li>)}</ol></section>
    </div>
    <section className="kr-eot-guarantee" aria-labelledby="eot-guarantee-title"><div className="kr-eot-container"><h2 id="eot-guarantee-title">{text('guaranteeTitle')}</h2><p>{text('guaranteeIntro')}</p>{guarantee && <blockquote data-guarantee-source="terms-section-8">{guarantee.content}</blockquote>}<a href={href('/terms')}>{text('terms')}</a></div></section>
    <div className="kr-eot-container">
      <section className="kr-eot-section" aria-labelledby="eot-local-title"><h2 id="eot-local-title">{text('localTitle')} · {name}</h2><div className="kr-eot-local-plan">{planning.map(step => <article key={step.title}><h3>{step.title}</h3><p>{step.body}</p></article>)}</div></section>
      <section className="kr-eot-section" aria-labelledby="eot-zones-title"><h2 id="eot-zones-title">{text('zonesTitle')}</h2><p>{text(city === 'zuerich' ? 'zonesZurich' : 'zonesOther')}</p>{city === 'zuerich' && <><ul className="kr-eot-districts" aria-label="Zürich">{Array.from({ length: 12 }, (_, index) => <li key={index}>{text('district')} {index + 1}</li>)}</ul><a href="https://www.stadt-zuerich.ch/kreise-und-quartiere">{text('districts')}</a></>}<h3 className="kr-eot-resource-heading">{text('resources')}</h3><div className="kr-eot-resources">{region.localResources.map(resource => <article key={resource.sourceId}><h4><a href={resource.url}>{resource.label}</a></h4><p>{resource.description}</p></article>)}</div></section>
      <section className="kr-eot-section" aria-labelledby="eot-faq-title"><h2 id="eot-faq-title">{text('faq')}</h2><div className="kr-eot-faqs">{metadata.faqs.map(faq => <details key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}</div></section>
      <section className="kr-eot-closing" aria-labelledby="eot-contact-title"><div><h2 id="eot-contact-title">{text('contact')}</h2><p>{text('hours')}</p><address>Seewadelstrasse 3<br />8203 Schaffhausen<br /><a href="tel:+41774505705">+41 77 450 57 05</a><br /><a href="mailto:kai@krakenpfm.ch">kai@krakenpfm.ch</a></address></div><a className="kr-button kr-button--primary" href={quoteHref}>{calculatorCta(locale,'end')}</a></section>
      <nav className="kr-eot-section kr-eot-related" aria-label={text('related')}><div><h2>{text('related')}</h2><ul>{otherCities.map(id => <li key={id}><a href={href(`/umzugsreinigung/${id}`)}>{text('title')} · {endOfTenancyCityName(id, locale)}</a></li>)}<li><a href={href(region.slug)}>{text('areas')} · {name}</a></li></ul></div><div><h2>{text('otherServices')}</h2><ul>{region.services.filter(service => service.id !== 'moveout').map(service => <li key={service.id}><a href={href(`/services/${serviceCity}/${({ windows: 'window-cleaning', regular: 'daily-cleaning', deep: 'deep-cleaning', moving: 'moving-furniture' })[service.id]}`)}>{service.title}</a></li>)}</ul></div></nav>
    </div>
  </main>;
};
export default EndOfTenancyLanding;
