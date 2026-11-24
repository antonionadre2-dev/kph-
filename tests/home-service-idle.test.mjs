import test from 'node:test';
import assert from 'node:assert/strict';
import { createServicePreviewController, initServicePreview } from '../components/home/service-idle.js';

function fixture(options = {}) {
  let now = 0, next = 0;
  const timers = new Map(), views = [], preferences = [];
  const controller = createServicePreviewController({
    schedule(fn, delay) { const id = ++next; timers.set(id, { at: now + delay, fn }); return id; },
    cancel(id) { timers.delete(id); },
    render(state) { views.push({ ...state }); },
    remember(value) { preferences.push(value); },
    ...options,
  });
  function tick(ms) {
    const end = now + ms;
    while (true) {
      const due = [...timers].filter(([, value]) => value.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) break;
      now = due[1].at; timers.delete(due[0]); due[1].fn();
    }
    now = end;
  }
  return { controller, tick, timers, views, preferences };
}

test('requires 30 continuous visible seconds and resets when the section or document is hidden', () => {
  const { controller, tick, timers } = fixture();
  tick(60_000); assert.equal(timers.size, 0);
  controller.setVisible(true); tick(29_000);
  assert.equal(controller.snapshot().index, -1);
  controller.setVisible(false); tick(60_000); assert.equal(timers.size, 0);
  controller.setVisible(true); tick(29_999); assert.equal(controller.snapshot().index, -1);
  tick(1); assert.equal(controller.snapshot().phase, 'playing'); assert.equal(controller.snapshot().index, 0);
  controller.setVisible(false); assert.equal(timers.size, 0); assert.equal(controller.snapshot().index, -1);
});

test('intentional interaction freezes the view and prevents automatic restarting until explicit play', () => {
  const { controller, tick, timers, preferences } = fixture();
  controller.setVisible(true); tick(30_000); controller.interact();
  assert.equal(controller.snapshot().index, 0);
  assert.equal(controller.snapshot().phase, 'paused'); assert.equal(timers.size, 0);
  controller.setVisible(false); controller.setVisible(true); tick(90_000);
  assert.equal(controller.snapshot().phase, 'paused'); assert.equal(timers.size, 0);
  controller.toggle(); assert.equal(controller.snapshot().phase, 'playing');
  assert.deepEqual(preferences, [true, false]);
});

test('reduced motion never autoplays; a normal tour shows both views once and stops', () => {
  const reduced = fixture(); reduced.controller.setReducedMotion(true); reduced.controller.setVisible(true);
  reduced.tick(90_000); reduced.controller.toggle();
  assert.equal(reduced.timers.size, 0); assert.equal(reduced.controller.snapshot().index, -1);
  const normal = fixture(); normal.controller.setVisible(true); normal.tick(30_000);
  assert.equal(normal.controller.snapshot().index, 0); normal.tick(6_500);
  assert.equal(normal.controller.snapshot().index, 1); normal.tick(6_500);
  assert.equal(normal.controller.snapshot().phase, 'complete'); assert.equal(normal.controller.snapshot().index, -1);
  normal.controller.setVisible(false); normal.controller.setVisible(true); normal.tick(90_000);
  assert.equal(normal.timers.size, 0); assert.equal(normal.controller.snapshot().phase, 'complete');
});


test('destroy cancels a pending countdown and never renders or navigates after unmount', () => {
  const { controller, tick, timers, views } = fixture();
  controller.setVisible(true); tick(15_000);
  controller.destroy(); const rendered = views.length;
  tick(120_000);
  assert.equal(timers.size, 0); assert.equal(views.length, rendered);
});

test('a modal or hidden document cancels the wait before any automatic highlight', () => {
  let eligible = true;
  const { controller, tick, timers } = fixture({ canRun: () => eligible });
  controller.setVisible(true); tick(29_000);
  eligible = false; controller.setVisible(false);
  tick(120_000);
  assert.equal(controller.snapshot().index, -1); assert.equal(timers.size, 0);
  eligible = true; controller.setVisible(true); tick(29_999);
  assert.equal(controller.snapshot().index, -1);
  tick(1); assert.equal(controller.snapshot().index, 0);
});


test('mount uses live language, cancels on a modal and cleans up before a React remount', context => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  class Node extends EventTarget {
    dataset = {}; hidden = false; title = ''; textContent = ''; attributes = new Map(); classes = new Set();
    classList = {
      toggle: (key, on) => on ? this.classes.add(key) : this.classes.delete(key),
      remove: key => this.classes.delete(key),
    };
    setAttribute(key, value) { this.attributes.set(key, value); }
    getBoundingClientRect() { return { top: 200, bottom: 650, width: 450, height: 450 }; }
    getClientRects() { return [this.getBoundingClientRect()]; }
    closest() { return null; }
  }
  const saved = Object.fromEntries(['window', 'document', 'matchMedia', 'IntersectionObserver', 'MutationObserver', 'innerHeight', 'requestAnimationFrame', 'cancelAnimationFrame', 'sessionStorage', 'Element'].map(key => [key, globalThis[key]]));
  context.after(() => Object.assign(globalThis, saved));
  const root = new Node(), section = new Node(), grid = new Node(), cards = [new Node(), new Node()];
  const controls = new Node(), button = new Node(), status = new Node(), motion = new Node(); motion.matches = false;
  root.querySelector = selector => ({ '#leistungen.services-section': section, '#servicePreviewControls': controls, '#servicePreviewToggle': button, '#servicePreviewStatus': status }[selector] || null);
  section.querySelector = () => grid; grid.querySelectorAll = () => cards;
  const doc = new Node(); doc.body = new Node(); let modal = false;
  doc.querySelector = () => modal ? new Node() : null; doc.querySelectorAll = () => [];
  const win = new Node(); Object.assign(win, { setTimeout, clearTimeout, IntersectionObserver: true });
  let dialogChange, disconnects = 0;
  Object.assign(globalThis, {
    window: win, document: doc, matchMedia: () => motion, innerHeight: 900, Element: Node,
    requestAnimationFrame: callback => setTimeout(callback, 16), cancelAnimationFrame: clearTimeout,
    sessionStorage: { getItem: () => null, setItem() {} },
    IntersectionObserver: class { constructor() {} observe() {} disconnect() { disconnects++; } },
    MutationObserver: class { constructor(callback) { dialogChange = callback; } observe() {} disconnect() { disconnects++; } },
  });
  let language = 'es';
  const first = initServicePreview(root, { getLanguage: () => language });
  assert.equal(button.attributes.get('aria-label'), 'Pausar la vista automática de imágenes');
  context.mock.timers.tick(29_000); modal = true; dialogChange();
  context.mock.timers.tick(100_000); assert.equal(grid.dataset.previewActive, undefined);
  modal = false; dialogChange(); context.mock.timers.tick(29_999);
  assert.equal(grid.dataset.previewActive, undefined);
  context.mock.timers.tick(1); assert.equal(grid.dataset.previewActive, '0');
  language = 'fr'; root.dispatchEvent(new Event('kraken:languagechange'));
  assert.equal(status.textContent, 'Découvrez le nettoyage à domicile');
  first(); assert.equal(grid.dataset.previewActive, undefined); assert.equal(disconnects, 2);
  const second = initServicePreview(root, { getLanguage: () => 'pt' });
  context.mock.timers.tick(30_000); assert.equal(grid.dataset.previewActive, '0');
  second(); context.mock.timers.tick(100_000);
  assert.equal(grid.dataset.previewActive, undefined); assert.equal(disconnects, 4);
});
