import React from 'react';
import { useTranslation } from '../i18n';
import { LocalSeoContent } from './LocalSeoContent';

interface MunicipalityPageProps {
  municipalitySlug: string;
  onNavigate: (page: string) => void;
}

export function MunicipalityPage({ municipalitySlug }: MunicipalityPageProps) {
  const { language } = useTranslation();
  return <LocalSeoContent language={language} route={{ kind: 'municipality', municipalitySlug }} />;
}
