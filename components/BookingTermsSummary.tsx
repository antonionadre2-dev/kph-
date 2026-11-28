import React from 'react';
import type { BookingSelection, PriceQuote } from '../src/booking/pricing.ts';
import { bookingTermsPresentation, termsPresentationText } from '../src/booking/termsPresentation.ts';

/** Uses the same versioned clauses as the legal document; no financial state is calculated here. */
export default function BookingTermsSummary({ language, selection, booking, quote, compact = false }: { language: string; selection?: BookingSelection | null; booking?: any; quote?: PriceQuote | null; compact?: boolean }) {
  const summary = bookingTermsPresentation(language, { selection, booking, quote });
  if (compact && !summary.legacy) {
    const terms = summary.links.find(link => link.href.includes('/terms'));
    return <section className="kr-calc-review-block kr-booking-terms-summary is-compact" aria-label={summary.title}>
      <h3 className="kr-calc-sr-only">{summary.title}</h3>
      <dl>{summary.rows.map((row, index) => <div key={index}>
        {row.label && <dt><strong>{row.label}</strong></dt>}
        <dd>{row.value}{index === summary.rows.length - 1 && terms && <> <a href={terms.href} target="_blank" rel="noopener noreferrer">{terms.label}</a></>}</dd>
      </div>)}</dl>
    </section>;
  }
  return <section className="kr-calc-review-block kr-booking-terms-summary" aria-label={summary.title}>
    <h3>{summary.title}</h3>
    {summary.state && <p><strong>{summary.state}</strong></p>}
    {summary.notice && <p>{summary.notice}</p>}
    {summary.rows.length > 0 && <dl>{summary.rows.map((row, index) => <div key={index}><dt><strong>{row.label}</strong></dt><dd style={{ margin: '0 0 12px', whiteSpace: 'pre-line' }}>{row.value}</dd></div>)}</dl>}
    {summary.sections.map((section, index) => <div key={index} style={{ marginTop: 14 }}>
      <p><strong>{section.label}</strong></p>
      {section.text.split('\n\n').map((paragraph, paragraphIndex) => <p key={paragraphIndex} style={{ whiteSpace: 'pre-line' }}>{paragraph}</p>)}
      <p><a href={section.href} target="_blank" rel="noopener noreferrer">{termsPresentationText(language, 'clause')} · {section.clause}</a></p>
    </div>)}
    <p>{summary.links.map((link, index) => <React.Fragment key={link.href}>{index > 0 && ' · '}<a href={link.href} target="_blank" rel="noopener noreferrer">{link.label}</a></React.Fragment>)}</p>
  </section>;
}
