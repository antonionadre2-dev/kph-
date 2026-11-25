import "../../src/styles/route-utilities.css";
import React, { useState, useRef, useEffect, type FormEvent } from 'react';
import { useAuth } from '../Auth';
import { useTranslation } from '../../i18n';
import { publicHref } from '../../src/routing/site-paths';
import './account-form.css';

const copy = {
  de: ['Kundenkonto', 'Bei Kraken anmelden', 'Ein Konto für Ihre Anfragen.', 'Erstellen Sie Ihr Kundenkonto', 'Name', 'E-Mail', 'Passwort', 'Anmelden', 'Konto erstellen', 'Ihre Angaben werden nur für Ihr Konto verwendet. Für eine Offerte benötigen Sie kein Konto.', 'Noch kein Konto?', 'Bereits registriert?', 'Bitte prüfen Sie Ihre Angaben. Die Anmeldung war nicht möglich.', 'Das Konto konnte nicht erstellt werden. Bitte prüfen Sie Ihre Angaben oder melden Sie sich an.', 'Mindestens 8 Zeichen', 'Zur Website'],
  en: ['Customer account', 'Sign in to Kraken', 'One account for your requests.', 'Create your customer account', 'Name', 'Email', 'Password', 'Sign in', 'Create account', 'Your details are used for your account. You do not need an account to request a quote.', 'No account yet?', 'Already registered?', 'Please check your details. Sign-in was not successful.', 'The account could not be created. Please check your details or sign in.', 'At least 8 characters', 'Back to the website'],
  es: ['Cuenta de cliente', 'Acceda a Kraken', 'Una cuenta para sus solicitudes.', 'Cree su cuenta de cliente', 'Nombre', 'Correo electrónico', 'Contraseña', 'Acceder', 'Crear cuenta', 'Sus datos se utilizan para su cuenta. No necesita una cuenta para solicitar un presupuesto.', '¿Todavía no tiene cuenta?', '¿Ya tiene cuenta?', 'Revise sus datos. No ha sido posible acceder.', 'No ha sido posible crear la cuenta. Revise sus datos o acceda.', 'Al menos 8 caracteres', 'Volver a la web'],
  fr: ['Compte client', 'Connectez-vous à Kraken', 'Un compte pour vos demandes.', 'Créez votre compte client', 'Nom', 'E-mail', 'Mot de passe', 'Se connecter', 'Créer le compte', 'Vos données servent à votre compte. Aucun compte n’est nécessaire pour demander un devis.', 'Pas encore de compte ?', 'Déjà inscrit ?', 'Veuillez vérifier vos données. La connexion a échoué.', 'Le compte n’a pas pu être créé. Veuillez vérifier vos données ou vous connecter.', 'Au moins 8 caractères', 'Retour au site'],
  it: ['Conto cliente', 'Acceda a Kraken', 'Un conto per le sue richieste.', 'Crei il suo conto cliente', 'Nome', 'E-mail', 'Password', 'Accedere', 'Creare il conto', 'I suoi dati vengono usati per il conto. Per richiedere un preventivo non serve un conto.', 'Non ha ancora un conto?', 'È già registrato?', 'Verifichi i suoi dati. Non è stato possibile accedere.', 'Non è stato possibile creare il conto. Verifichi i suoi dati oppure acceda.', 'Almeno 8 caratteri', 'Tornare al sito'],
  pt: ['Conta de cliente', 'Aceda à Kraken', 'Uma conta para os seus pedidos.', 'Crie a sua conta de cliente', 'Nome', 'Email', 'Palavra-passe', 'Aceder', 'Criar conta', 'Os seus dados são utilizados para a conta. Não precisa de conta para pedir um orçamento.', 'Ainda não tem conta?', 'Já tem conta?', 'Verifique os seus dados. Não foi possível aceder.', 'Não foi possível criar a conta. Verifique os seus dados ou aceda.', 'Pelo menos 8 caracteres', 'Voltar ao site'],
};
export default function AccountForm({ mode, onNavigate }: { mode: 'login' | 'register'; onNavigate: (page: string) => void }) {
  const { language } = useTranslation();
  const { login, register } = useAuth();
  const languageKey = language.split('-')[0] as keyof typeof copy;
  const t = copy[languageKey] || copy.de;
  const signingUp = mode === 'register';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const active = useRef(true);
  const pending = useRef(false);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true; setError(false); setBusy(true);
    try {
      if (signingUp) await register(name.trim(), email.trim(), password);
      else await login(email.trim(), password);
      if (active.current) { setPassword(''); onNavigate('dashboard'); }
    } catch { if (active.current) setError(true); } finally { pending.current = false; if (active.current) setBusy(false); }
  }
  return <main id="main" className="kr-account">
    <section aria-labelledby="account-title" className="kr-account-card">
      <p className="kr-account-eyebrow">{t[0]}</p>
      <h1 id="account-title">{signingUp ? t[3] : t[1]}</h1><p>{t[2]}</p>
      <form onSubmit={submit}>
        {signingUp && <label htmlFor="account-name">{t[4]}<input id="account-name" name="name" autoComplete="name" required maxLength={120} value={name} onChange={e => setName(e.target.value)} /></label>}
        <label htmlFor="account-email">{t[5]}<input id="account-email" name="email" type="email" autoComplete="username" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} /></label>
        <label htmlFor="account-password">{t[6]}<input id="account-password" name="password" type="password" autoComplete={signingUp ? 'new-password' : 'current-password'} minLength={signingUp ? 8 : undefined} maxLength={128} required value={password} onChange={e => setPassword(e.target.value)} />{signingUp && <small>{t[14]}</small>}</label>
        {error && <p role="alert" className="kr-account-error">{signingUp ? t[13] : t[12]}</p>}
        <button className="kr-button kr-button--primary" type="submit" disabled={busy}>{busy ? '…' : signingUp ? t[8] : t[7]}</button>
      </form>
      <p className="kr-account-note">{t[9]}</p>
      <p>{signingUp ? t[11] : t[10]} <a href={publicHref(signingUp ? '/login' : '/register', language)}>{signingUp ? t[7] : t[8]}</a></p>
      <a href={publicHref('/', language)}>{t[15]}</a>
    </section>
  </main>;
}
