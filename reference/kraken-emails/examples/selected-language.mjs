/** Executable, synthetic example. No database, network, payment or email sends. */
import {readFileSync} from 'node:fs';
import {normalizeEmailLanguage,snapshotEmailLanguage,emailLanguages} from '../src/language.mjs';
import {prepareServerEmail} from '../src/server-email.mjs';
import {demoData} from '../src/demo-data.mjs';

const catalogs=Object.fromEntries(emailLanguages.map(language=>[language,JSON.parse(readFileSync(new URL(`../content/catalog.${language}.json`,import.meta.url),'utf8'))]));

// 1. Real frontend: obtain this value from the existing website language selector.
const language=normalizeEmailLanguage(process.argv[2]??'es');
const requestBody={language};

// 2. Real backend: require language, validate, then save this entire snapshot
//    with the request/booking IN THE EXISTING DATABASE TRANSACTION.
const languageSnapshot=snapshotEmailLanguage({selectedLanguage:normalizeEmailLanguage(requestBody.language)});

// 3. Synthetic receipt fixture only. Production uses records from the database
//    after Payrexx verification, never demoData or a browser success redirect.
const templateId='payment_received';
const renderData=demoData(templateId,language);
renderData.event={id:'fixture-payment-event-01',type:catalogs[language][templateId].event};
const row={
  id:'fixture-notification-01',
  eventId:renderData.event.id,eventType:renderData.event.type,
  entityId:'fixture-booking-01',recipientIdentity:'fixture-customer-01',
  recipientEmail:'laura@example.com',templateId,templateRevision:'1.2.0',
  languageSnapshot,renderData
};

// A JSON round trip demonstrates serialisation. It is NOT durable persistence.
const loadedSnapshot=JSON.parse(JSON.stringify(row));
loadedSnapshot.renderData.language='de'; // A later unrelated locale cannot override it.

// 4. Real worker: build authorised links when the job becomes due, prepare the
//    envelope once, persist it, then send through the EXISTING email provider.
const email=prepareServerEmail({
  templateId,notificationSnapshot:loadedSnapshot,
  links:{primary:`https://example.com/booking?lang=${language}`,secondary:`https://example.com/support?lang=${language}`}
},{
  catalogs,
  brand:{name:'Kraken PFM',email:'test@example.com',privacyUrl:'https://example.com/privacy'},
  assetBaseUrl:'https://assets.example.com/kraken-emails'
});

console.log(JSON.stringify({
  demonstrationOnly:true,emailsSent:0,
  websiteSelection:language,unrelatedLaterLocale:'de',emailLanguage:email.language,
  subject:email.subject,to:email.to,idempotencyKey:email.idempotencyKey
},null,2));
