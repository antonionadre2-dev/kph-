import { calculatorHref, openCalculator } from './calculator.js';
import { siteConfig } from './site-config.js';

(() => {
  'use strict';

  const services = {
    windows: { name: 'Fensterreinigung', hint: 'Klare Sicht für Ihr Zuhause. Erzählen Sie uns von Ihren Fenstern.', hotspot: 'windows' },
    end: { name: 'Umzugsreinigung', hint: 'Ihre Wohnung wird abgegeben? Wir planen die Reinigung mit Ihnen.', hotspot: 'floor' },
    regular: { name: 'Regelmässige Reinigung', hint: 'Einfach mehr Zeit für Sie. Gemeinsam finden wir den passenden Rhythmus.', hotspot: 'floor' },
    deep: { name: 'Grundreinigung', hint: 'Wenn Ihr Zuhause etwas mehr Aufmerksamkeit braucht.', hotspot: 'floor' },
    moving: { name: 'Kleiner Umzug', hint: 'Möbel, Kartons, ein neuer Anfang. Planen wir Ihren kleinen Umzug.', hotspot: 'moving' }
  };
  const state = { service: null };
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const kaiDialog = $('#kaiDialog');
  let lastKaiOpener = null;
  let heroIsVisible = true;

  const instagram = $('[data-instagram]');
  if (instagram && siteConfig.instagramUrl) {
    instagram.href = siteConfig.instagramUrl;
    instagram.removeAttribute('aria-disabled');
    instagram.removeAttribute('tabindex');
    instagram.classList.remove('is-pending');
  }

  function announce(message) { $('#globalStatus').textContent = message; }
  function syncCalculatorLinks() {
    $$('[data-calculator]').forEach(link => { link.href = calculatorHref(link.dataset.service || state.service); });
  }
  function syncLauncher() { $('#kaiLauncher').hidden = heroIsVisible || kaiDialog.open; }
  function syncBodyLock() {
    document.body.classList.toggle('modal-open', kaiDialog.open);
    syncLauncher();
  }

  function chooseService(key, { announceChange = true } = {}) {
    if (!services[key]) return;
    const changed = state.service !== key;
    state.service = key;
    syncCalculatorLinks();
    $$('.service-option, .kai-service-options button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.service === key)));
    const serviceHint = $('#serviceHint');
    if (serviceHint) serviceHint.textContent = services[key].hint;
    $('#kaiContext').textContent = services[key].hint;
    $('#kaiContext').classList.remove('is-error');
    $$('.scene-hotspot').forEach(hotspot => {
      const active = hotspot.dataset.hotspot === services[key].hotspot;
      hotspot.classList.toggle('is-active', active);
      hotspot.classList.remove('just-selected');
      if (active && changed) {
        void hotspot.offsetWidth;
        hotspot.classList.add('just-selected');
      }
    });
    window.dispatchEvent(new CustomEvent('kraken:servicechange', { detail: { service: key } }));
    if (announceChange) announce(`${services[key].name} ausgewählt.`);
  }

  $$('[data-service]').forEach(control => control.addEventListener('click', () => chooseService(control.dataset.service)));
  $$('[data-calculator]').forEach(link => {
    link.href = calculatorHref(link.dataset.service || state.service);
    link.addEventListener('click', event => {
      // Modified clicks keep the native link behavior (new tab/window).
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      openCalculator(link.dataset.service || state.service);
    });
  });

  $$('[data-open-kai]').forEach(button => button.addEventListener('click', () => {
    lastKaiOpener = button;
    kaiDialog.returnValue = '';
    $('#kaiContext').classList.remove('is-error');
    $('#kaiContext').textContent = state.service ? services[state.service].hint : 'Welche Aufgabe dürfen wir Ihnen abnehmen?';
    kaiDialog.showModal();
    syncBodyLock();
  }));
  $('#closeKai').addEventListener('click', () => kaiDialog.close('close'));
  kaiDialog.addEventListener('close', () => {
    syncBodyLock();
    const visibleOpener = lastKaiOpener?.isConnected && !lastKaiOpener.hidden && lastKaiOpener.getClientRects().length;
    const focusTarget = visibleOpener ? lastKaiOpener : $$('[data-open-kai]').find(button => !button.hidden && button.getClientRects().length);
    focusTarget?.focus({ preventScroll: true });
  });

  const menuToggle = $('#menuToggle');
  const mobileNav = $('#mobileNav');
  function closeMenu() {
    mobileNav.hidden = true;
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Menü öffnen');
    $('use', menuToggle).setAttribute('href', '#i-menu');
  }
  menuToggle.addEventListener('click', () => {
    const open = menuToggle.getAttribute('aria-expanded') !== 'true';
    mobileNav.hidden = !open;
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Menü schliessen' : 'Menü öffnen');
    $('use', menuToggle).setAttribute('href', open ? '#i-close' : '#i-menu');
  });
  $$('a', mobileNav).forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !mobileNav.hidden) { closeMenu(); menuToggle.focus(); }
  });
  matchMedia('(min-width: 1081px)').addEventListener('change', event => { if (event.matches) closeMenu(); });
  $('#copyrightYear').textContent = new Date().getFullYear();
  syncLauncher();
  const hero = $('.hero, .services-page-hero, .about-page-hero');
  if (hero && 'IntersectionObserver' in window) {
    const heroObserver = new IntersectionObserver(entries => {
      heroIsVisible = entries[0].isIntersecting;
      syncLauncher();
    }, { threshold: 0, rootMargin: '16px' });
    heroObserver.observe(hero);
  } else if (hero) {
    const updateHeroVisibility = () => {
      const bounds = hero.getBoundingClientRect();
      heroIsVisible = bounds.bottom > -16 && bounds.top < innerHeight + 16;
      syncLauncher();
    };
    addEventListener('scroll', updateHeroVisibility, { passive: true });
    addEventListener('resize', updateHeroVisibility);
    updateHeroVisibility();
  } else {
    heroIsVisible = false;
    syncLauncher();
  }
})();
