import { bookingLanguage, bookingText } from './uiCopy.ts';

export const ACTIVITY_SERVICES = ['regular', 'deep', 'endOfTenancy', 'windows', 'construction', 'moving'] as const;
export type ActivityService = typeof ACTIVITY_SERVICES[number];
export const ACTIVITY_REGIONS = ['Zürich', 'Schaffhausen', 'Winterthur'] as const;
export interface BookingActivityEvent { id: string; service: ActivityService; region: typeof ACTIVITY_REGIONS[number]; occurredAt: string }
const MAX_EVENT_AGE = 24 * 60 * 60 * 1000;

/** Treat the feed as data, never as copy or an instruction. Expose only our own labels. */
export function parseBookingActivity(payload: unknown, now = Date.now()): BookingActivityEvent[] {
  if (!payload || typeof payload !== 'object' || !Array.isArray((payload as { events?: unknown }).events)) return [];
  const rows = (payload as { events: unknown[] }).events.slice(0, 30);
  const seen = new Set<string>();
  const events: BookingActivityEvent[] = [];
  for (const item of rows) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    if (typeof row.id !== 'string' || !/^[A-Za-z0-9_-]{8,100}$/.test(row.id) || seen.has(row.id)) continue;
    if (!ACTIVITY_SERVICES.includes(row.service as ActivityService) || !ACTIVITY_REGIONS.includes(row.region as typeof ACTIVITY_REGIONS[number])) continue;
    if (typeof row.occurredAt !== 'string') continue;
    const timestamp = Date.parse(row.occurredAt);
    if (!Number.isFinite(timestamp) || timestamp > now || now - timestamp > MAX_EVENT_AGE) continue;
    // Explicit non-live markers cannot be turned into a customer-facing notification.
    if (row.test === true || row.demo === true || row.refunded === true || row.status !== 'confirmed') continue;
    seen.add(row.id);
    events.push({ id: row.id, service: row.service as ActivityService, region: row.region as typeof ACTIVITY_REGIONS[number], occurredAt: row.occurredAt });
  }
  return events.sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt));
}

const activityLabels = {
  de: { confirmed: 'Bestätigte Buchung', booked: 'gebucht', recent: 'Kürzlich', hour: 'Innerhalb der letzten Stunde', today: 'Innerhalb der letzten 24 Stunden', demo: 'So sieht ein echter Buchungshinweis aus. In dieser Vorschau ist er simuliert.' },
  en: { confirmed: 'Confirmed booking', booked: 'booked', recent: 'Recently', hour: 'Within the last hour', today: 'Within the last 24 hours', demo: 'This shows how a real booking notice looks. It is simulated in this preview.' },
  es: { confirmed: 'Reserva confirmada', booked: 'contratada', recent: 'Recientemente', hour: 'Durante la última hora', today: 'Durante las últimas 24 horas', demo: 'Así se verá un aviso de contratación real. En esta vista previa es una simulación.' },
  fr: { confirmed: 'Réservation confirmée', booked: 'réservé', recent: 'Récemment', hour: 'Au cours de la dernière heure', today: 'Au cours des dernières 24 heures', demo: 'Voici un exemple d’avis de réservation réelle. Il est simulé dans cet aperçu.' },
  it: { confirmed: 'Prenotazione confermata', booked: 'prenotato', recent: 'Di recente', hour: 'Nell’ultima ora', today: 'Nelle ultime 24 ore', demo: 'Ecco come appare un avviso di prenotazione reale. In questa anteprima è simulato.' },
  pt: { confirmed: 'Reserva confirmada', booked: 'reservada', recent: 'Recentemente', hour: 'Na última hora', today: 'Nas últimas 24 horas', demo: 'Este é um exemplo de aviso de uma reserva real. Nesta pré-visualização é uma simulação.' },
};
export function activityText(language: string) { return activityLabels[bookingLanguage(language)]; }
export function activityTitle(event: BookingActivityEvent, language: string) { return bookingText(language, event.service); }
export function activityAgeLabel(event: BookingActivityEvent, language: string, now = Date.now()) {
  const age = Math.max(0, now - Date.parse(event.occurredAt));
  const labels = activityText(language);
  return age < 15 * 60 * 1000 ? labels.recent : age < 60 * 60 * 1000 ? labels.hour : labels.today;
}
