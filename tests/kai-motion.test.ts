import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { waitForKaiTyping, KAI_TYPING_DELAY_MS, kaiMessageScrollBehavior } from '../components/kaiMotion.ts';

function clock() {
  let now = 0, sequence = 0;
  const pending = new Map<number, { at: number; callback: () => void }>();
  return {
    timers: {
      set(callback: () => void, delay: number) { const id = ++sequence; pending.set(id, { at: now + delay, callback }); return id; },
      clear(handle: unknown) { pending.delete(handle as number); },
    },
    advance(milliseconds: number) {
      now += milliseconds;
      for (const [id, task] of [...pending].sort((a, b) => a[1].at - b[1].at)) {
        if (task.at > now) continue;
        pending.delete(id); task.callback();
      }
    },
    size: () => pending.size,
  };
}

test('real pending replies show typing only after the 400 ms threshold, once', () => {
  const fake = clock();
  let shown = 0, pending = true;
  const dispose = waitForKaiTyping(() => shown++, () => pending, fake.timers);
  assert.equal(KAI_TYPING_DELAY_MS, 400);
  fake.advance(399); assert.equal(shown, 0);
  fake.advance(1); assert.equal(shown, 1);
  fake.advance(10_000); assert.equal(shown, 1);
  pending = false; dispose(); assert.equal(fake.size(), 0);
});

test('fast replies and unmount cleanup cancel the typing timer without a flash', () => {
  for (const finishAt of [0, 80, 399]) {
    const fake = clock();
    let shown = 0;
    const dispose = waitForKaiTyping(() => shown++, () => true, fake.timers);
    fake.advance(finishAt); dispose();
    assert.equal(fake.size(), 0);
    fake.advance(10_000); assert.equal(shown, 0);
  }
});

test('a completed or aborted request never produces dots, and a new wait has its own delay', () => {
  const fake = clock();
  let shown = 0, pending = false;
  const disposeFirst = waitForKaiTyping(() => shown++, () => pending, fake.timers);
  fake.advance(400); assert.equal(shown, 0);
  disposeFirst();
  pending = true;
  const disposeSecond = waitForKaiTyping(() => shown++, () => pending, fake.timers);
  fake.advance(399); assert.equal(shown, 0);
  fake.advance(1); assert.equal(shown, 1);
  disposeSecond(); assert.equal(fake.size(), 0);
});

test('Kai uses smooth latest-message scrolling normally and instant movement for reduced motion', () => {
  assert.equal(kaiMessageScrollBehavior(false), 'smooth');
  assert.equal(kaiMessageScrollBehavior(true), 'auto');
  const css = readFileSync(new URL('../components/KaiAssistant.css', import.meta.url), 'utf8');
  assert.match(css, /\.kai-message-new\s*\{\s*animation:\s*kai-message-arrive 200ms ease-out/);
  assert.match(css, /@keyframes kai-message-arrive\s*\{\s*from\s*\{\s*opacity:\s*0;\s*transform:\s*translateY\(8px\)/);
  for (const name of ['kai-message-arrive', 'kai-typing-pulse']) {
    const body = css.match(new RegExp('@keyframes ' + name + '\\s*\\{([\\s\\S]*?)\\}\\s*\\}'))?.[1];
    assert.ok(body, name);
    const properties = [...body.matchAll(/([a-z-]+)\s*:/g)].map(match => match[1]);
    assert.ok(properties.every(property => ['opacity', 'transform', 'background-color'].includes(property)), name);
  }
  assert.match(css, /prefers-reduced-motion:\s*reduce[\s\S]*animation:\s*none !important/);
});
