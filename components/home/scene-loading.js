/** Let the base room paint before its optional animated layers request bandwidth. */
export function createSceneMediaGate(scope, { image, isVisible, onReady, requestFrame = callback => window.requestAnimationFrame(callback), cancelFrame = id => window.cancelAnimationFrame(id) }) {
  let pending = false;
  let ready = false;
  let disposed = false;
  const frames = new Set();
  const frame = callback => {
    const id = requestFrame(() => {
      frames.delete(id);
      if (!disposed && !scope.disposed) callback();
    });
    frames.add(id);
  };
  scope.cleanup(() => {
    disposed = true;
    for (const id of frames) cancelFrame(id);
    frames.clear();
  });
  const gate = {
    request() {
      if (disposed || scope.disposed || pending || ready || !isVisible()) return;
      pending = true;
      const currentImage = typeof image === 'function' ? image() : image;
      Promise.resolve().then(() => {
        if (disposed || scope.disposed) return;
        if (typeof currentImage.decode === 'function') return currentImage.decode();
        if (currentImage.complete) return;
        return new Promise(resolve => {
          scope.on(currentImage, 'load', resolve, { once: true });
          scope.on(currentImage, 'error', resolve, { once: true });
        });
      }).catch(() => {
        // A failed base image must not permanently disable the scene controls.
      }).then(() => {
        if (disposed || scope.disposed) return;
        frame(() => frame(() => {
          pending = false;
          if (!isVisible()) return;
          if (typeof image === 'function' && image() !== currentImage) { gate.request(); return; }
          ready = true;
          onReady();
        }));
      });
    },
  };
  return gate;
}
