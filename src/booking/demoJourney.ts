import { calculatePrice, type BookingSelection, type PriceQuote } from './pricing.ts';
import { bookingLanguage } from './uiCopy.ts';
import { FULL_PREPAYMENT_TERMS_VERSION, isMonthlySelection, monthlyBillingPeriod } from './fullPrepayment.ts';

export type DemoPaymentOutcome = 'paid' | 'pending' | 'failed';
export interface DemoCustomer { name:string;email:string;phone:string;address:string;postalCode:string;city:string }
export interface DemoBillingPeriod { start:string;end:string;visits:number }
export interface DemoBooking {
  demo:true; bookingId:string; reference:string; status:string; language:string; termsVersion:string;
  quote:PriceQuote; selection:BookingSelection; quoteRevision:number; canCheckout:boolean; customer:DemoCustomer;
  scheduling:{status:'requested'|'held'|'confirmed';date:string;time:string;timeZone:string};
  payment:{model:'full_prepayment';billingMode:'single'|'monthly';status:string;totalDueCents:number|null;amountPaidCents:number;amountDueNowCents:number;outstandingCents:number;billingPeriod?:ReturnType<typeof monthlyBillingPeriod>};
}

/** Pure visual fixtures. These functions never create a booking or contact a payment provider. */
export function createDemoBooking(selection:BookingSelection,customer:DemoCustomer,date:string,time:string,language:string):DemoBooking {
  const quote=calculatePrice(selection), monthly=isMonthlySelection(selection), total=monthly?null:quote.totalCents;
  return {demo:true,bookingId:'demo-local-booking',reference:'DEMO · KRAKEN',status:'requested',language:bookingLanguage(language),termsVersion:FULL_PREPAYMENT_TERMS_VERSION,selection:{...selection},quote,quoteRevision:1,canCheckout:false,customer:{...customer},
    scheduling:{status:'requested',date,time,timeZone:'Europe/Zurich'},
    payment:{model:'full_prepayment',billingMode:monthly?'monthly':'single',status:'not_started',totalDueCents:total,amountPaidCents:0,amountDueNowCents:0,outstandingCents:total??0}};
}
export function confirmDemoAppointment(booking:DemoBooking,period?:DemoBillingPeriod):DemoBooking {
  // Individual scopes and unconfirmed monthly periods never get an invented payable amount.
  if(booking.quote.totalCents===null || booking.quote.manualReviewReasons.length || booking.scheduling.status!=='requested') return booking;
  let billingPeriod:ReturnType<typeof monthlyBillingPeriod>|undefined;
  if(booking.payment.billingMode==='monthly') {
    try{billingPeriod=monthlyBillingPeriod(period,booking.quote.totalCents,booking.scheduling.date);}catch{return booking;}
  }
  const total=billingPeriod?.totalCents??booking.quote.totalCents;
  return {...booking,status:'confirmed',canCheckout:true,scheduling:{...booking.scheduling,status:'confirmed'},payment:{...booking.payment,status:'awaiting_payment',totalDueCents:total,amountDueNowCents:total,outstandingCents:total,...(billingPeriod?{billingPeriod}:{})}};
}
export function settleDemoPayment(booking:DemoBooking,outcome:DemoPaymentOutcome,language:string):DemoBooking {
  if(!booking.demo || booking.payment.totalDueCents===null || booking.quote.manualReviewReasons.length || booking.scheduling.status!=='confirmed' || !['awaiting_payment','failed','pending'].includes(booking.payment.status)) return booking;
  const paid=outcome==='paid', amount=paid?booking.payment.totalDueCents:0;
  return {...booking,language:bookingLanguage(language),canCheckout:outcome==='failed',payment:{...booking.payment,status:outcome,amountPaidCents:amount,outstandingCents:booking.payment.totalDueCents-amount}};
}
