// Public calculator route; the legacy /quote address redirects to this URL.
export const siteConfig = Object.freeze({
  // Exact company Instagram profile still needs owner confirmation.
  instagramUrl: null,
  calculatorUrl: '/offerte',
  calculatorServiceStorageKey: 'kraken_preselected_service',
  calculatorServiceMap: Object.freeze({
    end: 'end-of-tenancy',
    regular: 'daily-cleaning',
    deep: 'deep-cleaning',
    moving: 'moving',
    // The existing calculator has no verified standalone window-cleaning ID.
    // Integrate that service explicitly; never substitute deep cleaning.
    windows: null
  })
});
