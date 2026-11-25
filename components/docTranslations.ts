import { Language } from '../i18n';

export interface GDPRTranslation {
  title: string;
  badge: string;
  subtitle: string;
  introTitle: string;
  introP1: string;
  collectTitle: string;
  collectP1: string;
  collectItems: string[];
  basisTitle: string;
  basisP1: string;
  basisItems: string[];
  retentionTitle: string;
  retentionInfrastructure: string;
  retentionCollaboration: string;
  retentionDuration: string;
  retentionStorage: string;
  retentionSharing: string;
  retentionTime: string;
  rightsTitle: string;
  rightsP1: string;
  disclaimerTitle: string;
  estimatesTitle: string;
  estimatesP1: string;
  liabilityTitle: string;
  liabilityP1: string;
  ipTitle: string;
  ipP1: string;
  usageTitle: string;
  usageText: string;
  trademarksTitle: string;
  trademarksText: string;
  verificationTitle: string;
  lastUpdate: string;
}

export interface TermsTranslation {
  title: string;
  description: string;
  sections: { title: string; content: string }[];
  verificationTitle: string;
  lastUpdated: string;
  companyInfo: string;
  backHome: string;
}

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
const enGDPR: GDPRTranslation = {
  title: "Privacy policy",
  badge: "Your personal data",
  subtitle: "How we handle cleaning and moving requests",
  introTitle: 'Introduction',
  introP1: "The controller is Kraken Properties and Facilities Management Gomes Mendes, Seewadelstrasse 3, 8203 Schaffhausen, Switzerland. Contact: kai@krakenpfm.ch. This notice explains how we use personal data for this website and our cleaning and small moving services.",
  collectTitle: 'Data We Collect & Purpose',
  collectP1: "We use the information needed to prepare quotes, handle requests and carry out cleaning and small moves:",
  collectItems: [
    "Contact details: name, email, telephone and service address, to respond and organise the work.",
    "Service details: selected tasks, areas, dates, inventory and any photos or videos you choose to provide.",
    "Payments: amount, payment status and provider reference. Card details are entered with Payrexx, rather than in the Kraken request form.",
    "Website data: IP address, necessary cookies, session storage and your cookie preferences, to operate and protect the website.",
  ],
  basisTitle: "Why we use your data",
  basisP1: "We use personal data for these purposes:",
  basisItems: [
    "Preparing the quote and handling the service you request.",
    "Keeping the records required for invoicing and applicable legal obligations.",
    "Operating and protecting the website. Optional communications use your choices and consent where required.",
  ],
  retentionTitle: 'Data Retention & Third Parties',
  retentionInfrastructure: 'Infrastructure',
  retentionCollaboration: 'Collaboration',
  retentionDuration: 'Duration',
  retentionStorage: "The website uses Vercel for hosting and Google Firebase/Firestore for booking records. The configured booking database is in the United States. Payments use Payrexx in Switzerland. The sending region selected in Resend for transactional emails is Ireland (eu-west-1).",
  retentionSharing: "We use service providers for hosting, bookings, communication and payments. Resend handles transactional emails, and Microsoft 365 (Outlook) manages our contact mailbox. If you use Kai’s cloud AI replies, Google also processes your messages. Personal data is not sold.",
  retentionTime: "We retain data for handling your request, providing the service and necessary follow-up. Accounting records are subject to applicable legal retention duties. Contact us to request a review or deletion of your data.",
  rightsTitle: 'Your Rights',
  rightsP1: "You may request information about your personal data and ask for it to be corrected or deleted, subject to legal obligations. You can withdraw optional marketing consent. Write to kai@krakenpfm.ch.",
  disclaimerTitle: "Service information and website content",
  estimatesTitle: "Quotes and appointments",
  estimatesP1: "The calculator uses the service details you enter. Sending a request does not confirm an appointment. Review the scope, confirmed quote and service terms before accepting.",
  liabilityTitle: "Questions before booking",
  liabilityP1: "Contact Kraken before booking if you need clarification about the service scope, handover conditions, insurance or the terms that apply to your request.",
  ipTitle: 'Intellectual Property (IP)',
  ipP1: "Original content and third-party material on this website are subject to their respective rights and licences.",
  usageTitle: 'Usage Rights',
  usageText: "Please contact Kraken before commercially reusing its original website content where permission is required. Third-party material remains subject to its own licence.",
  trademarksTitle: "Brand names",
  trademarksText: "Kraken is the brand used on this website. Third-party names and logos belong to their respective rights holders.",
  verificationTitle: "Privacy contact: kai@krakenpfm.ch",
  lastUpdate: "Updated: 25 November 2026 | Seewadelstrasse 3, 8203 Schaffhausen",
};

const enTerms: TermsTranslation = {
  title: 'General Terms & Conditions (AGB)',
  description: 'These General Terms and Conditions govern all professional cleaning, moving, maintenance, and facility management services provided by Kraken Properties and Facilities Management.',
  sections: [
    {
      title: "1. Scope of Application & Definitions",
      content: "These T&Cs apply to all services provided by Kraken Properties and Facilities Management ('Kraken', 'we') to private clients ('Consumers') and business clients ('B2B Clients'), including end-of-tenancy, deep, and recurring cleaning, moving, detailing, gardening, exterior cleaning, pest control, and facility management. Deviating terms apply only if accepted in writing."
    },
    {
      title: "2. Offers, Estimates & Contract Conclusion",
      content: "Contracts are concluded when a client confirms an offer or booking. scope is defined in the booking confirmation. Estimates from our online calculator are preliminary. Incorrect info entitles Kraken to adjust pricing. Precision Media Quote involves a non-refundable CHF 15.00 review fee, fully credited against the final invoice upon acceptance. Express Binding Booking requires a 15% deposit."
    },
    {
      title: "3. Prices, VAT & Surcharges",
      content: "3.1 All prices are stated in Swiss Francs (CHF). Kraken is not currently registered in the VAT (MWST) register pursuant to Art. 10 MWSTG; therefore, prices do not include VAT and no VAT is invoiced. In the event of a future registration, prices will be adjusted in accordance with the law, subject to the notice period provided in clause 7.4. Extra work due to undisclosed conditions is billed at CHF 90.00/hour/person. Sundays/holidays incur a 50% surcharge; express bookings (<24h notice) incur a 25% surcharge. Third-party costs (landfills, parking) are invoiced at cost."
    },
    {
      title: "4. Travel included in the price",
      content: "Ordinary travel for the selected service is included in the calculator price. Any exceptional travel expense requires prior agreement and must be set out in the written quote."
    },
    {
      title: "5. Payment Terms & Default",
      content: "Payments are processed via Payrexx, bank transfer, or QR-bill. Balance is due within 7 days of invoice. Default interest of 5% p.a. applies, plus reminder fees of CHF 20.00 (2nd reminder) and CHF 50.00 (3rd reminder). Collection costs are borne by the client."
    },
    {
      title: "6. Cancellations, Rescheduling & No-Shows",
      content: "Cancellations must be in writing. Fees: >48 hours notice: free; <48 hours: 50% of price; <12 hours, no-show, or cancellation at door: 100% of price. One free rescheduling is permitted >24 hours prior, subject to availability."
    },
    {
      title: "7. Recurring Services, SLAs & Termination",
      content: "Recurring plans are indefinite. Termination: 30 days notice to end of month (7 days during 2-month trial). Skipping sessions requires 48 hours notice. B2B SLAs follow agreed SLA terms or 3 months notice. Price adjustments can occur once yearly with 60 days notice."
    },
    {
      title: "8. End-of-Tenancy Cleaning — Handover Guarantee",
      content: "Includes free rectification of landlord-identified cleaning deficiencies. Valid if: (a) notified in writing within 24h of inspection with protocol/photos; (b) inspection is within 72h of cleaning; (c) property remained unoccupied. Does not cover wear and tear, structural defects, or excluded items."
    },
    {
      title: "9. Moving & Transport Services",
      content: "Client must provide an accurate inventory. Excluded items (cash, jewelry, valuables, hazard substances, live plants/animals) are not liable. Kraken is liable for goods packed by itself. Content of client-packed boxes is excluded. Liability is limited to actual market value, max CHF 5,000.00 per event. Hidden damage must be reported within 3 days."
    },
    {
      title: "10. Car Detailing",
      content: "Pre-existing damage will be documented. Kraken is not liable for deterioration of worn, brittle, or improperly pre-treated materials. Client must remove personal valuables prior to service."
    },
    {
      title: "11. Gardening, Exterior, Façade & Gutter Cleaning",
      content: "Outdoor services are weather-dependent. Postponements due to weather or safety do not trigger default or cancellation fees. Client must disclose known hazards (fragile roofs, wasp nests). Green waste disposal is charged at cost unless included."
    },
    {
      title: "12. Pest Control — Warranty",
      content: "Includes a 30-day re-treatment warranty for treated species/areas. Conditional on following preparation and follow-up instructions. Does not cover re-infestation from neighbors or structural conditions client failed to remedy."
    },
    {
      title: "13. Waste Management",
      content: "Waste is disposed of compliant with Swiss environmental laws. Standard disposal fees are charged at cost. Undisclosed hazardous waste entitles Kraken to suspend work and bill additional safe handling costs."
    },
    {
      title: "14. Client Responsibilities, Access & Waiting Time",
      content: "Client must provide access, water, electricity, heating, and elevator. Failure to provide access is treated as a no-show cancellation. Access delays >15 minutes are billed at CHF 90.00/hour/person in 15-minute increments. Handed keys are stored anonymously and securely."
    },
    {
      title: "15. Complaints & Notification of Defects",
      content: "Inspect work on completion. Visible defects must be reported within 48h; hidden defects within 48h of discovery (max 7 days post-completion). Primary remedy is rectification. Proportionate invoice withholding is allowed only for affected parts."
    },
    {
      title: "16. Liability & Insurance",
      content: "Information about any applicable insurance cover is set out in the relevant policy documentation and written quote. Kraken is liable only for direct damage from proven fault. Liability for indirect/consequential damage, lost profit, or loss of use is excluded. Lost key liability is limited to standard replacement cost."
    },
    {
      title: "17. Subcontractors, Specialized Partners & Right of Refusal",
      content: "Kraken may engage qualified third-party specialists but remains the sole contractual partner. Kraken reserves the right to refuse or terminate service if conditions pose safety or health risks."
    },
    {
      title: "18. Non-Solicitation of Staff",
      content: "Client shall not directly or indirectly employ Kraken staff deployed at their premises during the contract and for 6 months after. Breach triggers a CHF 5,000.00 compensation fee per employee."
    },
    {
      title: "19. Force Majeure",
      content: "Neither party is liable for delays or non-performance caused by events beyond reasonable control (natural disasters, strikes, pandemic, power failures). Obligations are suspended for the duration. If lasting >30 days, either party may withdraw."
    },
    {
      title: "20. Data Protection & Documentation",
      content: "We process personal data compliant with the Swiss Federal Act on Data Protection (revFADP) and GDPR. Before/after photos may be taken for quality control and insurance. Marketing use of photos requires prior consent."
    },
    {
      title: "21. Amendments & Severability",
      content: "Kraken may amend these T&Cs with 30 days notice. Non-objection constitutes acceptance. If any provision is invalid, the remaining provisions remain unaffected and are replaced with a valid clause closest to the economic purpose."
    },
    {
      title: "22. Governing Law & Jurisdiction",
      content: "All contracts are governed exclusively by Swiss substantive law, excluding CISG. Place of jurisdiction is Schaffhausen, Switzerland. Mandatory consumer places of jurisdiction remain reserved."
    }
  ],
  verificationTitle: "Terms version",
  lastUpdated: "Terms version: kraken-2026-11-24 · Editorial review: 25.11.2026",
  companyInfo: 'Kraken Properties and Facilities Management Gomes Mendes | Seewadelstrasse 3, 8203 Schaffhausen, Switzerland',
  backHome: 'Back to Home'
};

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
const esGDPR: GDPRTranslation = {
  title: "Política de privacidad",
  badge: "Sus datos personales",
  subtitle: "Cómo gestionamos las solicitudes de limpieza y mudanzas",
  introTitle: 'Introducción',
  introP1: "El responsable es Kraken Properties and Facilities Management Gomes Mendes, Seewadelstrasse 3, 8203 Schaffhausen, Suiza. Contacto: kai@krakenpfm.ch. Esta política explica cómo utilizamos los datos personales en este sitio web y para nuestros servicios de limpieza y pequeñas mudanzas.",
  collectTitle: 'Datos que recopilamos y su finalidad',
  collectP1: "Utilizamos la información necesaria para preparar presupuestos, gestionar solicitudes y realizar limpiezas y pequeñas mudanzas:",
  collectItems: [
    "Datos de contacto: nombre, correo, teléfono y dirección del servicio, para responder y organizar el trabajo.",
    "Datos del servicio: tareas elegidas, superficies, fechas, inventario y las fotos o vídeos que decida facilitarnos.",
    "Pagos: importe, estado del pago y referencia del proveedor. Los datos de la tarjeta se introducen en Payrexx, no en el formulario de solicitud de Kraken.",
    "Datos del sitio web: dirección IP, cookies necesarias, almacenamiento de sesión y sus preferencias de cookies, para el funcionamiento y la seguridad.",
  ],
  basisTitle: "Para qué utilizamos sus datos",
  basisP1: "Utilizamos los datos personales con estas finalidades:",
  basisItems: [
    "Preparar el presupuesto y gestionar el servicio que solicita.",
    "Mantener la documentación necesaria para facturas y obligaciones legales aplicables.",
    "Operar y proteger el sitio web. En las comunicaciones opcionales respetamos sus preferencias y el consentimiento que corresponda.",
  ],
  retentionTitle: 'Retención de datos y terceros',
  retentionInfrastructure: 'Infraestructura',
  retentionCollaboration: 'Colaboración',
  retentionDuration: 'Duración',
  retentionStorage: "El sitio utiliza Vercel para el alojamiento y Google Firebase/Firestore para los registros de reservas. La base de datos de reservas configurada está en Estados Unidos. Los pagos utilizan Payrexx en Suiza. La región de envío seleccionada en Resend para los correos transaccionales es Irlanda (eu-west-1).",
  retentionSharing: "Utilizamos proveedores para alojamiento, reservas, comunicación y pagos. Resend gestiona los correos transaccionales y Microsoft 365 (Outlook), nuestro buzón de contacto. Si utiliza las respuestas de IA de Kai en la nube, Google también procesa sus mensajes. No vendemos datos personales.",
  retentionTime: "Conservamos los datos para gestionar su solicitud, realizar el servicio y atender el seguimiento necesario. Los documentos contables están sujetos a las obligaciones legales de conservación. Puede solicitar la revisión o eliminación de sus datos.",
  rightsTitle: 'Sus derechos',
  rightsP1: "Puede solicitar información sobre sus datos personales y pedir su corrección o eliminación, con sujeción a las obligaciones legales. Puede retirar el consentimiento para publicidad opcional. Escriba a kai@krakenpfm.ch.",
  disclaimerTitle: "Información del servicio y contenido del sitio",
  estimatesTitle: "Presupuestos y citas",
  estimatesP1: "El calculador utiliza los datos del servicio que introduce. Enviar una solicitud no confirma una cita. Revise el alcance, el presupuesto confirmado y las condiciones del servicio antes de aceptar.",
  liabilityTitle: "Preguntas antes de contratar",
  liabilityP1: "Contacte con Kraken antes de contratar si necesita aclarar el alcance del servicio, las condiciones de entrega, el seguro o las condiciones aplicables a su solicitud.",
  ipTitle: 'Propiedad intelectual (PI)',
  ipP1: "El contenido original y los materiales de terceros de este sitio están sujetos a sus respectivos derechos y licencias.",
  usageTitle: 'Derechos de uso',
  usageText: "Contacte con Kraken antes de reutilizar comercialmente su contenido original cuando sea necesaria una autorización. Los materiales de terceros conservan sus propias licencias.",
  trademarksTitle: "Nombres de marca",
  trademarksText: "Kraken es la marca utilizada en este sitio web. Los nombres y logotipos de terceros pertenecen a sus respectivos titulares.",
  verificationTitle: "Contacto de privacidad: kai@krakenpfm.ch",
  lastUpdate: "Actualización: 25 de noviembre de 2026 | Seewadelstrasse 3, 8203 Schaffhausen",
};

