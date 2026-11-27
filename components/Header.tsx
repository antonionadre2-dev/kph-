import React, { useState } from 'react';
import { useTranslation } from '../i18n';
import { useAuth } from './Auth';
import ApprovedHeader from './home/ApprovedHeader';
import { homeText } from './home/homeTranslations';
import { publicHref } from '../src/routing/site-paths';

interface HeaderProps {
  onNavigate: (page: string) => void;
  currentPage: string;
}

/** Private and legal routes share the public identity and keep their existing account access. */
export default function Header({ onNavigate, currentPage }: HeaderProps) {
  const { language } = useTranslation();
  const { user, logout } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState(false);
  const t = (source: string) => homeText(language, source);
  const href = (path: string) => publicHref(path, language);
  const page = currentPage === 'terms' ? 'legal' : currentPage === 'home' ? 'home' : currentPage === 'about' ? 'about'
    : currentPage === 'services-page' ? 'services' : currentPage === 'consultation' ? 'calculator' : 'local';
  const accountControls = user ? <>
    <a href={href('/dashboard')}>{t('Mein Konto')}</a>
    <button className="header-account-action" type="button" disabled={signingOut} onClick={async () => {
      setSigningOut(true);
      setLogoutError(false);
      try { await logout(); onNavigate(href('/')); }
      catch { setLogoutError(true); }
      finally { setSigningOut(false); }
    }}>{t('Abmelden')}</button>
  </> : <a href={href('/login')}>{t('Anmelden')}</a>;
  return <div className="kraken-home kraken-shared-header" lang={language}>
    <ApprovedHeader onNavigate={onNavigate} page={page} accountControls={accountControls} />
    {logoutError && <p className="header-account-error" role="alert">{t('Abmelden nicht möglich. Bitte versuchen Sie es erneut.')}</p>}
  </div>;
}
