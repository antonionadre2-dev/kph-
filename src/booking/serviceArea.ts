/** Conservative triage only. A postcode never promises coverage or appointment availability. */
export function bookingAreaReview(postalCode: string, city: string): 'outside' | 'review' {
  const place = String(city || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  if (/^(?:bern|berne|basel|bale|geneve|geneva|ginebra|lausanne|luzern|lucerne|lugano|st\.? gallen|aarau|zug)$/.test(place)
    || /^[1-79]\d{3}$/.test(String(postalCode || ''))) return 'outside';
  return 'review';
}
