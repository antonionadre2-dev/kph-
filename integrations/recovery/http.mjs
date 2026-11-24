import { CONSENT_VERSION, RecoveryError, normaliseLanguage } from './policy.mjs';
import { EMAIL_COPY } from './emails.mjs';

const headers = { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff', 'Referrer-Policy':'no-referrer' };
const json = (body,status=200) => new Response(JSON.stringify(body),{status,headers});
const bearer = request => /^Bearer ([A-Za-z0-9_-]{43})$/.exec(request.headers.get('Authorization') || '')?.[1] || '';

async function readBody(request) {
  if(!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) throw new RecoveryError('JSON_REQUIRED',415);
  const reader=request.body?.getReader();
  if(!reader) throw new RecoveryError('INVALID_BODY');
  const chunks=[]; let size=0;
  while(true) {
    const {done,value}=await reader.read(); if(done) break;
    size+=value.byteLength;
    if(size>32_768) {await reader.cancel();throw new RecoveryError('BODY_TOO_LARGE',413);}
    chunks.push(value);
  }
  const buffer=new Uint8Array(size); let at=0;
  for(const chunk of chunks) {buffer.set(chunk,at);at+=chunk.byteLength;}
  try {return JSON.parse(new TextDecoder().decode(buffer));} catch {throw new RecoveryError('INVALID_JSON');}
}

function unsubscribePage(url) {
  const lang=normaliseLanguage(url.searchParams.get('lang'));
  const copy=EMAIL_COPY[lang];
  const result={de:'Erinnerungen abbestellt.',en:'Reminders stopped.',es:'Recordatorios cancelados.',fr:'Rappels désactivés.',it:'Promemoria disattivati.',pt:'Lembretes cancelados.'}[lang];
  const error={de:'Dieser Link ist ungültig oder gerade nicht erreichbar.',en:'This link is invalid or temporarily unavailable.',es:'Este enlace no es válido o no está disponible.',fr:'Ce lien est invalide ou indisponible.',it:'Il link non è valido o è momentaneamente indisponibile.',pt:'Esta ligação é inválida ou está indisponível.'}[lang];
  const id=url.searchParams.get('draft') || '';
  const draft=/^[A-Za-z0-9_-]{16,128}$/.test(id) ? id : '';
  const nonce=crypto.randomUUID();
  const html=`<!doctype html><html lang="${lang}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Kraken · ${copy.unsub}</title><style>body{margin:0;background:#f3f8fb;color:#062d52;font:16px Arial,sans-serif;display:grid;place-items:center;min-height:100vh}main{max-width:460px;padding:32px;margin:18px;background:white;border:1px solid #dce8ee;border-radius:24px}h1{font-size:26px;line-height:1.2}button{border:0;background:#062d52;color:white;padding:16px 22px;border-radius:12px;font:700 16px Arial;cursor:pointer}p{line-height:1.6}button:disabled{opacity:.5}</style><main><strong>Kraken</strong><h1>${copy.unsub}</h1><p id="status" role="status"></p><button id="confirm" type="button">${copy.unsub}</button><p><a href="mailto:kai@krakenpfm.ch">kai@krakenpfm.ch</a></p></main><script nonce="${nonce}">const token=new URLSearchParams(location.hash.slice(1)).get('token')||'';history.replaceState(null,'',location.pathname+location.search);const button=document.getElementById('confirm');const status=document.getElementById('status');if(!/^[A-Za-z0-9_-]{43}$/.test(token)){button.disabled=true;status.textContent=${JSON.stringify(error)};}button.addEventListener('click',async()=>{button.disabled=true;try{const response=await fetch('/api/recovery/unsubscribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:${JSON.stringify(draft)},token})});if(!response.ok)throw new Error();status.textContent=${JSON.stringify(result)};button.hidden=true;}catch{status.textContent=${JSON.stringify(error)};button.disabled=false;}});</script></html>`;
  return new Response(html,{headers:{...headers,'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':`default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'`}});
}

/** authorizeCapture must verify the site's anti-abuse challenge and derive a trusted rateKey. */
export function createRecoveryHandler({service=null,publicBaseUrl,authorizeCapture}={}) {
  const origin=publicBaseUrl ? new URL(publicBaseUrl).origin : null;
  return async request => {
    const url=new URL(request.url);
    if(!url.pathname.startsWith('/api/recovery/') && url.pathname!=='/api/bookings/activity' && url.pathname!=='/recovery/unsubscribe') return null;
    try {
      if(url.pathname==='/api/recovery/config' && request.method==='GET') return json(service ? {...service.config,enabled:typeof authorizeCapture==='function'} : {enabled:false,emailReady:false,socialProofReady:false,consentVersion:CONSENT_VERSION});
      if(url.pathname==='/api/bookings/activity' && request.method==='GET') {
        if(!service) return json({events:[],cursor:null});
        const cursor=url.searchParams.get('cursor');
        if(cursor?.length>512) throw new RecoveryError('INVALID_CURSOR');
        return json(await service.publicActivity(cursor));
      }
      if(url.pathname==='/recovery/unsubscribe' && request.method==='GET') return unsubscribePage(url);
      if(!service) return json({code:'RECOVERY_NOT_CONFIGURED'},503);
      if(!['GET','POST','PATCH'].includes(request.method)) return json({code:'METHOD_NOT_ALLOWED'},405);
      if(request.method!=='GET' && (!origin || request.headers.get('Origin')!==origin || url.origin!==origin)) throw new RecoveryError('ORIGIN_NOT_ALLOWED',403);
      if(url.pathname==='/api/recovery/drafts' && request.method==='POST') {
        if(typeof authorizeCapture!=='function') throw new RecoveryError('CAPTURE_NOT_CONFIGURED',503);
        const body=await readBody(request);
        const headerKey=request.headers.get('Idempotency-Key');
        if(headerKey && headerKey!==body.idempotencyKey) throw new RecoveryError('IDEMPOTENCY_MISMATCH');
        const context=await authorizeCapture(request,body);
        if(!context) throw new RecoveryError('CAPTURE_VERIFICATION_REQUIRED',403);
        return json(await service.capture(body,context),201);
      }
      if(url.pathname==='/api/recovery/unsubscribe' && request.method==='POST') {
        const body=await readBody(request); return json(await service.unsubscribe(body.id,body.token));
      }
      const match=/^\/api\/recovery\/drafts\/([A-Za-z0-9_-]{16,128})(?:\/(activity|consent))?$/.exec(url.pathname);
      if(match) {
        const [,id,action]=match;
        if(!action && request.method==='GET') return json(await service.read(id,bearer(request)));
        if(action==='activity' && ['POST','PATCH'].includes(request.method)) return json(await service.activity(id,bearer(request),await readBody(request)));
        if(action==='consent' && request.method==='PATCH') {
          const body=await readBody(request);
          if(body.reminderConsent!==false) throw new RecoveryError('EXPLICIT_NEW_OPT_IN_REQUIRED');
          return json(await service.withdrawConsent(id,bearer(request)));
        }
        return json({code:'METHOD_NOT_ALLOWED'},405);
      }
      return json({code:'NOT_FOUND'},404);
    } catch(cause) {
      return json({code:cause instanceof RecoveryError ? cause.code : 'RECOVERY_UNAVAILABLE'},cause instanceof RecoveryError ? cause.status : 503);
    }
  };
}
