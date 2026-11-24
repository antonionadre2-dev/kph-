import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { CheckIcon } from '../icons';
import emailjs from '@emailjs/browser';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { sendLead } from '../leadWebhook';

const SERVICE_ID = 'service_aiv15bc';
const TEMPLATE_ID = 'template_aktj7t9';
const PUBLIC_KEY = 'sH5K84ChHyssJrarm';

interface ContactMessageFormProps {
  onNavigate: (page: string) => void;
  language: string;
}

const kontaktTranslations: Record<string, {
  thankYouTitle: string;
  successDesc: string;
  backToHome: string;
  heroBadge: string;
  heroTitle: string;
  heroDesc: string;
  contactInfoTitle: string;
  contactInfoDesc: string;
  labelAddress: string;
  labelPhone: string;
  labelEmail: string;
  labelHours: string;
  valHoursDays: string;
  valHoursTime: string;
  locationTitle: string;
  locationDesc: string;
  formTitle: string;
  labelName: string;
  placeholderName: string;
  labelEmailForm: string;
  placeholderEmail: string;
  labelSubject: string;
  placeholderSubject: string;
  labelMessage: string;
  placeholderMessage: string;
  btnSending: string;
  btnSend: string;
  validationRequiredError: string;
  sendFailedError: string;
  defaultInterest: string;
}> = {
  de: {
    thankYouTitle: "Vielen Dank!",
    successDesc: "Ihre Nachricht wurde erfolgreich gesendet. Unser Team wird sich so schnell wie möglich bei Ihnen melden.",
    backToHome: "Zur Startseite",
    heroBadge: "KONTAKTIEREN SIE UNS",
    heroTitle: "Kontakt",
    heroDesc: "Haben Sie Fragen zu unseren Dienstleistungen oder möchten Sie ein individuelles Angebot erhalten? Wir sind gerne für Sie da.",
    contactInfoTitle: "Kontaktinformationen",
    contactInfoDesc: "Besuchen Sie uns, rufen Sie uns an oder schreiben Sie uns eine E-Mail. Wir freuen uns auf Sie.",
    labelAddress: "Adresse",
    labelPhone: "Telefon",
    labelEmail: "E-Mail",
    labelHours: "Öffnungszeiten",
    valHoursDays: "Montag – Freitag",
    valHoursTime: "08:00 – 18:00 Uhr",
    locationTitle: "Kraken Properties & Facilities Management",
    locationDesc: "Wir bedienen Privat- und Geschäftskunden in den Regionen Schaffhausen, Zürich, Winterthur und Umgebung mit erstklassigen Reinigungs- und Facility-Services.",
    formTitle: "Senden Sie uns eine Nachricht",
    labelName: "Name",
    placeholderName: "Ihr Name",
    labelEmailForm: "E-Mail-Adresse",
    placeholderEmail: "ihre.email@beispiel.ch",
    labelSubject: "Betreff",
    placeholderSubject: "Worum geht es?",
    labelMessage: "Ihre Nachricht",
    placeholderMessage: "Wie können wir Ihnen helfen?",
    btnSending: "Wird gesendet...",
    btnSend: "Nachricht senden",
    validationRequiredError: "Bitte füllen Sie alle erforderlichen Felder aus.",
    sendFailedError: "Senden fehlgeschlagen. Bitte kontaktieren Sie uns direkt unter kai@krakenpfm.ch.",
    defaultInterest: "Allgemeine Kontaktanfrage"
  },
  en: {
    thankYouTitle: "Thank You!",
    successDesc: "Your message has been sent successfully. Our team will get back to you as soon as possible.",
    backToHome: "Back to Home",
    heroBadge: "CONTACT US",
    heroTitle: "Contact",
    heroDesc: "Do you have questions about our services or would you like to receive a tailored quote? We are happy to help you.",
    contactInfoTitle: "Contact Information",
    contactInfoDesc: "Visit us, call us or send us an email. We look forward to hearing from you.",
    labelAddress: "Address",
    labelPhone: "Phone",
    labelEmail: "Email",
    labelHours: "Opening Hours",
    valHoursDays: "Monday – Friday",
    valHoursTime: "08:00 – 18:00",
    locationTitle: "Kraken Properties & Facilities Management",
    locationDesc: "We serve private and commercial clients across Schaffhausen, Zurich, Winterthur and surrounding areas with top-tier cleaning and facility services.",
    formTitle: "Send Us a Message",
    labelName: "Name",
    placeholderName: "Your Name",
    labelEmailForm: "Email Address",
    placeholderEmail: "your.email@example.ch",
    labelSubject: "Subject",
    placeholderSubject: "What is it regarding?",
    labelMessage: "Your Message",
    placeholderMessage: "How can we help you?",
    btnSending: "Sending...",
    btnSend: "Send Message",
    validationRequiredError: "Please fill out all required fields.",
    sendFailedError: "Submission failed. Please contact us directly at kai@krakenpfm.ch.",
    defaultInterest: "General Contact Inquiry"
  },
  es: {
    thankYouTitle: "¡Muchas Gracias!",
    successDesc: "Su mensaje ha sido enviado con éxito. Nuestro equipo se pondrá en contacto con usted lo antes posible.",
    backToHome: "Volver al Inicio",
    heroBadge: "CONTÁCTENOS",
    heroTitle: "Contacto",
    heroDesc: "¿Tiene preguntas sobre nuestros servicios o desea recibir un presupuesto personalizado? Con gusto le atenderemos.",
    contactInfoTitle: "Información de Contacto",
    contactInfoDesc: "Visítenos, llámenos o envíenos un correo electrónico. Estaremos encantados de atenderle.",
    labelAddress: "Dirección",
    labelPhone: "Teléfono",
    labelEmail: "E-Mail",
    labelHours: "Horario de Atención",
    valHoursDays: "Lunes – Viernes",
    valHoursTime: "08:00 – 18:00 hrs",
    locationTitle: "Kraken Properties & Facilities Management",
    locationDesc: "Atendemos a clientes particulares y comerciales en las regiones de Schaffhausen, Zúrich, Winterthur y alrededores con servicios de limpieza y gestión de instalaciones de primera calidad.",
    formTitle: "Envíenos un Mensaje",
    labelName: "Nombre",
    placeholderName: "Su Nombre",
    labelEmailForm: "Correo Electrónico",
    placeholderEmail: "su.correo@ejemplo.ch",
    labelSubject: "Asunto",
    placeholderSubject: "¿De qué se trata?",
    labelMessage: "Su Mensaje",
    placeholderMessage: "¿Cómo podemos ayudarle?",
    btnSending: "Enviando...",
    btnSend: "Enviar Mensaje",
    validationRequiredError: "Por favor, complete todos los campos obligatorios.",
    sendFailedError: "Error al enviar. Por favor contáctenos directamente en kai@krakenpfm.ch.",
    defaultInterest: "Consulta General de Contacto"
  },
  fr: {
    thankYouTitle: "Merci Beaucoup !",
    successDesc: "Votre message a été envoyé avec succès. Notre équipe vous contactera dans les plus brefs délais.",
    backToHome: "Retour à l'Accueil",
    heroBadge: "CONTACTEZ-NOUS",
    heroTitle: "Contact",
    heroDesc: "Vous avez des questions sur nos services ou vous souhaitez recevoir un devis personnalisé ? Nous sommes à votre disposition.",
    contactInfoTitle: "Coordonnées de Contact",
    contactInfoDesc: "Rendez-nous visite, appelez-nous ou envoyez-nous un e-mail. Au plaisir d'échanger avec vous.",
    labelAddress: "Adresse",
    labelPhone: "Téléphone",
    labelEmail: "E-mail",
    labelHours: "Heures d'ouverture",
    valHoursDays: "Lundi – Vendredi",
    valHoursTime: "08:00 – 18:00",
    locationTitle: "Kraken Properties & Facilities Management",
    locationDesc: "Nous servons les clients privés et professionnels dans les régions de Schaffhouse, Zurich, Winterthour et environs avec des services de nettoyage et de facility management haut de gamme.",
    formTitle: "Envoyez-nous un Message",
    labelName: "Nom",
    placeholderName: "Votre Nom",
    labelEmailForm: "Adresse E-mail",
    placeholderEmail: "votre.email@exemple.ch",
    labelSubject: "Sujet",
    placeholderSubject: "De quoi s'agit-il ?",
    labelMessage: "Votre Message",
    placeholderMessage: "Comment pouvons-nous vous aider ?",
    btnSending: "Envoi en cours...",
    btnSend: "Envoyer le Message",
    validationRequiredError: "Veuillez remplir tous les champs obligatoires.",
    sendFailedError: "Échec de l'envoi. Veuillez nous contacter directement à kai@krakenpfm.ch.",
    defaultInterest: "Demande de contact générale"
  },
  it: {
    thankYouTitle: "Grazie Mille!",
    successDesc: "Il tuo messaggio è stato inviato con successo. Il nostro team ti contatterà al più presto.",
    backToHome: "Torna alla Home",
    heroBadge: "CONTATTACI",
    heroTitle: "Contatti",
    heroDesc: "Hai domande sui nostri servizi o desideri ricevere un preventivo personalizzato? Siamo a tua completa disposizione.",
    contactInfoTitle: "Informazioni di Contatto",
    contactInfoDesc: "Vienici a trovare, chiamaci o inviaci un'e-mail. Saremo lieti di risponderti.",
    labelAddress: "Indirizzo",
    labelPhone: "Telefono",
    labelEmail: "E-mail",
    labelHours: "Orari di Apertura",
    valHoursDays: "Lunedì – Venerdì",
    valHoursTime: "08:00 – 18:00",
    locationTitle: "Kraken Properties & Facilities Management",
    locationDesc: "Serviamo clienti privati e commerciali nelle regioni di Sciaffusa, Zurigo, Winterthur e dintorni con servizi di pulizia e gestione strutture di prim'ordine.",
    formTitle: "Inviaci un Messaggio",
    labelName: "Nome",
    placeholderName: "Il tuo Nome",
    labelEmailForm: "Indirizzo E-mail",
    placeholderEmail: "tua.email@esempio.ch",
    labelSubject: "Oggetto",
    placeholderSubject: "Di cosa si tratta?",
    labelMessage: "Il tuo Messaggio",
    placeholderMessage: "Come possiamo aiutarti?",
    btnSending: "Invio in corso...",
    btnSend: "Invia Messaggio",
    validationRequiredError: "Si prega di compilare tutti i campi obbligatori.",
    sendFailedError: "Invio fallito. Contattaci direttamente a kai@krakenpfm.ch.",
    defaultInterest: "Richiesta di contatto generale"
  },
  pt: {
    thankYouTitle: "Muito Obrigado!",
    successDesc: "A sua mensagem foi enviada com sucesso. A nossa equipa entrará em contacto consigo o mais brevemente possível.",
    backToHome: "Voltar ao Início",
    heroBadge: "CONTACTE-NOS",
    heroTitle: "Contacto",
    heroDesc: "Tem dúvidas sobre os nossos serviços ou pretende receber um orçamento personalizado? Estamos à sua disposição.",
    contactInfoTitle: "Informações de Contacto",
    contactInfoDesc: "Visite-nos, ligue-nos ou envie-nos um e-mail. Teremos todo o gosto em atendê-lo.",
    labelAddress: "Endereço",
    labelPhone: "Telefone",
    labelEmail: "E-mail",
    labelHours: "Horário de Funcionamento",
    valHoursDays: "Segunda-feira – Sexta-feira",
    valHoursTime: "08:00 – 18:00",
    locationTitle: "Kraken Properties & Facilities Management",
    locationDesc: "Servimos clientes particulares e comerciais nas regiões de Schaffhausen, Zurique, Winterthur e arredores com serviços de limpeza e gestão de instalações de excelência.",
    formTitle: "Envie-nos uma Mensagem",
    labelName: "Nome",
    placeholderName: "O seu Nome",
    labelEmailForm: "Endereço de E-mail",
    placeholderEmail: "seu.email@exemplo.ch",
    labelSubject: "Assunto",
    placeholderSubject: "Qual é o assunto?",
    labelMessage: "A sua Mensagem",
    placeholderMessage: "Como podemos ajudá-lo?",
    btnSending: "A enviar...",
    btnSend: "Enviar Mensagem",
    validationRequiredError: "Por favor, preencha todos os campos obrigatórios.",
    sendFailedError: "Falha ao enviar. Por favor contacte-nos directamente através de kai@krakenpfm.ch.",
    defaultInterest: "Consulta Geral de Contacto"
  }
};

