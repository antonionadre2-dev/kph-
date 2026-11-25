import { bookingLanguage, bookingText, type BookingLanguage } from './uiCopy.ts';

export const MOVING_GUIDE_REVIEWED_AT = '2026-11-24';
export const GUIDE_PLACES = ['unknown', 'zurich', 'winterthur', 'schaffhausen', 'zh', 'sh', 'other'] as const;
export type GuidePlace = typeof GUIDE_PLACES[number];
export interface GuidePreferences { from: GuidePlace; to: GuidePlace; vehicle: boolean }
export interface MovingGuideInput {
  language: string;
  service?: string | null;
  customer?: { name?: string; address?: string; postalCode?: string; city?: string };
  requestedDate?: string;
  appointmentConfirmed?: boolean;
  preferences?: Partial<GuidePreferences>;
  completed?: string[];
  preview?: boolean;
}
export interface GuideLink { label: string; url: string }
export interface GuideItem { id: string; phase: 'before' | 'day' | 'after'; title: string; body: string; links: GuideLink[] }
export interface MovingGuideDocument { language: BookingLanguage; title: string; subtitle: string; context: Array<{label: string; value: string}>; items: GuideItem[]; preferences: GuidePreferences; copy: Record<string, string>; completed: string[]; preview: boolean }

// Public primary sources reviewed on 24 November 2026. No visitor information is appended.
export const MOVING_GUIDE_SOURCES = {
  checklist: 'https://www.ch.ch/de/wohnen/umzug/checkliste-fur-den-umzug/',
  registration: 'https://www.ch.ch/de/wohnen/umzug/ab-und-anmelden-bei-der-wohngemeinde/',
  eumzug: 'https://www.eumzug.swiss/eumzugngx/global',
  zurichRegistration: 'https://www.stadt-zuerich.ch/de/lebenslagen/einwohner-services/umziehen-melden/Zuzug-Innerkantonal.html',
  winterthurRegistration: 'https://stadt.winterthur.ch/services/eumzug',
  schaffhausenRegistration: 'https://www.stadt-schaffhausen.ch/dienste/100114',
  post: 'https://www.post.ch/de/empfangen/umzug/adressaenderung-mit-nachsendung',
  vehicle: 'https://asa.ch/strassenverkehrsaemter/adressanderung/',
  vehicleDirectory: 'https://asa.ch/strassenverkehrsaemter/adressen/',
  vehicleZurich: 'https://www.zh.ch/de/mobilitaet/fahrzeuge-kontrollschilder/umzug-melden.html',
  vehicleSchaffhausen: 'https://sh.ch/CMS/Webseite/Kanton-Schaffhausen/Beh-rde/Verwaltung/Baudepartement/Strassenverkehrs--und-Schifffahrtsamt-3612-DE.html',
  parkingZurich: 'https://www.stadt-zuerich.ch/de/stadtleben/notfall/standorte-der-stadtpolizei/parkplatzreservation.html',
  parkingWinterthur: 'https://stadt.winterthur.ch/services/bewilligungsformulare-veranstaltungen',
  parkingSchaffhausen: 'https://www.stadt-schaffhausen.ch/verkehrsparkdienst/33923',
} as const;

