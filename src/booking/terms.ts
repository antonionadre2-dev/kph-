/** Append future versions: never discard the terms accepted by existing bookings. */
const versions = ['kraken-2026-11-24', 'kraken-2026-11-25-fixed-scope'] as const;
/** Owner confirmed fixed prices for the declared scope on 25 November 2026. */
export const BOOKING_TERMS_VERSION = versions[versions.length - 1];
const acceptedVersions = new Set<string>(versions);

/** Existing bookings retain their accepted terms; a browser cannot switch versions. */
export function checkoutTermsMatch(submitted: unknown, recorded: unknown): boolean {
  return typeof recorded === 'string' && acceptedVersions.has(recorded) && submitted === recorded;
}