const esTerms: TermsTranslation = {
  title: 'Condiciones Generales de Contratación (CGC)',
  description: 'Estas Condiciones Generales regulan todos los servicios profesionales de limpieza, mudanza, mantenimiento y gestión de instalaciones prestados por Kraken Properties and Facilities Management.',
  sections: [
    {
      title: "1. Ámbito de Aplicación y Definiciones",
      content: "Estas CGC se aplican a todos los servicios prestados por Kraken Properties and Facilities Management ('Kraken', 'nosotros') a clientes privados ('Consumidores') y corporativos ('Clientes B2B'), incluyendo limpieza de final de arrendamiento, profunda, recurrente, mudanza, detallado, jardinería, exterior, control de plagas y gestión de propiedades. Condiciones divergentes se aplican solo si se aceptan por escrito."
    },
    {
      title: "2. Ofertas, Estimaciones y Formalización del Contrato",
      content: "El contrato se formaliza al confirmar un presupuesto o reserva. Las estimaciones de la calculadora online son preliminares. Información incorrecta autoriza a Kraken a ajustar precios. La opción Precision Media Quote conlleva una tasa no reembolsable de 15,00 CHF por revisión técnica, reembolsable al 100% en la factura final en caso de aceptación. Reserva Express requiere un depósito del 15%."
    },
    {
      title: "3. Precios, IVA y Recargos",
      content: "3.1 Todos los precios se indican en francos suizos (CHF). Kraken no está actualmente inscrita en el registro del IVA (MWST) conforme al Art. 10 LIVA; por lo tanto, los precios no incluyen IVA y no se factura IVA. En caso de inscripción futura, los precios se ajustarán conforme a la ley con el preaviso previsto en la cláusula 7.4. Trabajo extra por condiciones no declaradas se cobrará a 90,00 CHF/hora/persona. Domingos/festivos conllevan recargo del 50%; reservas express (<24h de aviso), un 25%. Costes de terceros (vertedero, estacionamiento) se facturan al coste."
    },
    {
      title: "4. Desplazamiento incluido en el precio",
      content: "El desplazamiento ordinario para el servicio seleccionado está incluido en el precio del calculador. Cualquier gasto extraordinario de desplazamiento requiere acuerdo previo y debe constar en el presupuesto escrito."
    },
    {
      title: "5. Condiciones de Pago y Mora",
      content: "Pagos vía Payrexx, transferencia o QR-bill. El saldo vence a los 7 días de la factura. Mora automática tras vencer plazo, con un interés anual del 5% y cargos por reclamación de 20,00 CHF (2ª reclamación) y 50,00 CHF (3ª reclamación). Costes de cobro a cargo del cliente."
    },
    {
      title: "6. Cancelaciones, Aplazamientos y No Presentación",
      content: "Cancelaciones por escrito. Tasas: >48 horas de antelación: gratis; <48 horas: 50% del importe; <12 horas, no presentación o cancelación en puerta: 100% del presupuesto. Un aplazamiento gratuito es permitido >24 horas antes, según disponibilidad."
    },
    {
      title: "7. Servicios Recurrentes, SLAs y Rescisión",
      content: "Planes recurrentes de plazo indefinido. Rescisión: aviso de 30 días a fin de mes (7 días en periodo de prueba de 2 meses). Omitir sesiones requiere 48h de aviso. Contratos B2B con SLA se rigen por los términos pactados o aviso de 3 meses. Ajustes de precios anuales con aviso de 60 días."
    },
    {
      title: "8. Limpieza de Final de Arrendamiento — Garantía de Entrega",
      content: "Garantía de entrega (Wohnungsabgabe): subsanación gratuita de deficiencias. Válido si: (a) notificado por escrito en 24h tras inspección con protocolo/fotos; (b) inspección en 72h tras limpieza; (c) propiedad desocupada e inutilizada. No cubre daños estructurales, desgaste o áreas excluidas."
    },
    {
      title: "9. Servicios de Mudanza y Transporte",
      content: "El cliente debe dar un inventario preciso. Excluidos del transporte sin pacto escrito: efectivo, joyas, armas, químicos, plantas/animales. Kraken responde de bienes embalados por su personal; se excluye contenido de cajas embaladas por el cliente. Responsabilidad limitada al valor actual de mercado, máx 5.000,00 CHF por evento. Daños ocultos deben reportarse en 3 días."
    },
    {
      title: "10. Detallado de Vehículos (Car Detailing)",
      content: "Daños existentes documentados previamente. Kraken no es responsable de daños preexistentes o del desgaste de materiales viejos, quebradizos o previamente mal tratados. Retirar objetos personales antes del servicio."
    },
    {
      title: "11. Jardinería, Limpieza Exterior, de Fachadas y Canalones",
      content: "Servicios al aire libre dependen del clima. Aplazamientos por clima o seguridad no constituyen mora ni tasas. Informar peligros (techos frágiles, avispas). Retirada de residuos verdes se factura al coste salvo pacto."
    },
    {
      title: "12. Control de Plagas — Garantía",
      content: "Garantía de re-tratamiento de 30 días para especies y áreas tratadas. Sujeto a seguir instrucciones de preparación y seguimiento. Excluye reinfestación de vecinos o fallos estructurales no corregidos por el cliente."
    },
    {
      title: "13. Gestión de Residuos",
      content: "Eliminación conforme a leyes ambientales suizas. Tasas de eliminación se facturan al coste. Residuos peligrosos ocultos autorizan a Kraken a suspender el trabajo y cobrar costes extra por gestión conforme."
    },
    {
      title: "14. Responsabilidades del Cliente, Acceso y Tiempos de Espera",
      content: "Facilitar acceso, agua, electricidad, calefacción y ascensor. No dar acceso se penaliza al 100%. Retrasos >15 min facturados a 90,00 CHF/hora/persona en bloques de 15 min. Las llaves se guardan de forma segura y anónima."
    },
    {
      title: "15. Quejas y Notificación de Defectos",
      content: "Inspeccionar al finalizar. Defectos visibles en 48h; ocultos en 48h tras descubrimiento (máx 7 días post-servicio). Remedio primario es la rectificación. Retenciones parciales solo permitidas para la sección afectada."
    },
    {
      title: "16. Responsabilidad Civil y Seguros",
      content: "La documentación de la póliza aplicable y el presupuesto escrito detallan la cobertura de seguro que corresponda. Kraken responde solo de daños directos por culpa probada. Se excluyen daños indirectos, lucro cesante o pérdida de uso. Llaves perdidas limitadas al coste de copia estándar."
    },
    {
      title: "17. Subcontratistas, Socios Especializados y Derecho de Rechazo",
      content: "Kraken puede contratar terceros cualificados pero sigue siendo el único socio contractual. Kraken puede rechazar o suspender el servicio si hay riesgos de seguridad o salud."
    },
    {
      title: "18. No Solicitud de Personal",
      content: "El cliente no contratará personal de Kraken que trabaje en sus locales durante el contrato y 6 meses después. Incumplimiento conlleva indemnización de 5.000,00 CHF por empleado."
    },
    {
      title: "19. Fuerza Mayor",
      content: "Ninguna parte responde de retrasos o incumplimientos por causas fuera de control (desastres, huelgas, pandemias, fallos eléctricos). Obligaciones suspendidas; si dura >30 días, se puede rescindir."
    },
    {
      title: "20. Protección de Datos y Documentación",
      content: "Procesamiento de datos conforme a la Ley Suiza de Protección de Datos (revDSG) y el RGPD. Fotos de antes/después para control de calidad y seguros. Uso comercial de fotos requiere consentimiento previo."
    },
    {
      title: "21. Modificaciones y Divisibilidad",
      content: "Kraken puede modificar estas CGC con aviso de 30 días. No oponerse implica aceptación. Si una cláusula es inválida, el resto sigue vigente y la inválida se reemplaza por otra que cumpla el mismo fin económico."
    },
    {
      title: "22. Legislación Aplicable y Jurisdicción",
      content: "Todos los contratos se rigen por el derecho suizo, excluyendo la CISG. Fuero exclusivo en Schaffhausen, Suiza. Se reservan los fueros de consumo obligatorios."
    }
  ],
  verificationTitle: "Versión de las condiciones",
  lastUpdated: "Versión de condiciones: kraken-2026-11-24 · Revisión editorial: 25.11.2026",
  companyInfo: 'Kraken Properties and Facilities Management Gomes Mendes | Seewadelstrasse 3, 8203 Schaffhausen, Suiza',
  backHome: 'Volver al Inicio'
};

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
const deGDPR: GDPRTranslation = {
  title: "Datenschutzerklärung",
  badge: "Ihre Personendaten",
  subtitle: "Wie wir Reinigungs- und Umzugsanfragen bearbeiten",
  introTitle: 'Einleitung',
  introP1: "Verantwortlich ist Kraken Properties and Facilities Management Gomes Mendes, Seewadelstrasse 3, 8203 Schaffhausen, Schweiz. Kontakt: kai@krakenpfm.ch. Diese Erklärung beschreibt die Verwendung von Personendaten auf dieser Website und für unsere Reinigungen und kleinen Umzüge.",
  collectTitle: 'Erhobene Daten & Verwendungszweck',
  collectP1: "Wir verwenden die Angaben, die wir für Offerten, Anfragen sowie Reinigungen und kleine Umzüge benötigen:",
  collectItems: [
    "Kontaktdaten: Name, E-Mail, Telefonnummer und Einsatzadresse für Rückfragen und die Organisation des Auftrags.",
    "Auftragsangaben: gewählte Arbeiten, Flächen, Termine, Inventar sowie freiwillig bereitgestellte Fotos oder Videos.",
    "Zahlungen: Betrag, Zahlungsstatus und Anbieterreferenz. Kartendaten werden bei Payrexx eingegeben, nicht im Kraken-Anfrageformular.",
    "Websitedaten: IP-Adresse, notwendige Cookies, Sitzungsspeicher und Ihre Cookie-Auswahl für Betrieb und Sicherheit.",
  ],
  basisTitle: "Wofür wir Ihre Daten verwenden",
  basisP1: "Wir verwenden Personendaten für folgende Zwecke:",
  basisItems: [
    "Erstellen der Offerte und Bearbeiten Ihrer gewünschten Leistung.",
    "Führen der für Rechnungen und gesetzliche Pflichten erforderlichen Unterlagen.",
    "Betrieb und Schutz der Website. Für optionale Mitteilungen beachten wir Ihre Auswahl und, soweit erforderlich, Ihre Einwilligung.",
  ],
  retentionTitle: 'Datensicherung & Weitergabe an Dritte',
  retentionInfrastructure: 'Infrastruktur',
  retentionCollaboration: 'Zusammenarbeit',
  retentionDuration: 'Dauer',
  retentionStorage: "Die Website verwendet Vercel für das Hosting und Google Firebase/Firestore für Buchungsdaten. Die eingerichtete Buchungsdatenbank liegt in den USA. Zahlungen erfolgen über Payrexx in der Schweiz. Für Transaktions-E-Mails ist in Resend die Versandregion Irland (eu-west-1) ausgewählt.",
  retentionSharing: "Wir nutzen Dienstleister für Hosting, Buchungen, Kommunikation und Zahlungen. Resend übernimmt Transaktions-E-Mails; das Kontaktpostfach wird mit Microsoft 365 (Outlook) verwaltet. Wenn Sie Kais KI-Antworten aus der Cloud nutzen, verarbeitet auch Google Ihre Nachrichten. Personendaten werden nicht verkauft.",
  retentionTime: "Wir bewahren Daten für die Bearbeitung Ihrer Anfrage, den Auftrag und notwendige Rückfragen auf. Für Buchhaltungsunterlagen gelten die gesetzlichen Aufbewahrungspflichten. Kontaktieren Sie uns für eine Prüfung oder Löschung Ihrer Daten.",
  rightsTitle: 'Ihre Rechte',
  rightsP1: "Sie können Auskunft über Ihre Personendaten sowie deren Berichtigung oder Löschung verlangen, vorbehaltlich gesetzlicher Pflichten. Eine Einwilligung in optionale Werbung können Sie widerrufen. Schreiben Sie an kai@krakenpfm.ch.",
  disclaimerTitle: "Angaben zu Leistungen und Websiteinhalten",
  estimatesTitle: "Offerten und Termine",
  estimatesP1: "Der Rechner verwendet Ihre Angaben zur Leistung. Eine Anfrage bestätigt noch keinen Termin. Prüfen Sie Leistungsumfang, bestätigte Offerte und Vertragsbedingungen vor Ihrer Zusage.",
  liabilityTitle: "Fragen vor dem Auftrag",
  liabilityP1: "Kontaktieren Sie Kraken vor der Buchung, wenn Sie Fragen zum Leistungsumfang, zu Abgabebedingungen, zur Versicherung oder zu den Bedingungen Ihrer Anfrage haben.",
  ipTitle: 'Geistiges Eigentum (IP)',
  ipP1: "Eigene Inhalte und Materialien Dritter auf dieser Website unterliegen den jeweiligen Rechten und Lizenzen.",
  usageTitle: 'Nutzungsrechte',
  usageText: "Kontaktieren Sie Kraken vor einer gewerblichen Wiederverwendung eigener Websiteinhalte, soweit eine Erlaubnis erforderlich ist. Für Materialien Dritter gelten deren Lizenzen.",
  trademarksTitle: "Markennamen",
  trademarksText: "Kraken ist die auf dieser Website verwendete Marke. Namen und Logos Dritter gehören den jeweiligen Rechteinhabern.",
  verificationTitle: "Datenschutzkontakt: kai@krakenpfm.ch",
  lastUpdate: "Aktualisiert: 25. November 2026 | Seewadelstrasse 3, 8203 Schaffhausen",
};

