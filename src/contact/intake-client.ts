import { normalizeContactFields, validContactReference, type ContactFields } from './intake-contract.ts';
export type ContactRetryIdentity = { signature: string; key: string; language: string };
/** Memory only: changing locale cannot duplicate a request whose result is unknown. */
export function contactRetryIdentity(previous: ContactRetryIdentity | null, fields: ContactFields, language: string, uuid = () => crypto.randomUUID()): ContactRetryIdentity {
  const signature = JSON.stringify(normalizeContactFields(fields));
  return previous?.signature === signature ? previous : { signature, key: uuid(), language };
}
export function acceptedContactResponse(response: { ok: boolean }, body: unknown): string | null {
  if (!response.ok || !body || typeof body !== 'object') return null;
  const result = body as Record<string, unknown>;
  return result.accepted === true && validContactReference(result.reference) ? result.reference : null;
}
export type ContactTurnstile = { render(container: HTMLElement, options: Record<string, unknown>): string; remove(widget: string): void; reset(widget: string): void };
let loading: Promise<ContactTurnstile> | null = null;
export function loadContactTurnstile(): Promise<ContactTurnstile> {
  const runtime = window as Window & { turnstile?: ContactTurnstile };
  if (runtime.turnstile) return Promise.resolve(runtime.turnstile);
  if (loading) return loading;
  loading = new Promise<ContactTurnstile>((resolve, reject) => {
    const source = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    let script = document.querySelector<HTMLScriptElement>('script[data-kraken-contact-turnstile]');
    if (script && script.src !== source) { reject(new Error('verification_unavailable')); return; }
    const created = !script;
    if (!script) { script = document.createElement('script'); script.src = source; script.async = true; script.defer = true; script.dataset.krakenContactTurnstile = 'true'; }
    const cleanup = () => { clearTimeout(timer); script!.removeEventListener('load', ready); script!.removeEventListener('error', failed); };
    const ready = () => { cleanup(); runtime.turnstile ? resolve(runtime.turnstile) : failed(); };
    const failed = () => { cleanup(); if (created) script!.remove(); reject(new Error('verification_unavailable')); };
    const timer = setTimeout(failed, 12_000);
    script.addEventListener('load', ready, { once: true }); script.addEventListener('error', failed, { once: true });
    if (created) document.head.append(script);
  }).catch(error => { loading = null; throw error; });
  return loading;
}
