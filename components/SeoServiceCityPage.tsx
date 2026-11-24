import React from 'react';
import { useTranslation } from '../i18n';
import { LocalSeoContent } from './LocalSeoContent';

interface SeoServiceCityPageProps {
  cityId: string;
  serviceId: string;
  onNavigate: (page: string) => void;
}

export default function SeoServiceCityPage({ cityId, serviceId }: SeoServiceCityPageProps) {
  const { language } = useTranslation();
  return <LocalSeoContent language={language} route={{ kind: 'service', cityId, serviceId }} />;
}