const deTerms: TermsTranslation = {
  title: 'Allgemeine Geschäftsbedingungen (AGB)',
  description: 'Diese Allgemeinen Geschäftsbedingungen regeln alle professionellen Reinigungs-, Umzugs-, Unterhalts- und Facility-Management-Dienstleistungen von Kraken Properties and Facilities Management.',
  sections: [
    {
      title: "1. Geltungsbereich & Definitionen",
      content: "Diese Allgemeinen Geschäftsbedingungen ('AGB') gelten für alle Dienstleistungen von Kraken Properties and Facilities Management ('Kraken', 'wir') an Privatkunden ('Konsumenten') und Geschäftskunden ('B2B-Kunden'), einschliesslich Umzugs-, Tiefen- und regelmässigen Reinigungen, Umzügen, Fahrzeugaufbereitungen, Gartenpflege, Aussenreinigungen, Schädlingsbekämpfung und Facility Management. Abweichende Bedingungen gelten nur bei schriftlicher Akzeptanz."
    },
    {
      title: "2. Angebote, Schätzungen & Vertragsabschluss",
      content: "Ein Vertrag kommt durch die Bestätigung einer Offerte oder Online-Buchung zustande. Der Leistungsumfang definiert sich über die Buchungsbestätigung. Schätzungen des Online-Rechners sind unverbindlich. Unrichtige Angaben berechtigen Kraken zu Preisanpassungen. Die 'Precision Media Quote' beinhaltet eine nicht rückerstattbare Prüfgebühr von CHF 15.00 für Bildmaterial, die bei Annahme zu 100% gutgeschrieben wird. Express-Buchungen erfordern 15% Anzahlung."
    },
    {
      title: "3. Preise, MwSt. & Zuschläge",
      content: "3.1 Alle Preise verstehen sich in Schweizer Franken (CHF). Kraken ist derzeit nicht im MWST-Register gemäss Art. 10 MWSTG eingetragen; daher verstehen sich die Preise ohne MWST und es wird keine MWST in Rechnung gestellt. Im Falle einer zukünftigen Eintragung werden die Preise gesetzeskonform mit der in Ziffer 7.4 vorgesehenen Frist angepasst. Mehraufwand durch unvollständige Angaben wird mit CHF 90.00/Stunde/Person berechnet. Sonntags- und Feiertagsarbeit unterliegt 50% Zuschlag; Express-Buchungen (<24h Frist) 25% Zuschlag. Drittkosten (Entsorgung, Parken) werden zum Einstandspreis berechnet."
    },
    {
      title: "4. Anfahrt im Preis enthalten",
      content: "Die übliche Anfahrt für die gewählte Leistung ist im Preis des Rechners enthalten. Ausserordentliche Anfahrtskosten bedürfen einer vorherigen Vereinbarung und müssen in der schriftlichen Offerte ausgewiesen sein."
    },
    {
      title: "5. Zahlungsbedingungen & Verzug",
      content: "Zahlungen erfolgen über Payrexx, Banküberweisung oder QR-Rechnung. Der Restbetrag ist innert 7 Tagen fällig. Bei Zahlungsverzug fallen 5% Verzugszins sowie Mahngebühren von CHF 20.00 (2. Mahnung) und CHF 50.00 (3. Mahnung) an. Inkassokosten gehen zu Lasten des Kunden."
    },
    {
      title: "6. Stornierungen, Terminverschiebungen & Nichterscheinen",
      content: "Stornierungen müssen schriftlich erfolgen. Gebühren: >48h vor Start: kostenlos; <48h: 50% des Preises; <12h, Nichterscheinen oder Absage vor Ort: 100% des Preises. Eine kostenlose Verschiebung ist >24h vor Start nach Verfügbarkeit zulässig."
    },
    {
      title: "7. Wiederkehrende Dienstleistungen, SLAs & Kündigung",
      content: "Wiederkehrende Pläne laufen auf unbestimmte Zeit. Kündigung: 30 Tage auf Monatsende (7 Tage während der 2-monatigen Probezeit). Terminausfälle erfordern 48h Frist. B2B-SLAs richten sich nach vertraglichen Fristen oder 3 Monaten Kündigungsfrist. Jährliche Preisanpassungen sind mit 60 Tagen Vorankündigung möglich."
    },
    {
      title: "8. Umzugsreinigung — Abnahmegarantie",
      content: "Beinhaltet kostenlose Mängelbehebung bei offizieller Wohnungsübergabe (Abgabeprotokoll). Gültig, wenn: (a) Kraken innert 24h schriftlich mit Protokoll/Fotos benachrichtigt wird; (b) Übergabe innert 72h nach Reinigung stattfindet; (c) Objekt unbewohnt und ungenutzt blieb. Normaler Verschleiss, Schäden oder ausgeschlossene Bereiche sind nicht gedeckt."
    },
    {
      title: "9. Umzugs- & Transportdienstleistungen",
      content: "Der Kunde muss ein genaues Inventar bereitstellen. Bargeld, Schmuck, Gefahrstoffe sowie Pflanzen/Tiere sind vom Transport ohne schriftliche Vereinbarung ausgeschlossen. Kraken haftet für selbst verpackte Güter; für selbst gepackte Kartons des Kunden ist die Haftung ausgeschlossen. Haftung begrenzt auf Zeitwert, max. CHF 5'000.00 pro Ereignis. Verdeckte Schäden sind innert 3 Tagen zu melden."
    },
    {
      title: "10. Fahrzeugaufbereitung (Car Detailing)",
      content: "Vorhandene Schäden werden dokumentiert. Kraken haftet nicht für Vorschäden oder Verschlechterungen an bereits abgenutzten, spröden oder unsachgemäss vorbehandelten Materialien. Wertsachen sind vor dem Service aus dem Fahrzeug zu entfernen."
    },
    {
      title: "11. Garten-, Aussen-, Fassaden- & Dachrinnenreinigung",
      content: "Aussendienste sind witterungsabhängig. Wetter- oder sicherheitsbedingte Verschiebungen begründen keinen Verzug und keine Gebühren. Der Kunde muss Gefahren (zerbrechliche Dächer, Wespennester) melden. Grüngutentsorgung wird zum Einstandspreis berechnet."
    },
    {
      title: "12. Schädlingsbekämpfung — Garantie",
      content: "Beinhaltet 30 Tage Nachbehandlungsgarantie für behandelte Schädlingsarten und Bereiche. Bedingung ist die Einhaltung der Vorbereitungs- und Nachsorgeanweisungen. Ausgeschlossen sind Wiederbefall aus Nachbarquellen oder nicht behobene bauliche Mängel."
    },
    {
      title: "13. Entsorgungsmanagement (Waste Management)",
      content: "Entsorgung erfolgt gemäss Schweizer Umweltrecht. Deponie- und Recyclinggebühren werden zum Einstandspreis berechnet. Nicht deklarierte Gefahrstoffe berechtigen Kraken zur Arbeitseinstellung und Verrechnung von Zusatzkosten für fachgerechte Entsorgung."
    },
    {
      title: "14. Pflichten des Kunden, Zugang & Wartezeiten",
      content: "Der Kunde hat ungehinderten Zugang, Strom, fliessend Wasser, Heizung und Aufzug zu gewährleisten. Fehlender Zugang wird mit 100% verrechnet. Wartezeiten von >15 Minuten werden mit CHF 90.00/Stunde/Person in 15-Minuten-Schritten berechnet. Schlüssel werden sicher und anonymisiert aufbewahrt."
    },
    {
      title: "15. Mängelrügen & Reklamationen",
      content: "Arbeiten sind sofort nach Abschluss zu prüfen. Sichtbare Mängel innerhalb von 48h rügen; verdeckte Mängel innert 48h nach Entdeckung (max. 7 Tage nach Abschluss). Primäres Recht ist Nachbesserung. Rechnungsrückbehalte sind nur anteilig für betroffene Teile zulässig."
    },
    {
      title: "16. Haftung & Versicherung",
      content: "Angaben zu einer allfälligen Versicherungsdeckung ergeben sich aus den einschlägigen Versicherungsunterlagen und der schriftlichen Offerte. Kraken haftet nur für direkte Schäden durch nachweisbares Verschulden. Die Haftung für indirekte Schäden, entgangenen Gewinn oder Nutzungsausfall ist ausgeschlossen. Schlüsselverlusthaftung ist auf Standard-Ersatzkosten begrenzt."
    },
    {
      title: "17. Subunternehmer, spezialisierte Partner & Ablehnungsrecht",
      content: "Kraken kann qualifizierte Drittspezialisten beiziehen, bleibt jedoch alleiniger Vertragspartner. Kraken behält sich das Recht vor, Arbeiten abzulehnen oder einzustellen, wenn vor Ort unzumutbare Sicherheits- oder Gesundheitsrisiken bestehen."
    },
    {
      title: "18. Abwerbeverbot",
      content: "Der Kunde darf Mitarbeitende von Kraken während der Vertragslaufzeit und für 6 Monate danach weder direkt noch indirekt anstellen. Ein Verstoss zieht eine Konventionalstrafe von CHF 5'000.00 pro Mitarbeitendem nach sich."
    },
    {
      title: "19. Höhere Gewalt (Force Majeure)",
      content: "Keine Partei haftet für Verzögerungen oder Nichterfüllung aufgrund von Ereignissen ausserhalb zumutbarer Kontrolle (Naturkatastrophen, Streiks, Pandemien, Infrastrukturausfälle). Die Pflichten ruhen; dauert das Ereignis >30 Tage, können beide Parteien zurücktreten."
    },
    {
      title: "20. Datenschutz & Dokumentation",
      content: "Datenverarbeitung erfolgt gemäss dem Schweizer Datenschutzgesetz (DSG) und der DSGVO. Vorher-/Nachher-Fotos können zur Qualitätskontrolle und Versicherung erstellt werden. Die werbliche Nutzung von Fotos erfordert die vorherige Zustimmung."
    },
    {
      title: "21. Änderungen & Salvatorische Klausel",
      content: "Kraken kann diese AGB mit einer Frist von 30 Tagen ändern. Nicht-Widerspruch gilt als Genehmigung. Sollte eine Bestimmung ungültig sein, bleibt die Gültigkeit der übrigen unberührt; die ungültige wird durch eine dem wirtschaftlichen Zweck am nächsten kommende ersetzt."
    },
    {
      title: "22. Anwendbares Recht & Gerichtsstand",
      content: "Alle Verträge unterliegen ausschliesslich materiellem Schweizer Recht unter Ausschluss des UN-Kaufrechts (CISG). Gerichtsstand ist Schaffhausen, Schweiz. Zwingende gesetzliche Konsumentengerichtsstände bleiben vorbehalten."
    }
  ],
  verificationTitle: "Version der Bedingungen",
  lastUpdated: "Bedingungsversion: kraken-2026-11-24 · Redaktionelle Prüfung: 25.11.2026",
  companyInfo: 'Kraken Properties and Facilities Management Gomes Mendes | Seewadelstrasse 3, 8203 Schaffhausen, Schweiz',
  backHome: 'Zurück zur Startseite'
};

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
const frGDPR: GDPRTranslation = {
  title: "Politique de confidentialité",
  badge: "Vos données personnelles",
  subtitle: "Le traitement des demandes de nettoyage et de déménagement",
  introTitle: 'Introduction',
  introP1: "Le responsable est Kraken Properties and Facilities Management Gomes Mendes, Seewadelstrasse 3, 8203 Schaffhausen, Suisse. Contact : kai@krakenpfm.ch. Cette politique explique l’utilisation des données personnelles sur ce site et pour nos nettoyages et petits déménagements.",
  collectTitle: 'Données collectées & Finalités',
  collectP1: "Nous utilisons les informations nécessaires pour préparer les devis, traiter les demandes et réaliser les nettoyages et petits déménagements :",
  collectItems: [
    "Coordonnées : nom, e-mail, téléphone et adresse de la prestation, pour répondre et organiser le travail.",
    "Informations sur la prestation : tâches, surfaces, dates, inventaire et photos ou vidéos fournies volontairement.",
    "Paiements : montant, statut et référence du prestataire. Les données de carte sont saisies chez Payrexx, pas dans le formulaire de demande Kraken.",
    "Données du site : adresse IP, cookies nécessaires, stockage de session et préférences de cookies pour le fonctionnement et la sécurité.",
  ],
  basisTitle: "Les finalités du traitement",
  basisP1: "Nous utilisons les données personnelles pour :",
  basisItems: [
    "Préparer le devis et traiter la prestation demandée.",
    "Conserver les documents nécessaires à la facturation et aux obligations légales applicables.",
    "Exploiter et protéger le site. Les communications facultatives respectent vos choix et le consentement requis.",
  ],
  retentionTitle: 'Sécurité, conservation & Transferts',
  retentionInfrastructure: 'Infrastructure',
  retentionCollaboration: 'Collaboration',
  retentionDuration: 'Durée',
  retentionStorage: "Le site utilise Vercel pour l’hébergement et Google Firebase/Firestore pour les dossiers de réservation. La base de réservation configurée se trouve aux États-Unis. Les paiements utilisent Payrexx en Suisse. La région d’envoi sélectionnée dans Resend pour les e-mails transactionnels est l’Irlande (eu-west-1).",
  retentionSharing: "Nous utilisons des prestataires pour l’hébergement, les réservations, la communication et les paiements. Resend gère les e-mails transactionnels et Microsoft 365 (Outlook), notre messagerie de contact. Si vous utilisez les réponses IA de Kai dans le cloud, Google traite également vos messages. Nous ne vendons pas les données personnelles.",
  retentionTime: "Nous conservons les données pour traiter votre demande, réaliser la prestation et assurer le suivi nécessaire. Les documents comptables sont soumis aux obligations légales de conservation. Contactez-nous pour demander un examen ou une suppression de vos données.",
  rightsTitle: 'Vos droits',
  rightsP1: "Vous pouvez demander des informations sur vos données personnelles ainsi que leur rectification ou suppression, sous réserve des obligations légales. Vous pouvez retirer votre consentement aux publicités facultatives. Écrivez à kai@krakenpfm.ch.",
  disclaimerTitle: "Informations sur les prestations et le site",
  estimatesTitle: "Devis et rendez-vous",
  estimatesP1: "Le calculateur utilise les informations que vous saisissez. L’envoi d’une demande ne confirme pas un rendez-vous. Vérifiez les prestations, le devis confirmé et les conditions avant d’accepter.",
  liabilityTitle: "Questions avant de réserver",
  liabilityP1: "Contactez Kraken avant de réserver pour clarifier les prestations, les conditions de remise, l’assurance ou les conditions applicables à votre demande.",
  ipTitle: 'Propriété Intellectuelle (PI)',
  ipP1: "Le contenu original et les éléments de tiers sur ce site sont soumis à leurs droits et licences respectifs.",
  usageTitle: 'Droits d\'auteur',
  usageText: "Contactez Kraken avant toute réutilisation commerciale de son contenu original lorsqu’une autorisation est nécessaire. Les éléments de tiers conservent leurs propres licences.",
  trademarksTitle: "Noms de marque",
  trademarksText: "Kraken est la marque utilisée sur ce site. Les noms et logos de tiers appartiennent à leurs titulaires respectifs.",
  verificationTitle: "Contact pour la confidentialité : kai@krakenpfm.ch",
  lastUpdate: "Mise à jour : 25 novembre 2026 | Seewadelstrasse 3, 8203 Schaffhausen",
};

