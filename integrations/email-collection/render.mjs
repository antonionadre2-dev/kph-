import { labels, localeTags, serviceNames } from './labels.mjs';
import { preparation } from './preparation.mjs';
import { emailArtwork } from './artwork.mjs';
import { normalizeEmailLanguage } from './language.mjs';

export const defaultBrand = Object.freeze({
  name:'Kraken PFM', descriptor:'Properties & Facilities Management',
  website:'https://krakenpfm.ch', email:'kai@krakenpfm.ch',
  phone:'+41 77 450 57 05', phoneHref:'tel:+41774505705',
  address:'Seewadelstrasse 3 · 8203 Schaffhausen · Schweiz',
  whatsapp:'https://wa.me/41774505705',
  linkedin:'https://www.linkedin.com/company/krakenpfm/',
  instagram:null, privacyUrl:null, vatStatus:'not_registered'
});

const billingIds = new Set(['payment_requested','deposit_received','payment_received','payment_pending','payment_failed','balance_due','refund_issued']);
const accountIds = new Set(['magic_link','support_received','support_reply','issue_received','issue_resolved']);
const priceIds = new Set(['quote_saved','quote_reminder_1','quote_reminder_2','quote_ready','booking_confirmed','booking_updated',...billingIds]);
const preparationIds = new Set(['booking_confirmed','appointment_reminder','recurring_visit']);
const confirmedIds = new Set(['booking_confirmed','booking_updated','appointment_reminder','team_on_the_way','recurring_visit']);
const optInKinds = new Set(['reminder_consented','feedback_consented']);
const baseFont = 'Arial, Helvetica, sans-serif';
const neutralGreetings = Object.freeze({de:'Guten Tag,',en:'Hello,',es:'Hola,',fr:'Bonjour,',it:'Buongiorno,',pt:'Olá,'});
const cityPhrases = Object.freeze({de:' in {{city}}',en:' in {{city}}',es:' en {{city}}',fr:' à {{city}}',it:' a {{city}}',pt:' em {{city}}'});

