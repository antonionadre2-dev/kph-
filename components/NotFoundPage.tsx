import React from 'react';
import { useTranslation } from '../i18n';
import { normalizeHomeLanguage } from './home/homeTranslations';
import { publicHref } from '../src/routing/site-paths';

const copy = {
  de: ['Seite nicht gefunden', 'Die gesuchte Seite existiert nicht oder wurde verschoben. Hier finden Sie unsere aktuellen Leistungen.', 'Offerte berechnen', 'Unsere Leistungen', 'Einsatzgebiete', 'Kontakt', 'Zur Startseite'],
  en: ['Page not found', 'This page does not exist or has moved. Find our current services here.', 'Calculate my quote', 'Our services', 'Service areas', 'Contact', 'Back to the homepage'],
  es: ['Página no encontrada', 'Esta página no existe o se ha trasladado. Aquí encontrará nuestros servicios actuales.', 'Calcular mi presupuesto', 'Nuestros servicios', 'Zonas de servicio', 'Contacto', 'Volver al inicio'],
  pt: ['Página não encontrada', 'Esta página não existe ou foi movida. Aqui encontra os nossos serviços atuais.', 'Calcular o meu orçamento', 'Os nossos serviços', 'Zonas de serviço', 'Contacto', 'Voltar ao início'],
  it: ['Pagina non trovata', 'Questa pagina non esiste o è stata spostata. Qui trova i nostri servizi attuali.', 'Calcolare il preventivo', 'I nostri servizi', 'Zone servite', 'Contatti', 'Tornare alla pagina iniziale'],
  fr: ['Page introuvable', 'Cette page n’existe pas ou a été déplacée. Retrouvez nos prestations actuelles ici.', 'Calculer mon devis', 'Nos prestations', 'Zones desservies', 'Contact', 'Retour à l’accueil'],
};
export default function NotFoundPage() {
  const { language } = useTranslation();
  const t = copy[normalizeHomeLanguage(language)];
  return <main id="main" className="kraken-home" style={{ padding: '160px 24px 80px', maxWidth: 850, margin: 'auto' }}>
    <p className="eyebrow">404 · Kraken PFM</p><h1>{t[0]}</h1><p>{t[1]}</p>
    <p><a className="kr-button kr-button--primary" href={publicHref('/offerte?service=end', language)}>{t[2]}</a></p>
    <nav aria-label={t[0]} style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginTop: 24 }}>
      {['/leistungen', '/einsatzgebiete', '/kontakt', '/'].map((path, index) => <a key={path} href={publicHref(path, language)}>{t[index + 3]}</a>)}
    </nav>
  </main>;
}
