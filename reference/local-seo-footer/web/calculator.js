import { siteConfig } from './site-config.js';

export const calculatorUrl = siteConfig.calculatorUrl;

export function calculatorHref(service = null) {
  const destination = new URL(calculatorUrl, window.location.href);
  const calculatorService = siteConfig.calculatorServiceMap[service] || null;
  // The preview owns and validates these non-personal entry parameters.
  if (destination.origin === window.location.origin) {
    if (calculatorService) destination.searchParams.set('service', calculatorService);
    const language = (new URLSearchParams(window.location.search).get('lang') || document.documentElement.lang || 'de').split('-')[0];
    if (['de', 'en', 'es', 'fr', 'it', 'pt'].includes(language)) destination.searchParams.set('lang', language);
  }
  return destination.href;
}

export function openCalculator(service = null) {
  const destination = new URL(calculatorHref(service));
  const calculatorService = siteConfig.calculatorServiceMap[service] || null;
  // A host framework may handle this event with its existing calculator router.
  // If handled, it must preventDefault() and use the original pricing engine.
  const request = new CustomEvent('kraken:opencalculator', {
    cancelable: true,
    detail: { service, calculatorService, url: destination.href }
  });
  if (!window.dispatchEvent(request)) return;

  if (destination.origin === window.location.origin) {
    try {
      if (calculatorService) {
        localStorage.setItem(siteConfig.calculatorServiceStorageKey, calculatorService);
      } else {
        localStorage.removeItem(siteConfig.calculatorServiceStorageKey);
      }
    } catch { /* Navigation still works when browser storage is disabled. */ }
  }
  // Customer details never enter these entry URLs.
  window.location.assign(destination.href);
}
