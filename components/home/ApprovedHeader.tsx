import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from '../../i18n';
import { homeText, normalizeHomeLanguage } from './homeTranslations';
import { HomeLanguageSelector } from './HomeLanguageSelector';
import { publicHref } from '../../src/routing/site-paths';
import { responsiveImage } from '../../src/media/images';
import BrandIdentity from '../BrandIdentity';
import { getBrandTranslation } from '../../src/i18n/public-translations';
import './design-system.css';
import './conversion-home.css';

/** The approved navigation is shared by the home and the services page. */
export default function ApprovedHeader({ servicesPage = false, page, accountControls }: { onNavigate: (path: string) => void; servicesPage?: boolean; page?: 'home' | 'services' | 'about' | 'contact' | 'calculator' | 'local' | 'legal'; accountControls?: React.ReactNode }) {
  const { language } = useTranslation();
  const t = (source: string) => homeText(normalizeHomeLanguage(language), source);
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const currentPage = page || (servicesPage ? 'services' : 'home');
  const href = (path: string) => {
    const [pathname, hash] = path.split('#');
    if (currentPage === 'home' && hash && pathname === '/') return '#' + hash;
    return publicHref(path, language);
  };
  useEffect(() => {
    const media = window.matchMedia('(min-width:1081px)');
    const resize = () => { if (media.matches) setOpen(false); };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) { setOpen(false); toggle.current?.focus(); }
    };
    media.addEventListener('change', resize);
    document.addEventListener('keydown', escape);
    return () => { media.removeEventListener('change', resize); document.removeEventListener('keydown', escape); };
  }, [open]);
  const links = <>
    <a href={href('/leistungen')} aria-current={currentPage === 'services' ? 'page' : undefined}>{t('Leistungen')}</a>
    <a href={href('/#umzug')}>{t('Kleine Umzüge')}</a>
    <a href={href('/about')} aria-current={currentPage === 'about' ? 'page' : undefined}>{t('Über Kraken')}</a>
    <a href={href('/kontakt')} aria-current={currentPage === 'contact' ? 'page' : undefined}>{t('Kontakt')}</a>
    {accountControls}
  </>;
  return <>
    <a className="skip-link" href="#main">{t('Zum Inhalt')}</a>
    <header className={currentPage === 'legal' ? 'site-header kr-terms-header' : 'site-header'}>
      <nav className="header-contact-bar" aria-label={t('Direkter Kontakt')}>
        <div className="header-contact-inner container">
          <a href="tel:+41774505705"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 16.5v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 1.1 3.8 2 2 0 0 1 3.1 1.6h3a2 2 0 0 1 2 1.7 12.8 12.8 0 0 0 .7 2.8 2 2 0 0 1-.5 2.1L7 9.5a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5 12.8 12.8 0 0 0 2.8.7 2 2 0 0 1 1.8 2.1Z" /></svg><span className="sr-only">{t('Anrufen')}{' '}</span><span>+41 77 450 57 05</span></a>
          <a href="https://wa.me/41774505705" target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 11.5a8.5 8.5 0 0 1-9 8.5 10 10 0 0 1-4-1l-6 2 2-6a10 10 0 0 1-1-4A8.5 8.5 0 0 1 12 3a8.5 8.5 0 0 1 9 8.5Z" /><path d="M8 11h.01M12 11h.01M16 11h.01" /></svg><span>WhatsApp</span></a>
          <a className="kr-button kr-button--primary header-quote-action" href={href('/quote?service=end')}>{t('Offerte berechnen')}</a>
        </div>
      </nav>
      <div className="header-inner container">
        <a className="brand-lockup kr-brand-link" href={href('/')} aria-label={getBrandTranslation(language, 'header.logoAria')}>
          <span className="brand-logo"><img {...responsiveImage('/home-approved/assets/logo.webp','160px')} alt="Kraken" /></span>
          {currentPage === 'legal' ? <span className="kr-terms-header-company"><span>Properties &amp; Facilities</span><span>Management</span></span> : <BrandIdentity language={language} />}
        </a>
        <nav className="desktop-nav" aria-label={t('Hauptnavigation')}>{links}</nav>
        <div className="header-actions"><HomeLanguageSelector /><button className="icon-button menu-toggle" id="menuToggle" ref={toggle} type="button"
          aria-label={t(open ? 'Menü schliessen' : 'Menü öffnen')} aria-expanded={open} aria-controls="mobileNav" onClick={() => setOpen(value => !value)}>
          <svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d={open ? 'm6 6 12 12M6 18 18 6' : 'M3 6h18M3 12h18M3 18h18'} /></svg>
        </button></div>
      </div>
      <nav className="mobile-nav" id="mobileNav" aria-label={t('Mobile Navigation')} hidden={!open} onClick={() => setOpen(false)}>{links}</nav>
    </header>
  </>;
}