const ContactMessageForm: React.FC<ContactMessageFormProps> = ({ onNavigate, language }) => {
  const d = kontaktTranslations[language === 'de-CH' ? 'de' : language] || kontaktTranslations['de'];

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirmation = useRef<HTMLElement>(null);
  useEffect(() => {
    if (isSubmitted) {
      confirmation.current?.focus({ preventScroll: true });
      confirmation.current?.scrollIntoView({ block: 'nearest' });
    }
  }, [isSubmitted]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      setError(d.validationRequiredError);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Save contact message to Firestore (non-blocking if it fails)
      try {
        await addDoc(collection(db, 'contact_messages'), {
          name: formData.name,
          email: formData.email,
          subject: formData.subject || '',
          message: formData.message,
          language: language || 'de',
          status: 'new',
          createdAt: serverTimestamp()
        });
      } catch (fsErr) {
        console.warn('Firestore contact_messages save failed:', fsErr);
      }

      // 2. Send lead to Make Webhook
      const webhookPromise = sendLead({
        ...formData,
        source: 'CONTACT_FORM'
      });

      // 3. Send notification via EmailJS
      const emailPromise = emailjs.send(
        SERVICE_ID,
        TEMPLATE_ID,
        {
          from_name: formData.name,
          from_email: formData.email,
          phone_number: 'N/A',
          services_interest: formData.subject || d.defaultInterest,
          message: formData.message,
          property_address: 'N/A'
        },
        PUBLIC_KEY
      );

      await Promise.all([webhookPromise, emailPromise]);
      setIsSubmitted(true);
    } catch (err) {
      console.error('Submission failed', err);
      setError(d.sendFailedError);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <section ref={confirmation} tabIndex={-1} role="status" className="contact-message-section bg-slate-50 py-12 px-6 flex items-center justify-center">
        <div className="max-w-xl w-full bg-white p-10 md:p-14 rounded-[2.5rem] shadow-xl text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <CheckIcon className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-3xl font-black text-[#002D5B] mb-4 uppercase tracking-tight">{d.thankYouTitle}</h2>
          <p className="text-gray-600 font-medium mb-8">
            {d.successDesc}
          </p>
          <button
            onClick={() => onNavigate('home')}
            className="bg-[#002D5B] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#00254A] transition-all cursor-pointer shadow-lg"
          >
            {d.backToHome}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="contact-message-section" aria-labelledby="contact-message-title">
              <div className="bg-white p-8 md:p-12 rounded-[2rem] shadow-sm border border-slate-100">
                <h2 id="contact-message-title" className="text-2xl font-extrabold text-[#002D5B] tracking-tight mb-8">
                  {d.formTitle}
                </h2>

                {error && (
                  <div role="alert" className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm font-semibold rounded-2xl">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Name */}
                    <div className="space-y-2">
                      <label htmlFor="contact-name" className="block text-xs font-black uppercase text-slate-400 tracking-wider">
                        {d.labelName} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="contact-name"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder={d.placeholderName}
                        className="w-full px-5 py-4 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-800 font-medium placeholder-slate-400"
                      />
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                      <label htmlFor="contact-email" className="block text-xs font-black uppercase text-slate-400 tracking-wider">
                        {d.labelEmailForm} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        id="contact-email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder={d.placeholderEmail}
                        className="w-full px-5 py-4 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-800 font-medium placeholder-slate-400"
                      />
                    </div>
                  </div>

                  {/* Subject */}
                  <div className="space-y-2">
                    <label htmlFor="contact-subject" className="block text-xs font-black uppercase text-slate-400 tracking-wider">
                      {d.labelSubject}
                    </label>
                    <input
                      type="text"
                      id="contact-subject"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      placeholder={d.placeholderSubject}
                      className="w-full px-5 py-4 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-800 font-medium placeholder-slate-400"
                    />
                  </div>

                  {/* Message */}
                  <div className="space-y-2">
                    <label htmlFor="contact-message" className="block text-xs font-black uppercase text-slate-400 tracking-wider">
                      {d.labelMessage} <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="contact-message"
                      required
                      rows={6}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder={d.placeholderMessage}
                      className="w-full px-5 py-4 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-800 font-medium placeholder-slate-400 resize-none"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-[#002D5B] text-white py-4 rounded-xl font-bold hover:bg-[#00254A] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        {d.btnSending}
                      </>
                    ) : (
                      d.btnSend
                    )}
                  </button>
                </form>
              </div>
    </section>
  );
};

export default ContactMessageForm;
