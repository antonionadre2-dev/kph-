import { createHomeScope } from './lifecycle.js';
const WAIT_MS = 30_000;
const VIEW_MS = 6_500;

/** A finite tour with an injectable clock. It never clicks, focuses or navigates. */
export function createServicePreviewController({ count = 2, initiallyPaused = true, render = () => {}, remember = () => {}, canRun = () => true, schedule = setTimeout, cancel = clearTimeout } = {}) {
  let visible = false;
  let reducedMotion = false;
  let enabled = !initiallyPaused;
  let phase = initiallyPaused ? 'paused' : 'idle';
  let index = -1;
  let timer = null;
  let destroyed = false;
  const snapshot = () => ({ visible, reducedMotion, enabled, phase, index });
  const emit = () => render(snapshot());
  const clear = () => { if (timer !== null) cancel(timer); timer = null; };
  const eligible = () => !destroyed && visible && enabled && !reducedMotion && canRun();
  function start() {
    clear();
    if (!eligible()) { visible = false; phase = enabled ? 'idle' : 'paused'; emit(); return; }
    index = 0; phase = 'playing'; emit();
    timer = schedule(advance, VIEW_MS);
  }
  function advance() {
    clear();
    if (!eligible()) { visible = false; index = -1; phase = enabled ? 'idle' : 'paused'; emit(); return; }
    if (++index >= count) {
      index = -1; enabled = false; phase = 'complete'; remember(true); emit(); return;
    }
    emit(); timer = schedule(advance, VIEW_MS);
  }
  function arm() {
    clear();
    if (reducedMotion) { phase = 'static'; emit(); return; }
    if (!enabled) { emit(); return; }
    phase = visible ? 'waiting' : 'idle'; emit();
    if (visible) timer = schedule(start, WAIT_MS);
  }
  emit();
  return {
    snapshot,
    setVisible(value) {
      if (destroyed || visible === value) return;
      visible = value;
      // Before the tour, leaving the section discards the countdown entirely.
      // After it starts, restore outside the viewport and require another 30 seconds.
      if (!visible && phase === 'playing') index = -1;
      arm();
    },
    setReducedMotion(value) {
      if (destroyed || reducedMotion === value) return;
      reducedMotion = value;
      if (value) { index = -1; enabled = false; }
      arm();
    },
    interact() {
      if (destroyed || !enabled) return;
      clear(); enabled = false; phase = reducedMotion ? 'static' : 'paused';
      // Freeze the current view so a pointer target does not move during a click.
      remember(true); emit();
    },
    toggle() {
      if (destroyed || reducedMotion) return;
      if (enabled) { this.interact(); return; }
      enabled = true; remember(false);
      if (visible) start(); else arm();
    },
    step(direction) {
      if (destroyed) return;
      clear(); enabled = false;
      index = index < 0 ? (direction < 0 ? count - 1 : 0) : (index + direction + count) % count;
      phase = reducedMotion ? 'static' : 'paused';
      remember(true); emit();
    },
    destroy() { clear(); destroyed = true; },
  };
}

