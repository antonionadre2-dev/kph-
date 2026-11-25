// Local, isolated Lighthouse 13 layout/interaction QA. This is not a performance score.
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
const packageRoot = process.env.KRAKEN_LIGHTHOUSE_PACKAGE;
if (!packageRoot) throw Error('Set KRAKEN_LIGHTHOUSE_PACKAGE to the installed Lighthouse directory.');
const { default: Gatherer } = await import(packageRoot + '/core/gather/base-gatherer.js');
const { Audit } = await import(packageRoot + '/core/audits/audit.js');
const width = Number(process.env.QA_WIDTH || 1440), height = Number(process.env.QA_HEIGHT || 1000);
const mode = process.env.CONTACT_QA_MODE === 'form' ? 'form' : 'layout';
const capture = process.env.CONTACT_QA_CAPTURE !== 'false';
const outputDirectory = path.resolve(process.env.CONTACT_QA_OUTPUT || 'node_modules/.cache/kraken-contact-qa');
const localOrigin = 'http://127.0.0.1:3031';
const reference = 'KCT-0123456789ABCDEF0123';

class ContactFrame extends Gatherer {
  meta = { supportedModes: ['navigation'] };
  requests = [];
  posts = [];
  intercepted = [];
  errors = [];
  async startInstrumentation({ driver }) {
    const session = driver.defaultSession;
    this.onRequest = event => this.requests.push({ url: event.request.url, method: event.request.method });
    session.on('Network.requestWillBeSent', this.onRequest);
    if (process.env.QA_REDUCED_MOTION === 'true') await session.sendCommand('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    if (mode !== 'form') return;
    // The synthetic browser cannot load a real verification provider or deliver an enquiry.
    await session.sendCommand('Network.setBlockedURLs', { urls: ['https://challenges.cloudflare.com/*'] });
    const injected = await session.sendCommand('Page.addScriptToEvaluateOnNewDocument', { source: `(() => {
      if (location.origin !== ${JSON.stringify(localOrigin)}) return;
      const state = window.__contactQA = { renders:0, removes:0, resets:0, callbacks:0, active:0, maxActive:0, widgets:new Map() };
      window.turnstile = {
        render(element, options) {
          const id='local-qa-'+(++state.renders); state.widgets.set(id,{element,options});
          state.active=state.widgets.size;state.maxActive=Math.max(state.maxActive,state.active);
          queueMicrotask(()=>{if(state.widgets.has(id)){state.callbacks++;options.callback('local-synthetic-verification-'+state.callbacks);}});
          return id;
        },
        remove(id) { if(state.widgets.delete(id))state.removes++;state.active=state.widgets.size; },
        reset(id) { state.resets++;const widget=state.widgets.get(id);if(widget)queueMicrotask(()=>{if(state.widgets.has(id)){state.callbacks++;widget.options.callback('local-synthetic-verification-'+state.callbacks);}}); }
      };
    })();` });
    this.injectedScript = injected.identifier;
    this.onPaused = async event => {
      try {
        const url = new URL(event.request.url);
        if (url.origin !== localOrigin || !['/api/contact/intake/config', '/api/contact/messages'].includes(url.pathname)) {
          this.errors.push('Unexpected intercepted URL');
          await session.sendCommand('Fetch.failRequest', { requestId: event.requestId, errorReason: 'BlockedByClient' });
          return;
        }
        let status = 200, body;
        if (url.pathname === '/api/contact/intake/config' && event.request.method === 'GET') {
          body = { available: true, challenge: { provider: 'turnstile', siteKey: 'QA_LOCAL_PUBLIC_SITE_KEY', action: 'kraken_contact' } };
        } else if (url.pathname === '/api/contact/messages' && event.request.method === 'POST') {
          const payload = JSON.parse(event.request.postData || '{}');
          this.posts.push({ idempotencyKey: payload.idempotencyKey, language: payload.language, nameIsSynthetic: payload.name === 'Synthetic QA', emailIsSynthetic: payload.email === 'qa@example.test', phoneEmpty: payload.phone === '', channel: payload.channel, service: payload.service, postcode: payload.postalCode, messageIsSynthetic: payload.message === 'Synthetic contact QA message only.', tokenIsSynthetic: String(payload.turnstileToken).startsWith('local-synthetic-verification-') });
          const sequence = this.posts.length;
          if (sequence === 1) { status = 503; body = { error: { code: 'temporarily_unavailable' } }; }
          else if (sequence === 2) { status = 200; body = { ok: true }; }
          else if (sequence === 3) { status = 201; body = { accepted: true, reference }; }
          else { status = 429; body = { error: { code: 'rate_limited' } }; this.errors.push('Unexpected fourth POST'); }
        } else {
          status = 405; body = { error: { code: 'method_not_allowed' } }; this.errors.push('Unexpected intercepted method');
        }
        this.intercepted.push({ path: url.pathname, method: event.request.method, status });
        await session.sendCommand('Fetch.fulfillRequest', { requestId: event.requestId, responseCode: status, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Cache-Control', value: 'no-store' }], body: Buffer.from(JSON.stringify(body)).toString('base64') });
      } catch (error) {
        this.errors.push(String(error));
        await session.sendCommand('Fetch.failRequest', { requestId: event.requestId, errorReason: 'Failed' }).catch(() => {});
      }
    };
    session.on('Fetch.requestPaused', this.onPaused);
    await session.sendCommand('Fetch.enable', { patterns: [{ urlPattern: localOrigin + '/api/contact/intake/config', requestStage: 'Request' }, { urlPattern: localOrigin + '/api/contact/messages', requestStage: 'Request' }] });
  }
  async screenshot(context, name, fullPage = false) {
    const metrics = await context.driver.defaultSession.sendCommand('Page.getLayoutMetrics');
    const area = metrics.cssContentSize || metrics.contentSize;
    const screenshot = await context.driver.defaultSession.sendCommand('Page.captureScreenshot', { format: 'jpeg', quality: 88, captureBeyondViewport: true, clip: { x: 0, y: 0, width, height: fullPage ? Math.ceil(area.height) : height, scale: 1 } });
    const filename = path.join(outputDirectory, `${name}.jpg`);
    await writeFile(filename, Buffer.from(screenshot.data, 'base64'));
    return filename;
  }
  async getArtifact(context) {
    await mkdir(outputDirectory, { recursive: true });
    const run = async (fn, args = []) => context.driver.executionContext.evaluate(fn, { args, useIsolation: false });
    let geometry, formResult, keyboard, semantics;
    const files = [];
    try {
      await run(async (origin) => {
        if (location.origin !== origin || !/^\/(?:es|en|fr|it|pt)?\/?kontakt$/.test(location.pathname)) throw Error('Contact QA is restricted to the local contact preview.');
        const wait = async predicate => { const end = performance.now() + 8000; while (!predicate()) { if (performance.now() > end) throw Error('Contact did not hydrate'); await new Promise(resolve => requestAnimationFrame(resolve)); } };
        await wait(() => document.querySelector('.contact-form-notice,.contact-verification'));
        document.querySelector('#cookie-btn-decline')?.click();
        await document.fonts.ready;
        document.querySelector('.kr-contact-coverage')?.scrollIntoView();
        const image = document.querySelector('.kr-contact-coverage-map img');
        if (image) await wait(() => image.complete && image.naturalWidth > 0);
        document.querySelector('footer')?.scrollIntoView();
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        scrollTo({top:0,left:0,behavior:'instant'});
      }, [localOrigin]);
      geometry = await run(() => {
        const rect = element => { if (!element) return null; const r = element.getBoundingClientRect(); return { left:r.left, right:r.right, top:r.top, bottom:r.bottom, width:r.width, height:r.height }; };
        const one = selector => rect(document.querySelector(selector));
        const visible = element => { const r=element.getBoundingClientRect(),css=getComputedStyle(element);return !element.closest('[aria-hidden="true"]')&&r.width>0&&r.height>0&&css.visibility!=='hidden'&&css.display!=='none'; };
        const selectors = ['.brand-lockup','.brand-logo','.brand-descriptor','#contact-title','.contact-intro','.contact-intro-hours','.contact-message-section','.contact-main-grid','.kr-contact-coverage','.kr-contact-coverage-map','.contact-person','.contact-faq','footer'];
        return { width:innerWidth,height:innerHeight,language:document.documentElement.lang,url:location.origin+location.pathname,pageHeight:document.documentElement.scrollHeight,scrollWidth:document.documentElement.scrollWidth,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,boxes:Object.fromEntries(selectors.map(selector=>[selector,one(selector)])),descriptor:document.querySelector('.brand-descriptor')?.textContent,formControls:[...document.querySelectorAll('.contact-form input:not([name=website]),.contact-form select,.contact-form textarea,.contact-form-submit')].map(element=>({name:element.getAttribute('name')||element.tagName.toLowerCase(),...rect(element),scrollWidth:element.scrollWidth,clientWidth:element.clientWidth,disabled:element.disabled})),markers:[...document.querySelectorAll('.kr-contact-coverage-marker')].map(element=>({name:element.textContent.trim(),...rect(element),label:rect(element.querySelector('.kr-contact-coverage-label')),href:element.getAttribute('href')})),overflowing:[...document.querySelectorAll('.kraken-contact-page a,.kraken-contact-page button,.kraken-contact-page input,.kraken-contact-page select,.kraken-contact-page textarea,.brand-descriptor,.contact-faq p')].filter(visible).filter(element=>{const r=element.getBoundingClientRect();return r.left<-.5||r.right>innerWidth+.5;}).map(element=>({tag:element.tagName,name:element.getAttribute('name')||element.className,text:element.textContent.trim().slice(0,80),...rect(element)})),faqCount:document.querySelectorAll('.contact-faq details').length,footerPresent:!!document.querySelector('footer'),oldMapDom:document.querySelectorAll('#kr-map,#kr-contact-map,.kr-map-shell,iframe[src*=map],img[src*=contact-exterior],img[src*=contact-interior]').length,links:[...document.querySelectorAll('.contact-actions a')].map(a=>({text:a.textContent.trim(),href:a.getAttribute('href')})) };
      });
      semantics = await run(() => {
        const controls=[...document.querySelectorAll('.contact-form input:not([name=website]),.contact-form select,.contact-form textarea')];
        const attributes=Object.fromEntries(controls.map(element=>[element.name,{labelled:!!document.querySelector('label[for="'+element.id+'"]')?.textContent.trim(),autocomplete:element.autocomplete,required:element.required,inputmode:element.inputMode,invalid:element.getAttribute('aria-invalid')}]));
        const luminance=color=>{const rgb=color.match(/[\d.]+/g).slice(0,3).map(Number).map(value=>value/255).map(value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;};
        const button=document.querySelector('.contact-form-submit'),css=getComputedStyle(button),fg=luminance(css.color),bg=luminance(css.backgroundColor);
        return {attributes,allLabelled:controls.every(element=>!!document.querySelector('label[for="'+element.id+'"]')?.textContent.trim()),phoneOptional:!document.querySelector('#contact-phone').required,postalNumeric:document.querySelector('#contact-postalCode').inputMode==='numeric',unavailableNotice:!!document.querySelector('.contact-form-notice')?.textContent.trim(),submitDisabled:button.disabled,submitColor:css.color,submitBackground:css.backgroundColor,submitContrast:(Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05),floatingKaiVisible:!!document.querySelector('.kai-assistant-launcher')&&!document.querySelector('.kai-assistant-launcher').hidden};
      });
      const runKey = `${geometry.language}-${width}-${mode}`;
      if(capture){files.push(await this.screenshot(context, runKey + '-viewport'));files.push(await this.screenshot(context, runKey + '-full', true));}
      // Capture the untouched layout first; real keyboard events follow separately.
      await run(() => document.querySelector('#contact-name')?.focus({preventScroll:true}));
      const key = async (key, code, value) => {
        await context.driver.defaultSession.sendCommand('Input.dispatchKeyEvent', { type:key==='Enter'?'keyDown':'rawKeyDown',key,code,windowsVirtualKeyCode:value,nativeVirtualKeyCode:value,...(key==='Enter'?{text:'\r',unmodifiedText:'\r'}:{}) });
        await context.driver.defaultSession.sendCommand('Input.dispatchKeyEvent', { type:'keyUp',key,code,windowsVirtualKeyCode:value,nativeVirtualKeyCode:value });
        if(key==='Escape')await new Promise(resolve=>setTimeout(resolve,100));
        else await run(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      };
      const focused = () => run(() => { const el=document.activeElement,css=getComputedStyle(el);return{id:el.id,outlineStyle:css.outlineStyle,outlineWidth:css.outlineWidth}; });
      await key('Tab','Tab',9);const emailFocus=await focused();
      await key('Tab','Tab',9);const phoneFocus=await focused();
      await run(() => document.querySelector('.contact-faq summary')?.focus({preventScroll:true}));
      await key('Enter','Enter',13);
      const faqOpened=await run(()=>document.querySelector('.contact-faq details')?.open);
      await key('Enter','Enter',13);
      const faqClosed=await run(()=>!document.querySelector('.contact-faq details')?.open);
      const kaiOpen=await run(async()=>{const button=document.querySelector('.contact-kai-action');button?.click();const end=performance.now()+5000;while(!document.querySelector('#kai-assistant')?.open){if(performance.now()>end)return false;await new Promise(resolve=>requestAnimationFrame(resolve));}return document.querySelector('#kai-assistant').contains(document.activeElement);});
      await key('Escape','Escape',27);
      const kaiClosed=await run(()=>!document.querySelector('#kai-assistant')?.open&&document.activeElement===document.querySelector('.contact-kai-action'));
      keyboard={emailFocus,phoneFocus,faqOpened,faqClosed,kaiOpen,kaiClosed};
      await run(()=>{document.activeElement?.blur();scrollTo({top:0,left:0,behavior:'instant'});});
      await new Promise(resolve=>setTimeout(resolve,60));
      if (mode === 'form') {
        formResult = await run(async () => {
          const q=selector=>document.querySelector(selector);
          const next=()=>new Promise(resolve=>setTimeout(resolve,40));
          const wait=async (predicate,label)=>{const end=performance.now()+8000;while(!predicate()){if(performance.now()>end)throw Error('UI QA timeout: '+label);await new Promise(resolve=>setTimeout(resolve,20));}await next();};
          await wait(()=>window.__contactQA?.active===1&&!q('.contact-form-submit')?.disabled,'challenge ready');
          const set=(selector,value)=>{const el=q(selector),prototype=el.tagName==='SELECT'?HTMLSelectElement.prototype:el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(prototype,'value').set.call(el,value);el.dispatchEvent(new Event(el.tagName==='SELECT'?'change':'input',{bubbles:true}));};
          const expected={name:'Synthetic QA',email:'qa@example.test',phone:'',channel:'whatsapp',service:'end',postalCode:'8200',message:'Synthetic contact QA message only.'};
          const same=()=>Object.entries(expected).every(([field,value])=>q('[name="'+field+'"]')?.value===value);
          set('#contact-name',expected.name);set('#contact-email',expected.email);set('#contact-channel',expected.channel);set('#contact-service',expected.service);set('#contact-postalCode','123');set('#contact-message',expected.message);await next();
          q('.contact-form').requestSubmit();await next();
          return { invalidPostal:q('#contact-postalCode').getAttribute('aria-invalid')==='true',errorDescription:q('#contact-postalCode').getAttribute('aria-describedby')==='contact-postalCode-error',validationFocus:document.activeElement?.id==='contact-postalCode',postalErrorVisible:!!q('#contact-postalCode-error')?.textContent.trim(),phoneFallback:!!q('#contact-phone-fallback')?.textContent.trim(),initialNoSuccess:!q('.contact-form-success'),stub:{active:window.__contactQA.active,maxActive:window.__contactQA.maxActive},expected };
        });
        files.push(await this.screenshot(context, runKey + '-postal-error', true));
        const submitStage = async stage => run(async (stage) => {
          const q=selector=>document.querySelector(selector),state=window.__contactQA;
          const next=()=>new Promise(resolve=>setTimeout(resolve,40));
          const wait=async(predicate,label)=>{const end=performance.now()+8000;while(!predicate()){if(performance.now()>end)throw Error('UI QA timeout: '+label);await new Promise(resolve=>setTimeout(resolve,20));}await next();};
          if(stage==='503'){const el=q('#contact-postalCode');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,'8200');el.dispatchEvent(new Event('input',{bubbles:true}));await next();}
          const resets=state.resets;q('.contact-form').requestSubmit();
          await wait(()=>state.resets>resets,'request reset '+stage);
          if(stage!=='201')await wait(()=>!!q('.contact-form-error')?.textContent.trim()&&!q('.contact-form-submit').disabled,'visible error '+stage);
          else await wait(()=>!!q('.contact-form-success')?.textContent.includes('KCT-0123456789ABCDEF0123'),'accepted reference');
          const expected={name:'Synthetic QA',email:'qa@example.test',phone:'',channel:'whatsapp',service:'end',postalCode:'8200',message:'Synthetic contact QA message only.'};
          return {stage,retained:stage==='201'?null:Object.entries(expected).every(([name,value])=>q('[name="'+name+'"]')?.value===value),errorVisible:!!q('.contact-form-error')?.textContent.trim(),success:!!q('.contact-form-success'),referenceVisible:q('.contact-form-success')?.textContent.includes('KCT-0123456789ABCDEF0123')||false,focusOnSuccess:!!q('.contact-form-success')&&document.activeElement===q('.contact-form-success'),active:state.active,maxActive:state.maxActive,renders:state.renders,removes:state.removes,resets:state.resets};
        }, [stage]);
        formResult.after503 = await submitStage('503');
        files.push(await this.screenshot(context, runKey + '-503-error', true));
        formResult.languageChange = await run(async () => {
          const q=selector=>document.querySelector(selector),state=window.__contactQA,before=state.removes;
          q('#home-language-selector').click();await new Promise(resolve=>setTimeout(resolve,40));
          q('#home-language-panel button[lang="en"]').click();
          const end=performance.now()+8000;
          while(q('.home-language-code')?.textContent.trim()!=='EN'||state.active!==1||q('.contact-form-submit')?.disabled){if(performance.now()>end)throw Error('Locale switch did not settle');await new Promise(resolve=>setTimeout(resolve,20));}
          await new Promise(resolve=>setTimeout(resolve,40));
          const expected={name:'Synthetic QA',email:'qa@example.test',phone:'',channel:'whatsapp',service:'end',postalCode:'8200',message:'Synthetic contact QA message only.'};
          return {url:location.origin+location.pathname,language:document.documentElement.lang,retained:Object.entries(expected).every(([name,value])=>q('[name="'+name+'"]')?.value===value),widgetRemoved:state.removes>before,active:state.active,maxActive:state.maxActive,formStillMounted:!!q('.contact-form')};
        });
        formResult.afterGeneric200 = await submitStage('200');
        files.push(await this.screenshot(context, runKey + '-generic-200-error', true));
        formResult.after201 = await submitStage('201');
        files.push(await this.screenshot(context, runKey + '-accepted', true));
        formResult.storage = await run(() => {
          const secretFragments=['Synthetic QA','qa@example.test','Synthetic contact QA message only.','qa%40example.test'];
          const serialized=JSON.stringify({local:Object.entries(localStorage),session:Object.entries(sessionStorage)});
          return {urlClean:!secretFragments.some(value=>location.href.includes(value)),storageClean:!secretFragments.some(value=>serialized.includes(value)),localKeys:Object.keys(localStorage),sessionKeys:Object.keys(sessionStorage),widgetActive:window.__contactQA.active,widgetRenders:window.__contactQA.renders,widgetRemoves:window.__contactQA.removes,maxWidgetActive:window.__contactQA.maxActive};
        });
        delete formResult.expected;
      }
    } catch (error) { this.errors.push(String(error?.stack||error)); }
    finally {
      if(mode==='form'){await context.driver.defaultSession.sendCommand('Fetch.disable').catch(()=>{});context.driver.defaultSession.off('Fetch.requestPaused',this.onPaused);if(this.injectedScript)await context.driver.defaultSession.sendCommand('Page.removeScriptToEvaluateOnNewDocument',{identifier:this.injectedScript}).catch(()=>{});}
      context.driver.defaultSession.off('Network.requestWillBeSent',this.onRequest);
    }
    const result={mode,geometry,keyboard,semantics,form:formResult,files,requests:this.requests,intercepted:this.intercepted,posts:this.posts,errors:this.errors};
    await writeFile(path.join(outputDirectory,`${geometry?.language||'unknown'}-${width}-${mode}-qa.json`),JSON.stringify(result,null,2)+'\n');
    return result;
  }
}
class ContactAudit extends Audit {
  static get meta(){return{id:'contact-layout',title:'Contact layout and local UI checks pass',failureTitle:'Contact layout or local UI checks need attention',description:'Isolated localhost viewport and synthetic interaction QA; no production delivery or performance claim.',requiredArtifacts:['ContactFrame']};}
  static audit({ContactFrame:r}){
    const g=r.geometry,b=g?.boxes||{},map=b['.kr-contact-coverage-map'];
    const inBox=(inner,outer)=>inner&&outer&&inner.left>=outer.left-1&&inner.right<=outer.right+1&&inner.top>=outer.top-1&&inner.bottom<=outer.bottom+1;
    const checks={geometry:!!g,noErrors:r.errors.length===0,noHorizontalOverflow:g?.scrollWidth===g?.width,noOverflowingControls:g?.overflowing.length===0,descriptor:g?.descriptor.replace(/\s+/g,' ').trim()==='Properties & Facilities Management',descriptorWithinHeader:inBox(b['.brand-descriptor'],b['.brand-lockup']),formBeforeMap:g?.width>1024||b['.contact-message-section']?.bottom<=b['.kr-contact-coverage']?.top+1,hoursVisible:g?.width>1024||b['.contact-intro-hours']?.bottom<=g?.height,markersWithinMap:g?.markers.length===3&&g.markers.every(marker=>inBox(marker,map)&&inBox(marker.label,map)),faqAndFooter:g?.faqCount===5&&g?.footerPresent,noOldMap:g?.oldMapDom===0,noOldRequests:!r.requests.some(request=>/d3-|contact-map-data|contact-exterior|contact-interior|openrouteservice|osrm|api\.geo\.admin|vectortiles\.geo\.admin|cloudflare|\/api\/contact\/(?:config|geocode|route)(?:\?|$)/.test(request.url)),keyboard:r.keyboard?.emailFocus.id==='contact-email'&&r.keyboard?.phoneFocus.id==='contact-phone'&&r.keyboard?.emailFocus.outlineStyle==='solid'&&parseFloat(r.keyboard?.emailFocus.outlineWidth)>=2&&r.keyboard?.faqOpened&&r.keyboard?.faqClosed};
    if(r.mode==='form'){
      const f=r.form,posts=r.posts;
      Object.assign(checks,{postalValidation:f?.invalidPostal&&f?.errorDescription&&f?.validationFocus&&f?.postalErrorVisible,phoneOptional:f?.phoneFallback&&posts.every(post=>post.phoneEmpty&&post.channel==='whatsapp'),errorRetains:f?.after503?.retained&&f?.after503?.errorVisible&&!f?.after503?.success,localeRetains:f?.languageChange?.retained&&f?.languageChange?.formStillMounted&&f?.languageChange?.url===localOrigin+'/en/kontakt',generic200NotSuccess:!f?.afterGeneric200?.success&&f?.afterGeneric200?.errorVisible&&f?.afterGeneric200?.retained,accepted201:f?.after201?.referenceVisible&&f?.after201?.focusOnSuccess,idempotent:posts.length===3&&new Set(posts.map(post=>post.idempotencyKey)).size===1&&posts.every(post=>post.language==='es'),oneWidget:f?.languageChange?.widgetRemoved&&f?.storage?.maxWidgetActive===1&&f?.storage?.widgetActive===0,noPersonalPersistence:f?.storage?.urlClean&&f?.storage?.storageClean,syntheticOnly:posts.length===3&&posts.every(post=>post.nameIsSynthetic&&post.emailIsSynthetic&&post.messageIsSynthetic&&post.tokenIsSynthetic),responsesIntercepted:r.intercepted.filter(item=>item.path==='/api/contact/messages').map(item=>item.status).join(',')==='503,200,201'});
    }
    Object.assign(checks,{labelledControls:r.semantics?.allLabelled,phoneOptionalAttribute:r.semantics?.phoneOptional,postalKeyboard:r.semantics?.postalNumeric,autocompletion:r.semantics?.attributes?.name?.autocomplete==='name'&&r.semantics?.attributes?.email?.autocomplete==='email'&&r.semantics?.attributes?.phone?.autocomplete==='tel'&&r.semantics?.attributes?.postalCode?.autocomplete==='postal-code',noFloatingKai:!r.semantics?.floatingKaiVisible,kaiDialog:r.keyboard?.kaiOpen&&r.keyboard?.kaiClosed,availability:r.mode==='form'?!r.semantics?.submitDisabled&&r.semantics?.submitContrast>=4.5:r.semantics?.unavailableNotice&&r.semantics?.submitDisabled});
    return{score:Object.values(checks).every(Boolean)?1:0,details:{type:'debugdata',checks,...r}};
  }
}
export default{extends:'lighthouse:default',artifacts:[{id:'ContactFrame',gatherer:new ContactFrame()}],audits:[ContactAudit],categories:{contact:{title:'Contact QA',description:'Local layout and simulated interaction checks, separate from performance metrics.',auditRefs:[{id:'contact-layout',weight:1}]}},settings:{onlyCategories:['contact'],disableFullPageScreenshot:true,throttlingMethod:'provided',formFactor:width<=760?'mobile':'desktop',screenEmulation:{mobile:width<=760,width,height,deviceScaleFactor:1,disabled:false},maxWaitForLoad:10000,maxWaitForFcp:10000}};
