/** Add only genuine reviews with the original source and the date they were checked. */
export interface CustomerReview {
  author: string;
  text: string;
  sourceLabel: string;
  sourceUrl: string;
  verifiedAt: string;
}

// No verified reviews have been supplied. The public block stays absent until then.
export const customerReviews: readonly CustomerReview[] = [];

export function verifiedCustomerReviews(reviews: readonly CustomerReview[]): CustomerReview[] {
  return reviews.filter(review => {
    try {
      return !!review.author.trim() && !!review.text.trim() && !!review.sourceLabel.trim()
        && Number.isFinite(Date.parse(review.verifiedAt)) && new URL(review.sourceUrl).protocol === 'https:';
    } catch { return false; }
  });
}
