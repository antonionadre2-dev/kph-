import { journeyCopy } from '../src/booking/journeyCopy.ts';
import { bookingLineLabel, bookingText } from '../src/booking/uiCopy.ts';
import { BookingError } from './booking-store.ts';

const escape=(value:unknown)=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
const money=(cents:number)=>`CHF ${(cents/100).toFixed(2)}`;

/** Transactional HTML/text reuses the approved six-language Journey copy. */
export function renderBookingEmail(booking:any, kind:'request'|'receipt', origin:string, token:string) {
  const copy=journeyCopy(booking.language), receipt=kind==='receipt';
  const title=(booking.mode==='test'?'[TEST · NO LIVE PAYMENT] ':'')+(receipt ? copy.emailReceiptSubject : copy.emailRequestSubject);
  const body=receipt ? copy.emailReceiptBody : copy.emailRequestBody;
  const appointment=booking.scheduling.status==='confirmed' ? copy.emailConfirmed : copy.emailPending;
  const service=bookingText(booking.language,booking.quote.service);
  const rows:[string,string][]=[
    [copy.reference,booking.reference], [service,booking.quote.lines.map((line:any)=>`${bookingLineLabel(booking.language,line)} · ${money(line.totalCents)}`).join('\n')],
    [appointment,`${booking.scheduling.date} ${booking.scheduling.time} · Europe/Zurich`],
    [booking.customer.name,`${booking.customer.address}\n${booking.customer.postalCode} ${booking.customer.city}`],
    [copy.total,booking.quote.totalCents===null ? bookingText(booking.language,'individual') : money(booking.quote.totalCents)],
  ];
  if(receipt)rows.push([copy.amountPaid,money(booking.payment.amountPaidCents)],[copy.remaining,money(booking.payment.remainingBalanceCents)]);
  rows.push(['VAT / IVA / MwSt.','CHF 0.00']);
  const url=`${origin}/quote?booking=${encodeURIComponent(booking.bookingId)}&lang=${booking.language}#access=${token}`;
  return {subject:title,text:[`Kraken · ${title}`,body,...rows.map(([label,value])=>`${label}: ${value}`),url,'Kraken PFM · Seewadelstrasse 3, 8203 Schaffhausen','+41 77 450 57 05 · kai@krakenpfm.ch'].join('\n\n'),html:`<!doctype html><html lang="${escape(booking.language)}"><body style="margin:0;background:#f1f6f8;color:#062d52;font:16px Arial,sans-serif"><table role="presentation" width="100%"><tr><td style="padding:24px"><table role="presentation" style="max-width:620px;margin:auto;background:white;border-radius:20px" width="100%"><tr><td style="padding:30px"><strong>Kraken · Properties &amp; Facilities Management</strong><h1>${escape(title)}</h1><p>${escape(body)}</p><table role="presentation" width="100%">${rows.map(([label,value])=>`<tr><th align="left" style="padding:12px 0;vertical-align:top">${escape(label)}</th><td style="padding:12px;white-space:pre-line">${escape(value)}</td></tr>`).join('')}</table><p><a href="${escape(url)}" style="display:inline-block;background:#a1f1d0;color:#062d52;padding:16px;border-radius:12px">${escape(copy.continuePlan)}</a></p><p>Kraken PFM<br>Seewadelstrasse 3, 8203 Schaffhausen<br><a href="tel:+41774505705">+41 77 450 57 05</a><br><a href="mailto:kai@krakenpfm.ch">kai@krakenpfm.ch</a></p></td></tr></table></td></tr></table></body></html>`};
}

/** Provider acceptance is not delivery. Unknown results are never automatically retried. */
export function createResendEmailAdapter(apiKey:string, fetcher:typeof fetch=fetch) {
  return async (message:any)=>{
    let response:Response;
    try { response=await fetcher('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json','Idempotency-Key':message.idempotencyKey},body:JSON.stringify({from:message.from,to:[message.to],subject:message.subject,html:message.html,text:message.text}),signal:AbortSignal.timeout(10000)}); }
    catch { throw new BookingError('EMAIL_OUTCOME_UNKNOWN',503); }
    const parsed=await response.json().catch(()=>null);
    if(!response.ok) {
      const error:any=new BookingError('EMAIL_PROVIDER_REJECTED',503);
      const retryable=response.status===429 && ['rate_limit_exceeded','daily_quota_exceeded','monthly_quota_exceeded'].includes(parsed?.name);
      error.definitelyNotSent=retryable || (response.status>=400 && response.status<500 && ![408,409,429].includes(response.status));
      if(retryable) {
        const header=response.headers.get('retry-after')?.trim()||'';
        const delay=/^\d+$/.test(header)?Number(header)*1000:0;
        error.retryable=true;
        error.retryAfterMs=Number.isSafeInteger(delay)&&delay>=0?delay:0;
      }
      throw error;
    }
    if(typeof parsed?.id!=='string')throw new BookingError('EMAIL_OUTCOME_UNKNOWN',503);
    return {id:parsed.id};
  };
}
