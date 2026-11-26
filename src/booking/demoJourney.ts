import { calculatePrice, type BookingSelection, type PriceQuote } from './pricing.ts';
import { bookingLanguage } from './uiCopy.ts';

export type DemoPaymentOutcome = 'paid' | 'pending' | 'failed';
export interface DemoCustomer { name:string;email:string;phone:string;address:string;postalCode:string;city:string }
export interface DemoBooking {
  demo:true; bookingId:string; reference:string; status:string; language:string;
  quote:PriceQuote; quoteRevision:number; canCheckout:boolean; customer:DemoCustomer;
  scheduling:{status:'requested'|'held'|'confirmed';date:string;time:string;timeZone:string};
  payment:{status:string;amountPaidCents:number;amountDueNowCents?:number;remainingBalanceCents?:number;depositPercent:number};
}

/** Pure visual fixtures. These functions never create a booking or contact a payment provider. */
export function createDemoBooking(selection:BookingSelection,customer:DemoCustomer,date:string,time:string,language:string):DemoBooking {
  const quote=calculatePrice(selection);
  const total=quote.totalCents;
  const due=typeof total==='number' ? Math.round(quote.depositBasisCents!*0.15) : undefined;
  return {demo:true,bookingId:'demo-local-booking',reference:'DEMO · KRAKEN',status:'requested',language:bookingLanguage(language),quote,quoteRevision:1,canCheckout:false,customer:{...customer},
    scheduling:{status:'requested',date,time,timeZone:'Europe/Zurich'},
    payment:{status:'not_started',amountPaidCents:0,depositPercent:15,...(typeof due==='number' ? {amountDueNowCents:due,remainingBalanceCents:total!} : {})}};
}
export function confirmDemoAppointment(booking:DemoBooking):DemoBooking {
  // Inspection cases keep their genuine individual-quote state; no fake payable amount.
  if(booking.quote.totalCents===null || booking.quote.manualReviewReasons.length) return booking;
  return {...booking,status:'confirmed',canCheckout:true,scheduling:{...booking.scheduling,status:'held'}};
}
export function settleDemoPayment(booking:DemoBooking,outcome:DemoPaymentOutcome,language:string):DemoBooking {
  if(!booking.demo || booking.quote.totalCents===null || booking.quote.manualReviewReasons.length || !['held','confirmed'].includes(booking.scheduling.status)) return booking;
  const paid=outcome==='paid';
  const amount=paid ? booking.payment.amountDueNowCents ?? 0 : 0;
  return {...booking,language:bookingLanguage(language),canCheckout:outcome==='failed',
    scheduling:{...booking.scheduling,status:paid?'confirmed':booking.scheduling.status},
    payment:{...booking.payment,status:outcome,amountPaidCents:amount,remainingBalanceCents:booking.quote.totalCents-amount}};
}
