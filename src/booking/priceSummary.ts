export interface PriceSummaryBilling { mode:'monthly'; totalCents?:number|null; visits?:number }
/** A per-visit quote stays unchanged; only a server-confirmed month may become the headline total. */
export function priceSummaryPeriod(quote:{totalCents:number|null}|null,billing?:PriceSummaryBilling) {
  const perVisitCents=quote?.totalCents??null;
  const confirmed=!!billing&&Number.isSafeInteger(billing.totalCents)&&billing.totalCents!>0&&Number.isSafeInteger(billing.visits)&&billing.visits!>0;
  return {scope:billing?(confirmed?'month':'visit'):'single',totalCents:confirmed?billing!.totalCents!:perVisitCents,perVisitCents,visits:confirmed?billing!.visits!:null} as const;
}
