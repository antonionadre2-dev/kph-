import {routeLanguage} from '../routing/site-paths.ts';

/** Small source-checked slice: keep the full legal document out of the shared SEO bundle. */
const metadata = {
  "de": {
    "title": "Impressum",
    "lead": "Unternehmensangaben und rechtliche Hinweise."
  },
  "en": {
    "title": "Legal notice",
    "lead": "Company details and legal information."
  },
  "es": {
    "title": "Aviso legal",
    "lead": "Datos de la empresa e información legal."
  },
  "fr": {
    "title": "Mentions légales",
    "lead": "Informations sur l’entreprise et mentions légales."
  },
  "it": {
    "title": "Note legali",
    "lead": "Dati dell’impresa e informazioni legali."
  },
  "pt": {
    "title": "Aviso legal",
    "lead": "Dados da empresa e informações legais."
  }
} as const;

export const getImpressumMetadata = (language: unknown) => metadata[routeLanguage(language) || 'de'];
