import React from 'react';
import { useTranslation } from '../i18n';
import { LocalSeoContent } from './LocalSeoContent';

interface RegionHubPageProps {
  regionId: 'schaffhausen' | 'winterthur' | 'zuerich';
  onNavigate: (page: string) => void;
}

export function RegionHubPage({ regionId }: RegionHubPageProps) {
  const { language } = useTranslation();
  return <LocalSeoContent language={language} route={{ kind: 'region', regionId }} />;
}
