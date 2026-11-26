import { calculatePrice, defaultSelection, pricingConfig, type BookingSelection } from '../src/booking/pricing.ts';
import { applyKaiBookingTransfer } from '../src/booking/kaiTransfer.ts';
import type { KaiAssistantResponse, KaiDraft } from '../src/kai/types.ts';
import { foldKai } from './kaiIntents.ts';

const text = {
  de: { from:'ab',fixed:'Festpreis für den Basisumfang mit Abnahmegarantie gemäss AGB.',estimate:'für den angegebenen Leistungsumfang.',vat:'Endpreis – keine MwSt.', review:'Extras und abweichender Umfang werden im Rechner ausgewiesen.' },
  en: { from:'from',fixed:'Fixed price for the basic scope, with handover guarantee subject to terms.',estimate:'for the stated scope.',vat:'Final price – no VAT.',review:'Extras and any different scope are itemised in the calculator.' },
  es: { from:'desde',fixed:'Precio cerrado para el servicio base, con garantía de entrega según las condiciones.',estimate:'para el trabajo indicado.',vat:'Precio final, sin IVA.',review:'Los extras y los cambios de alcance se detallan en el calculador.' },
  pt: { from:'desde',fixed:'Preço fixo para o serviço base, com garantia de entrega segundo as condições.',estimate:'para o serviço indicado.',vat:'Preço final, sem IVA.',review:'Os extras e as alterações ao âmbito são discriminados no simulador.' },
  it: { from:'da',fixed:'Prezzo fisso per il servizio base, con garanzia di consegna secondo le condizioni.',estimate:'per il servizio indicato.',vat:'Prezzo finale, senza IVA.',review:'Gli extra e le variazioni sono indicati nel calcolatore.' },
  fr: { from:'dès',fixed:'Forfait pour les prestations de base, avec garantie de remise selon conditions.',estimate:'pour les prestations indiquées.',vat:'Prix final, sans TVA.',review:'Les options et changements de prestations sont détaillés dans le calculateur.' },
} as const;
function number(value:string|undefined) { return value&&/^\d+(?:[.,]\d{1,2})?$/.test(value)?Number(value.replace(',','.')):undefined; }
function withKai(selection:BookingSelection,draft:KaiDraft):BookingSelection {
  return applyKaiBookingTransfer({
    choice:draft.service==='deep'?'deep':selection.service,selection,
    customer:{name:'',email:'',phone:'',address:'',postalCode:'',city:''},
    requestedDate:'',notes:'',
  },draft,'replace').selection!;
}

/** Internal price tool: no independent Kai tariff table, and no amounts from the model. */
export function calculateKaiQuote(draft:KaiDraft):{message:string;quote:NonNullable<KaiAssistantResponse['quote']>}|null {
  const copy=text[draft.language], fields=draft.fields;
  try {
    if(draft.service==='end'){
      const rooms=number(fields.rooms);
      const tier=rooms===undefined?pricingConfig.endOfTenancy.tiers[0]:pricingConfig.endOfTenancy.tiers.find(tier=>tier.rooms>=rooms);
      if(!tier)return null;
      const area=number(fields.area), bathrooms=number(fields.bathrooms);
      const price=calculatePrice(withKai({...defaultSelection('endOfTenancy'),rooms:rooms??tier.rooms,areaM2:area??tier.maxAreaM2,bathrooms:bathrooms??1},draft));
      if(price.totalCents===null)return null;
      const from=rooms===undefined||area===undefined;
      const quantity=[rooms!==undefined?rooms+' '+({de:'Zimmer',en:'rooms',es:'habitaciones',pt:'divisões',it:'locali',fr:'pièces'}[draft.language]):'',area!==undefined?area+' m²':''].filter(Boolean).join(', ');
      return {quote:{amountCents:price.totalCents,currency:'CHF',priceType:from?'from':'fixed'},
        message:[quantity?quantity+':':'',from?copy.from:'',formatKaiMoney(price.totalCents),copy.fixed,copy.vat,copy.review].filter(Boolean).join(' ')};
    }
    if(draft.service==='regular'||draft.service==='deep'){
      const frequency=foldKai(fields.frequency||'');
      const kind=draft.service==='deep'?'deep':'regular';
      const selectedFrequency=kind==='deep'||/einmalig|once|one-off|una vez|uma vez|una tantum|ponctuel/.test(frequency)?'once':/fortnight|quincen|quinzen|alle (?:zwei|2)|deux semaines|due settimane/.test(frequency)?'fortnightly':/month|monat|mens|mensil/.test(frequency)?'monthly':'weekly';
      const minimum=kind==='deep'?pricingConfig.regular.deep.minimumHours:pricingConfig.regular.minimumHours[selectedFrequency];
      const hours=number(fields.hours);
      const price=calculatePrice(withKai({...defaultSelection('regular'),cleaningKind:kind,frequency:selectedFrequency,hours:hours??minimum},draft));
      if(price.totalCents===null)return null;
      const from=hours===undefined||!fields.frequency&&kind!=='deep';
      return {quote:{amountCents:price.totalCents,currency:'CHF',priceType:from?'from':'fixed'},
        message:[from?copy.from:'',formatKaiMoney(price.totalCents),copy.estimate,copy.vat,copy.review].filter(Boolean).join(' ')};
    }
    // A count does not establish window types or safe access. Show only the calculator's minimum.
    if(draft.service==='windows'){
      const price=calculatePrice(withKai({...defaultSelection('windows'),standard:1,double:0,balconyDoors:0,roof:0},draft));
      if(price.totalCents===null)return null;
      return {quote:{amountCents:price.totalCents,currency:'CHF',priceType:'from'},message:copy.from+' '+formatKaiMoney(price.totalCents)+'. '+copy.vat+' '+copy.review};
    }
    if(draft.service==='moving'){
      const price=calculatePrice(withKai(defaultSelection('moving'),draft));
      const amount=price.depositBasisCents??price.totalCents;
      if(amount===null)return null;
      return {quote:{amountCents:amount,currency:'CHF',priceType:'from'},message:copy.from+' '+formatKaiMoney(amount)+'. '+copy.vat+' '+copy.review};
    }
  }catch{/* Invalid or review-only inputs are clarified, never rounded into a payable quote. */}
  return null;
}
export function formatKaiMoney(cents:number) { return 'CHF '+(cents/100).toLocaleString('de-CH',{maximumFractionDigits:2}); }
