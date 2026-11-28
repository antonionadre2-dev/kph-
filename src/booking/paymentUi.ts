type PaymentView = {
  canCheckout?: boolean;
  scheduling: { status: string; holdExpiresAt?: string };
  payment: { status: string; model?: string; checkoutExpiresAt?: string; checkoutAvailableUntil?: string };
};

const settled = ['paid', 'test_paid', 'refunded', 'partially_refunded', 'chargeback', 'disputed', 'reconciliation_required'];

/** Server permission remains authoritative; this only removes stale actions after their deadlines. */
export function paymentUiState(booking: PaymentView | null | undefined, now = Date.now()) {
  const checkoutExpiry = booking?.payment.status === 'pending' ? Date.parse(booking.payment.checkoutExpiresAt || '') : NaN;
  // An in-flight payment must remain a provider-verification case, even after a hold expires.
  const full = booking?.payment.model === 'full_prepayment';
  const holdExpiry = booking && !settled.includes(booking.payment.status) && (full || booking.scheduling.status === 'held')
    ? Date.parse((full ? booking.payment.checkoutAvailableUntil : booking.scheduling.holdExpiresAt) || '') : NaN;
  const checkoutHasExpired = Number.isFinite(checkoutExpiry) && checkoutExpiry <= now;
  const expiredHold = Number.isFinite(holdExpiry) && holdExpiry <= now;
  const holdHasExpired = booking?.payment.status !== 'pending' && expiredHold;
  const future = [checkoutExpiry, holdExpiry].filter(value => Number.isFinite(value) && value > now);
  return {
    checkoutHasExpired, holdHasExpired,
    canOpenCheckout: Boolean(booking?.canCheckout && !settled.includes(booking.payment.status) && !checkoutHasExpired && !expiredHold),
    nextUpdateAt: future.length ? Math.min(...future) : null,
  };
}

/** Conflict responses describe several different states; only PRICE_CHANGED means a new price. */
export function checkoutErrorKey(error: { code?: string; status?: number } | null | undefined): string {
  switch (error?.code) {
    case 'CHECKOUT_EXPIRED': return 'checkoutExpired';
    case 'PRICE_CHANGED': return 'priceChanged';
    case 'TERMS_REQUIRED': return 'checkRequired';
    case 'PAYMENT_RECONCILIATION_REQUIRED':
    case 'PAYMENT_OUTCOME_UNKNOWN': return 'paymentReviewRequired';
    case 'PAYMENT_MODE_CHANGED': return 'paymentModeChanged';
    case 'CHECKOUT_NOT_AVAILABLE':
    case 'PAYMENT_NOT_CONFIGURED':
    case 'INVALID_CHECKOUT_URL':
    case 'INVALID_PAYMENT_LINK': return 'paymentUnavailable';
    default: return 'networkError';
  }
}
