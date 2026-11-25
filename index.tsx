/// <reference types="vite/client" />
import './src/styles/fonts.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import Application from './components/Application';
import { homeHydrationLanguage } from './src/routing/hydration';
import { LANGUAGE_STORAGE_KEY } from './src/locale';

// Suppress and handle benign development WebSocket errors from the Vite HMR client in sandboxed preview environments
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  window.addEventListener('unhandledrejection', (event) => {
    try {
      const reason = event.reason;
      if (reason) {
        const msg = typeof reason === 'string' 
          ? reason 
          : (reason.message || (reason.toString && reason.toString()) || '');
        if (
          /websocket|ws|vite|hmr/i.test(msg) ||
          msg.indexOf('WebSocket closed without opened') !== -1 ||
          msg.indexOf('failed to connect') !== -1
        ) {
          console.warn('Prevented unhandled rejection from development WebSocket:', reason);
          event.preventDefault();
          event.stopPropagation();
        }
      }
    } catch (e) {
      // Resilient
    }
  });

  window.addEventListener('error', (event) => {
    try {
      const msg = event.message || (event.error && event.error.message) || '';
      if (
        /websocket|ws|vite|hmr/i.test(msg) ||
        msg.indexOf('WebSocket closed without opened') !== -1 ||
        msg.indexOf('failed to connect') !== -1
      ) {
        console.warn('Prevented error event from development WebSocket:', msg);
        event.preventDefault();
        event.stopPropagation();
      }
    } catch (e) {
      // Resilient
    }
  }, true);
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

let preferredLanguage:string|null=null;
try{preferredLanguage=window.localStorage.getItem(LANGUAGE_STORAGE_KEY);}catch{/* Explicit URL language still works without storage. */}
const hydrationLanguage=homeHydrationLanguage({
  marked:rootElement.getAttribute('data-kraken-home-ssr'),pathname:window.location.pathname,search:window.location.search,
  saved:preferredLanguage,browserLanguage:navigator.language,ssrLanguage:document.documentElement.lang,
});
const appEl = <Application initialLanguage={hydrationLanguage||undefined} />;

if(hydrationLanguage)ReactDOM.hydrateRoot(rootElement,appEl);
else ReactDOM.createRoot(rootElement).render(appEl);
