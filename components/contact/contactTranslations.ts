/** Contact page copy. German source strings are stable keys; translations are plain text. */
import { normalizeHomeLanguage, type HomeLanguage } from '../home/homeTranslations.ts';
import { BUSINESS_HOURS, businessHoursSentence, businessHoursTimeZoneLabel } from '../../src/config/business-hours.mjs';

type ContactTranslationRow = readonly [de: string, en: string, es: string, pt: string, it: string, fr: string];
const languageIndex: Readonly<Record<HomeLanguage, number>> = { de: 0, en: 1, es: 2, pt: 3, it: 4, fr: 5 };
const same = <const Source extends string>(source: Source) => [source, source, source, source, source, source] as const;

// These legacy source strings are lookup keys, not the current displayed hours.
const legacyHoursDescriptionSource = 'Kontaktieren Sie Kraken PFM in Schaffhausen. Persönlich erreichbar von Montag bis Sonntag, 09:00–19:00 Uhr. Reinigung und kleine Umzüge im bestehenden Rechner planen.';
const legacyHoursSource = '09:00–19:00';
const hoursDescriptionParts: Record<HomeLanguage, readonly [string, string]> = {
  de: ['Kontaktieren Sie Kraken PFM in Schaffhausen.', 'Reinigung und kleine Umzüge im bestehenden Rechner planen.'],
  en: ['Contact Kraken PFM in Schaffhausen.', 'Plan cleaning and small moves in our existing calculator.'],
  es: ['Contacte con Kraken PFM en Schaffhausen.', 'Planifique limpiezas y pequeñas mudanzas en nuestro calculador.'],
  pt: ['Contacte a Kraken PFM em Schaffhausen.', 'Planeie limpezas e pequenas mudanças no nosso calculador.'],
  it: ['Contatti Kraken PFM a Sciaffusa.', 'Pianifichi pulizie e piccoli traslochi nel nostro calcolatore.'],
  fr: ['Contactez Kraken PFM à Schaffhouse.', 'Planifiez nettoyages et petits déménagements dans notre calculateur.'],
};
const hoursDescription = (language: HomeLanguage) => `${hoursDescriptionParts[language][0]} ${businessHoursSentence(language)} ${hoursDescriptionParts[language][1]}`;

