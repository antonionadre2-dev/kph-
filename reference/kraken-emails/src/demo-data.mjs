import { labels } from './labels.mjs';

// Deliberately fictional. Never use a demonstration object as a live customer record.
export function demoData(id, language='de', requestedService='end') {
  const service=['recurring_visit','recurring_updated'].includes(id)?'regular':id==='moving_guide'?'moving':requestedService;
  const total={windows:14000,end:56000,regular:10000,deep:13200,moving:62000,construction:45000}[service];
  let paid=0, transaction=Math.round(total*0.15), paymentStatus='unpaid';
  if(['deposit_received','booking_confirmed','booking_updated','balance_due','appointment_reminder','team_on_the_way','recurring_visit'].includes(id)) paid=Math.round(total*0.15);
  if(['payment_received','service_completed','review_requested'].includes(id)) {paid=total;transaction=total;paymentStatus='settled';}
  if(id==='deposit_received') paymentStatus='settled';
  if(id==='payment_pending') paymentStatus='pending';
  if(id==='payment_failed') paymentStatus='failed';
  if(id==='refund_issued') {paid=total;paymentStatus='refund_accepted';transaction=Math.round(total*0.15);}
  if(id==='balance_due') transaction=total-paid;
  const confirmed=['booking_confirmed','booking_updated','appointment_reminder','team_on_the_way','service_completed','review_requested','recurring_visit','recurring_updated','deposit_received','payment_received','payment_requested','payment_pending','payment_failed','balance_due','issue_received','issue_resolved'].includes(id);
  const data={
    language,staffContentLanguage:language,service,reference:'KRA-DEMO-2048',quoteApproved:true,
    customer:{firstName:'Laura',lastName:'Meier',email:'laura@example.com'},
    city:service==='moving'?'Winterthur':'Zürich',
    address:service==='moving'?'Musterstrasse 12, 8400 Winterthur':'Musterstrasse 12, 8000 Zürich',
    rooms:'2.5',areaM2:65,
    appointment:{start:id==='reschedule_proposed'?'2026-12-05T08:00:00Z':'2026-12-04T08:00:00Z',status:id==='reschedule_proposed'?'proposed':confirmed?'confirmed':'requested'},
    expiresAt:'2026-11-25T18:15:00Z',
    pricing:{currency:'CHF',totalRappen:total,paidRappen:paid,transactionRappen:transaction,vatRappen:0,refundRappen:Math.round(total*0.15)},
    paymentStatus,paymentReference:'DEMO-PAY-084',
    paymentDetails:{receiptNumber:'DEMO-R-2048',reference:'DEMO-PAY-084',processedAt:'2026-11-25T09:14:00Z',method:'TWINT'},
    frequency:Object.fromEntries(Object.entries(labels).map(([key,value])=>[key,value.weekly])),
    move:{from:'Winterthur',to:'Schaffhausen'},
    links:{primary:'#preview-personal-action',secondary:'#preview-help',unsubscribe:'#preview-unsubscribe'},
    consent:{reminder_consented:true,feedback_consented:true},
    event:{id:'DEMO-EVENT-2048',type:'DEMONSTRATION_ONLY'},
    staffReply:{de:'Gerne, Laura. Wir haben Ihren Hinweis zum Zugang aufgenommen. Den genauen Ablauf stimmen wir vor dem Termin mit Ihnen ab.',en:'Of course, Laura. We have noted your access instructions. We will agree the arrangements with you before your appointment.',es:'Por supuesto, Laura. Hemos anotado tus indicaciones sobre el acceso. Acordaremos contigo los detalles antes de la cita.',fr:'Bien sûr, Laura. Nous avons bien noté vos indications concernant l’accès. Nous conviendrons des détails avec vous avant le rendez-vous.',it:'Certamente, Laura. Abbiamo annotato le tue indicazioni sull’accesso. Concorderemo i dettagli con te prima dell’appuntamento.',pt:'Claro, Laura. Registámos as suas indicações de acesso. Vamos combinar os detalhes consigo antes da marcação.'}[language],
    resolution:{de:'Die gemeinsam vereinbarte Nachreinigung wurde abgeschlossen. Bitte geben Sie uns Bescheid, falls noch etwas offen ist.',en:'The follow-up cleaning we agreed together is complete. Please let us know if anything remains unresolved.',es:'Hemos completado el repaso de limpieza que acordamos contigo. Cuéntanos si queda algo pendiente.',fr:'Le nettoyage complémentaire convenu ensemble a été effectué. Dites-nous si un point reste à régler.',it:'La pulizia aggiuntiva concordata è stata completata. Facci sapere se rimane qualcosa da risolvere.',pt:'A limpeza complementar que acordámos foi concluída. Diga-nos se ficou alguma questão por resolver.'}[language],
    openQuestions:[{de:'Wie erhalten wir Zugang zur Wohnung?',en:'How should we access the property?',es:'¿Cómo accederemos al apartamento?',fr:'Comment pouvons-nous accéder au logement ?',it:'Come possiamo accedere all’appartamento?',pt:'Como podemos aceder à casa?'}[language]]
  };
  if(['quote_saved','quote_reminder_1','quote_reminder_2','magic_link','support_received','support_reply'].includes(id)) {delete data.appointment;delete data.address;}
  if(id==='cancellation_confirmed') data.appointment.status='cancelled';
  if(['service_completed','review_requested'].includes(id)) data.appointment.status='completed';
  return data;
}
