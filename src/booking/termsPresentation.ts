import type { BookingSelection } from './pricing.ts';
import { getTermsPolicy } from '../legal/terms-policy.ts';
import { CURRENT_TERMS_VERSION } from '../legal/terms-version.ts';
import { termsMetadata } from '../legal/terms-registry.ts';
import { publicHref, routeLanguage } from '../routing/site-paths.ts';

type Language = 'de' | 'en' | 'es' | 'fr' | 'it' | 'pt';
const languages: Language[] = ['de', 'en', 'es', 'fr', 'it', 'pt'];
const formatLocale: Record<Language, string> = { de: 'de-CH', en: 'en-GB', es: 'es-ES', fr: 'fr-CH', it: 'it-CH', pt: 'pt-PT' };
const rows = {
  title: ['Vor Ihrer Bestätigung', 'Before you confirm', 'Antes de confirmar', 'Avant votre confirmation', 'Prima della conferma', 'Antes de confirmar'],
  bookingTitle: ['Bedingungen Ihres Auftrags', 'Your order terms', 'Condiciones de su encargo', 'Conditions de votre commande', 'Condizioni del Suo incarico', 'Condições do seu serviço'],
  deposit: ['Anzahlung', 'Deposit', 'Anticipo', 'Acompte', 'Acconto', 'Sinal'],
  balance: ['Restbetrag', 'Balance', 'Saldo', 'Solde', 'Saldo', 'Saldo'],
  cancellation: ['Stornierung', 'Cancellation', 'Cancelación', 'Annulation', 'Cancellazione', 'Cancelamento'],
  rescheduling: ['Verschiebung', 'Rescheduling', 'Cambio de fecha', 'Report', 'Rinvio', 'Alteração de data'],
  guarantee: ['Abnahmegarantie', 'Handover guarantee', 'Garantía de entrega', 'Garantie de remise', 'Garanzia di consegna', 'Garantia de entrega'],
  clause: ['Vollständige Bedingungen', 'Full conditions', 'Condiciones completas', 'Conditions complètes', 'Condizioni complete', 'Condições completas'],
  accepted: ['Akzeptierte AGB', 'Accepted terms', 'Condiciones aceptadas', 'Conditions acceptées', 'Condizioni accettate', 'Condições aceites'],
  acceptedAt: ['Akzeptiert am', 'Accepted on', 'Aceptadas el', 'Acceptées le', 'Accettate il', 'Aceites em'],
  materials: ['Reinigungsmittel und Geräte', 'Cleaning products and equipment', 'Productos y equipos de limpieza', 'Produits et équipements de nettoyage', 'Prodotti e attrezzature per la pulizia', 'Produtos e equipamentos de limpeza'],
  materialsClient: ['Sie stellen Reinigungsmittel und Geräte bereit. «Kraken-Material» wurde nicht gewählt.', 'You provide cleaning products and equipment. “Kraken materials” was not selected.', 'Usted facilita los productos y equipos de limpieza. No se ha seleccionado «Material de Kraken».', 'Vous fournissez les produits et équipements de nettoyage. «Matériel Kraken» n’a pas été sélectionné.', 'Fornisce i prodotti e le attrezzature per la pulizia. «Materiale Kraken» non è stato selezionato.', 'Disponibiliza os produtos e equipamentos de limpeza. «Material da Kraken» não foi selecionado.'],
  materialsKraken: ['«Kraken-Material» wurde gewählt. Welche Reinigungsmittel und Geräte Kraken mitbringt, steht in der Auftragsbestätigung.', '“Kraken materials” was selected. The order confirmation states which cleaning products and equipment Kraken brings.', 'Se ha seleccionado «Material de Kraken». La confirmación del encargo indica qué productos y equipos aporta Kraken.', '«Matériel Kraken» a été sélectionné. La confirmation de commande précise les produits et équipements apportés par Kraken.', '«Materiale Kraken» è stato selezionato. La conferma d’ordine indica quali prodotti e attrezzature porta Kraken.', '«Material da Kraken» foi selecionado. A confirmação do serviço indica os produtos e equipamentos que a Kraken traz.'],
  materialsPending: ['Welche Reinigungsmittel und Geräte Kraken mitbringt, wird in der Auftragsbestätigung festgehalten.', 'The order confirmation will state which cleaning products and equipment Kraken brings.', 'La confirmación del encargo indicará qué productos y equipos de limpieza aporta Kraken.', 'La confirmation de commande indiquera quels produits et équipements de nettoyage Kraken apporte.', 'La conferma d’ordine indicherà quali prodotti e attrezzature per la pulizia porta Kraken.', 'A confirmação do serviço indicará quais os produtos e equipamentos de limpeza que a Kraken traz.'],
  depositDue: ['Anzahlung spätestens', 'Deposit due no later than', 'Anticipo a más tardar', 'Acompte au plus tard', 'Acconto entro', 'Sinal o mais tardar'],
  depositAmount: ['Berechnete Anzahlung', 'Calculated deposit', 'Anticipo calculado', 'Acompte calculé', 'Acconto calcolato', 'Sinal calculado'],
  beforeStart: ['vor Arbeitsbeginn', 'before work begins', 'antes del inicio de los trabajos', 'avant le début des travaux', 'prima dell’inizio dei lavori', 'antes do início dos trabalhos'],
  deadlinePending: ['Die konkrete Frist beginnt erst mit der Auftragsbestätigung.', 'The actual deadline starts only with the order confirmation.', 'El plazo concreto comienza con la confirmación del encargo.', 'Le délai concret commence avec la confirmation de commande.', 'Il termine concreto decorre dalla conferma d’ordine.', 'O prazo concreto começa com a confirmação do serviço.'],
  regularSchedule: ['Für regelmässige Reinigungen gelten die Zahlungstermine der Auftragsbestätigung.', 'For regular cleaning, the payment dates in the order confirmation apply.', 'En la limpieza periódica se aplican los vencimientos de la confirmación del encargo.', 'Pour les nettoyages réguliers, les échéances de la confirmation de commande s’appliquent.', 'Per la pulizia regolare si applicano le scadenze della conferma d’ordine.', 'Na limpeza regular aplicam-se as datas de pagamento da confirmação do serviço.'],
  invoiceDue: ['Restbetrag fällig am', 'Balance due on', 'Saldo a pagar el', 'Solde dû le', 'Saldo dovuto il', 'Saldo a pagar em'],
  request: ['Anfrage erhalten · Auftrag noch nicht bestätigt', 'Request received · order not yet confirmed', 'Solicitud recibida · encargo aún no confirmado', 'Demande reçue · commande non encore confirmée', 'Richiesta ricevuta · incarico non ancora confermato', 'Pedido recebido · serviço ainda não confirmado'],
  confirmed: ['Auftrag bestätigt · Zahlung separat prüfen', 'Order confirmed · payment is checked separately', 'Encargo confirmado · el pago se verifica por separado', 'Commande confirmée · paiement vérifié séparément', 'Incarico confermato · pagamento verificato separatamente', 'Serviço confirmado · pagamento verificado separadamente'],
  paid: ['Zahlung vom Zahlungsanbieter bestätigt', 'Payment confirmed by the payment provider', 'Pago confirmado por el proveedor de pagos', 'Paiement confirmé par le prestataire de paiement', 'Pagamento confermato dal fornitore di pagamento', 'Pagamento confirmado pelo fornecedor de pagamentos'],
  testPaid: ['TEST · Testzahlung bestätigt, keine echte Zahlung', 'TEST · Test payment confirmed, no live payment', 'PRUEBA · Pago de prueba confirmado, sin pago real', 'TEST · Paiement de test confirmé, aucun paiement réel', 'TEST · Pagamento di prova confermato, nessun pagamento reale', 'TESTE · Pagamento de teste confirmado, sem pagamento real'],
  held: ['Reservierter Termin · Anzahlung ausstehend', 'Held appointment · deposit outstanding', 'Fecha reservada · anticipo pendiente', 'Créneau réservé · acompte en attente', 'Data riservata · acconto in sospeso', 'Data reservada · sinal pendente'],
  holdUntil: ['Aktuelle Terminreservierung bis', 'Current appointment hold until', 'Retención actual de la fecha hasta', 'Réservation actuelle du créneau jusqu’au', 'Attuale riserva della data fino al', 'Retenção atual da data até'],
  archive: ['Für diesen bestehenden Auftrag gelten die ursprünglich akzeptierten AGB. Beachten Sie die archivierte Fassung oder Ihre ursprüngliche Auftragsbestätigung.', 'This existing order retains its originally accepted terms. Please consult the archived copy or your original order confirmation.', 'Este encargo conserva las condiciones aceptadas originalmente. Consulte la copia archivada o la confirmación original de su encargo.', 'Cette commande conserve les conditions acceptées à l’origine. Consultez la copie archivée ou votre confirmation de commande originale.', 'Questo incarico conserva le condizioni originariamente accettate. Consulti la copia archiviata o la conferma d’ordine originale.', 'Este serviço mantém as condições originalmente aceites. Consulte a cópia arquivada ou a confirmação original do serviço.'],
  missingAcceptance: ['Die akzeptierte AGB-Fassung wird mit Kraken persönlich geklärt.', 'Please clarify the accepted terms version directly with Kraken.', 'Aclare con Kraken la versión de las condiciones aceptadas.', 'Veuillez clarifier avec Kraken la version des conditions acceptées.', 'Chiarisca con Kraken la versione delle condizioni accettate.', 'Esclareça com a Kraken a versão das condições aceites.'],
  read: ['AGB lesen', 'Read the terms', 'Leer las condiciones', 'Lire les conditions', 'Leggere le condizioni', 'Ler as condições'],
  pdf: ['Akzeptierte Fassung als PDF', 'Accepted version as PDF', 'Versión aceptada en PDF', 'Version acceptée en PDF', 'Versione accettata in PDF', 'Versão aceite em PDF'],
  archivePdf: ['Archivierte Fassung als PDF', 'Archived version as PDF', 'Versión archivada en PDF', 'Version archivée en PDF', 'Versione archiviata in PDF', 'Versão arquivada em PDF'],
  scope: ['Vereinbarter Leistungsumfang', 'Agreed scope', 'Alcance acordado', 'Prestations convenues', 'Prestazioni concordate', 'Âmbito acordado'],
} as const;
export function termsPresentationText(language: string, key: keyof typeof rows): string {
  return rows[key][languages.indexOf((routeLanguage(language) || 'de') as Language)];
}
export interface TermsPresentationRow { label: string; value: string }
export interface TermsPresentationSection { label: string; text: string; href: string; clause: number }
export interface TermsPresentation {
  language: Language;
  title: string;
  state: string;
  legacy: boolean;
  notice?: string;
  rows: TermsPresentationRow[];
  sections: TermsPresentationSection[];
  links: { label: string; href: string }[];
}
const validTimestamp = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return value;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const result = Date.parse(value);
    if (Number.isFinite(result)) return result;
  }
  return null;
};
const zurichDate = (value: number) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Zurich', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
const plusCalendarDays = (date: string, days: number) => new Date(Date.parse(`${date}T12:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
const displayDate = (date: string, language: Language) => new Intl.DateTimeFormat(formatLocale[language], { timeZone: 'Europe/Zurich', dateStyle: 'long' }).format(new Date(`${date}T12:00:00Z`));
const validDate = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T12:00:00Z`)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;

/** Presentation only: reads recorded amounts and dates; never updates a charge, hold or booking. */
export function bookingTermsPresentation(language: string, { selection, booking }: { selection?: BookingSelection | null; booking?: any } = {}): TermsPresentation {
  const locale = (routeLanguage(language) || 'de') as Language, text = (key: keyof typeof rows) => termsPresentationText(locale, key);
  const policy = getTermsPolicy(locale);
  const storedSelection = booking?.selection || selection;
  const recordedVersion = booking?.termsAcceptance?.version || booking?.termsVersion;
  const legacy = Boolean(booking && recordedVersion !== CURRENT_TERMS_VERSION);
  const presentation: TermsPresentation = { language: locale, title: text(booking ? 'bookingTitle' : 'title'), state: '', legacy, rows: [], sections: [], links: [] };
  const storedLanguage = booking?.termsAcceptance?.language || booking?.language || locale;
  const metadata = recordedVersion ? termsMetadata(recordedVersion, storedLanguage) : null;
  if (booking) {
    const confirmed = (validTimestamp(booking.confirmedAt) !== null && booking.status === 'confirmed') || ['confirmed', 'completed'].includes(booking.scheduling?.status);
    const paid = ['paid', 'test_paid'].includes(booking.payment?.status);
    presentation.state = paid ? text(booking.payment.status === 'test_paid' || booking.mode === 'test' ? 'testPaid' : 'paid') : confirmed ? text('confirmed') : text('request');
    if (metadata) {
      presentation.rows.push({ label: text('accepted'), value: metadata.version });
      const acceptedAt = validTimestamp(booking.termsAcceptance?.acceptedAt ?? booking.termsAcceptedAt);
      if (acceptedAt !== null) presentation.rows.push({ label: text('acceptedAt'), value: new Intl.DateTimeFormat(formatLocale[locale], { timeZone: 'Europe/Zurich', dateStyle: 'long', timeStyle: 'short' }).format(acceptedAt) + ' · Europe/Zurich' });
      presentation.links.push({ label: text(legacy ? 'archivePdf' : 'pdf'), href: metadata.pdfUrl });
    }
    if (legacy) {
      presentation.notice = metadata ? text('archive') : text('missingAcceptance');
      return presentation;
    }
    if (confirmed && booking.scheduling?.status === 'held' && validDate(booking.scheduling.date)) {
      presentation.rows.push({ label: text('held'), value: displayDate(booking.scheduling.date, locale) + (/^\d{2}:\d{2}$/.test(booking.scheduling.time || '') ? ` · ${booking.scheduling.time} · Europe/Zurich` : '') });
      const holdExpiresAt = validTimestamp(booking.scheduling.holdExpiresAt);
      if (holdExpiresAt !== null) presentation.rows.push({ label: text('holdUntil'), value: new Intl.DateTimeFormat(formatLocale[locale], { timeZone: 'Europe/Zurich', dateStyle: 'long', timeStyle: 'short' }).format(holdExpiresAt) + ' · Europe/Zurich' });
    }
    if (Number.isSafeInteger(booking.payment?.amountDueNowCents) && booking.payment.amountDueNowCents > 0) presentation.rows.push({ label: text('depositAmount'), value: new Intl.NumberFormat(formatLocale[locale], { style: 'currency', currency: 'CHF' }).format(booking.payment.amountDueNowCents / 100) });
    const confirmedAt = validTimestamp(booking.confirmedAt);
    const regular = storedSelection?.service === 'regular' && storedSelection.cleaningKind !== 'deep' && storedSelection.frequency !== 'once';
    if (!paid && regular) presentation.rows.push({ label: text('depositDue'), value: text('regularSchedule') });
    else if (!paid && confirmed && confirmedAt !== null) {
      const limit = plusCalendarDays(zurichDate(confirmedAt), 3);
      const start = booking.scheduling?.date;
      const beforeStart = validDate(start) && start <= limit;
      presentation.rows.push({ label: text('depositDue'), value: displayDate(beforeStart ? start : limit, locale) + (beforeStart ? ` · ${/^\d{2}:\d{2}$/.test(booking.scheduling?.time || '') ? booking.scheduling.time + ' · ' : ''}${text('beforeStart')}` : ` · ${text('beforeStart')}`) });
    } else if (!paid) presentation.rows.push({ label: text('depositDue'), value: text('deadlinePending') });
    const invoicedAt = validTimestamp(booking.invoicedAt ?? booking.invoice?.issuedAt);
    if (!regular && invoicedAt !== null) presentation.rows.push({ label: text('invoiceDue'), value: displayDate(plusCalendarDays(zurichDate(invoicedAt), 7), locale) });
  }
  const materialSelection = storedSelection?.service === 'moving' ? storedSelection.cleaning : storedSelection;
  if (materialSelection?.service === 'regular') presentation.rows.push({ label: text('materials'), value: materialSelection.materials === true ? text('materialsKraken') : materialSelection.materials === false ? text('materialsClient') : text('materialsPending') });
  else if (materialSelection?.service && materialSelection.service !== 'moving') presentation.rows.push({ label: text('materials'), value: text('materialsPending') });
  presentation.sections = [
    { label: text('deposit'), text: policy.deposit, href: publicHref('/terms#agb-4', locale), clause: 4 },
    { label: text('balance'), text: policy.payment, href: publicHref('/terms#agb-4', locale), clause: 4 },
    { label: text('cancellation'), text: policy.cancellation, href: publicHref('/terms#agb-7', locale), clause: 7 },
    { label: text('rescheduling'), text: policy.rescheduling, href: publicHref('/terms#agb-7', locale), clause: 7 },
  ];
  const guaranteeSelection = storedSelection?.service === 'moving' ? storedSelection.cleaning : storedSelection;
  if (guaranteeSelection?.service === 'endOfTenancy' && guaranteeSelection.mode === 'fixed') presentation.sections.push({ label: text('guarantee'), text: policy.guarantee, href: publicHref('/terms#agb-9', locale), clause: 9 });
  presentation.links.push({ label: text('read'), href: publicHref('/terms', locale) });
  return presentation;
}
