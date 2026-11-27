import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Building2,CalendarDays,ChevronDown,FileText,List,Mail,Phone,Printer} from 'lucide-react';
import {useTranslation} from '../i18n';
import {getImpressumDocument,type ImpressumSection} from '../src/legal/impressum-document.ts';
import {publicHref} from '../src/routing/site-paths.ts';
import './legal/impressum-page.css';

interface ImpressumPageProps{onNavigate:(page:string)=>void;}
/** A safe line-break opportunity keeps the supplied German label's text unchanged. */
function readableLabel(label:string,language:string):React.ReactNode{
  if(language!=='de'||!label.includes('Unternehmensangaben'))return label;
  const index=label.indexOf('Unternehmensangaben');
  return <>{label.slice(0,index)}Unternehmens<wbr/>angaben{label.slice(index+'Unternehmensangaben'.length)}</>;
}

/** Uses the existing page shell and language context; the complete notice is server-renderable. */
const ImpressumPage:React.FC<ImpressumPageProps>=()=>{
  const {language}=useTranslation();
  const copy=useMemo(()=>getImpressumDocument(language),[language]);
  const page=useRef<HTMLElement>(null),mobileToc=useRef<HTMLDetailsElement>(null);
  const pendingFocus=useRef<number|null>(null);
  const [active,setActive]=useState('company');

  useEffect(()=>{
    const root=page.current,header=globalThis.document.querySelector<HTMLElement>('.site-header');
    if(!root)return;
    let frame:number|null=null;
    const sections=[...root.querySelectorAll<HTMLElement>('[data-impressum-section]')];
    const known=new Set(sections.map(section=>section.id));
    const update=()=>{
      frame=null;
      const threshold=(header?.getBoundingClientRect().height||0)+28;
      let selected=sections[0];
      for(const section of sections)if(section.getBoundingClientRect().top<=threshold)selected=section;
      if(selected)setActive(selected.id);
    };
    const queue=()=>{if(frame===null)frame=requestAnimationFrame(update);};
    const measure=()=>{if(header)root.style.setProperty('--impressum-header-height',`${Math.ceil(header.getBoundingClientRect().height)}px`);queue();};
    const hash=()=>{const id=window.location.hash.slice(1);if(known.has(id))setActive(id);queue();};
    measure();hash();
    // A selector change keeps the existing section fragment meaningful after text reflows.
    const initialTarget=sections.find(section=>section.id===window.location.hash.slice(1));
    initialTarget?.scrollIntoView({block:'start',behavior:'instant'});
    const observer=header&&typeof ResizeObserver!=='undefined'?new ResizeObserver(measure):null;
    if(header)observer?.observe(header);
    window.addEventListener('scroll',queue,{passive:true});window.addEventListener('resize',measure);window.addEventListener('hashchange',hash);
    return()=>{
      window.removeEventListener('scroll',queue);window.removeEventListener('resize',measure);window.removeEventListener('hashchange',hash);observer?.disconnect();
      if(frame!==null)cancelAnimationFrame(frame);
      if(pendingFocus.current!==null){cancelAnimationFrame(pendingFocus.current);pendingFocus.current=null;}
    };
  },[copy.language]);

  const jump=(event:React.MouseEvent<HTMLAnchorElement>,id:string)=>{
    if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    const target=page.current?.querySelector<HTMLElement>(`[data-impressum-section="${id}"]`);
    if(!target)return;
    event.preventDefault();setActive(id);if(mobileToc.current)mobileToc.current.open=false;
    if(window.location.hash!==`#${id}`)window.history.pushState(window.history.state,'',`#${id}`);
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({block:'start',behavior:reduced?'instant':'smooth'});
    if(pendingFocus.current!==null)cancelAnimationFrame(pendingFocus.current);
    pendingFocus.current=requestAnimationFrame(()=>{
      pendingFocus.current=null;page.current?.querySelector<HTMLElement>(`#impressum-title-${id}`)?.focus({preventScroll:true});
    });
  };
  const indexLinks=<nav className="ln-toc-links" aria-label={copy.contents}>{copy.sections.map(section=><a key={section.id} href={`#${section.id}`} aria-current={active===section.id?'location':undefined} onClick={event=>jump(event,section.id)}>{readableLabel(section.title,copy.language)}</a>)}</nav>;
  const iconFor=(section:ImpressumSection)=>section.id==='company'?<Building2 className="ln-icon" aria-hidden="true"/>:section.id==='register'?<CalendarDays className="ln-icon" aria-hidden="true"/>:<Mail className="ln-icon" aria-hidden="true"/>;

  return <main id="main" ref={page} className="kr-impressum-page" lang={copy.language}>
    <style media="print">{'@page { margin: 16mm; }'}</style>
    <div className="ln-main">
      <nav className="ln-breadcrumb" aria-label={copy.nav.home}><a href={publicHref('/',copy.language)}>{copy.nav.home}</a><span aria-hidden="true">/</span><span aria-current="page">{copy.title}</span></nav>
      <section className="ln-hero" aria-labelledby="impressum-legal-title">
        <div className="ln-hero-copy"><p className="ln-eyebrow">{copy.eyebrow}</p><h1 id="impressum-legal-title">{copy.title}</h1><p className="ln-lead">{copy.lead}</p><p className="ln-date"><FileText className="ln-icon" aria-hidden="true"/><span>{copy.updatedLabel}: <time dateTime={copy.common.updatedAt}>{copy.date}</time></span></p></div>
        <div className="ln-hero-right"><img className="ln-hero-art" src="/legal/impressum-document.svg" alt="" width="148" height="172" aria-hidden="true" loading="lazy" decoding="async"/><button type="button" className="ln-button ln-button-print" onClick={()=>window.print()}><Printer className="ln-icon" aria-hidden="true"/><span>{copy.print}</span></button></div>
      </section>
      <nav className="ln-quick-links" aria-label={copy.contents}>{copy.sections.slice(0,3).map(section=><a key={section.id} href={`#${section.id}`} onClick={event=>jump(event,section.id)}><span className="ln-quick-icon">{iconFor(section)}</span><span>{readableLabel(section.title,copy.language)}</span></a>)}</nav>
      <div className="ln-layout">
        <aside className="ln-sidebar"><div className="ln-sidebar-inner"><h2>{copy.contents}</h2>{indexLinks}<div className="ln-help"><h3>{copy.helpTitle}</h3><p>{copy.helpText}</p><a href={`mailto:${copy.common.email}`}>{copy.common.email}</a><a href={copy.common.phoneHref}>{copy.common.phone}</a></div></div></aside>
        <div className="ln-reading-column">
          <details className="ln-mobile-toc" ref={mobileToc} data-disclosure-motion="off"><summary aria-label={copy.tocToggle}><List className="ln-icon" aria-hidden="true"/><span>{copy.contents}</span><ChevronDown className="ln-icon" aria-hidden="true"/></summary>{indexLinks}</details>
          <article className="ln-document" aria-labelledby="impressum-legal-title">
            {copy.sections.map(section=><section className="ln-section" id={section.id} key={section.id} data-impressum-section={section.id} aria-labelledby={`impressum-title-${section.id}`}>
              <h2 id={`impressum-title-${section.id}`} tabIndex={-1}>{readableLabel(section.title,copy.language)}</h2>
              {section.rows&&<dl className={`ln-facts${section.id==='contact'?' ln-contact-facts':''}`}>{section.rows.map((row,index)=><div className="ln-fact" key={index}><dt>{row.label}</dt><dd>{row.kind==='email'?<a className="ln-inline-contact" href={`mailto:${copy.common.email}`}><Mail className="ln-icon" aria-hidden="true"/><span>{row.value}</span></a>:row.kind==='phone'?<a className="ln-inline-contact" href={copy.common.phoneHref}><Phone className="ln-icon" aria-hidden="true"/><span>{row.value}</span></a>:row.value}</dd></div>)}</dl>}
              {section.uidLabel&&<dl className="ln-register-data"><dt>{section.uidLabel}</dt><dd><a className="ln-uid" href={copy.common.uidUrl} target="_blank" rel="noopener noreferrer"><CalendarDays className="ln-icon" aria-hidden="true"/><span>{section.uidLinkText}</span></a></dd></dl>}
              {section.paragraphs?.map((paragraph,index)=><p className={section.id==='register'&&index===1?'ln-tax-note':undefined} key={index}>{paragraph}</p>)}
              {section.links&&<div className="ln-related">{section.links.map((link,index)=><React.Fragment key={link.path}>{index>0&&<span className="ln-related-separator" aria-hidden="true">·</span>}<a href={publicHref(link.path,copy.language)}><FileText className="ln-icon" aria-hidden="true"/><span>{link.label}</span></a></React.Fragment>)}</div>}
            </section>)}
          </article>
        </div>
      </div>
    </div>
  </main>;
};
export default ImpressumPage;
