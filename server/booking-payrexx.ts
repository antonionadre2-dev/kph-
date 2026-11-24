import { BookingError } from './booking-store.ts';

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
  return {
    async create(booking:any, token:string, minutes:number) {
      const back=`${config.origin}/quote?booking=${booking.bookingId}&lang=${booking.language}#access=${token}`;
      const gateway=await request('POST','Gateway/',{amount:booking.payment.amountDueNowCents,currency:'CHF',vatRate:0,referenceId:booking.checkout.reference,purpose:`Kraken PFM · ${booking.reference} · 15%`,language:booking.language,validity:minutes,successRedirectUrl:back,failedRedirectUrl:back,cancelRedirectUrl:back});
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
      const currency=typeof row.invoice.currency==='string'?row.invoice.currency:row.invoice.currency?.code;
      const expectedMode=config.mode==='live'?'LIVE':'TEST';
      const instance=transaction.instance?.name || transaction.instance?.subdomain;
      // Refund amounts can differ from the original charge. Such a change is retained
      // for manual reconciliation instead of leaving an old paid receipt active.
      if(!Number.isSafeInteger(transaction.amount) || transaction.amount!==booking.payment.amountDueNowCents || currency!=='CHF' || transaction.mode!==expectedMode || (instance && instance!==config.instance))throw new BookingError('PAYMENT_MISMATCH',409);
      const status=transaction.status==='confirmed'?(config.mode==='live'?'paid':'test_paid'):({waiting:'pending',cancelled:'cancelled',declined:'failed',error:'failed',expired:'expired',refunded:'refunded','partially-refunded':'partially_refunded',chargeback:'chargeback',disputed:'disputed',refund_pending:'reconciliation_required'} as Record<string,string>)[transaction.status] || 'pending';
      return {status,transactionId:String(transaction.id)};
    }
  };
}
