import test from 'node:test';
import assert from 'node:assert/strict';
import { extractKaiDraft, parseKaiRequest, respondKai } from '../server/kaiAssistant.ts';
import { parseKaiDate } from '../server/kaiExtraction.ts';
import { calculateKaiQuote } from '../server/kaiPricing.ts';
import { applyKaiBookingTransfer } from '../src/booking/kaiTransfer.ts';
import { calculatePrice } from '../src/booking/pricing.ts';
import { emptyKaiDraft, type KaiAssistantRequest, type KaiDraft } from '../src/kai/types.ts';

const now=new Date('2026-11-26T11:00:00Z');
const offline={apiKey:'',now:()=>now.getTime()};
const request=(message:string,draft=emptyKaiDraft('de')):KaiAssistantRequest=>({message,messages:[],draft,language:draft.language});
const selected=(service:KaiDraft['service'],fields:KaiDraft['fields']={}):KaiDraft=>({...emptyKaiDraft('de'),service,services:service?[service]:[],fields});
const extracted=(message:string,draft=emptyKaiDraft('de'))=>extractKaiDraft(parseKaiRequest(request(message,draft)),now);
const transfer=(draft:KaiDraft)=>applyKaiBookingTransfer({choice:null,selection:null,customer:{name:'',email:'',phone:'',address:'',postalCode:'',city:''},requestedDate:'',notes:''},draft,'replace');

test('dates roll forward using the Swiss calendar, including year rollover and a future leap day',()=>{
  for(const [message,expected] of [
    ['15. Dezember','2026-12-15'],['am 12. Dezember','2026-12-12'],['28.12.','2026-12-28'],
    ['15. November','2027-11-15'],['12.11.','2027-11-12'],['29. Februar','2028-02-29'],
  ])assert.equal(parseKaiDate(message,now),expected,message);
  const swissNewYear=new Date('2026-12-31T23:30:00Z'); // Already 1 January in Zurich.
  assert.equal(parseKaiDate('morgen',swissNewYear),'2027-01-02');
  assert.equal(parseKaiDate('31.12.',swissNewYear),'2027-12-31');
  assert.equal(parseKaiDate('2026-11-01',now),undefined);
  assert.equal(parseKaiDate('31. Februar',now),undefined);
  assert.equal(parseKaiDate('29. Februar 2027',now),undefined);
});

test('room and area decimals never hide a later explicitly supplied numeric date',()=>{
  for(const text of ['3.5','2.5','3.5 Zimmer','2.5-Zimmer-Wohnung','85.5 m²'])assert.equal(parseKaiDate(text,now),undefined,text);
  for(const text of ['3.5 Zimmer, Übergabe am 28.12.','2.5 Zimmer, 85.5 m², am 28.12.','85.5 m². Übergabe am 28.12.']){
    assert.equal(parseKaiDate(text,now),'2026-12-28',text);
    assert.equal(extracted(text).fields.date,'2026-12-28',text);
  }
});

test('unsupported fractional integer quantities never silently become their decimal tail',()=>{
  for(const [message,field] of [
    ['12.5 Fenster','windowsCount'],['1.5 Bäder','bathrooms'],['3.25 Zimmer','rooms'],['85.755 m2','area'],['3.125 Stunden','hours'],
  ] as const){
    assert.equal(extracted(message).fields[field],undefined,message);
  }
});

test('end-of-tenancy aliases, quantities and city spellings work in all six languages',async()=>{
  const inputs={
    de:'Ich brauche eine Endreinigung für 3.5 Zimmer, 85 m² in Zurich.',
    en:'I need end of tenancy cleaning for 3.5 rooms, 85 m2 in Zurich.',
    es:'Necesito limpieza de fin de alquiler para 3.5 habitaciones, 85 m² en Zúrich.',
    pt:'Preciso de limpeza de fim de arrendamento para 3.5 divisões, 85 m2 em Zurique.',
    it:'Vorrei la pulizia di fine locazione per 3.5 locali, 85 m2 a Zurigo.',
    fr:'Je voudrais un nettoyage de fin de bail pour 3.5 pièces, 85 m2 à Zurich.',
  } as const;
  for(const [language,message] of Object.entries(inputs)){
    const result=await respondKai(request(message),offline);
    assert.equal(result.draft.language,language,message);
    assert.equal(result.draft.service,'end',message);
    assert.equal(result.draft.fields.rooms,'3.5',message);
    assert.equal(result.draft.fields.area,'85',message);
    assert.equal(result.draft.fields.city,'Zürich',message);
    assert.equal(result.draft.fields.date,undefined,message);
    assert.equal(result.quote?.amountCents,69_000,message);
  }
});

