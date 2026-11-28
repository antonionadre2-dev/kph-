import type { BookingSelection, PriceQuote } from './pricing.ts';
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
  deposit: ['Zahlung vor dem Einsatz', 'Payment before the service', 'Pago antes del servicio', 'Paiement avant l’intervention', 'Pagamento prima dell’intervento', 'Pagamento antes do serviço'],
  balance: ['Zahlungsbedingungen', 'Payment conditions', 'Condiciones de pago', 'Conditions de paiement', 'Condizioni di pagamento', 'Condições de pagamento'],
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
  depositDue: ["Zahlbar spätestens", "Payment due no later than", "Pago a más tardar", "Paiement au plus tard", "Pagamento entro", "Pagamento o mais tardar"],
  depositAmount: ["Zu zahlen nach der Bestätigung", "To pay after confirmation", "A pagar tras la confirmación", "À payer après confirmation", "Da pagare dopo la conferma", "A pagar após a confirmação"],
  beforeStart: ['vor Arbeitsbeginn', 'before work begins', 'antes del inicio de los trabajos', 'avant le début des travaux', 'prima dell’inizio dei lavori', 'antes do início dos trabalhos'],
  deadlinePending: ['Die konkrete Frist beginnt erst mit der Auftragsbestätigung.', 'The actual deadline starts only with the order confirmation.', 'El plazo concreto comienza con la confirmación del encargo.', 'Le délai concret commence avec la confirmation de commande.', 'Il termine concreto decorre dalla conferma d’ordine.', 'O prazo concreto começa com a confirmação do serviço.'],
  regularSchedule: ["Regelmässige Reinigungen werden monatlich im Voraus bezahlt.", "Regular cleaning is paid monthly in advance.", "La limpieza periódica se paga mensualmente por adelantado.", "Les nettoyages réguliers sont payés mensuellement à l’avance.", "La pulizia regolare viene pagata mensilmente in anticipo.", "A limpeza regular é paga mensalmente de forma antecipada."],
  invoiceDue: ["Zusätzliche Rechnung fällig am", "Additional invoice due on", "Factura adicional a pagar el", "Facture supplémentaire due le", "Fattura aggiuntiva dovuta il", "Fatura adicional a pagar em"],
  request: ['Anfrage erhalten · Auftrag noch nicht bestätigt', 'Request received · order not yet confirmed', 'Solicitud recibida · encargo aún no confirmado', 'Demande reçue · commande non encore confirmée', 'Richiesta ricevuta · incarico non ancora confermato', 'Pedido recebido · serviço ainda não confirmado'],
  confirmed: ['Auftrag bestätigt · Zahlung separat prüfen', 'Order confirmed · payment is checked separately', 'Encargo confirmado · el pago se verifica por separado', 'Commande confirmée · paiement vérifié séparément', 'Incarico confermato · pagamento verificato separatamente', 'Serviço confirmado · pagamento verificado separadamente'],
  paid: ['Zahlung vom Zahlungsanbieter bestätigt', 'Payment confirmed by the payment provider', 'Pago confirmado por el proveedor de pagos', 'Paiement confirmé par le prestataire de paiement', 'Pagamento confermato dal fornitore di pagamento', 'Pagamento confirmado pelo fornecedor de pagamentos'],
  testPaid: ['TEST · Testzahlung bestätigt, keine echte Zahlung', 'TEST · Test payment confirmed, no live payment', 'PRUEBA · Pago de prueba confirmado, sin pago real', 'TEST · Paiement de test confirmé, aucun paiement réel', 'TEST · Pagamento di prova confermato, nessun pagamento reale', 'TESTE · Pagamento de teste confirmado, sem pagamento real'],
  held: ["Bestätigter Termin · Zahlung offen", "Confirmed appointment · payment outstanding", "Fecha confirmada · pago pendiente", "Rendez-vous confirmé · paiement en attente", "Appuntamento confermato · pagamento in attesa", "Marcação confirmada · pagamento em falta"],
  holdUntil: ['Aktuelle Terminreservierung bis', 'Current appointment hold until', 'Retención actual de la fecha hasta', 'Réservation actuelle du créneau jusqu’au', 'Attuale riserva della data fino al', 'Retenção atual da data até'],
  archive: ['Für diesen bestehenden Auftrag gelten die ursprünglich akzeptierten AGB. Beachten Sie die archivierte Fassung oder Ihre ursprüngliche Auftragsbestätigung.', 'This existing order retains its originally accepted terms. Please consult the archived copy or your original order confirmation.', 'Este encargo conserva las condiciones aceptadas originalmente. Consulte la copia archivada o la confirmación original de su encargo.', 'Cette commande conserve les conditions acceptées à l’origine. Consultez la copie archivée ou votre confirmation de commande originale.', 'Questo incarico conserva le condizioni originariamente accettate. Consulti la copia archiviata o la conferma d’ordine originale.', 'Este serviço mantém as condições originalmente aceites. Consulte a cópia arquivada ou a confirmação original do serviço.'],
  missingAcceptance: ['Die akzeptierte AGB-Fassung wird mit Kraken persönlich geklärt.', 'Please clarify the accepted terms version directly with Kraken.', 'Aclare con Kraken la versión de las condiciones aceptadas.', 'Veuillez clarifier avec Kraken la version des conditions acceptées.', 'Chiarisca con Kraken la versione delle condizioni accettate.', 'Esclareça com a Kraken a versão das condições aceites.'],
  read: ['Alle Bedingungen lesen', 'Read all the terms', 'Leer todas las condiciones', 'Lire toutes les conditions', 'Leggere tutte le condizioni', 'Ler todas as condições'],
  pdf: ['Akzeptierte Fassung als PDF', 'Accepted version as PDF', 'Versión aceptada en PDF', 'Version acceptée en PDF', 'Versione accettata in PDF', 'Versão aceite em PDF'],
  archivePdf: ['Archivierte Fassung als PDF', 'Archived version as PDF', 'Versión archivada en PDF', 'Version archivée en PDF', 'Versione archiviata in PDF', 'Versão arquivada em PDF'],
  paymentSchedule: ["Zahlbar innert 3 Tagen, spätestens 48 Stunden vor dem Einsatz; kurzfristig sofort nach Bestätigung.", "Pay within 3 days, no later than 48 hours before the service; short-notice orders are due immediately on confirmation.", "Pago en 3 días y, como máximo, 48 horas antes del servicio; con poca antelación, inmediatamente tras la confirmación.", "Payable dans les 3 jours, au plus tard 48 heures avant l’intervention ; à court préavis, dès la confirmation.", "Pagamento entro 3 giorni e al più tardi 48 ore prima dell’intervento; con breve preavviso, subito dopo la conferma.", "Pagamento em 3 dias, o mais tardar 48 horas antes do serviço; com pouca antecedência, logo após a confirmação."],
  refund48: ["Stornierung bis 48 Stunden vorher: volle Rückerstattung.", "Cancel at least 48 hours beforehand: full refund.", "Cancelación con 48 horas o más de antelación: devolución íntegra.", "Annulation avec 48 heures ou plus de préavis : remboursement intégral.", "Cancellazione con almeno 48 ore di preavviso: rimborso integrale.", "Cancelamento com 48 horas ou mais de antecedência: reembolso integral."],
  guaranteeFixed: ["Gilt für die vereinbarte Umzugsreinigung zum Pauschalpreis.", "Applies to the agreed end-of-tenancy cleaning at a fixed package price.", "Se aplica a la limpieza de fin de alquiler acordada a precio cerrado.", "S’applique au nettoyage de fin de bail convenu au forfait.", "Si applica alla pulizia di fine locazione concordata a prezzo forfettario.", "Aplica-se à limpeza de fim de arrendamento acordada a preço fixo."],
  guaranteeNone: ["Nur bei Umzugsreinigung zum Pauschalpreis, nicht bei dieser Leistung.", "Only for fixed-price end-of-tenancy cleaning, not for this service.", "Solo para limpieza de fin de alquiler a precio cerrado; este servicio no la incluye.", "Uniquement pour le nettoyage de fin de bail au forfait ; cette prestation ne l’inclut pas.", "Solo per la pulizia di fine locazione a prezzo forfettario; questo servizio non la include.", "Apenas na limpeza de fim de arrendamento a preço fixo; este serviço não a inclui."],
  monthlyPending: ["Monatsbetrag nach bestätigten Besuchen.", "Monthly total for confirmed visits.", "Importe mensual según visitas confirmadas.", "Montant mensuel selon les visites confirmées.", "Importo mensile secondo le visite confermate.", "Valor mensal conforme visitas confirmadas."],
  amountPending: ["Kraken bestätigt zuerst den endgültigen Preis.", "Kraken first confirms the final price.", "Kraken confirma primero el precio definitivo.", "Kraken confirme d’abord le prix définitif.", "Kraken conferma prima il prezzo definitivo.", "A Kraken confirma primeiro o preço final."],
  agreedTotal: ["Bestätigter Gesamtpreis", "Confirmed total", "Importe total confirmado", "Montant total confirmé", "Importo totale confermato", "Valor total confirmado"],
  paidNotice: ["Zahlungseingang bestätigt.", "Receipt of payment confirmed.", "Recepción del pago confirmada.", "Réception du paiement confirmée.", "Ricezione del pagamento confermata.", "Receção do pagamento confirmada."],
  cancelled: ["Auftrag storniert", "Order cancelled", "Encargo cancelado", "Commande annulée", "Incarico annullato", "Serviço cancelado"],
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

