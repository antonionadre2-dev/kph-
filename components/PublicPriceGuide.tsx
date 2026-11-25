import React from 'react';
import { homeText, normalizeHomeLanguage } from './home/homeTranslations';
import { getPublicPriceOffers, type PublicPriceOffer } from '../src/booking/publicPricing';
import { publicPriceText } from '../src/booking/publicPricingCopy';
import './public-price-guide.css';

export default function PublicPriceGuide({ language, id = 'public-prices' }: { language: string; id?: string }) {
  const locale = normalizeHomeLanguage(language);
  const text = (key: Parameters<typeof publicPriceText>[1], params?: Record<string, string>) => publicPriceText(locale, key, params);
  const number = (value: number) => new Intl.NumberFormat(locale === 'de' ? 'de-CH' : locale, { maximumFractionDigits: 2 }).format(value);
  const money = (cents: number, currency: string) => new Intl.NumberFormat(locale === 'de' ? 'de-CH' : locale, { style: 'currency', currency, currencyDisplay: 'code', minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);
  const description = (offer: PublicPriceOffer) => {
    if (offer.service === 'end' && offer.selection.service === 'endOfTenancy' && offer.quote.appliedTier) {
      return text('apartment', { rooms: number(offer.quote.appliedTier.rooms), area: number(offer.quote.appliedTier.maxAreaM2), bathrooms: number(offer.selection.bathrooms) });
    }
    if (offer.service === 'regular' || offer.service === 'deep') return text(offer.service, { hours: number(offer.minimumHours!) });
    return text(offer.service === 'moving' ? 'moving' : 'windows');
  };
  return <section className="kr-public-prices" aria-labelledby={`${id}-title`}>
    <div className="kr-public-prices-heading"><h2 id={`${id}-title`}>{text('title')}</h2><p>{text('intro')}</p></div>
    <div className="kr-public-price-grid">
      {getPublicPriceOffers().map(offer => <article className="kr-public-price-card" key={offer.service} data-public-price-service={offer.service}>
        <h3>{homeText(locale, offer.title)}</h3>
        <p className="kr-public-price-amount">{offer.minimumCents === null ? text('movingPrice') : text('from', { price: money(offer.hourlyRateCents ?? offer.minimumCents, offer.quote.currency) })}</p>
        {offer.hourlyRateCents !== null && <p className="kr-public-price-unit">{text('perHour')}<br />{text('perVisit', { price: money(offer.minimumCents!, offer.quote.currency) })}</p>}
        <p className="kr-public-price-condition">{description(offer)}</p>
        <a href={`/quote?lang=${encodeURIComponent(locale)}&service=${offer.service}`}>{text(offer.service === 'moving' ? 'askMoving' : 'calculate')}</a>
      </article>)}
    </div>
    <p className="kr-public-price-included">{text('included')}</p>
  </section>;
}
