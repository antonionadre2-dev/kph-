import crypto from 'node:crypto';
import { bookingLineLabel, bookingText } from '../src/booking/uiCopy.ts';
import { catalogs, TEMPLATE_REVISION, LEGACY_TEMPLATE_REVISION, languageForBackgroundEmail, normalizeEmailLanguage, snapshotEmailLanguage, prepareCollectionEnvelope } from '../integrations/email-collection/index.mjs';
import { bookingTermsPresentation, termsPresentationText } from '../src/booking/termsPresentation.ts';
import { CURRENT_TERMS_VERSION } from '../src/legal/terms-version.ts';

const clone=<T>(value:T):T=>JSON.parse(JSON.stringify(value));
const hash=(value:string)=>crypto.createHash('sha256').update(value).digest('hex');
const emailService=(selection:any)=>selection?.service==='endOfTenancy'?'end':selection?.service==='regular'&&(selection.cleaningKind==='deep'||!selection.cleaningKind&&selection.frequency==='once')?'deep':selection?.service;
const languageMap=(render:(language:string)=>any)=>Object.fromEntries(['de','en','es','fr','it','pt'].map(language=>[language,render(language)]));
const accountTemplates=new Set(['magic_link','support_received','support_reply','issue_received','issue_resolved']);
export const EMAIL_COLLECTION_VERSION=TEMPLATE_REVISION;

/** Server-owned identity and event determine uniqueness; a new translation never creates another job. */
export function createCustomerNotification({templateId,eventId,entityId,email,languageSnapshot,renderData}:any) {
  if(!catalogs.de[templateId] || typeof eventId!=='string'||!eventId||eventId.length>256 || typeof entityId!=='string'||!entityId)throw new Error('INVALID_NOTIFICATION_EVENT');
  languageForBackgroundEmail(languageSnapshot);
  if(typeof email!=='string'||email.length>254||! /^[^\s@<>(),;]+@[^\s@<>(),;]+\.[^\s@<>(),;]+$/.test(email))throw new Error('INVALID_NOTIFICATION_RECIPIENT');
  const recipientEmail=email.trim().toLowerCase(),recipientIdentity=`contact:${hash(recipientEmail)}`;
  return clone({id:`n${hash(`${eventId}\n${templateId}\n${recipientIdentity}`)}`,eventId,eventType:catalogs.de[templateId].event,entityId,
    recipientIdentity,recipientEmail,templateId,templateRevision:TEMPLATE_REVISION,languageSnapshot,
    renderData:{...renderData,customer:{...renderData.customer,id:recipientIdentity,email:recipientEmail}}});
}

/** Only stable service codes are translated here; staff prose requires explicit language metadata. */
function selectionData(selection:any,quote:any) {
  const known=(quote?.lines||[]).filter((line:any)=>line.id!=='approved-manual-quote');
  const extras=languageMap(language=>known.map((line:any)=>`${bookingLineLabel(language,line)} × ${line.quantity}`));
  return {service:emailService(selection),...(selection?.rooms?{rooms:selection.rooms}:{}),...(selection?.areaM2?{areaM2:selection.areaM2}:{}),extras,
    ...(selection?.service==='regular'?{frequency:languageMap(language=>bookingText(language,selection.frequency))}:{})};
}
function financialData(quote:any,payment:any={},settlement:any=null):any {
  const total=settlement?.finalTotalCents ?? payment.totalDueCents ?? quote?.totalPayableCents ?? quote?.totalCents;
  if(!Number.isSafeInteger(total)||total<0)return {};
  const paid=payment.amountPaidCents||0, refunded=payment.refundedCents||0;
  return {pricing:{currency:'CHF',priceType:quote.priceType==='estimate'?'estimate':'fixed',totalRappen:total,paidRappen:paid,vatRappen:0,
    ...(payment.model==='full_prepayment'?{refundedRappen:refunded,...(paid-refunded>total?{refundCreditRappen:paid-refunded-total}:{})}:{}),
    ...(Number.isSafeInteger(payment.transactionRappen)?{transactionRappen:payment.transactionRappen}:{}),
    ...(Number.isSafeInteger(payment.refundRappen)?{refundRappen:payment.refundRappen}:{})}};
}
export function bookingAppointmentStart(record:any) {
  if(!record.scheduling?.date||!record.scheduling?.time)return undefined;
  const local=`${record.scheduling.date} ${record.scheduling.time}`;
  const nominal=Date.parse(`${record.scheduling.date}T${record.scheduling.time}:00Z`);
  const format=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Zurich',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});
  const instant=[nominal-3600000,nominal-7200000].find(value=>format.format(value).replace(',','')===local);
  if(instant===undefined)throw new Error('INVALID_APPOINTMENT_IN_SNAPSHOT');
  return new Date(instant).toISOString();
}

