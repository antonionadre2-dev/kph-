export { getGDPRTranslation } from './legal/privacy';
export { getTermsTranslation } from './legal/terms';
export type { GDPRTranslation, TermsTranslation } from './legal/types';
import type { Language } from '../i18n';

export interface HSETranslation {
  title: string;
  intro: string;
  badge: string;
  sec1Title: string;
  sec1P1: string;
  uvgTitle: string;
  uvgText: string;
  vuvTitle: string;
  vuvText: string;
  vuvList: string[];
  ekasTitle: string;
  ekasText: string;
  sec2Title: string;
  sec2P1: string;
  sec2List: string[];
  isoTitle: string;
  isoText: string;
  sec3Title: string;
  sec3Intro: string;
  riskTitle: string;
  riskText: string;
  riskList: string[];
  ramsTitle: string;
  ramsText: string;
  ramsList: string[];
  sec4Title: string;
  sec4Intro: string;
  reqTitle: string;
  sec4List: string[];
  trainingTitle: string;
  trainingText: string;
  trainingList: string[];
  sec5Title: string;
  sec5Intro: string;
  sec5List: string[];
  tbtTitle: string;
  tbtText: string;
  tbtList: string[];
  modulesTitle: string;
  modulesText: string;
  modulesList: string[];
  sec6Title: string;
  envTitle: string;
  envText: string;
  envList: string[];
  wasteTitle: string;
  wasteText: string;
  wasteList: string[];
  co2Title: string;
  co2List: string[];
  sec7Title: string;
  sec7Intro: string;
  sec7List: string[];
  sec7Footer: string;
}

export interface CareersTranslation {
  title: string;
  subtitle: string;
  badge: string;
  positionsTitle: string;
  cleanerTitle: string;
  cleanerLocation: string;
  cleanerType: string;
  applyButton: string;
  formTitle: string;
  formName: string;
  formEmail: string;
  formPhone: string;
  formPosition: string;
  formCV: string;
  uploadPlaceholder: string;
  fileLimit: string;
  formMessage: string;
  formSubmit: string;
  formSubmitting: string;
  successTitle: string;
  successText: string;
  backButton: string;
  placeholderPositionName: string;
}

// English Dictionary


const enHSE: HSETranslation = {
  title: 'Health, Safety & Environment (HSE)',
  intro: 'Our commitment to safety is uncompromising. We adhere to the strictest Swiss and international standards to ensure the well-being of our team, clients, and the environment.',
  badge: 'Swiss Precision, Global Standard',
  sec1Title: 'Swiss Legal Compliance',
  sec1P1: 'We operate in strict accordance with Swiss safety laws.',
  uvgTitle: 'UVG (Accident Insurance Act)',
  uvgText: 'Mandatory accident insurance coverage for all employees.',
  vuvTitle: 'VUV (Accident Prevention Ordinance)',
  vuvText: 'Detailed technical and organizational measures:',
  vuvList: ['Workplace safety', 'Equipment maintenance', 'Personal Protective Equipment', 'Safety signage'],
  ekasTitle: 'EKAS Guidelines',
  ekasText: 'Implementation of Federal Coordination Commission for Occupational Safety directives.',
  sec2Title: 'Suva & ISO Standards',
  sec2P1: 'We partner with Suva to implement best practices in occupational safety.',
  sec2List: [
    'Suva "Safety Charter" signatory',
    'ISO 45001 alignment (Occupational Health and Safety)',
    'ISO 14001 alignment (Environmental Management)'
  ],
  isoTitle: 'Integrated Management System',
  isoText: 'Our internal processes are modelled on ISO frameworks to ensure continuous improvement and audit readiness.',
  sec3Title: 'Risk Management',
  sec3Intro: 'Proactive identification and mitigation of hazards.',
  riskTitle: 'Risk Assessments',
  riskText: 'Conducted for every site and task type.',
  riskList: ['Slip, Trip, Fall hazards', 'Chemical handling risks', 'Ergonomic assessments', 'Electrical safety'],
  ramsTitle: 'RAMS (Risk Assessment & Method Statement)',
  ramsText: 'For complex projects, we produce detailed RAMS documents.',
  ramsList: ['Step-by-step safety procedures', 'Emergency protocols', 'Responsible persons'],
  sec4Title: 'Chemical Safety (COSHH / ChemV)',
  sec4Intro: 'Responsible handling of cleaning agents.',
  reqTitle: 'Requirements',
  sec4List: [
    'Compliance with ChemV (Chemicals Ordinance)',
    'Safety Data Sheets (SDS) available on site',
    'Proper labeling and storage',
    'Eco-friendly, non-toxic alternatives preferred'
  ],
  trainingTitle: 'Staff Training',
  trainingText: 'Regular training on chemical handling and spill response.',
  trainingList: ['Dosing instructions', 'Mixing prohibitions', 'First aid for exposure', 'Disposal protocols'],
  sec5Title: 'Instruction & Competence',
  sec5Intro: 'A well-trained team is a safe team.',
  sec5List: ['Onboarding Induction', 'Regular Refresher Courses', 'Specialized Equipment Training'],
  tbtTitle: 'Toolbox Talks (TBT)',
  tbtText: 'Short, focused safety briefings delivered regularly on site.',
  tbtList: ['Ladder safety', 'Manual handling', 'Electrical cord safety', 'Lone working'],
  modulesTitle: 'E-Learning Modules',
  modulesText: 'Digital training platform for core safety concepts.',
  modulesList: ['Fire safety awareness', 'Infection control', 'Waste management', 'Customer safety'],
  sec6Title: 'ESG & Environment',
  envTitle: 'Environmental Stewardship',
  envText: 'Minimizing our ecological footprint:',
  envList: [
    'Biodegradable cleaning agents',
    'Microfiber technology to reduce water use',
    'Energy-efficient equipment',
    'Electric vehicle fleet transition'
  ],
  wasteTitle: 'Waste Management',
  wasteText: 'Strict separation and recycling protocols:',
  wasteList: ['Recycling of plastic, paper, glass, metal', 'Safe disposal of hazardous waste', 'Reduction of single-use plastics'],
  co2Title: 'Carbon Neutrality',
  co2List: ['Tracking carbon emissions', 'Offsetting initiatives', 'Sustainable procurement policy'],
  sec7Title: 'Continuous Improvement',
  sec7Intro: 'Safety is a journey, not a destination. We continuously review and improve our HSE performance.',
  sec7List: ['Regular Safety Audits', 'Incident Reporting & Investigation', 'Feedback Loops'],
  sec7Footer: 'Our goal is Zero Harm. Everyone goes home safe, every day.'
};

