export type RecoveryLanguage = 'de' | 'en' | 'es' | 'fr' | 'it' | 'pt';
export type RecoveryEmailKind = 'saved' | 'first' | 'last';

export interface RecoveryCopy {
  title: string; intro: string; emailLabel: string; emailPlaceholder: string;
  consent: string; privacy: string; save: string; saving: string; chooseService: string;
  invalidEmail: string; unavailable: string; retry: string;
  previewSaved: string; previewNoReminders: string; previewWithReminders: string;
  queued: string; sent: string; deliveryUnknown: string; savedNoDelivery: string;
  liveReminderNote: string; liveNoReminderNote: string;
  previewOnly: string; previewEmails: string; modalTitle: string; modalIntro: string;
  close: string; tabsLabel: string; savedTab: string; firstTab: string; lastTab: string;
  subject: string; sender: string; recipient: string; sampleEmail: string;
  service: string; selectedPrice: string; individualPrice: string; vat: string;
  comparison: string; comparisonDetail: string; hypotheticalGross: string;
  noReservation: string; emailCta: string; demoCta: string;
  unsubscribe: string; requestedEmail: string; reminderEmail: string; signature: string;
  services: Record<'regular' | 'deep' | 'endOfTenancy' | 'construction' | 'windows' | 'moving' | 'unknown', string>;
  emails: Record<RecoveryEmailKind, { subject: string; title: string; body: string; support: string }>;
}

