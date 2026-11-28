import { bookingLanguage } from './uiCopy.ts';
/** Convert an operator-entered CHF amount without floating-point rounding. */
export function operatorAmountCents(value: string): number | null {
  const match = /^(0|[1-9]\d{0,6})(?:[.,](\d{1,2}))?$/.exec(value.trim());
  if (!match) return null;
  const cents = Number(match[1]) * 100 + Number((match[2] || '').padEnd(2, '0'));
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}

/** Refund proposals come from the server; the client never applies cancellation percentages. */
export function proposedOperatorRefund(booking: any): number {
  const settlement = booking?.workSettlement;
  const value = booking?.status === 'cancelled'
    ? booking?.cancellationQuote?.refundCents
    : settlement ? Math.min(settlement.refundDueCents, Math.max(0, (booking.payment?.amountPaidCents || 0) - (booking.payment?.refundedCents || 0) - settlement.finalTotalCents)) : 0;
  return Number.isSafeInteger(value) && value > 0 ? value : 0;
}

export function safeOperatorPaymentLink(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && /^(?:[a-z0-9-]+\.)*payrexx\.com$/i.test(url.hostname) ? url.href : null;
  } catch { return null; }
}

/** Scope text is written in the customer’s saved communication language, independently of staff UI language. */
export function operatorScopeLanguage(recordLanguage:unknown) { return bookingLanguage(typeof recordLanguage === 'string' ? recordLanguage : 'de'); }