const enCareers: CareersTranslation = {
  title: 'Join Our Team',
  subtitle: 'Build your future with Kraken Properties. We are always looking for dedicated professionals.',
  badge: 'Talent Acquisition',
  positionsTitle: 'Open Positions',
  cleanerTitle: 'Cleaning Specialist',
  cleanerLocation: 'Schaffhausen / Zurich',
  cleanerType: 'Part-time / Full-time',
  applyButton: 'Apply for this role →',
  formTitle: 'Apply Now',
  formName: 'Full Name',
  formEmail: 'Email Address',
  formPhone: 'Phone Number',
  formPosition: 'Position Applied For',
  formCV: 'Upload CV / Resume',
  uploadPlaceholder: 'Click to upload or drag and drop',
  fileLimit: 'PDF, DOC up to 5MB',
  formMessage: 'Cover Letter / Message',
  formSubmit: 'Submit Application',
  formSubmitting: 'Sending Pipeline...',
  successTitle: 'Application Received',
  successText: 'Thank you for your application! We will review your CV and get back to you soon.',
  backButton: 'Back to Home',
  placeholderPositionName: 'e.g. Cleaning Specialist'
};

// Spanish Dictionary


const esHSE: HSETranslation = {
  title: 'Seguridad, Salud y Medio Ambiente (HSE)',
  intro: 'Nuestro compromiso con la seguridad es absoluto. Nos adherimos a las normas más estrictas, tanto suizas como internacionales, para garantizar el bienestar de nuestro equipo, de los clientes y del medio ambiente.',
  badge: 'Precisión Suiza, Estándar Global',
  sec1Title: 'Cumplimiento de la legislación suiza',
  sec1P1: 'Trabajamos en estricta conformidad con las leyes de seguridad suizas.',
  uvgTitle: 'UVG (Ley de seguro de accidentes)',
  uvgText: 'Cobertura del seguro de accidentes obligatorio para todos los trabajadores.',
  vuvTitle: 'VUV (Ordenanza sobre prevención de accidentes)',
  vuvText: 'Medidas organizativas y técnicas detalladas:',
  vuvList: ['Seguridad en el puesto de trabajo', 'Mantenimiento de maquinaria y equipos', 'Equipos de Protección Individual (EPI)', 'Señalización de seguridad'],
  ekasTitle: 'Directrices de EKAS',
  ekasText: 'Aplicación de las directivas de la Comisión Federal de Coordinación para la Seguridad en el Trabajo.',
  sec2Title: 'Normativas Suva e ISO',
  sec2P1: 'Trabajamos en colaboración con Suva para aplicar las mejores prácticas sobre prevención de riesgos laborales.',
  sec2List: [
    'Signatario del "Charter de Seguridad" de Suva',
    'Alineación de nuestros procesos con ISO 45001 (Salud y Seguridad en el Trabajo)',
    'Alineación de nuestros procesos con ISO 14001 (Gestión Ambiental)'
  ],
  isoTitle: 'Sistema de Gestión Integrada',
  isoText: 'Nuestros procesos internos están estructurados sobre los marcos de trabajo de las normas ISO para garantizar la mejora continua.',
  sec3Title: 'Gestión de Riesgos',
  sec3Intro: 'Identificación activa y mitigación sistemática de los peligros.',
  riskTitle: 'Evaluación de Riesgos',
  riskText: 'Evaluación realizada para cada cliente y tipo de tarea.',
  riskList: ['Riesgos de resbalones, tropiezos y caídas', 'Riesgos en el uso de productos químicos', 'Evaluación ergonómica', 'Seguridad en instalaciones eléctricas'],
  ramsTitle: 'RAMS (Evaluaciones de Riesgo y Declaración de Métodos)',
  ramsText: 'Para proyectos de alta complejidad, redactamos informes técnicos RAMS exhaustivos.',
  ramsList: ['Instrucciones de seguridad paso a paso', 'Protocolos para situaciones de emergencia', 'Responsables del proyecto'],
  sec4Title: 'Seguridad Química (MSDS / ChemV)',
  sec4Intro: 'Uso y almacenamiento seguro y responsable de productos químicos y de limpieza.',
  reqTitle: 'Requisitos obligatorios',
  sec4List: [
    'Cumplimiento con ChemV (Ordenanza sobre productos químicos)',
    'Fichas de Datos de Seguridad (FDS/SDS) accesibles sobre el terreno',
    'Etiquetado sistemático y almacenamiento seguro',
    'Priorización de productos ecológicos y biodegradables'
  ],
  trainingTitle: 'Capacitación del personal',
  trainingText: 'Formación continua y simulacros sobre manipulación segura y derrames accidentales.',
  trainingList: ['Dosificación reglamentaria', 'Prohibición estricta de mezclas no autorizadas', 'Primeros auxilios ante contacto químico accidental', 'Protocolos ecológicos de eliminación de residuos'],
  sec5Title: 'Formación y Competencia profesional',
  sec5Intro: 'Un equipo correctamente cualificado y capacitado garantiza un servicio seguro.',
  sec5List: ['Formación de integración al incorporarse', 'Cursos de reciclaje periódicos', 'Formación de manejo para maquinaria especializada'],
  tbtTitle: 'Charlas de Seguridad (Toolbox Talks)',
  tbtText: 'Sesiones de repaso breves y directas sobre prevención impartidas regularmente.',
  tbtList: ['Seguridad en uso de escaleras de mano', 'Ergonomía de manipulación de cargas', 'Seguridad en cableado eléctrico', 'Procedimientos para trabajos aislados'],
  modulesTitle: 'Plataforma de Formación Digital',
  modulesText: 'Material didáctico e-learning interactivo para el personal.',
  modulesList: ['Prevención contra incendios', 'Control de agentes infecciosos', 'Clasificación sostenible de residuos', 'Seguridad en la interacción con usuarios'],
  sec6Title: 'Criterios ESG y Sostenibilidad',
  envTitle: 'Responsabilidad Ambiental',
  envText: 'Reducción sistemática de la huella de carbono y el impacto ecológico:',
  envList: [
    'Uso de agentes de limpieza con certificación ecológica',
    'Tecnología de microfibra avanzada para optimizar el agua consumida',
    'Maquinaria certificada de alta eficiencia energética',
    'Transición gradual hacia una flota de vehículos corporativos eléctricos'
  ],
  wasteTitle: 'Gestión Sostenible de Residuos',
  wasteText: 'Protocolo estricto de separación de basuras y reciclaje:',
  wasteList: ['Clasificación de plástico, cartón, vidrio y metales', 'Retirada de componentes químicos peligrosos', 'Eliminación progresiva del plástico de un solo uso'],
  co2Title: 'Compromiso de Neutralidad Climática',
  co2List: ['Seguimiento del nivel de emisiones generadas', 'Medidas activas de compensación de gases nocivos', 'Política de compras sostenible'],
  sec7Title: 'Mejora continua en prevención',
  sec7Intro: 'El cuidado del personal y el entorno es un proceso en constante evolución. Evaluamos y optimizamos nuestras políticas continuamente.',
  sec7List: ['Auditorías de prevención presenciales', 'Registro concienzudo de incidencias y análisis exhaustivo', 'Canales de comunicación y propuesta activos'],
  sec7Footer: 'Nuestra meta es Cero Incidentes. Que todo el mundo regrese sano y salvo a casa cada día.'
};