const frTerms: TermsTranslation = {
  title: 'Conditions Générales de Vente (CGV)',
  description: 'Les présentes Conditions Générales régissent l\'ensemble des prestations professionnelles de nettoyage, déménagement, maintenance et gestion de bâtiments proposées par Kraken Properties and Facilities Management.',
  sections: [
    {
      title: "1. Champ d'Application & Définitions",
      content: "Les présentes CGV s'appliquent à tous les services fournis par Kraken Properties and Facilities Management ('Kraken', 'nous') aux clients privés ('Consommateurs') et commerciaux ('Clients B2B'), y compris nettoyage de fin de bail, nettoyage en profondeur, récurrent, déménagement, esthétique automobile, jardinage, nettoyage extérieur, lutte contre les nuisibles et intendance. Toute dérogation requiert un accord écrit."
    },
    {
      title: "2. Offres, Estimations & Conclusion de Contrat",
      content: "Un contrat est conclu dès confirmation d'une offre ou réservation. Les estimations de la calculatrice en ligne sont provisoires. Des informations incorrectes autorisent Kraken à ajuster le prix. La Precision Media Quote comporte des frais d'examen non remboursables de CHF 15.00, crédités à 100% sur la facture finale en cas d'acceptation. Réservation Express requiert un acompte de 15%."
    },
    {
      title: "3. Tarifs, TVA & Majorations",
      content: "3.1 Tous les prix sont indiqués en francs suisses (CHF). Kraken n'est pas actuellement inscrite au registre de la TVA (MWST) conformément à l'art. 10 LTVA ; par conséquent, les prix ne comprennent pas la TVA et aucune TVA n'est facturée. En cas d'inscription future, les prix seront ajustés conformément à la loi avec le préavis prévu à la clause 7.4. Tout surcroît de travail lié à des conditions non déclarées sera facturé CHF 90.00/heure/personne. Le travail dominical et les jours fériés subissent une majoration de 50%; les réservations express (<24h de préavis), une majoration de 25%. Les décharges et stationnements sont facturés au prix coûtant."
    },
    {
      title: "4. Déplacement inclus dans le prix",
      content: "Le déplacement habituel pour la prestation choisie est inclus dans le prix du calculateur. Tout frais de déplacement exceptionnel nécessite un accord préalable et doit figurer dans le devis écrit."
    },
    {
      title: "5. Modalités de Règlement & Retards",
      content: "Règlements sécurisés via Payrexx, virement ou QR-facture. Le solde est exigible sous 7 jours dès facturation. Tout retard entraîne un intérêt moratoire légal de 5% par an et des frais de sommation de CHF 20.00 (2e rappel) et CHF 50.00 (3e rappel). Les frais de recouvrement incombent au client."
    },
    {
      title: "6. Annulations, Reports & Non-Présentation",
      content: "Toute annulation doit être formulée par écrit. Indemnités: préavis >48 heures: gratuit; <48 heures: 50% du prix; <12 heures, non-présentation ou annulation sur place: 100% du devis. Un report gratuit est toléré >24 heures avant l'intervention, selon nos disponibilités."
    },
    {
      title: "7. Prestations Récurrentes, SLAs & Résiliation",
      content: "Les contrats récurrents sont à durée indéterminée. Résiliation: préavis de 30 jours pour la fin d'un mois (7 jours pendant la période d'essai de 2 mois). Annulation de session isolée exige 48h de préavis. Les contrats B2B avec SLA suivent les conditions convenues ou 3 mois de préavis. Ajustements de prix annuels avec préavis de 60 jours."
    },
    {
      title: "8. Nettoyage de Fin de Bail — Garantie de Remise",
      content: "Comprend la rectification gratuite de toute lacune signalée par le bailleur lors de l'état des lieux officiel (Abgabeprotokoll). Conditions: (a) notification écrite sous 24h avec protocole/photos; (b) visite d'état des lieux sous 72h après nettoyage; (c) logement resté inoccupé et inutilisé. Exclut l'usure normale, défauts du bâtiment et éléments exclus."
    },
    {
      title: "9. Services de Déménagement & Logistique",
      content: "Le client s'engage à fournir un inventaire exact. Espèces, bijoux, armes, produits dangereux et plantes/animaux sont exclus sans accord écrit préalable. Kraken répond des objets emballés par ses soins; l'exclusion s'applique au contenu des cartons préparés par le client. Garantie limitée à la valeur vénale réelle, max CHF 5'000.00 par événement. Sinistres cachés à annoncer sous 3 jours."
    },
    {
      title: "10. Préparation de Véhicules (Car Detailing)",
      content: "Les défauts préexistants sont consignés. Kraken décline toute responsabilité pour l'altération de pièces usées, cassantes ou ayant subi un mauvais traitement antérieur. Le client est tenu de vider le véhicule de tout objet de valeur."
    },
    {
      title: "11. Jardinage, Nettoyages Extérieurs, Façades & Gouttières",
      content: "Les interventions extérieures dépendent de la météo. Les reports météorologiques ou sécuritaires ne constituent pas un retard et n'engendrent aucun frais. Le client signale les dangers connus (toits fragiles, guêpiers). L'évacuation des déchets verts est facturée au coût réel, sauf disposition contraire."
    },
    {
      title: "12. Traitement Anti-Nuisibles — Garantie",
      content: "Garantie de retraitement de 30 jours pour les espèces et zones ciblées. Conditionnée par le respect rigoureux des instructions de préparation et de suivi. Exclut les réinfestations externes ou défauts structurels non corrigés par le client."
    },
    {
      title: "13. Gestion des Déchets",
      content: "Élimination des résidus conforme aux lois environnementales suisses. Les redevances de déchetterie sont facturées au coût réel. Des déchets dangereux cachés autorisent Kraken à cesser le travail et à facturer les surcoûts de traitement spécialisé."
    },
    {
      title: "14. Devoirs du Client, Accès & Heures d'Attente",
      content: "Garantir le libre accès, l'eau, l'électricité, le chauffage et l'ascenseur. Un défaut d'accès est facturé à 100%. Tout retard d'accès de >15 minutes est majoré à CHF 90.00/heure/personne par tranche de 15 minutes. Les clés remises sont sécurisées anonymement."
    },
    {
      title: "15. Réclamations & Signalement des Défauts",
      content: "Contrôler le travail immédiatement à l'issue. Signaler les défauts apparents sous 48h; cachés sous 48h dès découverte (max 7 jours post-intervention). Le remède primaire est la retouche. Les retenues de factures sont limitées à la section concernée."
    },
    {
      title: "16. Responsabilité & Assurances",
      content: "Les éventuelles couvertures d’assurance sont précisées dans les documents de police applicables et le devis écrit. Kraken répond uniquement des dommages directs résultant d'une faute prouvée. Exclut les préjudices indirects, pertes de gain ou privations d'usage. Clés égarées limitées aux seuls frais de reproduction standard."
    },
    {
      title: "17. Sous-traitants, Partenaires Agréés & Droit de Refus",
      content: "Kraken est libre de s'adjoindre des sous-traitants spécialisés mais demeure le seul interlocuteur contractuel. Kraken se réserve d'annuler ou suspendre l'acte si les conditions compromettent la santé ou la sécurité."
    },
    {
      title: "18. Clause de Non-Sollicitation",
      content: "Le client s'interdit d'embaucher, directement ou indirectement, le personnel de Kraken affecté à ses locaux pendant la durée du contrat et durant les 6 mois suivants. Toute infraction entraîne une pénalité forfaitaire de CHF 5'000.00 par employé."
    },
    {
      title: "19. Force Majeure",
      content: "Aucune partie ne répond de retards ou inexécutions consécutifs à des cas de force majeure (catastrophes, grèves, pandémies, coupures d'énergie). Obligations suspendues; si la durée excède 30 jours, chaque partie est en droit de résilier."
    },
    {
      title: "20. Protection des Données & Documentation",
      content: "Traitement confidentiel des données selon la Loi suisse sur la protection des données (LPD) et le RGPD. Des photos de contrôle 'avant/après' peuvent être réalisées pour la qualité et les assurances. Usage publicitaire soumis à accord préalable."
    },
    {
      title: "21. Modifications & Clause de Réserve",
      content: "Kraken se réserve d'ajuster ces CGV sous préavis de 30 jours. L'absence d'opposition vaut acceptation. Si une clause est jugée invalide, les autres demeurent en vigueur, et celle-ci est substituée par la clause la plus proche du but économique visé."
    },
    {
      title: "22. Droit Applicable & Juridiction",
      content: "Tous les contrats sont soumis exclusivement au droit matériel suisse, à l'exclusion de la CIVM. Le for juridique exclusif est à Schaffhouse, en Suisse. Les fors de consommation impératifs sont réservés."
    }
  ],
  verificationTitle: "Version des conditions",
  lastUpdated: "Version des conditions : kraken-2026-11-24 · Révision éditoriale : 25.11.2026",
  companyInfo: 'Kraken Properties and Facilities Management Gomes Mendes | Seewadelstrasse 3, 8203 Schaffhausen, Suisse',
  backHome: 'Retour à l\'Accueil'
};

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
const itGDPR: GDPRTranslation = {
  title: "Informativa sulla privacy",
  badge: "I suoi dati personali",
  subtitle: "Come gestiamo le richieste di pulizia e trasloco",
  introTitle: 'Introduzione',
  introP1: "Il responsabile è Kraken Properties and Facilities Management Gomes Mendes, Seewadelstrasse 3, 8203 Schaffhausen, Svizzera. Contatto: kai@krakenpfm.ch. L’informativa descrive l’uso dei dati personali su questo sito e per i servizi di pulizia e piccoli traslochi.",
  collectTitle: 'Dati Raccolti e Finalità',
  collectP1: "Utilizziamo le informazioni necessarie per preparare preventivi, gestire richieste ed eseguire pulizie e piccoli traslochi:",
  collectItems: [
    "Contatti: nome, email, telefono e indirizzo del servizio, per rispondere e organizzare il lavoro.",
    "Dati del servizio: attività scelte, superfici, date, inventario e foto o video forniti volontariamente.",
    "Pagamenti: importo, stato e riferimento del fornitore. I dati della carta sono inseriti presso Payrexx, non nel modulo di richiesta Kraken.",
    "Dati del sito: indirizzo IP, cookie necessari, memoria di sessione e preferenze sui cookie per funzionamento e sicurezza.",
  ],
  basisTitle: "Perché utilizziamo i dati",
  basisP1: "Utilizziamo i dati personali per:",
  basisItems: [
    "Preparare il preventivo e gestire il servizio richiesto.",
    "Conservare la documentazione necessaria per fatture e obblighi legali applicabili.",
    "Gestire e proteggere il sito. Le comunicazioni facoltative rispettano le sue scelte e il consenso richiesto.",
  ],
  retentionTitle: 'Conservazione Sicura e Trasmissione a Terzi',
  retentionInfrastructure: 'Infrastruttura',
  retentionCollaboration: 'Collaborazione',
  retentionDuration: 'Durata',
  retentionStorage: "Il sito utilizza Vercel per l’hosting e Google Firebase/Firestore per i dati delle prenotazioni. Il database configurato per le prenotazioni si trova negli Stati Uniti. I pagamenti utilizzano Payrexx in Svizzera. La regione di invio selezionata in Resend per le email transazionali è l’Irlanda (eu-west-1).",
  retentionSharing: "Utilizziamo fornitori per hosting, prenotazioni, comunicazioni e pagamenti. Resend gestisce le email transazionali e Microsoft 365 (Outlook) la casella di contatto. Se utilizza le risposte IA di Kai nel cloud, anche Google tratta i messaggi. Non vendiamo dati personali.",
  retentionTime: "Conserviamo i dati per gestire la richiesta, eseguire il servizio e il seguito necessario. I documenti contabili sono soggetti agli obblighi legali di conservazione. Può contattarci per richiedere una verifica o la cancellazione dei dati.",
  rightsTitle: 'I Vostri Diritti',
  rightsP1: "Può chiedere informazioni sui suoi dati personali e richiederne la correzione o cancellazione, fatti salvi gli obblighi legali. Può revocare il consenso alla pubblicità facoltativa. Scriva a kai@krakenpfm.ch.",
  disclaimerTitle: "Informazioni sul servizio e contenuti del sito",
  estimatesTitle: "Preventivi e appuntamenti",
  estimatesP1: "Il calcolatore utilizza i dati del servizio inseriti. Inviare una richiesta non conferma un appuntamento. Verifichi prestazioni, preventivo confermato e condizioni prima di accettare.",
  liabilityTitle: "Domande prima di prenotare",
  liabilityP1: "Contatti Kraken prima di prenotare per chiarimenti sulle prestazioni, sulle condizioni di consegna, sull’assicurazione o sulle condizioni applicabili alla richiesta.",
  ipTitle: 'Diritti di Proprietà Intellettuale (IP)',
  ipP1: "I contenuti originali e i materiali di terzi presenti sul sito sono soggetti ai rispettivi diritti e licenze.",
  usageTitle: 'Termini d\'Uso d\'Autore',
  usageText: "Contatti Kraken prima di riutilizzare commercialmente i contenuti originali quando occorre un’autorizzazione. Ai materiali di terzi si applicano le rispettive licenze.",
  trademarksTitle: "Nomi dei marchi",
  trademarksText: "Kraken è il marchio utilizzato su questo sito. Nomi e loghi di terzi appartengono ai rispettivi titolari.",
  verificationTitle: "Contatto per la privacy: kai@krakenpfm.ch",
  lastUpdate: "Aggiornato: 25 novembre 2026 | Seewadelstrasse 3, 8203 Schaffhausen",
};

