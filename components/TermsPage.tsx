import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Download,Printer,Search,X} from 'lucide-react';
import {useTranslation} from '../i18n';
import {getTermsDocument} from '../src/legal/terms-document.ts';
import {getTermsUiCopy,searchTermsSections,termsPdfHref} from '../src/legal/terms-tools.ts';
import {publicHref,routeLanguage} from '../src/routing/site-paths.ts';
import './legal/terms-page.css';
interface TermsPageProps{onNavigate:(page:string)=>void;}
const GROUPS=[[1,5],[6,10],[11,17]] as const;
/** A compound-word break changes layout only, never the literal title text. */
function readableTitle(title:string,language:string):React.ReactNode{
  const compound='Geschäftsbedingungen';
  if(language!=='de'||!title.includes(compound))return title;
  const index=title.indexOf(compound);
  return <>{title.slice(0,index)}<span className="kr-terms-title-compound">Geschäfts<wbr/>bedingungen</span>{title.slice(index+compound.length)}</>;
}
/** Full native text is present in the server render; tools only enhance reading. */
const TermsPage:React.FC<TermsPageProps>=()=>{
  const {language,setLanguage}=useTranslation(),locale=routeLanguage(language)||'de';
  const document=useMemo(()=>getTermsDocument(locale),[locale]),copy=getTermsUiCopy(locale);
  const [query,setQuery]=useState(''),[active,setActive]=useState(1);
  const mobileContents=useRef<HTMLDetailsElement>(null);
  const pageRef=useRef<HTMLElement>(null);
  const results=useMemo(()=>searchTermsSections(document.sections,query),[document,query]);
  const searching=Boolean(query.trim());
  useEffect(()=>{setQuery('');},[locale]);
  useEffect(()=>{
    const header=globalThis.document.querySelector<HTMLElement>('.site-header');
    const page=pageRef.current;
    if(!header||!page)return;
    const measure=()=>page.style.setProperty('--terms-header-height',`${Math.ceil(header.getBoundingClientRect().height)}px`);
    measure();
    if(typeof ResizeObserver==='undefined')return;
    const observer=new ResizeObserver(measure);observer.observe(header);
    return()=>observer.disconnect();
  },[]);
  useEffect(()=>{
    const readHash=()=>{const match=/^#agb-(\d+)$/.exec(window.location.hash);if(match&&Number(match[1])>=1&&Number(match[1])<=17)setActive(Number(match[1]));};
    readHash();window.addEventListener('hashchange',readHash);
    if(typeof IntersectionObserver==='undefined')return()=>window.removeEventListener('hashchange',readHash);
    const visible=new Map<number,number>();
    const observer=new IntersectionObserver(entries=>{
      for(const entry of entries){const number=Number((entry.target as HTMLElement).dataset.agbNumber);if(entry.isIntersecting)visible.set(number,entry.boundingClientRect.top);else visible.delete(number);}
      const next=[...visible].sort((a,b)=>Math.abs(a[1]-150)-Math.abs(b[1]-150))[0];if(next)setActive(next[0]);
    },{rootMargin:'-12% 0px -55% 0px',threshold:0});
    globalThis.document.querySelectorAll<HTMLElement>('[data-agb-number]').forEach(element=>observer.observe(element));
    return()=>{window.removeEventListener('hashchange',readHash);observer.disconnect();};
  },[locale]);
  const goToSection=(number:number,event:React.MouseEvent<HTMLAnchorElement>)=>{
    if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    setActive(number);if(mobileContents.current)mobileContents.current.open=false;
    requestAnimationFrame(()=>globalThis.document.getElementById(`agb-title-${number}`)?.focus({preventScroll:true}));
  };
  const contents=(prefix:string)=><div className="kr-terms-contents-inner">
    <p className="kr-terms-index-label">{copy.contents}</p>
    <div className="kr-terms-search">
      <label htmlFor={`${prefix}-search`} className="kr-terms-sr-only">{copy.search}</label><Search size={18} aria-hidden="true"/>
      <input id={`${prefix}-search`} type="search" value={query} placeholder={copy.search} autoComplete="off" aria-controls={`${prefix}-results`} onChange={event=>setQuery(event.target.value)}/>
      {searching&&<button type="button" aria-label={copy.clear} onClick={event=>{setQuery('');event.currentTarget.closest('.kr-terms-search')?.querySelector('input')?.focus();}}><X size={16} aria-hidden="true"/></button>}
    </div>
    <div id={`${prefix}-results`}>
      {searching?<><p className="kr-terms-result-count" role="status">{results.length?copy.resultCount(results.length):copy.noResults}</p><ul className="kr-terms-results" aria-label={copy.results}>{results.map(result=><li key={result.id}><a href={`#${result.id}`} onClick={event=>goToSection(result.number,event)}><span>{result.title}</span><small>{result.snippet}</small></a></li>)}</ul></>:GROUPS.map(([start,end],index)=><div className="kr-terms-index-group" key={start}><p>{copy.groups[index]}</p><ol start={start}>{document.sections.filter(section=>section.number>=start&&section.number<=end).map(section=><li key={section.number}><a href={`#agb-${section.number}`} onClick={event=>goToSection(section.number,event)} aria-current={active===section.number?'location':undefined}>{section.title}</a></li>)}</ol></div>)}
    </div>
    <p className="kr-terms-index-contact">{copy.questions}<br/><a href="mailto:kai@krakenpfm.ch">kai@krakenpfm.ch</a></p>
  </div>;
  return <main id="main" ref={pageRef} className="kr-terms-page" lang={document.language} data-terms-version={document.version}>
    <style media="print">{'@page { size: A4; margin: 18mm 17mm 20mm; }'}</style>
    <div className="kr-terms-container">
      <nav className="kr-terms-breadcrumb" aria-label={copy.breadcrumbLabel}><a href={publicHref('/',locale)}>{copy.home}</a><span aria-hidden="true">/</span><span aria-current="page">{copy.breadcrumb}</span></nav>
      <header className="kr-terms-hero"><div className="kr-terms-hero-copy"><p className="kr-terms-eyebrow">{copy.eyebrow}</p><h1>{readableTitle(document.title,document.language)}</h1><p className="kr-terms-date">{document.dateLabel}</p><div className="kr-terms-tools"><button type="button" onClick={()=>window.print()}><Printer size={18} aria-hidden="true"/>{copy.print}</button><a href={termsPdfHref(document.version,document.language)} download><Download size={18} aria-hidden="true"/>{copy.download}</a></div></div>
        <svg className="kr-terms-document-art" viewBox="0 0 190 195" aria-hidden="true" focusable="false"><defs><linearGradient id="kr-terms-glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".4"/><stop offset="1" stopColor="#b7f3d7" stopOpacity=".08"/></linearGradient></defs><rect x="33" y="22" width="119" height="153" rx="14" fill="#b7f3d7" opacity=".11" transform="rotate(-11 92 98)"/><path d="M55 15h66l34 35v111a14 14 0 0 1-14 14H55a14 14 0 0 1-14-14V29a14 14 0 0 1 14-14Z" fill="url(#kr-terms-glass)" stroke="#c9e7ee" strokeOpacity=".6"/><path d="M120 16v25a10 10 0 0 0 10 10h24M64 78h67M64 98h67M64 118h49M64 138h39" fill="none" stroke="#e1f6f5" strokeWidth="4" strokeLinecap="round" opacity=".75"/><circle cx="145" cy="153" r="24" fill="#b7f3d7"/><path d="m134 153 8 8 14-17" fill="none" stroke="#062d52" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </header>
      {document.translationNotice&&<aside className="kr-terms-translation-note"><p>{document.translationNotice} <a href="/terms?lang=de" onClick={event=>{if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();setLanguage('de');}}>{copy.german}</a></p></aside>}
      <nav className="kr-terms-shortcuts" aria-label={copy.quickLabel}><a href="#agb-4" onClick={event=>goToSection(4,event)}><strong><span className="kr-terms-shortcut-full">{copy.quickPayment}</span><span className="kr-terms-shortcut-short">{copy.quickMobile[0]}</span></strong><span>{copy.section(4)}</span></a><a href="#agb-7" onClick={event=>goToSection(7,event)}><strong><span className="kr-terms-shortcut-full">{copy.quickCancellation}</span><span className="kr-terms-shortcut-short">{copy.quickMobile[1]}</span></strong><span>{copy.section(7)}</span></a><a href="#agb-9" onClick={event=>goToSection(9,event)}><strong><span className="kr-terms-shortcut-full">{copy.quickGuarantee}</span><span className="kr-terms-shortcut-short">{copy.quickMobile[2]}</span></strong><span>{copy.guaranteeSection}</span></a></nav>
      <div className="kr-terms-reading-layout"><aside className="kr-terms-sidebar" aria-label={copy.contents}>{contents('kr-terms-desktop')}</aside><details className="kr-terms-mobile-contents" ref={mobileContents} data-disclosure-motion="off"><summary>{copy.mobileContents}</summary>{contents('kr-terms-mobile')}</details>
        <article className="kr-terms-paper" aria-label={copy.documentLabel}>{document.sections.map(section=><section className="kr-terms-section" id={`agb-${section.number}`} data-agb-number={section.number} key={section.number} aria-labelledby={`agb-title-${section.number}`}><h2 id={`agb-title-${section.number}`} tabIndex={-1}>{section.title}</h2>{section.blocks.map((block,index)=>block.type==='paragraph'?<p key={index}>{block.text}</p>:<ul key={index}>{block.items.map((item,itemIndex)=><li key={itemIndex}>{item}</li>)}</ul>)}</section>)}<footer className="kr-terms-contact"><p>{document.contact}</p><p className="kr-terms-print-date">{document.dateLabel}</p></footer></article>
      </div>
    </div>
  </main>;
};
export default TermsPage;
