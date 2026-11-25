import React from 'react';
import { motion } from 'motion/react';
import { useTranslation } from '../i18n';
import { 
  Building2, 
  MapPin, 
  Mail, 
  Phone, 
  ArrowLeft, 
  FileText 
} from 'lucide-react';

interface ImpressumPageProps {
  onNavigate: (page: string) => void;
}

const impressumTranslations: Record<string, {
  title: string;
  badge: string;
  subtitle: string;
  companyName: string;
  legalRepresentative: string;
  owner: string;
  commercialRegistry: string;
  registryOffice: string;
  uidNumber: string;
  vatNumber: string;
  vatText: string;
  contactHeader: string;
  email: string;
  phone: string;
  webAddress: string;
  disclaimerTitle: string;
  disclaimerText: string;
  disclaimerLinksTitle: string;
  disclaimerLinksText: string;
  copyrightTitle: string;
  copyrightText: string;
  backHome: string;
  secAddress: string;
  badgeLegal: string;
  legalFormValue: string;
  country: string;
  registryTitle: string;
  registryLookup: string;
  contactIntro: string;
}> = {
  'en': {
    title: "Legal notice",
    badge: "Company information",
    subtitle: "Who operates this website and how to contact Kraken.",
    companyName: 'Company Name',
    legalRepresentative: "Legal form",
    owner: "Owner",
    commercialRegistry: 'Commercial Register',
    registryOffice: "Commercial Register Office of the Canton of Schaffhausen",
    uidNumber: 'Company ID (UID)',
    vatNumber: 'VAT / MWST Status',
    vatText: "No VAT is charged.",
    contactHeader: 'Contact Information',
    email: 'Email',
    phone: 'Phone',
    webAddress: 'Website',
    disclaimerTitle: 'Disclaimer (Liability for Content)',
    disclaimerText: 'The contents of our pages were created with the greatest care. However, we cannot guarantee the correctness, completeness, and topicality of the content. As a service provider, we are responsible for our own content on these pages under general laws.',
    disclaimerLinksTitle: 'Liability for Links',
    disclaimerLinksText: 'Our website may contain links to external third-party websites over whose content we have no influence. Therefore, we cannot assume any liability for these external contents. The respective provider or operator of the pages is always responsible for the content of the linked pages.',
    copyrightTitle: 'Copyright Notice',
    copyrightText: 'The content and works created by the site operators on these pages are subject to Swiss copyright law. Duplication, processing, distribution, and any kind of exploitation outside the limits of copyright law require the written consent of the respective author or creator.',
    backHome: 'Back to Home',
    secAddress: 'Postal Address',
    badgeLegal: "Company details",
    legalFormValue: "Sole proprietorship",
    country: "Switzerland",
    registryTitle: "Registration and VAT",
    registryLookup: "Look up the UID in the official register",
    contactIntro: "Contact us for questions about the business, invoices or this website.",
  },
  'de': {
    title: "Impressum",
    badge: "Unternehmensangaben",
    subtitle: "Wer diese Website betreibt und wie Sie Kraken erreichen.",
    companyName: 'Firmenname',
    legalRepresentative: "Rechtsform",
    owner: "Inhaber",
    commercialRegistry: 'Handelsregister',
    registryOffice: "Handelsregisteramt des Kantons Schaffhausen",
    uidNumber: 'Unternehmens-Identifikationsnummer (UID)',
    vatNumber: 'MWST-Status',
    vatText: "Es wird keine MWST berechnet.",
    contactHeader: 'Kontaktangaben',
    email: 'E-Mail',
    phone: 'Telefon',
    webAddress: 'Webseite',
    disclaimerTitle: 'Haftungsausschluss für Inhalte',
    disclaimerText: 'Die Inhalte unserer Seiten wurden mit grösster Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen. Als Dienstanbieter sind wir für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich.',
    disclaimerLinksTitle: 'Haftungsausschluss für Links',
    disclaimerLinksText: 'Unser Angebot enthält Links zu externen Webseiten Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich.',
    copyrightTitle: 'Urheberrecht',
    copyrightText: 'Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem schweizerischen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung ausserhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.',
    backHome: 'Zurück zur Startseite',
    secAddress: 'Geschäftsadresse',
    badgeLegal: "Unternehmensangaben",
    legalFormValue: "Einzelunternehmen",
    country: "Schweiz",
    registryTitle: "Register und MWST",
    registryLookup: "UID im offiziellen Register nachschlagen",
    contactIntro: "Kontaktieren Sie uns bei Fragen zum Unternehmen, zu Rechnungen oder zu dieser Website.",
  },
  'es': {
    title: "Aviso legal",
    badge: "Información de la empresa",
    subtitle: "Quién opera este sitio web y cómo contactar con Kraken.",
    companyName: 'Razón Social',
    legalRepresentative: "Forma jurídica",
    owner: "Titular",
    commercialRegistry: 'Registro Mercantil',
    registryOffice: "Oficina del Registro Mercantil del cantón de Schaffhausen",
    uidNumber: 'Número de Identificación (UID)',
    vatNumber: 'Estado del IVA (MWST)',
    vatText: "No se cobra IVA.",
    contactHeader: 'Datos de Contacto',
    email: 'Correo electrónico',
    phone: 'Teléfono',
    webAddress: 'Sitio Web',
    disclaimerTitle: 'Responsabilidad por el Contenido',
    disclaimerText: 'Los contenidos de nuestras páginas han sido elaborados con el mayor cuidado. Sin embargo, no podemos garantizar la exactitud, integridad y actualidad de los mismos. Como proveedores de servicios, somos responsables de nuestros propios contenidos en estas páginas de acuerdo con las leyes generales.',
    disclaimerLinksTitle: 'Responsabilidad por Enlaces',
    disclaimerLinksText: 'Nuestro sitio web contiene enlaces a sitios web externos de terceros, sobre cuyos contenidos no tenemos ninguna influencia. Por lo tanto, no podemos asumir ninguna responsabilidad por estos contenidos externos. El respectivo proveedor o administrador de las páginas es siempre el responsable de sus contenidos.',
    copyrightTitle: 'Derechos de Autor',
    copyrightText: 'Los contenidos y obras creados por los administradores del sitio en estas páginas están sujetos a la legislación suiza sobre derechos de autor. La reproducción, procesamiento, distribución y cualquier tipo de explotación fuera de los límites de la ley de derechos de autor requieren el consentimiento por escrito del respectivo autor o creador.',
    backHome: 'Volver al Inicio',
    secAddress: 'Dirección Comercial',
    badgeLegal: "Datos de la empresa",
    legalFormValue: "Empresa unipersonal",
    country: "Suiza",
    registryTitle: "Registro e IVA",
    registryLookup: "Consultar el UID en el registro oficial",
    contactIntro: "Contacte con nosotros si tiene preguntas sobre la empresa, sus facturas o este sitio web.",
  },
  'fr': {
    title: "Mentions légales",
    badge: "Informations sur l’entreprise",
    subtitle: "L’exploitant de ce site et les coordonnées de Kraken.",
    companyName: 'Raison Sociale',
    legalRepresentative: "Forme juridique",
    owner: "Titulaire",
    commercialRegistry: 'Registre du Commerce',
    registryOffice: "Office du registre du commerce du canton de Schaffhouse",
    uidNumber: 'Numéro d’identification (IDE/UID)',
    vatNumber: 'Statut de la TVA',
    vatText: "Aucune TVA n’est facturée.",
    contactHeader: 'Informations de Contact',
    email: 'E-mail',
    phone: 'Téléphone',
    webAddress: 'Site Internet',
    disclaimerTitle: 'Responsabilité relative au contenu',
    disclaimerText: 'Le contenu de nos pages a été rédigé avec le plus grand soin. Toutefois, nous ne pouvons garantir l’exactitude, l’exhaustivité ou l’actualité des informations présentées. En tant que prestataire de services, nous sommes responsables de nos propres informations sur ces pages conformément aux lois générales.',
    disclaimerLinksTitle: 'Responsabilité relative aux liens',
    disclaimerLinksText: 'Notre site Web peut contenir des liens vers des sites Web externes de tiers sur le contenu desquels nous n’avons aucune influence. Par conséquent, nous ne pouvons assumer aucune responsabilité quant à ce contenu externe. Le fournisseur ou l’exploitant respectif des pages est toujours responsable du contenu des pages liées.',
    copyrightTitle: 'Propriété Intellectuelle',
    copyrightText: 'Le contenu et les œuvres créés par les exploitants du site sur ces pages sont soumis au droit d’auteur suisse. La reproduction, le traitement, la diffusion et tout type d’exploitation en dehors des limites du droit d’auteur nécessitent l’accord écrit préalable de l’auteur ou du créateur concerné.',
    backHome: 'Retour à l\'Accueil',
    secAddress: 'Adresse Commerciale',
    badgeLegal: "Coordonnées de l’entreprise",
    legalFormValue: "Entreprise individuelle",
    country: "Suisse",
    registryTitle: "Registre et TVA",
    registryLookup: "Consulter l’IDE dans le registre officiel",
    contactIntro: "Contactez-nous pour toute question sur l’entreprise, les factures ou ce site.",
  },
  'it': {
    title: "Note legali",
    badge: "Informazioni sull’impresa",
    subtitle: "Chi gestisce questo sito e come contattare Kraken.",
    companyName: 'Ragione Sociale',
    legalRepresentative: "Forma giuridica",
    owner: "Titolare",
    commercialRegistry: 'Registro di Commercio',
    registryOffice: "Ufficio del registro di commercio del Canton Sciaffusa",
    uidNumber: 'Numero di Identificazione (UID)',
    vatNumber: 'Stato IVA',
    vatText: "Non viene addebitata l’IVA.",
    contactHeader: 'Informazioni di Contatto',
    email: 'E-mail',
    phone: 'Telefono',
    webAddress: 'Sito Web',
    disclaimerTitle: 'Esclusione di responsabilità per i contenuti',
    disclaimerText: 'I contenuti delle nostre pagine sono stati creati con la massima cura. Tuttavia, non possiamo garantire l’esattezza, la completezza e l’attualità dei contenuti. In qualità di fornitore di servizi, siamo responsabili dei nostri contenuti su queste pagine ai sensi delle leggi generali.',
    disclaimerLinksTitle: 'Esclusione di responsabilità per i link',
    disclaimerLinksText: 'Il nostro sito contiene link a siti web esterni di terzi, sui cui contenuti non abbiamo alcuna influenza. Pertanto, non possiamo assumerci alcuna responsabilità per questi contenuti esterni. Il rispettivo fornitore o gestore delle pagine è sempre responsabile del contenuto delle pagine collegate.',
    copyrightTitle: 'Diritti d’Autore',
    copyrightText: 'I contenuti e le opere realizzate dai gestori del sito su queste pagine sono soggetti alla legge svizzera sul diritto d’autore. La riproduzione, l’elaborazione, la distribuzione e qualsiasi tipo di sfruttamento al di fuori dei limiti del diritto d’autore richiedono il consenso scritto dell’autore o del creatore.',
    backHome: 'Torna alla Home',
    secAddress: 'Indirizzo Commerciale',
    badgeLegal: "Dati dell’impresa",
    legalFormValue: "Ditta individuale",
    country: "Svizzera",
    registryTitle: "Registro e IVA",
    registryLookup: "Consultare l’IDI nel registro ufficiale",
    contactIntro: "Ci contatti per domande sull’impresa, sulle fatture o su questo sito.",
  },
  'pt': {
    title: "Aviso legal",
    badge: "Informações da empresa",
    subtitle: "Quem gere este website e como contactar a Kraken.",
    companyName: 'Razão Social',
    legalRepresentative: "Forma jurídica",
    owner: "Titular",
    commercialRegistry: 'Registo Comercial',
    registryOffice: "Conservatória do registo comercial do cantão de Schaffhausen",
    uidNumber: 'Número de Identificação (UID)',
    vatNumber: 'Estado do IVA',
    vatText: "Não é cobrado IVA.",
    contactHeader: 'Informações de Contactos',
    email: 'E-mail',
    phone: 'Telefone',
    webAddress: 'Website',
    disclaimerTitle: 'Exoneração de responsabilidade por conteúdos',
    disclaimerText: 'O conteúdo destas páginas foi formulado com o máximo cuidado. Contudo, não garantimos a total exatidão, integridade ou atualização dos dados. Como fornecedores de serviços, somos responsáveis pelo nosso próprio conteúdo sob o abrigo legal geral.',
    disclaimerLinksTitle: 'Responsabilidade por hiperligações',
    disclaimerLinksText: 'O nosso website contém ligações para páginas eletrónicas de terceiros, sobre as quais não possuímos qualquer influência. Assim, o respetivo criador ou gestor associado será o único responsável legal fixado por tais conteúdos terceiros.',
    copyrightTitle: 'Direitos de Autor',
    copyrightText: 'Todo o material gráfico e de autoria textual criados neste website estão sujeitos ao enquadramento protetor do Direito de Autor Suíço. Qualquer forma de reutilização, publicação ou uso comercial carece do consentimento prévio formal escrito do detentor da marca.',
    backHome: 'Regressar ao Início',
    secAddress: 'Endereço Comercial',
    badgeLegal: "Dados da empresa",
    legalFormValue: "Empresa em nome individual",
    country: "Suíça",
    registryTitle: "Registo e IVA",
    registryLookup: "Consultar o UID no registo oficial",
    contactIntro: "Contacte-nos para esclarecer questões sobre a empresa, as faturas ou este website.",
  }
};

