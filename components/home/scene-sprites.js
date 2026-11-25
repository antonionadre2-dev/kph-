/** Match atlas resolution to its visible cell; keep whole 3×2 or 2×1 grids. */
export function kaiSpriteTargetWidth(renderedCellWidth, columns, devicePixelRatio = 1, mobile = false) {
  const required = Math.ceil(Math.max(1, renderedCellWidth) * columns * Math.max(1, devicePixelRatio));
  return mobile ? Math.min(768, required) : required;
}

/** Date fallback changes the illustration only; it is not a temperature report. */
export function seasonalKaiClothing(month) {
  return month >= 10 || month <= 3 ? 'warm' : 'light';
}

/** Resolve once on weather or after at most 500 ms, with lifecycle-safe cleanup. */
export function createInitialClothingGate(scope, onReady) {
  let ready = false, disposed = false;
  let timer;
  const resolve = () => {
    if (ready || disposed || scope.disposed) return;
    ready = true;
    scope.clearTimeout(timer);
    onReady();
  };
  timer = scope.timeout(resolve, 500);
  scope.cleanup(() => { disposed = true; scope.clearTimeout(timer); });
  return { isReady: () => ready, resolve };
}