const itTerms: TermsTranslation = {
  title: 'Condizioni Generali di Contratto (CGC)',
  description: 'Le presenti Condizioni Generali regolano tutti i servizi professionali di pulizia, trasloco, manutenzione e gestione degli immobili forniti da Kraken Properties and Facilities Management.',
  sections: [
    {
      title: "1. Ambito di Applicazione & Definizioni",
      content: "Le presenti CGC si applicano a tutti i servizi forniti da Kraken Properties and Facilities Management ('Kraken', 'noi') a clienti privati ('Consumatori') e aziendali ('Clienti B2B'), inclusi traslochi, pulizie di fine locazione, pulizie profonde, ricorrenti, detailing auto, giardinaggio, pulizia esterna, disinfestazione e facility management. Eventuali deroghe sono valide solo se accettate per iscritto."
    },
    {
      title: "2. Offerte, Stime & Conclusione del Contratto",
      content: "Il contratto si perfeziona con la conferma di un preventivo o di una prenotazione. Le stime del calcolatore online sono indicative. Informazioni errate autorizzano Kraken ad adeguare i prezzi. L'opzione 'Precision Media Quote' prevede una tassa d'esame non rimborsabile di CHF 15.00, accreditata al 100% sulla fattura finale in caso di accettazione. Le prenotazioni Express richiedono un acconto del 15%."
    },
    {
      title: "3. Prezzi, IVA & Maggiorazioni",
      content: "3.1 Tutti i prezzi sono espressi in franchi svizzeri (CHF). Kraken non è attualmente iscritta nel registro dell'IVA (MWST) ai sensi dell'Art. 10 LIVA; pertanto, i prezzi s'intendono IVA esclusa e non viene fatturata alcuna IVA. In caso di futura iscrizione, i prezzi saranno adeguati a norma di legge con il preaviso previsto alla clausola 7.4. Il lavoro extra dovuto a condizioni non dichiarate sarà fatturato a CHF 90.00/ora/persona. Il lavoro domenicale e festivo è soggetto a una maggiorazione del 50%; le prenotazioni express (<24h di preavviso) a una maggiorazione del 25%. Le spese di discarica e parcheggio sono fatturate al costo."
    },
    {
      title: "4. Trasferta inclusa nel prezzo",
      content: "La trasferta ordinaria per il servizio scelto è inclusa nel prezzo del calcolatore. Eventuali spese di trasferta eccezionali richiedono un accordo preventivo e devono essere indicate nel preventivo scritto."
    },
    {
      title: "5. Termini di Pagamento & Mora",
      content: "Pagamenti sicuri tramite Payrexx, bonifico o polizza QR. Il saldo è esigibile entro 7 giorni dalla fatturazione. La mora è automatica alla scadenza, con un interesse annuo del 5% e spese di sollecito di CHF 20.00 (2° sollecito) e CHF 50.00 (3° sollecito). Le spese di recupero crediti sono a carico del cliente."
    },
    {
      title: "6. Cancellazioni, Rinvii & Mancata Presentazione",
      content: "Le cancellazioni devono essere formate per iscritto. Penali: preavviso >48 ore: gratuito; <48 ore: 50% del prezzo; <12 ore, mancata presentazione o cancellazione sul posto: 100% del preventivo. Un rinvio gratuito è consentito >24 ore prima dell'intervento, previa disponibilità."
    },
    {
      title: "7. Servizi Ricorrenti, SLAs & Risoluzione",
      content: "I contratti ricorrenti sono a tempo indeterminato. Risoluzione: preavviso di 30 giorni per la fine di un mese (7 giorni durante il periodo di prova di 2 mesi). L'annullamento della singola sessione richiede 48h di preavviso. I contratti B2B con SLA seguono le condizioni pattuite o 3 mesi di preavviso. Adeguamenti tariffari annuali con preavviso di 60 giorni."
    },
    {
      title: "8. Pulizia di Fine Locazione — Garanzia di Consegna",
      content: "Include la risoluzione gratuita di qualsiasi lacuna riscontrata dal locatore durante il collaudo ufficiale (Abgabeprotokoll). Condizioni: (a) notifica scritta entro 24h con protocollo/foto; (b) collaudo ufficiale entro 72h dalla pulizia; (c) immobile rimasto sfitto e inutilizzato. Esclude la normale usura, difetti strutturali ed elementi esclusi."
    },
    {
      title: "9. Servizi di Trasloco & Logistica",
      content: "Il cliente si impegna a fornire un inventario preciso. Contanti, gioielli, armi, merci pericolose e piante/animali sono esclusi dal trasporto senza previo accordo scritto. Kraken risponde dei beni imballati dal proprio personale; si esclude il contenuto degli scatoloni imballati dal cliente. Responsabilità limitata al valore reale di mercato, max CHF 5'000.00 per evento. Danni occulti da segnalare entro 3 giorni."
    },
    {
      title: "10. Preparazione dei Veicoli (Car Detailing)",
      content: "I difetti preesistenti vengono registrati. Kraken declina ogni responsabilità per l'usura o il danneggiamento di parti deteriorate, fragili o che hanno subito trattamenti errati in precedenza. Il cliente deve svuotare l'auto da oggetti di valore."
    },
    {
      title: "11. Giardinaggio, Pulizia Esterna, Facciate & Grondaie",
      content: "I servizi esterni dipendono dalle condizioni atmosferiche. I rinvii dovuti al meteo o alla sicurezza non costituiscono mora e non comportano spese. Il cliente deve segnalare i pericoli noti (tetti fragili, vespai). Lo smaltimento dei rifiuti verdi è fatturato al costo reale, salvo diversa disposizione."
    },
    {
      title: "12. Trattamento Disinfestazione — Garanzia",
      content: "Garanzia di re-intervento di 30 giorni per le specie e le aree trattate. Condizionata al rispetto rigoroso delle istruzioni di preparazione e monitoraggio. Esclude reinfestazioni esterne o difetti strutturali non corretti dal cliente."
    },
    {
      title: "13. Gestione dei Rifiuti",
      content: "Smaltimento conforme alle leggi ambientali svizzere. Le tariffe di discarica sono fatturate al costo reale. Rifiuti pericolosi non dichiarati autorizzano Kraken a sospendere il lavoro e a fatturare i costi extra per la gestione specialistica."
    },
    {
      title: "14. Doveri del Cliente, Accesso & Tempi d'Attesa",
      content: "Garantire il libero accesso, acqua, elettricità, riscaldamento e ascensore. Il mancato accesso è fatturato al 100%. Ritardi d'accesso superiori a 15 minuti sono maggiorati a CHF 90.00/ora/persona a intervalli di 15 minuti. Le chiavi consegnate sono custodite in modo sicuro e anonimo."
    },
    {
      title: "15. Reclami & Segnalazione dei Difetti",
      content: "Controllare il lavoro immediatamente al termine. Segnalare i difetti visibili entro 48 ore; occulti entro 48 ore dalla scoperta (max 7 giorni post-intervento). Il rimedio primario è la rettifica. Trattenute parziali della fattura sono consentite solo per la sezione interessata."
    },
    {
      title: "16. Responsabilità Civile & Assicurazioni",
      content: "Le eventuali coperture assicurative sono descritte nei documenti di polizza applicabili e nel preventivo scritto. Kraken risponde unicamente dei danni diretti derivanti da colpa comprovata. Esclude danni indiretti, perdita di profitto o privazione d'uso. La responsabilità per smarrimento chiavi è limitata alle sole spese di riproduzione standard."
    },
    {
      title: "17. Subappaltatori, Partner Specializzati & Diritto di Rifiuto",
      content: "Kraken è libera di avvalersi di subappaltatori specializzati ma rimane l'unico partner contrattuale. Kraken si riserva di annullare o sospendere il servizio se le condizioni compromettono la salute o la sicurezza del personale."
    },
    {
      title: "18. Divieto de Storno del Personale",
      content: "Il cliente si impegna a non assumere, direttamente o indirettamente, il personale di Kraken impiegato presso i propri locali durante il contratto e nei 6 mesi successivi. Qualsiasi violazione comporta una penale di CHF 5'000.00 per dipendente."
    },
    {
      title: "19. Forza Maggiore",
      content: "Nessuna delle parti risponde di ritardi o inadempimenti dovuti a forza maggiore (catastrofi, scioperi, pandemie, interruzioni di corrente). Obblighi sospesi; se la durata supera i 30 giorni, ciascuna parte ha il diritto di recedere."
    },
    {
      title: "20. Protezione dei Dati & Documentazione",
      content: "Trattamento riservato dei dati personali ai sensi della Legge svizzera sulla protezione dei dati (LPD) e del GDPR. Possono essere scattate foto 'prima/dopo' per il controllo qualità e scopi assicurativi. L'uso promozionale delle foto è soggetto a preventivo consenso."
    },
    {
      title: "21. Modifiche & Clausola Salvatoria",
      content: "Kraken si riserva di modificare le presenti CGC con un preavviso di 30 giorni. La mancata opposizione equivale ad accettazione. Se una clausola è dichiarata invalida, le altre rimangono in vigore e quella invalida viene sostituita con la disposizione più vicina allo scopo economico."
    },
    {
      title: "22. Legge Applicabile & Foro Competente",
      content: "Tutti i contratti sono regolati esclusivamente dal diritto svizzero materiale, ad esclusione della CISG. Il foro competente esclusivo è Sciaffusa, Svizzera. Sono fatti salvi i fori di consumo imperativi."
    }
  ],
  verificationTitle: "Versione delle condizioni",
  lastUpdated: "Versione delle condizioni: kraken-2026-11-24 · Revisione editoriale: 25.11.2026",
  companyInfo: 'Kraken Properties and Facilities Management Gomes Mendes | Seewadelstrasse 3, 8203 Schaffhausen, Svizzera',
  backHome: 'Ritorna alla Home page'
};

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
const ptGDPR: GDPRTranslation = {
  title: "Política de privacidade",
  badge: "Os seus dados pessoais",
  subtitle: "Como tratamos os pedidos de limpeza e pequenas mudanças",
  introTitle: 'Introdução',
  introP1: "O responsável é Kraken Properties and Facilities Management Gomes Mendes, Seewadelstrasse 3, 8203 Schaffhausen, Suíça. Contacto: kai@krakenpfm.ch. Esta política explica a utilização de dados pessoais neste website e nos serviços de limpeza e pequenas mudanças.",
  collectTitle: 'Dados que Recolhemos & Finalidade',
  collectP1: "Utilizamos as informações necessárias para preparar orçamentos, tratar pedidos e realizar limpezas e pequenas mudanças:",
  collectItems: [
    "Contactos: nome, email, telefone e morada do serviço, para responder e organizar o trabalho.",
    "Dados do serviço: tarefas escolhidas, áreas, datas, inventário e fotografias ou vídeos fornecidos voluntariamente.",
    "Pagamentos: valor, estado e referência do fornecedor. Os dados do cartão são introduzidos na Payrexx, não no formulário de pedido da Kraken.",
    "Dados do website: endereço IP, cookies necessários, armazenamento de sessão e preferências de cookies, para funcionamento e segurança.",
  ],
  basisTitle: "Para que utilizamos os dados",
  basisP1: "Utilizamos os dados pessoais para:",
  basisItems: [
    "Preparar o orçamento e tratar o serviço solicitado.",
    "Manter a documentação necessária para faturação e obrigações legais aplicáveis.",
    "Gerir e proteger o website. As comunicações opcionais respeitam as suas preferências e o consentimento necessário.",
  ],
  retentionTitle: 'Segurança, Armazenamento & Parcerias',
  retentionInfrastructure: 'Infraestrutura',
  retentionCollaboration: 'Colaboração',
  retentionDuration: 'Duração',
  retentionStorage: "O website utiliza a Vercel para alojamento e Google Firebase/Firestore para os registos de reservas. A base de dados de reservas configurada encontra-se nos Estados Unidos. Os pagamentos utilizam a Payrexx na Suíça. A região de envio selecionada na Resend para os emails transacionais é a Irlanda (eu-west-1).",
  retentionSharing: "Utilizamos fornecedores para alojamento, reservas, comunicação e pagamentos. A Resend gere os emails transacionais e o Microsoft 365 (Outlook), a caixa de correio de contacto. Se utilizar as respostas de IA do Kai na nuvem, a Google também processa as mensagens. Não vendemos dados pessoais.",
  retentionTime: "Conservamos os dados para tratar o pedido, realizar o serviço e prestar o acompanhamento necessário. Os documentos contabilísticos estão sujeitos às obrigações legais de conservação. Contacte-nos para solicitar a revisão ou eliminação dos seus dados.",
  rightsTitle: 'Os Seus Direitos',
  rightsP1: "Pode solicitar informações sobre os seus dados pessoais e pedir a correção ou eliminação, sem prejuízo das obrigações legais. Pode retirar o consentimento para publicidade opcional. Escreva para kai@krakenpfm.ch.",
  disclaimerTitle: "Informações do serviço e conteúdos do website",
  estimatesTitle: "Orçamentos e marcações",
  estimatesP1: "A calculadora utiliza os dados do serviço introduzidos. O envio de um pedido não confirma uma marcação. Verifique o serviço, o orçamento confirmado e as condições antes de aceitar.",
  liabilityTitle: "Questões antes de contratar",
  liabilityP1: "Contacte a Kraken antes de contratar para esclarecer o âmbito do serviço, as condições de entrega, o seguro ou as condições aplicáveis ao pedido.",
  ipTitle: 'Direitos Intelectuais (IP)',
  ipP1: "Os conteúdos originais e os materiais de terceiros neste website estão sujeitos aos respetivos direitos e licenças.",
  usageTitle: 'Termos de Utilização',
  usageText: "Contacte a Kraken antes de reutilizar comercialmente os conteúdos originais quando for necessária autorização. Os materiais de terceiros mantêm as respetivas licenças.",
  trademarksTitle: "Nomes das marcas",
  trademarksText: "Kraken é a marca utilizada neste website. Os nomes e logótipos de terceiros pertencem aos respetivos titulares.",
  verificationTitle: "Contacto de privacidade: kai@krakenpfm.ch",
  lastUpdate: "Atualização: 25 de novembro de 2026 | Seewadelstrasse 3, 8203 Schaffhausen",
};