const esCareers: CareersTranslation = {
  title: 'Únase a Nuestro Equipo',
  subtitle: 'Construya su futuro profesional junto a Kraken Properties. Siempre buscamos a especialistas con vocación técnica.',
  badge: 'Adquisición de Talento',
  positionsTitle: 'Puestos Vacantes',
  cleanerTitle: 'Especialista en Limpieza Técnica',
  cleanerLocation: 'Schaffhausen / Zúrich',
  cleanerType: 'Tiempo Parcial / Tiempo Completo',
  applyButton: 'Postular para esta vacante →',
  formTitle: 'Presentar Candidatura',
  formName: 'Nombre Completo',
  formEmail: 'Correo Electrónico',
  formPhone: 'Número de Teléfono',
  formPosition: 'Puesto de Interés',
  formCV: 'Enviar Currículum (CV / Hoja de Vida)',
  uploadPlaceholder: 'Arrastre su archivo aquí o haga clic para cargarlo',
  fileLimit: 'Formatos PDF, DOC de hasta 5 MB',
  formMessage: 'Carta de motivación / Comentarios',
  formSubmit: 'Enviar Postulación',
  formSubmitting: 'Tramitando datos...',
  successTitle: 'Candidatura Tramitada',
  successText: '¡Agradecemos mucho su interés! Analizaremos sus datos y la documentación aportada y contactaremos con usted.',
  backButton: 'Volver a la Página Principal',
  placeholderPositionName: 'ej. Especialista en Limpieza'
};

// German & Swiss German


