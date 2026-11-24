import React from 'react';
import { useTranslation } from '../../i18n';
import ApprovedHeader from '../home/ApprovedHeader';
import CustomerAccessPage from '../CustomerAccessPage';
import '../home/approved-home.css';
import '../home/home-language.css';
import '../home/device-fixes.css';

export default function CustomerAccessRoute({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { language } = useTranslation();
  return <>
    <div className="kraken-home" lang={language}><ApprovedHeader onNavigate={onNavigate} page="calculator" /></div>
    <CustomerAccessPage onNavigate={onNavigate} />
  </>;
}
