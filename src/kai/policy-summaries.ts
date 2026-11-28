import { normalizeHomeLanguage } from '../../components/home/homeTranslations.ts';

/** Visitor-facing summaries approved with the full-prepayment policy, 28 November 2026.
 * The versioned legal document remains authoritative; these are deliberately brief answers.
 */
const summaries = {
  de: {
    payment: 'Ja. Nach unserer Terminbestätigung zahlen Sie den gesamten Betrag, spätestens 48 Stunden vor dem Einsatz. Bis 48 Stunden vorher können Sie kostenlos stornieren und erhalten alles zurück.',
    cancellation: 'Ja. Bis 48 Stunden vor dem Einsatz stornieren Sie kostenlos und erhalten den bezahlten Betrag zurück. Zwischen 48 und 12 Stunden vorher schulden Sie 50 %, danach 100 %.',
  },
  en: {
    payment: 'Yes. After we confirm your appointment, you pay the full amount no later than 48 hours before the service. You can cancel free of charge up to 48 hours beforehand and receive a full refund.',
    cancellation: 'Yes. Up to 48 hours before the service, cancellation is free and the amount paid is refunded. Between 48 and 12 hours beforehand, you owe 50 %; after that, 100 %.',
  },
  es: {
    payment: 'Sí. Tras nuestra confirmación de la fecha, paga el importe completo como máximo 48 horas antes del servicio. Hasta 48 horas antes puede cancelar sin coste y recibir la devolución íntegra.',
    cancellation: 'Sí. Hasta 48 horas antes del servicio puede cancelar sin coste y se devuelve el importe pagado. Entre 48 y 12 horas antes debe abonar el 50 %; después, el 100 %.',
  },
  pt: {
    payment: 'Sim. Após confirmarmos a data, paga o valor total, o mais tardar 48 horas antes do serviço. Até 48 horas antes pode cancelar sem custos e receber o reembolso integral.',
    cancellation: 'Sim. Até 48 horas antes do serviço pode cancelar sem custos e recebe o montante pago. Entre 48 e 12 horas antes deve pagar 50 %; depois, 100 %.',
  },
  it: {
    payment: 'Sì. Dopo la nostra conferma della data paga l’intero importo, al più tardi 48 ore prima dell’intervento. Fino a 48 ore prima può annullare gratuitamente e ricevere il rimborso integrale.',
    cancellation: 'Sì. Fino a 48 ore prima dell’intervento può annullare gratuitamente e ricevere il rimborso dell’importo pagato. Tra 48 e 12 ore prima deve il 50 %; successivamente, il 100 %.',
  },
  fr: {
    payment: 'Oui. Après notre confirmation du rendez-vous, vous payez le montant total, au plus tard 48 heures avant l’intervention. Jusqu’à 48 heures avant, vous pouvez annuler sans frais et recevoir un remboursement intégral.',
    cancellation: 'Oui. Jusqu’à 48 heures avant l’intervention, l’annulation est gratuite et le montant payé est remboursé. Entre 48 et 12 heures avant, vous devez 50 % ; ensuite, 100 %.',
  },
};

export function kaiPolicySummary(topic: 'payment' | 'cancellation', language: unknown) {
  return summaries[normalizeHomeLanguage(language)][topic];
}
