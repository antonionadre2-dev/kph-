import { normalizeHomeLanguage } from '../../components/home/homeTranslations.ts';
import { getRegionalPageMetadata } from './regional-metadata.ts';

type Copy = { title: string; description: string; h1?: string };
type Language = 'de' | 'en' | 'es' | 'pt' | 'it' | 'fr';

/** Approved local SEO copy; kept separate from regional body data in the main bundle. */
const PAGE_COPY: Record<string, Record<Language, Copy>> = {
  '/': {
    de: { title: "Umzugsreinigung Zürich | Kraken PFM", description: "Umzugsreinigung Zürich und Endreinigung für die Wohnungsabgabe. Persönliche Planung, transparente Preise im Rechner und vereinbarter Reinigungsumfang. Auch in Schaffhausen und Winterthur." },
    en: { title: "End of tenancy cleaning Zurich | Kraken PFM", description: "End of tenancy cleaning in Zurich for your flat handover. Personal planning, transparent calculator prices and an agreed cleaning scope. Also in Schaffhausen and Winterthur." },
    es: { title: "Limpieza de fin de alquiler Zúrich | Kraken PFM", description: "Limpieza de fin de alquiler en Zúrich para la entrega de su vivienda. Atención personal, precios transparentes en el calculador y trabajos acordados. También en Schaffhausen y Winterthur." },
    pt: { title: "Limpeza de fim de arrendamento Zurique | Kraken PFM", description: "Limpeza de fim de arrendamento em Zurique para entregar a sua casa. Atendimento pessoal, preços transparentes na calculadora e trabalhos acordados. Também em Schaffhausen e Winterthur." },
    it: { title: "Pulizia di fine locazione Zurigo | Kraken PFM", description: "Pulizia di fine locazione a Zurigo per la riconsegna dell’alloggio. Assistenza personale, prezzi trasparenti nel calcolatore e lavori concordati. Anche a Sciaffusa e Winterthur." },
    fr: { title: "Nettoyage de fin de bail Zurich | Kraken PFM", description: "Nettoyage de fin de bail à Zurich pour la remise du logement. Suivi personnel, prix transparents dans le calculateur et travaux convenus. Aussi à Schaffhouse et Winterthour." },
  },
  '/leistungen': {
    de: { title: 'Reinigung & kleine Umzüge für Privathaushalte | Kraken PFM', description: 'Fenster, Umzugsreinigung, regelmässige Reinigung, Grundreinigung und kleine Umzüge. Entdecken Sie die passende Hilfe und berechnen Sie Ihren Auftrag.' },
    en: { title: 'Cleaning & small moves for private households | Kraken PFM', description: 'Windows, end-of-tenancy cleaning, regular cleaning, deep cleaning and small moves. Find the help that suits you and calculate your service.' },
    es: { title: 'Limpieza y pequeñas mudanzas para particulares | Kraken PFM', description: 'Ventanas, limpieza de fin de alquiler, periódica, a fondo y pequeñas mudanzas. Descubra la ayuda que necesita y calcule su encargo.' },
    pt: { title: 'Limpeza e pequenas mudanças para particulares | Kraken PFM', description: 'Janelas, limpeza de fim de arrendamento, regular, profunda e pequenas mudanças. Descubra a ajuda adequada e calcule o seu serviço.' },
    it: { title: 'Pulizie e piccoli traslochi per privati | Kraken PFM', description: 'Finestre, pulizie di fine locazione, regolari, a fondo e piccoli traslochi. Scopra l’aiuto più adatto e calcoli il suo servizio.' },
    fr: { title: 'Nettoyage et petits déménagements pour particuliers | Kraken PFM', description: 'Vitres, nettoyage de fin de bail, régulier, en profondeur et petits déménagements. Trouvez l’aide adaptée et calculez votre prestation.' },
  },
  '/about': {
    de: { title: 'Über Kraken: Antonio, unser Team & Kai | Kraken PFM', description: 'Lernen Sie Antonio, Kraken und Maskottchen Kai kennen. Persönliche Reinigung und kleine Umzüge aus Schaffhausen für Zürich und Winterthur.' },
    en: { title: 'About Kraken: Antonio, our team & Kai | Kraken PFM', description: 'Meet Antonio, Kraken and our mascot Kai. Cleaning and small moves with personal service from Schaffhausen for Zurich and Winterthur.' },
    es: { title: 'Sobre Kraken: Antonio, nuestro equipo y Kai | Kraken PFM', description: 'Conozca a Antonio, Kraken y nuestra mascota Kai. Limpieza y pequeñas mudanzas con atención personal desde Schaffhausen para Zúrich y Winterthur.' },
    pt: { title: 'Sobre a Kraken: Antonio, a nossa equipa e o Kai | Kraken PFM', description: 'Conheça Antonio, a Kraken e a mascote Kai. Limpeza e pequenas mudanças com atendimento pessoal a partir de Schaffhausen para Zurique e Winterthur.' },
    it: { title: 'Kraken: Antonio, il nostro team e Kai | Kraken PFM', description: 'Conosca Antonio, Kraken e la mascotte Kai. Pulizie e piccoli traslochi con assistenza personale da Sciaffusa per Zurigo e Winterthur.' },
    fr: { title: 'Kraken : Antonio, notre équipe et Kai | Kraken PFM', description: 'Découvrez Antonio, Kraken et la mascotte Kai. Nettoyage et petits déménagements avec un suivi personnel depuis Schaffhouse pour Zurich et Winterthour.' },
  },
  '/kontakt': {
    de: { title: 'Kontakt zu Kraken in Schaffhausen | Mo–So 09–19 Uhr', description: 'Fragen zur Reinigung oder zum kleinen Umzug? Kontaktieren Sie Kraken in Schaffhausen: +41 77 450 57 05, kai@krakenpfm.ch. Mo–So 09:00–19:00 Uhr.' },
    en: { title: 'Contact Kraken in Schaffhausen | Mon–Sun 09:00–19:00', description: 'Questions about cleaning or a small move? Contact Kraken in Schaffhausen: +41 77 450 57 05, kai@krakenpfm.ch. Mon–Sun 09:00–19:00.' },
    es: { title: 'Contacto con Kraken en Schaffhausen | Lu–Do 09:00–19:00', description: '¿Dudas sobre limpieza o una pequeña mudanza? Contacte con Kraken en Schaffhausen: +41 77 450 57 05, kai@krakenpfm.ch. Lu–Do 09:00–19:00.' },
    pt: { title: 'Contacto Kraken em Schaffhausen | Seg–Dom 09:00–19:00', description: 'Dúvidas sobre limpeza ou uma pequena mudança? Contacte a Kraken em Schaffhausen: +41 77 450 57 05, kai@krakenpfm.ch. Seg–Dom 09:00–19:00.' },
    it: { title: 'Contatti Kraken a Sciaffusa | Lun–Dom 09:00–19:00', description: 'Domande sulle pulizie o su un piccolo trasloco? Contatti Kraken a Sciaffusa: +41 77 450 57 05, kai@krakenpfm.ch. Lun–Dom 09:00–19:00.' },
    fr: { title: 'Contacter Kraken à Schaffhouse | Lun–Dim 09:00–19:00', description: 'Des questions sur le nettoyage ou un petit déménagement ? Contactez Kraken à Schaffhouse : +41 77 450 57 05, kai@krakenpfm.ch. Lun–Dim 09:00–19:00.' },
  },
  '/quote': {
    de: { title: 'Reinigung & Umzug berechnen | Kraken Service-Rechner', description: 'Wählen Sie Ihre Leistung, den passenden Umfang und Ihren Wunschtermin. Planen Sie Reinigung oder kleinen Umzug mit Kraken. Keine MwSt. auf Ihrer Rechnung.' },
    en: { title: 'Calculate cleaning & moving | Kraken Service Calculator', description: 'Choose your service, the scope you need and your preferred date. Plan cleaning or a small move with Kraken. No VAT on your invoice.' },
    es: { title: 'Calcule limpieza y mudanza | Calculador de Kraken', description: 'Elija su servicio, el alcance adecuado y la fecha deseada. Planifique su limpieza o pequeña mudanza con Kraken. Sin IVA en su factura.' },
    pt: { title: 'Calcule limpeza e mudança | Calculadora Kraken', description: 'Escolha o serviço, a dimensão adequada e a data pretendida. Planeie uma limpeza ou pequena mudança com a Kraken. Sem IVA na sua fatura.' },
    it: { title: 'Calcoli pulizie e trasloco | Calcolatore Kraken', description: 'Scelga il servizio, l’entità dei lavori e la data desiderata. Pianifichi pulizie o un piccolo trasloco con Kraken. Senza IVA in fattura.' },
    fr: { title: 'Calculez nettoyage et déménagement | Calculateur Kraken', description: 'Choisissez votre prestation, son étendue et la date souhaitée. Planifiez un nettoyage ou un petit déménagement avec Kraken. Sans TVA sur votre facture.' },
  },
  '/einsatzgebiete': {
    de: { title: 'Einsatzgebiete Zürich, Schaffhausen & Winterthur | Kraken', description: 'Hier hilft Kraken: Reinigung und kleine Umzüge für private Haushalte in Zürich, Schaffhausen und Winterthur. Finden Sie die Informationen für Ihren Wohnort.', h1: 'Persönliche Hilfe. In Ihrer Nähe.' },
    en: { title: 'Service areas Zurich, Schaffhausen & Winterthur | Kraken', description: 'Where Kraken helps: cleaning and small moves for private households in Zurich, Schaffhausen and Winterthur. Find information for your area.', h1: 'Personal help. Close to you.' },
    es: { title: 'Zonas de servicio Zúrich, Schaffhausen y Winterthur | Kraken', description: 'Donde Kraken ayuda: limpieza y pequeñas mudanzas para hogares particulares en Zúrich, Schaffhausen y Winterthur. Encuentre información sobre su zona.', h1: 'Ayuda personal. Cerca de usted.' },
    pt: { title: 'Zonas de serviço Zurique, Schaffhausen e Winterthur | Kraken', description: 'Onde a Kraken ajuda: limpeza e pequenas mudanças para casas particulares em Zurique, Schaffhausen e Winterthur. Encontre informações sobre a sua zona.', h1: 'Apoio pessoal. Perto de si.' },
    it: { title: 'Zone servite Zurigo, Sciaffusa e Winterthur | Kraken', description: 'Dove Kraken aiuta: pulizie e piccoli traslochi per abitazioni private a Zurigo, Sciaffusa e Winterthur. Trovi le informazioni sulla sua zona.', h1: 'Un aiuto personale. Vicino a lei.' },
    fr: { title: 'Zones desservies Zurich, Schaffhouse et Winterthour | Kraken', description: 'Là où Kraken vous aide : nettoyage et petits déménagements pour les particuliers à Zurich, Schaffhouse et Winterthour. Retrouvez les informations pour votre région.', h1: 'Une aide personnelle. Près de chez vous.' },
  },
};