type Row = [string, string, string, string, string, string];
const languages: BookingLanguage[] = ['de','en','es','fr','it','pt'];
const words: Record<string, Row> = {
  brandDescriptor: ['Reinigung & kleine Umzüge','Cleaning & small moves','Limpieza y pequeñas mudanzas','Nettoyage et petits déménagements','Pulizie e piccoli traslochi','Limpeza e pequenas mudanças'],
  cardTitle: ['Ihr persönlicher Umzugsplan','Your personal moving plan',"Su guía personal de mudanza",'Votre guide de déménagement',"La sua guida al trasloco",'O seu guia de mudança'],
  cardBody: ['Adressen, Parkplätze, Kontrollschilder. Die passenden Schritte an einem Ort.','Address changes, parking and vehicle plates. Your next steps in one place.',"Dirección, aparcamiento y matrículas. Los pasos que necesita, en un solo lugar.",'Adresse, stationnement et plaques. Les démarches utiles au même endroit.','Indirizzo, parcheggio e targhe. I passi utili in un unico posto.','Morada, estacionamento e matrículas. Os passos úteis num só lugar.'],
  open: ['Umzugsplan öffnen','Open moving plan','Abrir guía de mudanza','Ouvrir mon guide',"Aprire la guida",'Abrir guia de mudança'],
  title: ['Gut vorbereitet ins neue Zuhause.','A well-planned move to your new home.',"Su nueva casa, con todo preparado.",'Bien préparer votre nouveau départ.','Pronti per la nuova casa.','A nova casa, com tudo preparado.'],
  subtitle: ['Eine praktische Checkliste passend zu Ihrer Auswahl.','A practical checklist tailored to your choices.',"Una lista práctica adaptada a lo que ha elegido.",'Une liste pratique adaptée à vos choix.',"Una lista pratica adattata alle sue scelte.",'Uma lista prática adaptada às suas escolhas.'],
  personalize: ['In wenigen Klicks anpassen','Tailor it in a few clicks',"Personalice en unos clics",'Personnaliser en quelques clics',"Personalizzi in pochi clic",'Personalize em poucos cliques'],
  optional: ['Alle Angaben sind freiwillig.','All details are optional.','Todos los datos son opcionales.','Toutes les indications sont facultatives.','Tutti i dati sono facoltativi.','Todos os dados são opcionais.'],
  from: ['Bisheriger Wohnort','Moving from','Lugar de origen','Lieu de départ','Luogo di partenza','Local de origem'],
  to: ['Neuer Wohnort','Moving to','Lugar de destino','Lieu d’arrivée','Luogo di arrivo','Local de destino'],
  unknown: ['Noch offen','Not decided yet','Por decidir','À préciser','Da definire','Por definir'],
  zh: ['Andere Gemeinde im Kanton Zürich','Elsewhere in canton Zurich','Otro municipio del cantón de Zúrich','Autre commune du canton de Zurich','Altro comune nel Canton Zurigo','Outro município do cantão de Zurique'],
  sh: ['Andere Gemeinde im Kanton Schaffhausen','Elsewhere in canton Schaffhausen','Otro municipio del cantón de Schaffhausen','Autre commune du canton de Schaffhouse','Altro comune nel Canton Sciaffusa','Outro município do cantão de Schaffhausen'],
  other: ['Anderer Schweizer Kanton','Another Swiss canton','Otro cantón suizo','Autre canton suisse','Un altro cantone svizzero','Outro cantão suíço'],
  vehicle: ['Ich ziehe mit einem eigenen Fahrzeug um.','I have a vehicle registered in my name.','Tengo un vehículo a mi nombre.','J’ai un véhicule immatriculé à mon nom.','Ho un veicolo immatricolato a mio nome.','Tenho um veículo em meu nome.'],
  included: ['Für Ihre Planung','For your planning',"Para su planificación",'Pour votre organisation',"Per la sua organizzazione",'Para o seu planeamento'],
  customer: ['Vorbereitet für','Prepared for','Preparado para','Préparé pour','Preparato per','Preparado para'],
  service: ['Gewählter Kraken-Service','Selected Kraken service','Servicio de Kraken elegido','Prestation Kraken choisie','Servizio Kraken scelto','Serviço Kraken escolhido'],
  address: ['Adresse aus Ihrer Anfrage','Address from your request',"Dirección indicada en su solicitud",'Adresse de votre demande',"Indirizzo della sua richiesta",'Morada indicada no pedido'],
  date: ['Wunschtermin für den Kraken-Service','Preferred date for the Kraken service','Fecha solicitada para el servicio de Kraken','Date souhaitée pour la prestation Kraken','Data richiesta per il servizio Kraken','Data solicitada para o serviço Kraken'],
  dateConfirmed: ['Bestätigter Kraken-Termin','Confirmed Kraken appointment','Cita de Kraken confirmada','Rendez-vous Kraken confirmé','Appuntamento Kraken confermato','Marcação Kraken confirmada'],
  unconfirmed: ['noch nicht bestätigt','not yet confirmed','pendiente de confirmación','à confirmer','da confermare','por confirmar'],
  before: ['Vor dem Umzug','Before the move','Antes de la mudanza','Avant le déménagement','Prima del trasloco','Antes da mudança'],
  day: ['Am Umzugstag','On moving day','El día de la mudanza','Le jour du déménagement','Il giorno del trasloco','No dia da mudança'],
  after: ['Adresse und Dokumente','Address and documents','Dirección y documentos','Adresse et documents','Indirizzo e documenti','Morada e documentos'],
  accessTitle: ['Zugang und Ladeplatz abstimmen','Plan access and loading',"Organice el acceso y la carga",'Prévoir l’accès et le chargement',"Organizzi accesso e carico",'Organize o acesso e a carga'],
  accessBody: ['Lift, Treppen, Schlüssel und Ladeweg mit der Verwaltung abstimmen. Lange oder schwere Gegenstände vorab mit Kraken besprechen.','Agree lift access, stairs, keys and the loading route with your property manager. Tell Kraken about large or heavy items.',"Acuerde ascensor, escaleras, llaves y recorrido de carga con la administración. Comente con Kraken los objetos grandes o pesados.",'Convenez de l’ascenseur, des escaliers, des clés et du trajet de chargement avec la régie. Signalez les objets lourds à Kraken.',"Concordi ascensore, scale, chiavi e percorso di carico con l’amministrazione. Segnali a Kraken gli oggetti grandi o pesanti.",'Combine elevador, escadas, chaves e percurso de carga com a administração. Informe a Kraken sobre objetos grandes ou pesados.'],
  parkingTitle: ['Parkplatz für den Umzugswagen klären','Arrange space for the moving van',"Prepare el aparcamiento de la furgoneta",'Prévoir une place pour le fourgon',"Organizzi il parcheggio del furgone",'Prepare o estacionamento da carrinha'],
  parkingBody: ['Klären Sie für beide Adressen mit Verwaltung oder Gemeinde, ob eine Bewilligung oder reservierte Parkfelder nötig sind.','Check with the property manager or municipality at both addresses whether a permit or reserved parking is needed.',"Consulte en ambas direcciones si necesita permiso o plazas reservadas, con la administración o el ayuntamiento.",'Vérifiez aux deux adresses, auprès de la régie ou de la commune, si une autorisation ou des places réservées sont nécessaires.',"Verifichi per entrambi gli indirizzi con l’amministrazione o il comune se servono permessi o posti riservati.",'Consulte a administração ou o município nas duas moradas sobre autorizações ou lugares reservados.'],
  parkingZurich: ['Zürich: mindestens 7 Arbeitstage Vorlauf in der Blauen Zone, 3 in der Weissen Zone. Sonderöffnungszeiten auf der Behördenseite prüfen.','Zurich: at least 7 working days’ notice for blue-zone spaces, 3 for white-zone spaces. Check the authority’s holiday arrangements.',"Zúrich: mínimo 7 días laborables para zona azul y 3 para zona blanca. Revise los horarios especiales de la autoridad.",'Zurich : au moins 7 jours ouvrables en zone bleue, 3 en zone blanche. Vérifiez les horaires particuliers de l’autorité.',"Zurigo: almeno 7 giorni lavorativi per la zona blu, 3 per la zona bianca. Verifichi gli orari speciali dell’autorità.",'Zurique: pelo menos 7 dias úteis para zona azul, 3 para zona branca. Verifique os horários especiais da autoridade.'],
  parkingWinterthur: ['Winterthur: Sperrung markierter Parkfelder beantragen. Die Stadt stellt die bewilligten Parkverbotstafeln auf.','Winterthur: apply to reserve marked parking bays. The city installs the approved no-parking signs.',"Winterthur: solicite el cierre de plazas señalizadas. La ciudad instala las señales autorizadas de prohibido aparcar.",'Winterthour : demandez la réservation de places marquées. La ville installe la signalisation autorisée.',"Winterthur: richieda la chiusura dei posti delimitati. La città installa la segnaletica autorizzata.",'Winterthur: solicite a reserva de lugares marcados. A cidade instala os sinais autorizados.'],
  parkingSchaffhausen: ['Schaffhausen: Ablauf und Bewilligung direkt mit dem Verkehrs- und Parkdienst klären.','Schaffhausen: confirm the procedure and any permit directly with the traffic and parking service.',"Schaffhausen: confirme el procedimiento y el permiso con el servicio municipal de tráfico y aparcamiento.",'Schaffhouse : vérifiez la procédure et l’autorisation auprès du service de circulation et stationnement.',"Sciaffusa: verifichi procedura e permessi con il servizio comunale traffico e parcheggi.",'Schaffhausen: confirme o procedimento e a autorização com o serviço municipal de trânsito e estacionamento.'],
  postTitle: ['Post nachsenden lassen','Forward your mail',"Reenvíe su correo postal",'Faire suivre votre courrier',"Fare inoltrare la posta",'Reencaminhe o correio'],
  postBody: ['Bei Bedarf Nachsendung bei der Schweizerischen Post einrichten, idealerweise 4 Werktage vor dem gewünschten Beginn.','If needed, arrange forwarding with Swiss Post, ideally 4 working days before the requested start.',"Si lo necesita, active el reenvío con Swiss Post, idealmente 4 días laborables antes de que empiece.",'Si nécessaire, demandez le suivi à la Poste, idéalement 4 jours ouvrables avant le début souhaité.',"Se serve, richieda l’inoltro alla Posta, idealmente 4 giorni lavorativi prima dell’inizio desiderato.",'Se necessário, peça o reencaminhamento à Swiss Post, idealmente 4 dias úteis antes da data de início.'],
  handoverTitle: ['Wohnungsübergabe vorbereiten','Prepare the handover',"Prepare la entrega de la vivienda",'Préparer la remise du logement',"Prepari la riconsegna",'Prepare a entrega da habitação'],
  handoverBody: ['Übergabetermin und vereinbarten Reinigungsumfang abstimmen. Zustand, Zählerstände und Schlüssel gemeinsam im Übergabeprotokoll festhalten.','Agree the handover date and cleaning scope. Record the condition, meter readings and keys together in the handover report.',"Acuerde la fecha de entrega y la limpieza. Registre el estado, los contadores y las llaves en el acta de entrega.",'Convenez de la date et du nettoyage. Consignez ensemble l’état, les relevés de compteurs et les clés dans le procès-verbal.',"Concordi data e pulizia. Registri insieme alla controparte stato, letture dei contatori e chiavi nel verbale di consegna.",'Combine a data e a limpeza. Registem o estado, as leituras dos contadores e as chaves no auto de entrega.'],
  registerTitle: ['Umzug bei der Gemeinde melden','Notify the municipality',"Comunique el cambio al municipio",'Annoncer le déménagement à la commune',"Comunichi il trasloco al comune",'Comunique a mudança ao município'],
  registerBody: ['In der Regel innert 14 Tagen anmelden. eUmzug prüft die Verfügbarkeit; andernfalls Einwohnerkontrolle kontaktieren.','Registration is generally due within 14 days. Check eUmzug eligibility; otherwise contact the residents’ office.',"El registro suele exigirse en 14 días. Compruebe si puede usar eUmzug; si no, contacte con el registro municipal.",'L’annonce se fait généralement sous 14 jours. Vérifiez l’accès à eUmzug, sinon contactez le contrôle des habitants.',"Di regola la registrazione va fatta entro 14 giorni. Verifichi l’accesso a eUmzug, altrimenti contatti il controllo abitanti.",'O registo é geralmente exigido em 14 dias. Verifique se pode usar eUmzug; caso contrário, contacte o registo municipal.'],
  registerScope: ['Diese Checkliste betrifft Umzüge innerhalb der Schweiz. Bei internationalem Umzug oder besonderen Aufenthaltsbewilligungen die zuständige Behörde fragen.','This checklist covers moves within Switzerland. For international moves or particular residence permits, ask the relevant authority.',"Esta guía cubre mudanzas dentro de Suiza. Para mudanzas internacionales o permisos de residencia especiales, consulte a la autoridad competente.",'Ce guide concerne les déménagements en Suisse. Pour un déplacement international ou un permis particulier, consultez l’autorité compétente.',"Questa guida riguarda traslochi in Svizzera. Per trasferimenti internazionali o permessi particolari, consulti l’autorità competente.",'Este guia cobre mudanças na Suíça. Para mudanças internacionais ou autorizações especiais, consulte a autoridade competente.'],
  vehicleTitle: ['Fahrzeug und Kontrollschilder aktualisieren','Update vehicle registration and plates',"Actualice el registro del vehículo y las matrículas",'Mettre à jour le véhicule et les plaques',"Aggiornare immatricolazione e targhe",'Atualize o registo do veículo e as matrículas'],
  vehicleDifferent: ['Kantonswechsel: innert 14 Tagen beim neuen Strassenverkehrsamt melden. Fahrzeugausweis, Versicherungsnachweis und Kontrollschilderwechsel mit dem Amt vorbereiten.','Changing canton: notify the new road traffic office within 14 days. Prepare the vehicle permit, insurance certificate and plate exchange with the office.',"Cambio de cantón: avise a Tráfico del nuevo cantón en 14 días. Prepare permiso de circulación, seguro y cambio de matrículas con la oficina.",'Changement de canton : annoncez-vous sous 14 jours au service des automobiles. Préparez permis de circulation, attestation d’assurance et échange des plaques.',"Cambio di cantone: avvisi entro 14 giorni il nuovo ufficio della circolazione. Prepari licenza di circolazione, attestato assicurativo e cambio targhe.",'Mudança de cantão: avise o novo serviço de trânsito em 14 dias. Prepare licença de circulação, comprovativo de seguro e troca de matrículas.'],
  vehicleSame: ['Im gleichen Kanton: Adresse innert 14 Tagen dem Strassenverkehrsamt melden; die Kontrollschilder können bleiben.','Same canton: notify the road traffic office of your address within 14 days; you can keep the plates.',"Mismo cantón: comunique la dirección a Tráfico en 14 días; puede conservar las matrículas.",'Même canton : annoncez la nouvelle adresse au service des automobiles sous 14 jours ; vous pouvez conserver les plaques.',"Stesso cantone: comunichi l’indirizzo all’ufficio della circolazione entro 14 giorni; può tenere le targhe.",'Mesmo cantão: comunique a morada ao serviço de trânsito em 14 dias; pode manter as matrículas.'],
  vehicleUnknown: ['Neue Adresse dem Strassenverkehrsamt melden. Bei Kantonswechsel sind auch neue Kontrollschilder erforderlich; Vorgehen beim neuen Amt prüfen.','Notify the road traffic office of the new address. Changing canton also requires new plates; check the new office’s procedure.',"Comunique la dirección a Tráfico. Al cambiar de cantón también necesita nuevas matrículas; consulte el procedimiento en la nueva oficina.",'Signalez la nouvelle adresse au service des automobiles. Un changement de canton nécessite aussi de nouvelles plaques ; consultez le nouvel office.',"Comunichi il nuovo indirizzo all’ufficio della circolazione. Cambiando cantone servono nuove targhe; verifichi la procedura del nuovo ufficio.",'Comunique a nova morada ao serviço de trânsito. Mudar de cantão também exige novas matrículas; consulte o novo serviço.'],
  notifyTitle: ['Wichtige Kontakte informieren','Update your key contacts',"Actualice sus contactos importantes",'Informer vos contacts importants',"Avvisi i contatti importanti",'Informe os contactos importantes'],
  notifyBody: ['Bank, Arbeitgeber, Versicherungen, Krankenkasse, Energie- und Internetanbieter informieren. Schule und Hundeanmeldung ergänzen, falls zutreffend.','Notify your bank, employer, insurers, health insurer, energy and internet providers. Add school and dog registration if relevant.',"Avise al banco, empresa, seguros, seguro médico, energía e internet. Añada escuela y registro del perro si corresponde.",'Prévenez banque, employeur, assurances, caisse maladie, énergie et internet. Ajoutez école et inscription du chien si nécessaire.',"Avvisi banca, datore di lavoro, assicurazioni, cassa malati, energia e internet. Aggiunga scuola e registrazione del cane se necessario.",'Avise banco, empregador, seguros, seguro de saúde, energia e internet. Acrescente escola e registo do cão, se aplicável.'],
  official: ['Offizielle Informationen','Official information','Información oficial','Informations officielles','Informazioni ufficiali','Informação oficial'],
  registrationLink: ['Einwohnerkontrolle','Residents’ office','Registro municipal','Contrôle des habitants','Controllo abitanti','Registo municipal'],
  parkingLink: ['Parkplatz und Bewilligung','Parking and permits','Aparcamiento y permisos','Stationnement et autorisations','Parcheggio e permessi','Estacionamento e autorizações'],
  vehicleLink: ['Strassenverkehrsamt','Road traffic office','Oficina de tráfico','Service des automobiles','Ufficio della circolazione','Serviço de trânsito'],
  save: ['Dokument herunterladen','Download document','Descargar documento','Télécharger le document',"Scaricare documento",'Descarregar documento'],
  print: ['Drucken / als PDF','Print / save as PDF','Imprimir / guardar PDF','Imprimer / enregistrer en PDF',"Stampare / salvare in PDF",'Imprimir / guardar PDF'],
  downloadReady: ['Ihr Dokument wurde vorbereitet.','Your document is ready.',"Su documento está preparado.",'Votre document est prêt.','Il documento è pronto.','O seu documento está pronto.'],
  popupBlocked: ['Bitte erlauben Sie ein neues Fenster zum Drucken oder laden Sie das Dokument herunter.','Allow a new window to print, or download the document.',"Permita abrir una ventana para imprimir o descargue el documento.",'Autorisez une nouvelle fenêtre pour imprimer, ou téléchargez le document.',"Consenta una nuova finestra per stampare oppure scarichi il documento.",'Permita uma nova janela para imprimir ou descarregue o documento.'],
  preparing: ['Wird vorbereitet…','Preparing…','Preparando…','Préparation…','Preparazione…','A preparar…'],
  close: ['Umzugsplan schliessen','Close moving plan','Cerrar guía de mudanza','Fermer le guide',"Chiudere la guida",'Fechar guia de mudança'],
  back: ['Zurück zur Planung','Back to planning','Volver a la planificación','Retour à la préparation',"Tornare alla pianificazione",'Voltar ao planeamento'],
  reviewed: ['Quellen geprüft am 24.11.2026','Sources checked on 24 November 2026','Fuentes verificadas el 24 de noviembre de 2026','Sources vérifiées le 24 novembre 2026','Fonti verificate il 24 novembre 2026','Fontes verificadas em 24 de novembro de 2026'],
  note: ['Dies ist Ihre Planungshilfe. Massgeblich sind die aktuellen Vorgaben der verlinkten Behörden. Es wird kein Antrag eingereicht und kein Termin gebucht.','This is a planning aid. The linked authorities’ current requirements apply. It submits no applications and books no appointments.','Esta es una ayuda para planificar. Rigen los requisitos actuales de las autoridades enlazadas. No presenta trámites ni reserva citas.','Ce document vous aide à planifier. Les exigences actuelles des autorités liées font foi. Aucune démarche ni réservation n’est effectuée.','È un aiuto alla pianificazione. Valgono i requisiti aggiornati delle autorità collegate. Non invia domande né prenota appuntamenti.','É uma ajuda ao planeamento. Aplicam-se os requisitos atuais das autoridades indicadas. Não submete pedidos nem marca serviços.'],
  privacy: ['Der Download wird auf Ihrem Gerät erstellt. Die Behördenlinks öffnen sich separat.','The download is created on your device. Authority links open separately.',"La descarga se crea en su dispositivo. Los enlaces oficiales se abren aparte.",'Le document est créé sur votre appareil. Les liens officiels s’ouvrent séparément.',"Il documento viene creato sul suo dispositivo. I link ufficiali si aprono separatamente.",'O documento é criado no seu dispositivo. As ligações oficiais abrem em separado.'],
  preview: ['Designvorschau · keine Datenübermittlung','Design preview · no data submitted','Vista de diseño · no se envían datos','Aperçu · aucune donnée transmise','Anteprima · nessun dato inviato','Pré-visualização · sem envio de dados'],
  complete: ['erledigt','completed','completados','effectués','completati','concluídos'],
  contact: ['Persönliche Hilfe von Kraken','Personal help from Kraken','Ayuda personal de Kraken','Aide personnelle de Kraken','Aiuto personale da Kraken','Ajuda pessoal da Kraken'],
};

