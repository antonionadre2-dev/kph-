import { normalizeHomeLanguage } from '../../components/home/homeTranslations.ts';

// Kept independent from full articles so global page metadata stays lightweight.
const REGIONAL_METADATA = {
  "de": {
    "/reinigung/region-zuerich": {
      "title": "Reinigung Zürich & kleine Umzüge | Kraken PFM",
      "description": "Fenster, Wohnungsreinigung und kleine Umzüge in Zürich. Persönlich abgestimmt, ohne MwSt. auf der Rechnung. Leistung wählen und Preis im Rechner ansehen.",
      "h1": "Reinigung und kleine Umzüge in Zürich. Gut geplant, persönlich begleitet."
    },
    "/reinigung/kanton-schaffhausen": {
      "title": "Reinigungsfirma Schaffhausen | Kraken PFM",
      "description": "Kraken aus Schaffhausen: Reinigung für Privathaushalte, Fenster und kleine Umzüge. Persönlicher Kontakt, keine MwSt. Auftrag im Rechner zusammenstellen.",
      "h1": "Ihre Reinigungsfirma in Schaffhausen. Für die Aufgaben, die Sie Zeit kosten."
    },
    "/reinigung/region-winterthur": {
      "title": "Reinigung Winterthur für Ihr Zuhause | Kraken PFM",
      "description": "Regelmässige Reinigung, Grundreinigung, Fenster und kleine Umzüge in Winterthur. Wählen Sie passende Hilfe für Ihr Zuhause und berechnen Sie Ihren Auftrag.",
      "h1": "Reinigung in Winterthur, die zu Ihrem Alltag passt."
    }
  },
  "en": {
    "/reinigung/region-zuerich": {
      "title": "Cleaning and small moves in Zurich | Kraken PFM",
      "description": "Windows, home cleaning and small moves in Zurich. Personally arranged, with no VAT on your invoice. Choose your service and see the price in our calculator.",
      "h1": "Cleaning and small moves in Zurich. Well planned, with personal support."
    },
    "/reinigung/kanton-schaffhausen": {
      "title": "Cleaning company in Schaffhausen | Kraken PFM",
      "description": "Kraken in Schaffhausen: home cleaning, windows and small moves. Personal contact, with no VAT charged. Put together your job in our calculator.",
      "h1": "Your cleaning company in Schaffhausen. For the tasks that take up your time."
    },
    "/reinigung/region-winterthur": {
      "title": "Home cleaning in Winterthur | Kraken PFM",
      "description": "Regular cleaning, deep cleaning, windows and small moves in Winterthur. Choose the right help for your home and calculate your job.",
      "h1": "Cleaning in Winterthur that fits your everyday life."
    }
  },
  "es": {
    "/reinigung/region-zuerich": {
      "title": "Limpieza y pequeñas mudanzas en Zúrich | Kraken PFM",
      "description": "Ventanas, limpieza del hogar y pequeñas mudanzas en Zúrich. Atención personal, sin IVA en la factura. Elija el servicio y consulte el precio en el calculador.",
      "h1": "Limpieza y pequeñas mudanzas en Zúrich. Bien planificadas, con atención personal."
    },
    "/reinigung/kanton-schaffhausen": {
      "title": "Empresa de limpieza en Schaffhausen | Kraken PFM",
      "description": "Kraken, con sede en Schaffhausen: limpieza del hogar, ventanas y pequeñas mudanzas. Contacto personal y sin IVA. Configure su encargo en el calculador.",
      "h1": "Su empresa de limpieza en Schaffhausen. Para las tareas que le quitan tiempo."
    },
    "/reinigung/region-winterthur": {
      "title": "Limpieza para su hogar en Winterthur | Kraken PFM",
      "description": "Limpieza periódica, a fondo, de ventanas y pequeñas mudanzas en Winterthur. Elija la ayuda adecuada para su hogar y calcule su encargo.",
      "h1": "Limpieza en Winterthur que se adapta a su día a día."
    }
  },
  "pt": {
    "/reinigung/region-zuerich": {
      "title": "Limpeza em Zurique e pequenas mudanças | Kraken PFM",
      "description": "Janelas, limpeza doméstica e pequenas mudanças em Zurique. Acordos pessoais, sem IVA na fatura. Escolha o serviço e consulte o preço na calculadora.",
      "h1": "Limpeza e pequenas mudanças em Zurique. Bem planeadas, acompanhadas pessoalmente."
    },
    "/reinigung/kanton-schaffhausen": {
      "title": "Empresa de limpeza em Schaffhausen | Kraken PFM",
      "description": "Limpeza pessoal e pequenas mudanças em Schaffhausen. Contacto direto, cinco serviços para casas particulares e sem IVA. Prepare o seu pedido na calculadora.",
      "h1": "Limpeza em Schaffhausen. Contacto pessoal, menos preocupações em casa."
    },
    "/reinigung/region-winterthur": {
      "title": "Limpeza em Winterthur para a sua casa | Kraken PFM",
      "description": "Limpeza regular, profunda, de janelas e de fim de arrendamento ou pequenas mudanças em Winterthur. Para casas particulares, com acordos pessoais e sem IVA.",
      "h1": "Limpeza em Winterthur. Mais espaço para o seu dia a dia."
    }
  },
  "it": {
    "/reinigung/region-zuerich": {
      "title": "Pulizie a Zurigo e piccoli traslochi | Kraken PFM",
      "description": "Finestre, pulizie domestiche e piccoli traslochi a Zurigo. Accordi personali, senza IVA in fattura. Scelga il servizio e consulti il prezzo nel calcolatore.",
      "h1": "Pulizie e piccoli traslochi a Zurigo. Ben pianificati, seguiti personalmente."
    },
    "/reinigung/kanton-schaffhausen": {
      "title": "Impresa di pulizie a Sciaffusa | Kraken PFM",
      "description": "Pulizie personali e piccoli traslochi a Sciaffusa. Contatto diretto, cinque servizi per abitazioni private e senza IVA. Prepari il suo incarico nel calcolatore.",
      "h1": "Pulizie a Sciaffusa. Un contatto personale, meno pensieri a casa."
    },
    "/reinigung/region-winterthur": {
      "title": "Pulizie a Winterthur per la sua casa | Kraken PFM",
      "description": "Pulizie regolari, a fondo, di finestre e di fine locazione o piccoli traslochi a Winterthur. Per abitazioni private, con accordi personali e senza IVA.",
      "h1": "Pulizie a Winterthur. Più spazio per la sua vita quotidiana."
    }
  },
  "fr": {
    "/reinigung/region-zuerich": {
      "title": "Nettoyage à Zurich et petits déménagements | Kraken PFM",
      "description": "Vitres, nettoyage de logements et petits déménagements à Zurich. Organisation personnelle, sans TVA facturée. Choisissez la prestation et consultez le prix dans le calculateur.",
      "h1": "Nettoyage et petits déménagements à Zurich. Bien préparés, avec un accompagnement personnel."
    },
    "/reinigung/kanton-schaffhausen": {
      "title": "Entreprise de nettoyage à Schaffhouse | Kraken PFM",
      "description": "Kraken à Schaffhouse : nettoyage pour les particuliers, vitres et petits déménagements. Contact personnel, sans TVA facturée. Préparez votre prestation dans le calculateur.",
      "h1": "Votre entreprise de nettoyage à Schaffhouse. Pour les tâches qui prennent votre temps."
    },
    "/reinigung/region-winterthur": {
      "title": "Nettoyage à Winterthour pour votre logement | Kraken PFM",
      "description": "Nettoyage régulier ou approfondi, vitres et petits déménagements à Winterthour. Choisissez l’aide adaptée à votre logement et calculez votre prestation.",
      "h1": "Un nettoyage à Winterthour adapté à votre quotidien."
    }
  }
};

export function getRegionalPageMetadata(pathname: string, language: string) {
  const path = pathname.split(/[?#]/)[0].replace(/\/$/, '') || '/';
  const entries: Record<string, { title: string; description: string; h1: string }> = REGIONAL_METADATA[normalizeHomeLanguage(language)];
  return entries[path] || null;
}
