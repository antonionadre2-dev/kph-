import { BookingError } from './booking-store.ts';
import { normalizeEmailLanguage } from '../integrations/email-collection/language.mjs';
import { usesFullPrepayment } from '../src/booking/fullPrepayment.ts';

export interface PayrexxConfig { instance:string; secret:string; mode:'live'|'test'; origin:string; }
/** The reference/amount/mode below come from the persisted booking, never the browser. */
export function createPayrexxAdapter(config:PayrexxConfig, fetcher:typeof fetch=fetch) {
  if(!/^[a-z0-9-]{1,80}$/i.test(config.instance))throw new BookingError('PAYMENT_NOT_CONFIGURED',503);
  async function request(method:string, path:string, body?:unknown) {
    let response:Response;
    try {response=await fetcher(`https://api.payrexx.com/v1.19/${path}?instance=${encodeURIComponent(config.instance)}`,{method,headers:{'X-API-KEY':config.secret,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(12000)});}
    catch { throw new BookingError('PAYMENT_OUTCOME_UNKNOWN',503); }
    const result=await response.json().catch(()=>null);
    if(!response.ok || result?.status!=='success' || !Array.isArray(result.data) || !result.data[0]) throw new BookingError('PAYMENT_PROVIDER_UNAVAILABLE',503);
    return result.data[0];
  }
  async function originalTransaction(booking:any) {
    const id=Number(booking.payment.transactionId);
    if(!Number.isSafeInteger(id)||id<=0)throw new BookingError('PAYMENT_MISMATCH',409);
    const row=await request('GET',`Transaction/${id}/`),invoice=row.invoice||{};
    const currency=typeof invoice.currency==='string'?invoice.currency:invoice.currency?.code??invoice.currencyAlpha3;
    if(invoice.currencyAlpha3!==undefined&&invoice.currencyAlpha3!=='CHF')throw new BookingError('PAYMENT_MISMATCH',409);
    const original=invoice.originalAmount;
    const reference=row.referenceId||invoice.referenceId;
    const instance=row.instance?.name||row.instance?.subdomain||row.instanceName;
    if(row.id!==id||reference!==booking.checkout?.reference||currency!=='CHF'||row.mode!==(config.mode==='live'?'LIVE':'TEST')
      ||!Number.isSafeInteger(original)||original!==(booking.payment.initialChargeCents??booking.payment.amountDueNowCents)||(instance&&instance!==config.instance))throw new BookingError('PAYMENT_MISMATCH',409);
    const refunded=invoice.refundedAmount??0;
    if(!Number.isSafeInteger(refunded)||refunded<0||refunded>original)throw new BookingError('PAYMENT_MISMATCH',409);
    return {row,original,refunded};
  }
  return {
    async create(booking:any, token:string, minutes:number, checkoutLanguage:unknown=booking.language) {
      let presentationLanguage:string;
      try{presentationLanguage=normalizeEmailLanguage(checkoutLanguage);}catch{throw new BookingError('INVALID_LANGUAGE');}
      const back=`${config.origin}/quote?booking=${booking.bookingId}&lang=${presentationLanguage}#access=${token}`;
      const purpose=usesFullPrepayment(booking)?booking.payment.paymentKind==='extra'?'Zusätzlicher Aufwand':'Gesamter Betrag':'15%';
      const gateway=await request('POST','Gateway/',{amount:booking.payment.amountDueNowCents,currency:'CHF',vatRate:0,referenceId:booking.checkout.reference,purpose:`Kraken PFM · ${booking.reference} · ${purpose}`,language:presentationLanguage,validity:minutes,successRedirectUrl:back,failedRedirectUrl:back,cancelRedirectUrl:back});
      const url=new URL(gateway.link);
      // Never send a customer to a URL supplied by a browser or unexpected provider host.
      if(url.protocol!=='https:' || !(url.hostname===`${config.instance}.payrexx.com` || url.hostname===`${config.instance}.payrexx.ch`))throw new BookingError('INVALID_CHECKOUT_URL',503);
      if(!Number.isSafeInteger(gateway.id))throw new BookingError('PAYMENT_OUTCOME_UNKNOWN',503);
      return {id:gateway.id,link:url.href};
    },
    async verify(booking:any) {
      if(!Number.isSafeInteger(booking.checkout?.gatewayId))throw new BookingError('PAYMENT_NOT_STARTED',409);
      const gateway=await request('GET',`Gateway/${booking.checkout.gatewayId}/`);
      if(gateway.id!==booking.checkout.gatewayId)throw new BookingError('PAYMENT_MISMATCH',409);
      const invoices=Array.isArray(gateway.invoices)?gateway.invoices:[];
      const transactions=invoices.flatMap((invoice:any)=>(Array.isArray(invoice.transactions)?invoice.transactions:[]).map((transaction:any)=>({transaction,invoice})));
      const matches=transactions.filter(({transaction,invoice}:any)=>(transaction.referenceId || invoice.referenceId || gateway.referenceId)===booking.checkout.reference);
      if(!matches.length)return {status:'pending',transactionId:null};
      // More than one successful transaction is a reconciliation case, never a second receipt.
      const paid=matches.filter(({transaction}:any)=>transaction.status==='confirmed');
      if(paid.length>1)throw new BookingError('PAYMENT_RECONCILIATION_REQUIRED',409);
      const terminal=matches.findLast(({transaction}:any)=>['refunded','partially-refunded','refund_pending','chargeback','disputed'].includes(transaction.status));
      const row=terminal || paid[0] || matches[matches.length-1], transaction=row.transaction;
      // A settled result must identify a real provider transaction. Stringifying
      // a missing or malformed ID must never turn it into a paid booking.
      if(!Number.isSafeInteger(transaction.id) || transaction.id<=0)throw new BookingError('PAYMENT_MISMATCH',409);
      const currency=typeof row.invoice.currency==='string'?row.invoice.currency:row.invoice.currency?.code??(usesFullPrepayment(booking)?row.invoice.currencyAlpha3:undefined);
      if(usesFullPrepayment(booking)&&row.invoice.currencyAlpha3!==undefined&&row.invoice.currencyAlpha3!=='CHF')throw new BookingError('PAYMENT_MISMATCH',409);
      if(usesFullPrepayment(booking)&&terminal&&transaction.originalTransactionId!==undefined&&booking.payment.transactionId&&String(transaction.originalTransactionId)!==booking.payment.transactionId)throw new BookingError('PAYMENT_MISMATCH',409);
      const expectedMode=config.mode==='live'?'LIVE':'TEST';
      const instance=transaction.instance?.name || transaction.instance?.subdomain;
      // Refund amounts can differ from the original charge. Such a change is retained
      // for manual reconciliation instead of leaving an old paid receipt active.
      const originalAmount=usesFullPrepayment(booking)&&terminal?row.invoice.originalAmount:transaction.amount;
      if(!Number.isSafeInteger(originalAmount) || originalAmount!==booking.payment.amountDueNowCents || currency!=='CHF' || transaction.mode!==expectedMode || (instance && instance!==config.instance))throw new BookingError('PAYMENT_MISMATCH',409);
      if(usesFullPrepayment(booking)&&row.invoice.refundedAmount!==undefined&&(!Number.isSafeInteger(row.invoice.refundedAmount)||row.invoice.refundedAmount<0||row.invoice.refundedAmount>booking.payment.amountDueNowCents))throw new BookingError('PAYMENT_MISMATCH',409);
      const status=transaction.status==='confirmed'?(config.mode==='live'?'paid':'test_paid'):({waiting:'pending',cancelled:'cancelled',declined:'failed',error:'failed',expired:'expired',refunded:'refunded','partially-refunded':'partially_refunded',chargeback:'chargeback',disputed:'disputed',refund_pending:'reconciliation_required'} as Record<string,string>)[transaction.status] || 'pending';
      return {status,transactionId:usesFullPrepayment(booking)&&terminal&&booking.payment.transactionId?booking.payment.transactionId:String(transaction.id),...(usesFullPrepayment(booking)&&Number.isSafeInteger(row.invoice.refundedAmount)?{refundedCents:row.invoice.refundedAmount}:{})};
    },
    /** Payrexx documents POST Transaction/{id}/refund with an explicit cent amount. Never retry an unknown POST. */
    async refund(booking:any,amountCents:number) {
      const {row,original,refunded}=await originalTransaction(booking);
      // A staff/provider refund outside this workflow must be reconciled before another POST.
      if(refunded!==(booking.payment.refundedCents||0))throw new BookingError('REFUND_RECONCILIATION_REQUIRED',409);
      if(!Number.isSafeInteger(amountCents)||amountCents<=0||amountCents>original-refunded||!['confirmed','partially-refunded'].includes(row.status)
        ||(amountCents<original?row.partiallyRefundable!==true:row.refundable!==true))throw new BookingError('REFUND_NOT_AVAILABLE',409);
      return request('POST',`Transaction/${row.id}/refund`,{amount:amountCents});
    },
    async verifyRefund(booking:any,targetRefundedCents:number) {
      const {row,refunded,original}=await originalTransaction(booking);
      if(!Number.isSafeInteger(targetRefundedCents)||targetRefundedCents<=0||targetRefundedCents>original)throw new BookingError('PAYMENT_MISMATCH',409);
      // API1.18+: the original keeps its confirmed status; the invoice's cumulative refund is authoritative.
      return {verified:['confirmed','refunded','partially-refunded'].includes(row.status)&&refunded>=targetRefundedCents,refundedCents:refunded,id:String(row.id)};
    },
  };
}
