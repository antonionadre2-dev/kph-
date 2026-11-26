import React from 'react';
import { getBrandTranslation, KRAKEN_COMPANY_DESCRIPTOR } from '../src/i18n/public-translations';
import './brand-identity.css';

/** Shared, server-renderable brand copy; the company name is never translated. */
export default function BrandIdentity({ language }: { language: string }) {
  return <span className="kr-brand-identity">
    <span className="kr-brand-company" translate="no">{KRAKEN_COMPANY_DESCRIPTOR}</span>
    <span className="kr-brand-tagline">{getBrandTranslation(language, 'header.tagline')}</span>
  </span>;
}
