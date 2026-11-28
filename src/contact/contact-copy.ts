/** Public contact copy. UI and FAQ structured data consume this same source. */
import { businessHoursLabel, businessHoursSentence } from '../config/business-hours.mjs';

export const CONTACT_LANGUAGES = ['de', 'en', 'es', 'fr', 'it', 'pt'] as const;
export type ContactLanguage = typeof CONTACT_LANGUAGES[number];
export const CONTACT_FORM_KEYS = [
  'title','intro','nameLabel','emailLabel','phoneLabel','optional','channelLabel',
  'channelEmail','channelPhone','channelWhatsapp','serviceLabel','serviceWindows',
  'serviceEnd','serviceRegular','serviceDeep','serviceMoving','serviceUnsure',
  'postcodeLabel','messageLabel','messageHint','submit','submitting','retry',
  'privacyText','privacyLink','required','invalidEmail','invalidPhone',
  'invalidPostcode','invalidMessage','invalidService','invalidChannel','phoneRequired',
  'verificationRequired','verificationLoading','verificationFailed','unavailable',
  'error','rateLimited','successTitle','successReference','successMessage',
  'directContact','honeypotLabel',
] as const;
export type ContactFormCopy = Record<typeof CONTACT_FORM_KEYS[number], string>;
export type ContactFaq = { question: string; answer: string };
export type ContactCopy = {
  meta: { title: string; description: string };
  hero: { eyebrow: string; title: string; intro: string; calculate: string; whatsapp: string; call: string; hours: string };
  map: { eyebrow: string; title: string; subtitle: string; note: string; regionsLabel: string; accessibleLabel: string };
  person: { eyebrow: string; name: string; initials: string; role: string; phoneLabel: string; emailLabel: string; hoursLabel: string };
  faqTitle: string;
  faqs: ContactFaq[];
  form: ContactFormCopy;
};

export function normalizeContactLanguage(language: unknown): ContactLanguage {
  const code = typeof language === 'string' ? language.trim().toLowerCase().replace(/_/g, '-').split('-')[0] : '';
  return CONTACT_LANGUAGES.includes(code as ContactLanguage) ? code as ContactLanguage : 'de';
}

