import "../src/styles/route-utilities.css";
import React, { useEffect, useRef, useState } from 'react';
import { Map, TrainFront, Waves, Truck, Plus, Minus, LocateFixed, Play, Pause, MapPin, Images, Expand, Clock3, Phone, House, Building2, Search, CornerDownLeft, CarFront, Calculator, X } from 'lucide-react';
import { useTranslation } from '../i18n';
import ApprovedHeader from './home/ApprovedHeader';
import ContactMessageForm from './contact/ContactMessageForm';
import { openHomeCalculator } from '../src/home/calculator';
import { contactText } from './contact/contactTranslations';
import { homeText } from './home/homeTranslations';
import { publicHref } from '../src/routing/site-paths';
import { loadContactConfig, searchContactAddresses, calculateContactRoute } from './contact/contact-api';
import { mountKrakenContact, type KrakenD3, type KrakenContactController, type KrakenMapData } from './contact/contact-controller.js';
import './home/approved-home.css';
import './home/responsive-fixes.css';
import './home/home-language.css';
import './home/device-fixes.css';
import './contact/contact.css';
import './contact/integration.css';

const contactIcons = { map: Map, 'train-front': TrainFront, waves: Waves, truck: Truck, plus: Plus, minus: Minus, 'locate-fixed': LocateFixed, play: Play, pause: Pause, 'map-pin': MapPin, images: Images, expand: Expand, 'clock-3': Clock3, phone: Phone, house: House, 'building-2': Building2, search: Search, 'corner-down-left': CornerDownLeft, 'car-front': CarFront, calculator: Calculator, x: X };
function ContactIcon({name, ...props}: {name: keyof typeof contactIcons; className?: string; hidden?: boolean; 'aria-hidden'?: boolean | 'true' | 'false'}) {
  const Icon = contactIcons[name];
  return <Icon size={18} aria-hidden="true" {...props} />;
}

type ContactWindow = Window & { d3?: KrakenD3 };
let d3Request: Promise<KrakenD3> | undefined;
function loadD3(): Promise<KrakenD3> {
  const existing = (window as ContactWindow).d3;
  if (existing?.select && existing?.zoom) return Promise.resolve(existing);
  if (d3Request) return d3Request;
  d3Request = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = '/kraken-contact/vendor/d3-7.9.0.min.js';
    script.async = true;
    script.dataset.krakenContactVendor = 'true';
    const clean = () => { clearTimeout(timeout); script.onload = null; script.onerror = null; };
    const fail = () => { clean(); script.remove(); d3Request = undefined; reject(new Error('Contact map dependency unavailable.')); };
    const timeout = setTimeout(fail, 20000);
    script.onload = () => {
      const d3 = (window as ContactWindow).d3;
      if (!d3?.select || !d3?.zoom) { fail(); return; }
      clean(); resolve(d3);
    };
    script.onerror = fail;
    document.head.append(script);
  });
  return d3Request;
}