/** Called inside the business transaction, before a callback/browser can change its context. */
export function notificationForBooking(record:any,templateId:string,eventId:string,extra:any={}) {
  const locale=languageForBackgroundEmail(record.languageSnapshot);
  const start=bookingAppointmentStart(record);
  const status=record.scheduling?.status;
  const scope=record.scopeNotes?{serviceScope:record.scopeNotes,localizedContentLanguage:record.scopeContentLanguage}:{};
  const receipt=['deposit_received','payment_received'].includes(templateId);
  const payment={...record.payment,...(receipt||['payment_requested','payment_pending','payment_failed'].includes(templateId)?{transactionRappen:record.payment.amountDueNowCents}:{})};
  const terms=bookingTermsPresentation(locale,{booking:record});
  // After-work invoices and refunds must not repeat the original upfront amount
  // as a new demand. Keep the accepted immutable contract accessible instead.
  const legalSummary=extra.extraPayment===true||templateId==='refund_issued'||record.status==='cancelled'
    ? {...terms,state:record.termsVersion?`${termsPresentationText(locale,'accepted')}: ${record.termsVersion}`:terms.state,rows:[],sections:[]} : terms;
  const data={...selectionData(record.selection,record.quote),...financialData(record.quote,payment,record.workSettlement),...scope,testMode:record.mode==='test',
    paymentModel:record.payment?.model,paymentBillingMode:record.payment?.billingMode,paymentDueAt:record.payment?.paymentDueAt,
    reference:record.reference,customer:{...(record.customer.name?{firstName:record.customer.name}:{})},
    city:record.customer.city,
    ...(!accountTemplates.has(templateId)?{address:`${record.customer.address}, ${record.customer.postalCode} ${record.customer.city}`} : {}),
    ...(start?{appointment:{start,status:status==='confirmed'?'confirmed':['cancelled','completed'].includes(status)?status:'requested'}}:{}),
    ...(receipt?{paymentStatus:'settled',paymentDetails:{reference:record.payment.transactionId||record.checkout?.reference}}:{}),
    ...(templateId==='payment_requested'?{pricing:{...financialData(record.quote,payment,record.workSettlement).pricing,transactionRappen:record.payment.amountDueNowCents}}:{}),
    ...(templateId==='payment_pending'?{paymentStatus:'pending'}:{}),...(templateId==='payment_failed'?{paymentStatus:'failed'}:{}),
    ...(templateId==='quote_ready'?{quoteApproved:Boolean(record.priceApprovedBy&&record.priceApprovedAt)}:{}),
    // Customer notes remain their own words. Door/access codes are kept in the secure portal.
    ...extra,
    // Persist the exact language and legal version shown for this business event.
    ...(!accountTemplates.has(templateId)?{termsSummary:legalSummary}:{})};
  // A stored free-text offer cannot be silently relabelled as translated.
  if(record.scopeNotes&&normalizeEmailLanguage(record.scopeContentLanguage)!==locale)throw new Error('STAFF_SCOPE_LANGUAGE_REQUIRED');
  const notification=createCustomerNotification({templateId,eventId,entityId:record.bookingId,email:record.customer.email,languageSnapshot:record.languageSnapshot,renderData:data});
  if(record.termsVersion!==CURRENT_TERMS_VERSION)notification.templateRevision=LEGACY_TEMPLATE_REVISION;
  return notification;
}

export function notificationForRecovery(draft:any,kind:string) {
  const templateId=({saved:'quote_saved',reminder1:'quote_reminder_1',reminder2:'quote_reminder_2'} as Record<string,string>)[kind];
  const languageSnapshot=draft.languageSnapshot;
  return createCustomerNotification({templateId,eventId:`${draft.id}:${kind}`,entityId:draft.id,email:draft.email,languageSnapshot,
    renderData:{...selectionData(draft.selection,draft.quote),...financialData(draft.quote),reference:`K-${draft.id.slice(0,8).toUpperCase()}`,customer:{},
      consent:{reminder_consented:draft.reminderConsent===true}}});
}

export function bookingEmailLinks(record:any,notification:any,origin:string,token:string) {
  const locale=languageForBackgroundEmail(notification.languageSnapshot);
  const url=new URL('/quote',origin);url.searchParams.set('booking',record.bookingId);url.searchParams.set('lang',locale);url.hash=`access=${token}`;
  return {primary:url.href,secondary:new URL(`/kontakt?lang=${locale}`,origin).href};
}

export function prepareCustomerEnvelope(notification:any,links:any,origin:string) {
  const envelope=prepareCollectionEnvelope(notification,links,origin);
  if(notification.renderData?.testMode!==true)return envelope;
  const locale=languageForBackgroundEmail(notification.languageSnapshot);
  const notice:Record<string,string>={de:'TEST · Keine echte Zahlung',en:'TEST · No live payment',es:'PRUEBA · Sin pago real',fr:'TEST · Aucun paiement réel',it:'TEST · Nessun pagamento reale',pt:'TESTE · Sem pagamento real'};
  return {...envelope,subject:`[TEST] ${envelope.subject}`,text:`${notice[locale]}\n\n${envelope.text}`,
    html:envelope.html.replace(/(<body\b[^>]*>)/i,`$1<p style="padding:16px;font:700 16px Arial,sans-serif">${notice[locale]}</p>`)};
}

/** No new provider, secret or automatic activation. Existing delivery stays selected until rollout. */
export function collectionConfiguration(env:NodeJS.ProcessEnv,origin:string) {
  return {enabled:env.BOOKING_EMAIL_COLLECTION_ENABLED==='true',snapshot:notificationForRecovery,
    prepare:(notification:any,links:any)=>prepareCustomerEnvelope(notification,links,origin)};
}

export function selectedEmailSnapshot(value:unknown) {
  return snapshotEmailLanguage({selectedLanguage:normalizeEmailLanguage(value)});
}
