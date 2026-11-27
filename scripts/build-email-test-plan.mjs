/** Local-only preparation. No transport, credentials, database or send command.
 * All recipients are fixed to the single test address authorized by the owner.
 * Usage: node scripts/build-email-test-plan.mjs /absolute/output/folder
 */
import {mkdirSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {catalogs,emailLanguages,TEMPLATE_REVISION,snapshotEmailLanguage,prepareCollectionEnvelope} from '../integrations/email-collection/index.mjs';
import {demoData} from '../reference/kraken-emails/src/demo-data.mjs';

const output=resolve(process.argv[2]||'.cache/kraken-email-tests');
if(process.argv.length>3)throw new Error('Pass one output directory only. This script cannot send emails.');
const recipient='antonionadre2@gmail.com',origin='https://krakenpfm.ch';
const notice={de:'TEST · Fiktive Daten. Keine echte Buchung, Zahlung oder Stornierung. Musteraktionen sind deaktiviert.',en:'TEST · Fictional data. No real booking, payment or cancellation. Sample actions are disabled.',es:'PRUEBA · Datos ficticios. Sin reserva, pago ni cancelación real. Acciones de muestra desactivadas.',fr:'TEST · Données fictives. Aucune réservation, aucun paiement ni annulation réels. Actions de démonstration désactivées.',it:'TEST · Dati fittizi. Nessuna prenotazione, pagamento o cancellazione reale. Azioni di esempio disattivate.',pt:'TESTE · Dados fictícios. Sem reserva, pagamento ou cancelamento reais. Ações de exemplo desativadas.'};
const disabled={de:'TEST: Aktion deaktiviert',en:'TEST: action disabled',es:'PRUEBA: acción desactivada',fr:'TEST : action désactivée',it:'TEST: azione disattivata',pt:'TESTE: ação desativada'};
const ids=Object.keys(catalogs.de),plan=[];
if(ids.length!==30)throw new Error('Unexpected catalog inventory.');
mkdirSync(output,{recursive:true});
for(const language of emailLanguages){
  const payload=[];
  for(const id of ids){
    const eventId=`owner-requested-email-test-2026-11-27:${language}:${id}`;
    const data=demoData(id,language,'end');
    data.customer={...data.customer,id:'synthetic-owner-test',firstName:'TEST',email:recipient};
    data.reference=`TEST-${language.toUpperCase()}-${id}`;
    if(language==='es'){
      data.staffReply='Por supuesto. Hemos anotado sus indicaciones de muestra sobre el acceso. Este mensaje es una prueba.';
      data.resolution='Este es un ejemplo de resolución para revisar el correo. No se ha realizado ningún servicio.';
      data.openQuestions=['¿Cómo accederemos al apartamento? (Pregunta ficticia de prueba)'];
    }
    delete data.links;
    data.event={id:eventId,type:catalogs[language][id].event};
    const notification={id:'n'+createHash('sha256').update(eventId).digest('hex'),eventId,eventType:data.event.type,entityId:'synthetic-email-test-only',recipientIdentity:'synthetic-owner-test',recipientEmail:recipient,templateId:id,templateRevision:TEMPLATE_REVISION,languageSnapshot:snapshotEmailLanguage({selectedLanguage:language}),renderData:data};
    const links=Object.fromEntries(['primary','secondary','unsubscribe','guide'].map(action=>[action,`https://email-tests.invalid/${language}/${id}/${action}`]));
    const rendered=prepareCollectionEnvelope(notification,links,origin);
    const html=rendered.html.replace(/href="https:\/\/email-tests\.invalid\/[^\"]+"/g,'aria-disabled="true"')
      .replace(/(<body\b[^>]*>)/i,`$1<div style="background:#fff4c7;color:#162d45;padding:20px;font:700 16px Arial,sans-serif">${notice[language]}</div>`);
    const text=`${notice[language]}\n\n${rendered.text.replace(/https:\/\/email-tests\.invalid\/\S+/g,`[${disabled[language]}]`)}`;
    if(/email-tests\.invalid/.test(html+text)||!html.includes('aria-disabled="true"'))throw new Error('A demonstration action was not disabled.');
    const message={from:'Kraken PFM <kai@krakenpfm.ch>',to:[recipient],reply_to:'kai@krakenpfm.ch',subject:`[TEST ${language.toUpperCase()}] ${rendered.subject}`,html,text,headers:{'Content-Language':language,'X-Entity-Ref-ID':notification.id}};
    payload.push(message);
    const prefix=join(output,'messages',language,id);mkdirSync(join(output,'messages',language),{recursive:true});
    writeFileSync(`${prefix}.html`,html);writeFileSync(`${prefix}.txt`,`Subject: ${message.subject}\n\n${text}`);
    plan.push({templateId:id,language,to:recipient,synthetic:true,actionsDisabled:true,messageSha256:createHash('sha256').update(JSON.stringify(message)).digest('hex')});
  }
  writeFileSync(join(output,`resend-payload.${language}.json`),JSON.stringify(payload,null,2)+'\n');
}
const manifest={preparedAt:'2026-11-27',templateRevision:TEMPLATE_REVISION,recipient,templates:30,languages:emailLanguages,messages:plan.length,emailsSent:0,paymentsMade:0,synthetic:true,actionsDisabled:true,providerBatchFiles:emailLanguages.map(language=>`resend-payload.${language}.json`),plan};
writeFileSync(join(output,'send-plan.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({output,messages:plan.length,recipient,emailsSent:0,paymentsMade:0,actionsDisabled:true}));
