import { KAI_FIELDS, emptyKaiDraft, type KaiAssistantRequest, type KaiDraft, type KaiField, type KaiService } from '../src/kai/types.ts';
import { kaiQuestion } from './kaiKnowledge.ts';
import { commercialKai, complaintKai, discountKai, foldKai, humanKai, questionKai } from './kaiIntents.ts';

const patterns: Record<KaiService, RegExp> = {
  end: /endreinigung|auszugsreinig|umzugsreinig|wohnungsabgabe|end.of.(?:tenancy|contract)|move.out.{0,18}clean|(?:fin|fine|fim).{0,20}(?:contrat|bail|alquil|arrend|locaz)|limpieza de mudanza/,
  windows: /fenster|fenstre|fentre|fenetre|vitres?|windows?|ventanas?|bentanas?|janelas?|vetri|finestre/,
  regular: /putzfrau|putzhilfe|regular|regelm|unterhalt|periodic|periodiq|maintenance cleaning|jede(?:n|r)? woche|wochent|weekly|semanal|settiman|hebdomad|every week|every two weeks|monthly|daily|cada semana|chaque semaine|ogni settimana/,
  deep: /grundreinig|tiefenreinig|deep.{0,8}clean|profond|profund|a fundo|a fondo|approfond|profondeur|spring clean/,
  moving: /\bumzug\b|umziehen|umzugsservice|ziehe.{0,18}\bum\b|\bmoving\b|\bmobing\b|\bmove\b|relocat|mudan[czs]|me mudo|\bmudar\b|trasloc|demenag|(?:sofa|mobel|furniture|muebles|moveis|mobili|meubles).{0,30}(?:transport|llevar|levar)|(?:transport|llevar|levar).{0,30}(?:sofa|mobel|furniture|muebles|moveis|mobili|meubles)/,
};
const inventoryPattern = /sofa|couch|tisch|table|mesa|tavol|box(?:es)?|karton|cajas?|caixas?|scatol|cartons?|stuhle|chairs?|sillas?|cadeiras?|sedie|mobel|furniture|muebles|moveis|mobili|meubles/;
const numberWords: Record<string,string> = {one:'1',two:'2',three:'3',four:'4',five:'5',ten:'10',ein:'1',eine:'1',einen:'1',einem:'1',zwei:'2',drei:'3',vier:'4',funf:'5',zehn:'10',un:'1',una:'1',uno:'1',dos:'2',tres:'3',cuatro:'4',cinco:'5',diez:'10',um:'1',uma:'1',dois:'2',duas:'2',quatro:'4',dez:'10',due:'2',tre:'3',quattro:'4',cinque:'5',dieci:'10',une:'1',deux:'2',trois:'3',quatre:'4',cinq:'5',dix:'10'};
const monthNames = ['januar|january|enero|janeiro|gennaio|janvier','februar|february|febrero|fevereiro|febbraio|fevrier','marz|march|marzo|marco|mars','april|abril|aprile|avril','mai|may|mayo|maio|maggio','juni|june|junio|junho|giugno|juin','juli|july|julio|julho|luglio|juillet','august|agosto|aout','september|septiembre|setembro|settembre|septembre','oktober|october|octubre|outubro|ottobre|octobre','november|noviembre|novembro|novembre','dezember|december|diciembre|dezembro|dicembre|decembre'];
export function validKaiDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value+'T12:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10)===value;
}
function todayZurich(now: Date) { return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Zurich',year:'numeric',month:'2-digit',day:'2-digit'}).format(now); }
export function parseKaiDate(message: string, now = new Date()): string | undefined {
  const text=foldKai(message), today=todayZurich(now), currentYear=Number(today.slice(0,4));
  const iso=text.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0];
  if (iso) return validKaiDate(iso) && iso>=today ? iso : undefined;
  if (/\b(?:tomorrow|morgen|manana|amanha|domani|demain)\b/.test(text)) {
    const date=new Date(today+'T12:00:00Z'); date.setUTCDate(date.getUTCDate()+1); return date.toISOString().slice(0,10);
  }
  let day:number|undefined, month:number|undefined, year:number|undefined;
  const named=text.match(new RegExp('(?<![\\d.,])\\b(\\d{1,2})[.]?\\s+(?:de\\s+)?('+monthNames.join('|')+')(?:\\s+(?:de\\s+)?(20\\d{2}))?\\b'));
  if(named){day=Number(named[1]);month=monthNames.findIndex(names=>new RegExp('^(?:'+names+')$').test(named[2]))+1;year=named[3]?Number(named[3]):undefined;}
  else {
    // 3.5 Zimmer and bare 3.5 are quantities, never dates.
    for(const numeric of text.matchAll(/(?<![\d.,])\b(\d{1,2})([./])(\d{1,2})(?:[./](20\d{2}))?([.]?)(?!\d)/g)){
      if(/^\s*[-]?\s*(?:zimmer|rooms?|habitaci|diviso|locali|pieces|m[²2])/.test(text.slice(numeric.index!+numeric[0].length))
        || Number(numeric[1])<=12 && numeric[2]==='.' && numeric[3].length===1 && !numeric[4] && !numeric[5])continue;
      day=Number(numeric[1]);month=Number(numeric[3]);year=numeric[4]?Number(numeric[4]):undefined;
      break;
    }
  }
  if(!day||!month||month>12||day>31)return;
  for(let candidate=year??currentYear;candidate<=(year??currentYear+8);candidate++){
    const result=candidate+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0');
    if(validKaiDate(result)&&result>=today)return result;
  }
}

