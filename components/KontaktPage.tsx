import '../src/styles/route-utilities.css';
import React from 'react';
import { Calculator, Clock3, Mail, MessageCircle, Phone } from 'lucide-react';
import { useTranslation } from '../i18n';
import ApprovedHeader from './home/ApprovedHeader';
import ContactMessageForm from './contact/ContactMessageForm';
import ContactCoverageMap from './contact/ContactCoverageMap';
import { getContactCopy } from '../src/contact/contact-copy';
import { CONTACT_SETTINGS, getContactResponseTime } from '../src/contact/settings';
import { publicHref } from '../src/routing/site-paths';
import { requestKaiOpen } from '../src/kai/open';
import { kaiText } from '../src/kai/copy';
import './home/approved-home.css';
import './home/responsive-fixes.css';
import './home/home-language.css';
import './home/device-fixes.css';
import './contact/contact-page.css';

/** Contact is useful before JavaScript: real links, coverage and enquiry content. */
export function ContactContent({ language, onNavigate = () => {} }: { language: string; onNavigate?: (path: string) => void }) {
  const copy = getContactCopy(language);
  const responseTime = getContactResponseTime(language);
  return <main id="main" className="contact-page-main">
    <section id="kraken-contact-real" className="contact-shell container" aria-labelledby="contact-title">
      <header className="contact-intro">
        <div className="contact-intro-copy">
          <p className="contact-eyebrow">{copy.hero.eyebrow}</p>
          <h1 id="contact-title">{copy.hero.title}</h1>
          <p className="contact-intro-description">{copy.hero.intro}</p>
        </div>
        <p className="contact-intro-hours"><Clock3 aria-hidden="true" />{copy.hero.hours}</p>
        <div className="contact-intro-actions">
          <div className="contact-actions">
            <a className="contact-action kr-button kr-button--primary" href={publicHref('/quote', language)}><Calculator aria-hidden="true" />{copy.hero.calculate}</a>
            <a className="contact-action kr-button kr-button--secondary" href="https://wa.me/41774505705" target="_blank" rel="noopener noreferrer"><MessageCircle aria-hidden="true" />{copy.hero.whatsapp}</a>
            <a className="contact-action kr-button kr-button--secondary" href="tel:+41774505705"><Phone aria-hidden="true" />{copy.hero.call}</a>
          </div>
          {responseTime ? <p className="contact-response-time">{responseTime}</p> : null}
        </div>
      </header>

      <div className="contact-main-grid">
        <ContactMessageForm onNavigate={onNavigate} language={language} />
        <ContactCoverageMap language={language} labels={copy.map} />
      </div>

      <section className="contact-person" aria-labelledby="contact-person-title">
        <div className="contact-person-heading">
          <span className="contact-person-avatar" aria-hidden="true">{CONTACT_SETTINGS.ownerPhoto ? <img src={CONTACT_SETTINGS.ownerPhoto.src} alt="" width="72" height="72" loading="lazy" /> : copy.person.initials}</span>
          <div><p className="contact-eyebrow" id="contact-person-title">{copy.person.eyebrow}</p><h2>{copy.person.name}</h2><p>{copy.person.role}</p></div>
        </div>
        <div className="contact-person-links">
          <a href="tel:+41774505705"><Phone aria-hidden="true" /><span><small>{copy.person.phoneLabel}</small><strong>+41 77 450 57 05</strong></span></a>
          <a href="mailto:kai@krakenpfm.ch"><Mail aria-hidden="true" /><span><small>{copy.person.emailLabel}</small><strong>kai@krakenpfm.ch</strong></span></a>
          <p><Clock3 aria-hidden="true" /><span><small>{copy.person.hoursLabel}</small><strong>{copy.hero.hours}</strong></span></p>
          <button className="contact-kai-action kr-button kr-button--secondary" type="button" aria-haspopup="dialog" aria-controls="kai-assistant" onClick={event => requestKaiOpen(null, event.currentTarget)}><MessageCircle aria-hidden="true" />{kaiText(language, 'open')}</button>
        </div>
      </section>

      <section className="contact-faq" aria-labelledby="contact-faq-title">
        <h2 id="contact-faq-title">{copy.faqTitle}</h2>
        <div className="contact-faq-list">{copy.faqs.map(faq => <details key={faq.question}><summary>{faq.question}<span aria-hidden="true">+</span></summary><p>{faq.answer}</p></details>)}</div>
      </section>
    </section>
  </main>;
}

export default function KontaktPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { language } = useTranslation();
  return <div className="kraken-home kraken-contact-page" lang={language}>
    <ApprovedHeader onNavigate={onNavigate} page="contact" />
    <ContactContent language={language} onNavigate={onNavigate} />
  </div>;
}
