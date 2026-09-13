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

const toolbar = document.querySelector<HTMLElement>('.catalog-toolbar');
const grid = document.querySelector<HTMLElement>('.product-grid');
if (toolbar && grid) {
  toolbar.hidden = false;
  const cards = [...grid.querySelectorAll<HTMLElement>('.product-card')];
  const filters = [...toolbar.querySelectorAll<HTMLButtonElement>('[data-filter]')];
  const count = document.querySelector<HTMLElement>('[data-count]')!;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  function filter(category: string) {
    count.parentElement!.removeAttribute('aria-label');
    for (const button of filters)
      button.setAttribute('aria-pressed', String(button.dataset.filter === category));
    for (const card of cards)
      card.hidden = category !== 'all' && card.dataset.category !== category;
    count.textContent = String(cards.filter((card) => !card.hidden).length);
  }
  const initial = new URL(location.href).searchParams.get('collection');
  if (initial && filters.some((button) => button.dataset.filter === initial)) filter(initial);
  for (const button of filters)
    button.addEventListener('click', () => {
      const category = button.dataset.filter!;
      filter(category);
      const url = new URL(location.href);
      if (category === 'all') url.searchParams.delete('collection');
      else url.searchParams.set('collection', category);
      history.replaceState(null, '', url);
    });

  toolbar.querySelector<HTMLButtonElement>('.shuffle-button')!.addEventListener('click', () => {
    const visible = cards.filter((card) => !card.hidden);
    if (visible.length < 2) return;
    const before = new Map(visible.map((card) => [card, card.getBoundingClientRect()]));
    const ordered = [...grid.children].filter(
      (card): card is HTMLElement => card instanceof HTMLElement && !card.hidden,
    );
    const shuffled = [...ordered];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    if (shuffled.every((card, i) => card === ordered[i])) shuffled.push(shuffled.shift()!);
    grid.append(...shuffled);
    if (!reducedMotion.matches)
      for (const card of shuffled) {
        const old = before.get(card)!;
        const next = card.getBoundingClientRect();
        card.animate(
          [
            { transform: `translate(${old.x - next.x}px,${old.y - next.y}px)` },
            { transform: 'translate(0,0)' },
          ],
          { duration: 550, easing: 'cubic-bezier(.2,.65,.3,1)' },
        );
      }
    count.parentElement!.setAttribute(
      'aria-label',
      `Collection shuffled. ${visible.length} things to discover.`,
    );
  });
}

const gallery = document.querySelector<HTMLImageElement>('[data-gallery-main]');
if (gallery) {
  const thumbnails = [...document.querySelectorAll<HTMLAnchorElement>('[data-gallery-src]')];
  for (const thumbnail of thumbnails)
    thumbnail.addEventListener('click', (event) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      gallery.src = thumbnail.dataset.gallerySrc!;
      gallery.alt = thumbnail.dataset.galleryAlt!;
      for (const item of thumbnails) {
        if (item === thumbnail) item.setAttribute('aria-current', 'true');
        else item.removeAttribute('aria-current');
      }
    });
}