const copy = {
  de: { automatic: 'Automatische Bildvorschau', paused: 'Bildvorschau pausiert', complete: 'Beide Ansichten entdeckt', pause: 'Automatische Bildvorschau pausieren', play: 'Bildvorschau starten', views: ['Ihr Zuhause entdecken', 'Ihre Wohnungsabgabe entdecken'] },
  en: { automatic: 'Automatic image preview', paused: 'Image preview paused', complete: 'Both views explored', pause: 'Pause automatic image preview', play: 'Start image preview', views: ['Explore home cleaning', 'Explore move-out cleaning'] },
  es: { automatic: 'Vista automática de imágenes', paused: 'Vista de imágenes en pausa', complete: 'Has visto ambas opciones', pause: 'Pausar la vista automática de imágenes', play: 'Iniciar la vista de imágenes', views: ['Descubre la limpieza de tu hogar', 'Descubre la limpieza de fin de contrato'] },
  fr: { automatic: 'Aperçu automatique des images', paused: 'Aperçu des images en pause', complete: 'Les deux vues sont présentées', pause: 'Mettre l’aperçu automatique en pause', play: 'Lancer l’aperçu des images', views: ['Découvrez le nettoyage à domicile', 'Découvrez le nettoyage de fin de bail'] },
  it: { automatic: 'Anteprima automatica delle immagini', paused: 'Anteprima delle immagini in pausa', complete: 'Entrambe le viste sono state mostrate', pause: 'Metti in pausa l’anteprima automatica', play: 'Avvia l’anteprima delle immagini', views: ['Scopri le pulizie di casa', 'Scopri le pulizie di fine locazione'] },
  pt: { automatic: 'Pré-visualização automática', paused: 'Pré-visualização em pausa', complete: 'As duas vistas foram apresentadas', pause: 'Pausar a pré-visualização automática', play: 'Iniciar a pré-visualização', views: ['Descubra a limpeza da sua casa', 'Descubra a limpeza de fim de contrato'] },
};
const manualCopy = {
  de: { previous: 'Vorherige Bildansicht', next: 'Nächste Bildansicht', reduced: 'Manuelle Bildvorschau · Bewegung reduziert' },
  en: { previous: 'Previous image view', next: 'Next image view', reduced: 'Manual image preview · reduced motion' },
  es: { previous: 'Vista de imagen anterior', next: 'Siguiente vista de imagen', reduced: 'Vista manual · movimiento reducido' },
  pt: { previous: 'Vista de imagem anterior', next: 'Vista de imagem seguinte', reduced: 'Pré-visualização manual · movimento reduzido' },
  it: { previous: 'Vista immagine precedente', next: 'Vista immagine successiva', reduced: 'Anteprima manuale · movimento ridotto' },
  fr: { previous: 'Vue précédente', next: 'Vue suivante', reduced: 'Aperçu manuel · mouvement réduit' },
};
export function servicePreviewLabels(language) {
  const key = String(language).toLowerCase().split('-')[0];
  return { ...(copy[key] || copy.de), ...(manualCopy[key] || manualCopy.de) };
}

