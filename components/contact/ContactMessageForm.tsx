import React, { useEffect, useRef, useState, type FormEvent } from 'react';
import { getContactCopy } from '../../src/contact/contact-copy.ts';
import { CONTACT_CHANNELS, CONTACT_SERVICES, contactLanguage, emptyContactFields, normalizeContactFields, validateContactFields, type ContactFields, type ContactField, type ContactFieldError } from '../../src/contact/intake-contract.ts';
import { acceptedContactResponse, contactRetryIdentity, loadContactTurnstile, type ContactRetryIdentity, type ContactTurnstile } from '../../src/contact/intake-client.ts';
import { publicHref } from '../../src/routing/site-paths.ts';
import './contact-form.css';

type Configuration = { available: boolean; challenge: { provider: 'turnstile'; siteKey: string; action: 'kraken_contact' } | null };
type FormError = 'error' | 'unavailable' | 'rateLimited' | 'verificationRequired' | 'verificationFailed';
export default function ContactMessageForm({ language }: { language: string; onNavigate?: (path: string) => void }) {
  const locale = contactLanguage(language), t = getContactCopy(locale).form;
  const [fields, setFields] = useState<ContactFields>(emptyContactFields);
  const [errors, setErrors] = useState<Partial<Record<ContactField, ContactFieldError>>>({});
  const [configuration, setConfiguration] = useState<Configuration | null>(null);
  const [configRevision, setConfigRevision] = useState(0);
  const [token, setToken] = useState('');
  const [verification, setVerification] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [challengeSize, setChallengeSize] = useState<'compact' | 'flexible'>('compact');
  const [error, setError] = useState<FormError | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const challengeRoot = useRef<HTMLDivElement>(null), confirmation = useRef<HTMLDivElement>(null), form = useRef<HTMLFormElement>(null);
  const challenge = useRef<{ api: ContactTurnstile; id: string } | null>(null);
  const retry = useRef<ContactRetryIdentity | null>(null), honeypot = useRef<HTMLInputElement>(null);
  const alive = useRef(false), busy = useRef(false), request = useRef<AbortController | null>(null);
  useEffect(() => { alive.current = true; return () => { alive.current = false; request.current?.abort(); }; }, []);
  useEffect(() => {
    const controller = new AbortController(); let active = true;
    const timer = setTimeout(() => controller.abort(), 10_000);
    setConfiguration(null);
    fetch('/api/contact/intake/config', { signal: controller.signal, credentials: 'same-origin', cache: 'no-store' })
      .then(async response => {
        const config = await response.json();
        if (!response.ok || typeof config.available !== 'boolean') throw new Error('unavailable');
        if (config.available && (config.challenge?.provider !== 'turnstile' || config.challenge?.action !== 'kraken_contact' || !/^[A-Za-z0-9_-]{10,128}$/.test(config.challenge?.siteKey || ''))) throw new Error('unavailable');
        if (active) setConfiguration(config);
      }).catch(() => { if (active) setConfiguration({ available: false, challenge: null }); })
      .finally(() => clearTimeout(timer));
    return () => { active = false; controller.abort(); clearTimeout(timer); };
  }, [configRevision]);
  useEffect(() => {
    const element = challengeRoot.current;
    if (!element) return;
    const resize = () => setChallengeSize(element.clientWidth >= 300 ? 'flexible' : 'compact');
    resize();
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
    observer?.observe(element);
    return () => observer?.disconnect();
  }, [configuration, reference]);
  useEffect(() => {
    if (!configuration?.available || !configuration.challenge || !challengeRoot.current || reference) return;
    let active = true;
    setToken(''); setVerification('loading');
    loadContactTurnstile().then(api => {
      if (!active || !challengeRoot.current) return;
      const id = api.render(challengeRoot.current, { sitekey: configuration.challenge!.siteKey, action: configuration.challenge!.action,
        language: locale, theme: 'light', size: challengeSize,
        callback: (value: string) => { if (active) { setToken(value); setVerification('ready'); } },
        'expired-callback': () => { if (active) { setToken(''); setVerification('loading'); } },
        'error-callback': () => { if (active) { setToken(''); setVerification('failed'); } },
      });
      challenge.current = { api, id };
    }).catch(() => { if (active) setVerification('failed'); });
    return () => { active = false; const widget = challenge.current; if (widget) { try { widget.api.remove(widget.id); } catch {} challenge.current = null; } };
  }, [configuration, locale, reference, challengeSize]);
  useEffect(() => { if (reference) confirmation.current?.focus({ preventScroll: true }); }, [reference]);

  function change(field: ContactField, value: string) {
    setFields(previous => ({ ...previous, [field]: value }));
    setErrors(previous => ({ ...previous, [field]: undefined }));
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy.current || reference) return;
    const validation = validateContactFields(fields);
    setErrors(validation); setError(null);
    const first = Object.keys(validation)[0] as ContactField | undefined;
    if (first) { (form.current?.elements.namedItem(first) as HTMLElement | null)?.focus(); return; }
    if (!configuration?.available) { setError('unavailable'); return; }
    if (!token) { setError('verificationRequired'); return; }
    busy.current = true; setSubmitting(true);
    const controller = new AbortController(); request.current = controller;
    const timer = setTimeout(() => controller.abort(), 15_000);
    try {
      retry.current = contactRetryIdentity(retry.current, fields, locale);
      const response = await fetch('/api/contact/messages', {
        method: 'POST', credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...normalizeContactFields(fields), idempotencyKey: retry.current.key, language: retry.current.language, website: honeypot.current?.value || '', turnstileToken: token }),
      });
      const result = await response.json().catch(() => null);
      if (!alive.current) return;
      const accepted = acceptedContactResponse(response, result);
      if (accepted) { setReference(accepted); return; }
      const code = result?.error?.code;
      setError(code === 'rate_limited' ? 'rateLimited' : code === 'verification_failed' ? 'verificationFailed' : 'error');
      if (code === 'validation') setErrors(validateContactFields(fields));
    } catch { if (alive.current) setError('error'); }
    finally {
      clearTimeout(timer); busy.current = false; request.current = null;
      if (alive.current) {
        setSubmitting(false); setToken('');
        if (challenge.current) { try { challenge.current.api.reset(challenge.current.id); setVerification('loading'); } catch { setVerification('failed'); } }
      }
    }
  }
  const channelLabels = { email: t.channelEmail, phone: t.channelPhone, whatsapp: t.channelWhatsapp };
  const serviceLabels = { windows: t.serviceWindows, end: t.serviceEnd, regular: t.serviceRegular, deep: t.serviceDeep, moving: t.serviceMoving, unsure: t.serviceUnsure };
  const fieldError = (field: ContactField) => errors[field] ? <p className="contact-field-error" id={'contact-' + field + '-error'}>{t[errors[field]!]}</p> : null;
  const describedBy = (field: ContactField, extra?: string) => [errors[field] ? 'contact-' + field + '-error' : '', extra || ''].filter(Boolean).join(' ') || undefined;
  return <section className="contact-message-section" aria-labelledby="contact-message-title">
    <h2 id="contact-message-title">{t.title}</h2><p className="contact-form-intro">{t.intro}</p>
    {reference ? <div className="contact-form-success" role="status" tabIndex={-1} ref={confirmation}>
      <h3>{t.successTitle}</h3><p>{t.successReference}: <strong>{reference}</strong></p><p>{t.successMessage}</p>
    </div> : <form className="contact-form" method="post" action="/api/contact/messages" ref={form} onSubmit={submit} noValidate aria-busy={submitting}>
      <div className="contact-form-grid">
        <div className="contact-field"><label htmlFor="contact-name">{t.nameLabel}</label><input id="contact-name" name="name" autoComplete="name" maxLength={100} required value={fields.name} onChange={event => change('name', event.target.value)} aria-invalid={!!errors.name} aria-describedby={describedBy('name')} disabled={submitting} />{fieldError('name')}</div>
        <div className="contact-field"><label htmlFor="contact-email">{t.emailLabel}</label><input id="contact-email" name="email" type="email" autoComplete="email" maxLength={254} required value={fields.email} onChange={event => change('email', event.target.value)} aria-invalid={!!errors.email} aria-describedby={describedBy('email')} disabled={submitting} />{fieldError('email')}</div>
        <div className="contact-field"><label htmlFor="contact-phone">{t.phoneLabel} <span>({t.optional})</span></label><input id="contact-phone" name="phone" type="tel" autoComplete="tel" maxLength={40} value={fields.phone} onChange={event => change('phone', event.target.value)} aria-invalid={!!errors.phone} aria-describedby={describedBy('phone', fields.channel !== 'email' && !fields.phone.trim() ? 'contact-phone-fallback' : undefined)} disabled={submitting} />{fieldError('phone')}{fields.channel !== 'email' && !fields.phone.trim() && <p className="contact-field-hint" id="contact-phone-fallback">{t.phoneRequired}</p>}</div>
        <div className="contact-field"><label htmlFor="contact-channel">{t.channelLabel}</label><select id="contact-channel" name="channel" value={fields.channel} onChange={event => change('channel', event.target.value)} aria-invalid={!!errors.channel} aria-describedby={describedBy('channel')} disabled={submitting}>{CONTACT_CHANNELS.map(value => <option value={value} key={value}>{channelLabels[value]}</option>)}</select>{fieldError('channel')}</div>
        <div className="contact-field"><label htmlFor="contact-service">{t.serviceLabel}</label><select id="contact-service" name="service" value={fields.service} onChange={event => change('service', event.target.value)} aria-invalid={!!errors.service} aria-describedby={describedBy('service')} disabled={submitting}>{CONTACT_SERVICES.map(value => <option value={value} key={value}>{serviceLabels[value]}</option>)}</select>{fieldError('service')}</div>
        <div className="contact-field"><label htmlFor="contact-postalCode">{t.postcodeLabel}</label><input id="contact-postalCode" name="postalCode" inputMode="numeric" autoComplete="postal-code" pattern="[1-9][0-9]{3}" maxLength={4} required value={fields.postalCode} onChange={event => change('postalCode', event.target.value)} aria-invalid={!!errors.postalCode} aria-describedby={describedBy('postalCode')} disabled={submitting} />{fieldError('postalCode')}</div>
      </div>
      <div className="contact-field"><label htmlFor="contact-message">{t.messageLabel}</label><textarea id="contact-message" name="message" rows={5} minLength={10} maxLength={4000} required value={fields.message} onChange={event => change('message', event.target.value)} aria-invalid={!!errors.message} aria-describedby={describedBy('message', 'contact-message-hint')} disabled={submitting} /><p className="contact-field-hint" id="contact-message-hint">{t.messageHint}</p>{fieldError('message')}</div>
      <div className="contact-honeypot" aria-hidden="true"><label htmlFor="contact-website">{t.honeypotLabel}</label><input id="contact-website" name="website" ref={honeypot} tabIndex={-1} autoComplete="off" /></div>
      {configuration?.available ? <div className="contact-verification"><div ref={challengeRoot} />{verification !== 'ready' && <p className="contact-field-hint" role="status">{verification === 'failed' ? t.verificationFailed : t.verificationLoading}</p>}{verification === 'failed' && <button className="contact-form-retry" type="button" onClick={() => setConfigRevision(value => value + 1)}>{t.retry}</button>}</div> : <p className="contact-form-notice" role="status">{configuration ? t.unavailable : t.verificationLoading}{configuration && <button className="contact-form-retry" type="button" onClick={() => setConfigRevision(value => value + 1)}>{t.retry}</button>}</p>}
      <noscript><p className="contact-form-notice">{t.unavailable}</p></noscript>
      {error && <p className="contact-form-error" role="alert">{t[error]}</p>}
      <p className="contact-form-privacy">{t.privacyText}{' '}<a href={publicHref('/gdpr', locale)} target="_blank" rel="noopener noreferrer">{t.privacyLink}</a>.</p>
      <button className="contact-form-submit" type="submit" disabled={submitting || !configuration?.available || !token}>{submitting ? t.submitting : error ? t.retry : t.submit}</button>
    </form>}
    <nav className="contact-form-direct" aria-label={t.directContact}><a href="https://wa.me/41774505705" target="_blank" rel="noopener noreferrer">WhatsApp</a><a href="tel:+41774505705">+41 77 450 57 05</a><a href="mailto:kai@krakenpfm.ch">kai@krakenpfm.ch</a></nav>
  </section>;
}