const deHSE: HSETranslation = {
  title: 'Arbeitssicherheit, Gesundheitsschutz & Umwelt (HSE)',
  intro: 'Unser Engagement für Sicherheit und Gesundheitsschutz ist kompromisslos. Wir befolgen strengste Schweizer Standards sowie internationale Richtlinien zum Schutz von Mitarbeitenden und Kunden.',
  badge: 'Schweizer Präzision, Globaler Standard',
  sec1Title: 'Schweizer Gesetzeskonformität',
  sec1P1: 'Unsere betrieblichen Abläufe entsprechen vollumfänglich den gesetzlichen Schweizer Vorschriften.',
  uvgTitle: 'UVG (Unfallversicherungsgesetz)',
  uvgText: 'Obligatorischer Unfallversicherungsschutz für all unsere Mitarbeitenden.',
  vuvTitle: 'VUV (Verordnung über die Unfallverhütung)',
  vuvText: 'Konsequente technische und organisatorische Unfallverhütung:',
  vuvList: ['Sichere Arbeitsplätze', 'Regelmässiger Unterhalt von Maschinen', 'Bereitstellung von PSA (Persönliche Schutzausrüstung)', 'Korrekte Sicherheitskennzeichnung'],
  ekasTitle: 'EKAS-Richtlinien',
  ekasText: 'Sorgfältige Umsetzung aller Vorgaben der Eidgenössischen Koordinationskommission für Arbeitssicherheit.',
  sec2Title: 'Suva & ISO-Standards',
  sec2P1: 'Wir stehen im stetigen Austausch mit der Suva zur Umsetzung bewährter Best-Practice-Methoden.',
  sec2List: [
    'Unterzeichner der Suva "Sicherheits-Charta"',
    'Ausrichtung an ISO 45001 (Arbeitssicherheit & Gesundheitsschutz)',
    'Ausrichtung an ISO 14001 (Umweltmanagement)'
  ],
  isoTitle: 'Integriertes Managementsystem',
  isoText: 'Unsere definierten Prozesse orientieren sich an ISO-Standards für kontinuierliche interne Audits.',
  sec3Title: 'Risikomanagement',
  sec3Intro: 'Präventive Erkennung und sofortige Behebung von Sicherheitsrisiken.',
  riskTitle: 'Gefährdungsbeurteilung',
  riskText: 'Risikoanalyse wird für jedes einzelne Objekt und jede Aufgabe erstellt.',
  riskList: ['Sturz-, Rutsch- und Stolpergefahren', 'Richtiger Umgang mit Gefahrstoffen', 'Ergonomisches Arbeiten', 'Elektrische Anlagensicherheit'],
  ramsTitle: 'RAMS (Gefährdungsanalyse & Arbeitsmethode)',
  ramsText: 'Für anspruchsvolle Projekte erstellen wir detaillierte RAMS-Dokumente.',
  ramsList: ['Detaillierter Sicherheitsablauf', 'Notfall- und Erste-Hilfe-Protokolle', 'Designierte Sicherheitsverantwortliche'],
  sec4Title: 'Umgang mit Chemikalien (ChemV / COSHH)',
  sec4Intro: 'Verantwortungsvoller Umgang mit Reinigungsmitteln.',
  reqTitle: 'Vorgaben',
  sec4List: [
    'Einhaltung der Schweizer Chemikalienverordnung (ChemV)',
    'Sicherheitsdatenblätter (SDB) vor Ort jederzeit griffbereit',
    'Klare Etikettierung und sichere, verschlossene Lagerung',
    'Bevorzugung von ökologischen, biologisch abbaubaren Zusätzen'
  ],
  trainingTitle: 'Mitarbeiter-Schulung',
  trainingText: 'Regelmässige Weiterbildungen im Gefahrstoffbereich und Notfallverhalten.',
  trainingList: ['Exakte Dosierungsanweisungen', 'Striktes Verbot von gefährlichen Produktmischungen', 'Erste Hilfe bei versehentlichem Schleimhautkontakt', 'Fachgerechte, umweltschonende Entsorgung'],
  sec5Title: 'Instruktion & Fachkompetenz',
  sec5Intro: 'Ein exzellent geschultes Team garantiert unfallfreie Abläufe.',
  sec5List: ['Umfangreiche Einführung neuer Angestellter', 'Regelmässige interne Auffrischungskurse', 'Ausbildung an Spezialmaschinen'],
  tbtTitle: 'Kurzschulungen vor Ort (Toolbox Talks)',
  tbtText: 'Fokussierte und regelmässige Sicherheitsbelehrungen direkt auf der Baustelle.',
  tbtList: ['Sicherer Stand auf Leitern', 'Rückenschonendes Heben', 'Sichtprüfung von Elektrokabeln', 'Verhaltensregeln bei Alleinarbeit'],
  modulesTitle: 'Digitales Schulungsportal',
  modulesText: 'E-Learning-Kurse für das gesamte Personal.',
  modulesList: ['Betrieblicher Brandschutz', 'Hygiene- und Infektionsschutz', 'Nachhaltige Abfalltrennung', 'Deeskalation und Kundensicherheit'],
  sec6Title: 'ESG & Umweltschutz',
  envTitle: 'Ökologische Verantwortung',
  envText: 'Minimierung unseres CO2-Fussabdrucks:',
  envList: [
    'Biologische, zertifizierte Reinigungskonzentrate',
    'Einsatz modernster Mikrofaser-Technologie zur Wassereinsparung',
    'Energieeffiziente Reinigungsgeräte',
    'Kontinuierliche Umstellung der Fahrzeugflotte auf Elektromobilität'
  ],
  wasteTitle: 'Abfall- und Wertstoffmanagement',
  wasteText: 'Richtlinien zur Mülltrennung und Werkstoffkreis-Rückführung:',
  wasteList: ['Trennung von PET, Papier, Glas, Metallen', 'Fachgerechte Sonderabfall-Entsorgung', 'Verzicht auf Einweg-Plastikgeschirr'],
  co2Title: 'Klimaneutralitäts-Ziel',
  co2List: ['Erfassung und Monitoring von Treibhausgasen', 'Aktive CO2-Kompensation für Fahrtwege', 'Nachhaltige Beschaffungspolitik bei Lieferanten'],
  sec7Title: 'Kontinuierlicher Verbesserungsprozess',
  sec7Intro: 'Arbeitssicherheit ist ein dynamischer Prozess. Wir evaluieren und optimieren unsere Reglemente fortlaufend.',
  sec7List: ['Sicherheitsaudits direkt beim Einsatz', 'Konsequentes Incident-Reporting und Ursachenforschung', 'Offene Rückmeldeschleifen'],
  sec7Footer: 'Unser oberstes Ziel ist Null Unfälle. Alle sollen täglich gesund nach Hause zurückkehren.'
};

const deCareers: CareersTranslation = {
  title: 'Werden Sie Teil unseres Teams',
  subtitle: 'Gestalten Sie Ihre berufliche Zukunft bei Kraken Properties. Wir suchen fortlaufend engagierte Fachkräfte.',
  badge: 'Karriere & Jobs',
  positionsTitle: 'Offene Stellen',
  cleanerTitle: 'Spezialist in der Liegenschaftspflege / Reinigung',
  cleanerLocation: 'Schaffhausen / Zürich',
  cleanerType: 'Teilzeit / Vollzeit',
  applyButton: 'Jetzt online bewerben →',
  formTitle: 'Online-Bewerbungsformular',
  formName: 'Vollständiger Name',
  formEmail: 'E-Mail-Adresse',
  formPhone: 'Telefonnummer',
  formPosition: 'Gewünschte Stelle',
  formCV: 'Lebenslauf hochladen (CV / Portfolio)',
  uploadPlaceholder: 'Datei per Drag-and-Drop ablegen oder hier klicken',
  fileLimit: 'PDF-/DOC-Dateien bis maximal 5MB',
  formMessage: 'Kurzes Motivationsschreiben / Nachricht',
  formSubmit: 'Bewerbung absenden',
  formSubmitting: 'Daten werden übermittelt...',
  successTitle: 'Bewerbung eingegangen',
  successText: 'Vielen Dank für Ihre Bewerbung! Wir prüfen Ihre Unterlagen sorgfältig und kontaktieren Sie zeitnah.',
  backButton: 'Zurück zur Hauptseite',
  placeholderPositionName: 'z.B. Spezialist Reinigung'
};

// French Dictionary


