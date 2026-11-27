import React from 'react';
import type { BookingSelection } from '../src/booking/pricing.ts';
import { bookingTermsPresentation, termsPresentationText } from '../src/booking/termsPresentation.ts';

/** Uses the same versioned clauses as the legal document; no financial state is calculated here. */
export default function BookingTermsSummary({ language, selection, booking }: { language: string; selection?: BookingSelection | null; booking?: any }) {
  const summary = bookingTermsPresentation(language, { selection, booking });
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
