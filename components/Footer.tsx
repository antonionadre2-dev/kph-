import React from 'react';
import { useTranslation } from '../i18n';
import { normalizeSiteLanguage } from '../src/locale';
import { footerInformationHref, serviceInformationLinks } from '../src/home/serviceInformation';
import { homeText, normalizeHomeLanguage } from './home/homeTranslations';
import { servicesText } from './services/servicesTranslations';
import { footerText } from './home/footerTranslations';
import { siteConfig } from './home/site-config';
import { responsiveImage } from '../src/media/images';
import BrandIdentity from './BrandIdentity';
import { getBrandTranslation } from '../src/i18n/public-translations';
import './home/approved-home.css';
import './home/responsive-fixes.css';
import './home/home-language.css';
import './home/device-fixes.css';
import './home/footer-enhancements.css';
import './home/design-system.css';

interface FooterProps {
  onNavigate: (page: string) => void;
  contactPage?: boolean;
}

// Inline icons keep this footer independent of the homepage's SVG definitions.
function FooterIcon({ name }: { name: 'phone' | 'mail' | 'instagram' | 'linkedin' | 'message' }) {
  const paths = {
    phone: <path d="M21 16.5v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 1.1 3.8 2 2 0 0 1 3.1 1.6h3a2 2 0 0 1 2 1.7 12.8 12.8 0 0 0 .7 2.8 2 2 0 0 1-.5 2.1L7 9.5a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5 12.8 12.8 0 0 0 2.8.7 2 2 0 0 1 1.8 2.1Z" />,
    mail: <><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m2 6 10 7L22 6" /></>,
    instagram: <><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></>,
    linkedin: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M7 10v7M7 7h.01M11 17v-7h4a3 3 0 0 1 3 3v4M11 13a3 3 0 0 1 3-3" /></>,
    message: <><path d="M21 11.5a8.5 8.5 0 0 1-9 8.5 10 10 0 0 1-4-1l-6 2 2-6a10 10 0 0 1-1-4A8.5 8.5 0 0 1 12 3a8.5 8.5 0 0 1 9 8.5Z" /><path d="M8 11h.01M12 11h.01M16 11h.01" /></>,
  };
  return <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}