const deferred = /dont know|don't know|do not know|not sure|not yet|later|no date yet|noch nicht|weiss.{0,8}nicht|spater|no lo se|no se|todavia no|no tengo fecha|despues|nao sei|ainda nao|mais tarde|non lo so|piu tardi|je ne sais|pas encore|plus tard/;
const unique=<T,>(items:T[])=>[...new Set(items)];
function canonicalCity(value:string) {
  const city=foldKai(value);
  return /zurich|zurique|zurigo/.test(city)?'Zürich':/schaffhausen|schaffhouse/.test(city)?'Schaffhausen':'Winterthur';
}
export function extractDraft(request:KaiAssistantRequest, clean:(value:string)=>string, now=new Date()):KaiDraft {
  const draft=structuredClone(request.draft); draft.language=request.language;
  if(complaintKai(request.message)||humanKai(request.message)||commercialKai(request.message)||discountKai(request.message))return draft;
  const text=foldKai(request.message), numbered=text.replace(/\b[a-z]+\b/g,word=>numberWords[word]||word);
  const found=(Object.keys(patterns) as KaiService[]).filter(key=>patterns[key].test(text));
  // Windows/kitchen/balcony are included-scope priorities, never a second service of a move-out clean.
  let choices=found.includes('end')?found.filter(key=>key!=='windows'&&key!=='regular'):found;
  if(choices.length>1&&choices.includes('regular')&&!/putzfrau|putzhilfe|regelm|unterhalt|regular cleaning|limpieza regular|limpeza regular|pulizia regolare|nettoyage regulier/.test(text))choices=choices.filter(key=>key!=='regular');
  // Mentioning the old service in an explicit correction is not a second request.
  let switchTail=text.match(/(?:statt|instead of|en vez de|em vez de|invece di|au lieu de).{0,90}?(?:mochte|will|nur|want|only|quiero|solo|quero|apenas|vorrei|soltanto|veux|seulement)\s+(.+)/)?.[1]
    ||text.match(/(?:wechseln? zu|switch to|change to|cambiar a|mudar para|passare a|changer pour)\s+(.+)/)?.[1];
  const switchPrefix=text.split(/\b(?:instead of|en vez de|em vez de|invece di|au lieu de)\b/)[0];
  if(!switchTail&&switchPrefix!==text&&/want|need|quiero|quero|vorrei|veux/.test(switchPrefix))switchTail=switchPrefix;
  if(switchTail){const switched=(Object.keys(patterns) as KaiService[]).filter(key=>patterns[key].test(switchTail));if(switched.length)choices=switched;}
  if(choices.includes('end') && !/(?:umzug|moving|mudanza|mudanca|trasloco|demenagement)\s+(?:und|and|y|e|et)\s+(?:endreinig|umzugsreinig|clean|limp|pul|nettoy)|(?:reinig|clean|limp|pul|nettoy).{0,35}(?:und|and|y|e|et)\s+(?:einen? |a |una? )?(?:umzug|move|mudanza|mudanca|trasloco|demenagement)/.test(text))choices=choices.filter(key=>key!=='moving');
  const explicitSwitch=!!switchTail||/\b(?:statt|wechsel|andere|lieber|jetzt|nun|instead|switch|change|rather|actually|ahora|prefiero|cambiar|en vez|agora|prefiro|mudar para|invece|preferisco|cambiare|plutot|changer|maintenant)\b/.test(text);
  const additional=/\b(?:auch|also|tambien|tambem|anche|aussi)\b/.test(text);
  if(!draft.service && choices.length) {draft.services=additional?unique([...draft.services,...choices]):choices;draft.service=choices.length===1?choices[0]:null;}
  else if(draft.service && choices.length) {
    // A bare service noun is an extra; a clear new request/switch or transport question is needed.
    const clearRequest=explicitSwitch||/\b(?:ich (?:brauche|mochte)|i (?:need|want)|necesito|quiero|preciso|quero|vorrei|besoin|voudrais)\b/.test(text)||additional&&choices.includes('moving');
    const selected=clearRequest?choices:choices.filter(choice=>choice===draft.service||choice!=='windows');
    if(clearRequest&&selected.length&&(!selected.includes(draft.service)||selected.length>1)){
      draft.services=additional?unique([...draft.services,...selected]):selected;
      draft.service=selected.length===1?selected[0]:null;
    }
  }
  const captured: Array<{key:KaiField,value:string}>=[];
  const put=(key:KaiField,value:string|undefined)=>{
    if(!value?.trim())return; const normalized=clean(value.trim());
    if(!normalized)return; draft.fields[key]=normalized;draft.deferred=draft.deferred.filter(field=>field!==key);captured.push({key,value:normalized});
  };
  const city=request.message.match(/Z[uüú]rich|Zurich|Zurique|Zurigo|Schaffhausen|Schaffhouse|Winterthur|Winterthour/iu);
  if(city && draft.service!=='moving')put('city',canonicalCity(city[0]));
  const route=request.message.match(/(?:\bfrom|\bvon|\bde|\bdesde|\bda)\s+(.{2,65}?)\s+(?:to|nach|a|à|para|vers)\s+(.{2,80}?)(?=[.!?,;]|$)/iu)
    ||request.message.match(/(Schaffhausen|Winterthur|Z[uüú]rich|Zurique|Zurigo|Schaffhouse|Winterthour)\s+(?:to|nach|a|à|para|vers)\s+(.{2,65}?)(?=[.!?,;]|$)/iu);
  if(route&&(draft.service==='moving'||inventoryPattern.test(text))){put('origin',route[1]);put('destination',route[2].split(/\s+(?:with|mit|con|com|avec|tengo|tenho|ho)\s+/iu)[0]);}
  const postcode=text.match(/(?:postcode|post code|zip|plz|codigo postal|code postal|cap)\s*[:=-]?\s*([1-9]\d{3})\b/)?.[1] || [...text.matchAll(/\b([1-9]\d{3})\b/g)].map(match=>match[1]).find(code=>!/^20[2-9]\d$/.test(code));
  put('postcode',postcode);
  put('rooms',numbered.match(/(?<![\d.,])\b(\d+(?:[.,]\d)?)\s*[-]?\s*(?:zimmer|rooms?|habitacion(?:es)?|divisoes|divisao|local[ei]|pieces?)\b/)?.[1]?.replace(',','.'));
  put('bedrooms',numbered.match(/(?<![\d.,])\b(\d+)\s*(?:bedrooms?|schlafzimmer|dormitorios|quartos|camere|chambres)\b/)?.[1]);
  put('bathrooms',numbered.match(/(?<![\d.,])\b(\d+)\s*(?:bathrooms?|badezimmer|bader|bad|banos?|casas? de banho|bagn[oi]|salles? de bain)\b/)?.[1]);
  put('area',numbered.match(/(?<![\d.,])\b(\d+(?:[.,]\d{1,2})?)\s*(?:m[²2]|quadratmeter|square met(?:res|ers)|metros? cuadrados?|metri quadrati|metres? carres?)\b/u)?.[1]?.replace(',','.')
    ||numbered.match(/(?<![\d.,])\b(\d+(?:[.,]\d{1,2})?)\s*m²/u)?.[1]?.replace(',','.'));
  put('hours',numbered.match(/(?<![\d.,])\b(\d+(?:[.,]\d{1,2})?)\s*(?:stunden?|hours?|horas?|ore|heures?|h)\b/)?.[1]?.replace(',','.'));
  put('windowsCount',numbered.match(/(?<![\d.,])\b(\d+)\s*(?:windows?|fenster|ventanas?|janelas?|finestre|vitres?|fenetres?)\b/)?.[1]);
  const frequency=request.message.match(/weekly|daily|fortnightly|monthly|every\s+week|cada\s+semana|chaque\s+semaine|ogni\s+settimana|every\s+(?:two|four|2|4)\s+weeks|w[oö]chentl\w*|jede(?:n|r)?\s+Woche|t[aä]glich|taeglich|monatlich|alle\s+\d+\s+wochen|semanal\w*|di[aá]ri\w*|quincenal\w*|quinzenal\w*|mensual\w*|mensal\w*|mensuel\w*|settiman\w*|quotidian\w*|mensil\w*|hebdomad\w*|einmalig|once|one-off|una vez|uma vez|una tantum|ponctuel\w*|tous les\s+\w+\s+jours/iu);
  if(frequency)put('frequency',/jede(?:n|r)? woche/.test(foldKai(frequency[0]))?'wöchentlich':frequency[0]);
  if(draft.service==='moving'&&inventoryPattern.test(text)){
    const inventory=request.message.split(/[.!?\n]/).filter(piece=>inventoryPattern.test(foldKai(piece))).join('. ').trim();
    put('inventory',inventory);
  }
  const last=[...request.messages].reverse().find(message=>message.role==='assistant')?.text||'';
  const questionField=KAI_FIELDS.find(field=>!['notes','postcode'].includes(field)&&last.includes(kaiQuestion(request.language,field)));
  if(questionField&&['rooms','bedrooms','bathrooms','windowsCount','area','hours'].includes(questionField)&&/^\s*\d+(?:[.,]\d{1,2})?\s*$/.test(numbered))put(questionField,numbered.trim().replace(',','.'));
  const access=/lift|elevator|ascensor|elevador|ascenseur|ascensore|treppe|stairs|escalera|escada|escalier|scale|floor|stock|etage|planta|piano/.test(text);
  if(access){
    const snippet=request.message.match(/\d+[.]?\s*(?:Stock|floor|Etage|planta|piano)[^,.!?]*(?:Lift|ascensor|elevador|elevator|ascenseur|ascensore)?/iu)?.[0]||request.message;
    const key=draft.service==='windows'?'windowAccess':/destination|ziel|destino|arrivee|destinazione/.test(text)?'destinationAccess':questionField==='destinationAccess'?'destinationAccess':'originAccess';
    put(key,snippet);
  }
  put('date',parseKaiDate(request.message,now));
  const priorityNouns=/\b(?:Küche|Backofen|Fenster|Balkon|kitchen|oven|fridge|refrigerator|Kühlschrank|nevera|frigorífico|refrigerateur|windows?|balcony|cocina|horno|ventanas?|balc[oó]n|cozinha|forno|janelas?|varanda|cucina|finestre|balcone|cuisine|four|vitres?|fen[eê]tres?|balcon)\b/giu;
  const fullExtras=[...request.message.matchAll(/\d+\s+(?:klein\w*\s+balkon\w*|gross\w*\s+balkon\w*|small balcon(?:y|ies)|large balcon(?:y|ies)|balcones? peque[ñn]os?|balcones? grandes?|pequen[oa]s? varandas?|grandes? varandas?|balconi? piccoli?|balconi? grandi?|petits? balcons?|grands? balcons?|lamellenstoren|rollladen|slat blinds?|roller shutters?|persianas? de l[aá]minas|persianas? enrollables?|estores? de l[aâ]minas|estores? de enrolar|veneziane|tapparelle|stores? [aà] lamelles|volets? roulants?)/giu)];
  const priorities=fullExtras.map(match=>match[0]);
  const mentioned:string[]=[];
  for(const noun of request.message.matchAll(priorityNouns)){
    if(foldKai(noun[0])==='four' && request.language!=='fr')continue;
    mentioned.push(foldKai(noun[0]));
    if(fullExtras.some(extra=>noun.index!>=extra.index!&&noun.index!<extra.index!+extra[0].length))continue;
    const prefix=request.message.slice(0,noun.index).match(/\b(?:ohne|kein\w*|without|not|no|sin|sem|não|nao|non|senza|sans|pas de)\s+(?:(?:den|das|die|the|el|la|o|a|il|le|les)\s+)?$/iu)?.[0]||'';
    const suffix=request.message.slice(noun.index!+noun[0].length).match(/^\s+(?:doch\s+)?(?:nicht|not|no|não|nao|non|pas)\b/iu)?.[0]||'';
    priorities.push(prefix+noun[0]+suffix);
  }
  if(priorities.length&&draft.service!=='moving'&&draft.service!=='windows'){
    const previous=(draft.fields.priorities||'').split(/[,;\n]+/).filter(item=>!mentioned.some(noun=>foldKai(item).includes(noun)));
    put('priorities',unique([...previous,...priorities].filter(Boolean)).join(', '));
  }
  if(deferred.test(text)){
    const key=/date|datum|fecha|data|termin/.test(text)?'date':questionField;
    if(key&&!draft.fields[key])draft.deferred=unique([...draft.deferred,key]);
  }else if(questionField&&!questionKai(request.message)){
    if(['windowType','windowAccess','priorities'].includes(questionField)&&!captured.length)put(questionField,request.message);
    if(['city','origin','destination'].includes(questionField)&&!draft.fields[questionField]&&request.message.length<100&&!choices.length)put(questionField,request.message);
  }
  // Notes require an actual residual instruction. Questions/complaints and structured
  // facts never become a transcript masquerading as customer instructions.
  if(!questionKai(request.message)&&!deferred.test(text)){
    const explicit=request.message.match(/\b(?:notes?|notas?|notiz(?:en)?|hinweis(?:e)?|remarques?|observa[cç][oõ]es|osservazioni)\s*:\s*([\s\S]+)/iu)?.[1];
    const residual=request.message.split(/(?<=[.!?])\s+|[,;]\s+|\n+/).filter(piece=>
      /(?:timbre|doorbell|klingel|llamar antes|call before|anrufen vor|no funciona|funktioniert nicht|ne fonctionne|ligar antes|suonare|appeler avant)/.test(foldKai(piece))
      && !captured.some(item=>foldKai(item.value)===foldKai(piece.trim())));
    const note=clean(explicit||residual.join(' '));
    if(note&&!draft.fields.notes?.includes(note))draft.fields.notes=[draft.fields.notes,note].filter(Boolean).join('\n').slice(0,1200);
  }
  if(draft.fields.date&&!validKaiDate(draft.fields.date))delete draft.fields.date;
  return draft;
}
