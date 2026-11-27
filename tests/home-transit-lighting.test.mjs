import test from 'node:test';
import assert from 'node:assert/strict';
import { initTransitLighting } from '../components/home/transit-lighting.js';

test('headlight positioning batches geometry reads before SVG writes and cancels pending frames', () => {
  const previous = Object.fromEntries(['window', 'document', 'ResizeObserver', 'requestAnimationFrame', 'cancelAnimationFrame'].map(key => [key, globalThis[key]]));
  const frames = new Map(), attributes = new Map(), listeners = new Map();
  let frame = 0, reads = 0, wrote = false;
  const rect = (left, top, width, height) => ({ getBoundingClientRect() {
    assert.equal(wrote, false, 'geometry must be collected before changing the SVG');
    reads++;
    return { left, top, width, height };
  } });
  const stage = rect(20, 100, 800, 550), art = rect(20, 100, 400, 400);
  const icons = [0, 1, 2, 3].map(index => rect(500 + index * 50, 200, 32, 32));
  const write = (key, value) => { wrote = true; attributes.set(key, String(value)); };
  const beams = {
    setAttribute: (key, value) => write(key, value),
    querySelector: selector => ({ setAttribute: (key, value) => write(selector + ':' + key, value) }),
  };
  const section = {
    querySelector: selector => ({ '.moving-inner': stage, '.moving-art': art, '.transit-headlight-beams': beams })[selector],
    querySelectorAll: () => icons,
    closest: () => null,
  };
  Object.assign(globalThis, {
    window: { addEventListener: (type, callback) => listeners.set(type, callback), removeEventListener: type => listeners.delete(type) },
    document: {}, ResizeObserver: undefined,
    requestAnimationFrame: callback => { frames.set(++frame, callback); return frame; },
    cancelAnimationFrame: id => frames.delete(id),
  });
  try {
    const destroy = initTransitLighting(section);
    const callback = frames.values().next().value;
    frames.clear(); callback();
    assert.equal(reads, 6);
    assert.equal(attributes.get('viewBox'), '0 0 800 550');
    for (let index = 0; index < 4; index++) {
      const path = attributes.get(`[data-light-cone="${index}"]:d`);
      assert.match(path, /^M[\d.]+ [\d.]+ L/);
      assert.doesNotMatch(path, /NaN|Infinity/);
    }
    listeners.get('resize')();
    assert.equal(frames.size, 1);
    destroy();
    assert.equal(frames.size, 0);
    assert.equal(listeners.size, 0);
  } finally { Object.assign(globalThis, previous); }
});