export function movingGuideCopy(language: string): Record<string, string> {
  const index = languages.indexOf(bookingLanguage(language));
  return Object.fromEntries(Object.entries(words).map(([key, row]) => [key, row[index]]));
}
export function normalizeGuidePreferences(value?: Partial<GuidePreferences>): GuidePreferences {
  const place = (raw: unknown): GuidePlace => GUIDE_PLACES.includes(raw as GuidePlace) ? raw as GuidePlace : 'unknown';
  return { from: place(value?.from), to: place(value?.to), vehicle: value?.vehicle === true };
}
export function isMovingGuideService(service?: string | null): boolean { return ['moving','small-move','endOfTenancy','end-of-tenancy'].includes(service || ''); }
export function guidePlaceLabel(place: GuidePlace, language: string): string {
  const copy = movingGuideCopy(language);
  return ({ zurich: 'Zürich · ZH', winterthur: 'Winterthur · ZH', schaffhausen: 'Schaffhausen · SH' } as Record<string,string>)[place] || copy[place];
}
const canton = (place: GuidePlace) => ['zurich','winterthur','zh'].includes(place) ? 'ZH' : ['schaffhausen','sh'].includes(place) ? 'SH' : null;
const clean = (value: unknown, maximum = 180) => typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,maximum) : '';
const dateLabel = (date: unknown, language: string) => {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return '';
  const parsed = new Date(`${date}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0,10) === date ? new Intl.DateTimeFormat(language,{dateStyle:'long',timeZone:'Europe/Zurich'}).format(parsed) : '';
};

export function buildMovingGuide(input: MovingGuideInput): MovingGuideDocument {
  const language = bookingLanguage(input.language), copy = movingGuideCopy(language), preferences = normalizeGuidePreferences(input.preferences);
  const context: MovingGuideDocument['context'] = [];
  const name = clean(input.customer?.name,120), address = [clean(input.customer?.address),[clean(input.customer?.postalCode,12),clean(input.customer?.city,100)].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  if(name) context.push({label:copy.customer,value:name});
  if(isMovingGuideService(input.service)) context.push({label:copy.service,value:bookingText(language,['moving','small-move'].includes(input.service || '')?'moving':'endOfTenancy')});
  if(address) context.push({label:copy.address,value:address});
  const preferredDate = dateLabel(input.requestedDate,language);
  if(preferredDate) context.push({label:input.appointmentConfirmed === true ? copy.dateConfirmed : copy.date,value:input.appointmentConfirmed === true ? preferredDate : `${preferredDate} · ${copy.unconfirmed}`});
  context.push({label:copy.from,value:guidePlaceLabel(preferences.from,language)},{label:copy.to,value:guidePlaceLabel(preferences.to,language)});
  const source = MOVING_GUIDE_SOURCES;
  const items: GuideItem[] = [{id:'access',phase:'before',title:copy.accessTitle,body:copy.accessBody,links:[]}];
  const places = [...new Set([preferences.from,preferences.to])];
  const parkingLinks: GuideLink[] = [{label:'ch.ch',url:source.checklist}];
  let parkingBody = copy.parkingBody;
  if(places.includes('zurich')) { parkingBody += ` ${copy.parkingZurich}`; parkingLinks.push({label:`Zürich · ${copy.parkingLink}`,url:source.parkingZurich}); }
  if(places.includes('winterthur')) { parkingBody += ` ${copy.parkingWinterthur}`; parkingLinks.push({label:`Winterthur · ${copy.parkingLink}`,url:source.parkingWinterthur}); }
  if(places.includes('schaffhausen')) { parkingBody += ` ${copy.parkingSchaffhausen}`; parkingLinks.push({label:`Schaffhausen · ${copy.parkingLink}`,url:source.parkingSchaffhausen}); }
  items.push({id:'parking',phase:'before',title:copy.parkingTitle,body:parkingBody,links:parkingLinks});
  items.push({id:'post',phase:'before',title:copy.postTitle,body:copy.postBody,links:[{label:'Swiss Post',url:source.post}]});
  items.push({id:'handover',phase:'day',title:copy.handoverTitle,body:copy.handoverBody,links:[{label:'ch.ch',url:source.checklist}]});
  const registrationLinks: GuideLink[] = [{label:'eUmzugCH',url:source.eumzug},{label:'ch.ch',url:source.registration}];
  const destinationRegistration = ({zurich:source.zurichRegistration,winterthur:source.winterthurRegistration,schaffhausen:source.schaffhausenRegistration} as Partial<Record<GuidePlace,string>>)[preferences.to];
  if(destinationRegistration) registrationLinks.push({label:copy.registrationLink,url:destinationRegistration});
  items.push({id:'registration',phase:'after',title:copy.registerTitle,body:copy.registerBody,links:registrationLinks});
  if(preferences.vehicle) {
    const from = canton(preferences.from), to = canton(preferences.to);
    const vehicleBody = from && to ? from === to ? copy.vehicleSame : copy.vehicleDifferent : copy.vehicleUnknown;
    const vehicleUrl = to === 'ZH' ? source.vehicleZurich : to === 'SH' ? source.vehicleSchaffhausen : source.vehicleDirectory;
    items.push({id:'vehicle',phase:'after',title:copy.vehicleTitle,body:vehicleBody,links:[{label:'asa · '+copy.official,url:source.vehicle},{label:copy.vehicleLink,url:vehicleUrl}]});
  }
  items.push({id:'contacts',phase:'after',title:copy.notifyTitle,body:copy.notifyBody,links:[{label:'ch.ch',url:source.checklist}]});
  return {language,title:copy.title,subtitle:copy.subtitle,context,items,preferences,copy,completed:(input.completed||[]).filter(id=>items.some(item=>item.id===id)),preview:input.preview===true};
}

/** Safe to put in an email: only locale, public service enum and broad place choices. Never includes names, address, email or tokens. */
export function movingGuideLink(language: string, preferences?: Partial<GuidePreferences>, service?: string | null): string {
  const choice=normalizeGuidePreferences(preferences), params=new URLSearchParams({lang:bookingLanguage(language),guide:'1',service:['moving','small-move'].includes(service || '')?'moving':'end-of-tenancy'});
  if(choice.from!=='unknown') params.set('guideFrom',choice.from);
  if(choice.to!=='unknown') params.set('guideTo',choice.to);
  if(choice.vehicle) params.set('guideVehicle','1');
  return `/quote?${params.toString()}`;
}
export function guidePreferencesFromQuery(search: string): GuidePreferences {
  const params=new URLSearchParams(search);
  return normalizeGuidePreferences({from:params.get('guideFrom') as GuidePlace,to:params.get('guideTo') as GuidePlace,vehicle:params.get('guideVehicle')==='1'});
}
export function escapeGuideHtml(value: unknown): string { return String(value ?? '').replace(/[&<>"']/g, char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!)); }

/** Generates a printable HTML file; caller can supply a locally fetched data URL for an offline logo. */
export function movingGuideHtml(document: MovingGuideDocument, logoDataUrl?: string): string {
  const e=escapeGuideHtml, copy=document.copy;
  const logo=typeof logoDataUrl==='string' && /^data:image\/(?:webp|png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(logoDataUrl) ? `<img src="${logoDataUrl}" width="112" height="68" alt="Kraken">` : '<strong class="wordmark">Kraken</strong>';
  const groups=(['before','day','after'] as const).map(phase=>`<section><h2>${e(copy[phase])}</h2>${document.items.filter(item=>item.phase===phase).map(item=>`<article><span class="check" aria-hidden="true">${document.completed.includes(item.id)?'✓':''}</span><div><h3>${e(item.title)}</h3><p>${e(item.body)}</p>${item.links.length?`<ul class="sources">${item.links.map(link=>`<li><a href="${e(link.url)}" rel="noopener noreferrer">${e(link.label)}</a><span>${e(link.url)}</span></li>`).join('')}</ul>`:''}</div></article>`).join('')}</section>`).join('');
  return `<!doctype html><html lang="${document.language}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>${e(copy.cardTitle)} · Kraken</title><style>*{box-sizing:border-box}body{margin:0;background:#edf5fa;color:#103851;font:16px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif}.page{max-width:850px;margin:28px auto;background:#fff;border:1px solid #dce8ee;border-radius:22px;overflow:hidden}header{display:flex;align-items:center;gap:18px;padding:28px 38px;border-bottom:1px solid #e2ebf0}header img{object-fit:cover;object-position:center}header small{border-left:1px solid #dce8ee;padding-left:18px;font-size:12px;font-weight:700;line-height:1.5}.wordmark{font-size:32px;letter-spacing:-2px}main{padding:30px 38px}.eyebrow{color:#527780;font-size:12px;letter-spacing:.13em;text-transform:uppercase;font-weight:800}h1{font-size:34px;letter-spacing:-1px;line-height:1.18;margin:10px 0}h2{font-size:20px;margin:30px 0 12px}h3{font-size:17px;line-height:1.35;margin:0 0 7px}p{margin:0 0 10px}.context{background:#eff9f5;border:1px solid #d9ebe1;border-radius:14px;padding:18px 20px;margin:24px 0;display:grid;grid-template-columns:1fr 1fr;gap:13px}.context dt{font-size:12px;color:#56767b}.context dd{margin:2px 0 0;font-weight:650;overflow-wrap:anywhere}article{display:flex;gap:13px;padding:17px 0;border-bottom:1px solid #e4edf1;break-inside:avoid}.check{flex:0 0 20px;height:20px;border:1.5px solid #97b7bc;border-radius:6px;color:#15775c;line-height:17px;text-align:center;margin-top:2px}.sources{padding:0;margin:8px 0 0;list-style:none}.sources li{margin:6px 0}.sources a{color:#0874a7;font-size:13px;font-weight:600;text-underline-offset:3px}.sources span{display:block;color:#66818a;font-size:10px;overflow-wrap:anywhere}.note{padding:18px 20px;border:1px solid #dce8ee;background:#f6fafc;border-radius:12px;font-size:13px;margin-top:26px}.note p:last-child{margin:0}.preview{font-size:12px;color:#8b6a24;background:#fff8e8;border-radius:8px;padding:8px 12px;margin:15px 0}footer{padding:22px 38px;background:#062c4c;color:#e4f5f7;font-size:13px}footer strong{display:block;font-size:15px;margin-bottom:6px}footer a{color:#d5f6eb;text-decoration:none}footer p{margin:4px 0}@media(max-width:600px){.page{margin:0;border-radius:0;border:0}header,main,footer{padding:22px}h1{font-size:28px}.context{grid-template-columns:1fr}}@page{size:A4;margin:14mm}@media print{body{background:#fff;font-size:10pt}.page{max-width:none;margin:0;border:0;border-radius:0}header{padding:0 0 15px}main{padding:14px 0}h1{font-size:26pt}h2{font-size:15pt}h3{font-size:12pt}article{padding:11px 0}.context{padding:12px;margin:16px 0}footer{background:#fff;color:#103851;border-top:1px solid #dce8ee;padding:14px 0}footer a{color:#103851}.sources a{font-size:9pt}.sources span{font-size:7pt}.note{font-size:9pt;padding:12px}.preview{font-size:9pt}}</style></head><body><div class="page"><header>${logo}<small>${e(copy.brandDescriptor)}</small></header><main><p class="eyebrow">${e(copy.cardTitle)}</p><h1>${e(document.title)}</h1><p>${e(document.subtitle)}</p>${document.preview?`<p class="preview">${e(copy.preview)}</p>`:''}<dl class="context">${document.context.map(row=>`<div><dt>${e(row.label)}</dt><dd>${e(row.value)}</dd></div>`).join('')}</dl>${groups}<div class="note"><p><strong>${e(copy.reviewed)}</strong></p><p>${e(copy.registerScope)}</p><p>${e(copy.note)}</p></div></main><footer><strong>${e(copy.contact)}</strong><p>Kraken PFM</p><p>Seewadelstrasse 3 · 8203 Schaffhausen</p><p><a href="tel:+41774505705">+41 77 450 57 05</a> · <a href="mailto:kai@krakenpfm.ch">kai@krakenpfm.ch</a></p><p>krakenpfm.ch</p></footer></div></body></html>`;
}