const ImpressumPage: React.FC<ImpressumPageProps> = ({ onNavigate }) => {
  const { language } = useTranslation();
  
  // Map internal Swiss German "de-CH" to "de" keys if needed, fallback to "en"
  const resolvedLang = language.startsWith('de') ? 'de' : (impressumTranslations[language] ? language : 'en');
  const tLocal = impressumTranslations[resolvedLang];

  return (
    <main className="bg-slate-50 pt-48 pb-24 min-h-screen">
      <div className="container mx-auto px-6 max-w-4xl">
        
        {/* Navigation Action */}
        <button 
          onClick={() => onNavigate('home')}
          className="inline-flex items-center gap-2 text-xs font-black uppercase text-blue-600 hover:text-blue-500 transition-colors mb-12 group cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          {tLocal.backHome}
        </button>

        {/* Header Section */}
        <div className="text-center mb-16 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50/70 text-blue-700 text-[10px] font-black uppercase tracking-widest mb-6 shadow-sm border border-blue-100/50">
             <FileText className="w-3.5 h-3.5" />
             {tLocal.badge}
          </div>
          <h1 className="text-4xl lg:text-5xl font-black text-[#002D5B] mb-4 uppercase tracking-tighter">
            {tLocal.title}
          </h1>
          <p className="text-base text-gray-500 font-medium max-w-2xl mx-auto leading-relaxed">{tLocal.subtitle}</p>
        </div>

        {/* Legal Grid Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          
          {/* Company Details Card */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-blue-50 p-2.5 rounded-xl text-[#002D5B]">
                  <Building2 className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-black text-[#002D5B] uppercase tracking-tight">{tLocal.badgeLegal}</h2>
              </div>

              <div className="space-y-5">
                <div>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">{tLocal.companyName}</span>
                  <p className="text-sm font-bold text-gray-800 leading-snug">Kraken Properties and Facilities Management Gomes Mendes</p>
                </div>

                <div>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">{tLocal.legalRepresentative}</span>
                  <p className="text-sm font-semibold text-gray-700">{tLocal.legalFormValue}</p>
                </div>

                <div>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">{tLocal.owner}</span>
                  <p className="text-sm font-semibold text-gray-700">Antonio Nadre Gomes Mendes</p>
                </div>

                <div>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">{tLocal.secAddress}</span>
                  <div className="flex items-start gap-2 mt-1">
                    <MapPin className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm font-bold text-gray-800">
                      Seewadelstrasse 3<br />
                      8203 Schaffhausen<br />
                      {tLocal.country}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Registration & Registry Details Card */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-emerald-50 p-2.5 rounded-xl text-emerald-700">
                  <FileText className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-black text-emerald-900 uppercase tracking-tight">{tLocal.registryTitle}</h2>
              </div>

              <div className="space-y-5">
                <div>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">{tLocal.uidNumber}</span>
                  <p className="text-sm font-black text-emerald-700 bg-emerald-50/50 border border-emerald-100 px-3 py-1.5 rounded-xl inline-block font-mono tracking-tight">
                    CHE-435.882.969
                  </p>
                  <a href="https://www.uid.admin.ch/" target="_blank" rel="noopener noreferrer" className="block text-xs text-blue-700 underline underline-offset-4 mt-3">{tLocal.registryLookup}</a>
                </div>

                <div>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">{tLocal.commercialRegistry}</span>
                  <p className="text-sm font-semibold text-gray-700">{tLocal.registryOffice}</p>
                </div>

                <div>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">{tLocal.vatNumber}</span>
                  <p className="text-sm font-semibold text-gray-700">{tLocal.vatText}</p>
                </div>
              </div>
            </div>
            
          </motion.div>

        </div>

        {/* Contact Information Banner */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-gradient-to-r from-[#002D5B] to-[#001A3D] text-white p-8 md:p-10 rounded-[2.5rem] shadow-xl relative overflow-hidden mb-12"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1 border-b md:border-b-0 md:border-r border-white/10 pb-6 md:pb-0 pr-0 md:pr-8 flex flex-col justify-center">
              <h3 className="text-lg font-black uppercase tracking-widest mb-1.5 text-blue-300">{tLocal.contactHeader}</h3>
              <p className="text-xs text-blue-100/70 font-medium">{tLocal.contactIntro}</p>
            </div>
            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
              <a href="mailto:kai@krakenpfm.ch" className="flex items-center gap-4 bg-white/5 hover:bg-white/10 p-4 rounded-2xl border border-white/10 transition-all group">
                <div className="bg-blue-600/50 p-3 rounded-xl group-hover:scale-110 transition-transform">
                  <Mail className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="text-[10px] font-black text-blue-300 uppercase tracking-widest block mb-0.5">{tLocal.email}</span>
                  <span className="text-sm font-bold text-white block truncate">kai@krakenpfm.ch</span>
                </div>
              </a>

              <a href="tel:+41774505705" className="flex items-center gap-4 bg-white/5 hover:bg-white/10 p-4 rounded-2xl border border-white/10 transition-all group">
                <div className="bg-emerald-600/50 p-3 rounded-xl group-hover:scale-110 transition-transform">
                  <Phone className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="text-[10px] font-black text-blue-300 uppercase tracking-widest block mb-0.5">{tLocal.phone}</span>
                  <span className="text-sm font-bold text-white block">+41 77 450 57 05</span>
                </div>
              </a>
            </div>
          </div>
        </motion.div>

        {/* Legal Disclaimers (Liability, External Links, Copyright) */}
        <div className="space-y-8 animate-fade-in-up">
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="text-sm font-black text-[#002D5B] uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="text-lg">⚖️</span>
              {tLocal.disclaimerTitle}
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed font-semibold">{tLocal.disclaimerText}</p>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="text-sm font-black text-[#002D5B] uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="text-lg">🔗</span>
              {tLocal.disclaimerLinksTitle}
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed font-semibold">{tLocal.disclaimerLinksText}</p>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="text-sm font-black text-[#002D5B] uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="text-lg">📝</span>
              {tLocal.copyrightTitle}
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed font-semibold">{tLocal.copyrightText}</p>
          </div>
        </div>

      </div>
    </main>
  );
};

export default ImpressumPage;
