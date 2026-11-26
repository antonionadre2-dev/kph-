import React, { createContext, useState, useEffect, useContext, type ReactNode } from 'react';
import { LANGUAGE_STORAGE_KEY, LOCALE_LOCATION_EVENT, languageSelectionUrl, normalizeSiteLanguage, resolveSiteLanguage, restoredLanguageUrl } from './src/locale.ts';

import { publicTranslations } from './src/i18n/public-translations.ts';
export type Language = 'en' | 'de-CH' | 'de' | 'fr' | 'it' | 'es' | 'pt';
export const translations: Record<Language, Record<string,string>> = publicTranslations;

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: React.FC<{ children: ReactNode; initialLanguage?: Language }> = ({ children, initialLanguage }) => {
  const readLanguage = (): Language => {
    let saved: string | null = null;
    try { saved = typeof window === 'undefined' ? null : window.localStorage.getItem(LANGUAGE_STORAGE_KEY); }
    catch { /* URL selection remains available when storage is blocked. */ }
    return resolveSiteLanguage({
      pathname: typeof window === 'undefined' ? '' : window.location.pathname,
      search: typeof window === 'undefined' ? '' : window.location.search,
      saved,
      browserLanguage: typeof navigator === 'undefined' ? '' : navigator.language
    });
  };
  const [language, setLanguageState] = useState<Language>(() => initialLanguage || readLanguage());

  const [activeToast, setActiveToast] = useState<{ show: boolean; msg: string; langCode: string } | null>(null);
  const [, updateLegacyCopy] = useState(0);
  useEffect(() => {
    let active = true;
    const loadForPrivatePage = () => {
      const path = window.location.pathname.replace(/^\/(en|es|fr|it|pt)(?=\/|$)/, '');
      if (!/^\/(dashboard|admin|login|register|commercial-quote)(?:\/|$)/.test(path)) return;
      void import('./src/i18n/legacy-translations.ts').then(({ legacyTranslations }) => {
        for (const language of Object.keys(legacyTranslations) as Language[]) {
          // Public wording remains authoritative when a protected tool needs compatibility copy.
          translations[language] = { ...legacyTranslations[language], ...publicTranslations[language] };
        }
        if (active) updateLegacyCopy(version => version + 1);
      });
    };
    loadForPrivatePage();
    window.addEventListener(LOCALE_LOCATION_EVENT, loadForPrivatePage);
    window.addEventListener('popstate', loadForPrivatePage);
    return () => { active = false; window.removeEventListener(LOCALE_LOCATION_EVENT, loadForPrivatePage); window.removeEventListener('popstate', loadForPrivatePage); };
  }, []);


  // Persist before removing an explicit German query: the resulting default URL
  // has no locale prefix, so location listeners must already see this choice.
  useEffect(() => {
    try { if (typeof window !== 'undefined') window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language); }
    catch { /* Language also travels in navigation URLs. */ }
  }, [language]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const restored = restoredLanguageUrl(window.location.href, language);
    if (!restored) return;
    if (language === 'de' || language === 'de-CH') {
      try {
        const saved = normalizeSiteLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY));
        if (saved !== 'de' && saved !== 'de-CH') return;
      } catch { return; /* Retain the explicit query if storage cannot preserve it. */ }
    }
    window.history.replaceState(window.history.state, '', restored);
    window.dispatchEvent(new Event(LOCALE_LOCATION_EVENT));
  }, [language]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const syncLanguage = () => setLanguageState(readLanguage());
    window.addEventListener('popstate', syncLanguage);
    window.addEventListener(LOCALE_LOCATION_EVENT, syncLanguage);
    return () => {
      window.removeEventListener('popstate', syncLanguage);
      window.removeEventListener(LOCALE_LOCATION_EVENT, syncLanguage);
    };
  }, []);

  useEffect(() => {
    if (activeToast && activeToast.show) {
      const timer = setTimeout(() => {
        setActiveToast(prev => prev ? { ...prev, show: false } : null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [activeToast]);

  const langTitles: Record<Language, string> = {
    'en': 'Language Changed',
    'de-CH': 'Sprache angepasst',
    'de': 'Sprache angepasst',
    'fr': 'Langue modifiée',
    'it': 'Lingua modificata',
    'es': 'Idioma cambiado',
    'pt': 'Idioma alterado',
  };

  const setLanguage = (lang: Language) => {
    const selected = normalizeSiteLanguage(lang);
    if (!selected) return;
    lang = selected;
    setLanguageState(selected);
    try {
      if (typeof window !== 'undefined') window.localStorage.setItem(LANGUAGE_STORAGE_KEY, selected);
    } catch { /* Blocked storage must not prevent an explicit language choice. */ }
    if (typeof window !== 'undefined') {
      window.history.replaceState(window.history.state, '', languageSelectionUrl(window.location.href, selected));
    }

    const langNames: Record<Language, string> = {
      'en': 'English',
      'de-CH': 'Schweizerdeutsch',
      'de': 'Deutsch',
      'fr': 'Français',
      'it': 'Italiano',
      'es': 'Español',
      'pt': 'Português',
    };

    const confirmations: Record<Language, string> = {
      'en': 'Content updated to English',
      'de-CH': 'Inhalt auf Schweizerdeutsch aktualisiert',
      'de': 'Inhalt auf Deutsch aktualisiert',
      'fr': 'Contenu mis à jour en français',
      'it': 'Contenuto aggiornato in italiano',
      'es': 'Contenido actualizado a español',
      'pt': 'Conteúdo atualizado para português',
    };

    setActiveToast({
      show: true,
      msg: confirmations[lang] || `Language updated`,
      langCode: langNames[lang] || lang
    });
  };

  // Keep the <html lang> attribute in sync with the active language for SEO & accessibility
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const htmlLangMap: Record<Language, string> = {
        'de-CH': 'de-CH',
        'de': 'de-CH',
        'en': 'en',
        'fr': 'fr',
        'it': 'it',
        'es': 'es',
        'pt': 'pt',
      };
      document.documentElement.lang = htmlLangMap[language] || 'de-CH';
    }
  }, [language]);

  const t = (key: string, params?: Record<string, string | number>): string => {
    const langTranslations = translations[language] || translations['de'];
    let text = langTranslations[key] || translations['de'][key] || key;
    
    if (params) {
      Object.entries(params).forEach(([param, value]) => {
        text = text.replace(`{${param}}`, String(value));
      });
    }
    return text;
  };

  return React.createElement(
    I18nContext.Provider,
    { value: { language, setLanguage, t } },
    children,
    activeToast && activeToast.show ? React.createElement(
      "div",
      {
        key: `${activeToast.langCode}-${activeToast.msg}`,
        id: "language-toast-notification",
        className: "fixed top-24 right-5 sm:right-6 md:right-8 z-[200] max-w-sm w-[calc(100vw-2.5rem)] bg-white/95 backdrop-blur-md border border-gray-100 rounded-2xl shadow-[0_15px_35px_rgba(0,0,0,0.12)] p-4 flex items-center gap-3.5 pointer-events-auto transition-all duration-300 animate-toast-slide",
      },
      React.createElement("div", { className: "w-10 h-10 rounded-full bg-[#002D5B]/5 flex items-center justify-center shrink-0 text-base" }, "🌐"),
      React.createElement(
        "div",
        { className: "flex-1 text-left min-w-0" },
        React.createElement("h4", { className: "text-xs font-black text-[#002D5B] uppercase tracking-widest leading-none mb-1" }, langTitles[language]),
        React.createElement("p", { className: "text-xs text-gray-500 font-medium leading-tight truncate" }, activeToast.msg)
      ),
      React.createElement(
        "button",
        {
          onClick: () => setActiveToast(prev => prev ? { ...prev, show: false } : null),
          className: "text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-50 transition-colors",
        },
        React.createElement(
          "svg",
          { className: "w-4 h-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor" },
          React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2.5, d: "M6 18L18 6M6 6l12 12" })
        )
      )
    ) : null,
    React.createElement("style", null, `
      @keyframes toast-slide {
        0% {
          opacity: 0;
          transform: translateY(-1rem) scale(0.95);
        }
        100% {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      .animate-toast-slide {
        animation: toast-slide 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
    `)
  );
};

export const useTranslation = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  return context;
};
