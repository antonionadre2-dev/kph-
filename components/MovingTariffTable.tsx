import React from 'react';
import { getMovingTariffs } from '../src/booking/publicPricing';
import { publicPriceText } from '../src/booking/publicPricingCopy';
import { normalizeHomeLanguage } from './home/homeTranslations';
import './public-price-guide.css';

export function MovingTariffTable({ language }: { language: string }) {
  const locale = normalizeHomeLanguage(language), tariffs = getMovingTariffs();
  const text = (key: Parameters<typeof publicPriceText>[1], params?: Record<string, string>) => publicPriceText(locale, key, params);
  const number = (value: number) => value.toLocaleString(locale === 'de' ? 'de-CH' : locale);
  const money = (cents: number) => new Intl.NumberFormat(locale === 'de' ? 'de-CH' : locale, { style: 'currency', currency: 'CHF', currencyDisplay: 'code', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(cents / 100);
  const extras = [
    ['extraHelper', tariffs.additionalHelperRateCents], ['travel', tariffs.travelCents], ['stairs', tariffs.extras.floorPerAddressCents],
    ['wardrobe', tariffs.extras.largeWardrobeCents], ['disposal', tariffs.extras.disposalPerM3Cents], ['boxes', tariffs.extras.boxCents],
  ] as const;
  return <div className="kr-moving-tariffs" data-moving-tariffs="config">
    <h3>{text('movingTariffs')}</h3>
    <div className="kr-tariff-scroll"><table><caption>{text('hourlyTitle')} · {text('vat')}</caption><thead><tr><th scope="col">{text('team')}</th><th scope="col">{text('rate')}</th><th scope="col">{text('minimum')}</th></tr></thead><tbody>
      {tariffs.hourly.map(row => <tr key={row.team}><th scope="row">{text(row.team === 1 ? 'oneMover' : 'twoMovers')}</th><td>{money(row.hourlyRateCents)}/h</td><td>{text('hours', { hours: number(row.minimumHours) })}<br />{text('minimumOrder', { price: money(row.quote.totalCents!) })}</td></tr>)}
    </tbody></table></div>
    <p>{text('hourlyRules', { travel: money(tariffs.travelCents), minutes: number(tariffs.billingMinutes) })}</p>
    <div className="kr-tariff-scroll"><table><caption>{text('fixedTitle')} · {text('vat')}</caption><thead><tr><th scope="col">{text('scope')}</th><th scope="col">{text('price')}</th></tr></thead><tbody>
      {tariffs.fixed.map((row, index) => {
        const rooms = text('roomBand', { min: number(Math.floor(row.rooms)), max: number(row.rooms) });
        return <tr key={row.rooms} data-price-type={row.priceType}><th scope="row">{index === 0 ? text('studio', { rooms }) : rooms}</th><td>{row.priceType === 'from' ? text('from', { price: money(row.priceCents) }) : money(row.quote.totalCents!)}{row.priceType === 'from' && <><br /><span>{text('reviewFixed')}</span></>}</td></tr>;
      })}
    </tbody></table></div>
    <p>{text('fixedRules', { distance: number(tariffs.maxDistanceKm) })}</p><p>{text('personalRules', { distance: number(tariffs.maxDistanceKm), rooms: number(tariffs.fixed.at(-1)!.rooms + .5) })}</p>
    <div className="kr-tariff-scroll"><table><caption>{text('extrasTitle')} · {text('vat')}</caption><tbody>{extras.map(([key, amount]) => <tr key={key}><th scope="row">{text(key, { floor: number(tariffs.extras.includedFloor) })}</th><td>{money(amount)}</td></tr>)}</tbody></table></div>
    <h4>{text('comboTitle')}</h4><p>{text('combo', { small: money(tariffs.combo[0].discountCents), large: money(tariffs.combo[1].discountCents), smallRooms: number(tariffs.combo[0].rooms), largeMin: number(Math.floor(tariffs.combo[1].rooms)), largeRooms: number(tariffs.combo[1].rooms) })}</p>
  </div>;
}