const copy: Record<ContactLanguage, ContactCopy> = {
  de: {
    meta: { title: 'Kontakt | Reinigung und kleine Umzüge | Kraken PFM', description: `Kontaktieren Sie Kraken für Reinigung und kleine Umzüge in Zürich, Winterthur und Schaffhausen. ${businessHoursSentence('de')} Per Formular, WhatsApp oder Telefon.` },
    hero: { eyebrow: 'KONTAKT ZU KRAKEN', title: 'Wir kommen zu Ihnen.', intro: 'Reinigung und kleine Umzüge. Persönlich für Sie da.', calculate: 'Service berechnen', whatsapp: 'WhatsApp', call: 'Anrufen', hours: businessHoursLabel('de') },
    map: { eyebrow: 'UNSER EINSATZGEBIET', title: 'In Ihrer Nähe. Bei Ihnen zu Hause.', subtitle: 'Zürich · Winterthur · Schaffhausen', note: 'Wohnen Sie in der Umgebung? Nennen Sie uns Ihre Postleitzahl.', regionsLabel: 'Mehr zu unseren Einsatzgebieten', accessibleLabel: 'Regionalkarte mit Zürich im Südwesten, Winterthur weiter nordöstlich und Schaffhausen im Norden. Die Markierungen zeigen Einsatzregionen, keine genauen Gebietsgrenzen.' },
    person: { eyebrow: 'Ihr persönlicher Kontakt', name: 'Antonio Gomes', initials: 'AG', role: 'Inhaber von Kraken', phoneLabel: 'Telefon', emailLabel: 'E-Mail', hoursLabel: 'Kontaktzeiten' },
    faqTitle: 'Häufige Fragen zum Kontakt',
    faqs: [
      { question: 'Muss ich Kraken besuchen?', answer: 'Nein. Wir kommen für die vereinbarte Reinigung oder den kleinen Umzug zu Ihnen. Sie können Ihr Anliegen über das Formular, per WhatsApp, telefonisch oder per E-Mail mit uns besprechen.' },
      { question: 'Welche Dienstleistungen kann ich anfragen?', answer: 'Sie können Fensterreinigung, Umzugsreinigung, regelmässige Reinigung, Grundreinigung und kleine Umzüge anfragen. Wenn Sie noch unsicher sind, beschreiben Sie uns Ihr Anliegen.' },
      { question: 'In welchen Regionen ist Kraken tätig?', answer: 'Wir sind in Zürich, Winterthur und Schaffhausen tätig. Wenn Sie in der Umgebung wohnen, nennen Sie uns Ihre Postleitzahl. Wir prüfen den Einsatzort mit Ihnen; die Karte bestätigt keine genaue Gebietsgrenze oder Verfügbarkeit.' },
      { question: 'Wann kann ich Kraken kontaktieren?', answer: `${businessHoursSentence('de')} Eine Anfrage können Sie auch ausserhalb dieser Zeiten über das Formular oder per E-Mail hinterlassen.` },
      { question: 'Ist meine Anfrage bereits eine Buchung?', answer: 'Nein. Eine Kontaktanfrage bestätigt weder eine Buchung noch einen Service, eine Zahlung oder einen Termin. Wenn Ihr Anliegen konkret ist, können Sie den gewünschten Service im Rechner zusammenstellen.' },
    ],
    form: {
      title: 'Wobei dürfen wir Ihnen helfen?', intro: 'Erzählen Sie uns, was Sie brauchen.',
      nameLabel: 'Name', emailLabel: 'E-Mail-Adresse', phoneLabel: 'Telefonnummer', optional: 'optional',
      channelLabel: 'Bevorzugter Kontaktweg', channelEmail: 'E-Mail', channelPhone: 'Telefon', channelWhatsapp: 'WhatsApp',
      serviceLabel: 'Service', serviceWindows: 'Fensterreinigung', serviceEnd: 'Umzugsreinigung', serviceRegular: 'Regelmässige Reinigung', serviceDeep: 'Grundreinigung', serviceMoving: 'Kleiner Umzug', serviceUnsure: 'Ich bin noch unsicher',
      postcodeLabel: 'Postleitzahl', messageLabel: 'Nachricht', messageHint: '10–4.000 Zeichen. Eine vierstellige Schweizer Postleitzahl bestätigt noch keine Abdeckung.',
      submit: 'Nachricht senden', submitting: 'Nachricht wird übermittelt …', retry: 'Erneut versuchen',
      privacyText: 'Informationen zum Umgang mit Ihren Angaben finden Sie in unserer', privacyLink: 'Datenschutzerklärung',
      required: 'Bitte füllen Sie dieses Feld aus.', invalidEmail: 'Bitte geben Sie eine gültige E-Mail-Adresse ein.', invalidPhone: 'Bitte prüfen Sie die Telefonnummer oder lassen Sie das Feld leer.', invalidPostcode: 'Bitte geben Sie eine vierstellige Schweizer Postleitzahl ein.', invalidMessage: 'Bitte schreiben Sie eine Nachricht mit 10 bis 4.000 Zeichen.', invalidService: 'Bitte wählen Sie einen Service aus der Liste.', invalidChannel: 'Bitte wählen Sie einen Kontaktweg aus der Liste.',
      phoneRequired: 'Ohne Telefonnummer können wir Sie nur per E-Mail kontaktieren.',
      verificationRequired: 'Bitte schliessen Sie die Sicherheitsprüfung ab.', verificationLoading: 'Die Sicherheitsprüfung wird geladen …', verificationFailed: 'Die Sicherheitsprüfung konnte nicht bestätigt werden. Bitte versuchen Sie es erneut.',
      unavailable: 'Das Formular ist derzeit nicht verfügbar. Sie erreichen uns per WhatsApp, Telefon oder E-Mail.',
      error: 'Der Eingang Ihrer Anfrage wurde nicht bestätigt. Ihre Eingaben bleiben im Formular erhalten. Sie können es erneut versuchen oder uns direkt kontaktieren.', rateLimited: 'Es gab zu viele Versuche. Bitte warten Sie etwas oder kontaktieren Sie uns direkt.',
      successTitle: 'Ihre Anfrage wurde gespeichert.', successReference: 'Referenz', successMessage: 'Damit sind noch keine Buchung, kein Service, keine Zahlung und kein Termin bestätigt.', directContact: 'Direkt kontaktieren', honeypotLabel: 'Bitte dieses Feld leer lassen',
    },
  },
  en: {
    meta: { title: 'Contact | Cleaning and small moves | Kraken PFM', description: `Contact Kraken for cleaning and small moves in Zurich, Winterthur and Schaffhausen. ${businessHoursSentence('en')} By form, WhatsApp or telephone.` },
    hero: { eyebrow: 'CONTACT KRAKEN', title: 'We come to you.', intro: 'Cleaning and small moves. Personal help for your home.', calculate: 'Calculate your service', whatsapp: 'WhatsApp', call: 'Call us', hours: businessHoursLabel('en') },
    map: { eyebrow: 'WHERE WE WORK', title: 'Close to you. At your home.', subtitle: 'Zurich · Winterthur · Schaffhausen', note: 'Do you live nearby? Please tell us your postcode.', regionsLabel: 'Explore our service regions', accessibleLabel: 'Regional map showing Zurich in the southwest, Winterthur further northeast and Schaffhausen to the north. Markers indicate service regions, not exact coverage boundaries.' },
    person: { eyebrow: 'Your personal contact', name: 'Antonio Gomes', initials: 'AG', role: 'Owner of Kraken', phoneLabel: 'Telephone', emailLabel: 'Email', hoursLabel: 'Contact hours' },
    faqTitle: 'Questions about contacting Kraken',
    faqs: [
      { question: 'Do I need to visit Kraken?', answer: 'No. We come to you for the agreed cleaning or small move. You can discuss your request using the form, WhatsApp, telephone or email.' },
      { question: 'Which services can I ask about?', answer: 'You can enquire about window cleaning, end of tenancy cleaning, regular cleaning, deep cleaning and small moves. If you are unsure, please describe what you need.' },
      { question: 'Which regions does Kraken serve?', answer: 'We work in Zurich, Winterthur and Schaffhausen. If you live nearby, please provide your postcode. We will review the location with you; the map does not confirm exact coverage boundaries or availability.' },
      { question: 'When can I contact Kraken?', answer: `${businessHoursSentence('en')} You can also leave an enquiry through the form or by email outside these hours.` },
      { question: 'Does my enquiry count as a booking?', answer: 'No. A contact enquiry does not confirm a booking, service, payment or date. If you know what you need, you can put together your chosen service in the calculator.' },
    ],
    form: {
      title: 'How can we help you?', intro: 'Please tell us what you need.',
      nameLabel: 'Name', emailLabel: 'Email address', phoneLabel: 'Telephone number', optional: 'optional',
      channelLabel: 'Preferred contact method', channelEmail: 'Email', channelPhone: 'Telephone', channelWhatsapp: 'WhatsApp',
      serviceLabel: 'Service', serviceWindows: 'Window cleaning', serviceEnd: 'End of tenancy cleaning', serviceRegular: 'Regular cleaning', serviceDeep: 'Deep cleaning', serviceMoving: 'Small move', serviceUnsure: 'I am not sure yet',
      postcodeLabel: 'Postcode', messageLabel: 'Message', messageHint: '10–4,000 characters. A four-digit Swiss postcode does not confirm service coverage.',
      submit: 'Send message', submitting: 'Submitting your message …', retry: 'Try again',
      privacyText: 'Details about how we handle your information are in our', privacyLink: 'privacy policy',
      required: 'Please complete this field.', invalidEmail: 'Please enter a valid email address.', invalidPhone: 'Please check the telephone number or leave this field empty.', invalidPostcode: 'Please enter a four-digit Swiss postcode.', invalidMessage: 'Please write a message of 10 to 4,000 characters.', invalidService: 'Please choose a service from the list.', invalidChannel: 'Please choose a contact method from the list.',
      phoneRequired: 'Without a telephone number, email is the available reply channel.',
      verificationRequired: 'Please complete the security check.', verificationLoading: 'Loading the security check …', verificationFailed: 'The security check could not be confirmed. Please try again.',
      unavailable: 'The form is currently unavailable. You can contact us by WhatsApp, telephone or email.',
      error: 'Receipt of your enquiry has not been confirmed. Your entries remain in the form. You can try again or contact us directly.', rateLimited: 'There have been too many attempts. Please wait a little or contact us directly.',
      successTitle: 'Your enquiry has been recorded.', successReference: 'Reference', successMessage: 'This does not confirm a booking, service, payment or date.', directContact: 'Contact us directly', honeypotLabel: 'Please leave this field empty',
    },
  },
  es: {
    meta: { title: 'Contacto | Limpieza y pequeñas mudanzas | Kraken PFM', description: `Contacte con Kraken para limpieza y pequeñas mudanzas en Zúrich, Winterthur y Schaffhausen. ${businessHoursSentence('es')} Por formulario, WhatsApp o teléfono.` },
    hero: { eyebrow: 'CONTACTE CON KRAKEN', title: 'Nos desplazamos a su hogar.', intro: 'Limpieza y pequeñas mudanzas. Atención personal para usted.', calculate: 'Calcular su servicio', whatsapp: 'WhatsApp', call: 'Llamar', hours: businessHoursLabel('es') },
    map: { eyebrow: 'DÓNDE TRABAJAMOS', title: 'Cerca de usted. En su hogar.', subtitle: 'Zúrich · Winterthur · Schaffhausen', note: '¿Vive en los alrededores? Indíquenos su código postal.', regionsLabel: 'Conocer nuestras regiones de servicio', accessibleLabel: 'Mapa regional con Zúrich al suroeste, Winterthur más al noreste y Schaffhausen al norte. Los marcadores indican regiones de servicio, sin delimitar una cobertura exacta.' },
    person: { eyebrow: 'Su persona de contacto', name: 'Antonio Gomes', initials: 'AG', role: 'Propietario de Kraken', phoneLabel: 'Teléfono', emailLabel: 'Correo electrónico', hoursLabel: 'Horario de contacto' },
    faqTitle: 'Preguntas sobre cómo contactar con Kraken',
    faqs: [
      { question: '¿Tengo que visitar Kraken?', answer: 'No. Nos desplazamos a su domicilio para la limpieza o pequeña mudanza acordada. Puede explicarnos su consulta mediante el formulario, WhatsApp, teléfono o correo electrónico.' },
      { question: '¿Qué servicios puedo consultar?', answer: 'Puede consultar sobre limpieza de ventanas, limpieza de fin de alquiler, limpieza periódica, limpieza a fondo y pequeñas mudanzas. Si todavía no lo tiene claro, descríbanos qué necesita.' },
      { question: '¿En qué regiones trabaja Kraken?', answer: 'Trabajamos en Zúrich, Winterthur y Schaffhausen. Si vive en los alrededores, indíquenos su código postal. Revisaremos con usted el lugar del servicio; el mapa no confirma una cobertura exacta ni disponibilidad.' },
      { question: '¿Cuándo puedo contactar con Kraken?', answer: `${businessHoursSentence('es')} También puede dejar una consulta mediante el formulario o por correo electrónico fuera de ese horario.` },
      { question: '¿Mi consulta ya es una reserva?', answer: 'No. Una consulta de contacto no confirma una reserva, un servicio, un pago ni una fecha. Si ya sabe qué necesita, puede preparar el servicio que desea en el calculador.' },
    ],
    form: {
      title: '¿En qué podemos ayudarle?', intro: 'Cuéntenos qué necesita.',
      nameLabel: 'Nombre', emailLabel: 'Correo electrónico', phoneLabel: 'Número de teléfono', optional: 'opcional',
      channelLabel: 'Canal de contacto preferido', channelEmail: 'Correo electrónico', channelPhone: 'Teléfono', channelWhatsapp: 'WhatsApp',
      serviceLabel: 'Servicio', serviceWindows: 'Limpieza de ventanas', serviceEnd: 'Limpieza de fin de alquiler', serviceRegular: 'Limpieza periódica', serviceDeep: 'Limpieza a fondo', serviceMoving: 'Pequeña mudanza', serviceUnsure: 'Todavía no lo tengo claro',
      postcodeLabel: 'Código postal', messageLabel: 'Mensaje', messageHint: 'Entre 10 y 4.000 caracteres. Un código postal suizo de cuatro cifras no confirma la cobertura del servicio.',
      submit: 'Enviar mensaje', submitting: 'Enviando su mensaje…', retry: 'Volver a intentarlo',
      privacyText: 'Encontrará información sobre cómo tratamos sus datos en nuestra', privacyLink: 'política de privacidad',
      required: 'Complete este campo.', invalidEmail: 'Indique un correo electrónico válido.', invalidPhone: 'Revise el número de teléfono o deje este campo vacío.', invalidPostcode: 'Indique un código postal suizo de cuatro cifras.', invalidMessage: 'Escriba un mensaje de entre 10 y 4.000 caracteres.', invalidService: 'Seleccione un servicio de la lista.', invalidChannel: 'Seleccione un canal de contacto de la lista.',
      phoneRequired: 'Sin número de teléfono, solo podremos contactar con usted por correo electrónico.',
      verificationRequired: 'Complete la comprobación de seguridad.', verificationLoading: 'Cargando la comprobación de seguridad…', verificationFailed: 'No se ha podido confirmar la comprobación de seguridad. Inténtelo de nuevo.',
      unavailable: 'El formulario no está disponible en este momento. Puede contactar con nosotros por WhatsApp, teléfono o correo electrónico.',
      error: 'No se ha confirmado la recepción de su consulta. Los valores siguen en el formulario. Puede volver a intentarlo o contactar directamente con nosotros.', rateLimited: 'Se han realizado demasiados intentos. Espere un poco o contacte directamente con nosotros.',
      successTitle: 'Su consulta ha quedado registrada.', successReference: 'Referencia', successMessage: 'Esto no confirma una reserva, un servicio, un pago ni una fecha.', directContact: 'Contactar directamente', honeypotLabel: 'Deje este campo vacío',
    },
  },
  fr: {
    meta: { title: 'Contact | Nettoyage et petits déménagements | Kraken PFM', description: `Contactez Kraken pour le nettoyage et les petits déménagements à Zurich, Winterthur et Schaffhouse. ${businessHoursSentence('fr')} Par formulaire, WhatsApp ou téléphone.` },
    hero: { eyebrow: 'CONTACTER KRAKEN', title: 'Nous venons chez vous.', intro: 'Nettoyage et petits déménagements. Un contact personnel à votre écoute.', calculate: 'Calculer votre prestation', whatsapp: 'WhatsApp', call: 'Appeler', hours: businessHoursLabel('fr') },
    map: { eyebrow: 'NOTRE ZONE D’INTERVENTION', title: 'Près de chez vous. À votre domicile.', subtitle: 'Zurich · Winterthur · Schaffhouse', note: 'Vous habitez aux alentours ? Indiquez-nous votre code postal.', regionsLabel: 'Découvrir nos régions d’intervention', accessibleLabel: 'Carte régionale avec Zurich au sud-ouest, Winterthur plus au nord-est et Schaffhouse au nord. Les repères indiquent les régions d’intervention, sans délimiter une couverture précise.' },
    person: { eyebrow: 'Votre interlocuteur personnel', name: 'Antonio Gomes', initials: 'AG', role: 'Propriétaire de Kraken', phoneLabel: 'Téléphone', emailLabel: 'E-mail', hoursLabel: 'Horaires de contact' },
    faqTitle: 'Questions sur le contact avec Kraken',
    faqs: [
      { question: 'Dois-je me rendre chez Kraken ?', answer: 'Non. Nous nous déplaçons chez vous pour le nettoyage ou le petit déménagement convenu. Vous pouvez nous expliquer votre demande par le formulaire, WhatsApp, téléphone ou e-mail.' },
      { question: 'Pour quelles prestations puis-je vous contacter ?', answer: 'Vous pouvez nous contacter pour le nettoyage des vitres, le nettoyage de fin de bail, le nettoyage régulier, le nettoyage en profondeur et les petits déménagements. Si vous hésitez encore, décrivez-nous vos besoins.' },
      { question: 'Dans quelles régions Kraken intervient-il ?', answer: 'Nous intervenons à Zurich, Winterthur et Schaffhouse. Si vous habitez aux alentours, indiquez-nous votre code postal. Nous examinerons le lieu de l’intervention avec vous ; la carte ne confirme ni une couverture précise ni une disponibilité.' },
      { question: 'Quand puis-je contacter Kraken ?', answer: `${businessHoursSentence('fr')} Vous pouvez également laisser une demande par le formulaire ou par e-mail en dehors de ces horaires.` },
      { question: 'Ma demande constitue-t-elle déjà une réservation ?', answer: 'Non. Une demande de contact ne confirme ni une réservation, ni une prestation, ni un paiement, ni une date. Si vous savez ce dont vous avez besoin, vous pouvez préparer la prestation souhaitée dans le calculateur.' },
    ],
    form: {
      title: 'Comment pouvons-nous vous aider ?', intro: 'Dites-nous ce dont vous avez besoin.',
      nameLabel: 'Nom', emailLabel: 'Adresse e-mail', phoneLabel: 'Numéro de téléphone', optional: 'facultatif',
      channelLabel: 'Moyen de contact souhaité', channelEmail: 'E-mail', channelPhone: 'Téléphone', channelWhatsapp: 'WhatsApp',
      serviceLabel: 'Prestation', serviceWindows: 'Nettoyage des vitres', serviceEnd: 'Nettoyage de fin de bail', serviceRegular: 'Nettoyage régulier', serviceDeep: 'Nettoyage en profondeur', serviceMoving: 'Petit déménagement', serviceUnsure: 'Je ne sais pas encore',
      postcodeLabel: 'Code postal', messageLabel: 'Message', messageHint: 'Entre 10 et 4 000 caractères. Un code postal suisse à quatre chiffres ne confirme pas la couverture du service.',
      submit: 'Envoyer le message', submitting: 'Transmission de votre message…', retry: 'Réessayer',
      privacyText: 'Vous trouverez les informations sur le traitement de vos données dans notre', privacyLink: 'politique de confidentialité',
      required: 'Veuillez remplir ce champ.', invalidEmail: 'Veuillez saisir une adresse e-mail valide.', invalidPhone: 'Veuillez vérifier le numéro de téléphone ou laisser ce champ vide.', invalidPostcode: 'Veuillez saisir un code postal suisse à quatre chiffres.', invalidMessage: 'Veuillez écrire un message de 10 à 4 000 caractères.', invalidService: 'Veuillez choisir une prestation dans la liste.', invalidChannel: 'Veuillez choisir un moyen de contact dans la liste.',
      phoneRequired: 'Sans numéro de téléphone, seul un contact par e-mail est possible.',
      verificationRequired: 'Veuillez effectuer la vérification de sécurité.', verificationLoading: 'Chargement de la vérification de sécurité…', verificationFailed: 'La vérification de sécurité n’a pas pu être confirmée. Veuillez réessayer.',
      unavailable: 'Le formulaire est actuellement indisponible. Vous pouvez nous contacter par WhatsApp, téléphone ou e-mail.',
      error: 'La réception de votre demande n’a pas été confirmée. Vos saisies restent dans le formulaire. Vous pouvez réessayer ou nous contacter directement.', rateLimited: 'Le nombre de tentatives est trop élevé. Veuillez patienter un peu ou nous contacter directement.',
      successTitle: 'Votre demande a été enregistrée.', successReference: 'Référence', successMessage: 'Cela ne confirme ni une réservation, ni une prestation, ni un paiement, ni une date.', directContact: 'Nous contacter directement', honeypotLabel: 'Veuillez laisser ce champ vide',
    },
  },
  it: {
    meta: { title: 'Contatti | Pulizie e piccoli traslochi | Kraken PFM', description: `Contatti Kraken per pulizie e piccoli traslochi a Zurigo, Winterthur e Sciaffusa. ${businessHoursSentence('it')} Tramite modulo, WhatsApp o telefono.` },
    hero: { eyebrow: 'CONTATTI KRAKEN', title: 'Veniamo a casa sua.', intro: 'Pulizie e piccoli traslochi. Un contatto personale per le sue esigenze.', calculate: 'Calcoli il suo servizio', whatsapp: 'WhatsApp', call: 'Chiami', hours: businessHoursLabel('it') },
    map: { eyebrow: 'DOVE LAVORIAMO', title: 'Vicino a lei. A casa sua.', subtitle: 'Zurigo · Winterthur · Sciaffusa', note: 'Abita nei dintorni? Ci indichi il suo codice postale.', regionsLabel: 'Scopra le nostre regioni di servizio', accessibleLabel: 'Mappa regionale con Zurigo a sud-ovest, Winterthur più a nord-est e Sciaffusa a nord. I segnaposto indicano le regioni di servizio, senza delimitare una copertura esatta.' },
    person: { eyebrow: 'Il suo referente personale', name: 'Antonio Gomes', initials: 'AG', role: 'Titolare di Kraken', phoneLabel: 'Telefono', emailLabel: 'E-mail', hoursLabel: 'Orari di contatto' },
    faqTitle: 'Domande sui contatti con Kraken',
    faqs: [
      { question: 'Devo recarmi da Kraken?', answer: 'No. Veniamo al suo domicilio per la pulizia o il piccolo trasloco concordato. Può presentarci la sua richiesta tramite il modulo, WhatsApp, telefono o e-mail.' },
      { question: 'Per quali servizi posso contattarvi?', answer: 'Può richiedere informazioni su pulizia dei vetri, pulizia di fine locazione, pulizia regolare, pulizia approfondita e piccoli traslochi. Se non ha ancora deciso, ci descriva le sue esigenze.' },
      { question: 'In quali regioni lavora Kraken?', answer: 'Lavoriamo a Zurigo, Winterthur e Sciaffusa. Se abita nei dintorni, ci indichi il suo codice postale. Verificheremo con lei il luogo del servizio; la mappa non conferma una copertura esatta né la disponibilità.' },
      { question: 'Quando posso contattare Kraken?', answer: `${businessHoursSentence('it')} Può anche lasciare una richiesta tramite il modulo o per e-mail al di fuori di questi orari.` },
      { question: 'La mia richiesta è già una prenotazione?', answer: 'No. Una richiesta di contatto non conferma una prenotazione, un servizio, un pagamento o una data. Se sa già di cosa ha bisogno, può preparare il servizio desiderato nel calcolatore.' },
    ],
    form: {
      title: 'Come possiamo aiutarla?', intro: 'Ci racconti di cosa ha bisogno.',
      nameLabel: 'Nome', emailLabel: 'Indirizzo e-mail', phoneLabel: 'Numero di telefono', optional: 'facoltativo',
      channelLabel: 'Canale di contatto preferito', channelEmail: 'E-mail', channelPhone: 'Telefono', channelWhatsapp: 'WhatsApp',
      serviceLabel: 'Servizio', serviceWindows: 'Pulizia dei vetri', serviceEnd: 'Pulizia di fine locazione', serviceRegular: 'Pulizia regolare', serviceDeep: 'Pulizia approfondita', serviceMoving: 'Piccolo trasloco', serviceUnsure: 'Non ho ancora deciso',
      postcodeLabel: 'Codice postale', messageLabel: 'Messaggio', messageHint: 'Da 10 a 4.000 caratteri. Un codice postale svizzero di quattro cifre non conferma la copertura del servizio.',
      submit: 'Invii il messaggio', submitting: 'Invio del suo messaggio…', retry: 'Riprovi',
      privacyText: 'Le informazioni sul trattamento dei suoi dati sono disponibili nella nostra', privacyLink: 'informativa sulla privacy',
      required: 'Compili questo campo.', invalidEmail: 'Inserisca un indirizzo e-mail valido.', invalidPhone: 'Verifichi il numero di telefono oppure lasci vuoto questo campo.', invalidPostcode: 'Inserisca un codice postale svizzero di quattro cifre.', invalidMessage: 'Scriva un messaggio da 10 a 4.000 caratteri.', invalidService: 'Scelga un servizio dall’elenco.', invalidChannel: 'Scelga un canale di contatto dall’elenco.',
      phoneRequired: 'Senza numero di telefono, possiamo contattarla soltanto per e-mail.',
      verificationRequired: 'Completi la verifica di sicurezza.', verificationLoading: 'Caricamento della verifica di sicurezza…', verificationFailed: 'Non è stato possibile confermare la verifica di sicurezza. La preghiamo di riprovare.',
      unavailable: 'Il modulo non è attualmente disponibile. Può contattarci tramite WhatsApp, telefono o e-mail.',
      error: 'La ricezione della sua richiesta non è stata confermata. I dati inseriti restano nel modulo. Può riprovare o contattarci direttamente.', rateLimited: 'Sono stati effettuati troppi tentativi. Attenda un momento oppure ci contatti direttamente.',
      successTitle: 'La sua richiesta è stata registrata.', successReference: 'Riferimento', successMessage: 'Questo non conferma una prenotazione, un servizio, un pagamento o una data.', directContact: 'Ci contatti direttamente', honeypotLabel: 'Lasci vuoto questo campo',
    },
  },
  pt: {
    meta: { title: 'Contacto | Limpeza e pequenas mudanças | Kraken PFM', description: `Contacte a Kraken para limpeza e pequenas mudanças em Zurique, Winterthur e Schaffhausen. ${businessHoursSentence('pt')} Por formulário, WhatsApp ou telefone.` },
    hero: { eyebrow: 'CONTACTE A KRAKEN', title: 'Vamos até sua casa.', intro: 'Limpeza e pequenas mudanças. Um contacto pessoal para si.', calculate: 'Calcular o seu serviço', whatsapp: 'WhatsApp', call: 'Ligar', hours: businessHoursLabel('pt') },
    map: { eyebrow: 'ONDE TRABALHAMOS', title: 'Perto de si. Em sua casa.', subtitle: 'Zurique · Winterthur · Schaffhausen', note: 'Mora nos arredores? Indique-nos o seu código postal.', regionsLabel: 'Conhecer as nossas regiões de serviço', accessibleLabel: 'Mapa regional com Zurique a sudoeste, Winterthur mais a nordeste e Schaffhausen a norte. Os marcadores indicam regiões de serviço, sem delimitar uma cobertura exata.' },
    person: { eyebrow: 'O seu contacto pessoal', name: 'Antonio Gomes', initials: 'AG', role: 'Proprietário da Kraken', phoneLabel: 'Telefone', emailLabel: 'Email', hoursLabel: 'Horário de contacto' },
    faqTitle: 'Perguntas sobre o contacto com a Kraken',
    faqs: [
      { question: 'É necessário visitar a Kraken?', answer: 'Não. Deslocamo-nos à sua casa para a limpeza ou pequena mudança acordada. Pode explicar-nos o seu pedido através do formulário, WhatsApp, telefone ou email.' },
      { question: 'Que serviços posso consultar?', answer: 'Pode consultar-nos sobre limpeza de janelas, limpeza de fim de arrendamento, limpeza regular, limpeza a fundo e pequenas mudanças. Se ainda não tiver a certeza, descreva-nos o que precisa.' },
      { question: 'Em que regiões trabalha a Kraken?', answer: 'Trabalhamos em Zurique, Winterthur e Schaffhausen. Se mora nos arredores, indique-nos o seu código postal. Analisaremos consigo o local do serviço; o mapa não confirma uma cobertura exata nem disponibilidade.' },
      { question: 'Quando posso contactar a Kraken?', answer: `${businessHoursSentence('pt')} Também pode deixar um pedido através do formulário ou por email fora deste horário.` },
      { question: 'O meu pedido já é uma reserva?', answer: 'Não. Um pedido de contacto não confirma uma reserva, um serviço, um pagamento nem uma data. Se já sabe o que precisa, pode preparar o serviço desejado no calculador.' },
    ],
    form: {
      title: 'Como podemos ajudar?', intro: 'Conte-nos o que precisa.',
      nameLabel: 'Nome', emailLabel: 'Endereço de email', phoneLabel: 'Número de telefone', optional: 'opcional',
      channelLabel: 'Canal de contacto preferido', channelEmail: 'Email', channelPhone: 'Telefone', channelWhatsapp: 'WhatsApp',
      serviceLabel: 'Serviço', serviceWindows: 'Limpeza de janelas', serviceEnd: 'Limpeza de fim de arrendamento', serviceRegular: 'Limpeza regular', serviceDeep: 'Limpeza a fundo', serviceMoving: 'Pequena mudança', serviceUnsure: 'Ainda não tenho a certeza',
      postcodeLabel: 'Código postal', messageLabel: 'Mensagem', messageHint: 'Entre 10 e 4.000 caracteres. Um código postal suíço de quatro algarismos não confirma a cobertura do serviço.',
      submit: 'Enviar mensagem', submitting: 'A enviar a sua mensagem…', retry: 'Tentar novamente',
      privacyText: 'As informações sobre o tratamento dos seus dados estão na nossa', privacyLink: 'política de privacidade',
      required: 'Preencha este campo.', invalidEmail: 'Indique um endereço de email válido.', invalidPhone: 'Verifique o número de telefone ou deixe este campo vazio.', invalidPostcode: 'Indique um código postal suíço de quatro algarismos.', invalidMessage: 'Escreva uma mensagem entre 10 e 4.000 caracteres.', invalidService: 'Escolha um serviço da lista.', invalidChannel: 'Escolha um canal de contacto da lista.',
      phoneRequired: 'Sem número de telefone, apenas podemos contactar por email.',
      verificationRequired: 'Conclua a verificação de segurança.', verificationLoading: 'A carregar a verificação de segurança…', verificationFailed: 'Não foi possível confirmar a verificação de segurança. Tente novamente.',
      unavailable: 'O formulário não está disponível neste momento. Pode contactar-nos por WhatsApp, telefone ou email.',
      error: 'A receção do seu pedido não foi confirmada. Os dados introduzidos permanecem no formulário. Pode tentar novamente ou contactar-nos diretamente.', rateLimited: 'Foram efetuadas demasiadas tentativas. Aguarde um pouco ou contacte-nos diretamente.',
      successTitle: 'O seu pedido foi registado.', successReference: 'Referência', successMessage: 'Isto não confirma uma reserva, um serviço, um pagamento nem uma data.', directContact: 'Contactar diretamente', honeypotLabel: 'Deixe este campo vazio',
    },
  },
};

export function getContactCopy(language: unknown): ContactCopy {
  return copy[normalizeContactLanguage(language)];
}