const ptTerms: TermsTranslation = {
  title: 'Condições Gerais de Contrato (CGC)',
  description: 'Estas Condições Gerais regulam todos os serviços profissionais de limpeza, mudança, manutenção e gestão de instalações prestados pela Kraken Properties and Facilities Management.',
  sections: [
    {
      title: "1. Âmbito de Aplicação & Definições",
      content: "Estas CGC aplicam-se a todos os serviços prestados pela Kraken Properties and Facilities Management ('Kraken', 'nós') a clientes privados ('Consumidores') e corporativos ('Clientes B2B'), incluindo mudanças, limpezas de final de arrendamento, limpezas profundas, recorrentes, detalhe automóvel, jardinagem, limpeza exterior, controlo de pragas e gestão de propriedades. Condições divergentes apenas se aplicam se forem aceites por escrito."
    },
    {
      title: "2. Ofertas, Estimativas & Conclusão do Contrato",
      content: "O contrato é formalizado com a confirmação de um orçamento ou reserva. As estimativas da calculadora online são aproximadas. Informações incorretas autorizam a Kraken a ajustar os preços. A opção 'Precision Media Quote' implica uma taxa não reembolsável de CHF 15.00 para análise técnica, que será creditada a 100% na fatura final em caso de aceitação. A reserva Express requer um depósito de 15%."
    },
    {
      title: "3. Preços, IVA & Sobretaxas",
      content: "3.1 Todos os preços são expressos em francos suíços (CHF). A Kraken não está atualmente inscrita no registo do IVA (MWST) em conformidade com o Art. 10 LIVA; portanto, os preços não incluem IVA e não é faturado IVA. No caso de uma inscrição futura, os preços serão ajustados em conformidade com a lei, com o aviso prévio previsto na cláusula 7.4. Trabalho extra devido a condições não declaradas será faturado a CHF 90.00/hora/pessoa. O trabalho aos domingos e feriados está sujeito a um acréscimo de 50%; as reservas express (<24h de aviso prévio) têm um acréscimo de 25%. Os custos de lixeira e estacionamento são faturados ao preço de custo."
    },
    {
      title: "4. Deslocação incluída no preço",
      content: "A deslocação habitual para o serviço escolhido está incluída no preço da calculadora. Qualquer despesa de deslocação excecional exige acordo prévio e deve constar do orçamento escrito."
    },
    {
      title: "5. Condições de Pagamento & Mora",
      content: "Pagamentos seguros via Payrexx, transferência ou fatura QR. O saldo restante vence 7 dias após a fatura. A mora é automática após o vencimento, com juros anuais de 5% e taxas de cobrança de CHF 20.00 (2º aviso) e CHF 50.00 (3º aviso). Os custos de cobrança judicial são suportados pelo cliente."
    },
    {
      title: "6. Cancelamentos, Adiamentos & Não-Comparência",
      content: "Os cancelamentos devem ser feitos por escrito. Taxas: aviso >48 horas: gratuito; <48 horas: 50% do valor; <12 horas, não-comparência ou cancelamento no local: 100% do orçamento. É permitido um adiamento gratuito com aviso >24 horas, sujeito a disponibilidade."
    },
    {
      title: "7. Serviços Recorrentes, SLAs & Rescisão",
      content: "Os planos recorrentes são por tempo indeterminado. Rescisão: aviso prévio de 30 dias para o fim de um mês (7 dias no período de experiência de 2 meses). Cancelar uma sessão individual exige 48h de aviso prévio. Os contratos B2B com SLA regem-se pelas condições acordadas ou aviso prévio de 3 meses. Ajustes anuais de preços com aviso prévio de 60 dias."
    },
    {
      title: "8. Limpeza de Final de Arrendamento — Garantia de Entrega",
      content: "Inclui a correção gratuita de quaisquer deficiências detetadas pelo senhorio na vistoria oficial (Abgabeprotokoll). Condições: (a) comunicado por escrito em 24h com protocolo/fotos; (b) vistoria em até 72h após a limpeza; (c) imóvel mantido desocupado e sem uso. Não cobre desgaste normal, danos estruturais ou áreas excluídas."
    },
    {
      title: "9. Serviços de Mudança & Logística",
      content: "O cliente deve fornecer um inventário preciso. Dinheiro, joias, armas, produtos químicos e plantas/animais estão excluídos do transporte sem acordo prévio por escrito. A Kraken responde por bens embalados pelo seu pessoal; exclui-se o conteúdo de caixas embaladas pelo cliente. Responsabilidade limitada ao valor atual de mercado, no máximo CHF 5'000.00 por sinistro. Danos ocultos devem ser reportados em 3 dias."
    },
    {
      title: "10. Detalhe Automóvel (Car Detailing)",
      content: "Danos existentes são previamente documentados. A Kraken não se responsabiliza por danos preexistentes ou pelo desgaste de materiais antigos, frágeis ou previamente mal tratados. Retirar objetos pessoais antes do serviço."
    },
    {
      title: "11. Jardinagem, Limpeza Exterior, Fachadas & Algerozes",
      content: "Os serviços ao ar livre dependem das condições meteorológicas. Adiamentos por razões de clima ou segurança não constituem mora e não geram taxas. O cliente deve informar sobre perigos (telhados frágeis, ninhos de vespas). A eliminação de resíduos verdes é faturada ao custo real, salvo acordo em contrário."
    },
    {
      title: "12. Controlo de Pragas — Garantia",
      content: "Garantia de re-treatment de 30 dias para as espécies e áreas tratadas. Sujeito ao cumprimento das instruções de preparação e acompanhamento. Exclui reinfestações de vizinhos ou falhas estruturais não corrigidas pelo cliente."
    },
    {
      title: "13. Gestão de Resíduos",
      content: "Eliminação em conformidade com as leis ambientais suíças. As taxas de lixeira são faturadas ao preço de custo. Resíduos perigosos não declarados autorizam a Kraken a suspender os trabalhos e faturar custos adicionais de tratamento especializado."
    },
    {
      title: "14. Deveres do Cliente, Acesso & Tempos de Espera",
      content: "Garantir acesso livre, água, eletricidade, aquecimento e elevador. A falta de acesso é faturada a 100%. Atrasos de acesso >15 min são faturados a CHF 90.00/hora/persona em frações de 15 min. As chaves entregues são guardadas de forma segura e anónima."
    },
    {
      title: "15. Reclamações & Notificação de Defeitos",
      content: "Inspecionar os trabalhos logo após a conclusão. Defeitos visíveis reportados em 48h; ocultos em 48h após a descoberta (máx. 7 dias pós-serviço). A correção é a solução primária. Retenções de faturas são autorizadas apenas para a parte afetada."
    },
    {
      title: "16. Responsabilidade Civil & Seguros",
      content: "As coberturas de seguro eventualmente aplicáveis constam da documentação da apólice e do orçamento escrito. A Kraken responde apenas por danos diretos por culpa provada. Excluem-se lucros cessantes, danos indiretos ou perda de uso. Perda de chaves limitada ao custo de cópia padrão."
    },
    {
      title: "17. Subempreiteiros, Parceiros Especializados & Direito de Recusa",
      content: "A Kraken pode subcontratar parceiros qualificados mas permanece como único parceiro contratual. A Kraken reserva o direito de recusar ou suspender o serviço se existirem riscos para a saúde ou segurança das equipas."
    },
    {
      title: "18. Não-Recrutamento de Pessoal",
      content: "O cliente não contratará, direta ou indiretamente, nenhum colaborador da Kraken que atue nos seus imóveis durante o contrato e nos 6 meses seguintes. A infração implica uma indemnização de CHF 5'000.00 por colaborador."
    },
    {
      title: "19. Força Maior",
      content: "Nenhuma das partes responde por atrasos ou incumprimentos decorrentes de eventos fora de controlo (catástrofes, greves, pandemias, falhas de energia). Obrigações suspensas; se durar >30 dias, qualquer parte pode rescindir."
    },
    {
      title: "20. Proteção de Dados & Documentazione",
      content: "Tratamento confidencial de dados pessoais de acordo com a Lei de Proteção de Dados Suíça (LPD) e o RGPD. Fotos 'antes/depois' podem ser feitas para controlo de qualidade e seguros. Uso promocional de fotos exige consentimento prévio."
    },
    {
      title: "21. Alterações & Cláusula de Salvaguarda",
      content: "A Kraken pode alterar estas CGC com aviso prévio de 30 dias. A não objeção implica aceitação. Se alguma cláusula for considerada inválida, as restantes continuam vigentes e a cláusula inválida é substituída por uma equivalente ao fim económico."
    },
    {
      title: "22. Legislação Aplicável & Foro Competente",
      content: "Todos os contratos são regidos exclusivamente pelo direito suíço material, excluindo a CISG. O foro exclusivo é em Schaffhausen, Suíça. Salvaguardam-se os foros de consumo obrigatórios."
    }
  ],
  verificationTitle: "Versão das condições",
  lastUpdated: "Versão das condições: kraken-2026-11-24 · Revisão editorial: 25.11.2026",
  companyInfo: 'Kraken Properties and Facilities Management Gomes Mendes | Seewadelstrasse 3, 8203 Schaffhausen, Suíça',
  backHome: 'Regressar à Página de Início'
};

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

