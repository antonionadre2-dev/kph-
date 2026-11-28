import { calculatePrice, getRegularMinimumHours, pricingConfig, type BookingSelection } from './pricing.ts';

export const FULL_PREPAYMENT_TERMS_VERSION = 'kraken-agb-2026-11-28-v3';
export const usesFullPrepayment = (record: any): boolean => record?.termsVersion === FULL_PREPAYMENT_TERMS_VERSION;
export const isMonthlySelection = (selection: any): boolean => selection?.service === 'regular' && selection.frequency !== 'once';
const validDate = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value + 'T00:00:00Z')) && new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) === value;

/** The operator supplies the real number of visits in one natural month; no four-week conversion exists. */
export function monthlyBillingPeriod(input: any, unitPriceCents: number, appointmentDate: string) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !['start', 'end', 'visits'].includes(key))
    || !validDate(input.start) || !validDate(input.end) || input.start > input.end || input.start.slice(0, 7) !== input.end.slice(0, 7)
    || appointmentDate < input.start || appointmentDate > input.end || !Number.isSafeInteger(input.visits) || input.visits < 1 || input.visits > 31
    || !Number.isSafeInteger(unitPriceCents) || unitPriceCents <= 0 || !Number.isSafeInteger(unitPriceCents * input.visits) || unitPriceCents * input.visits > 100_000_000) throw new RangeError('INVALID_BILLING_PERIOD');
  return { start: input.start, end: input.end, visits: input.visits, unitPriceCents, totalCents: unitPriceCents * input.visits };
}

export function minimumBillableHours(selection: any): number | null {
  if (selection?.service === 'regular') return getRegularMinimumHours(selection);
  if (selection?.service === 'endOfTenancy' && selection.mode === 'hourly') return pricingConfig.endOfTenancy.hourly.minimumHours;
  if (selection?.service === 'construction' && selection.mode === 'hourly') return pricingConfig.construction.hourly.minimumHours;
  if (selection?.service === 'moving' && selection.mode === 'hourly') return pricingConfig.moving.hourly.teams[selection.team === 2 ? 2 : 1].minimumHours;
  return null;
}

/** Recalculate actual work with the unchanged tariff and selected extras, bounded by the applicable minimum. */
export function settledHourlyQuote(selection: BookingSelection, actualHours: number, visits = 1) {
  const perVisitMinimum = minimumBillableHours(selection);
  const minimumHours = perVisitMinimum === null ? null : perVisitMinimum * visits;
  if (minimumHours === null || !Number.isFinite(actualHours) || actualHours < 0 || actualHours > 168 || !Number.isSafeInteger(actualHours * 4)) throw new RangeError('INVALID_ACTUAL_HOURS');
  const billedHours = Math.max(minimumHours, actualHours);
  if (visits !== 1) {
    if (selection.service !== 'regular' || !Number.isSafeInteger(visits) || visits < 1 || visits > 31) throw new RangeError('INVALID_BILLING_PERIOD');
    const minimumQuote = calculatePrice({ ...selection, hours: perVisitMinimum! });
    const rate = minimumQuote.lines.find(line => line.id === 'regular-labour')!.unitPriceCents;
    return { actualHours, billedHours, minimumHours, finalTotalCents: minimumQuote.totalCents! * visits + Math.round((billedHours - minimumHours) * rate) };
  }
  const quote = calculatePrice({ ...selection, ...(selection.service === 'moving' ? { estimatedHours: billedHours } : { hours: billedHours }) } as BookingSelection);
  if (quote.totalCents === null || quote.manualReviewReasons.length) throw new RangeError('MANUAL_REVIEW_REQUIRED');
  return { actualHours, billedHours, minimumHours, finalTotalCents: quote.totalCents };
}

/** Cancellation retains the contractual percentage of the agreed price, never more than money actually received. */
export function cancellationRefundQuote(record: any, appointmentStart: number, at: number) {
  const paidCents = Math.max(0, record.payment?.amountPaidCents || 0);
  const alreadyRefundedCents = Math.max(0, record.payment?.refundedCents || 0);
  const agreed = record.workSettlement?.finalTotalCents ?? record.payment?.totalDueCents ?? record.quote?.totalCents ?? 0;
  const hours = (appointmentStart - at) / 3_600_000;
  const refundPercent = hours >= 48 ? 100 : hours >= 12 ? 50 : 0;
  const retainedCents = Math.min(Math.max(0, paidCents - alreadyRefundedCents), Math.round(agreed * (100 - refundPercent) / 100));
  return { refundPercent, refundCents: Math.max(0, paidCents - alreadyRefundedCents - retainedCents), retainedCents, paidCents, alreadyRefundedCents, appointmentStart: new Date(appointmentStart).toISOString(), calculatedAt: new Date(at).toISOString() };
}