/** Native DOM shared by client navigation and initial server HTML. */
export function ContactContent({language, onNavigate = () => {}}: {language: string; onNavigate?: (path:string) => void}) {
  const rootRef = useRef<HTMLElement>(null);
  const [loadState,setLoadState] = useState<'loading'|'ready'|'error'>('loading');
  const [attempt,setAttempt] = useState(0);
  const t = (source:string) => contactText(language,source);
  const calculatorUrl = publicHref('/quote', language);
  const handleQuote = (event:React.MouseEvent<HTMLAnchorElement>) => {
    if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); openHomeCalculator(null,path=>onNavigate(publicHref(path,language)));
  };
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let cancelled = false;
    let controller:KrakenContactController|undefined;
    const abort = new AbortController();
    setLoadState('loading');
    const controls = [...root.querySelectorAll<HTMLButtonElement>('button')];
    controls.forEach(button => { button.disabled = true; });
    void Promise.all([
      loadD3(),
      loadContactConfig(abort.signal),
      fetch('/kraken-contact/data/contact-map-data.json', {signal:abort.signal, credentials:'same-origin', headers:{Accept:'application/json'}}).then(response => {
        if (!response.ok) throw new Error('Contact map data unavailable.');
        return response.json() as Promise<KrakenMapData>;
      }),
    ]).then(([d3,config,data]) => {
      if (cancelled) return;
      controls.forEach(button => { button.disabled = false; });
      controller = mountKrakenContact(root,{d3,data,assets:{logo:'/kraken-contact/assets/logo-kraken-azul.webp',exterior:'/kraken-contact/assets/contact-exterior.webp',interior:'/kraken-contact/assets/contact-interior.webp'},live:true,routingAvailable:config.routing.available,search:(query,signal)=>searchContactAddresses(query,language,signal),route:calculateContactRoute,t:source=>contactText(language,source),locale:language==='de' || language==='de-CH'?'de-CH':language});
      setLoadState('ready');
    }).catch(error => {
      if (cancelled || abort.signal.aborted) return;
      controller?.destroy();
      root.querySelector<HTMLElement>('.kr-result')?.setAttribute('hidden','');
      controls.forEach(button => { button.disabled = true; });
      setLoadState('error');
      console.error('Contact map could not initialize.',error);
    });
    return () => {cancelled=true;abort.abort();controller?.destroy();};
  },[language,calculatorUrl,attempt]);
  return <main id="main" className="contact-page-main">
    <div className="contact-map-status" role="status" aria-live="polite">
      {loadState==='loading'?t('Karte wird geladen …'):loadState==='error'?<>{t('Die interaktive Karte konnte nicht geladen werden. Telefon, E-Mail und Rechner stehen Ihnen weiterhin zur Verfügung.')} <button type="button" onClick={()=>setAttempt(value=>value+1)}>{t('Erneut versuchen')}</button></>:null}
    </div>
    <div data-kraken-contact-status={loadState} aria-busy={loadState==='loading'}>
