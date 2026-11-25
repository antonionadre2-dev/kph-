// This private design preview keeps the complete journey on its own origin.
export const siteConfig = Object.freeze({
  // Exact company Instagram profile still needs owner confirmation.
  instagramUrl: null,
  calculatorUrl: '/quote',
  calculatorServiceStorageKey: 'kraken_preselected_service',
  calculatorServiceMap: Object.freeze({
    end: 'end-of-tenancy',
    regular: 'daily-cleaning',
    deep: 'deep-cleaning',
    moving: 'moving',
    windows: 'windows'
  })
});
