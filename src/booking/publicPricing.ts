import { calculatePrice, defaultSelection, END_OF_TENANCY_TIERS, REGULAR_MINIMUM_HOURS, type BookingSelection, type PriceQuote } from './pricing.ts';

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
    { service: 'deep', title: 'Grundreinigung', selection: { ...defaultSelection('regular'), frequency: 'once', hours: REGULAR_MINIMUM_HOURS.once } },
    { service: 'moving', title: 'Kleine Umzüge', selection: defaultSelection('moving') },
  ];
  return selections.map(item => {
    const quote = calculatePrice(item.selection);
    return {
      ...item, quote, minimumCents: quote.totalCents,
      hourlyRateCents: quote.lines.find(line => line.id === 'regular-labour')?.unitPriceCents ?? null,
      minimumHours: item.selection.service === 'regular' ? item.selection.hours : null,
    };
  });
}
