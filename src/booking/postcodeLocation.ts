export interface ResolvedPostcodeLocality { postalCode: string; locality: string }

/** Only postcode candidates matching the current query may fill the locality field. */
export function postcodeLocalities(postalCode: string, candidates: unknown): ResolvedPostcodeLocality[] {
  if (!/^[1-9]\d{3}$/.test(postalCode) || !Array.isArray(candidates)) return [];
  const places = new Map<string, ResolvedPostcodeLocality>();
  for (const candidate of candidates.slice(0, 8)) {
    if (candidate?.kind !== 'postcode' || typeof candidate.label !== 'string') continue;
    const label = candidate.label.replace(/\s+/g, ' ').trim();
    const match = /^(?:CH[-\s]*)?(\d{4})\s+(.+)$/u.exec(label);
    if (!match || match[1] !== postalCode) continue;
    const locality = match[2].replace(/\s*(?:\([A-Z]{2}\)|,\s*[A-Z]{2})\s*$/u, '').trim();
    if (locality.length < 2 || locality.length > 100 || /[<>\u0000-\u001f]/u.test(locality)) continue;
    places.set(locality.toLocaleLowerCase('de-CH'), { postalCode, locality });
  }
  return [...places.values()];
}
