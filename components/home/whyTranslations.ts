import type { HomeLanguage, HomeTextParams } from './homeTranslations';

type WhyTranslationRow = readonly [de: string, en: string, es: string, pt: string, it: string, fr: string];
const languages = ['de', 'en', 'es', 'pt', 'it', 'fr'] as const satisfies readonly HomeLanguage[];

/** Swiss German source copy and translations for the homepage content. */
export const whyTranslationRows = [
  ['Sie sehen, welche Arbeiten und Extras zu Ihrem Auftrag gehören.', 'See which tasks and extras are included in your request.', 'Vea qué trabajos y extras forman parte de su solicitud.', 'Veja os trabalhos e extras incluídos no seu pedido.', 'Consulti i lavori e gli extra inclusi nella sua richiesta.', 'Consultez les travaux et les options inclus dans votre demande.'],
  ['Erst prüfen, dann bestätigen.', 'Review first, then confirm.', 'Primero revisar, después confirmar.', 'Primeiro rever, depois confirmar.', 'Prima verificare, poi confermare.', 'Vérifier d’abord, confirmer ensuite.'],
  ['Gut zu wissen', 'Good to know', 'Conviene saberlo', 'É bom saber', 'Da sapere', 'Bon à savoir'],
  ['Ihr Auftrag.', 'Your job.', 'Su encargo.', 'O seu serviço.', 'Il suo intervento.', 'Votre prestation.'],
  ['Vorher klar.', 'Clear from the start.', 'Claro desde el principio.', 'Claro desde o início.', 'Chiaro fin dall’inizio.', 'Clair dès le départ.'],
  ['Vor der Bestätigung kennen Sie den vereinbarten Umfang, den Preis und den Termin.', 'Know the agreed scope, price and appointment before confirming.', 'Conozca el servicio, el precio y la fecha acordados antes de confirmar.', 'Conheça o serviço, o preço e a data acordados antes de confirmar.', 'Conosca le prestazioni, il prezzo e la data concordati prima di confermare.', 'Prenez connaissance des prestations, du prix et du rendez-vous convenus avant de confirmer.'],
  ['Leistungsumfang', 'Scope of work', 'Servicio incluido', 'Serviço incluído', 'Prestazioni incluse', 'Prestations incluses'],
  ['Nach Ihrer Auswahl', 'Based on your selection', 'Según su selección', 'Conforme a sua seleção', 'Secondo la sua selezione', 'Selon votre sélection'],
  ['Zusätze werden vorab vereinbart.', 'Extras are agreed in advance.', 'Los extras se acuerdan previamente.', 'Os extras são acordados previamente.', 'Gli extra vengono concordati in anticipo.', 'Les options sont convenues à l’avance.'],
  ['Termin', 'Appointment', 'Fecha', 'Data', 'Appuntamento', 'Rendez-vous'],
  ['Persönlich bestätigt', 'Personally confirmed', 'Confirmada personalmente', 'Confirmada pessoalmente', 'Confermato personalmente', 'Confirmé personnellement'],
  ['Ihr Wunschtermin ist noch keine bestätigte Buchung.', 'Your preferred date is not yet a confirmed booking.', 'La fecha solicitada aún no constituye una reserva confirmada.', 'A data pretendida ainda não constitui uma reserva confirmada.', 'La data desiderata non è ancora una prenotazione confermata.', 'La date souhaitée ne constitue pas encore une réservation confirmée.'],
  ['Warum Kraken?', 'Why Kraken?', '¿Por qué Kraken?', 'Porquê a Kraken?', 'Perché Kraken?', 'Pourquoi Kraken ?'],
  ['Sie wissen,', 'You know', 'Usted sabe', 'Sabe', 'Sa', 'Vous savez'],
  ['wer sich kümmert.', 'who is taking care of things.', 'quién se ocupa.', 'quem cuida de tudo.', 'chi se ne occupa.', 'qui s’en occupe.'],
  ["Ich bin Antonio, Ihr Ansprechpartner bei Kraken. Gemeinsam klären wir, was Sie brauchen. Die vereinbarten Arbeiten erledige ich sorgfältig und passend zu Ihrem Zuhause, bei Bedarf mit Helfern.", "I’m Antonio, your contact at Kraken. Together, we work out what you need. I carry out the agreed work with care and in a way that suits your home, with helpers when needed.", "Soy Antonio, su persona de contacto en Kraken. Juntos concretamos lo que necesita. Realizo los trabajos acordados con cuidado y adaptándome a su hogar, con ayudantes cuando sea necesario.", "Sou o Antonio, o seu contacto na Kraken. Juntos, definimos o que precisa. Realizo os trabalhos acordados com cuidado e de forma adequada à sua casa, com ajudantes quando necessário.", "Sono Antonio, il suo referente presso Kraken. Insieme definiamo ciò di cui ha bisogno. Svolgo i lavori concordati con cura e in modo adatto alla sua casa, con aiutanti quando necessario.", "Je suis Antonio, votre interlocuteur chez Kraken. Ensemble, nous définissons vos besoins. Je réalise les travaux convenus avec soin et en fonction de votre logement, avec des aides si nécessaire."],
  ['Antonio', 'Antonio', 'Antonio', 'Antonio', 'Antonio', 'Antonio'],
  ['Inhaber & Ihr Ansprechpartner', 'Owner & your contact', 'Propietario y su persona de contacto', 'Proprietário e o seu contacto', 'Titolare e suo referente', 'Propriétaire et votre interlocuteur'],
  ['Auftrag im Rechner planen', 'Plan your job in the calculator', 'Planificar el encargo en el calculador', 'Planear o serviço na calculadora', 'Pianificare il lavoro nel calcolatore', 'Planifier votre prestation dans le calculateur'],
  ['Die nächsten Schritte besprechen wir persönlich.', 'We discuss the next steps with you personally.', 'Acordamos personalmente los siguientes pasos.', 'Combinamos pessoalmente os próximos passos.', 'Concordiamo personalmente i prossimi passi.', 'Nous discutons personnellement des prochaines étapes avec vous.'],
  ['Für private Haushaltsleistungen können Sie die MwSt. nicht als Vorsteuer abziehen.', 'For services for your private household, you cannot deduct VAT as input tax.', 'En los servicios para su hogar particular no puede deducir el IVA soportado.', 'Nos serviços para a sua habitação particular, não pode deduzir o IVA suportado.', 'Per i servizi domestici privati non può dedurre l’IVA come imposta precedente.', 'Pour les prestations destinées à votre ménage privé, vous ne pouvez pas déduire la TVA au titre de l’impôt préalable.'],
  ['Deshalb zählt der Endpreis.', 'That is why the final price matters.', 'Por eso cuenta el precio final.', 'Por isso, o que conta é o preço final.', 'Per questo conta il prezzo finale.', 'C’est donc le prix final qui compte.'],
  ['Für Privathaushalte in', 'For private households in', 'Para hogares particulares en', 'Para casas particulares em', 'Per abitazioni private a', 'Pour les ménages privés à'],
  ['Zürich, Schaffhausen und Winterthur', 'Zurich, Schaffhausen and Winterthur', 'Zúrich, Schaffhausen y Winterthur', 'Zurique, Schaffhausen e Winterthur', 'Zurigo, Sciaffusa e Winterthur', 'Zurich, Schaffhouse et Winterthour'],
  ['Ihr Vorteil als Privathaushalt', 'Your advantage as a private household', 'Su ventaja como hogar particular', 'A sua vantagem enquanto cliente particular', 'Il suo vantaggio come cliente privato', 'Votre avantage en tant que particulier'],
  ['Keine MwSt.', 'No VAT', 'Sin IVA', 'Sem IVA', 'Niente IVA', 'Pas de TVA'],
  ['auf Ihrer Rechnung.', 'on your invoice.', 'en su factura.', 'na sua fatura.', 'sulla sua fattura.', 'sur votre facture.'],
  ['Kraken ist nicht mehrwertsteuerpflichtig. Deshalb stellen wir Ihnen keine Mehrwertsteuer in Rechnung.', 'Kraken is not liable for VAT. We therefore do not charge VAT on your invoice.', 'Kraken no está sujeto al IVA. Por eso no le facturamos IVA.', 'A Kraken não está sujeita a IVA. Por isso, não lhe faturamos IVA.', 'Kraken non è assoggettata all’IVA. Per questo non le addebitiamo l’IVA in fattura.', 'Kraken n’est pas assujettie à la TVA. Nous ne vous facturons donc pas de TVA.'],
  ['Kraken', 'Kraken', 'Kraken', 'Kraken', 'Kraken', 'Kraken'],
  ['Ohne MwSt.', 'Without VAT', 'Sin IVA', 'Sem IVA', 'Senza IVA', 'Sans TVA'],
  ['Ihr vereinbarter Preis.', 'Your agreed price.', 'Su precio acordado.', 'O seu preço acordado.', 'Il prezzo concordato.', 'Votre prix convenu.'],
  ['Auch für kleine Aufträge.', 'Small jobs are welcome too.', 'También para pequeños encargos.', 'Também para pequenos serviços.', 'Anche per piccoli lavori.', 'Même pour les petits travaux.'],
  ['Einzelne Fenster, Wohnungen bis 5.5 Zimmer und kleine Umzüge sind willkommen.', 'Individual windows, apartments with up to 5.5 rooms and small moves are welcome.', 'Aceptamos ventanas sueltas, viviendas de hasta 5,5 habitaciones y pequeñas mudanzas.', 'São bem-vindos pedidos para janelas individuais, casas com até 5,5 divisões e pequenas mudanças.', 'Sono benvenuti singole finestre, appartamenti fino a 5,5 locali e piccoli traslochi.', 'Fenêtres individuelles, appartements jusqu’à 5,5 pièces et petits déménagements sont les bienvenus.'],
  ['Vorher klar vereinbart.', 'Clearly agreed in advance.', 'Acordado claramente de antemano.', 'Claramente acordado de antemão.', 'Concordato prima, con chiarezza.', 'Convenu clairement à l’avance.'],
  ['Umfang und Preis besprechen wir vorab – ohne versteckte Zuschläge.', 'We agree the scope and price in advance, with no hidden surcharges.', 'Acordamos el alcance y el precio de antemano, sin recargos ocultos.', 'Combinamos o âmbito e o preço antecipadamente, sem encargos ocultos.', 'Concordiamo in anticipo prestazioni e prezzo, senza supplementi nascosti.', 'Nous convenons à l’avance des prestations et du prix, sans suppléments cachés.'],
  ['Einfach starten. Gut begleitet.', 'An easy start. Support along the way.', 'Empezar es fácil. Le acompañamos.', 'Começar é simples. Sempre com acompanhamento.', 'Iniziare è semplice. Con il giusto supporto.', 'Un début simple. Un bon accompagnement.'],
  ['Beginnen Sie im Rechner. Fragen und besondere Wünsche klären wir persönlich.', 'Start in the calculator. We discuss questions and special requests with you personally.', 'Empiece en el calculador. Aclaramos personalmente sus preguntas y peticiones especiales.', 'Comece na calculadora. Esclarecemos pessoalmente as suas dúvidas e pedidos especiais.', 'Inizi dal calcolatore. Chiariamo personalmente domande e richieste particolari.', 'Commencez dans le calculateur. Nous discutons personnellement de vos questions et demandes particulières.'],
  ['Abnahmegarantie bei Umzugsreinigungen', 'Handover guarantee for move-out cleaning', 'Garantía de aceptación para limpiezas de fin de alquiler', 'Garantia de aceitação nas limpezas de fim de arrendamento', 'Garanzia di riconsegna per le pulizie di fine locazione', 'Garantie de remise pour les nettoyages de fin de bail'],
  ['Für die vereinbarten Reinigungsarbeiten', 'For the agreed cleaning work', 'Para los trabajos de limpieza acordados', 'Para os trabalhos de limpeza acordados', 'Per i lavori di pulizia concordati', 'Pour les travaux de nettoyage convenus'],
  ['Betriebshaftpflichtversichert', 'Business liability insurance', 'Seguro de responsabilidad civil empresarial', 'Seguro de responsabilidade civil da empresa', 'Assicurazione di responsabilità civile aziendale', 'Assurance responsabilité civile professionnelle'],
  ['Persönlich klären, was Ihnen wichtig ist', 'Discussing what matters to you personally', 'Aclaramos personalmente lo que le importa', 'Esclarecemos pessoalmente o que é importante para si', 'Chiariamo personalmente ciò che conta per lei', 'Clarifier personnellement ce qui compte pour vous'],
  ['Kraken verfügt über eine Betriebs­haftpflicht­versicherung. Fragen zum Versicherungs­schutz klären wir persönlich mit Ihnen.', 'Kraken has business liability insurance. We discuss any questions about insurance cover with you personally.', 'Kraken dispone de un seguro de responsabilidad civil empresarial. Aclaramos personalmente con usted las dudas sobre la cobertura del seguro.', 'A Kraken dispõe de seguro de responsabilidade civil da empresa. Esclarecemos pessoalmente consigo as dúvidas sobre a cobertura do seguro.', 'Kraken dispone di un’assicurazione di responsabilità civile aziendale. Chiariamo personalmente con lei le domande sulla copertura assicurativa.', 'Kraken dispose d’une assurance responsabilité civile professionnelle. Nous clarifions personnellement avec vous les questions relatives à la couverture d’assurance.'],
  ['So einfach geht es.', 'It is this simple.', 'Así de sencillo.', 'É assim tão simples.', 'È così semplice.', 'C’est aussi simple.'],
  ['Im Rechner starten', 'Start in the calculator', 'Empezar en el calculador', 'Começar na calculadora', 'Iniziare nel calcolatore', 'Commencer dans le calculateur'],
  ['Persönlich abstimmen', 'Agree the details personally', 'Acordar los detalles personalmente', 'Combinar os detalhes pessoalmente', 'Concordare i dettagli personalmente', 'Convenir personnellement des détails'],
  ['Arbeit erledigen lassen', 'Let us take care of the work', 'Dejar el trabajo en nuestras manos', 'Deixar o trabalho connosco', 'Affidarci il lavoro', 'Nous confier le travail'],
  ['Weitere Vorteile für Ihren Haushalt', 'More benefits for your household', 'Más ventajas para su hogar', 'Mais vantagens para a sua casa', 'Altri vantaggi per la sua casa', 'D’autres avantages pour votre ménage'],
  ['Garantie und Versicherungsschutz', 'Guarantee and insurance cover', 'Garantía y cobertura del seguro', 'Garantia e cobertura do seguro', 'Garanzia e copertura assicurativa', 'Garantie et couverture d’assurance'],
] as const satisfies readonly WhyTranslationRow[];

export type WhyTranslationSource = typeof whyTranslationRows[number][0];
export const whyTranslationSources: readonly WhyTranslationSource[] = Object.freeze(whyTranslationRows.map(row => row[0]));
export const whyTranslations = Object.freeze(Object.fromEntries(languages.map((language, index) => [
  language,
  Object.freeze(Object.fromEntries(whyTranslationRows.map(row => [row[0], row[index]]))),
]))) as Readonly<Record<HomeLanguage, Readonly<Record<WhyTranslationSource, string>>>>;

/** Standalone lookup for previews; production can merge whyTranslationRows into the home registry. */
export function whyText(language: unknown, source: string, params?: HomeTextParams): string {
  const code = typeof language === 'string' ? language.trim().toLowerCase().replace(/_/g, '-').split('-')[0] : 'de';
  const key = source.replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
  const dictionary = whyTranslations[languages.includes(code as HomeLanguage) ? code as HomeLanguage : 'de'];
  const translated = Object.prototype.hasOwnProperty.call(dictionary, key) ? dictionary[key as WhyTranslationSource] : key;
  return translated.replace(/\{([A-Za-z][A-Za-z0-9_]*)\}/g, (placeholder, name: string) =>
    params && Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : placeholder);
}
