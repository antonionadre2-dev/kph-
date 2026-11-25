import React from 'react';
import { SITE_IDENTITY } from '../src/seo/site-identity.ts';
import { safeSchemaJson } from '../src/seo/metadata.ts';

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

// 1. Breadcrumb Schema
export const BreadcrumbSchema: React.FC<{ items: BreadcrumbItem[] }> = ({ items }) => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url.startsWith('http') ? item.url : `https://krakenpfm.ch${item.url}`
    }))
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeSchemaJson(schema) }}
    />
  );
};

// 2. FAQ Schema
export const FAQSchema: React.FC<{ faqs: FaqItem[] }> = ({ faqs }) => {
  if (!faqs || faqs.length === 0) return null;

  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeSchemaJson(schema) }}
    />
  );
};

// 3. Local Business Schema
export interface LocalBusinessSchemaProps {
  citiesServed?: string[];
}

export const LocalBusinessSchema: React.FC<LocalBusinessSchemaProps> = ({ citiesServed = [] }) => {
  const baseSchema: any = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${SITE_IDENTITY.origin}/#business`,
    "name": SITE_IDENTITY.shortName,
    "image": SITE_IDENTITY.origin + SITE_IDENTITY.imagePath,
    "telephone": SITE_IDENTITY.telephone,
    "email": SITE_IDENTITY.email,
    "address": {
      "@type": "PostalAddress",
      ...SITE_IDENTITY.address,
    },
    "url": `${SITE_IDENTITY.origin}/`,
    "openingHoursSpecification": [
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday"
        ],
        ...SITE_IDENTITY.openingHours,
      }
    ],
  };

  if (citiesServed && citiesServed.length > 0) {
    baseSchema.areaServed = citiesServed.map(city => ({
      "@type": "City",
      "name": city
    }));
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeSchemaJson(baseSchema) }}
    />
  );
};

// 4. Service Schema
export interface ServiceSchemaProps {
  serviceName: string;
  cityName: string;
  priceFrom?: number;
  description: string;
}

export const ServiceSchema: React.FC<ServiceSchemaProps> = ({
  serviceName,
  cityName,
  description
}) => {
  const schema: any = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": serviceName,
    "description": description,
    "provider": {
      "@id": `${SITE_IDENTITY.origin}/#business`,
    },
    "areaServed": {
      "@type": "City",
      "name": cityName
    }
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeSchemaJson(schema) }}
    />
  );
};