export const contactTranslationRows = [
  ['Kontakt · Kraken PFM in Schaffhausen', 'Contact · Kraken PFM in Schaffhausen', 'Contacto · Kraken PFM en Schaffhausen', 'Contacto · Kraken PFM em Schaffhausen', 'Contatti · Kraken PFM a Sciaffusa', 'Contact · Kraken PFM à Schaffhouse'],
  [legacyHoursDescriptionSource, hoursDescription('en'), hoursDescription('es'), hoursDescription('pt'), hoursDescription('it'), hoursDescription('fr')],
  ['KONTAKT · SCHAFFHAUSEN', 'CONTACT · SCHAFFHAUSEN', 'CONTACTO · SCHAFFHAUSEN', 'CONTACTO · SCHAFFHAUSEN', 'CONTATTI · SCIAFFUSA', 'CONTACT · SCHAFFHOUSE'],
  ['Näher dran.', 'Closer to you.', 'Más cerca de usted.', 'Mais perto de si.', 'Più vicini a lei.', 'Plus près de vous.'],
  ['Persönlich für Sie da.', 'Personally here for you.', 'Atención personal para usted.', 'Pessoalmente ao seu dispor.', 'Al suo fianco, di persona.', 'Personnellement à vos côtés.'],
  ['Ihr Zuhause. Ihr nächster Schritt.', 'Your home. Your next step.', 'Su hogar. Su próximo paso.', 'A sua casa. O seu próximo passo.', 'La sua casa. Il suo prossimo passo.', 'Votre maison. Votre prochaine étape.'],
  ['Wir machen es Ihnen einfach.', 'We make it easy for you.', 'Se lo ponemos fácil.', 'Nós tornamos tudo mais simples.', 'Le rendiamo tutto più semplice.', 'Nous vous simplifions la vie.'],
  ['Interaktive Karte mit Kraken und drei Beispielzielen', 'Interactive map with Kraken and three example destinations', 'Mapa interactivo con Kraken y tres destinos de ejemplo', 'Mapa interativo com a Kraken e três destinos de exemplo', 'Mappa interattiva con Kraken e tre destinazioni di esempio', 'Carte interactive avec Kraken et trois destinations d’exemple'],
  ['Strassen, Fluss und Gebäude in Schaffhausen', 'Streets, river and buildings in Schaffhausen', 'Calles, río y edificios de Schaffhausen', 'Ruas, rio e edifícios de Schaffhausen', 'Strade, fiume ed edifici di Sciaffusa', 'Rues, fleuve et bâtiments de Schaffhouse'],
  ['Schaffhausen & Umgebung', 'Schaffhausen & surroundings', 'Schaffhausen y alrededores', 'Schaffhausen e arredores', 'Sciaffusa e dintorni', 'Schaffhouse et environs'],
  ['Vorschau', 'Preview', 'Vista previa', 'Pré-visualização', 'Anteprima', 'Aperçu'],
  ['Karte ziehen · + / − zum Zoomen', 'Drag the map · + / − to zoom', 'Arrastre el mapa · + / − para ampliar', 'Arraste o mapa · + / − para ampliar', 'Trascini la mappa · + / − per lo zoom', 'Déplacez la carte · + / − pour zoomer'],
  ['Mit zwei Fingern bewegen · + / − zoomen', 'Move with two fingers · + / − to zoom', 'Mueva con dos dedos · + / − para ampliar', 'Mova com dois dedos · + / − para ampliar', 'Sposti con due dita · + / − per lo zoom', 'Déplacez avec deux doigts · + / − pour zoomer'],
  ['Karte ziehen · Strg + Scrollen oder + / − zum Zoomen', 'Drag the map · Ctrl + scroll or + / − to zoom', 'Arrastre el mapa · Ctrl + rueda o + / − para ampliar', 'Arraste o mapa · Ctrl + deslocamento ou + / − para ampliar', 'Trascini la mappa · Ctrl + scorrimento o + / − per lo zoom', 'Déplacez la carte · Ctrl + défilement ou + / − pour zoomer'],
  ['Kraken Standort und Bürokonzept ansehen', 'View Kraken’s location and office concept', 'Ver la ubicación y el concepto de oficina de Kraken', 'Ver a localização e o conceito de escritório da Kraken', 'Vedere la sede e il concept dell’ufficio Kraken', 'Voir l’emplacement et le concept des bureaux Kraken'],
  ['Fotorealistisches Konzept einer Kraken-Geschäftsstelle', 'Photorealistic concept of a Kraken office', 'Concepto fotorrealista de una oficina de Kraken', 'Conceito fotorrealista de um escritório da Kraken', 'Concept fotorealistico di un ufficio Kraken', 'Concept photoréaliste d’une agence Kraken'],
  ['Standort Schaffhausen', 'Schaffhausen location', 'Sede de Schaffhausen', 'Sede em Schaffhausen', 'Sede di Sciaffusa', 'Site de Schaffhouse'],
  ['Route zum Bahnhof Schaffhausen', 'Route to Schaffhausen station', 'Ruta a la estación de Schaffhausen', 'Percurso até à estação de Schaffhausen', 'Percorso verso la stazione di Sciaffusa', 'Itinéraire vers la gare de Schaffhouse'],
  ['Route zum Bahnhof Neuhausen', 'Route to Neuhausen station', 'Ruta a la estación de Neuhausen', 'Percurso até à estação de Neuhausen', 'Percorso verso la stazione di Neuhausen', 'Itinéraire vers la gare de Neuhausen'],
  ['Route zum Rheinfall', 'Route to the Rhine Falls', 'Ruta a las cataratas del Rin', 'Percurso até às cataratas do Reno', 'Percorso verso le cascate del Reno', 'Itinéraire vers les chutes du Rhin'],
  ['Bahnhof', 'Station', 'Estación', 'Estação', 'Stazione', 'Gare'],
  ['Bahnhof Schaffhausen', 'Schaffhausen station', 'Estación de Schaffhausen', 'Estação de Schaffhausen', 'Stazione di Sciaffusa', 'Gare de Schaffhouse'],
  ['Bahnhof Neuhausen', 'Neuhausen station', 'Estación de Neuhausen', 'Estação de Neuhausen', 'Stazione di Neuhausen', 'Gare de Neuhausen'],
  ['Bahnhof Schaffhausen, Neuhausen, Rheinfall', 'Schaffhausen station, Neuhausen, Rhine Falls', 'Estación de Schaffhausen, Neuhausen, cataratas del Rin', 'Estação de Schaffhausen, Neuhausen, cataratas do Reno', 'Stazione di Sciaffusa, Neuhausen, cascate del Reno', 'Gare de Schaffhouse, Neuhausen, chutes du Rhin'],
  same('Neuhausen'),
  ['Rheinfall', 'Rhine Falls', 'Cataratas del Rin', 'Cataratas do Reno', 'Cascate del Reno', 'Chutes du Rhin'],
  ['Kartensteuerung', 'Map controls', 'Controles del mapa', 'Controlos do mapa', 'Controlli della mappa', 'Commandes de la carte'],
  ['Karte vergrössern', 'Zoom in', 'Ampliar el mapa', 'Ampliar o mapa', 'Ingrandire la mappa', 'Agrandir la carte'],
  ['Karte verkleinern', 'Zoom out', 'Reducir el mapa', 'Reduzir o mapa', 'Ridurre la mappa', 'Réduire la carte'],
  ['Gesamte Route zentrieren', 'Centre the whole route', 'Centrar toda la ruta', 'Centrar todo o percurso', 'Centrare tutto il percorso', 'Centrer l’itinéraire complet'],
  ['Beispielroute abspielen', 'Play the example route', 'Reproducir la ruta de ejemplo', 'Reproduzir o percurso de exemplo', 'Riprodurre il percorso di esempio', 'Lire l’itinéraire d’exemple'],
  ['Route abspielen', 'Play the route', 'Reproducir la ruta', 'Reproduzir o percurso', 'Riprodurre il percorso', 'Lire l’itinéraire'],
  ['Route ansehen', 'View route', 'Ver la ruta', 'Ver o percurso', 'Vedere il percorso', 'Voir l’itinéraire'],
  ['Pause', 'Pause', 'Pausa', 'Pausa', 'Pausa', 'Pause'],
  ['Erneut ansehen', 'Watch again', 'Ver de nuevo', 'Ver novamente', 'Rivedere', 'Revoir'],
  ['Weiter ansehen', 'Continue watching', 'Continuar', 'Continuar', 'Continuare', 'Continuer'],
  ['Routenanimation pausieren', 'Pause the route animation', 'Pausar la animación de la ruta', 'Pausar a animação do percurso', 'Mettere in pausa l’animazione del percorso', 'Mettre en pause l’animation de l’itinéraire'],
  ['Kraken Kontakt und Anfahrt', 'Kraken contact and directions', 'Contacto y cómo llegar a Kraken', 'Contacto e como chegar à Kraken', 'Contatti e indicazioni per Kraken', 'Contact et accès à Kraken'],
  same('Properties & Facilities Management'),
  ['Bilder der Bürogestaltung vergrössern', 'Enlarge the office concept images', 'Ampliar las imágenes del concepto de oficina', 'Ampliar as imagens do conceito de escritório', 'Ingrandire le immagini del concept dell’ufficio', 'Agrandir les images du concept des bureaux'],
  ['Fassade als fotorealistischer Gestaltungsentwurf', 'Facade shown as a photorealistic design concept', 'Fachada como propuesta de diseño fotorrealista', 'Fachada como proposta de design fotorrealista', 'Facciata come proposta progettuale fotorealistica', 'Façade présentée comme un concept d’aménagement photoréaliste'],
  ['2 Ansichten', '2 views', '2 vistas', '2 vistas', '2 viste', '2 vues'],
  ['Adresse', 'Address', 'Dirección', 'Endereço', 'Indirizzo', 'Adresse'],
  ['Kontaktzeiten', 'Contact hours', 'Horario de contacto', 'Horário de contacto', 'Orari di contatto', 'Horaires de contact'],
  ['Mo–So', 'Mon–Sun', 'Lun–Dom', 'Seg–Dom', 'Lun–Dom', 'Lun–Dim'],
  ['Montag bis Sonntag', 'Monday to Sunday', 'De lunes a domingo', 'De segunda-feira a domingo', 'Dal lunedì alla domenica', 'Du lundi au dimanche'],
  ['Zeitzone: Europe/Zurich', 'Time zone: Europe/Zurich', 'Zona horaria: Europe/Zurich', 'Fuso horário: Europe/Zurich', 'Fuso orario: Europe/Zurich', 'Fuseau horaire : Europe/Zurich'],
  ['Telefon', 'Phone', 'Teléfono', 'Telefone', 'Telefono', 'Téléphone'],
  ['E-Mail', 'Email', 'Correo electrónico', 'E-mail', 'E-mail', 'E-mail'],
  ['Wie finden wir zueinander?', 'How shall we meet?', '¿Cómo nos encontramos?', 'Como nos encontramos?', 'Come ci incontriamo?', 'Comment nous retrouver ?'],
  ['Fahrtrichtung', 'Travel direction', 'Sentido del trayecto', 'Sentido do percurso', 'Direzione del percorso', 'Sens du trajet'],
  ['Zu Ihnen', 'To you', 'Hacia usted', 'Até si', 'Da lei', 'Chez vous'],
  ['Zu Kraken', 'To Kraken', 'Hacia Kraken', 'Até à Kraken', 'Da Kraken', 'Chez Kraken'],
  ['Ihre Adresse', 'Your address', 'Su dirección', 'O seu endereço', 'Il suo indirizzo', 'Votre adresse'],
  ['Adresse oder Ort', 'Address or place', 'Dirección o lugar', 'Endereço ou local', 'Indirizzo o luogo', 'Adresse ou lieu'],
  ['Adresse oder Postleitzahl in der Schweiz', 'Address or postcode in Switzerland', 'Dirección o código postal de Suiza', 'Endereço ou código postal na Suíça', 'Indirizzo o codice postale in Svizzera', 'Adresse ou code postal en Suisse'],
  ['Adresse oder PLZ', 'Address or postcode', 'Dirección o código postal', 'Endereço ou código postal', 'Indirizzo o codice postale', 'Adresse ou code postal'],
  ['Adresse suchen', 'Search for an address', 'Buscar una dirección', 'Procurar um endereço', 'Cercare un indirizzo', 'Rechercher une adresse'],
  ['Adressen werden gesucht …', 'Searching for addresses …', 'Buscando direcciones…', 'A procurar endereços…', 'Ricerca degli indirizzi…', 'Recherche d’adresses…'],
  ['Bitte wählen Sie die passende Adresse.', 'Please choose the matching address.', 'Elija la dirección correcta.', 'Escolha o endereço correto.', 'Scelga l’indirizzo corretto.', 'Veuillez choisir l’adresse correspondante.'],
  ['Keine Adresse gefunden. Bitte prüfen Sie Ihre Eingabe.', 'No address found. Please check what you entered.', 'No se ha encontrado ninguna dirección. Compruebe lo que ha introducido.', 'Não foi encontrado nenhum endereço. Verifique o que introduziu.', 'Nessun indirizzo trovato. Controlli i dati inseriti.', 'Aucune adresse trouvée. Veuillez vérifier votre saisie.'],
  ['Die Adresssuche ist momentan nicht verfügbar. Bitte versuchen Sie es erneut.', 'Address search is currently unavailable. Please try again.', 'La búsqueda de direcciones no está disponible en este momento. Vuelva a intentarlo.', 'A pesquisa de endereços não está disponível de momento. Tente novamente.', 'La ricerca degli indirizzi non è al momento disponibile. Riprovi.', 'La recherche d’adresses est momentanément indisponible. Veuillez réessayer.'],
  ['Route wird berechnet …', 'Calculating route …', 'Calculando la ruta…', 'A calcular o percurso…', 'Calcolo del percorso…', 'Calcul de l’itinéraire…'],
  ['Keine befahrbare Route gefunden.', 'No drivable route found.', 'No se ha encontrado ninguna ruta transitable.', 'Não foi encontrado nenhum percurso transitável.', 'Nessun percorso percorribile in auto trovato.', 'Aucun itinéraire carrossable trouvé.'],
  ['Die Routenberechnung ist momentan nicht verfügbar. Bitte versuchen Sie es erneut.', 'Route calculation is currently unavailable. Please try again.', 'El cálculo de rutas no está disponible en este momento. Vuelva a intentarlo.', 'O cálculo de percursos não está disponível de momento. Tente novamente.', 'Il calcolo del percorso non è al momento disponibile. Riprovi.', 'Le calcul d’itinéraire est momentanément indisponible. Veuillez réessayer.'],
  ['Für die Routenberechnung muss ein Anbieter verbunden werden.', 'A provider must be connected to calculate routes.', 'Es necesario conectar un proveedor para calcular las rutas.', 'É necessário ligar um fornecedor para calcular percursos.', 'Per calcolare i percorsi occorre collegare un fornitore.', 'Un fournisseur doit être connecté pour calculer les itinéraires.'],
  ['Geschätzte Fahrzeit · ohne Live-Verkehr', 'Estimated driving time · no live traffic', 'Tiempo de conducción estimado · sin tráfico en directo', 'Tempo de viagem estimado · sem trânsito em direto', 'Tempo di guida stimato · senza traffico in tempo reale', 'Temps de conduite estimé · sans trafic en direct'],
  ['Bei einer Postleitzahl wird bis zur Ortsmitte gerechnet. Für einen genauen Zielpunkt geben Sie die vollständige Adresse ein.', 'For a postcode, the route is calculated to the town centre. Enter the full address for a precise destination.', 'Con un código postal, la ruta se calcula hasta el centro de la localidad. Introduzca la dirección completa para obtener un destino preciso.', 'Com um código postal, o percurso é calculado até ao centro da localidade. Introduza o endereço completo para obter um destino exato.', 'Con un codice postale, il percorso viene calcolato fino al centro della località. Inserisca l’indirizzo completo per una destinazione precisa.', 'Avec un code postal, l’itinéraire est calculé jusqu’au centre de la localité. Saisissez l’adresse complète pour une destination précise.'],
  ['Ortsmitte als ungefähres Ziel. Für einen genauen Zielpunkt geben Sie die vollständige Adresse ein.', 'Town centre used as an approximate destination. Enter the full address for a precise destination.', 'Se utiliza el centro de la localidad como destino aproximado. Introduzca la dirección completa para obtener un destino preciso.', 'O centro da localidade é utilizado como destino aproximado. Introduza o endereço completo para obter um destino exato.', 'Il centro della località viene usato come destinazione approssimativa. Inserisca l’indirizzo completo per una destinazione precisa.', 'Le centre de la localité est utilisé comme destination approximative. Saisissez l’adresse complète pour une destination précise.'],
  ['Adresssuche: swisstopo · Route: {provider}', 'Address search: swisstopo · Route: {provider}', 'Búsqueda de direcciones: swisstopo · Ruta: {provider}', 'Pesquisa de endereços: swisstopo · Percurso: {provider}', 'Ricerca degli indirizzi: swisstopo · Percorso: {provider}', 'Recherche d’adresses : swisstopo · Itinéraire : {provider}'],
  ['Strassenkarte für die Schweiz', 'Road map of Switzerland', 'Mapa de carreteras de Suiza', 'Mapa de estradas da Suíça', 'Carta stradale della Svizzera', 'Carte routière de la Suisse'],
  ['Interaktive Karte für Adressen in der Schweiz', 'Interactive map for addresses in Switzerland', 'Mapa interactivo para direcciones de Suiza', 'Mapa interativo para endereços na Suíça', 'Mappa interattiva per gli indirizzi in Svizzera', 'Carte interactive pour les adresses en Suisse'],
  ['Schweiz · Ihre Route', 'Switzerland · Your route', 'Suiza · Su ruta', 'Suíça · O seu percurso', 'Svizzera · Il suo percorso', 'Suisse · Votre itinéraire'],
  ['Routenplanung', 'Route planning', 'Planificación de rutas', 'Planeamento de percursos', 'Pianificazione del percorso', 'Planification d’itinéraire'],
  ['Ihre Adresse. Unsere Anfahrt.', 'Your address. Our journey.', 'Su dirección. Nuestro trayecto.', 'O seu endereço. O nosso percurso.', 'Il suo indirizzo. Il nostro percorso.', 'Votre adresse. Notre trajet.'],
  ['Route und Fahrzeit ab unserem Standort in Schaffhausen.', 'Route and driving time from our Schaffhausen location.', 'Ruta y tiempo de conducción desde nuestra sede en Schaffhausen.', 'Percurso e tempo de viagem a partir da nossa sede em Schaffhausen.', 'Percorso e tempo di guida dalla nostra sede di Sciaffusa.', 'Itinéraire et temps de conduite depuis notre site de Schaffhouse.'],
  ['Strasse, Hausnummer, PLZ oder Ort', 'Street, house number, postcode or town', 'Calle, número, código postal o localidad', 'Rua, número, código postal ou localidade', 'Via, numero civico, codice postale o località', 'Rue, numéro, code postal ou localité'],
  ['Keine Live-Verkehrsdaten · kein GPS-Tracking', 'No live traffic data · no GPS tracking', 'Sin datos de tráfico en directo · sin seguimiento GPS', 'Sem dados de trânsito em direto · sem seguimento GPS', 'Senza dati sul traffico in tempo reale · senza tracciamento GPS', 'Sans données de trafic en direct · sans suivi GPS'],
  ['Eingegebene Adresse: {address}', 'Address entered: {address}', 'Dirección introducida: {address}', 'Endereço introduzido: {address}', 'Indirizzo inserito: {address}', 'Adresse saisie : {address}'],
  ['Ihre gewählte Adresse', 'Your selected address', 'Su dirección seleccionada', 'O endereço que selecionou', 'L’indirizzo selezionato', 'L’adresse sélectionnée'],
  ['Karte mit Route {route}', 'Map with route {route}', 'Mapa con la ruta {route}', 'Mapa com o percurso {route}', 'Mappa con il percorso {route}', 'Carte avec l’itinéraire {route}'],
  ['Karte mit Kraken. Bitte eine Adresse suchen.', 'Map with Kraken. Please search for an address.', 'Mapa con Kraken. Busque una dirección.', 'Mapa com a Kraken. Procure um endereço.', 'Mappa con Kraken. Cerchi un indirizzo.', 'Carte avec Kraken. Veuillez rechercher une adresse.'],
  ['Die Hintergrundkarte konnte nicht geladen werden.', 'The background map could not be loaded.', 'No se ha podido cargar el mapa de fondo.', 'Não foi possível carregar o mapa de fundo.', 'Non è stato possibile caricare la mappa di sfondo.', 'Le fond de carte n’a pas pu être chargé.'],
  ['Hintergrundkarte wird geladen …', 'Loading the background map …', 'Cargando el mapa de fondo…', 'A carregar o mapa de fundo…', 'Caricamento della mappa di sfondo…', 'Chargement du fond de carte…'],
  ['Zu viele Anfragen. Bitte warten Sie einen Moment und versuchen Sie es erneut.', 'Too many requests. Please wait a moment and try again.', 'Demasiadas solicitudes. Espere un momento y vuelva a intentarlo.', 'Demasiados pedidos. Aguarde um momento e tente novamente.', 'Troppe richieste. Attenda un momento e riprovi.', 'Trop de demandes. Veuillez patienter un instant et réessayer.'],
  ['Beispieladresse suchen', 'Find an example address', 'Buscar una dirección de ejemplo', 'Procurar um endereço de exemplo', 'Cercare un indirizzo di esempio', 'Rechercher une adresse d’exemple'],
  ['Passende Beispieladressen', 'Matching example addresses', 'Direcciones de ejemplo coincidentes', 'Endereços de exemplo correspondentes', 'Indirizzi di esempio corrispondenti', 'Adresses d’exemple correspondantes'],
  ['Passende Adressen', 'Matching addresses', 'Direcciones coincidentes', 'Endereços correspondentes', 'Indirizzi corrispondenti', 'Adresses correspondantes'],
  ['Beispiele', 'Examples', 'Ejemplos', 'Exemplos', 'Esempi', 'Exemples'],
  ['Beispielmodus · drei vorberechnete Ziele', 'Example mode · three precomputed destinations', 'Modo de ejemplos · tres destinos precalculados', 'Modo de exemplos · três destinos pré-calculados', 'Modalità esempi · tre destinazioni precalcolate', 'Mode exemples · trois destinations précalculées'],
  ['Beispielmodus · drei vorberechnete Routen', 'Example mode · three precomputed routes', 'Modo de ejemplos · tres rutas precalculadas', 'Modo de exemplos · três percursos pré-calculados', 'Modalità esempi · tre percorsi precalcolati', 'Mode exemples · trois itinéraires précalculés'],
  ['Keine freie Adresssuche · kein Live-Verkehr · kein GPS-Tracking', 'No free address search · no live traffic · no GPS tracking', 'Sin búsqueda libre de direcciones · sin tráfico en directo · sin seguimiento GPS', 'Sem pesquisa livre de endereços · sem trânsito em direto · sem seguimento GPS', 'Senza ricerca libera degli indirizzi · senza traffico in tempo reale · senza tracciamento GPS', 'Sans recherche libre d’adresses · sans trafic en direct · sans suivi GPS'],
  ['Beispielroute · ohne Live-Verkehr', 'Example route · no live traffic', 'Ruta de ejemplo · sin tráfico en directo', 'Percurso de exemplo · sem trânsito em direto', 'Percorso di esempio · senza traffico in tempo reale', 'Itinéraire d’exemple · sans trafic en direct'],
  ['Routenanimation · kein GPS-Tracking', 'Route animation · no GPS tracking', 'Animación de la ruta · sin seguimiento GPS', 'Animação do percurso · sem seguimento GPS', 'Animazione del percorso · senza tracciamento GPS', 'Animation de l’itinéraire · sans suivi GPS'],
  ['ca. {minutes} Min.', 'approx. {minutes} min', 'aprox. {minutes} min', 'aprox. {minutes} min', 'circa {minutes} min', 'env. {minutes} min'],
  ['Karte mit Beispielroute {route}', 'Map with example route {route}', 'Mapa con la ruta de ejemplo {route}', 'Mapa com o percurso de exemplo {route}', 'Mappa con il percorso di esempio {route}', 'Carte avec l’itinéraire d’exemple {route}'],
  ['Karte mit Kraken und Beispielzielen. Bitte eine Beispieladresse wählen.', 'Map with Kraken and example destinations. Please choose an example address.', 'Mapa con Kraken y destinos de ejemplo. Elija una dirección de ejemplo.', 'Mapa com a Kraken e destinos de exemplo. Escolha um endereço de exemplo.', 'Mappa con Kraken e destinazioni di esempio. Scelga un indirizzo di esempio.', 'Carte avec Kraken et des destinations d’exemple. Veuillez choisir une adresse d’exemple.'],
  ['Bitte wählen Sie eines der drei Beispiele. Eine freie Adresssuche ist noch nicht verbunden.', 'Please choose one of the three examples. Free address search is not connected yet.', 'Elija uno de los tres ejemplos. La búsqueda libre de direcciones todavía no está conectada.', 'Escolha um dos três exemplos. A pesquisa livre de endereços ainda não está ligada.', 'Scelga uno dei tre esempi. La ricerca libera degli indirizzi non è ancora collegata.', 'Veuillez choisir l’un des trois exemples. La recherche libre d’adresses n’est pas encore connectée.'],
  ['Für diese Vorschau bitte eine Beispieladresse wählen. Freie Adresssuche ist noch nicht verbunden.', 'For this preview, please choose an example address. Free address search is not connected yet.', 'Para esta vista previa, elija una dirección de ejemplo. La búsqueda libre de direcciones todavía no está conectada.', 'Para esta pré-visualização, escolha um endereço de exemplo. A pesquisa livre de endereços ainda não está ligada.', 'Per questa anteprima, scelga un indirizzo di esempio. La ricerca libera degli indirizzi non è ancora collegata.', 'Pour cet aperçu, veuillez choisir une adresse d’exemple. La recherche libre d’adresses n’est pas encore connectée.'],
  ['Für dieses Beispiel ist in dieser Richtung keine Route verfügbar.', 'No route is available in this direction for this example.', 'No hay ninguna ruta disponible en este sentido para este ejemplo.', 'Não existe percurso disponível neste sentido para este exemplo.', 'Per questo esempio non è disponibile alcun percorso in questa direzione.', 'Aucun itinéraire n’est disponible dans ce sens pour cet exemple.'],
  ['Keine Beispielroute verfügbar.', 'No example route available.', 'No hay ninguna ruta de ejemplo disponible.', 'Não existe percurso de exemplo disponível.', 'Nessun percorso di esempio disponibile.', 'Aucun itinéraire d’exemple disponible.'],
  ['Route wird geladen…', 'Loading route…', 'Cargando la ruta…', 'A carregar o percurso…', 'Caricamento del percorso…', 'Chargement de l’itinéraire…'],
  ['Karte wird geladen…', 'Loading map…', 'Cargando el mapa…', 'A carregar o mapa…', 'Caricamento della mappa…', 'Chargement de la carte…'],
  ['Karte wird geladen …', 'Loading map …', 'Cargando el mapa…', 'A carregar o mapa…', 'Caricamento della mappa…', 'Chargement de la carte…'],
  ['Die interaktive Karte konnte nicht geladen werden. Telefon, E-Mail und Rechner stehen Ihnen weiterhin zur Verfügung.', 'The interactive map could not be loaded. Phone, email and the calculator remain available.', 'No se ha podido cargar el mapa interactivo. El teléfono, el correo y el calculador siguen disponibles.', 'Não foi possível carregar o mapa interativo. O telefone, o e-mail e o calculador continuam disponíveis.', 'Non è stato possibile caricare la mappa interattiva. Telefono, e-mail e calcolatore restano disponibili.', 'La carte interactive n’a pas pu être chargée. Le téléphone, l’e-mail et le calculateur restent disponibles.'],
  ['Erneut versuchen', 'Try again', 'Volver a intentar', 'Tentar novamente', 'Riprovare', 'Réessayer'],
  ['Offerte berechnen', 'Calculate a quote', 'Calcular un presupuesto', 'Calcular um orçamento', 'Calcolare un preventivo', 'Calculer un devis'],
  ['Weitere Kontaktmöglichkeiten', 'More ways to contact us', 'Otras formas de contacto', 'Outras formas de contacto', 'Altri modi per contattarci', 'Autres moyens de nous contacter'],
  ['Beispieladresse', 'Example address', 'Dirección de ejemplo', 'Endereço de exemplo', 'Indirizzo di esempio', 'Adresse d’exemple'],
  ['Bildergalerie: Kraken Bürokonzept', 'Image gallery: Kraken office concept', 'Galería: concepto de oficina de Kraken', 'Galeria: conceito de escritório da Kraken', 'Galleria: concept dell’ufficio Kraken', 'Galerie : concept des bureaux Kraken'],
  ['RAUM FÜR PERSÖNLICHEN SERVICE', 'ROOM FOR PERSONAL SERVICE', 'ESPACIO PARA UN SERVICIO PERSONAL', 'ESPAÇO PARA UM SERVIÇO PESSOAL', 'SPAZIO PER UN SERVIZIO PERSONALE', 'UN ESPACE POUR UN SERVICE PERSONNEL'],
  ['Ein neuer Blick auf Kraken.', 'A new look at Kraken.', 'Una nueva mirada a Kraken.', 'Um novo olhar sobre a Kraken.', 'Un nuovo sguardo su Kraken.', 'Un nouveau regard sur Kraken.'],
  ['Bildergalerie schliessen', 'Close image gallery', 'Cerrar la galería', 'Fechar a galeria', 'Chiudere la galleria', 'Fermer la galerie'],
  ['Fotorealistischer Gestaltungsentwurf der Kraken-Fassade', 'Photorealistic design concept of the Kraken facade', 'Propuesta de diseño fotorrealista de la fachada de Kraken', 'Proposta de design fotorrealista da fachada da Kraken', 'Proposta progettuale fotorealistica della facciata Kraken', 'Concept d’aménagement photoréaliste de la façade Kraken'],
  ['Originales Kraken-Logo', 'Original Kraken logo', 'Logo original de Kraken', 'Logótipo original da Kraken', 'Logo originale Kraken', 'Logo original de Kraken'],
  ['Fotorealistisches Konzept der Kraken-Fassade', 'Photorealistic concept of the Kraken facade', 'Concepto fotorrealista de la fachada de Kraken', 'Conceito fotorrealista da fachada da Kraken', 'Concept fotorealistico della facciata Kraken', 'Concept photoréaliste de la façade Kraken'],
  ['Fotorealistisches Konzept des Kraken-Empfangs', 'Photorealistic concept of the Kraken reception', 'Concepto fotorrealista de la recepción de Kraken', 'Conceito fotorrealista da receção da Kraken', 'Concept fotorealistico della reception Kraken', 'Concept photoréaliste de l’accueil Kraken'],
  ['Fassade', 'Facade', 'Fachada', 'Fachada', 'Facciata', 'Façade'],
  ['Empfang', 'Reception', 'Recepción', 'Receção', 'Reception', 'Accueil'],
  ['Konzeptbilder · keine Fotos des Standorts', 'Concept images · not photos of the location', 'Imágenes conceptuales · no son fotos del local', 'Imagens conceptuais · não são fotografias do local', 'Immagini concettuali · non sono foto della sede', 'Images conceptuelles · pas de photos du site'],
  ['Konzeptbilder, keine Standortfotos', 'Concept images, not photographs of the location', 'Imágenes conceptuales, no fotografías del local', 'Imagens conceptuais, não fotografias do local', 'Immagini concettuali, non fotografie della sede', 'Images conceptuelles, pas des photographies du lieu'],
  ['Persönlich erreichbar. Einfach geplant.', 'Personally reachable. Simply planned.', 'Atención personal. Planificación sencilla.', 'Contacto pessoal. Planeamento simples.', 'Contatto personale. Pianificazione semplice.', 'Un contact personnel. Une planification simple.'],
  ['Zürich', 'Zurich', 'Zúrich', 'Zurique', 'Zurigo', 'Zurich'],
  ['Schaffhausen', 'Schaffhausen', 'Schaffhausen', 'Schaffhausen', 'Sciaffusa', 'Schaffhouse'],
  same('Winterthur'),
  same('Kraken'),
  same('km'),
  same('Europe/Zurich'),
  same(legacyHoursSource),
  same('Seewadelstrasse 3'),
  same('8203 Schaffhausen'),
  same('+41 77 450 57 05'),
  same('kai@krakenpfm.ch'),
] as const satisfies readonly ContactTranslationRow[];

