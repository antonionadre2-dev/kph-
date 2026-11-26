import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { installDisclosureMotion, DISCLOSURE_MOTION_MS } from '../components/disclosure-motion-controller.ts';

type Listener = (event: any) => void;
class ClassNames {
  values = new Set<string>();
  add(...names: string[]) { names.forEach(name => this.values.add(name)); }
  remove(...names: string[]) { names.forEach(name => this.values.delete(name)); }
  contains(name: string) { return this.values.has(name); }
}
class FakeDocument {
  listeners = new Map<string, Set<Listener>>();
  defaultView = { location: { pathname: '/' } };
  activeElement: FakeElement | null = null;
  addEventListener(type: string, listener: Listener) { if (!this.listeners.has(type)) this.listeners.set(type, new Set()); this.listeners.get(type)!.add(listener); }
  removeEventListener(type: string, listener: Listener) { this.listeners.get(type)?.delete(listener); }
  emit(type: string, event: any) { for (const listener of this.listeners.get(type) || []) listener(event); }
  count(type: string) { return this.listeners.get(type)?.size || 0; }
}
class FakeElement {
  classList = new ClassNames();
  children: FakeElement[] = [];
  attributes = new Map<string, string>();
  isConnected = true;
  value = '';
  focused = 0;
  private expanded = false;
  constructor(readonly tagName: string, readonly doc: FakeDocument, readonly parentElement: FakeElement | null = null) { parentElement?.children.push(this); }
  get open() { return this.expanded; }
  set open(value: boolean) { if (value !== this.expanded) { this.expanded = value; this.doc.emit('toggle', { target: this }); } }
  contains(node: FakeElement) { for (let current: FakeElement | null = node; current; current = current.parentElement) if (current === this) return true; return false; }
  querySelector(selector: string): FakeElement | null { return selector === 'summary' ? this.children.find(child => child.tagName === 'SUMMARY') || null : null; }
  matches(selector: string) {
    if (selector === '[role],[aria-expanded],[aria-controls],[data-disclosure-motion="off"]') return ['role', 'aria-expanded', 'aria-controls'].some(name => this.attributes.has(name)) || this.attributes.get('data-disclosure-motion') === 'off';
    return false;
  }
  closest(selector: string): FakeElement | null {
    for (let current: FakeElement | null = this; current; current = current.parentElement) {
      if (selector === 'summary' && current.tagName === 'SUMMARY') return current;
      if (selector === 'main' && current.tagName === 'MAIN') return current;
      if (selector === '[data-disclosure-motion="off"]' && current.attributes.get('data-disclosure-motion') === 'off') return current;
      if (selector.startsWith('a[href],') && (['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'LABEL'].includes(current.tagName) || current.tagName === 'A' && current.attributes.has('href') || ['button', 'link'].includes(current.attributes.get('role') || '') || current.attributes.has('tabindex') || current.attributes.get('contenteditable') === 'true')) return current;
    }
    return null;
  }
  focus(options: { preventScroll: boolean }) { assert.deepEqual(options, { preventScroll: true }); this.doc.activeElement = this; this.focused++; }
}
class FakePreference {
  matches = false;
  listeners = new Set<Listener>();
  addEventListener(_: string, listener: Listener) { this.listeners.add(listener); }
  removeEventListener(_: string, listener: Listener) { this.listeners.delete(listener); }
  change(reduced: boolean) { this.matches = reduced; for (const listener of this.listeners) listener({}); }
}
function fixture(initialOpen = false) {
  const doc = new FakeDocument(), preference = new FakePreference();
  const main = new FakeElement('MAIN', doc), details = new FakeElement('DETAILS', doc, main);
  const summary = new FakeElement('SUMMARY', doc, details), content = new FakeElement('DIV', doc, details);
  const input = new FakeElement('INPUT', doc, content); input.value = 'Keep this typed value';
  details.open = initialOpen;
  let now = 0, serial = 0;
  const tasks = new Map<number, { at: number; callback: () => void }>();
  const timers = {
    set(callback: () => void, delay: number) { const id = ++serial; tasks.set(id, { at: now + delay, callback }); return id; },
    clear(handle: unknown) { tasks.delete(handle as number); },
  };
  const install = () => installDisclosureMotion(doc as unknown as Document, preference as unknown as MediaQueryList, timers);
  const click = (target = summary, options: Record<string, unknown> = {}, nativeDefault = true) => {
    const event = { target, button: 0, cancelable: true, defaultPrevented: false, metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, preventDefault() { this.defaultPrevented = true; }, ...options };
    doc.emit('click', event);
    if (nativeDefault && !event.defaultPrevented) details.open = !details.open;
    return event;
  };
  const advance = (milliseconds: number) => {
    now += milliseconds;
    for (const [id, task] of [...tasks].sort((a, b) => a[1].at - b[1].at)) if (task.at <= now) { tasks.delete(id); task.callback(); }
  };
  return { doc, preference, main, details, summary, content, input, install, click, advance, tasks };
}

test('SSR-open disclosures do not animate or change state on setup; native opening remains immediate', () => {
  const existing = fixture(true), disposeExisting = existing.install();
  assert.equal(existing.details.classList.values.size, 0);
  assert.equal(existing.tasks.size, 0);
  assert.equal(existing.details.open, true);
  disposeExisting();
  assert.equal(existing.details.open, true);

  const f = fixture(), dispose = f.install();
  let toggles = 0; f.doc.addEventListener('toggle', () => toggles++);
  const opening = f.click();
  assert.equal(opening.defaultPrevented, false, 'native opening is not replaced by JS');
  assert.equal(f.details.open, true);
  assert.equal(toggles, 1);
  assert.ok(f.details.classList.contains('kr-disclosure-entering'));
  f.advance(DISCLOSURE_MOTION_MS);
  assert.equal(f.details.open, true);
  assert.equal(f.details.classList.values.size, 0);
  assert.equal(toggles, 1);
  dispose();
});

test('closing fades for 200 ms, then fires one native toggle and preserves the input node/value', () => {
  const f = fixture(true), dispose = f.install(), originalInput = f.input;
  let toggles = 0; f.doc.addEventListener('toggle', () => toggles++);
  f.doc.activeElement = f.input;
  assert.equal(f.click().defaultPrevented, true);
  f.advance(199);
  assert.equal(f.details.open, true);
  assert.equal(f.doc.activeElement, f.input);
  assert.equal(toggles, 0);
  f.advance(1);
  assert.equal(f.details.open, false);
  assert.equal(toggles, 1);
  assert.equal(f.doc.activeElement, f.summary);
  assert.equal(f.summary.focused, 1);
  assert.equal(f.content.children[0], originalInput);
  assert.equal(f.input.value, 'Keep this typed value');
  f.click(); f.advance(200);
  assert.equal(f.details.open, true);
  assert.equal(f.content.children[0], originalInput);
  assert.equal(f.input.value, 'Keep this typed value');
  dispose();
});

test('rapid second activation cancels a pending close without a fake toggle or lost content', () => {
  const f = fixture(true), dispose = f.install();
  let toggles = 0; f.doc.addEventListener('toggle', () => toggles++);
  f.click(); f.advance(70);
  assert.equal(f.click().defaultPrevented, true);
  assert.equal(f.details.open, true);
  assert.ok(f.details.classList.contains('kr-disclosure-entering'));
  f.advance(500);
  assert.equal(f.details.open, true);
  assert.equal(toggles, 0);
  assert.equal(f.tasks.size, 0);
  dispose();
});

test('native named-peer or controlled closings cancel pending work and cannot be reclosed later', () => {
  const f = fixture(true), dispose = f.install();
  f.click(); f.advance(50);
  f.details.open = false; // The browser or the React owner closes this peer.
  assert.equal(f.tasks.size, 0);
  assert.equal(f.details.classList.values.size, 0);
  f.details.open = true; // A later explicit state change must remain authoritative.
  f.advance(500);
  assert.equal(f.details.open, true);
  dispose();
});

test('prevented/custom/interactive-child/private clicks stay fully native or under their existing owner', () => {
  const prevented = fixture(true), removePrevented = prevented.install();
  prevented.click(prevented.summary, { defaultPrevented: true });
  assert.equal(prevented.tasks.size, 0); removePrevented();

  const custom = fixture(true), removeCustom = custom.install();
  custom.summary.attributes.set('aria-expanded', 'true');
  custom.click(custom.summary, {}, false); assert.equal(custom.tasks.size, 0); removeCustom();

  for (const tag of ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'LABEL']) {
    const f = fixture(true), dispose = f.install(), control = new FakeElement(tag, f.doc, f.summary);
    if (tag === 'A') control.attributes.set('href', '/kontakt');
    assert.equal(f.click(control, {}, false).defaultPrevented, false);
    assert.equal(f.tasks.size, 0, tag); dispose();
  }
  const privatePage = fixture(true), removePrivate = privatePage.install();
  privatePage.doc.defaultView.location.pathname = '/es/dashboard';
  assert.equal(privatePage.click().defaultPrevented, false);
  assert.equal(privatePage.details.open, false);
  assert.equal(privatePage.tasks.size, 0); removePrivate();
});

test('reduced motion uses immediate native toggles and finishes existing pending fades immediately', () => {
  const f = fixture(true); f.preference.matches = true;
  const dispose = f.install();
  assert.equal(f.click().defaultPrevented, false);
  assert.equal(f.details.open, false);
  assert.equal(f.tasks.size, 0);
  f.preference.change(false); f.click(); f.advance(200); f.click();
  assert.equal(f.details.open, true);
  f.preference.change(true);
  assert.equal(f.details.open, false);
  assert.equal(f.tasks.size, 0);
  assert.equal(f.details.classList.values.size, 0);
  f.advance(500); assert.equal(f.details.open, false);
  dispose();
});

test('StrictMode-style cleanup/reinstall has one listener and no leftover timers or hidden focused input', () => {
  const f = fixture(true), first = f.install();
  first(); const second = f.install();
  assert.equal(f.doc.count('click'), 1);
  assert.equal(f.doc.count('toggle'), 1);
  assert.equal(f.preference.listeners.size, 1);
  f.doc.activeElement = f.input; f.click();
  second();
  assert.equal(f.doc.count('click'), 0);
  assert.equal(f.doc.count('toggle'), 0);
  assert.equal(f.preference.listeners.size, 0);
  assert.equal(f.tasks.size, 0);
  assert.equal(f.details.open, false);
  assert.equal(f.doc.activeElement, f.summary);
  f.advance(500); assert.equal(f.details.classList.values.size, 0);
});

test('public motion CSS only animates opacity/transform and shared buttons exclude calculator controls', () => {
  const css = readFileSync(new URL('../components/public-interactions.css', import.meta.url), 'utf8');
  assert.doesNotMatch(css, /transition:[^;]*(?:height|width|grid|box-shadow|border-color|(?:^|,)\s*color)/);
  assert.doesNotMatch(css, /\.kr-calc-/);
  assert.match(css, /background-color 150ms ease-out, transform 100ms ease-out/);
  assert.match(css, /transform:\s*scale\(\.98\)/);
  for (const name of ['kr-disclosure-reveal', 'kr-disclosure-conceal']) {
    const body = css.match(new RegExp('@keyframes ' + name + '\\s*\\{([\\s\\S]*?)\\}\\s*\\}'))?.[1];
    assert.ok(body, name);
    const properties = [...body.matchAll(/([a-z-]+)\s*:/g)].map(match => match[1]);
    assert.ok(properties.every(property => ['opacity', 'transform'].includes(property)), name);
  }
});
