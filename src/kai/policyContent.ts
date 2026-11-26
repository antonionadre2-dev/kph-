import type { HomeLanguage } from '../../components/home/homeTranslations.ts';

/** Exact existing public AGB paragraphs, shared with Kai and FAQs without loading whole documents. */
export const PUBLIC_POLICY_CONTENT = {
  "de": {
    "deposit": "Die bestehende Anzahlung von 15 % bleibt unverändert; bei Umzügen nach Aufwand bezieht sie sich auf den Mindestauftrag einschliesslich Anfahrt und gegebenenfalls kombinierter Reinigung und Rabatt.",
    "payment": "Zahlungen erfolgen über Payrexx, Banküberweisung oder QR-Rechnung. Der Restbetrag ist innert 7 Tagen fällig.",
    "cancellation": "Stornierungen müssen schriftlich erfolgen. Gebühren: >48h vor Start: kostenlos; <48h: 50% des Preises; <12h, Nichterscheinen oder Absage vor Ort: 100% des Preises. Eine kostenlose Verschiebung ist >24h vor Start nach Verfügbarkeit zulässig.",
    "guarantee": "Beinhaltet kostenlose Mängelbehebung bei offizieller Wohnungsübergabe (Abgabeprotokoll). Gültig, wenn: (a) Kraken innert 24h schriftlich mit Protokoll/Fotos benachrichtigt wird; (b) Übergabe innert 72h nach Reinigung stattfindet; (c) Objekt unbewohnt und ungenutzt blieb. Normaler Verschleiss, Schäden oder ausgeschlossene Bereiche sind nicht gedeckt.",
    "insurance": "Angaben zu einer allfälligen Versicherungsdeckung ergeben sich aus den einschlägigen Versicherungsunterlagen und der schriftlichen Offerte. Fragen dazu klären Sie vor dem Auftrag mit Kraken.",
    "team": "Kraken kann qualifizierte Drittspezialisten beiziehen, bleibt jedoch alleiniger Vertragspartner."
  },
  "en": {
    "deposit": "The existing 15% deposit stays unchanged; for hourly moves it is based on the minimum order including travel and any combined cleaning and discount.",
    "payment": "Payments are processed via Payrexx, bank transfer, or QR-bill. Balance is due within 7 days of invoice.",
    "cancellation": "Cancellations must be in writing. Fees: >48 hours notice: free; <48 hours: 50% of price; <12 hours, no-show, or cancellation at door: 100% of price. One free rescheduling is permitted >24 hours prior, subject to availability.",
    "guarantee": "Includes free rectification of landlord-identified cleaning deficiencies. Valid if: (a) notified in writing within 24h of inspection with protocol/photos; (b) inspection is within 72h of cleaning; (c) property remained unoccupied. Does not cover wear and tear, structural defects, or excluded items.",
    "insurance": "Information about any applicable insurance cover is set out in the relevant policy documents and written quote. Please clarify questions with Kraken before the job.",
    "team": "Kraken may engage qualified third-party specialists but remains the sole contractual partner."
  },
  "es": {
    "deposit": "El anticipo existente del 15 % se mantiene; en las mudanzas por horas se calcula sobre el encargo mínimo, incluido el desplazamiento y, si corresponde, la limpieza y el descuento combinado.",
    "payment": "Pagos vía Payrexx, transferencia o QR-bill. El saldo vence a los 7 días de la factura.",
    "cancellation": "Cancelaciones por escrito. Tasas: >48 horas de antelación: gratis; <48 horas: 50% del importe; <12 horas, no presentación o cancelación en puerta: 100% del presupuesto. Un aplazamiento gratuito es permitido >24 horas antes, según disponibilidad.",
    "guarantee": "Garantía de entrega (Wohnungsabgabe): subsanación gratuita de deficiencias. Válido si: (a) notificado por escrito en 24h tras inspección con protocolo/fotos; (b) inspección en 72h tras limpieza; (c) propiedad desocupada e inutilizada. No cubre daños estructurales, desgaste o áreas excluidas.",
    "insurance": "La información sobre una posible cobertura de seguro figura en la documentación de la póliza y el presupuesto escrito correspondientes. Aclare sus dudas con Kraken antes del encargo.",
    "team": "Kraken puede contratar terceros cualificados pero sigue siendo el único socio contractual."
  },
  "pt": {
    "deposit": "O sinal existente de 15 % mantém-se; nas mudanças à hora é calculado sobre o serviço mínimo, incluindo deslocação e, quando aplicável, limpeza e desconto combinado.",
    "payment": "Pagamentos seguros via Payrexx, transferência ou fatura QR. O saldo restante vence 7 dias após a fatura.",
    "cancellation": "Os cancelamentos devem ser feitos por escrito. Taxas: aviso >48 horas: gratuito; <48 horas: 50% do valor; <12 horas, não-comparência ou cancelamento no local: 100% do orçamento. É permitido um adiamento gratuito com aviso >24 horas, sujeito a disponibilidade.",
    "guarantee": "Inclui a correção gratuita de quaisquer deficiências detetadas pelo senhorio na vistoria oficial (Abgabeprotokoll). Condições: (a) comunicado por escrito em 24h com protocolo/fotos; (b) vistoria em até 72h após a limpeza; (c) imóvel mantido desocupado e sem uso. Não cobre desgaste normal, danos estruturais ou áreas excluídas.",
    "insurance": "A informação sobre uma eventual cobertura de seguro consta dos documentos da apólice e do orçamento escrito correspondentes. Esclareça as suas dúvidas com a Kraken antes do serviço.",
    "team": "A Kraken pode subcontratar parceiros qualificados mas permanece como único parceiro contratual."
  },
  "it": {
    "deposit": "L’acconto esistente del 15% resta invariato; per i traslochi a ore è calcolato sull’incarico minimo, inclusi trasferta ed eventuali pulizia e sconto combinato.",
    "payment": "Pagamenti sicuri tramite Payrexx, bonifico o polizza QR. Il saldo è esigibile entro 7 giorni dalla fatturazione.",
    "cancellation": "Le cancellazioni devono essere formate per iscritto. Penali: preavviso >48 ore: gratuito; <48 ore: 50% del prezzo; <12 ore, mancata presentazione o cancellazione sul posto: 100% del preventivo. Un rinvio gratuito è consentito >24 ore prima dell'intervento, previa disponibilità.",
    "guarantee": "Include la risoluzione gratuita di qualsiasi lacuna riscontrata dal locatore durante il collaudo ufficiale (Abgabeprotokoll). Condizioni: (a) notifica scritta entro 24h con protocollo/foto; (b) collaudo ufficiale entro 72h dalla pulizia; (c) immobile rimasto sfitto e inutilizzato. Esclude la normale usura, difetti strutturali ed elementi esclusi.",
    "insurance": "Le informazioni su un’eventuale copertura assicurativa risultano dai relativi documenti di polizza e dal preventivo scritto. Chiarisca le sue domande con Kraken prima dell’incarico.",
    "team": "Kraken è libera di avvalersi di subappaltatori specializzati ma rimane l'unico partner contrattuale."
  },
  "fr": {
    "deposit": "L’acompte existant de 15 % reste inchangé ; pour les déménagements selon le temps passé, il est calculé sur le minimum, déplacement et éventuels nettoyage et réduction combinée compris.",
    "payment": "Règlements sécurisés via Payrexx, virement ou QR-facture. Le solde est exigible sous 7 jours dès facturation.",
    "cancellation": "Toute annulation doit être formulée par écrit. Indemnités: préavis >48 heures: gratuit; <48 heures: 50% du prix; <12 heures, non-présentation ou annulation sur place: 100% du devis. Un report gratuit est toléré >24 heures avant l'intervention, selon nos disponibilités.",
    "guarantee": "Comprend la rectification gratuite de toute lacune signalée par le bailleur lors de l'état des lieux officiel (Abgabeprotokoll). Conditions: (a) notification écrite sous 24h avec protocole/photos; (b) visite d'état des lieux sous 72h après nettoyage; (c) logement resté inoccupé et inutilisé. Exclut l'usure normale, défauts du bâtiment et éléments exclus.",
    "insurance": "Les informations sur une éventuelle couverture d’assurance figurent dans les documents de police correspondants et le devis écrit. Veuillez clarifier vos questions avec Kraken avant la prestation.",
    "team": "Kraken est libre de s'adjoindre des sous-traitants spécialisés mais demeure le seul interlocuteur contractuel."
  }
} as const;