/** Shared body also used by server rendering; all destinations work without JavaScript. */
export function FooterContent({ language, contactPage = false }: { language: string; contactPage?: boolean }) {
  const locale = normalizeSiteLanguage(language) || 'de-CH';
  const homeLanguage = normalizeHomeLanguage(locale);
  const t = (source: string) => homeText(homeLanguage, source);
  const ft = (key: Parameters<typeof footerText>[1]) => footerText(locale, key);
  const href = (path: string) => footerInformationHref(path, locale);
  const instagramUrl = siteConfig.instagramUrl as string | null;
  const year = new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: 'Europe/Zurich' }).format(new Date());

  return <div className="kraken-home kraken-site-footer" lang={locale}>
    <footer className="site-footer kraken-footer" id="kontakt">
      <div className="container">
        <div className="footer-invitation"><div><p className="eyebrow">{t('Einfach miteinander sprechen')}</p><h2>{t('Reinigung und kleine Umzüge für Ihr Zuhause')}</h2></div><div><p>{t('Erzählen Sie uns, wobei wir helfen dürfen.')}</p><a className="button button-mint kr-button kr-button--primary" href={href('/quote')}>{t('Offerte berechnen')}</a></div></div>
        <div className="footer-grid">
          <div className="footer-brand"><a className="kr-footer-brand-link" href={href('/')} aria-label={getBrandTranslation(language, 'header.logoAria')}><span className="logo logo-light"><img {...responsiveImage('/home-approved/assets/logo.webp','160px')} alt="Kraken" loading="lazy" /></span><BrandIdentity language={language} /></a><p>{t('Reinigung und kleine Umzüge.')}<br />{t('Für private Haushalte.')}<br />{t('Für ein leichteres Ankommen.')}</p><p className="footer-tax">{t('Es wird keine Mehrwertsteuer verrechnet.')}</p></div>
          <div className="footer-contact"><h3>{t('Hier sind wir zu Hause')}</h3><address>Kraken PFM<br />Seewadelstrasse 3<br />{t('8203 Schaffhausen, Schweiz')}</address><p className="footer-hours">{ft('hours')}<span>{ft('localTime')}</span>{!contactPage && <span>{ft('visits')}</span>}</p><a className="footer-map" href="https://www.google.com/maps/search/?api=1&query=Seewadelstrasse%203%2C%208203%20Schaffhausen%2C%20Schweiz" target="_blank" rel="noopener noreferrer">{t('Adresse auf Google Maps')}</a><a className="footer-contact-link" href="tel:+41774505705"><FooterIcon name="phone" />+41 77 450 57 05</a><a className="footer-contact-link" href="mailto:kai@krakenpfm.ch"><FooterIcon name="mail" />kai@krakenpfm.ch</a></div>
          <div className="footer-services"><h3>{t('So helfen wir Ihnen')}</h3><nav aria-label={t('Leistungen im Footer')}>
            {serviceInformationLinks.map(({service,section,label})=><a key={service} href={href('/leistungen#'+section)}>{t(label)}</a>)}
            <a href={href('/leistungen#baureinigung')}>{servicesText(language,'Baureinigung')}</a>
          </nav></div>
          <div className="footer-regions"><h3>{t('In Ihrer Nähe')}</h3><nav className="footer-region-links" aria-label={ft('regions')}><a href={href('/reinigung/region-zuerich')}>{t('Zürich')}</a><a href={href('/reinigung/kanton-schaffhausen')}>{t('Schaffhausen')}</a><a href={href('/reinigung/region-winterthur')}>{t('Winterthur')}</a></nav><h3 className="footer-social-heading">{t('Bleiben wir in Kontakt')}</h3><div className="social-links">{instagramUrl && <a className="social-instagram" data-instagram="" href={instagramUrl} target="_blank" rel="noopener noreferrer"><FooterIcon name="instagram" />Instagram</a>}<a href="https://www.linkedin.com/company/krakenpfm/" target="_blank" rel="noopener noreferrer"><FooterIcon name="linkedin" />LinkedIn</a><a href="https://wa.me/41774505705" target="_blank" rel="noopener noreferrer"><FooterIcon name="message" />WhatsApp</a></div></div>
        </div>
        <nav className="footer-page-links" aria-label={ft('discover')}><a href={href('/umzugsreinigung/zuerich')}>{t('Umzugsreinigung Zürich')}</a><a href={href('/leistungen')}>{ft('allServices')}</a><a href={href('/about')}>{t('Über Kraken')}</a><a href={href('/kontakt')}>{t('Kontakt')}</a><a href={href('/einsatzgebiete')}>{ft('allAreas')}</a></nav>
        <div className="footer-bottom"><p>© <span>{year}</span> Kraken Properties and Facilities Management Gomes Mendes</p><nav aria-label={t('Rechtliches')}><a href={href('/impressum')} target="_blank" rel="noopener noreferrer">{t('Impressum')}</a><a href={href('/gdpr')} target="_blank" rel="noopener noreferrer">{t('Datenschutz')}</a><a href={href('/terms')} target="_blank" rel="noopener noreferrer">{t('AGB')}</a></nav></div>
        <p className="preview-note">{t('Die Bildwelten sind Illustrationen. Ihren Auftrag planen Sie im Service-Rechner.')}</p>
        <p className="footer-credit">{t('Website made by')}{' '}<a href="https://seociety.ch" target="_blank" rel="noopener noreferrer">seociety.ch</a></p>
      </div>
    </footer>
  </div>;
}

export default function Footer({ contactPage = false }: FooterProps) {
  const { language }=useTranslation();
  return <FooterContent language={language} contactPage={contactPage} />;
}
