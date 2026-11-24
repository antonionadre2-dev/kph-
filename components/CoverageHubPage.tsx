import React from 'react';
import { useTranslation } from '../i18n';
import { LocalSeoContent } from './LocalSeoContent';

interface CoverageHubPageProps {
  onNavigate: (page: string) => void;
}

export function CoverageHubPage(_: CoverageHubPageProps) {
  const { language } = useTranslation();
  return <LocalSeoContent language={language} route={{ kind: 'coverage' }} />;
}

export default CoverageHubPage;