/** Own every observer and listener for one React Home mount. */
export function initServicePreview(homeRoot, { getLanguage = () => 'de' } = {}) {
  const scope = createHomeScope();
  const section = homeRoot.querySelector('#leistungen.services-section');
  const grid = section?.querySelector('.service-cards');
  const cards = grid ? [...grid.querySelectorAll('.service-card')] : [];
  const controls = homeRoot.querySelector('#servicePreviewControls');
  const button = homeRoot.querySelector('#servicePreviewToggle');
  const previous = homeRoot.querySelector('#servicePreviewPrevious');
  const next = homeRoot.querySelector('#servicePreviewNext');
  const status = homeRoot.querySelector('#servicePreviewStatus');
  if (!section || !grid || cards.length < 2 || !controls || !button || !status) return;

  const storageKey = 'kraken.services.preview.paused';
  // Every visit starts still, including visitors with the old autoplay preference.
  const initiallyPaused = true;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const labels = () => servicePreviewLabels(getLanguage());
  function hasVisibleCard() {
    if (document.hidden || document.querySelector('dialog[open]')) return false;
    // Kai and any other accessible modal also cancel the continuous idle wait.
    if ([...document.querySelectorAll('[role="dialog"][aria-modal="true"]')].some(dialog => !dialog.hidden && dialog.getClientRects().length)) return false;
    const headerBottom = Math.max(0, Math.min(homeRoot.querySelector('.site-header')?.getBoundingClientRect().bottom || 0, 120));
    const viewportHeight = Math.max(0, innerHeight - headerBottom);
    return cards.some(card => {
      const box = card.getBoundingClientRect();
      const height = Math.max(0, Math.min(box.bottom, innerHeight) - Math.max(box.top, headerBottom));
      return box.width > 0 && viewportHeight > 0 && height >= Math.min(box.height * .55, viewportHeight * .5);
    });
  }
  function render(state) {
    const text = labels();
    controls.hidden = false;
    if (state.index < 0) delete grid.dataset.previewActive;
    else grid.dataset.previewActive = String(state.index);
    cards.forEach((card, index) => card.classList.toggle('is-idle-featured', index === state.index));
    controls.classList.toggle('is-paused', !state.enabled);
    const label = state.enabled ? text.pause : text.play;
    button.setAttribute('aria-label', label); button.title = label;
    button.setAttribute('aria-pressed', String(state.enabled && !state.reducedMotion));
    button.disabled = state.reducedMotion;
    for (const [control, key] of [[previous, 'previous'], [next, 'next']]) {
      if (!control) continue;
      control.disabled = false; control.setAttribute('aria-label', text[key]); control.title = text[key];
    }
    status.textContent = state.index >= 0 ? text.views[state.index] || text.paused : state.reducedMotion ? text.reduced : state.phase === 'complete' ? text.complete : !state.enabled ? text.paused : text.automatic;
  }
  const controller = createServicePreviewController({
    count: cards.length,
    initiallyPaused,
    canRun: hasVisibleCard,
    schedule: (callback, delay) => scope.timeout(callback, delay),
    cancel: id => scope.clearTimeout(id),
    remember(paused) { try { sessionStorage.setItem(storageKey, paused ? '1' : '0'); } catch { /* Nonessential UI preference only. */ } },
    render,
  });
  const syncVisibility = () => controller.setVisible(hasVisibleCard());
  const interact = event => {
    if (event.target instanceof Element && event.target.closest('[data-service-preview-control]')) return;
    controller.interact();
  };
  ['pointerdown', 'keydown', 'focusin'].forEach(type => scope.on(section, type, interact, { passive: true }));
  let pointer = null;
  scope.on(section, 'pointermove', event => {
    if (event.pointerType !== 'mouse') return;
    const next = { x: event.clientX, y: event.clientY };
    if (pointer && Math.hypot(next.x - pointer.x, next.y - pointer.y) >= 6) interact(event);
    pointer = next;
  }, { passive: true });
  scope.on(section, 'pointerleave', () => { pointer = null; }, { passive: true });
  scope.on(button, 'click', () => { syncVisibility(); controller.toggle(); });
  if (previous) scope.on(previous, 'click', () => controller.step(-1));
  if (next) scope.on(next, 'click', () => controller.step(1));
  const updateMotion = () => { controller.setReducedMotion(motion.matches); syncVisibility(); };
  scope.on(motion, 'change', updateMotion);
  scope.on(document, 'visibilitychange', syncVisibility);
  scope.on(document, 'focusin', syncVisibility);
  scope.on(homeRoot, 'kraken:languagechange', () => render(controller.snapshot()));
  let frame = null;
  const scheduleVisibility = () => {
    if (frame !== null) return;
    frame = requestAnimationFrame(() => { frame = null; syncVisibility(); });
  };
  scope.on(window, 'scroll', scheduleVisibility, { passive: true });
  scope.on(window, 'resize', scheduleVisibility, { passive: true });
  const observer = 'IntersectionObserver' in window ? scope.observer(syncVisibility, { threshold: [0, .25, .5, .55, .75, 1] }) : null;
  cards.forEach(card => observer?.observe(card));
  const dialogs = new MutationObserver(syncVisibility);
  // Also catches a lazily mounted Kai dialog. Attribute filtering avoids observing scene animation changes.
  dialogs.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['open', 'hidden', 'aria-hidden', 'aria-modal'] });
  scope.cleanup(() => dialogs.disconnect());
  scope.on(window, 'pagehide', () => controller.setVisible(false));
  scope.on(window, 'pageshow', syncVisibility);
  scope.cleanup(() => {
    controller.destroy();
    if (frame !== null) cancelAnimationFrame(frame);
    delete grid.dataset.previewActive;
    cards.forEach(card => card.classList.remove('is-idle-featured'));
  });
  updateMotion();
  return () => scope.dispose();
}