export function escapeHtml(value='') { return String(value).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
export function chf(rappen, language='de') {
  if (!Number.isSafeInteger(rappen) || rappen < 0) throw new Error('Amounts must be non-negative integer rappen.');
  return `CHF ${new Intl.NumberFormat(localeTags[language],{minimumFractionDigits:2,maximumFractionDigits:2}).format(rappen/100)}`;
}
export function safeUrl(value, {preview=false, allowMail=false}={}) {
  if (typeof value!=='string' || /[\r\n\x00]/.test(value)) throw new Error('Invalid URL.');
  if (preview && /^(#|\.\.?\/|data:image\/(png|jpeg);base64,)/.test(value)) return value;
  let url; try { url=new URL(value); } catch { throw new Error('An absolute HTTPS URL is required.'); }
  if (url.protocol==='https:' && !url.username && !url.password) return value;
  if (allowMail && ['mailto:','tel:'].includes(url.protocol)) return value;
  throw new Error('Unsafe URL protocol.');
}
function replaceTokens(text, values) {
  return String(text||'').replace(/\{\{(\w+)\}\}/g, (_,key)=>{
    if(values[key]===undefined || values[key]===null || values[key]==='') throw new Error(`Missing email token: ${key}`);
    return String(values[key]);
  });
}
function dateParts(iso,language) {
  if(!iso) return {date:'',time:''};
  const date=new Date(iso);
  if(!Number.isFinite(date.getTime())) throw new Error('Invalid appointment date.');
  return {date:new Intl.DateTimeFormat(localeTags[language],{timeZone:'Europe/Zurich',day:'numeric',month:'long',year:'numeric'}).format(date),time:new Intl.DateTimeFormat(localeTags[language],{timeZone:'Europe/Zurich',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(date)};
}

/** Render only. This function does not send email or verify a Payrexx webhook.
 * Call on the server with an already verified, persisted event and price snapshot.
 * mode=preview is deliberately the default. */
export function renderEmail(id, data, options={}) {
  const preview=options.mode!=='production';
  const language=normalizeEmailLanguage(preview ? (data.language ?? 'de') : data.language);
  const l=labels[language];
  const template=options.catalogs?.[language]?.[id];
  if(!l || !template) throw new Error('Unknown language or email template.');
  const brand={...defaultBrand,...options.brand};
  if(!data.customer || typeof data.customer!=='object' || Array.isArray(data.customer)) throw new Error('Customer data is required.');
  const firstName=data.customer.firstName==null?'':data.customer.firstName;
  if(typeof firstName!=='string' || firstName.length>120 || /[\r\n\u0000-\u001f]/.test(firstName)) throw new Error('Invalid first name.');
  const knownName=firstName.trim();
  const greeting=knownName?`${l.hello} ${knownName},`:neutralGreetings[language];
  // An email-only saved quote has no invented name or location. Remove only
  // optional catalogue phrases; unknown remaining tokens still fail closed.
  const optionalCopy=value=>{
    let copy=value;
    if(!knownName){
      const startsWithName=/^\{\{firstName\}\},\s*/.test(copy);
      copy=copy.replace(/^\{\{firstName\}\},\s*/,'').replace(/,\s*\{\{firstName\}\}/g,'');
      if(startsWithName)copy=copy.replace(/^([¿¡]?)(\p{Ll})/u,(_,prefix,letter)=>prefix+letter.toLocaleUpperCase(localeTags[language]));
    }
    if(!data.city)copy=copy.replaceAll(cityPhrases[language],'');
    return copy;
  };
  const service=data.service||'end';
  if(!serviceNames[language][service]) throw new Error('Unknown service.');
  // Structured labels should be translated by the application's service catalog.
  // Raw staff text must be tagged with the language it was written/reviewed in.
  // These checks validate metadata; they do not automatically translate prose.
  const localizedValue=(value,field,declaredLanguage,list=false)=>{
    if(value===undefined || value===null) return list?[]:undefined;
    let selected=value;
    if(typeof value==='object' && !Array.isArray(value)) {
      if(!Object.hasOwn(value,language)) throw new Error(`Missing ${language} translation for ${field}.`);
      selected=value[language];
    } else if(!(list && Array.isArray(value) && value.length===0)) {
      if(!preview || declaredLanguage!==undefined) {
        if(normalizeEmailLanguage(declaredLanguage,{field:`${field}.contentLanguage`})!==language) throw new Error(`${field} content language must match the email language.`);
      }
    }
    const validText=text=>typeof text==='string' && text.trim().length>0;
    if(list ? !Array.isArray(selected) || !selected.every(validText) : !validText(selected)) throw new Error(`Invalid localized content for ${field}.`);
    return selected;
  };
  const serviceVisible=!accountIds.has(id);
  const frequency=serviceVisible && service==='regular'?localizedValue(data.frequency,'frequency',data.localizedContentLanguage):undefined;
  const serviceScope=serviceVisible?localizedValue(data.serviceScope,'serviceScope',data.localizedContentLanguage):undefined;
  const extras=serviceVisible?localizedValue(data.extras,'extras',data.localizedContentLanguage,true):[];
  const staffReply=id==='support_reply'?localizedValue(data.staffReply,'staffReply',data.staffContentLanguage):undefined;
  const resolution=id==='issue_resolved'?localizedValue(data.resolution,'resolution',data.staffContentLanguage):undefined;
  const openQuestions=id==='details_required'?localizedValue(data.openQuestions,'openQuestions',data.staffContentLanguage,true):[];
  if(id==='moving_guide' && !['moving','end'].includes(service)) throw new Error('Moving guides require a relevant service.');
  if(['recurring_visit','recurring_updated'].includes(id) && service!=='regular') throw new Error('Recurring templates require regular cleaning.');
  const price=data.pricing;
  if(price) {
    if(price.priceType!==undefined&&!['fixed','estimate'].includes(price.priceType))throw new Error('Unsupported price type.');
    for(const key of ['totalRappen','paidRappen','transactionRappen','vatRappen','refundRappen']) if(price[key]!==undefined) chf(price[key],language);
    if(price.currency!=='CHF') throw new Error('This collection currently supports CHF only.');
    if(price.paidRappen>price.totalRappen) throw new Error('Overpayment requires a specific reviewed message.');
    if(brand.vatStatus!=='not_registered' || price.vatRappen!==0) throw new Error('Update the VAT copy and renderer before using another tax status.');
  }
  if(!preview) {
    if(data.event?.type!==template.event || !data.event?.id) throw new Error('A matching persisted server event is required.');
    if(!data.customer.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.customer.email) || /[\r\n]/.test(data.customer.email)) throw new Error('A valid recipient is required.');
    if(!brand.privacyUrl) throw new Error('Configure a verified privacy URL.');
    if(optInKinds.has(template.kind) && data.consent?.[template.kind]!==true) throw new Error('Explicit consent is required for this sequence.');
    if(optInKinds.has(template.kind) && !data.links?.unsubscribe) throw new Error('An unsubscribe URL is required.');
    if(confirmedIds.has(id) && data.appointment?.status!=='confirmed') throw new Error('A confirmed appointment is required.');
    if(id==='reschedule_proposed' && data.appointment?.status!=='proposed') throw new Error('A proposed appointment is required.');
    if(id==='request_received' && data.appointment?.status==='confirmed') throw new Error('Use the confirmation template for a confirmed appointment.');
    if(billingIds.has(id) && !price) throw new Error('A persisted financial snapshot is required.');
    if(['deposit_received','payment_received'].includes(id) && data.paymentStatus!=='settled') throw new Error('Only a verified settled payment can trigger a receipt.');
    if(id==='deposit_received' && !(price.paidRappen>0 && price.paidRappen<price.totalRappen && price.transactionRappen>0 && price.transactionRappen<=price.paidRappen)) throw new Error('The deposit snapshot is inconsistent.');
    if(id==='payment_received' && !(price.totalRappen>0 && price.paidRappen===price.totalRappen && price.transactionRappen>0 && price.transactionRappen<=price.paidRappen)) throw new Error('The fully paid snapshot is inconsistent.');
    if(id==='payment_pending' && data.paymentStatus!=='pending') throw new Error('A verified pending state is required.');
    if(id==='payment_failed' && data.paymentStatus!=='failed') throw new Error('A verified failed state is required.');
    if(id==='refund_issued' && !(data.paymentStatus==='refund_accepted' && price.refundRappen>0)) throw new Error('A verified accepted refund is required.');
    if(id==='support_reply' && !staffReply) throw new Error('Provide the real staff reply.');
    if(id==='details_required' && !openQuestions.length) throw new Error('Provide the actual missing information.');
    if(id==='issue_resolved' && !resolution) throw new Error('Provide the completed resolution.');
    if(id==='magic_link' && !data.expiresAt) throw new Error('An actual login expiry is required.');
    if(id==='balance_due' && !(price.totalRappen>price.paidRappen)) throw new Error('A positive outstanding balance is required.');
    if(id==='quote_ready' && !(price && data.quoteApproved===true)) throw new Error('An approved quote and price snapshot are required.');
    if(id==='cancellation_confirmed' && data.appointment?.status!=='cancelled') throw new Error('A verified cancellation is required.');
    if(['service_completed','review_requested'].includes(id) && data.appointment?.status!=='completed') throw new Error('A completed service is required.');
    if(template.secondary && !data.links?.secondary) throw new Error('Provide the actual secondary action URL.');
  }
  const parts=dateParts(data.appointment?.start,language);
  const expiry=dateParts(data.expiresAt,language);
  const values={
    firstName:knownName,serviceName:serviceNames[language][service],city:data.city,
    appointmentDate:parts.date,appointmentTime:parts.time,bookingReference:data.reference,
    amountFormatted:price?chf(id==='refund_issued'?price.refundRappen:price.transactionRappen??price.totalRappen,language):'',
    totalFormatted:price?chf(price.totalRappen,language):'', paidFormatted:price?chf(price.paidRappen,language):'',
    balanceFormatted:price?chf(price.totalRappen-price.paidRappen,language):'',
    expiresAtFormatted:expiry.date?`${expiry.date}, ${expiry.time}`:''
  };
  const t=Object.fromEntries(Object.entries(template).map(([key,val])=>[key,Array.isArray(val)?val.map(v=>replaceTokens(optionalCopy(v),values)):typeof val==='string'?replaceTokens(optionalCopy(val),values):val]));
  if(/[\r\n]/.test(t.subject)) throw new Error('Header injection is not allowed.');
  const asset=(name)=>{
    const url=options.assets?.[name] || `${options.assetBaseUrl||'../assets'}/${name}`;
    return escapeHtml(safeUrl(url,{preview}));
  };
  const link=(value,allowMail=false)=>escapeHtml(safeUrl(value,{preview,allowMail}));
  const cta=data.links?.primary || (preview?'#preview-action':undefined);
  if(!cta) throw new Error('A personal action URL is required.');
  const secondary=data.links?.secondary || `mailto:${brand.email}`;
  const hasConsent=optInKinds.has(template.kind);
  const reasonText=hasConsent?l.reasonMarketing:['quote_saved','magic_link','moving_guide'].includes(id)?l.reasonRequested:l.reasonTransaction;
  const bodyColor='#38566f';
  const p=(text,extra='')=>`<p style="margin:0 0 16px;font-family:${baseFont};font-size:16px;line-height:1.65;color:${bodyColor};${extra}">${escapeHtml(text)}</p>`;
  const tr=(content,padding='0 36px')=>`<tr><td class="pad" style="padding:${padding};">${content}</td></tr>`;
  const rule=()=>`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td height="1" bgcolor="#dce7ef" style="height:1px;font-size:1px;line-height:1px;">&nbsp;</td></tr></table>`;
  const useDark=billingIds.has(id) && ['payment_received','deposit_received','refund_issued'].includes(id);
  const showService=!accountIds.has(id);
  const tone=useDark?'#002d5b':(template.tone==='action'?'#eaf4fd':'#e8f6ef');
  const ink=useDark?'#ffffff':'#002d5b';
  const heroImage=emailArtwork[id]?.file;
  if(!heroImage) throw new Error('A dedicated email illustration is required.');
  const mainHero=`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${tone}" style="background-color:${tone};border-radius:20px;">
    <tr><td class="hero-copy" width="62%" valign="middle" style="padding:30px 8px 28px 28px;">
      <p style="margin:0 0 14px;color:${useDark?'#b7f2d6':'#426e61'};font-family:${baseFont};font-size:12px;font-weight:700;letter-spacing:1.5px;line-height:1.5;text-transform:uppercase;">${escapeHtml(t.eyebrow)}</p>
      <h1 style="margin:0;color:${ink};font-family:${baseFont};font-size:30px;letter-spacing:-1.1px;line-height:1.15;font-weight:700;">${escapeHtml(t.headline)}</h1>
    </td><td class="hero-art" width="38%" valign="middle" align="center" style="padding:18px 16px 18px 0;"><img src="${asset(heroImage)}" width="190" alt="" role="presentation" style="display:block;width:100%;max-width:190px;height:auto;border:0;margin:0 auto;"></td></tr>
  </table>`;
  const fields=[];
  if(showService) fields.push([l.service,values.serviceName]);
  if(data.rooms && showService && !['moving','windows'].includes(service)) fields.push([l.rooms,String(data.rooms)+(data.areaM2?` · ${data.areaM2} m²`:'')]);
  else if(data.areaM2 && showService && !['moving','windows'].includes(service)) fields.push([l.area,`${data.areaM2} m²`]);
  if(frequency && showService) fields.push([l.frequency,frequency]);
  if(parts.date && showService) fields.push([id==='reschedule_proposed'?l.proposedDate:['cancelled','completed'].includes(data.appointment?.status)?l.serviceDate:data.appointment?.status==='confirmed'?l.date:l.requestedDate,`${parts.date} · ${parts.time}`]);
  if(data.address && showService) fields.push([l.address,data.address]);
  if(service==='moving' && data.move?.from && data.move?.to) fields.push([l.route,`${data.move.from} → ${data.move.to}`]);
  if(extras.length && showService) fields.push([l.extras,extras.join(' · ')]);
  if(serviceScope && showService) fields.push([l.scope,serviceScope]);
  if(data.customerNote && showService) fields.push([l.clientNote,data.customerNote]);
  if(id==='magic_link' && expiry.date) fields.push([l.until,`${expiry.date} · ${expiry.time} (${l.timezone})`]);
  if(['deposit_received','payment_received','refund_issued'].includes(id) && data.paymentDetails){
    if(data.paymentDetails.receiptNumber) fields.push([l.receiptNumber,data.paymentDetails.receiptNumber]);
    if(data.paymentDetails.processedAt){const processed=dateParts(data.paymentDetails.processedAt,language);fields.push([l.processedAt,`${processed.date} · ${processed.time}`]);}
    if(data.paymentDetails.method) fields.push([l.paymentMethod,data.paymentDetails.method]);
    if(data.paymentDetails.reference) fields.push([l.transaction,data.paymentDetails.reference]);
  }
  const detailsBlock=fields.length?`<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid #dce7ef;border-radius:16px;">
    <tr><td style="padding:20px 22px 4px;"><p style="margin:0 0 6px;font-size:14px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:#487060;">${escapeHtml(l.details)}</p></td></tr>
    ${Array.from({length:Math.ceil(fields.length/2)},(_,i)=>`<tr><td style="padding:4px 12px 8px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${fields.slice(i*2,i*2+2).map(([label,value])=>`<td class="detail-cell" width="50%" valign="top" style="padding:8px 10px;"><p style="margin:0 0 4px;font-size:14px;color:#61778a;line-height:1.4;">${escapeHtml(label)}</p><p style="margin:0;font-size:16px;line-height:1.5;color:#002d5b;font-weight:600;word-break:break-word;">${escapeHtml(value)}</p></td>`).join('')}</tr></table></td></tr>`).join('')}
  </table>`:'';
  const summaryRows=[];
  if(price && priceIds.has(id)) {
    if(id==='refund_issued') summaryRows.push([l.refund,chf(price.refundRappen,language),'big']);
    else {
      const received=['deposit_received','payment_received'].includes(id);
      if(received) summaryRows.push([l.payment,chf(price.transactionRappen,language),'big']);
      summaryRows.push([price.priceType==='estimate'?l.estimatedTotal:id.startsWith('quote_') && id!=='quote_ready'?l.savedTotal:l.total,chf(price.totalRappen,language),received?null:'big']);
      if(['payment_requested','payment_pending','payment_failed'].includes(id)) summaryRows.push([l.requestedPayment,chf(price.transactionRappen,language),'strong']);
      if(['deposit_received','payment_received','payment_requested','payment_pending','payment_failed','balance_due'].includes(id)) {
        summaryRows.push([l.paid,chf(price.paidRappen,language)]);
        summaryRows.push([price.priceType==='estimate'?l.estimatedRemaining:l.remaining,chf(price.totalRappen-price.paidRappen,language),'strong']);
      }
    }
  }
  const financeBlock=summaryRows.length?`<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#f3f7fa" style="background-color:#f3f7fa;border-radius:16px;">
    ${summaryRows.map(([label,value,emph],index)=>`<tr><td style="padding:${index===0?'22px':'10px'} 18px ${index===summaryRows.length-1?'22px':'10px'} 22px;font-size:14px;line-height:1.4;color:#476176;${emph?'font-weight:700;':''}">${escapeHtml(label)}</td><td align="right" style="padding:${index===0?'22px':'10px'} 22px ${index===summaryRows.length-1?'22px':'10px'} 0;color:#002d5b;font-size:${emph==='big'?'26':'16'}px;line-height:1.4;font-weight:700;white-space:nowrap;">${escapeHtml(value)}</td></tr>`).join('')}
    <tr><td colspan="2" style="padding:0 22px 20px;font-size:13px;color:#476176;">${escapeHtml(l.vatNote)}</td></tr>
  </table>`:'';
  const miniList=(title,items,numbered=false)=>`<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td colspan="2" style="padding:0 0 12px;font-size:16px;font-weight:700;color:#002d5b;line-height:1.5;">${escapeHtml(title)}</td></tr>${items.map((item,i)=>`<tr><td width="28" valign="top" style="padding:4px 8px 10px 0;font-size:14px;font-weight:700;color:#23805e;line-height:1.6;">${numbered?String(i+1).padStart(2,'0'):'✓'}</td><td style="padding:4px 0 10px;font-size:16px;line-height:1.6;color:#38566f;">${escapeHtml(item)}</td></tr>`).join('')}</table>`;
  const button=`<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td align="center" bgcolor="#002d5b" style="background-color:#002d5b;border-radius:12px;text-align:center;padding:0 18px;"><a href="${link(cta)}" style="display:block;padding:17px 8px;font-size:16px;line-height:1.5;font-weight:700;color:#ffffff;text-decoration:none;text-align:center;">${escapeHtml(t.cta)}</a></td></tr></table>`;
  const personalSignature=t.signature.includes('Antonio');
  const signature=`<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td width="80" valign="middle" style="padding:0 18px 0 0;"><img src="${asset('kraken-logo.png')}" alt="Kraken" width="72" style="display:block;width:72px;height:auto;border:0;"></td><td valign="middle"><p style="margin:0 0 4px;font-size:17px;font-weight:700;color:#002d5b;">${escapeHtml(t.signature)}</p><p style="margin:0;font-size:14px;line-height:1.5;color:#61778a;">${escapeHtml(personalSignature?l.signatureRole:l.teamRole)}</p></td></tr></table>`;
  const socials=[['WhatsApp',brand.whatsapp],['LinkedIn',brand.linkedin],...(brand.instagram?[['Instagram',brand.instagram]]:[])].filter(([,url])=>url);
  const footer=`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#eaf1f6" style="background-color:#eaf1f6;border-radius:0 0 24px 24px;">
    <tr><td style="padding:28px 36px 24px;" class="pad"><p style="margin:0 0 6px;color:#002d5b;font-size:16px;line-height:1.5;font-weight:700;">${escapeHtml(l.footer)}</p><p style="margin:0 0 18px;color:#526d80;font-size:14px;line-height:1.6;">${escapeHtml(l.regions)}</p>
      <p style="margin:0 0 8px;color:#002d5b;font-size:14px;font-weight:700;">Kraken ${escapeHtml(brand.descriptor)}</p>
      <p style="margin:0 0 12px;color:#526d80;font-size:14px;line-height:1.7;">${escapeHtml(brand.address)}<br>${escapeHtml(l.hours)} · ${escapeHtml(l.timezone)}</p>
      <p style="margin:0 0 16px;font-size:14px;line-height:1.9;"><a href="${link(brand.phoneHref,true)}" style="color:#002d5b;text-decoration:none;">${escapeHtml(brand.phone)}</a><br><a href="${link(`mailto:${brand.email}`,true)}" style="color:#002d5b;text-decoration:none;">${escapeHtml(brand.email)}</a></p>
      <p style="margin:0 0 16px;font-size:14px;line-height:1.8;"><a href="${link(brand.website)}" style="color:#002d5b;text-decoration:underline;">krakenpfm.ch</a>${socials.map(([label,url])=>` &nbsp;·&nbsp; <a href="${link(url)}" style="color:#002d5b;text-decoration:underline;">${escapeHtml(label)}</a>`).join('')}</p>
      ${rule()}<p style="margin:16px 0 9px;font-size:14px;line-height:1.6;color:#526d80;">${escapeHtml(reasonText)}</p>
      <p style="margin:0;font-size:14px;line-height:1.7;"><a href="${link(brand.privacyUrl||(preview?'#preview-privacy':''))}" style="color:#526d80;text-decoration:underline;">${escapeHtml(l.privacy)}</a>${hasConsent?` &nbsp;·&nbsp; <a href="${link(data.links?.unsubscribe||(preview?'#preview-unsubscribe':''))}" style="color:#526d80;text-decoration:underline;">${escapeHtml(l.unsubscribe)}</a>`:''}</p>
    </td></tr></table>`;
  const rows=[
    tr(`<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td width="146"><a href="${link(brand.website)}"><img src="${asset('kraken-logo.png')}" alt="Kraken" width="140" style="display:block;width:140px;max-width:100%;height:auto;border:0;"></a></td><td align="right" style="padding-left:16px;color:#4c677a;font-size:12px;line-height:1.5;letter-spacing:.2px;">Properties &amp; Facilities<br>Management</td></tr></table>`,'28px 36px 22px'),
    tr(mainHero),
    tr(p(greeting,'font-weight:700;color:#002d5b;margin-bottom:12px;')+p(t.intro),'28px 36px 0'),
    ...(detailsBlock?[tr(detailsBlock,'0 36px 20px')]:[]),
    ...(financeBlock?[tr(financeBlock,'0 36px 22px')]:[]),
    ...(openQuestions.length && id==='details_required'?[tr(miniList(t.nextTitle,openQuestions),'0 36px 16px')]:[]),
    ...(staffReply && id==='support_reply'?[tr(`<blockquote style="margin:0 0 18px;padding:18px 20px;border-left:3px solid #75d6ac;background-color:#eff7f3;border-radius:0 12px 12px 0;color:#244d41;font-size:16px;line-height:1.7;white-space:pre-line;">${escapeHtml(staffReply)}</blockquote>`)]:[]),
    ...(resolution && id==='issue_resolved'?[tr(p(resolution,'padding:18px;background-color:#eff7f3;border-radius:12px;'))]:[]),
    tr(t.body.map(text=>p(text)).join('')),
    tr(button,'4px 36px 10px'),
    tr(t.secondary?`<p style="margin:0 0 26px;font-size:14px;line-height:1.5;text-align:center;"><a href="${link(secondary,true)}" style="color:#355c79;text-decoration:underline;">${escapeHtml(t.secondary)}</a></p>`:''),
    ...(preparationIds.has(id)?[tr(miniList(l.prepare,preparation[language][service]),'0 36px 18px')]:[]),
    ...(id==='moving_guide'?[tr(miniList(l.guideTitle,l.guideItems),'0 36px 18px')]:[]),
    ...(!preparationIds.has(id) && t.next?.length?[tr(miniList(t.nextTitle||l.next,t.next,true),'0 36px 14px')]:[]),
    tr(p(t.note,'font-size:14px;line-height:1.6;color:#61778a;margin-bottom:24px;')),
    tr(rule(),'0 36px 22px'),
    tr(signature,'0 36px 18px'),
    tr(p(l.reply,'font-size:14px;margin-bottom:24px;')),
    `<tr><td>${footer}</td></tr>`
  ].join('\n');
  const previewLabel={de:'VORSCHAU · BEISPIELDATEN',en:'DESIGN PREVIEW · SAMPLE DATA',es:'VISTA DE DISEÑO · DATOS DE EJEMPLO',fr:'APERÇU · DONNÉES FICTIVES',it:'ANTEPRIMA · DATI DI ESEMPIO',pt:'PRÉ-VISUALIZAÇÃO · DADOS DE EXEMPLO'}[language];
  const html=`<!doctype html><html lang="${language}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only"><title>${escapeHtml(t.subject)}</title><style>body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}table,td{mso-table-lspace:0pt;mso-table-rspace:0pt}img{-ms-interpolation-mode:bicubic}body{margin:0;padding:0;width:100%!important}a[x-apple-data-detectors]{color:inherit!important;text-decoration:none!important}@media screen and (max-width:600px){.outer{padding:14px 8px!important}.pad{padding-left:22px!important;padding-right:22px!important}.hero-copy{padding:25px 5px 25px 22px!important}.hero-art{padding-right:6px!important}.hero-copy h1{font-size:25px!important;letter-spacing:-.7px!important}.email{border-radius:20px!important}}@media screen and (max-width:420px){.hero-copy,.hero-art{display:block!important;width:100%!important;box-sizing:border-box!important}.hero-copy{padding:24px 22px 6px!important}.hero-art{padding:0 22px 18px!important;text-align:center!important}.hero-art img{width:168px!important;max-width:100%!important;margin:0 auto!important}.detail-cell{display:block!important;width:100%!important;box-sizing:border-box!important}}</style><!--[if mso]><style>table{border-collapse:collapse}td,p,a,h1{font-family:Arial,sans-serif!important}</style><![endif]--></head><body bgcolor="#eef3f7" style="background-color:#eef3f7;font-family:${baseFont};margin:0;padding:0;">
  <div style="display:none;font-size:1px;color:#eef3f7;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${escapeHtml(t.preheader)}</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#eef3f7" style="background-color:#eef3f7;"><tr><td class="outer" align="center" style="padding:24px 16px;">
  ${preview?`<p style="margin:0 0 14px;font-size:12px;line-height:1.4;letter-spacing:1.3px;color:#61778a;">${previewLabel}</p>`:''}
  <!--[if mso]><table role="presentation" width="640"><tr><td><![endif]--><table class="email" role="presentation" width="640" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="width:100%;max-width:640px;background-color:#ffffff;border-radius:24px;font-family:${baseFont};text-align:left;">${rows}</table><!--[if mso]></td></tr></table><![endif]-->
  <p style="margin:16px 0 0;font-family:${baseFont};font-size:12px;line-height:1.6;color:#61778a;">${escapeHtml(data.reference?`${l.reference} ${data.reference} · `:'')}${escapeHtml(l.personal)}</p></td></tr></table></body></html>`;
  const text=[greeting,'',t.headline,'',t.intro,'',...fields.map(([k,v])=>`${k}: ${v}`),'',...summaryRows.map(([k,v])=>`${k}: ${v}`),price&&priceIds.has(id)&&id!=='refund_issued'?l.vatNote:'',
    '',staffReply||'',resolution||'',...openQuestions,...t.body,'',`${t.cta}: ${cta}`,t.secondary?`${t.secondary}: ${secondary}`:'','',
    ...(id==='moving_guide'?[l.guideTitle,...l.guideItems]:[]),...((preparationIds.has(id)?preparation[language][service]:t.next)||[]).map(item=>`• ${item}`),'',t.note,'',t.signature,l.reply,brand.phone,brand.email,`Kraken ${brand.descriptor}`,brand.address,`${l.hours} · ${l.timezone}`,brand.website,reasonText,`${l.privacy}: ${brand.privacyUrl||'#preview-privacy'}`,hasConsent?`${l.unsubscribe}: ${data.links?.unsubscribe||'#preview-unsubscribe'}`:''].filter(v=>v!==undefined).join('\n');
  const headers={};
  if(hasConsent && !preview) {
    headers['List-Unsubscribe']=`<${safeUrl(data.links.unsubscribe)}>`;
    headers['List-Unsubscribe-Post']='List-Unsubscribe=One-Click';
  }
  return {id,language,subject:t.subject,preheader:t.preheader,html,text,headers,kind:template.kind,eventType:template.event,preview};
}