/** Reads frozen order amounts and dates; never computes or creates a charge. */
export function bookingTermsPresentation(language: string, { selection, booking, quote }: { selection?: BookingSelection | null; booking?: any; quote?: PriceQuote | null } = {}): TermsPresentation {
  const locale = (routeLanguage(language) || 'de') as Language, text = (key: keyof typeof rows) => termsPresentationText(locale, key);
  const policy = getTermsPolicy(locale), selected = booking?.selection || selection, price = booking?.quote || quote;
  const recordedVersion = booking?.termsAcceptance?.version || booking?.termsVersion;
  const legacy = Boolean(booking && recordedVersion !== CURRENT_TERMS_VERSION);
  const presentation: TermsPresentation = { language: locale, title: text(booking ? 'bookingTitle' : 'title'), state: '', legacy, rows: [], sections: [], links: [] };
  const metadata = recordedVersion ? termsMetadata(recordedVersion, booking?.termsAcceptance?.language || booking?.language || locale) : null;
  const paid = ['paid', 'test_paid'].includes(booking?.payment?.status);
  if (booking) {
    const confirmed = validTimestamp(booking.confirmedAt) !== null;
    presentation.state = booking.status === 'cancelled' ? text('cancelled') : paid ? text(booking.payment.status === 'test_paid' || booking.mode === 'test' ? 'testPaid' : 'paid') : confirmed ? text('confirmed') : text('request');
    if (metadata) presentation.links.push({ label: text(legacy ? 'archivePdf' : 'pdf'), href: metadata.pdfUrl });
    if (legacy) {
      presentation.notice = metadata ? text('archive') : text('missingAcceptance');
      if (metadata) presentation.rows.push({ label: text('accepted'), value: metadata.version });
      const acceptedAt = validTimestamp(booking.termsAcceptance?.acceptedAt ?? booking.termsAcceptedAt);
      if (acceptedAt !== null) presentation.rows.push({ label: text('acceptedAt'), value: new Intl.DateTimeFormat(formatLocale[locale], { timeZone: 'Europe/Zurich', dateStyle: 'long', timeStyle: 'short' }).format(acceptedAt) + ' · Europe/Zurich' });
      return presentation;
    }
  }
  const monthly = selected?.service === 'regular' && selected.cleaningKind !== 'deep' && selected.frequency !== 'once';
  const confirmedMonthly = booking?.payment?.billingPeriod;
  const candidate = booking?.payment?.totalDueCents ?? price?.totalPayableCents ?? price?.totalCents;
  const unresolved = price?.priceType === 'personal' || price?.priceType === 'from';
  const amount = monthly && !confirmedMonthly ? text('monthlyPending') : !unresolved && Number.isSafeInteger(candidate) && candidate >= 0
    ? new Intl.NumberFormat(formatLocale[locale], { style: 'currency', currency: 'CHF' }).format(candidate / 100) : text('amountPending');
  const deadline = validTimestamp(booking?.payment?.paymentDueAt);
  const due = paid ? text('paidNotice') : deadline !== null ? new Intl.DateTimeFormat(formatLocale[locale], { timeZone: 'Europe/Zurich', dateStyle: 'long', timeStyle: 'short' }).format(deadline) + ' · Europe/Zurich' : text('paymentSchedule');
  const guaranteeSelection = selected?.service === 'moving' ? selected.cleaning : selected;
  const guaranteed = guaranteeSelection?.service === 'endOfTenancy' && guaranteeSelection.mode === 'fixed';
  presentation.rows = [
    { label: text(paid ? 'agreedTotal' : 'depositAmount'), value: amount },
    { label: deadline !== null && !paid ? text('depositDue') : '', value: due },
    { label: '', value: text('refund48') },
    { label: text('guarantee'), value: text(guaranteed ? 'guaranteeFixed' : 'guaranteeNone') },
  ];
  presentation.sections = [
    { label: text('deposit'), text: policy.prepayment, href: publicHref('/terms#agb-4', locale), clause: 4 },
    { label: text('cancellation'), text: policy.cancellation, href: publicHref('/terms#agb-7', locale), clause: 7 },
  ];
  if (guaranteed) presentation.sections.push({ label: text('guarantee'), text: policy.guarantee, href: publicHref('/terms#agb-9', locale), clause: 9 });
  presentation.links.push({ label: text('read'), href: publicHref('/terms', locale) });
  return presentation;
}