const HERO = '/home-approved/assets/services-hero-v5.webp';
const PAGE_IMAGES: Record<string, { path: string; width: string; height: string }> = {
  '/': { path: HERO, width: '1254', height: '1254' },
  '/leistungen': { path: HERO, width: '1254', height: '1254' },
  '/about': { path: '/about-approved/assets/kai-rheinfall-awakening.webp', width: '1672', height: '941' },
  '/kontakt': { path: '/home-approved/assets/logo.webp', width: '1024', height: '1024' },
  '/quote': { path: HERO, width: '1254', height: '1254' },
  '/einsatzgebiete': { path: HERO, width: '1254', height: '1254' },
  '/reinigung/region-zuerich': { path: '/home-approved/assets/service-windows-v5.webp', width: '1254', height: '1254' },
  '/reinigung/kanton-schaffhausen': { path: '/home-approved/assets/service-end-v5.webp', width: '1254', height: '1254' },
  '/reinigung/region-winterthur': { path: '/home-approved/assets/service-regular-v5.webp', width: '1254', height: '1254' },
};

export function getApprovedPageMetadata(pathname: string, language: string) {
  const path = pathname.split(/[?#]/)[0].replace(/\/$/, '') || '/';
  const locale = normalizeHomeLanguage(language);
  const copy: Copy | null = PAGE_COPY[path]?.[locale] || getRegionalPageMetadata(path, locale);
  const image = PAGE_IMAGES[path];
  if (!copy || !image) return null;
  return {
    ...copy,
    ogImage: 'https://krakenpfm.ch' + image.path,
    ogImageWidth: image.width,
    ogImageHeight: image.height,
    ogImageType: 'image/webp',
  };
}