export const contactTranslationSources: readonly string[] = contactTranslationRows.map(row => row[0]);
function translationValue(row: ContactTranslationRow, language: HomeLanguage, index: number): string {
  if (row[0] === legacyHoursDescriptionSource) return hoursDescription(language);
  if (row[0] === legacyHoursSource) return `${BUSINESS_HOURS.opens}–${BUSINESS_HOURS.closes}`;
  if (row[0] === 'Europe/Zurich') return BUSINESS_HOURS.timeZone;
  if (row[0] === 'Zeitzone: Europe/Zurich') return businessHoursTimeZoneLabel(language);
  return row[index];
}
export const CONTACT_TRANSLATIONS = Object.fromEntries(
  Object.entries(languageIndex).map(([language, index]) => [language, Object.fromEntries(contactTranslationRows.map(row => [row[0], translationValue(row, language as HomeLanguage, index)]))]),
) as Record<HomeLanguage, Readonly<Record<string, string>>>;

export function contactText(language: string, source: string, params: Readonly<Record<string, string | number>> = {}): string {
  const normalized = normalizeHomeLanguage(language);
  const text = Object.hasOwn(CONTACT_TRANSLATIONS[normalized], source) ? CONTACT_TRANSLATIONS[normalized][source] : source;
  return text.replace(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g, (match, key: string) => Object.hasOwn(params, key) ? String(params[key]) : match);
}

export default contactText;