const translations: Record<Language, { gdpr: GDPRTranslation; terms: TermsTranslation; hse: HSETranslation; careers: CareersTranslation }> = {
  'en': { gdpr: enGDPR, terms: enTerms, hse: enHSE, careers: enCareers },
  'de': { gdpr: deGDPR, terms: deTerms, hse: deHSE, careers: deCareers },
  'de-CH': { gdpr: deGDPR, terms: deTerms, hse: deHSE, careers: deCareers },
  'es': { gdpr: esGDPR, terms: esTerms, hse: esHSE, careers: esCareers },
  'fr': { gdpr: frGDPR, terms: frTerms, hse: frHSE, careers: frCareers },
  'it': { gdpr: itGDPR, terms: itTerms, hse: itHSE, careers: itCareers },
  'pt': { gdpr: ptGDPR, terms: ptTerms, hse: ptHSE, careers: ptCareers },
};

export function getGDPRTranslation(lang: Language): GDPRTranslation {
  return (translations[lang] || translations['en']).gdpr;
}

export function getTermsTranslation(lang: Language): TermsTranslation {
  return (translations[lang] || translations['en']).terms;
}

export function getHSETranslation(lang: Language): HSETranslation {
  return (translations[lang] || translations['en']).hse;
}

export function getCareersTranslation(lang: Language): CareersTranslation {
  return (translations[lang] || translations['en']).careers;
}
