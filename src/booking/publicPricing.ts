import { calculatePrice, defaultSelection, END_OF_TENANCY_TIERS, type BookingSelection, type PriceQuote } from './pricing.ts';
import { pricingConfig } from './pricingConfig.ts';

export type PublicPriceService = 'regular' | 'windows' | 'end' | 'deep' | 'moving';
export interface PublicPriceOffer {
  service: PublicPriceService;
  title: string;
  selection: BookingSelection;
  quote: PriceQuote;
  minimumCents: number | null;
  hourlyRateCents: number | null;
  minimumHours: number | null;
}

/** Same selections and engine as the calculator; no independent marketing tariff. */
export function getPublicPriceOffers(): PublicPriceOffer[] {
  const smallestApartment = END_OF_TENANCY_TIERS[0];
  const selections: { service: PublicPriceService; title: string; selection: BookingSelection }[] = [
    { service: 'regular', title: 'Regelmässige Reinigung', selection: defaultSelection('regular') },
    { service: 'windows', title: 'Fensterreinigung', selection: defaultSelection('windows') },
    { service: 'end', title: 'Umzugsreinigung', selection: { ...defaultSelection('endOfTenancy'), rooms: smallestApartment.rooms, areaM2: smallestApartment.maxAreaM2 } },
    { service: 'deep', title: 'Grundreinigung', selection: { ...defaultSelection('regular'), frequency: 'once', cleaningKind: 'deep', hours: pricingConfig.regular.deep.minimumHours } },
    { service: 'moving', title: 'Kleine Umzüge', selection: { ...defaultSelection('moving'), mode: 'hourly', team: 1, estimatedHours: pricingConfig.moving.hourly.teams[1].minimumHours } },
  ];
  return selections.map(item => {
    const quote = calculatePrice(item.selection);
    return {
      ...item, quote, minimumCents: quote.totalCents,
      hourlyRateCents: item.selection.service === 'moving' ? pricingConfig.moving.hourly.teams[1].hourlyRateCents : quote.lines.find(line => line.id === 'regular-labour')?.unitPriceCents ?? null,
      minimumHours: item.selection.service === 'regular' ? item.selection.hours : item.selection.service === 'moving' ? pricingConfig.moving.hourly.teams[1].minimumHours : null,
    };
  });
}

/** Public rows use the same immutable configuration and executable selections as checkout. */
export function getMovingTariffs() {
  const config = pricingConfig.moving;
  return {
    hourly: ([1, 2] as const).map(team => {
      const tariff = config.hourly.teams[team];
      const selection = { ...defaultSelection('moving'), mode: 'hourly' as const, team, estimatedHours: tariff.minimumHours };
      return { team, ...tariff, selection, quote: calculatePrice(selection) };
    }),
    fixed: config.fixed.tiers.map(tier => {
      const selection = { ...defaultSelection('moving'), mode: 'fixed' as const, rooms: tier.rooms, distanceKm: config.fixed.maxDistanceKm };
      return { ...tier, selection, quote: calculatePrice(selection) };
    }),
    travelCents: config.travelCents,
    billingMinutes: config.hourly.billingMinutes,
    maxDistanceKm: config.fixed.maxDistanceKm,
    additionalHelperRateCents: config.hourly.additionalHelperRateCents,
    extras: config.extras,
    combo: config.combo,
  };
}
