export interface GDPRTranslation {
  title: string;
  badge: string;
  subtitle: string;
  introTitle: string;
  introP1: string;
  controllerLink: string;
  browserStorageTitle: string;
  browserStorageText: string;
  collectTitle: string;
  collectP1: string;
  collectItems: string[];
  basisTitle: string;
  basisP1: string;
  basisItems: string[];
  retentionTitle: string;
  retentionInfrastructure: string;
  retentionCollaboration: string;
  retentionDuration: string;
  retentionStorage: string;
  retentionSharing: string;
  retentionTime: string;
  rightsTitle: string;
  rightsP1: string;
  disclaimerTitle: string;
  estimatesTitle: string;
  estimatesP1: string;
  liabilityTitle: string;
  liabilityP1: string;
  ipTitle: string;
  ipP1: string;
  usageTitle: string;
  usageText: string;
  trademarksTitle: string;
  trademarksText: string;
  verificationTitle: string;
  lastUpdate: string;
}

export interface TermsTranslation {
  title: string;
  description: string;
  sections: { title: string; content: string }[];
  verificationTitle: string;
  lastUpdated: string;
  companyInfo: string;
  backHome: string;
}
