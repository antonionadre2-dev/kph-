import { homeText, normalizeHomeLanguage, type HomeLanguage } from '../../components/home/homeTranslations.ts';
import { publicPolicyContent, END_OF_TENANCY_INCLUDED } from './policyContent.ts';
import type { KaiService } from './types.ts';

/** Public facts only. Legal paragraphs are shared verbatim with the document rendered by /agb. */
export const KAI_CONTACT = Object.freeze({
  phone: '+41 77 450 57 05', telephone: 'tel:+41774505705',
  whatsapp: 'https://wa.me/41774505705', email: 'kai@krakenpfm.ch',
  address: 'Seewadelstrasse 3, 8203 Schaffhausen',
});
export const KAI_FACT_TOPICS = ['guarantee', 'regions', 'payment', 'vat', 'included', 'team', 'availability', 'duration', 'cancellation', 'insurance'] as const;
export type KaiFactTopic = typeof KAI_FACT_TOPICS[number];
export type KaiFact = { answer: string; contact: boolean };
const languages: readonly HomeLanguage[] = ['de', 'en', 'es', 'pt', 'it', 'fr'];
type Row = readonly [string, string, string, string, string, string];
const localized = (row: Row, language: HomeLanguage): string => row[languages.indexOf(language)];

const personal: Row = [
  'Das klären wir gern persönlich.', 'We will be happy to clarify that personally.',
  'Lo aclararemos con gusto personalmente.', 'Teremos todo o gosto em esclarecer pessoalmente.',
  'Lo chiariremo volentieri personalmente.', 'Nous clarifierons volontiers cela personnellement.',
];
const regions: Row = [
  'Wir arbeiten nur für Privathaushalte in Zürich, Schaffhausen und Winterthur. Geben Sie Ihre Postleitzahl an, damit wir den Einsatz und die Anfahrt prüfen können.',
  'We work only for private households in Zurich, Schaffhausen and Winterthur. Please give us your postcode so we can check the job location and travel.',
  'Trabajamos solo para hogares particulares en Zúrich, Schaffhausen y Winterthur. Indique su código postal para que podamos comprobar la ubicación y el desplazamiento.',
  'Trabalhamos apenas para casas particulares em Zurique, Schaffhausen e Winterthur. Indique o seu código postal para verificarmos a localização e a deslocação.',
  'Lavoriamo solo per abitazioni private a Zurigo, Schaffhausen e Winterthur. Indichi il codice postale per verificare la località e la trasferta.',
  'Nous intervenons uniquement chez les particuliers à Zurich, Schaffhouse et Winterthour. Indiquez votre code postal afin de vérifier le lieu et le déplacement.',
];
const vat: Row = [
  'Es wird keine Mehrwertsteuer verrechnet.', 'No VAT is charged.', 'No se cobra IVA.',
  'Não é cobrado IVA.', 'Non viene addebitata IVA.', 'Aucune TVA n’est facturée.',
];
const guaranteeScope: Row = [
  'Die Abnahmegarantie gilt für die Umzugsreinigung zum Pauschalpreis im vereinbarten Umfang. Die Reinigung auf Stundenbasis hat keine Abnahmegarantie.',
  'The handover guarantee applies to fixed-price end-of-tenancy cleaning for the agreed scope. Hourly cleaning has no handover guarantee.',
  'La garantía de entrega se aplica a la limpieza de fin de alquiler de precio fijo para el alcance acordado. La limpieza por horas no tiene garantía de entrega.',
  'A garantia de entrega aplica-se à limpeza de fim de arrendamento com preço fixo e no âmbito acordado. A limpeza à hora não tem garantia de entrega.',
  'La garanzia di consegna vale per le pulizie di fine locazione a prezzo fisso e per le prestazioni concordate. La pulizia a ore non ha garanzia di consegna.',
  'La garantie de remise s’applique au nettoyage de fin de bail au forfait pour les prestations convenues. Le nettoyage à l’heure n’a pas de garantie de remise.',
];
const included: Record<Exclude<KaiService, 'end'> | 'unspecified', Row> = {
  windows: [
    'Bei Fenstern stimmen wir Innen- und Aussenseiten, Rahmen und Fensterbänke anhand der sicheren Zugänglichkeit ab. Anzahl, Öffnungsart und Stockwerk helfen bei der Planung.',
    'For windows, we agree on inside and outside panes, frames and sills according to safe access. Quantity, opening type and floor help us plan.',
    'En las ventanas acordamos las caras interiores y exteriores, los marcos y los alféizares según el acceso seguro. La cantidad, la apertura y la planta ayudan a planificar.',
    'Nas janelas, combinamos faces interiores e exteriores, caixilhos e peitoris consoante o acesso seguro. A quantidade, a abertura e o piso ajudam a planear.',
    'Per i vetri concordiamo lati interni ed esterni, telai e davanzali in base all’accesso sicuro. Numero, apertura e piano aiutano a pianificare.',
    'Pour les vitres, nous convenons des faces intérieures et extérieures, cadres et rebords selon l’accès sécurisé. Le nombre, l’ouverture et l’étage facilitent la préparation.',
  ],
  regular: [
    'Wir vereinbaren wiederkehrende Aufgaben, Häufigkeit und Ihre Prioritäten. Reinigungsmittel und zusätzliche Arbeiten werden im Rechner separat ausgewählt.',
    'We agree on recurring tasks, frequency and your priorities. Products and additional work are selected separately in the calculator.',
    'Acordamos las tareas periódicas, la frecuencia y sus prioridades. Los productos y los trabajos adicionales se seleccionan por separado en el calculador.',
    'Combinamos as tarefas regulares, a frequência e as suas prioridades. Os produtos e trabalhos adicionais são selecionados separadamente no simulador.',
    'Concordiamo attività ricorrenti, frequenza e priorità. Prodotti e lavori aggiuntivi si selezionano separatamente nel calcolatore.',
    'Nous convenons des tâches récurrentes, de la fréquence et de vos priorités. Les produits et travaux supplémentaires sont sélectionnés séparément dans le calculateur.',
  ],
  deep: [
    'Eine Grundreinigung konzentriert sich einmalig intensiver auf die vereinbarten Bereiche und Verschmutzungen. Reinigungsmittel und Extras werden im Rechner ausgewählt.',
    'Deep cleaning focuses more intensively on the agreed areas and dirt in a one-off visit. Products and extras are selected in the calculator.',
    'La limpieza a fondo se centra una vez con mayor intensidad en las zonas y la suciedad acordadas. Los productos y extras se seleccionan en el calculador.',
    'A limpeza a fundo concentra-se uma vez, de forma mais intensiva, nas áreas e sujidade acordadas. Os produtos e extras são escolhidos no simulador.',
    'La pulizia approfondita si concentra una volta con maggiore intensità sulle zone e sullo sporco concordati. Prodotti ed extra si scelgono nel calcolatore.',
    'Le nettoyage en profondeur traite plus intensivement, lors d’une intervention ponctuelle, les zones et salissures convenues. Produits et options se choisissent dans le calculateur.',
  ],
  moving: [
    'Für kleine Umzüge nutzen wir einen Ford Transit. Wir planen anhand von Start- und Zieladresse, Möbeln, Kartons und Zugängen. Den vereinbarten Umfang zeigt die Auftragsbestätigung.',
    'We use a Ford Transit for small moves. We plan using collection and destination addresses, furniture, boxes and access. The order confirmation shows the agreed scope.',
    'Utilizamos una Ford Transit para pequeñas mudanzas. Planificamos según las direcciones de origen y destino, los muebles, las cajas y los accesos. La confirmación recoge el alcance acordado.',
    'Utilizamos uma Ford Transit para pequenas mudanças. Planeamos pelas moradas de origem e destino, móveis, caixas e acessos. A confirmação apresenta o âmbito acordado.',
    'Per i piccoli traslochi utilizziamo un Ford Transit. Pianifichiamo in base a partenza, destinazione, mobili, scatole e accessi. La conferma riporta le prestazioni concordate.',
    'Nous utilisons un Ford Transit pour les petits déménagements. Nous planifions selon les adresses, meubles, cartons et accès. La confirmation précise les prestations convenues.',
  ],
  unspecified: [
    'Der Leistungsumfang hängt vom gewählten Service und Ihren Angaben ab. Die ausgewählten Arbeiten werden im Rechner und in der Auftragsbestätigung ausgewiesen.',
    'The scope depends on your selected service and details. Selected work is shown in the calculator and order confirmation.',
    'El alcance depende del servicio elegido y de sus datos. Los trabajos seleccionados figuran en el calculador y en la confirmación del encargo.',
    'O âmbito depende do serviço escolhido e dos seus dados. Os trabalhos selecionados constam do simulador e da confirmação.',
    'Le prestazioni dipendono dal servizio scelto e dai suoi dati. I lavori selezionati sono indicati nel calcolatore e nella conferma.',
    'Les prestations dépendent du service choisi et de vos informations. Les travaux sélectionnés figurent dans le calculateur et la confirmation.',
  ],
};