<section ref={rootRef} id="kraken-contact-real" lang={language} aria-labelledby="kr-heading">
  <header className="kr-intro">
    <div><p className="kr-overline">{t('KONTAKT · SCHAFFHAUSEN')}</p><h1 id="kr-heading">{t('Näher dran.')}<br /><span>{t('Persönlich für Sie da.')}</span></h1></div>
    <p>{t('Ihr Zuhause. Ihr nächster Schritt.')}<br />{t('Wir machen es Ihnen einfach.')}</p>
  </header>
  <div className="kr-layout">
    <div className="kr-map" aria-label={t('Interaktive Karte für Adressen in der Schweiz')}>
      <svg className="kr-geography" role="img" aria-label={t('Strassenkarte für die Schweiz')}></svg>
      <div className="kr-map-heading"><span className="kr-map-title"><ContactIcon name="map" aria-hidden="true" /> {t('Schweiz · Ihre Route')}</span><span className="kr-prototype">{t('Routenplanung')}</span></div>
      <p className="kr-basemap-status" role="status" aria-live="polite" hidden />
      <div className="kr-map-help">{t('Karte ziehen · + / − zum Zoomen')}</div>
      <button className="kr-office-marker cursor-interaction" type="button" aria-label={t('Kraken Standort und Bürokonzept ansehen')}>
        <span className="kr-marker-photo kr-photo-scene" data-scene="exterior"><img className="kr-scene-image" src="/kraken-contact/assets/contact-exterior.webp" decoding="async" data-photo-source="exterior" alt={t('Fotorealistisches Konzept einer Kraken-Geschäftsstelle')} /><span className="kr-photo-sign"><img className="kr-original-logo" src="/kraken-contact/assets/logo-kraken-azul.webp" decoding="async" alt="" /></span></span>
        <span className="kr-marker-caption"><img className="kr-original-logo" src="/kraken-contact/assets/logo-kraken-azul.webp" decoding="async" alt={t('Kraken')} /><small>{t('Standort Schaffhausen')}</small></span><span className="kr-marker-point"></span>
      </button>
      <div className="kr-destination-markers">
        <button className="kr-place-marker cursor-interaction" type="button" data-place="0" aria-label={t('Route zum Bahnhof Schaffhausen')}><span><ContactIcon name="train-front" aria-hidden="true" /></span><b>{t('Bahnhof')}</b></button>
        <button className="kr-place-marker cursor-interaction" type="button" data-place="1" aria-label={t('Route zum Bahnhof Neuhausen')}><span><ContactIcon name="train-front" aria-hidden="true" /></span><b>{t('Neuhausen')}</b></button>
        <button className="kr-place-marker cursor-interaction" type="button" data-place="2" aria-label={t('Route zum Rheinfall')}><span><ContactIcon name="waves" aria-hidden="true" /></span><b>{t('Rheinfall')}</b></button>
      </div>
      <button className="kr-selected-marker" type="button" hidden aria-label={t('Ihre gewählte Adresse')}><ContactIcon name="map-pin" /><span /></button>
      <div className="kr-travel-marker" hidden aria-hidden="true"><ContactIcon name="truck" aria-hidden="true" /></div>
      <div className="kr-zoom-controls" aria-label={t('Kartensteuerung')}><button className="cursor-interaction" type="button" data-map-action="in" aria-label={t('Karte vergrössern')}><ContactIcon name="plus" aria-hidden="true" /></button><button className="cursor-interaction" type="button" data-map-action="out" aria-label={t('Karte verkleinern')}><ContactIcon name="minus" aria-hidden="true" /></button><button className="cursor-interaction" type="button" data-map-action="reset" aria-label={t('Gesamte Route zentrieren')}><ContactIcon name="locate-fixed" aria-hidden="true" /></button></div>
      <div className="kr-map-bottom"><button className="kr-route-player cursor-interaction" type="button" aria-label={t('Route abspielen')}><ContactIcon name="play" className="kr-play-icon" aria-hidden="true" /><ContactIcon name="pause" className="kr-pause-icon" hidden aria-hidden="true" /><span>{t('Route ansehen')}</span></button><span className="kr-attribution">© swisstopo · © OpenStreetMap contributors / openrouteservice</span></div>
    </div>
    <aside className="kr-contact" aria-label={t('Kraken Kontakt und Anfahrt')}>
      <div className="kr-contact-top"><span className="kr-logo-lockup"><img className="kr-original-logo" src="/kraken-contact/assets/logo-kraken-azul.webp" decoding="async" alt={t('Kraken')} /><span>{homeText(language,'Reinigung & kleine Umzüge')}</span></span><span className="kr-contact-location"><ContactIcon name="map-pin" aria-hidden="true" /></span></div>
      <button className="kr-gallery-cover kr-photo-scene cursor-interaction" data-scene="exterior" type="button" aria-label={t('Bilder der Bürogestaltung vergrössern')}><img className="kr-scene-image" src="/kraken-contact/assets/contact-exterior.webp" decoding="async" data-photo-source="exterior" alt={t('Fassade als fotorealistischer Gestaltungsentwurf')} /><span className="kr-photo-sign"><img className="kr-original-logo" src="/kraken-contact/assets/logo-kraken-azul.webp" decoding="async" alt="" /></span><span className="kr-gallery-cover-label"><ContactIcon name="images" aria-hidden="true" /> {t('2 Ansichten')}</span><span className="kr-expand"><ContactIcon name="expand" aria-hidden="true" /></span></button>
      <p className="kr-concept-note">{t('Konzeptbilder · keine Fotos des Standorts')}</p>
      <div className="kr-contact-body">
        <div className="kr-address"><ContactIcon name="map-pin" aria-hidden="true" /><p>Seewadelstrasse 3<br /><strong>8203 Schaffhausen</strong></p></div>
        <div className="kr-hours"><ContactIcon name="clock-3" aria-hidden="true" /><span>{t('Kontaktzeiten')}: {t('Mo–So')} <strong>09:00–19:00</strong><small>Europe/Zurich</small></span></div>
        <a className="kr-phone cursor-interaction" href="tel:+41774505705"><ContactIcon name="phone" aria-hidden="true" /> +41 77 450 57 05</a>
        <a className="kr-email cursor-interaction" href="mailto:kai@krakenpfm.ch">kai@krakenpfm.ch</a>
        <p className="kr-example-mode">{t('Ihre Adresse. Unsere Anfahrt.')}</p><p className="kr-mode-note">{t('Route und Fahrzeit ab unserem Standort in Schaffhausen.')}</p><div className="kr-line"></div>
        <h3>{t('Wie finden wir zueinander?')}</h3>
        <div className="kr-direction" aria-label={t('Fahrtrichtung')}><button className="cursor-interaction" type="button" data-direction="outbound" aria-pressed="true"><ContactIcon name="house" aria-hidden="true" /> {t('Zu Ihnen')}</button><button className="cursor-interaction" type="button" data-direction="inbound" aria-pressed="false"><ContactIcon name="building-2" aria-hidden="true" /> {t('Zu Kraken')}</button></div>
        <label className="kr-input-label" htmlFor="kr-address-input">{t('Adresse oder Postleitzahl in der Schweiz')}</label>
        <div className="kr-search" role="search"><ContactIcon name="search" aria-hidden="true" /><input disabled={loadState !== 'ready'} id="kr-address-input" type="text" placeholder={t('Strasse, Hausnummer, PLZ oder Ort')} defaultValue="" autoComplete="off" spellCheck={false} aria-describedby="kr-example-note" /><button className="cursor-interaction" type="button" aria-label={t('Adresse suchen')}><ContactIcon name="corner-down-left" aria-hidden="true" /></button></div>
        <p className="kr-search-status" role="status" aria-live="polite" />
        <p className="kr-precision-note" hidden>{t('Bei einer Postleitzahl wird bis zur Ortsmitte gerechnet. Für einen genauen Zielpunkt geben Sie die vollständige Adresse ein.')}</p>
        <div className="kr-suggestions" aria-label={t('Passende Adressen')} hidden></div>
        <div className="kr-example-options" id="kr-example-note"><span>{t('Beispiele')}</span><button className="cursor-interaction" type="button" data-example="0">{t('Bahnhof')}</button><button className="cursor-interaction" type="button" data-example="1">{t('Bahnhof Neuhausen')}</button><button className="cursor-interaction" type="button" data-example="2">{t('Rheinfall')}</button></div>
        <p className="kr-address-error" role="alert" hidden></p>
        <div hidden className="kr-result" aria-live="polite" aria-atomic="true"><div className="kr-result-metrics"><strong className="kr-distance">— <small>{t('km')}</small></strong><span className="kr-duration">—</span><ContactIcon name="car-front" aria-hidden="true" /></div><p className="kr-result-direction">—</p><p className="kr-result-note">{t('Geschätzte Fahrzeit · ohne Live-Verkehr')}</p></div>
        <a className="kr-quote cursor-interaction kr-button kr-button--primary" href={calculatorUrl} onClick={handleQuote}><ContactIcon name="calculator" aria-hidden="true" /> {homeText(language,'Offerte berechnen')}</a>
      </div>
    </aside>
    <section role="dialog" aria-modal="true" tabIndex={-1} aria-labelledby="kr-gallery-title" className="kr-gallery-panel" aria-label={t('Bildergalerie: Kraken Bürokonzept')} hidden>
      <div className="kr-gallery-header"><div><p>{t('RAUM FÜR PERSÖNLICHEN SERVICE')}</p><h3 id="kr-gallery-title">{t('Ein neuer Blick auf Kraken.')}</h3></div><button className="kr-gallery-close cursor-interaction" type="button" aria-label={t('Bildergalerie schliessen')}><ContactIcon name="x" aria-hidden="true" /></button></div>
      <div className="kr-gallery-stage kr-photo-scene" data-scene="exterior"><img className="kr-scene-image" src="/kraken-contact/assets/contact-exterior.webp" decoding="async" alt={t('Fotorealistischer Gestaltungsentwurf der Kraken-Fassade')} /><span className="kr-photo-sign"><img className="kr-original-logo" src="/kraken-contact/assets/logo-kraken-azul.webp" decoding="async" alt={t('Originales Kraken-Logo')} /></span></div>
      <div className="kr-gallery-nav"><button className="cursor-interaction" type="button" data-gallery="exterior" aria-pressed="true">{t('Fassade')}</button><button className="cursor-interaction" type="button" data-gallery="interior" aria-pressed="false">{t('Empfang')}</button><span>{t('Konzeptbilder · keine Fotos des Standorts')}</span></div>
    </section>
  </div>
  <footer className="kr-footer"><span>{t('Persönlich erreichbar. Einfach geplant.')}</span><p>{t('Zürich')} <b>·</b> {t('Schaffhausen')} <b>·</b> {t('Winterthur')}</p></footer>
</section>

    </div>
    <ContactMessageForm onNavigate={onNavigate} language={language} />
  </main>;
}

export default function KontaktPage({onNavigate}: {onNavigate:(path:string)=>void}) {
  const {language} = useTranslation();
  return <div className="kraken-home kraken-contact-page" lang={language}>
    <ApprovedHeader onNavigate={onNavigate} page="contact" />
    <ContactContent language={language} onNavigate={onNavigate} />
  </div>;
}