const frHSE: HSETranslation = {
  title: 'Santé, Sécurité au Travail & Environnement (HSE)',
  intro: 'Notre responsabilité pour la sécurité au travail est absolue. Nous suivons attentivement les lois suisses et guides d\'hygiène internationaux pour la préservation des conditions physiques du personnel et des clients.',
  badge: 'Précision Suisse, Standard Global',
  sec1Title: 'Législation et Directives Suisses',
  sec1P1: 'L\'intégralité des pratiques opérationnelles de l\'entreprise s\'implémente sous le contrôle strict de la loi helvétique.',
  uvgTitle: 'LAA (Loi sur l\'assurance-accidents)',
  uvgText: 'Chaque salarié bénéficie d\'une assurance contre les accidents professionnels obligatoire dès l\'embauche.',
  vuvTitle: 'OPA (Ordonnance sur la prévention des accidents)',
  vuvText: 'Directives de sécurité physiques et matérielles :',
  vuvList: ['Sécurisation des zones de travail', 'Contrôle périodique des outils', 'Mise à disposition d\'équipements individuels (EPI)', 'Présence de panneaux signalétiques obligatoires'],
  ekasTitle: 'Instructions CFST',
  ekasText: 'Harmonisation totale de nos méthodes avec les obligations de la Commission fédérale de coordination pour la sécurité au travail.',
  sec2Title: 'Audits et Standards Suva / ISO',
  sec2P1: 'Nous collaborons avec la Suva dans le but d\'adopter les meilleures pratiques de prévention des chutes et d\'accidents.',
  sec2List: [
    'Signataire accrédité de la "Charte de Sécurité" de la Suva',
    'Conformité avec les principes ISO 45001 (Santé et Sécurité du travail)',
    'Conformité avec les principes ISO 14001 (Gestion de l\'impact environnemental)'
  ],
  isoTitle: 'Système de Contrôle Intégré',
  isoText: 'L\'enchaînement de nos services se modélise sur les cadres d\'évaluation ISO.',
  sec3Title: 'Plan de Prévention des Risques',
  sec3Intro: 'Repérage méthodique et mise à disposition rapide de barrières contre les risques physiques.',
  riskTitle: 'Évaluation Initiale sur Site',
  riskText: 'Diagnostic obligatoire du logement effectué avant le début de tout projet.',
  riskList: ['Défauts de sols et risques de chutes', 'Exhaustivité de toxicité des solvants', 'Ergonomie relative aux ports de charges', 'Régularité des installations électriques'],
  ramsTitle: 'Dossiers RAMS (Méthodes d\Intervention)',
  ramsText: 'Pour les opérations d\'importance, un document d\'ingénierie RAMS décrit les modes opératoires.',
  ramsList: ['Sécurisation étape par étape', 'Mesures d\'alerte sanitaire', 'Contrôle par un chef d\'équipe'],
  sec4Title: 'Hygiène Chimique (ODim / ChemV)',
  sec4Intro: 'Encadrement strict de l\'usage de solvants et détergents.',
  reqTitle: 'Exigences',
  sec4List: [
    'Observation de l\'Ordonnance sur les produits chimiques (ODim)',
    'Présence obligatoire des Fiches de Données de Sécurité (FDS) sur site',
    'Récipients dûment marqués et stockés en hauteur',
    'Achat préférentiel d\'agents biologiques neutres'
  ],
  trainingTitle: 'Formation continue des équipes',
  trainingText: 'Séances pratiques d\'utilisation réglementaire et conduite en cas d\'écoulement anormal.',
  trainingList: ['Dosages prescrits', 'Consigne absolue de non-mélange de substances réactives', 'Soins urgents face au contact oculaire', 'Acheminement vers les centres de traitement des déchets'],
  sec5Title: 'Cycles de qualification habilités',
  sec5Intro: 'Une équipe bien formée est le pilier d\'un environnement sécurisé.',
  sec5List: ['Session d\'intégration obligatoire', 'Formations de perfectionnement régulières', 'Candidature qualifiée sur les engins techniques'],
  tbtTitle: 'Minutes Sécurité (Toolbox Talks)',
  tbtText: 'Réunions d\'arbitrage courtes partagées sur le lieu de l\'intervention.',
  tbtList: ['Orientation stable de l\'escabeau', 'Adoption d\'un maintien lombaire droit', 'Inspections préventives de câblages d\'alimentation', 'Dispositifs électroniques dédiés aux isolements des techniciens'],
  modulesTitle: 'Examens Électroniques internes',
  modulesText: 'Contrôles généraux informatiques partagés régulièrement avec le personnel.',
  modulesList: ['Règles du feu', 'Risques épidémiologiques', 'Tri sélectif écoresponsable', 'Communication client respectueuse'],
  sec6Title: 'Objectifs ESG & Écologie',
  envTitle: 'Neutralité Écologique',
  envText: 'Contrôle de l\'empreinte sur les milieux naturels :',
  envList: [
    'Produits biologiques biodégradables',
    'Matériel en microfibre pour limiter la consommation d\'eau douce',
    'Aspiration basse consommation labellisée',
    'Amélioration du parc automobile vers le tout électrique'
  ],
  wasteTitle: 'Revalorisation d\'emballages',
  wasteText: 'Traitement ordonné de l\'évacuation des reliquats de chantiers :',
  wasteList: ['Tri pour recyclage (cartons, verres, plastiques)', 'Neutralisation réglementée d\'agents chimiques', 'Diminution majeure de contenant en plastique jetable'],
  co2Title: 'Neutralité Carbone',
  co2List: ['Calcul analytique de notre volume de pollution', 'Re-plantation compensatoire d\'essences forestières', 'Achat d\'approvisionnements écoresponsables'],
  sec7Title: 'Recherche de Progrès constant',
  sec7Intro: 'La protection est un itinéraire continu. Nous optimisons nos directives d\'HSE d\'après les retours terrains réguliers.',
  sec7List: ['Audits de terrain', 'Formulaires de rapports d\'anomalies', 'Axe d\'amélioration continue'],
  sec7Footer: 'Notre politique se résume à « Zéro Accident ». Pour que chacun rentre indemne et en parfaite santé à son foyer chaque soir.'
};

