type Cleanup = void | (() => void);
type Enhancement = () => Cleanup;

/** Keep optional DOM work out of the hydration commit. Native content stays visible. */
export function initDeferredHomeEnhancements(
  root: HTMLElement,
  { scene, services, transit }: { scene: Enhancement; services: Enhancement; transit: Enhancement },
): () => void {
  let disposed = false;
  const cleanups: (() => void)[] = [];
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const schedule = (initialize: Enhancement) => {
    const timer = setTimeout(() => {
      timers.delete(timer);
      if (disposed) return;
      const cleanup = initialize();
      if (cleanup) cleanups.push(cleanup);
    }, 0);
    timers.add(timer);
  };

  // The room image is already server-rendered. Scene controls and climate enhance
  // it in their own task, after React has returned control to the browser.
  schedule(scene);

  const pending = new Map<Element, Enhancement>();
  for (const [selector, initialize] of [['#leistungen', services], ['#umzug', transit]] as const) {
    const element = root.querySelector(selector);
    if (element) pending.set(element, initialize);
  }
  const start = (element: Element) => {
    const initialize = pending.get(element);
    if (!initialize || disposed) return;
    pending.delete(element);
    observer?.unobserve(element);
    schedule(initialize);
  };
  const observer = typeof IntersectionObserver === 'function'
    ? new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) start(entry.target);
    }, { rootMargin: '320px 0px' }) : null;
  if (observer) for (const element of pending.keys()) observer.observe(element);
  else for (const element of [...pending.keys()]) start(element);

  // Keyboard focus and direct interaction also work before an observer callback.
  const interact = (event: Event) => {
    const target = event.target;
    if (!(target instanceof Node)) return;
    for (const element of [...pending.keys()]) if (element.contains(target)) start(element);
  };
  root.addEventListener('focusin', interact);
  root.addEventListener('pointerdown', interact, { passive: true });
  return () => {
    disposed = true;
    observer?.disconnect();
    root.removeEventListener('focusin', interact);
    root.removeEventListener('pointerdown', interact);
    for (const timer of timers) clearTimeout(timer);
    timers.clear();
    pending.clear();
    for (const cleanup of cleanups.reverse()) cleanup();
  };
}
