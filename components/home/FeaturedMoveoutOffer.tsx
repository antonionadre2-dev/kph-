import React from 'react';
import { getPublicPriceOffers } from '../../src/booking/publicPricing';
import { publicPriceText } from '../../src/booking/publicPricingCopy';
import { normalizeHomeLanguage } from './homeTranslations';

/** The advertised package is calculated from the same selection and engine as the quote. */
export default function FeaturedMoveoutOffer({ language }: { language: string }) {
  const locale = normalizeHomeLanguage(language);
  const offer = getPublicPriceOffers().find(item => item.service === 'end');
  if (!offer?.quote.appliedTier || offer.minimumCents === null || offer.selection.service !== 'endOfTenancy') return null;
  const money = new Intl.NumberFormat(locale === 'de' ? 'de-CH' : locale, {
    style: 'currency', currency: offer.quote.currency, currencyDisplay: 'code',
    minimumFractionDigits: offer.minimumCents % 100 ? 2 : 0,
    maximumFractionDigits: offer.minimumCents % 100 ? 2 : 0,
  }).format(offer.minimumCents / 100);
  const number = (value: number) => new Intl.NumberFormat(locale === 'de' ? 'de-CH' : locale).format(value);
  return <div className="hero-price" data-featured-price-service="end">
    <p className="hero-price-amount">{publicPriceText(locale, 'from', { price: money })}</p>
    <p className="hero-price-condition">{publicPriceText(locale, 'apartment', {
      rooms: number(offer.quote.appliedTier.rooms), area: number(offer.quote.appliedTier.maxAreaM2), bathrooms: number(offer.selection.bathrooms),
    })}</p>
  </div>;
}