export const RECOVERY_COPY: Record<RecoveryLanguage, RecoveryCopy> = {
  de: {
    title: 'Noch nicht bereit? Später weitermachen.', intro: 'Ihre Auswahl und Ihren Preis per E-Mail erhalten. Ohne Konto.',
    emailLabel: 'Ihre E-Mail-Adresse', emailPlaceholder: 'name@beispiel.ch',
    consent: 'Ja, Kraken darf mich bis zu zweimal per E-Mail an diese Anfrage erinnern, nach etwa 4 und 24 Stunden. Jederzeit abmeldbar.',
    privacy: 'Ihre E-Mail wird für Ihre Offerte verwendet. Erinnerungen sind freiwillig; Sie können auch ohne sie fortfahren.',
    save: 'Offerte per E-Mail erhalten', saving: 'Offerte wird gespeichert …', chooseService: 'Wählen Sie zuerst eine Leistung und vervollständigen Sie die Angaben.',
    invalidEmail: 'Bitte geben Sie eine gültige E-Mail-Adresse ein.', unavailable: 'Ihre Offerte konnte gerade nicht gespeichert werden. Ihre Auswahl bleibt hier erhalten.', retry: 'Bitte versuchen Sie es später erneut.',
    previewSaved: 'Auswahl in dieser Vorschau übernommen. Es wurde keine E-Mail versendet.',
    previewNoReminders: 'Keine Erinnerungen ausgewählt. Die Vorschau überträgt oder speichert Ihre E-Mail nicht.',
    previewWithReminders: 'Vorschau: maximal zwei Erinnerungen nach etwa 4 und 24 Stunden. Es wird nichts gesendet oder dauerhaft gespeichert.',
    queued: 'Ihre Auswahl ist gespeichert. Die E-Mail ist zum Versand vorgemerkt.', sent: 'Ihre Auswahl ist gespeichert. Der E-Mail-Versand wurde bestätigt.',
    deliveryUnknown: 'Ihre Auswahl ist gespeichert. Der Versandstatus ist noch nicht bestätigt.', savedNoDelivery: 'Ihre Auswahl ist gespeichert. Die E-Mail konnte noch nicht versendet werden.',
    liveReminderNote: 'Sie haben bis zu zwei Erinnerungen gewählt. Sobald Ihre Anfrage abgeschlossen ist oder Sie sich abmelden, endet die Erinnerung.',
    liveNoReminderNote: 'Sie erhalten die angeforderte Offerte, aber keine Erinnerungsserie.',
    previewOnly: 'Designvorschau · keine Datenübermittlung', previewEmails: 'E-Mails ansehen', modalTitle: 'So sehen Ihre Kraken-E-Mails aus',
    modalIntro: 'Drei Beispiele mit Ihrer aktuellen Auswahl. Diese Vorschau sendet keine E-Mails.', close: 'E-Mail-Vorschau schliessen', tabsLabel: 'E-Mail-Beispiele',
    savedTab: 'Beim Speichern', firstTab: 'Nach etwa 4 h', lastTab: 'Nach etwa 24 h',
    subject: 'Betreff', sender: 'Von', recipient: 'An', sampleEmail: 'kunde@beispiel.ch',
    service: 'Ihre Auswahl', selectedPrice: 'Aktueller Preis', individualPrice: 'Individuelle Offerte', vat: 'MwSt. · nicht mehrwertsteuerpflichtig',
    comparison: 'Rechnerischer MwSt.-Vorteil', comparisonDetail: 'Vergleich mit demselben Nettopreis plus 8.1 % MwSt. Kein weiterer Rabatt und kein Preis eines anderen Anbieters.',
    hypotheticalGross: 'Gleicher Nettopreis mit MwSt.', noReservation: 'Es ist noch kein Termin reserviert. Preis und Verfügbarkeit werden beim Fortsetzen geprüft.',
    emailCta: 'Meine Planung fortsetzen', demoCta: 'Beispiel-Button: In der echten E-Mail führt er zurück zu Ihrer gespeicherten Auswahl.',
    unsubscribe: 'Erinnerungen abbestellen', requestedEmail: 'Sie erhalten diese E-Mail, weil Sie Ihre Offerte angefordert haben.',
    reminderEmail: 'Nur mit Ihrer Einwilligung: maximal zwei Erinnerungen zu dieser Anfrage. Eine Abmeldung beendet die Serie.', signature: 'Persönlich für Sie da · Ihr Kraken-Team',
    services: { regular:'Regelmässige Reinigung',deep:'Grundreinigung',endOfTenancy:'Umzugsreinigung',construction:'Baureinigung',windows:'Fensterreinigung',moving:'Kleiner Umzug',unknown:'Ihre gewählte Leistung' },
    emails: {
      saved: { subject:'Ihre Kraken-Offerte – einfach später weitermachen',title:'Ihre Auswahl ist für Sie da.',body:'Hier finden Sie Ihre aktuelle Auswahl. Öffnen Sie Ihre Planung, wenn es für Sie passt, und machen Sie dort weiter, wo Sie aufgehört haben.',support:'Noch eine Frage? Antworten Sie einfach auf diese E-Mail. Wir helfen Ihnen persönlich.' },
      first: { subject:'Ihre Auswahl ist gespeichert. Möchten Sie weiterplanen?',title:'Ein kleiner Schritt zu mehr Entlastung.',body:'Ihre Anfrage ist noch nicht abgeschlossen. Ihre Auswahl ist bereits vorbereitet – Sie können sie in Ruhe prüfen und fortsetzen.',support:'Unsicher beim Umfang oder beim Termin? Antworten Sie uns; gemeinsam finden wir heraus, was Sie brauchen.' },
      last: { subject:'Noch eine Frage zu Ihrer Reinigung? Wir helfen persönlich.',title:'Wir sind da, wenn Sie uns brauchen.',body:'Dies ist unsere letzte Erinnerung zu dieser Auswahl. Prüfen Sie Ihren Service und die gewählten Extras, wenn Sie Ihre Anfrage abschliessen möchten.',support:'Lieber persönlich besprechen? Sie erreichen uns täglich von 09:00 bis 19:00 unter +41 77 450 57 05.' },
    },
  },
  en: {
    title: 'Not ready yet? Continue later.', intro: 'Get your selection and price by email. No account needed.',
    emailLabel: 'Your email address', emailPlaceholder: 'name@example.com',
    consent: 'Yes, Kraken may email me up to two reminders about this enquiry, after about 4 and 24 hours. I can unsubscribe at any time.',
    privacy: 'We use your email for this quote. Reminders are optional; you can continue without them.',
    save: 'Email my quote', saving: 'Saving your quote…', chooseService: 'Choose a service and complete its details first.',
    invalidEmail: 'Please enter a valid email address.', unavailable: 'We could not save your quote just now. Your selection is still here.', retry: 'Please try again later.',
    previewSaved: 'Selection accepted in this preview. No email has been sent.',
    previewNoReminders: 'No reminders selected. The preview does not transmit or store your email.',
    previewWithReminders: 'Preview: up to two reminders after about 4 and 24 hours. Nothing is sent or saved permanently.',
    queued: 'Your selection is saved. The email is queued for sending.', sent: 'Your selection is saved. Email sending has been confirmed.',
    deliveryUnknown: 'Your selection is saved. The sending status is not yet confirmed.', savedNoDelivery: 'Your selection is saved. The email could not be sent yet.',
    liveReminderNote: 'You selected up to two reminders. They stop when you complete the enquiry or unsubscribe.', liveNoReminderNote: 'You will receive the requested quote, without a reminder series.',
    previewOnly: 'Design preview · no data transmission', previewEmails: 'Preview emails', modalTitle: 'Your Kraken email experience',
    modalIntro: 'Three examples using your current selection. This preview does not send emails.', close: 'Close email preview', tabsLabel: 'Email examples',
    savedTab: 'When saved', firstTab: 'After about 4 h', lastTab: 'After about 24 h',
    subject: 'Subject', sender: 'From', recipient: 'To', sampleEmail: 'customer@example.com',
    service: 'Your selection', selectedPrice: 'Current price', individualPrice: 'Personal quote', vat: 'VAT · not VAT registered',
    comparison: 'Illustrative VAT advantage', comparisonDetail: 'Compared with the same net price plus 8.1% VAT. This is not an additional discount or another provider’s price.',
    hypotheticalGross: 'Same net price with VAT', noReservation: 'No appointment has been reserved yet. Price and availability are checked when you continue.',
    emailCta: 'Continue my plan', demoCta: 'Example button: in the actual email, this returns to your saved selection.',
    unsubscribe: 'Unsubscribe from reminders', requestedEmail: 'You receive this email because you requested your quote.',
    reminderEmail: 'Only with your consent: up to two reminders about this enquiry. Unsubscribing ends the series.', signature: 'Here for you, personally · Your Kraken team',
    services: { regular:'Regular cleaning',deep:'Deep cleaning',endOfTenancy:'End-of-tenancy cleaning',construction:'Post-construction cleaning',windows:'Window cleaning',moving:'Small move',unknown:'Your selected service' },
    emails: {
      saved: { subject:'Your Kraken quote – ready when you are',title:'Your selection is here for you.',body:'Here is your current selection. Open your plan whenever it suits you and continue where you left off.',support:'Have a question? Reply to this email. We are here to help you personally.' },
      first: { subject:'Your selection is saved. Ready to continue?',title:'One small step towards a lighter day.',body:'Your enquiry is not complete yet. Your selection is already prepared, so you can review it and continue in your own time.',support:'Unsure about the service or appointment? Reply and we will help you work out what you need.' },
      last: { subject:'A question about your cleaning? We can help.',title:'Here when you need us.',body:'This is our last reminder about this selection. Review your service and chosen extras if you would like to finish your enquiry.',support:'Prefer a conversation? Call +41 77 450 57 05 any day from 09:00 to 19:00.' },
    },
  },
  es: {
    title: 'Guardar presupuesto y seguir después', intro: "Reciba su selección y su precio por email. Sin crear una cuenta.",
    emailLabel: "Su dirección de email", emailPlaceholder: 'nombre@ejemplo.com',
    consent: 'Sí, Kraken puede enviarme hasta dos recordatorios sobre esta solicitud, aproximadamente a las 4 y 24 horas. Puedo darme de baja cuando quiera.',
    privacy: "Usamos su email para este presupuesto. Los recordatorios son opcionales; puede continuar sin ellos.",
    save: 'Recibir mi presupuesto por email', saving: "Guardando su presupuesto…", chooseService: "Primero elija un servicio y complete sus datos.",
    invalidEmail: "Introduzca una dirección de email válida.", unavailable: "No hemos podido guardar su presupuesto ahora. Su selección sigue aquí.", retry: "Vuelva a intentarlo más tarde.",
    previewSaved: 'Selección recogida en esta vista previa. No se ha enviado ningún email.',
    previewNoReminders: "Sin recordatorios seleccionados. La vista previa no transmite ni almacena su email.",
    previewWithReminders: 'Vista previa: hasta dos recordatorios, aproximadamente a las 4 y 24 horas. No se envía ni se guarda nada de forma permanente.',
    queued: "Su selección está guardada. El email está pendiente de envío.", sent: "Su selección está guardada. Se ha confirmado el envío del email.",
    deliveryUnknown: "Su selección está guardada. El estado del envío todavía no está confirmado.", savedNoDelivery: "Su selección está guardada. El email aún no se ha podido enviar.",
    liveReminderNote: "Ha elegido hasta dos recordatorios. Se detienen cuando completa la solicitud o se da de baja.", liveNoReminderNote: "Recibirá el presupuesto solicitado, sin una serie de recordatorios.",
    previewOnly: 'Vista de diseño · no se transmiten datos', previewEmails: 'Ver los emails', modalTitle: "Así serán sus emails de Kraken",
    modalIntro: "Tres ejemplos con su selección actual. Esta vista previa no envía emails.", close: 'Cerrar vista previa de emails', tabsLabel: 'Ejemplos de emails',
    savedTab: 'Al guardar', firstTab: 'Aprox. 4 h después', lastTab: 'Aprox. 24 h después',
    subject: 'Asunto', sender: 'De', recipient: 'Para', sampleEmail: 'cliente@ejemplo.com',
    service: "Su selección", selectedPrice: 'Precio actual', individualPrice: 'Presupuesto personalizado', vat: 'IVA · no sujeto a facturación de IVA',
    comparison: 'Ventaja comparativa del IVA', comparisonDetail: 'Comparación con el mismo precio neto más un 8.1 % de IVA. No es un descuento adicional ni el precio de otra empresa.',
    hypotheticalGross: 'Mismo precio neto con IVA', noReservation: 'Todavía no hay una cita reservada. Comprobamos el precio y la disponibilidad al continuar.',
    emailCta: 'Continuar mi solicitud', demoCta: 'Botón de ejemplo: en el email real permite volver a la selección guardada.',
    unsubscribe: 'Dejar de recibir recordatorios', requestedEmail: "Ha recibido este email porque ha solicitado su presupuesto.",
    reminderEmail: "Solo con su consentimiento: hasta dos recordatorios sobre esta solicitud. Al darse de baja se detiene la serie.", signature: "Atención personal, de verdad · Su equipo de Kraken",
    services: { regular:'Limpieza regular',deep:'Limpieza profunda',endOfTenancy:"Limpieza de fin de alquiler",construction:'Limpieza de fin de obra',windows:'Limpieza de ventanas',moving:'Pequeña mudanza',unknown:"Su servicio seleccionado" },
    emails: {
      saved: { subject:"Su presupuesto de Kraken: continúe cuando quiera",title:"Su selección está aquí para usted.",body:"Aquí tiene su selección actual. Abra su solicitud cuando le venga bien y continúe donde lo dejó.",support:"¿Tiene alguna pregunta? Responda a este email. Le ayudamos personalmente." },
      first: { subject:"Su selección está guardada. ¿Seguimos?",title:'Un pequeño paso para un día más fácil.',body:"Su solicitud todavía no está completa. La selección ya está preparada para que pueda revisarla y continuar con tranquilidad.",support:"¿Dudas sobre el servicio o la fecha? Respóndanos y le ayudaremos a definir lo que necesita." },
      last: { subject:"¿Una duda sobre su limpieza? Le ayudamos personalmente.",title:"Estamos aquí cuando nos necesite.",body:"Este es nuestro último recordatorio sobre esta selección. Revise su servicio y los extras elegidos si quiere completar la solicitud.",support:"¿Prefiere hablar? Llámenos al +41 77 450 57 05, todos los días de 09:00 a 19:00." },
    },
  },
  fr: {
    title: 'Pas encore prêt ? Reprenez plus tard.', intro: 'Recevez votre sélection et votre prix par e-mail. Sans créer de compte.',
    emailLabel: 'Votre adresse e-mail', emailPlaceholder: 'nom@exemple.ch',
    consent: 'Oui, Kraken peut m’envoyer jusqu’à deux rappels pour cette demande, après environ 4 et 24 heures. Je peux me désinscrire à tout moment.',
    privacy: 'Votre e-mail sert à ce devis. Les rappels sont facultatifs ; vous pouvez continuer sans les accepter.',
    save: 'Recevoir mon devis par e-mail', saving: 'Enregistrement du devis…', chooseService: 'Choisissez d’abord une prestation et complétez ses détails.',
    invalidEmail: 'Veuillez saisir une adresse e-mail valide.', unavailable: 'Votre devis n’a pas pu être enregistré. Votre sélection reste disponible ici.', retry: 'Veuillez réessayer plus tard.',
    previewSaved: 'Sélection reprise dans cet aperçu. Aucun e-mail n’a été envoyé.',
    previewNoReminders: 'Aucun rappel sélectionné. Cet aperçu ne transmet ni ne stocke votre e-mail.',
    previewWithReminders: 'Aperçu : deux rappels au maximum, après environ 4 et 24 heures. Rien n’est envoyé ni enregistré durablement.',
    queued: 'Votre sélection est enregistrée. L’e-mail est en attente d’envoi.', sent: 'Votre sélection est enregistrée. L’envoi de l’e-mail a été confirmé.',
    deliveryUnknown: 'Votre sélection est enregistrée. L’état de l’envoi n’est pas encore confirmé.', savedNoDelivery: 'Votre sélection est enregistrée. L’e-mail n’a pas encore pu être envoyé.',
    liveReminderNote: 'Vous avez choisi jusqu’à deux rappels. Ils cessent lorsque vous terminez la demande ou vous désinscrivez.', liveNoReminderNote: 'Vous recevrez le devis demandé, sans série de rappels.',
    previewOnly: 'Aperçu du design · aucune transmission de données', previewEmails: 'Voir les e-mails', modalTitle: 'Vos e-mails Kraken',
    modalIntro: 'Trois exemples avec votre sélection actuelle. Cet aperçu n’envoie aucun e-mail.', close: 'Fermer l’aperçu des e-mails', tabsLabel: 'Exemples d’e-mails',
    savedTab: 'À l’enregistrement', firstTab: 'Environ 4 h après', lastTab: 'Environ 24 h après',
    subject: 'Objet', sender: 'De', recipient: 'À', sampleEmail: 'client@exemple.ch',
    service: 'Votre sélection', selectedPrice: 'Prix actuel', individualPrice: 'Devis personnalisé', vat: 'TVA · non assujetti à la TVA',
    comparison: 'Avantage de TVA théorique', comparisonDetail: 'Comparaison avec le même prix net majoré de 8.1 % de TVA. Il ne s’agit ni d’une remise supplémentaire ni du prix d’un autre prestataire.',
    hypotheticalGross: 'Même prix net avec TVA', noReservation: 'Aucun rendez-vous n’est encore réservé. Le prix et la disponibilité sont vérifiés lorsque vous reprenez.',
    emailCta: 'Reprendre ma demande', demoCta: 'Bouton d’exemple : dans l’e-mail réel, il permet de retrouver votre sélection enregistrée.',
    unsubscribe: 'Se désinscrire des rappels', requestedEmail: 'Vous recevez cet e-mail parce que vous avez demandé votre devis.',
    reminderEmail: 'Avec votre accord uniquement : deux rappels au maximum pour cette demande. La désinscription met fin à la série.', signature: 'Un contact personnel · Votre équipe Kraken',
    services: { regular:'Nettoyage régulier',deep:'Nettoyage en profondeur',endOfTenancy:'Nettoyage de fin de bail',construction:'Nettoyage après travaux',windows:'Nettoyage des vitres',moving:'Petit déménagement',unknown:'Votre prestation sélectionnée' },
    emails: {
      saved: { subject:'Votre devis Kraken : reprenez quand vous le souhaitez',title:'Votre sélection vous attend.',body:'Voici votre sélection actuelle. Ouvrez votre demande quand cela vous convient et reprenez là où vous vous êtes arrêté.',support:'Une question ? Répondez à cet e-mail. Nous vous accompagnons personnellement.' },
      first: { subject:'Votre sélection est enregistrée. On continue ?',title:'Un petit pas pour alléger votre quotidien.',body:'Votre demande n’est pas encore terminée. Votre sélection est prête : vous pouvez la vérifier et continuer tranquillement.',support:'Une hésitation sur la prestation ou la date ? Répondez-nous ; nous vous aiderons à préciser vos besoins.' },
      last: { subject:'Une question sur votre nettoyage ? Nous sommes là.',title:'À vos côtés quand vous en avez besoin.',body:'Voici notre dernier rappel pour cette sélection. Vérifiez votre prestation et vos options si vous souhaitez finaliser la demande.',support:'Vous préférez en parler ? Appelez le +41 77 450 57 05, tous les jours de 09:00 à 19:00.' },
    },
  },
  it: {
    title: 'Non è il momento? Continua più tardi.', intro: 'Ricevi la selezione e il prezzo via e-mail. Senza creare un account.',
    emailLabel: 'Il tuo indirizzo e-mail', emailPlaceholder: 'nome@esempio.ch',
    consent: 'Sì, Kraken può inviarmi fino a due promemoria per questa richiesta, dopo circa 4 e 24 ore. Posso annullare l’iscrizione in qualsiasi momento.',
    privacy: 'Usiamo l’e-mail per questo preventivo. I promemoria sono facoltativi: puoi continuare senza accettarli.',
    save: 'Ricevi il preventivo via e-mail', saving: 'Salvataggio del preventivo…', chooseService: 'Scegli prima un servizio e completa i dettagli.',
    invalidEmail: 'Inserisci un indirizzo e-mail valido.', unavailable: 'Non è stato possibile salvare il preventivo. La tua selezione è ancora qui.', retry: 'Riprova più tardi.',
    previewSaved: 'Selezione acquisita nell’anteprima. Non è stata inviata alcuna e-mail.',
    previewNoReminders: 'Nessun promemoria selezionato. L’anteprima non trasmette né memorizza la tua e-mail.',
    previewWithReminders: 'Anteprima: fino a due promemoria dopo circa 4 e 24 ore. Non viene inviato o salvato nulla in modo permanente.',
    queued: 'La selezione è salvata. L’e-mail è in attesa di invio.', sent: 'La selezione è salvata. L’invio dell’e-mail è stato confermato.',
    deliveryUnknown: 'La selezione è salvata. Lo stato dell’invio non è ancora confermato.', savedNoDelivery: 'La selezione è salvata. L’e-mail non è ancora stata inviata.',
    liveReminderNote: 'Hai scelto fino a due promemoria. Si interrompono quando completi la richiesta o annulli l’iscrizione.', liveNoReminderNote: 'Riceverai il preventivo richiesto, senza una serie di promemoria.',
    previewOnly: 'Anteprima del design · nessun invio di dati', previewEmails: 'Guarda le e-mail', modalTitle: 'Le tue e-mail Kraken',
    modalIntro: 'Tre esempi con la tua selezione attuale. Questa anteprima non invia e-mail.', close: 'Chiudi anteprima e-mail', tabsLabel: 'Esempi di e-mail',
    savedTab: 'Al salvataggio', firstTab: 'Dopo circa 4 h', lastTab: 'Dopo circa 24 h',
    subject: 'Oggetto', sender: 'Da', recipient: 'A', sampleEmail: 'cliente@esempio.ch',
    service: 'La tua selezione', selectedPrice: 'Prezzo attuale', individualPrice: 'Preventivo personalizzato', vat: 'IVA · non assoggettato all’IVA',
    comparison: 'Vantaggio IVA indicativo', comparisonDetail: 'Confronto con lo stesso prezzo netto più l’8.1% di IVA. Non è uno sconto aggiuntivo né il prezzo di un altro fornitore.',
    hypotheticalGross: 'Stesso prezzo netto con IVA', noReservation: 'Nessun appuntamento è ancora prenotato. Prezzo e disponibilità vengono verificati quando continui.',
    emailCta: 'Continua la mia richiesta', demoCta: 'Pulsante di esempio: nell’e-mail reale riapre la tua selezione salvata.',
    unsubscribe: 'Annulla i promemoria', requestedEmail: 'Ricevi questa e-mail perché hai richiesto il tuo preventivo.',
    reminderEmail: 'Solo con il tuo consenso: fino a due promemoria per questa richiesta. L’annullamento interrompe la serie.', signature: 'Ci siamo per te · Il tuo team Kraken',
    services: { regular:'Pulizia regolare',deep:'Pulizia profonda',endOfTenancy:'Pulizia di fine locazione',construction:'Pulizia dopo lavori',windows:'Pulizia delle finestre',moving:'Piccolo trasloco',unknown:'Il servizio selezionato' },
    emails: {
      saved: { subject:'Il tuo preventivo Kraken: continua quando vuoi',title:'La tua selezione è qui per te.',body:'Ecco la tua selezione attuale. Apri la richiesta quando ti è comodo e riprendi da dove avevi lasciato.',support:'Una domanda? Rispondi a questa e-mail. Ti aiutiamo personalmente.' },
      first: { subject:'La tua selezione è salvata. Vuoi continuare?',title:'Un piccolo passo per una giornata più leggera.',body:'La tua richiesta non è ancora completa. La selezione è già pronta: puoi rivederla e continuare con calma.',support:'Dubbi sul servizio o sulla data? Rispondici e ti aiuteremo a capire cosa ti serve.' },
      last: { subject:'Una domanda sulla pulizia? Ti aiutiamo volentieri.',title:'Qui quando hai bisogno di noi.',body:'Questo è l’ultimo promemoria per questa selezione. Rivedi il servizio e gli extra scelti se vuoi completare la richiesta.',support:'Preferisci parlarne? Chiama il +41 77 450 57 05 ogni giorno dalle 09:00 alle 19:00.' },
    },
  },
  pt: {
    title: 'Ainda não? Continue mais tarde.', intro: 'Receba a sua seleção e o preço por e-mail. Sem criar uma conta.',
    emailLabel: 'O seu endereço de e-mail', emailPlaceholder: 'nome@exemplo.com',
    consent: 'Sim, a Kraken pode enviar-me até dois lembretes sobre este pedido, após cerca de 4 e 24 horas. Posso cancelar a qualquer momento.',
    privacy: 'Usamos o seu e-mail para este orçamento. Os lembretes são opcionais; pode continuar sem os aceitar.',
    save: 'Receber orçamento por e-mail', saving: 'A guardar o orçamento…', chooseService: 'Escolha primeiro um serviço e preencha os detalhes.',
    invalidEmail: 'Introduza um endereço de e-mail válido.', unavailable: 'Não foi possível guardar o orçamento. A sua seleção continua aqui.', retry: 'Tente novamente mais tarde.',
    previewSaved: 'Seleção recolhida nesta pré-visualização. Não foi enviado nenhum e-mail.',
    previewNoReminders: 'Sem lembretes selecionados. A pré-visualização não transmite nem armazena o seu e-mail.',
    previewWithReminders: 'Pré-visualização: até dois lembretes após cerca de 4 e 24 horas. Nada é enviado ou guardado permanentemente.',
    queued: 'A sua seleção está guardada. O e-mail aguarda envio.', sent: 'A sua seleção está guardada. O envio do e-mail foi confirmado.',
    deliveryUnknown: 'A sua seleção está guardada. O estado do envio ainda não está confirmado.', savedNoDelivery: 'A sua seleção está guardada. O e-mail ainda não pôde ser enviado.',
    liveReminderNote: 'Escolheu até dois lembretes. Terminam quando conclui o pedido ou cancela a subscrição.', liveNoReminderNote: 'Receberá o orçamento pedido, sem uma série de lembretes.',
    previewOnly: 'Pré-visualização do design · sem transmissão de dados', previewEmails: 'Ver os e-mails', modalTitle: 'Os seus e-mails Kraken',
    modalIntro: 'Três exemplos com a sua seleção atual. Esta pré-visualização não envia e-mails.', close: 'Fechar pré-visualização de e-mails', tabsLabel: 'Exemplos de e-mails',
    savedTab: 'Ao guardar', firstTab: 'Cerca de 4 h depois', lastTab: 'Cerca de 24 h depois',
    subject: 'Assunto', sender: 'De', recipient: 'Para', sampleEmail: 'cliente@exemplo.com',
    service: 'A sua seleção', selectedPrice: 'Preço atual', individualPrice: 'Orçamento personalizado', vat: 'IVA · não sujeito a faturação de IVA',
    comparison: 'Vantagem comparativa de IVA', comparisonDetail: 'Comparação com o mesmo preço líquido acrescido de 8.1% de IVA. Não é um desconto adicional nem o preço de outra empresa.',
    hypotheticalGross: 'Mesmo preço líquido com IVA', noReservation: 'Ainda não há uma data reservada. O preço e a disponibilidade são verificados ao continuar.',
    emailCta: 'Continuar o meu pedido', demoCta: 'Botão de exemplo: no e-mail real, permite voltar à sua seleção guardada.',
    unsubscribe: 'Cancelar lembretes', requestedEmail: 'Recebe este e-mail porque pediu o seu orçamento.',
    reminderEmail: 'Só com o seu consentimento: até dois lembretes sobre este pedido. Ao cancelar, a série termina.', signature: 'Apoio pessoal · A sua equipa Kraken',
    services: { regular:'Limpeza regular',deep:'Limpeza profunda',endOfTenancy:'Limpeza de fim de contrato',construction:'Limpeza após obras',windows:'Limpeza de janelas',moving:'Pequena mudança',unknown:'O serviço selecionado' },
    emails: {
      saved: { subject:'O seu orçamento Kraken: continue quando quiser',title:'A sua seleção está aqui para si.',body:'Aqui está a sua seleção atual. Abra o pedido quando lhe for conveniente e continue onde ficou.',support:'Tem alguma pergunta? Responda a este e-mail. Ajudamo-lo pessoalmente.' },
      first: { subject:'A sua seleção está guardada. Continuamos?',title:'Um pequeno passo para um dia mais leve.',body:'O seu pedido ainda não está completo. A seleção já está preparada para rever e continuar com tranquilidade.',support:'Dúvidas sobre o serviço ou a data? Responda-nos e ajudamos a definir o que precisa.' },
      last: { subject:'Uma dúvida sobre a limpeza? Estamos aqui para ajudar.',title:'Aqui quando precisar de nós.',body:'Este é o nosso último lembrete sobre esta seleção. Reveja o serviço e os extras escolhidos se quiser concluir o pedido.',support:'Prefere conversar? Ligue para +41 77 450 57 05, todos os dias das 09:00 às 19:00.' },
    },
  },
};

export function recoveryLanguage(language: string): RecoveryLanguage {
  const short = language.toLowerCase().split(/[-_]/)[0];
  return Object.prototype.hasOwnProperty.call(RECOVERY_COPY, short) ? short as RecoveryLanguage : 'de';
}

export function recoveryCopy(language: string): RecoveryCopy {
  return RECOVERY_COPY[recoveryLanguage(language)];
}
