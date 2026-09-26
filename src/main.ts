/** Minimal progressive enhancements. Every page, product and purchase link
 * remains usable when this module does not run. No tracking or third-party JS. */
export {};

const artwork = document.querySelector<HTMLElement>('[data-artwork]');
if (artwork) {
  // Defer graphics until after the authored image and text are already on screen.
  const start = () => {
    void import('./artwork')
      .then(({ mountArtwork }) => mountArtwork(artwork))
      .catch(() => {
        artwork.dataset.renderer = 'static';
      });
  };
  if ('requestIdleCallback' in window) window.requestIdleCallback(start, { timeout: 1500 });
  else setTimeout(start, 100);
}

// The merch cabinet (filters, shuffle, light and motion) loads on demand, so
// the landing page never pays for it. Without it, every product, link and
// gallery image still works as plain HTML.
if (document.querySelector('.product-grid, [data-gallery-main]'))
  void import('./cabinet').then(({ mountCabinet }) => mountCabinet());
