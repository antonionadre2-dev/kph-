import React from 'react';
import { useTranslation } from '../i18n';
import { useAuth } from './Auth';
import { publicHref } from '../src/routing/site-paths';
import './auth/account-form.css';
import './client-area.css';

interface ClientsPageProps { onNavigate?: (page: string) => void }
const copy = {
  de: ['Kundenbereich', 'Ihr Zugang zu Ihren Anfragen.', 'Melden Sie sich an, um Ihren Kundenbereich aufzurufen. Wenn Sie bereits angemeldet sind, können Sie direkt zu Ihrer Übersicht wechseln.', 'Anmelden', 'Meine Übersicht öffnen', 'Für eine Offerte benötigen Sie kein Konto. Wählen Sie Ihre Leistung und berechnen Sie Ihren Auftrag direkt.', 'Offerte berechnen', 'Kraken kontaktieren'],
  en: ['Customer area', 'Access your requests.', 'Sign in to open your customer area. If you are already signed in, you can go directly to your overview.', 'Sign in', 'Open my overview', 'You do not need an account to request a quote. Choose your service and calculate your job directly.', 'Calculate my quote', 'Contact Kraken'],
  es: ['Área de cliente', 'Acceda a sus solicitudes.', 'Inicie sesión para abrir su área de cliente. Si ya ha accedido, puede ir directamente a su resumen.', 'Acceder', 'Abrir mi resumen', 'No necesita una cuenta para solicitar un presupuesto. Elija el servicio y calcule su encargo directamente.', 'Calcular mi presupuesto', 'Contactar con Kraken'],
  pt: ['Área de cliente', 'Aceda aos seus pedidos.', 'Inicie sessão para abrir a sua área de cliente. Se já tem sessão iniciada, pode ir diretamente para o seu resumo.', 'Iniciar sessão', 'Abrir o meu resumo', 'Não precisa de conta para pedir um orçamento. Escolha o serviço e calcule o seu pedido diretamente.', 'Calcular o meu orçamento', 'Contactar a Kraken'],
  it: ['Area clienti', 'Acceda alle sue richieste.', 'Acceda per aprire la sua area clienti. Se ha già effettuato l’accesso, può passare direttamente al riepilogo.', 'Accedere', 'Aprire il mio riepilogo', 'Per richiedere un preventivo non serve un conto. Scelga il servizio e calcoli direttamente il suo incarico.', 'Calcolare il mio preventivo', 'Contattare Kraken'],
  fr: ['Espace client', 'Accédez à vos demandes.', 'Connectez-vous pour ouvrir votre espace client. Si vous êtes déjà connecté, vous pouvez accéder directement à votre récapitulatif.', 'Se connecter', 'Ouvrir mon récapitulatif', 'Aucun compte n’est nécessaire pour demander un devis. Choisissez votre prestation et calculez directement votre demande.', 'Calculer mon devis', 'Contacter Kraken'],
};

/** Retained legacy entry points use the real account/request flow without preview promises. */
const Clients: React.FC<ClientsPageProps> = () => {
  const { language } = useTranslation();
  const { user } = useAuth();
  const text = copy[language.split('-')[0] as keyof typeof copy] || copy.de;
  return <main id="main" className="kr-account kr-client-area">
    <section className="kr-account-card" aria-labelledby="client-area-title">
      <p className="kr-account-eyebrow">Kraken PFM</p>
      <h1 id="client-area-title">{text[0]}</h1>
      <p><strong>{text[1]}</strong></p><p>{text[2]}</p>
      <div className="kr-client-area-actions"><a className="kr-button kr-button--primary" href={publicHref(user ? '/dashboard' : '/login', language)}>{user ? text[4] : text[3]}</a></div>
      <p className="kr-account-note">{text[5]}</p>
      <div className="kr-client-area-links"><a href={publicHref('/offerte', language)}>{text[6]}</a><a href={publicHref('/kontakt', language)}>{text[7]}</a></div>
    </section>
  </main>;
};

/** No verified client-logo endorsements have been supplied. */
export const ClientCarousel: React.FC = () => null;
export default Clients;
