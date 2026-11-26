/** A pending reply is shown only after a real request has taken more than 400 ms. */
export const KAI_TYPING_DELAY_MS = 400;
type WaitTimers = {
  set(callback: () => void, delay: number): unknown;
  clear(handle: unknown): void;
};
const browserTimers: WaitTimers = {
  set: (callback, delay) => setTimeout(callback, delay),
  clear: handle => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export function waitForKaiTyping(
  show: () => void,
  requestPending: () => boolean,
  timers: WaitTimers = browserTimers,
): () => void {
  let active = true;
  const timer = timers.set(() => { if (active && requestPending()) show(); }, KAI_TYPING_DELAY_MS);
  return () => { active = false; timers.clear(timer); };
}

export function kaiMessageScrollBehavior(reducedMotion: boolean): ScrollBehavior {
  return reducedMotion ? 'auto' : 'smooth';
}
