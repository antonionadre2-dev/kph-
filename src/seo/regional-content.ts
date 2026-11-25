import de from './regions/de.json';
import en from './regions/en.json';
import es from './regions/es.json';
import pt from './regions/pt.json';
import it from './regions/it.json';
import fr from './regions/fr.json';
import { normalizeHomeLanguage } from '../../components/home/homeTranslations.ts';

export interface RegionalPage {
  id: string; city: string; slug: string;
  seo: { title: string; description: string };
  eyebrow: string; h1: string; intro: string[]; heroFacts: string[];
  cta: { label: string; href: string; city: string };
  servicesTitle: string; servicesIntro: string;
  services: { id: string; title: string; body: string; ctaLabel: string }[];
  planning: { title: string; intro: string; steps: { title: string; body: string; sourceIds?: string[] }[] };
  why: { title: string; body: string; points: { title: string; body: string }[] };
  localResourcesTitle: string;
  localResources: { label: string; url: string; description: string; sourceId: string }[];
  faqTitle: string; faqs: { question: string; answer: string }[];
  closing: { title: string; body: string; ctaLabel: string };
}

const PAGES: Record<string, RegionalPage[]> = { de, en, es, pt, it, fr };
export function getRegionalPage(regionId: string, language: string): RegionalPage | null {
  return PAGES[normalizeHomeLanguage(language)].find(page => page.id === regionId) || null;
}
export function getRegionalPageByPath(pathname: string, language: string): RegionalPage | null {
  const path = pathname.split(/[?#]/)[0].replace(/\/$/, '') || '/';
  return PAGES[normalizeHomeLanguage(language)].find(page => page.slug === path) || null;
}
export function getRegionalPages(language: string): RegionalPage[] { return PAGES[normalizeHomeLanguage(language)]; }

/** Interface copy is translated independently from the three full local articles. */
const UI = {
  de: {
    home: 'Startseite', breadcrumb: 'Brotkrumennavigation', areas: 'Einsatzgebiete', services: 'Unsere fünf Leistungen im Detail',
    hubEyebrow: 'Ein Standort. Drei Einsatzgebiete.', h1: 'Persönliche Hilfe. In Ihrer Nähe.',
    hubIntro: 'Von unserem Standort in Schaffhausen aus unterstützen wir Privathaushalte in Zürich, Schaffhausen und Winterthur mit Reinigung und kleinen Umzügen. Wählen Sie Ihren Wohnort: Jede Seite hilft Ihnen, den Auftrag passend vorzubereiten.',
    cityCta: 'Leistungen und Planung ansehen', citySummaries: ['Fenster, Wohnungsabgabe oder ein kleiner Umzug: In Zürich planen wir den Zugang, Lift und den Weg vom Fahrzeug mit ein.', 'Unser Standort, Ihr direkter Kontakt. Hier erfahren Sie mehr über Reinigung und kleine Umzüge in Schaffhausen.', 'Regelmässige Hilfe oder eine gründliche Auffrischung? In Winterthur beginnen wir bei Ihren Prioritäten zu Hause.'],
    surroundingTitle: 'Ihre genaue Adresse macht den Unterschied.', surroundingBody: 'Sie wohnen in der Umgebung? Nennen Sie Ihre vollständige Einsatzadresse, die gewünschte Leistung und Ihren Wunschtermin. Wir prüfen, ob der Auftrag, die Anfahrt und der Termin zusammenpassen. Eine Anfrage bestätigt noch keinen Termin.',
    quote: 'Meinen Auftrag berechnen', details: 'Leistungsdetails ansehen', discover: 'Leistung auswählen',
    planningLabel: 'Meine Vorbereitung', progress: 'Punkte vorbereitet', checklistNote: 'Ihre Häkchen sind nur eine persönliche Merkhilfe auf dieser Seite. Sie werden nicht gesendet und bestätigen keine Buchung.',
    source: 'Offizielle Information', sourceNote: 'Die verlinkten Informationen stammen von der jeweiligen Stadt. Prüfen Sie dort die aktuellen Bedingungen; Kraken erteilt keine Bewilligungen und übernimmt keine amtlichen Meldungen.',
    nearby: 'Auch in Ihrer Nähe', contactTitle: 'Persönlich erreichbar', contact: 'Kontakt und Adresse', hours: 'Montag–Sonntag, 09:00–19:00 Uhr (Europe/Zurich)', appointment: 'Besuche am Standort nach Vereinbarung.',
    scope: 'Fünf Leistungen für Privathaushalte: Fensterreinigung, Umzugsreinigung, regelmässige Reinigung, Grundreinigung und kleine Umzüge für Wohnungen mit 1–4 Zimmern. Den passenden Umfang klären wir anhand Ihrer Angaben.',
    prep: 'Zugang, Umfang und Termin vorab klären.', overview: 'Alle Einsatzgebiete', art: 'Illustration einer Kraken-Reinigungsszene',
  },
  en: {
    home: 'Home', breadcrumb: 'Breadcrumb navigation', areas: 'Service areas', services: 'Our five services in detail',
    hubEyebrow: 'One base. Three service areas.', h1: 'Personal help. Close to you.',
    hubIntro: 'From our base in Schaffhausen, we help private households in Zurich, Schaffhausen and Winterthur with cleaning and small moves. Choose your area: each page helps you prepare the details of your service.',
    cityCta: 'View services and planning', citySummaries: ['Windows, a tenancy handover or a small move: in Zurich, we plan for access, lifts and the route from the vehicle.', 'Our base, your direct contact. Find out about cleaning and small moves in Schaffhausen.', 'Regular help or a thorough refresh? In Winterthur, we start with your priorities at home.'],
    surroundingTitle: 'Your exact address makes a difference.', surroundingBody: 'Live nearby? Tell us the full service address, the work you need and your preferred date. We will check whether the job, travel and date can be arranged. An enquiry does not confirm an appointment.',
    quote: 'Calculate my service', details: 'View service details', discover: 'Choose a service',
    planningLabel: 'My preparation', progress: 'items prepared', checklistNote: 'Your ticks are only a personal reminder on this page. They are not sent and do not confirm a booking.',
    source: 'Official information', sourceNote: 'The linked information is provided by the relevant city. Check its current conditions there; Kraken does not issue permits or submit official notifications.',
    nearby: 'Also near you', contactTitle: 'Here to help personally', contact: 'Contact and address', hours: 'Monday–Sunday, 09:00–19:00 (Europe/Zurich)', appointment: 'Visits to our base by appointment.',
    scope: 'Five services for private households: window cleaning, end-of-tenancy cleaning, regular cleaning, deep cleaning and small moves for 1–4-room homes. We agree the right scope based on your details.',
    prep: 'Agree access, scope and date in advance.', overview: 'All service areas', art: 'Illustration of a Kraken cleaning scene',
  },
  es: {
    home: 'Inicio', breadcrumb: 'Ruta de navegación', areas: 'Zonas de servicio', services: 'Nuestros cinco servicios en detalle',
    hubEyebrow: 'Una sede. Tres zonas de servicio.', h1: 'Ayuda personal. Cerca de usted.',
    hubIntro: 'Desde nuestra sede en Schaffhausen ayudamos a hogares particulares de Zúrich, Schaffhausen y Winterthur con limpieza y pequeñas mudanzas. Elija su localidad: cada página le ayuda a preparar los detalles de su encargo.',
    cityCta: 'Ver servicios y planificación', citySummaries: ['Ventanas, entrega del piso o una pequeña mudanza: en Zúrich planificamos los accesos, el ascensor y el trayecto desde el vehículo.', 'Nuestra sede, su contacto directo. Conozca los servicios de limpieza y pequeñas mudanzas en Schaffhausen.', '¿Ayuda periódica o una limpieza a fondo? En Winterthur partimos de las prioridades de su hogar.'],
    surroundingTitle: 'Su dirección exacta marca la diferencia.', surroundingBody: '¿Vive en los alrededores? Indique la dirección completa del servicio, el trabajo que necesita y la fecha deseada. Comprobaremos si podemos coordinar el encargo, el desplazamiento y la fecha. Una solicitud todavía no confirma una cita.',
    quote: 'Calcular mi encargo', details: 'Ver detalles del servicio', discover: 'Elegir un servicio',
    planningLabel: 'Mi preparación', progress: 'puntos preparados', checklistNote: 'Las casillas son solo un recordatorio personal en esta página. No se envían ni confirman una reserva.',
    source: 'Información oficial', sourceNote: 'La información enlazada procede de cada ayuntamiento. Consulte allí las condiciones vigentes; Kraken no expide permisos ni realiza trámites oficiales.',
    nearby: 'También cerca de usted', contactTitle: 'Atención personal', contact: 'Contacto y dirección', hours: 'Lunes–domingo, 09:00–19:00 (Europe/Zurich)', appointment: 'Visitas a la sede con cita previa.',
    scope: 'Cinco servicios para hogares particulares: limpieza de ventanas, de fin de alquiler, periódica, a fondo y pequeñas mudanzas de viviendas de 1–4 habitaciones. Acordamos el alcance adecuado según sus datos.',
    prep: 'Acordar los accesos, el alcance y la fecha.', overview: 'Todas las zonas de servicio', art: 'Ilustración de una escena de limpieza de Kraken',
  },
  pt: {
    home: 'Início', breadcrumb: 'Percurso de navegação', areas: 'Zonas de serviço', services: 'Os nossos cinco serviços em detalhe',
    hubEyebrow: 'Uma sede. Três zonas de serviço.', h1: 'Apoio pessoal. Perto de si.',
    hubIntro: 'A partir da nossa sede em Schaffhausen, apoiamos casas particulares em Zurique, Schaffhausen e Winterthur com limpeza e pequenas mudanças. Escolha a sua localidade: cada página ajuda a preparar os detalhes do seu serviço.',
    cityCta: 'Ver serviços e planeamento', citySummaries: ['Janelas, entrega da casa ou uma pequena mudança: em Zurique, planeamos os acessos, o elevador e o percurso desde o veículo.', 'A nossa sede, o seu contacto direto. Saiba mais sobre limpeza e pequenas mudanças em Schaffhausen.', 'Ajuda regular ou uma limpeza profunda? Em Winterthur, começamos pelas prioridades da sua casa.'],
    surroundingTitle: 'A sua morada exata faz a diferença.', surroundingBody: 'Vive nos arredores? Indique a morada completa do serviço, o trabalho pretendido e a data desejada. Verificamos se é possível conciliar o serviço, a deslocação e a data. Um pedido ainda não confirma uma marcação.',
    quote: 'Calcular o meu serviço', details: 'Ver detalhes do serviço', discover: 'Escolher um serviço',
    planningLabel: 'A minha preparação', progress: 'pontos preparados', checklistNote: 'As marcações são apenas um lembrete pessoal nesta página. Não são enviadas nem confirmam uma reserva.',
    source: 'Informação oficial', sourceNote: 'As informações ligadas são fornecidas pelo município respetivo. Consulte aí as condições atuais; a Kraken não emite autorizações nem trata de comunicações oficiais.',
    nearby: 'Também perto de si', contactTitle: 'Contacto pessoal', contact: 'Contacto e morada', hours: 'Segunda–domingo, 09:00–19:00 (Europe/Zurich)', appointment: 'Visitas à sede mediante marcação.',
    scope: 'Cinco serviços para casas particulares: limpeza de janelas, de fim de arrendamento, regular, profunda e pequenas mudanças de casas com 1–4 divisões. Acordamos a dimensão adequada com base nos seus dados.',
    prep: 'Acordar previamente os acessos, o âmbito e a data.', overview: 'Todas as zonas de serviço', art: 'Ilustração de uma cena de limpeza da Kraken',
  },
  it: {
    home: 'Home', breadcrumb: 'Percorso di navigazione', areas: 'Zone servite', services: 'I nostri cinque servizi in dettaglio',
    hubEyebrow: 'Una sede. Tre zone servite.', h1: 'Un aiuto personale. Vicino a lei.',
    hubIntro: 'Dalla nostra sede di Sciaffusa aiutiamo le abitazioni private di Zurigo, Sciaffusa e Winterthur con pulizie e piccoli traslochi. Scelga la sua località: ogni pagina la aiuta a preparare i dettagli del servizio.',
    cityCta: 'Vedere servizi e preparazione', citySummaries: ['Finestre, riconsegna dell’alloggio o un piccolo trasloco: a Zurigo pianifichiamo accessi, ascensore e percorso dal veicolo.', 'La nostra sede, il suo contatto diretto. Scopra pulizie e piccoli traslochi a Sciaffusa.', 'Un aiuto regolare o una pulizia a fondo? A Winterthur partiamo dalle priorità della sua casa.'],
    surroundingTitle: 'Il suo indirizzo esatto fa la differenza.', surroundingBody: 'Abita nei dintorni? Indichi l’indirizzo completo del servizio, il lavoro richiesto e la data desiderata. Verifichiamo se possiamo concordare incarico, spostamento e data. Una richiesta non conferma ancora un appuntamento.',
    quote: 'Calcolare il mio servizio', details: 'Vedere i dettagli del servizio', discover: 'Scegliere un servizio',
    planningLabel: 'La mia preparazione', progress: 'punti preparati', checklistNote: 'Le spunte sono soltanto un promemoria personale su questa pagina. Non vengono inviate e non confermano una prenotazione.',
    source: 'Informazioni ufficiali', sourceNote: 'Le informazioni collegate provengono dal rispettivo comune. Verifichi lì le condizioni attuali; Kraken non rilascia autorizzazioni e non effettua comunicazioni ufficiali.',
    nearby: 'Anche vicino a lei', contactTitle: 'Contatto personale', contact: 'Contatto e indirizzo', hours: 'Lunedì–domenica, 09:00–19:00 (Europe/Zurich)', appointment: 'Visite alla sede su appuntamento.',
    scope: 'Cinque servizi per abitazioni private: pulizia di finestre, di fine locazione, regolare, a fondo e piccoli traslochi di alloggi da 1–4 locali. Concordiamo la portata adatta in base alle sue indicazioni.',
    prep: 'Concordare in anticipo accessi, portata e data.', overview: 'Tutte le zone servite', art: 'Illustrazione di una scena di pulizia di Kraken',
  },
  fr: {
    home: 'Accueil', breadcrumb: 'Fil d’Ariane', areas: 'Zones desservies', services: 'Nos cinq prestations en détail',
    hubEyebrow: 'Une base. Trois zones desservies.', h1: 'Une aide personnelle. Près de chez vous.',
    hubIntro: 'Depuis notre base de Schaffhouse, nous aidons les particuliers de Zurich, Schaffhouse et Winterthour pour le nettoyage et les petits déménagements. Choisissez votre localité : chaque page vous aide à préparer les détails de votre prestation.',
    cityCta: 'Voir les prestations et la préparation', citySummaries: ['Vitres, remise du logement ou petit déménagement : à Zurich, nous prévoyons les accès, l’ascenseur et le trajet depuis le véhicule.', 'Notre base, votre contact direct. Découvrez le nettoyage et les petits déménagements à Schaffhouse.', 'Une aide régulière ou un nettoyage en profondeur ? À Winterthour, nous partons des priorités de votre foyer.'],
    surroundingTitle: 'Votre adresse exacte fait la différence.', surroundingBody: 'Vous habitez dans les environs ? Indiquez l’adresse complète, la prestation et la date souhaitées. Nous vérifions si le travail, le déplacement et la date peuvent être convenus. Une demande ne confirme pas encore un rendez-vous.',
    quote: 'Calculer ma prestation', details: 'Voir les détails de la prestation', discover: 'Choisir une prestation',
    planningLabel: 'Ma préparation', progress: 'points préparés', checklistNote: 'Les cases cochées sont uniquement un pense-bête personnel sur cette page. Elles ne sont pas envoyées et ne confirment aucune réservation.',
    source: 'Information officielle', sourceNote: 'Les informations liées proviennent de la ville concernée. Consultez ses conditions actuelles ; Kraken ne délivre pas d’autorisations et n’effectue pas de démarches officielles.',
    nearby: 'Également près de chez vous', contactTitle: 'Un contact personnel', contact: 'Contact et adresse', hours: 'Lundi–dimanche, 09:00–19:00 (Europe/Zurich)', appointment: 'Visites à notre base sur rendez-vous.',
    scope: 'Cinq prestations pour les particuliers : nettoyage des vitres, de fin de bail, régulier, en profondeur et petits déménagements de logements de 1–4 pièces. Nous convenons de l’étendue adaptée à vos indications.',
    prep: 'Convenir des accès, de l’étendue et de la date.', overview: 'Toutes les zones desservies', art: 'Illustration d’une scène de nettoyage de Kraken',
  },
};
export function getRegionalHubCopy(language: string) { return UI[normalizeHomeLanguage(language)]; }
