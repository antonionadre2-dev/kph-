import React, { useEffect, useRef } from 'react';
import { useTranslation } from '../../i18n';
import ApprovedHeader from './ApprovedHeader';
import TransitSection from './TransitSection';
import { initTransit } from './van';
import { homeText, normalizeHomeLanguage } from './homeTranslations';
import { publicHref } from '../../src/routing/site-paths';
import { getMovingPageCopy } from '../../src/home/moving-copy';
import './approved-home.css';
import './responsive-fixes.css';
import './home-language.css';
import './device-fixes.css';
import './moving-page.css';

/** The existing Transit experience has its own route and lifecycle. */
export default function MovingServicesPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { language } = useTranslation();
  const locale = normalizeHomeLanguage(language);
  const copy = getMovingPageCopy(locale);
  const root = useRef<HTMLDivElement>(null);
  const currentLanguage = useRef(locale);
  currentLanguage.current = locale;
  const t = (source: string, params?: Record<string, string | number>) => homeText(locale, source, params);
  const quoteHref = publicHref('/quote?service=moving', locale);
  useEffect(() => root.current ? initTransit(root.current, (source: string, params?: Record<string, string | number>) => homeText(currentLanguage.current, source, params)) : undefined, []);
  useEffect(() => { root.current?.dispatchEvent(new CustomEvent('kraken:languagechange')); }, [locale]);
  return <div className="kraken-home kr-moving-page" lang={locale} ref={root}>
    <ApprovedHeader onNavigate={onNavigate} page="moving" />
    <main id="main">
      <section className="section container kr-moving-intro" aria-labelledby="moving-page-title">
        <p className="eyebrow">{t('Kleine Umzüge')}</p>
        <h1 id="moving-page-title">{copy.h1}</h1>
        <p>{copy.intro}</p>
        <a className="button button-navy kr-button kr-button--primary" href={quoteHref}>{t('Umzug berechnen')}</a>
      </section>
      <svg className="icon-definitions" aria-hidden="true"><defs>
        <symbol id="i-truck" viewBox="0 0 24 24"><path d="M3 17H2V4h13v13H8M15 8h4l3 5v4h-2M15 17h1M15 13h7" /><circle cx="6" cy="17" r="2" /><circle cx="18" cy="17" r="2" /></symbol>
        <symbol id="i-box" viewBox="0 0 24 24"><path d="m12 2 10 5v10l-10 5-10-5V7L12 2ZM2 7l10 5 10-5M12 12v10M7 4.5l10 5" /></symbol>
      </defs></svg>
      <TransitSection t={t} quoteHref={quoteHref} />
    </main>
  </div>;
}