/** No private data, provider status, price catalogue, or live availability is inferred here. */
export function getKaiFact(topic: KaiFactTopic, language: unknown, service?: KaiService | null): KaiFact {
  const locale = normalizeHomeLanguage(language);
  const policy = publicPolicyContent(locale);
  switch (topic) {
    case 'guarantee': return { answer: `${localized(guaranteeScope, locale)} ${policy.guarantee}`, contact: false };
    case 'regions': return { answer: localized(regions, locale), contact: false };
    case 'payment': return { answer: `${policy.payment} ${policy.deposit}`, contact: false };
    case 'vat': return { answer: localized(vat, locale), contact: false };
    case 'included': return { answer: service === 'end' ? END_OF_TENANCY_INCLUDED[locale] : localized(included[service || 'unspecified'], locale), contact: false };
    case 'team': return { answer: `${policy.team} ${localized(personal, locale)}`, contact: true };
    case 'availability':
    case 'duration': return { answer: localized(personal, locale), contact: true };
    case 'cancellation': return { answer: policy.cancellation, contact: false };
    case 'insurance': return { answer: `${localized(personal, locale)} ${policy.insurance}`, contact: true };
  }
}

const questions: Record<KaiFactTopic, Row> = {
  guarantee: ['Welche Abnahmegarantie gilt?', 'What handover guarantee applies?', '¿Qué garantía de entrega se aplica?', 'Que garantia de entrega se aplica?', 'Quale garanzia di consegna si applica?', 'Quelle garantie de remise s’applique ?'],
  regions: ['In welchen Regionen ist Kraken tätig?', 'Which areas does Kraken serve?', '¿En qué zonas trabaja Kraken?', 'Em que regiões trabalha a Kraken?', 'In quali regioni opera Kraken?', 'Dans quelles régions Kraken intervient-il ?'],
  payment: ['Wie bezahle ich und wie funktioniert die Anzahlung?', 'How do payment and the deposit work?', '¿Cómo funcionan el pago y el anticipo?', 'Como funcionam o pagamento e o sinal?', 'Come funzionano pagamento e acconto?', 'Comment fonctionnent le paiement et l’acompte ?'],
  vat: ['Wird Mehrwertsteuer verrechnet?', 'Is VAT charged?', '¿Se cobra IVA?', 'É cobrado IVA?', 'Viene addebitata IVA?', 'La TVA est-elle facturée ?'],
  included: ['Was ist enthalten?', 'What is included?', '¿Qué está incluido?', 'O que está incluído?', 'Che cosa è incluso?', 'Qu’est-ce qui est compris ?'],
  team: ['Wer kommt zu mir nach Hause?', 'Who comes to my home?', '¿Quién viene a mi casa?', 'Quem vai a minha casa?', 'Chi viene a casa mia?', 'Qui vient chez moi ?'],
  availability: ['Ist mein Wunschtermin verfügbar?', 'Is my preferred date available?', '¿Está disponible mi fecha preferida?', 'A data pretendida está disponível?', 'La data desiderata è disponibile?', 'La date souhaitée est-elle disponible ?'],
  duration: ['Wie lange dauert der Auftrag?', 'How long does the job take?', '¿Cuánto dura el servicio?', 'Quanto tempo demora o serviço?', 'Quanto dura il servizio?', 'Combien de temps dure l’intervention ?'],
  cancellation: ['Wie kann ich absagen oder verschieben?', 'How can I cancel or reschedule?', '¿Cómo puedo cancelar o aplazar?', 'Como posso cancelar ou adiar?', 'Come posso annullare o rinviare?', 'Comment annuler ou reporter ?'],
  insurance: ['Welche Versicherung gilt?', 'What insurance applies?', '¿Qué seguro se aplica?', 'Que seguro se aplica?', 'Quale assicurazione si applica?', 'Quelle assurance s’applique ?'],
};
export function getKaiFaqs(language: unknown, topics: readonly KaiFactTopic[] = KAI_FACT_TOPICS, service?: KaiService | null) {
  const locale = normalizeHomeLanguage(language);
  return topics.map(topic => ({ question: localized(questions[topic], locale), ...getKaiFact(topic, locale, service) }));
}

