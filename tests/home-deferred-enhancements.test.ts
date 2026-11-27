import test from 'node:test';
import assert from 'node:assert/strict';
import { initDeferredHomeEnhancements } from '../components/home/deferred-enhancements';

function environment(withObserver = true) {
  const original = { Node: globalThis.Node, IntersectionObserver: globalThis.IntersectionObserver, setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout };
  class Element {
    constructor(readonly name: string) {}
    contains(target: unknown) { return target === this; }
  }
  const services = new Element('services'), transit = new Element('transit');
  const listeners = new Map<string, EventListener>();
  const root = {
    querySelector: (selector: string) => selector === '#leistungen' ? services : transit,
    addEventListener: (type: string, listener: EventListener) => listeners.set(type, listener),
    removeEventListener: (type: string) => listeners.delete(type),
  } as unknown as HTMLElement;
  const tasks = new Map<number, () => void>();
  let task = 0, receive: (entries: unknown[]) => void = () => {}, disconnected = false;
  const observed = new Set<unknown>();
  Object.assign(globalThis, {
    Node: Element,
    IntersectionObserver: withObserver ? class {
      constructor(callback: typeof receive, options: IntersectionObserverInit) {
        receive = callback;
        assert.equal(options.rootMargin, '320px 0px');
      }
      observe(element: unknown) { observed.add(element); }
      unobserve(element: unknown) { observed.delete(element); }
      disconnect() { disconnected = true; observed.clear(); }
    } : undefined,
    setTimeout: (callback: () => void) => { tasks.set(++task, callback); return task; },
    clearTimeout: (id: number) => tasks.delete(id),
  });
  const flush = () => { for (const [id, callback] of [...tasks]) { tasks.delete(id); callback(); } };
  return { root, services, transit, listeners, tasks, observed, flush,
    near: (element: Element, isIntersecting = true) => receive([{ target: element, isIntersecting }]),
    event: (type: string, target: unknown) => listeners.get(type)?.({ target } as unknown as Event),
    disconnected: () => disconnected,
    restore: () => Object.assign(globalThis, original),
  };
}

test('home enhancements yield after hydration and initialize offscreen sections once when near', () => {
  const env = environment();
  try {
    const started: string[] = [], stopped: string[] = [];
    const initialize = (name: string) => () => { started.push(name); return () => { stopped.push(name); }; };
    const destroy = initDeferredHomeEnhancements(env.root, { scene: initialize('scene'), services: initialize('services'), transit: initialize('transit') });
    assert.deepEqual(started, []);
    env.flush();
    assert.deepEqual(started, ['scene']);
    env.near(env.services, false); env.flush();
    assert.deepEqual(started, ['scene']);
    env.near(env.services); env.near(env.services); env.flush();
    assert.deepEqual(started, ['scene', 'services']);
    env.event('focusin', env.transit); env.event('pointerdown', env.transit); env.flush();
    assert.deepEqual(started, ['scene', 'services', 'transit']);
    destroy();
    assert.deepEqual(stopped, ['transit', 'services', 'scene']);
    assert.equal(env.listeners.size, 0);
    assert.equal(env.disconnected(), true);
  } finally { env.restore(); }
});

test('leaving Home cancels queued work and ignores stale visibility callbacks', () => {
  const env = environment();
  try {
    let starts = 0;
    const initialize = () => { starts++; };
    const destroy = initDeferredHomeEnhancements(env.root, { scene: initialize, services: initialize, transit: initialize });
    env.near(env.transit);
    destroy();
    env.near(env.services); env.flush();
    assert.equal(starts, 0);
    assert.equal(env.tasks.size, 0);
  } finally { env.restore(); }
});

test('browsers without visibility observers still enhance all sections in separate tasks', () => {
  const env = environment(false);
  try {
    let starts = 0;
    const initialize = () => { starts++; };
    const destroy = initDeferredHomeEnhancements(env.root, { scene: initialize, services: initialize, transit: initialize });
    assert.equal(starts, 0);
    assert.equal(env.tasks.size, 3);
    env.flush();
    assert.equal(starts, 3);
    destroy();
  } finally { env.restore(); }
});
