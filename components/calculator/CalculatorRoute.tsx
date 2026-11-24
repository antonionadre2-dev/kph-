import React from 'react';
import { useTranslation } from '../../i18n';
import ApprovedHeader from '../home/ApprovedHeader';
import ServiceCalculatorPage from '../ServiceCalculatorPage';
import '../home/approved-home.css';
import '../home/home-language.css';
import '../home/device-fixes.css';

/** One shared site header; demo is a separate, explicitly labelled route. */
export default function CalculatorRoute({ onNavigate, cart, preview = false }: {
  onNavigate: (path: string) => void; cart?: unknown[]; preview?: boolean;
}) {
  const { language } = useTranslation();
  return <>
    <div className="kraken-home" lang={language}><ApprovedHeader onNavigate={onNavigate} page="calculator" /></div>
    <ServiceCalculatorPage onNavigate={onNavigate} cart={cart} preview={preview} />
  </>;
}