const frCareers: CareersTranslation = {
  title: 'Rejoignez Notre Équipe',
  subtitle: 'Créez votre développement de carrière de demain auprès de Kraken Properties. Notre équipe engage des techniciens rigoureux.',
  badge: 'Ressources Humaines',
  positionsTitle: 'Postes Disponibles',
  cleanerTitle: 'Opérateur Technique d\Entretien Immobilier',
  cleanerLocation: 'Schaffhouse / Zurich',
  cleanerType: 'Temps Partiel / Temps Plein',
  applyButton: 'Postuler à cet emploi →',
  formTitle: 'Dossier de candidature en ligne',
  formName: 'Nom et Prénom',
  formEmail: 'Adresse Électronique',
  formPhone: 'Numéro de Téléphone',
  formPosition: 'Poste Sollicité',
  formCV: 'Envoyer votre Curriculum Vitae (CV / Annexes)',
  uploadPlaceholder: 'Déposez votre document ou cliquez pour parcourir',
  fileLimit: 'Fichiers PDF, DOC acceptés (limite de 5 Mo)',
  formMessage: 'Message accompagnateur / Motivation',
  formSubmit: 'Déposer ma Candidature',
  formSubmitting: 'Enregistrement en cours...',
  successTitle: 'Dossier Enregistré',
  successText: 'Nous vous remercions pour l\'intérêt porté à notre société ! L\équipe d\'encadrement étudiera votre profil avec intérêt et vous contactera rapidement.',
  backButton: 'Retourner sur le site principal',
  placeholderPositionName: 'ex. Technicien de Nettoyage'
};

// Italian Dictionary


const itHSE: HSETranslation = {
  title: 'Sicurezza, Salute sul Lavoro & Ambiente (HSE)',
  intro: 'I nostri impegni sui livelli protettivi di salute sul lavoro sono privi di compromessi. Applichiamo rigide norme federali svizzere ed indicazioni internazionali per favorire il benessere fisico dei dipendenti.',
  badge: 'Precisione Svizzera, Standard Globale',
  sec1Title: 'Garanzie di Legge Confederata',
  sec1P1: 'La totalità della routine operativa si attua sotto le indicazioni legislative della Confederazione Svizzera.',
  uvgTitle: 'LAINF (Legge sull\'assicurazione contro gli infortuni)',
  uvgText: 'Copertura infortuni obbligatoria stabilita per ogni risorsa attiva nell\'impresa.',
  vuvTitle: 'OPI (Ordinanza sulla prevenzione degli infortuni)',
  vuvText: 'Attuazione di controlli tecnici ed organizzativi mirati:',
  vuvList: ['Sicurezza del locale operativo', 'Controllo di usura di utensili ed apparecchi', 'Assegnazione di DPI (Dispositivi di Protezione Individuale)', 'Posizionamento di cartelli monitori obbligatori'],
  ekasTitle: 'Linee Guida LAINF (MSSL)',
  ekasText: 'Adempimento integrale a tutte le disposizioni della Commissione federale di coordinamento per la sicurezza sul lavoro.',
  sec2Title: 'Collaborazioni Suva & Strutture ISO',
  sec2P1: 'Siamo in costante coordinamento con la Suva per prevenire sinistri e infortuni.',
  sec2List: [
    'Firmatari della "Carta della Sicurezza" Suva',
    'Procedura idonea ai canoni ISO 45001 (Salute e Sicurezza dei lavoratori)',
    'Procedura idonea ai canoni ISO 14001 (Sostenibilità d\'inserimento nell\'ecosistema)'
  ],
  isoTitle: 'Processo di Qualità Strutturato',
  isoText: 'Tutte le attività di pianificazione sono verificate in base agli standard metodologici delle normative ISO.',
  sec3Title: 'Controllo Sistematico delle Anomalie',
  sec3Intro: 'Ispezioni preventive nei luoghi d\'intervento per eliminare pericoli per l\'incolumità.',
  riskTitle: 'Valutazione dei Rischi sul Cantiere',
  riskText: 'Analisi obbligatoria redatta per ogni immobile prima d\'iniziare.',
  riskList: ['Superfici sdrucciolevoli e pericoli di inciampo', 'Uso attento e dosi per detergenti sensibili', 'Ergonomia di sollevamento carichi pesanti', 'Verifica di integrità di spine e prese elettriche'],
  ramsTitle: 'Progetti RAMS (Metodi Operativi)',
  ramsText: 'Redigiamo relazioni di valutazione RAMS per gli interventi complessi.',
  ramsList: ['Sequenze dettagliate', 'Procedure per incidenti', 'Supervisione del Responsabile'],
  sec4Title: 'Uso dei Prodotti Chimici (ChemV / MSDS)',
  sec4Intro: 'Uso e stoccaggio controllato di solventi chimici per la pulizia.',
  reqTitle: 'Prescrizioni',
  sec4List: [
    'Sorveglianza dell\'ordinanza svizzera sui prodotti chimici (ChemV)',
    'Schede dei Dati di Sicurezza (SDS) obbligatorie dislocate sui cantieri',
    'Identificazione con etichetta e tenuta in posti non accessibili',
    'Uso consigliato di eco-detergenti e biologici biodegradabili'
  ],
  trainingTitle: 'Piani di formazione continua',
  trainingText: 'Corsi pratici in cantiere sulla manipolazione e sulle emergenze chimiche.',
  trainingList: ['Dosi prescritte', 'Divieti di unione di prodotti incompatibili', 'Familiarizzazione con i rimedi oculari', 'Procedure ecologiche di eliminazione residui tossici'],
  sec5Title: 'Formazione e Competenze Professionali',
  sec5Intro: 'Il valore di un team informato riduce a zero gli incidenti aziendali.',
  sec5List: ['Addestramento dei collaboratori neoassunti', 'Audit di aggiornamento periodici', 'Prove di esecuzione per mezzi tecnici semoventi o complessi'],
  tbtTitle: 'Pillole di Prevenzione (Toolbox Talks)',
  tbtText: 'Tendenze di ripasso informative brevi tenute regolarmente.',
  tbtList: ['Posizionamento di scale e trabattelli', 'Sforzi e movimenti per la schiena', 'Integrità dei cavi di alimentazione', 'Controlli per servizi eseguiti individualmente'],
  modulesTitle: 'Corsi E-Learning Aziendali',
  modulesText: 'Aggiornamenti a mezzo computer diffusi tra il personale.',
  modulesList: ['Mezzi antincendio', 'Infezioni e igiene', 'Differenziazione dei rifiuti', 'Accoglienza attenta dei clienti'],
  sec6Title: 'ESG & Impegno Ecologico',
  envTitle: 'Tutela dell\'Ecosistema',
  envText: 'Contenimento dell\'impatto sui territori :',
  envList: [
    'Formula biodegradabile per i detersivi concentrati',
    'Integrazione di panni in microfibra per salvare acqua',
    'Classe A per aspiratori elettrici industriali',
    'Rotazione aziendale dei veicoli verso l\'elettrificazione'
  ],
  wasteTitle: 'Raccolta differenziata',
  wasteText: 'Smantellamento e asporto ecologico dei rifiuti dei cantieri :',
  wasteList: ['Scelta per riciclo (plastica, vetro, metalli)', 'Discarica speciale controllata per inquinanti', 'Riduzione di imballi usa-e-getta in plastica'],
  co2Title: 'Neutralità Climatica',
  co2List: ['Calcoli di emissioni nocive', 'Azioni di forestazione', 'Acquisti solidali da fornitori verdi'],
  sec7Title: 'Verifiche e Miglioramenti Continui',
  sec7Intro: 'La prevenzione è un percorso continuo. Ottimizziamo le nostre regole HSE sulla scorta dei riscontri costruttivi del team.',
  sec7List: ['Ispezioni in campo', 'Segnalazione digitale delle criticità', 'Azioni correttive immediate'],
  sec7Footer: 'Nessun Infortunio è la nostra regola. Per veder tornare a casa le nostre risorse con il sorriso ogni sera.'
};