/** Existing calculator inclusion copy. Locale order matches booking/uiCopy: de, en, es, fr, it, pt. */
export const END_OF_TENANCY_INCLUDED = {
  "de": "Im Pauschalpreis: komplette Küche, 1 Bad, Standardfenster und Böden. Abnahmegarantie für den vereinbarten Reinigungsumfang.",
  "en": "The fixed price includes a full kitchen, 1 bathroom, standard windows and floors. Handover guarantee for the agreed cleaning scope.",
  "es": "El precio cerrado incluye cocina completa, 1 baño, ventanas estándar y suelos. Garantía de entrega para la limpieza acordada.",
  "fr": "Le forfait comprend la cuisine complète, 1 salle de bains, les vitres standard et les sols. Garantie de remise pour le nettoyage convenu.",
  "it": "Il prezzo fisso comprende cucina completa, 1 bagno, finestre standard e pavimenti. Garanzia di consegna per la pulizia concordata.",
  "pt": "O preço fixo inclui cozinha completa, 1 casa de banho, janelas normais e pavimentos. Garantia de entrega para a limpeza acordada."
} as const;
export const END_OF_TENANCY_INCLUDED_ROW = [
  END_OF_TENANCY_INCLUDED.de, END_OF_TENANCY_INCLUDED.en, END_OF_TENANCY_INCLUDED.es,
  END_OF_TENANCY_INCLUDED.fr, END_OF_TENANCY_INCLUDED.it, END_OF_TENANCY_INCLUDED.pt,
] as const;
export function publicPolicyContent(language: HomeLanguage) { return PUBLIC_POLICY_CONTENT[language]; }
