/** Append future versions: never discard the terms accepted by existing bookings. */
import {CURRENT_TERMS_VERSION,HISTORICAL_TERMS_VERSIONS} from '../legal/terms-version.ts';
const versions = [...HISTORICAL_TERMS_VERSIONS,CURRENT_TERMS_VERSION] as const;
/** Each new acceptance is bound to the current immutable document; older bookings keep theirs. */
export const BOOKING_TERMS_VERSION = CURRENT_TERMS_VERSION;
const acceptedVersions = new Set<string>(versions);

/** Existing bookings retain their accepted terms; a browser cannot switch versions. */
export function checkoutTermsMatch(submitted: unknown, recorded: unknown): boolean {
  return typeof recorded === 'string' && acceptedVersions.has(recorded) && submitted === recorded;
}