const itCareers: CareersTranslation = {
  title: 'Lavora Con Noi',
  subtitle: 'Definisci la tua crescita professionale in Svizzera in Kraken Properties. Cerchiamo tecnici precisi.',
  badge: 'Selezioni Personale',
  positionsTitle: 'Posizioni Aperte',
  cleanerTitle: 'Specialista per l\Igiene Immobiliare / Manutenzione',
  cleanerLocation: 'Sciaffusa / Zurigo',
  cleanerType: 'Tempo Parziale / Tempo Pieno',
  applyButton: 'Invia candidatura online →',
  formTitle: 'Modulo di Candidatura',
  formName: 'Nome e Cognome',
  formEmail: 'Posta Elettronica',
  formPhone: 'Numero di Telefono',
  formPosition: 'Posizione Richiesta',
  formCV: 'Invia il tuo Curriculum (CV)',
  uploadPlaceholder: 'Rilascia il documento qui o clicca per caricare',
  fileLimit: 'File supportati: PDF, DOC (limite 5MB)',
  formMessage: 'Lettera di presentazione / Messaggio',
  formSubmit: 'Invia Candidatura',
  formSubmitting: 'Invio dati...',
  successTitle: 'Candidatura Consegnata',
  successText: 'Grazie per l\'interesse dimostrato! I nostri esperti esamineranno le credenziali e vi contatteranno al più presto.',
  backButton: 'Torna alla pagina web principale',
  placeholderPositionName: 'es. Tecnico Pulizie'
};

// Portuguese Dictionary


