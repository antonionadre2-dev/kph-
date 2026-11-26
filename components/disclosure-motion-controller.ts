/** Progressive motion for native disclosures. Their content and native toggle events stay intact. */
export const DISCLOSURE_MOTION_MS = 200;
const ENTERING = 'kr-disclosure-entering';
const CLOSING = 'kr-disclosure-closing';
const INTERACTIVE_CHILD = 'a[href],button,input,select,textarea,label,[role="button"],[role="link"],[contenteditable="true"],[tabindex]';
type MotionTimers = { set(callback: () => void, delay: number): unknown; clear(handle: unknown): void };
const browserTimers: MotionTimers = {
  set: (callback, delay) => setTimeout(callback, delay),
  clear: handle => clearTimeout(handle as ReturnType<typeof setTimeout>),
};
type PendingDisclosure = { phase: 'opening' | 'closing'; summary: HTMLElement; timer: unknown };

function element(value: EventTarget | null): Element | null {
  if (!value || typeof (value as Element).closest !== 'function') return null;
  return value as Element;
}

function publicMain(details: HTMLDetailsElement, doc: Document): boolean {
  if (!details.closest('main') || details.closest('[data-disclosure-motion="off"]')) return false;
  const pathname = (doc.defaultView?.location.pathname || '/').replace(/^\/(?:de|en|es|fr|it|pt)(?=\/|$)/, '') || '/';
  // Keep the enhancement out of account, staff and other private tools.
  return /^(?:\/|\/(?:index\.html|leistungen|services|ueber-uns|ueber-kraken|about|kontakt|contact|contacto|offerte|quote|consultation|einsatzgebiete|terms|gdpr|impressum|imprint)|\/(?:reinigung|fensterreinigung|umzugsreinigung|wohnungsreinigung|grundreinigung|kleinumzug)\/[^/]+)\/?$/.test(pathname);
}

export function installDisclosureMotion(doc: Document, preference: MediaQueryList, timers: MotionTimers = browserTimers): () => void {
  const pending = new Map<HTMLDetailsElement, PendingDisclosure>();

  const clear = (details: HTMLDetailsElement) => {
    const entry = pending.get(details);
    if (entry) timers.clear(entry.timer);
    pending.delete(details);
    details.classList.remove(ENTERING, CLOSING);
  };
  const finish = (details: HTMLDetailsElement, entry: PendingDisclosure) => {
    if (pending.get(details) !== entry) return;
    clear(details);
    if (entry.phase !== 'closing' || details.isConnected === false) return;
    const focused = doc.activeElement;
    if (focused && details.contains(focused) && !entry.summary.contains(focused)) entry.summary.focus({ preventScroll: true });
    details.open = false;
  };
  const start = (details: HTMLDetailsElement, summary: HTMLElement, phase: PendingDisclosure['phase']) => {
    clear(details);
    const entry: PendingDisclosure = { phase, summary, timer: null };
    pending.set(details, entry);
    details.classList.add(phase === 'closing' ? CLOSING : ENTERING);
    entry.timer = timers.set(() => finish(details, entry), DISCLOSURE_MOTION_MS);
  };
  const click = (event: MouseEvent) => {
    if (event.defaultPrevented || !event.cancelable || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey || preference.matches) return;
    const target = element(event.target);
    const summary = target?.closest('summary') as HTMLElement | null;
    const details = summary?.parentElement as HTMLDetailsElement | null;
    if (!target || !summary || !details || details.tagName !== 'DETAILS' || details.querySelector('summary') !== summary || !publicMain(details, doc)) return;
    if (summary.matches('[role],[aria-expanded],[aria-controls],[data-disclosure-motion="off"]')) return;
    const control = target.closest(INTERACTIVE_CHILD);
    if (control && control !== summary && summary.contains(control)) return;
    if (pending.get(details)?.phase === 'closing') {
      event.preventDefault();
      start(details, summary, 'opening');
    } else if (details.open) {
      event.preventDefault();
      start(details, summary, 'closing');
    } else {
      // Leave opening to the browser, including keyboard activation and named groups.
      start(details, summary, 'opening');
    }
  };
  const toggle = (event: Event) => {
    const details = element(event.target) as HTMLDetailsElement | null;
    // Native named-peer and React/programmatic closings are never held open.
    if (details?.tagName === 'DETAILS' && !details.open && pending.has(details)) clear(details);
  };
  const motionChanged = () => {
    if (preference.matches) for (const [details, entry] of [...pending]) finish(details, entry);
  };

  doc.addEventListener('click', click);
  doc.addEventListener('toggle', toggle, true);
  preference.addEventListener('change', motionChanged);
  return () => {
    doc.removeEventListener('click', click);
    doc.removeEventListener('toggle', toggle, true);
    preference.removeEventListener('change', motionChanged);
    for (const [details, entry] of [...pending]) finish(details, entry);
  };
}
