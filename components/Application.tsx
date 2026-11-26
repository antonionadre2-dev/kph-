import React from 'react';
import { I18nProvider, type Language } from '../i18n';
import { AuthProvider } from './Auth';
import App from './App';
import DisclosureMotion from './DisclosureMotion';

/** The server and browser share this provider tree so Home can retain its original DOM. */
export default function Application({initialLanguage}:{initialLanguage?:Language}) {
  return <React.StrictMode><I18nProvider initialLanguage={initialLanguage}><AuthProvider><App/><DisclosureMotion/></AuthProvider></I18nProvider></React.StrictMode>;
}