const ptHSE: HSETranslation = {
  title: 'Saúde, Segurança no Trabalho & Ambiente (HSE)',
  intro: 'O nosso compromisso para com a proteção de saúde no trabalho é inabalável. Cumprimos rigorosamente com as diretivas suíças e recomendações de higiene internacionais para o bem-estar do pessoal.',
  badge: 'Precisão Suíça, Padrão Global',
  sec1Title: 'Conformidades com Leis da Suíça',
  sec1P1: 'Toda a rotina operacional da nossa empresa obedece inteiramente às leis suíças.',
  uvgTitle: 'UVG (Seguro Contra Acidentes de Trabalho)',
  uvgText: 'Proteção obrigatória contra acidentes com seguro contratado para cada elemento ativo.',
  vuvTitle: 'VUV (Diretivas de Prevenção de Acidentes)',
  vuvText: 'Procedimentos de organização física e técnica nos locais:',
  vuvList: ['Segurança no posto de intervenção', 'Inspeção técnica e conservação de maquinarias', 'Atribuição preventiva de EPI (Equipamento de Proteção Individual)', 'Afixação de placas de perigo regulamentares'],
  ekasTitle: 'Regras EKAS (CFST)',
  ekasText: 'Cumprimento total de todas as disposições da Comissão Federal de Coordenação para a Segurança no Trabalho.',
  sec2Title: 'Parceria Suva / Enquadramento ISO',
  sec2P1: 'Estamos em permanente sintonia e trabalho conjunto com a Suva para prevenir quedas ou acidentes operacionais.',
  sec2List: [
    'Signatários da "Carta de Segurança" Suva',
    'Adequação aos métodos ISO 45001 (Saúde e Segurança de todos as equipas)',
    'Adequação aos métodos ISO 14001 (Preservação ecológica e ambiental)'
  ],
  isoTitle: 'Sistema Integrado de Controlo',
  isoText: 'Os métodos internos corporativos orientam-se com base nos requisitos padrões das directrizes ISO.',
  sec3Title: 'Plano Ativo de Controlo de Riscos',
  sec3Intro: 'Deteção rápida de irregularidades e perigos físicos nos imóveis.',
  riskTitle: 'Avaliação Preliminar no Terreno',
  riskText: 'Diagnóstico efetuado em cada residência ou escritório antes de se iniciar qualquer atividade.',
  riskList: ['Deteriorações de pisos e perigos de escorregamento', 'Doses controladas e toxicidade de solventes', 'Uso lombar mecânico para portabilidade de pesos', 'Prevenção em tomadas ou ligações aos quadros elétricos'],
  ramsTitle: 'Projetos RAMS (Procedimentos Técnicos)',
  ramsText: 'Descrevemos relatórios técnicos de intervenção RAMS em obras de dimensão ponderada.',
  ramsList: ['Instruções passo a passo de atuação segura', 'Rotas de evacuação e primeiros socorros', 'Supervisão do Chefe de Equipa de intervenção'],
  sec4Title: 'Manuseamento Químico Seguro (ChemV / MSDS)',
  sec4Intro: 'Armazenamento e manuseamento consciente de solventes ou produtos para limpeza química.',
  reqTitle: 'Obrigatoriedades',
  sec4List: [
    'Cumprimento da Portaria de Substâncias Químicas suíça (ChemV)',
    'Fichas de Dados de Segurança (FDS) obrigatórias arquivadas nos locais',
    'Materiais identificados com rótulos em locais adequados',
    'Aposta forte em substâncias de limpeza ecológica biodegradáveis'
  ],
  trainingTitle: 'Formação constante dos recursos',
  trainingText: 'Cursos práticos regulares sobre acidentes de derramamento e primeiros socorros.',
  trainingList: ['Dosagens recomendadas', 'Proibição de misturas não regulamentares de detergentes', 'Aparatos de lavagem ocular médica de urgência', 'Fardamentos específicos de manuseamento técnico'],
  sec5Title: 'Qualificação Profissional',
  sec5Intro: 'Uma equipa qualificada diminui a probabilidade de sinistralidade ativa.',
  sec5List: ['Cursos de integração de entrada', 'Revisões regulares ministradas internamente', 'Instrução para condução de maquinarias de alta pressão'],
  tbtTitle: 'Minutos de Segurança (Toolbox Talks)',
  tbtText: 'Conselhos preventivos sobre perigos, partilhados de forma rápida antes de iniciar.',
  tbtList: ['Posicionamento de escadotes e plataformas', 'Ergonomia para poupar as costas', 'Integridade dos cabos de alimentação elétrica', 'Protocolos para execução isolada em residências'],
  modulesTitle: 'Cursos E-Learning Corporativos',
  modulesText: 'Ensino à distância via computador partilhado e ensinado a todos os colaboradores.',
  modulesList: ['Instruções contra fogo', 'Higiene e contenção de infeções', 'Triagem de desperdício', 'Relação e comunicação segura com o cliente'],
  sec6Title: 'Objectivos ESG & Proteção do Planeta',
  envTitle: 'Neutralidade do Meio Ambiente',
  envText: 'Monitorização da pegada climática e preservação dos recursos naturais:',
  envList: [
    'Solventes com licenças e marcas ecológicas',
    'Sistemas com microfibra para redução drástica de água',
    'Aparelhos com eficiência energética',
    'Rotatividade e avanço de carros para eletricidade'
  ],
  wasteTitle: 'Separação ECO de Resíduos',
  wasteText: 'Tratamento de lixo de forma triada nas intervenções corporativas :',
  wasteList: ['Classificação para reaproveitamento (plástico, cartão, vidro, metais)', 'Centrais de tratamento autorizadas para restos de químicos', 'Anulação gradual de vasilhames ou plásticos de uso limitado'],
  co2Title: 'Neutralidade Climática',
  co2List: ['Controlo de volume de gases estufa emitidos', 'Plantação de florestas', 'Contratos com fornecedores ambientalmente certificados'],
  sec7Title: 'Verificações e Melhoramentos',
  sec7Intro: 'As medidas de segurança no trabalho são evolutivas. Ajustamos os termos operacionais HSE d\'accord com dados das nossas equipas.',
  sec7List: ['Auditorias nos locais', 'Registo digital e ágil de incidentes', 'Ações corretivas instantâneas'],
  sec7Footer: 'Estipulamos a regra de «Zero Acidentes». Para assegurar o regresso de cada colaborador com saúde à sua família todos os dias.'
};

const ptCareers: CareersTranslation = {
  title: 'Candidate-se e Junte-se a Nós',
  subtitle: 'Conquiste o seu futuro técnico de amanhã na Kraken Properties. Admitimos excelentes profissionais.',
  badge: 'Recursos Humanos',
  positionsTitle: 'Vagas de Trabalho',
  cleanerTitle: 'Operador de Higienização de Imóveis / Limpeza Técnica',
  cleanerLocation: 'Schaffhausen / Zurique',
  cleanerType: 'Tempo Parcial / Tempo Inteiro',
  applyButton: 'Enviar candidatura online →',
  formTitle: 'Registo de Candidatura',
  formName: 'Nome e Apelido',
  formEmail: 'Endereço de E-mail',
  formPhone: 'Número de Telefone',
  formPosition: 'Vaga Solicitada',
  formCV: 'Enviar Curriculum Vitae (CV e anexos)',
  uploadPlaceholder: 'Largue o ficheiro aqui ou clique para selecionar',
  fileLimit: 'Sólidos PDF, DOC até ao máximo de 5MB',
  formMessage: 'Apresentação / Motivação',
  formSubmit: 'Submeter Candidatura',
  formSubmitting: 'A registar dados...',
  successTitle: 'Candidatura Enviada',
  successText: 'Agradecemos o seu envio e tempo dedicado! Os especialistas de recursos humanos vão analisar as suas credenciais e dar feedback breve.',
  backButton: 'Volver para o portal principal',
  placeholderPositionName: 'ex. Profissional Limpezas'
};

const translations: Record<Language, { hse: HSETranslation; careers: CareersTranslation }> = {
  'en': { hse: enHSE, careers: enCareers },
  'de': { hse: deHSE, careers: deCareers },
  'de-CH': { hse: deHSE, careers: deCareers },
  'es': { hse: esHSE, careers: esCareers },
  'fr': { hse: frHSE, careers: frCareers },
  'it': { hse: itHSE, careers: itCareers },
  'pt': { hse: ptHSE, careers: ptCareers },
};

export function getHSETranslation(lang: Language): HSETranslation {
  return (translations[lang] || translations['en']).hse;
}

export function getCareersTranslation(lang: Language): CareersTranslation {
  return (translations[lang] || translations['en']).careers;
}
