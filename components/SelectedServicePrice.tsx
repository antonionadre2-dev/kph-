import React from 'react';
import { normalizeHomeLanguage } from './home/homeTranslations';
import { getPublicPriceOffers, type PublicPriceService } from '../src/booking/publicPricing';
import { publicPriceText } from '../src/booking/publicPricingCopy';
import { publicHref } from '../src/routing/site-paths';
import { pricingConfig } from '../src/booking/pricingConfig';
import { MovingTariffTable } from './MovingTariffTable';

/** Visible price basis for the selected service; shared calculator inputs, never copied prices. */
export function SelectedServicePrice({ service, language }: { service: PublicPriceService; language: string }) {
  const locale = normalizeHomeLanguage(language);
  const offer = getPublicPriceOffers().find(item => item.service === service);
  if (!offer) return null;
  const text = (key: Parameters<typeof publicPriceText>[1], params?: Record<string, string>) => publicPriceText(locale, key, params);
  const number = (value: number) => value.toLocaleString(locale === 'de' ? 'de-CH' : locale);
  const money = (cents: number) => new Intl.NumberFormat(locale === 'de' ? 'de-CH' : locale, { style: 'currency', currency: offer.quote.currency, currencyDisplay: 'code', minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);
  return <section className="local-seo-section local-seo-price-plan" aria-labelledby="local-service-price-title" data-public-price-service={service}>
    <h2 id="local-service-price-title">{text('title')}</h2>
    <p className="local-seo-starting-price"><strong>{offer.minimumCents === null ? text('movingPrice') : text('from', { price: money(offer.hourlyRateCents ?? offer.minimumCents) })}</strong></p>
    <p className="kr-public-price-vat">{text('vat')}</p>
    {offer.hourlyRateCents !== null && <p>{text(service === 'moving' ? 'movingHour' : 'perHour')} · {text(service === 'moving' ? 'minimumOrder' : 'perVisit', { price: money(offer.minimumCents!) })}</p>}
    <p>{text(service === 'moving' ? 'moving' : service === 'windows' ? 'windows' : service === 'deep' ? 'deep' : 'regular', { hours: number(offer.minimumHours || 0), travel: money(pricingConfig.moving.travelCents) })}</p>
    {service === 'moving' && <MovingTariffTable language={locale} />}
    <p>{text('included')}</p>
    <a className="local-seo-button" href={publicHref(`/quote?service=${service}`, locale)}>{text(service === 'moving' ? 'askMoving' : 'calculate')}</a>
  </section>;
}
