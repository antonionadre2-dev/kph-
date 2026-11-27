const day = 86_400_000, hour = 3_600_000;
const wallClock = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Europe/Zurich', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});

/** The displayed agreement, not the current public default, controls an existing booking. */
export const usesTermsPaymentDeadline = (record: any) => record?.termsVersion === 'kraken-agb-2026-11-26-v2';

/** Three Zurich calendar days at the confirmation's local time, capped at work start. */
export function depositPaymentDeadline(confirmedAt: number, appointmentStart: number): number {
  if (!Number.isFinite(confirmedAt) || !Number.isFinite(appointmentStart) || appointmentStart <= confirmedAt) throw new RangeError('INVALID_PAYMENT_DEADLINE');
  const local = wallClock.format(confirmedAt).replace(' ', 'T');
  const shifted = Date.parse(local + 'Z') + 3 * day;
  const intended = new Date(shifted).toISOString().slice(0, 19).replace('T', ' ');
  const candidates = [shifted - 2 * hour, shifted - hour];
  const matching = candidates.filter(value => wallClock.format(value) === intended);
  // At the spring DST gap, use the first later local clock value; at a fold use the earlier instant.
  const instant = matching.length ? Math.min(...matching) : Math.min(...candidates.filter(value => wallClock.format(value) > intended));
  if (!Number.isFinite(instant)) throw new RangeError('INVALID_PAYMENT_DEADLINE');
  return Math.min(instant + new Date(confirmedAt).getUTCMilliseconds(), appointmentStart);
}
