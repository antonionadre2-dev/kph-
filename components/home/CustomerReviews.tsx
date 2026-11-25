import React from 'react';
import { customerReviews, verifiedCustomerReviews, type CustomerReview } from './customer-reviews';
import { homeText } from './homeTranslations';

/** No placeholder quotes, ratings or aggregate review schema are generated. */
export default function CustomerReviews({ language, reviews = customerReviews }: { language: string; reviews?: readonly CustomerReview[] }) {
  const verified = verifiedCustomerReviews(reviews);
  if (!verified.length) return null;
  return <section className="kr-customer-reviews" aria-labelledby="customer-reviews-title">
    <h2 id="customer-reviews-title">{homeText(language, 'Kundenbewertungen')}</h2>
    {verified.map(review => <figure key={review.sourceUrl}>
      <blockquote><p>{review.text}</p></blockquote>
      <figcaption>{review.author} · {review.sourceLabel}<br /><a href={review.sourceUrl} target="_blank" rel="noopener noreferrer">{homeText(language, 'Originalbewertung lesen')}</a></figcaption>
    </figure>)}
  </section>;
}