test('regular weekly hours transfer to exactly the shared calculator price in every language',async()=>{
  const inputs={
    de:'Ich brauche eine Putzfrau jede Woche 3 Stunden in 8200 Schaffhausen.',
    en:'I need regular cleaning every week for 3 hours in 8200 Schaffhausen.',
    es:'Necesito limpieza semanal durante 3 horas en 8200 Schaffhausen.',
    pt:'Preciso de limpeza semanal durante 3 horas em 8200 Schaffhausen.',
    it:'Vorrei una pulizia settimanale per 3 ore a 8200 Schaffhausen.',
    fr:'Je voudrais un nettoyage hebdomadaire pour 3 heures à 8200 Schaffhausen.',
  } as const;
  for(const [language,message] of Object.entries(inputs)){
    const result=await respondKai(request(message),offline),applied=transfer(result.draft);
    assert.equal(result.draft.language,language,message);
    assert.equal(result.draft.service,'regular',message);
    assert.equal(result.draft.fields.hours,'3',message);
    assert.equal((applied.selection as any).frequency,'weekly',message);
    assert.equal(calculatePrice(applied.selection!).totalCents,12_000,message);
    assert.equal(result.quote?.amountCents,12_000,message);
    assert.equal(result.draft.fields.date,undefined,message);
  }
});

test('included priorities preserve the selected service; explicit requests can switch it in six languages',()=>{
  const priorities=['Fenster, Küche, Backofen und Balkon.','Windows, kitchen, oven and balcony.','Ventanas, cocina, horno y balcón.','Janelas, cozinha, forno e varanda.','Finestre, cucina, forno e balcone.','Vitres, cuisine, four et balcon.'];
  for(const message of priorities){
    const draft=extracted(message,selected('end',{rooms:'3.5',area:'85'}));
    assert.equal(draft.service,'end',message);assert.deepEqual(draft.services,['end'],message);
  }
  const switches=['Jetzt möchte ich lieber eine Grundreinigung.','Instead I want deep cleaning.','Ahora prefiero limpieza a fondo.','Agora prefiro limpeza a fundo.','Invece preferisco una pulizia profonda.','Maintenant je préfère un nettoyage en profondeur.'];
  for(const message of switches){
    const draft=extracted(message,selected('end',{rooms:'3.5',area:'85'}));
    assert.equal(draft.service,'deep',message);assert.equal(draft.fields.area,'85',message);
  }
});

test('switching away from an old service works even when the correction names that old service',()=>{
  for(const message of ['Statt Endreinigung möchte ich nur Fenster putzen lassen.','I want window cleaning instead of end of tenancy cleaning.','En vez de limpieza de fin de alquiler, quiero solo limpieza de ventanas.']){
    const draft=extracted(message,selected('end',{rooms:'3.5',area:'85'}));
    assert.equal(draft.service,'windows',message);assert.deepEqual(draft.services,['windows'],message);
  }
});

test('human requests and complaints in six languages bypass the model and never become notes',async()=>{
  const messages=[
    'Ich möchte mit einem Menschen sprechen.','I want to speak to a human.','Quiero hablar con una persona.','Quero falar com uma pessoa.','Vorrei parlare con una persona.','Je voudrais parler à une personne.',
    'Ich bin nicht zufrieden und will mein Geld zurück.','I am not satisfied and I want a refund.','No estoy satisfecho, quiero un reembolso.','Não estou satisfeito e quero um reembolso.','Non sono soddisfatto, voglio un rimborso.','Je ne suis pas satisfait et je demande un remboursement.',
  ];
  let calls=0;
  for(const message of messages){
    const original=selected('regular',{postcode:'8200',hours:'3',notes:'Call before arrival.'});
    const result=await respondKai(request(message,original),{...offline,provider:async()=>{calls++;throw new Error('must not be reached');}});
    assert.equal(result.contactCard,true,message);
    assert.equal(result.quote,undefined,message);
    assert.equal(result.draft.fields.notes,original.fields.notes,message);
    assert.deepEqual(result.suggestions,[],message);
    assert.deepEqual(result.actions,['contact'],message);
  }
  assert.equal(calls,0);
});

test('included end-cleaning items and explicit paid extras have the same chat and calculator total',async()=>{
  const plain=await respondKai(request('Umzugsreinigung für 3.5 Zimmer und 85 m², Küche, Backofen und Fenster.'),offline);
  assert.equal(plain.quote?.amountCents,69_000);
  const extra=await respondKai(request('Umzugsreinigung für 3.5 Zimmer und 85 m², 1 kleiner Balkon.'),offline);
  assert.match(extra.draft.fields.priorities!,/1 kleiner Balkon/i);
  const applied=transfer(extra.draft);
  assert.equal((applied.selection as any).smallBalconies,1);
  assert.equal(extra.quote?.amountCents,73_500);
  assert.equal(extra.quote?.amountCents,calculatePrice(applied.selection!).totalCents);
  const regular=await respondKai(request('Ich brauche eine wöchentliche Reinigung für 3 Stunden mit Backofen.'),offline);
  assert.equal(regular.quote?.amountCents,15_500);
  assert.equal(regular.quote?.amountCents,calculatePrice(transfer(regular.draft).selection!).totalCents);
});

test('negative extra requests and subsequent explicit corrections never silently add an oven charge',async()=>{
  const first=await respondKai(request('Ich brauche eine wöchentliche Reinigung für 3 Stunden ohne Backofen.'),offline);
  assert.equal(first.quote?.amountCents,12_000);
  assert.equal((transfer(first.draft).selection as any).oven,false);
  const prior=selected('regular',{hours:'3',frequency:'wöchentlich',priorities:'Backofen'});
  const corrected=await respondKai(request('Backofen doch nicht.',prior),offline);
  assert.equal(calculateKaiQuote(corrected.draft)?.quote.amountCents,12_000);
  assert.equal((transfer(corrected.draft).selection as any).oven,false);
});