const HOME_FAQS = [
  ['Übernehmen Sie auch kleine Aufträge?', 'Ja. Wir konzentrieren uns auf Privathaushalte, Wohnungen mit 1–4 Zimmern und kleine Umzüge. Auch eine einzelne Fensterreinigung oder eine einmalige Grundreinigung können Sie anfragen.'],
  ['Wie plane ich meinen Auftrag?', 'Wählen Sie im Rechner die gewünschte Leistung und geben Sie die Details zu Ihrer Wohnung oder Ihrem Umzug an.'],
  ['Welches Fahrzeug nutzen Sie für kleine Umzüge?', 'Wir nutzen einen Ford Transit. Teilen Sie uns mit, welche Möbel und Kartons transportiert werden sollen und wie die Zugänge aussehen. So können wir Fahrzeug, Helfer und benötigte Fahrten passend abstimmen.'],
];
/** Public FAQ content shared by visible Home and deferred SEO, without an SEO graph dependency. */
export function getHomeFaqs(language: string) {
  const basics = HOME_FAQS.map(([question,answer]) => ({question:homeText(language,question),answer:homeText(language,answer)}));
  return [...basics.slice(0, 2), ...getKaiFaqs(language).map(({question, answer}) => ({question, answer})), ...basics.slice(2)];
}
