/**
 * The merch "cabinet of curiosities": presentation-only enhancements for the
 * collection and product pages. Every product, filter, link and purchase path
 * works without this module; it adds light and motion on top.
 *
 * - A lamp follows the pointer (on touch screens it rests mid-screen and moves
 *   with tilt where the browser allows). Products turn toward it like
 *   sunflowers, catch its glare and cast shadows away from it, and the paper
 *   takes on the colours of the product being looked at (build-time palettes).
 * - Filters are a prism: products leaving the collection fly into the chosen
 *   filter, new ones fly out of it, and a glass lens slides between filters.
 * - "Surprise me" gathers the collection into a pile and deals it out again.
 * - Eleven dots light up in each product's colour as it is discovered; the
 *   complete set assembles into the Guni mark.
 *
 * The frame loop runs only while the lamp moves. Reduced motion keeps
 * everything still and makes every change instant.
 */
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const coarse = matchMedia('(pointer: coarse)');
const clamp = (value: number, min = -1, max = 1) => Math.min(max, Math.max(min, value));
const centre = (box: DOMRect) => ({ x: box.left + box.width / 2, y: box.top + box.height / 2 });
const SPRING = 'cubic-bezier(.3,1.25,.4,1)';
// On touch screens the lamp rests mid-screen, bright enough that its glare
// visibly sweeps across photos as they scroll past.
const REST = 0.85;

type Lit = { el: HTMLElement; x: number; y: number; w: number; h: number };
export type Lamp = { measure(): void; aim(el: HTMLElement): void };

/** An aria-hidden copy of an italic title that paints only a prismatic band
 * where the lamp passes, like foil. Skipped if the title wraps. */
function foil(title: HTMLElement | null) {
  if (!title || title.getClientRects().length !== 1) return null;
  const sheen = document.createElement('span');
  sheen.className = 'headline-sheen';
  sheen.setAttribute('aria-hidden', 'true');
  sheen.textContent = title.textContent;
  title.append(sheen);
  title.classList.add('has-sheen');
  return { title, sheen, x: 0, y: 0, w: 1, h: 1 };
}

function createLamp(targets: HTMLElement[], artOf: (el: HTMLElement) => HTMLElement): Lamp {
  const root = document.documentElement;
  const pool = document.createElement('div');
  pool.className = 'lamp';
  pool.setAttribute('aria-hidden', 'true');
  document.body.prepend(pool);
  let lit: Lit[] = [];
  const title = foil(document.querySelector<HTMLElement>('.merch-intro h1 em'));
  const lamp = { x: innerWidth / 2, y: innerHeight * 0.42, on: 0 };
  const aim = { ...lamp };
  const tilt = { x: 0, y: 0, base: null as null | { x: number; y: number } };
  let frame = 0;
  let previous = 0;

  // Page positions, from layout offsets so a card's own tilt never skews them.
  function measure() {
    lit = targets
      .filter((el) => !el.hidden)
      .map((el) => {
        const art = artOf(el);
        const box = el.getBoundingClientRect();
        return {
          el,
          x: box.left + scrollX + art.offsetLeft + art.offsetWidth / 2,
          y: box.top + scrollY + art.offsetTop + art.offsetHeight / 2,
          w: art.offsetWidth,
          h: art.offsetHeight,
        };
      });
    if (title) {
      const box = title.title.getBoundingClientRect();
      Object.assign(title, {
        x: box.left + scrollX,
        y: box.top + scrollY + box.height / 2,
        w: Math.max(1, box.width),
        h: Math.max(1, box.height),
      });
    }
  }
  // Touch screens have no hover: the lamp rests mid-screen, nudged by tilt,
  // and products turn toward it as they scroll past.
  function rest() {
    if (!coarse.matches) return;
    aim.x = innerWidth * (0.5 + tilt.x * 0.4);
    aim.y = innerHeight * (0.42 + tilt.y * 0.3);
    aim.on = REST;
  }
  function apply() {
    root.style.setProperty('--lx', `${lamp.x.toFixed(1)}px`);
    root.style.setProperty('--ly', `${lamp.y.toFixed(1)}px`);
    root.style.setProperty('--lamp-on', lamp.on.toFixed(3));
    for (const { el, x, y, w, h } of lit) {
      const dx = lamp.x - (x - scrollX);
      const dy = lamp.y - (y - scrollY);
      const distance = Math.hypot(dx, dy) || 1;
      const near = Math.exp(-((distance / 1100) ** 2)) * lamp.on;
      const cast = (Math.min(distance * 0.02, 16) / distance) * lamp.on;
      const s = el.style;
      s.setProperty('--ry', `${(clamp(dx / 800) * 8 * lamp.on).toFixed(2)}deg`);
      s.setProperty('--rx', `${(clamp(-dy / 800) * 6 * lamp.on).toFixed(2)}deg`);
      s.setProperty('--gx', `${(50 + clamp(dx / w) * 45).toFixed(1)}%`);
      s.setProperty('--gy', `${(50 + clamp(dy / h) * 45).toFixed(1)}%`);
      s.setProperty('--glare', (0.45 * near).toFixed(3));
      s.setProperty('--sx', `${(-dx * cast).toFixed(1)}px`);
      s.setProperty('--sy', `${(10 - dy * cast).toFixed(1)}px`);
      s.setProperty('--shade', (0.9 * lamp.on).toFixed(3));
    }
    if (title) {
      const near = Math.exp(-(((lamp.y - (title.y - scrollY)) / (title.h * 1.6)) ** 2));
      const across = ((lamp.x - (title.x - scrollX)) / title.w) * 100;
      title.sheen.style.setProperty('--sheen-x', `${clamp(across, -30, 130).toFixed(1)}%`);
      title.sheen.style.opacity = (near * lamp.on).toFixed(3);
    }
  }
  function step(now: number) {
    frame = 0;
    if (motion.matches) return;
    const ease = 1 - Math.exp(-Math.min(0.05, previous ? (now - previous) / 1000 : 0.016) * 9);
    previous = now;
    lamp.x += (aim.x - lamp.x) * ease;
    lamp.y += (aim.y - lamp.y) * ease;
    lamp.on += (aim.on - lamp.on) * ease;
    apply();
    if (
      Math.abs(aim.x - lamp.x) + Math.abs(aim.y - lamp.y) + Math.abs(aim.on - lamp.on) * 100 >
      0.6
    )
      frame = requestAnimationFrame(step);
    else previous = 0;
  }
  function kick() {
    if (!frame && !motion.matches) frame = requestAnimationFrame(step);
  }

  const options = { passive: true };
  addEventListener(
    'pointermove',
    (event) => {
      if (event.pointerType === 'touch') return;
      Object.assign(aim, { x: event.clientX, y: event.clientY, on: 1 });
      kick();
    },
    options,
  );
  root.addEventListener('pointerleave', () => {
    aim.on = coarse.matches ? REST : 0;
    kick();
  });
  // Scrolling moves the products under a still lamp.
  let scrolling = 0;
  addEventListener(
    'scroll',
    () => {
      if (scrolling || motion.matches) return;
      scrolling = requestAnimationFrame(() => {
        scrolling = 0;
        apply();
      });
    },
    options,
  );
  addEventListener('resize', () => {
    measure();
    rest();
    kick();
  });
  addEventListener(
    'deviceorientation',
    (event) => {
      if (!coarse.matches || event.beta === null || event.gamma === null) return;
      tilt.base ??= { x: event.gamma, y: event.beta };
      tilt.base.x += (event.gamma - tilt.base.x) * 0.01;
      tilt.base.y += (event.beta - tilt.base.y) * 0.01;
      const x = clamp((event.gamma - tilt.base.x) / 20);
      const y = clamp((event.beta - tilt.base.y) / 20);
      // A dead zone keeps hand tremor from animating the page.
      if (Math.hypot(x - tilt.x, y - tilt.y) < 0.04) return;
      Object.assign(tilt, { x, y });
      rest();
      kick();
    },
    options,
  );
  motion.addEventListener('change', () => {
    aim.on = lamp.on = 0;
    apply();
    rest();
    kick();
  });
  measure();
  rest();
  kick();
  return {
    measure() {
      measure();
      apply();
    },
    // Keyboard focus lights the focused product.
    aim(el) {
      const target = lit.find((item) => item.el === el);
      if (!target) return;
      Object.assign(aim, { x: target.x - scrollX, y: target.y - scrollY, on: 1 });
      kick();
    },
  };
}

/** The lamp takes on the colours of the product being looked at, and
 * brightens: the product seems to glow in its own light. */
function tint(el: HTMLElement | null) {
  const root = document.documentElement;
  const colour = el?.style.getPropertyValue('--glow');
  root.classList.toggle('is-tinted', !!colour);
  if (colour) root.style.setProperty('--lamp-color', colour);
  else root.style.removeProperty('--lamp-color');
}

// The completed constellation is the Guni mark: two interlinked, tilted
// rings of five dots and a detached dot at the upper right. Like a star
// constellation, lines through the dots make the rings legible.
const RINGS = [
  { x: 18, y: 2 },
  { x: 46, y: -3 },
];
function markPosition(i: number) {
  if (i === 10) return { x: 74, y: -17 };
  const ring = RINGS[i < 5 ? 0 : 1];
  const angle = ((i % 5) / 5) * Math.PI * 2 + (i < 5 ? 0.35 : 3.5);
  const [ex, ey] = [Math.cos(angle) * 20, Math.sin(angle) * 12];
  const turn = -0.55;
  return {
    x: ring.x + ex * Math.cos(turn) - ey * Math.sin(turn),
    y: ring.y + ex * Math.sin(turn) + ey * Math.cos(turn),
  };
}

function setupCollection(grid: HTMLElement, toolbar: HTMLElement, lamp: Lamp) {
  toolbar.hidden = false;
  const cards = [...grid.querySelectorAll<HTMLElement>('.product-card')];
  const filters = [...toolbar.querySelectorAll<HTMLButtonElement>('[data-filter]')];
  const group = toolbar.querySelector<HTMLElement>('.filter-group')!;
  const count = document.querySelector<HTMLElement>('[data-count]')!;
  cards.forEach((card, i) => card.style.setProperty('--i', String(i)));

  // A glass lens slides to the chosen filter. It carries inverted copies of
  // every label, counter-moved so they stay put: whatever the lens covers,
  // even halfway through a slide, reads light on dark.
  const lens = document.createElement('span');
  lens.className = 'filter-lens';
  lens.setAttribute('aria-hidden', 'true');
  const labels = document.createElement('span');
  labels.className = 'filter-lens-labels';
  for (const button of filters) {
    const copy = document.createElement('span');
    copy.className = 'filter-button';
    copy.textContent = button.textContent;
    labels.append(copy);
  }
  lens.append(labels);
  group.append(lens);
  group.classList.add('has-lens');
  function placeLens(button: HTMLButtonElement) {
    filters.forEach((item, i) => {
      Object.assign((labels.children[i] as HTMLElement).style, {
        left: `${item.offsetLeft}px`,
        top: `${item.offsetTop}px`,
        width: `${item.offsetWidth}px`,
        height: `${item.offsetHeight}px`,
      });
    });
    lens.style.setProperty('--x', `${button.offsetLeft}px`);
    lens.style.setProperty('--y', `${button.offsetTop}px`);
    lens.style.setProperty('--w', `${button.offsetWidth}px`);
    lens.style.setProperty('--h', `${button.offsetHeight}px`);
  }

  // A leaving product keeps its place in the DOM state; a decorative copy
  // flies into the filter while the real grid updates at once.
  function ghost(card: HTMLElement, from: DOMRect, into: { x: number; y: number }) {
    const copy = card.cloneNode(true) as HTMLElement;
    copy.removeAttribute('data-slug');
    copy.setAttribute('aria-hidden', 'true');
    copy.inert = true;
    copy.querySelector('img')?.style.removeProperty('view-transition-name');
    copy.classList.add('product-ghost');
    Object.assign(copy.style, {
      left: `${from.left}px`,
      top: `${from.top}px`,
      width: `${from.width}px`,
      height: `${from.height}px`,
    });
    document.body.append(copy);
    const c = centre(from);
    copy
      .animate(
        [
          { transform: 'none', opacity: 1 },
          { transform: `translate(${into.x - c.x}px, ${into.y - c.y}px) scale(.06)`, opacity: 0 },
        ],
        { duration: 520, easing: 'cubic-bezier(.55,0,.8,.35)' },
      )
      .finished.finally(() => copy.remove());
  }

  function filter(category: string, animate: boolean) {
    count.parentElement!.removeAttribute('aria-label');
    const pressed = filters.find((button) => button.dataset.filter === category) ?? filters[0];
    for (const button of filters) button.setAttribute('aria-pressed', String(button === pressed));
    placeLens(pressed);
    const show = (card: HTMLElement) => category === 'all' || card.dataset.category === category;
    const flights = animate && !motion.matches;
    const before = new Map(
      cards.filter((card) => !card.hidden).map((card) => [card, card.getBoundingClientRect()]),
    );
    const prism = centre(pressed.getBoundingClientRect());
    if (flights) for (const [card, box] of before) if (!show(card)) ghost(card, box, prism);
    for (const card of cards) card.hidden = !show(card);
    const total = String(cards.filter((card) => !card.hidden).length);
    const rolled = count.textContent !== total;
    count.textContent = total;
    lamp.measure();
    if (!flights) return;
    if (rolled)
      count.animate(
        [{ transform: 'translateY(-70%)', opacity: 0, filter: 'blur(2px)' }, { transform: 'none' }],
        { duration: 520, easing: SPRING },
      );
    cards
      .filter((card) => !card.hidden)
      .forEach((card, i) => {
        const box = card.getBoundingClientRect();
        const old = before.get(card);
        if (old)
          card.animate(
            [{ transform: `translate(${old.left - box.left}px, ${old.top - box.top}px)` }, {}],
            { duration: 640, easing: SPRING },
          );
        else {
          const c = centre(box);
          card.animate(
            [
              {
                transform: `translate(${prism.x - c.x}px, ${prism.y - c.y}px) scale(.06)`,
                opacity: 0,
              },
              { transform: 'none', opacity: 1 },
            ],
            { duration: 760, delay: 140 + i * 45, easing: SPRING, fill: 'backwards' },
          );
        }
      });
  }
  const initial = new URL(location.href).searchParams.get('collection');
  // The lens slides only after its first placement.
  requestAnimationFrame(() => requestAnimationFrame(() => lens.classList.add('is-ready')));
  filter(
    initial && filters.some((button) => button.dataset.filter === initial) ? initial : 'all',
    false,
  );
  for (const button of filters)
    button.addEventListener('click', () => {
      const category = button.dataset.filter!;
      filter(category, true);
      const url = new URL(location.href);
      if (category === 'all') url.searchParams.delete('collection');
      else url.searchParams.set('collection', category);
      history.replaceState(null, '', url);
    });
  const relens = () =>
    placeLens(filters.find((button) => button.getAttribute('aria-pressed') === 'true')!);
  addEventListener('resize', relens);
  void document.fonts?.ready.then(relens);

  // Surprise me: gather the visible products into a pile, then deal them out
  // in a new order. The order itself changes at once, like the plain shuffle.
  const shuffleButton = toolbar.querySelector<HTMLButtonElement>('.shuffle-button')!;
  shuffleButton.addEventListener('click', () => {
    const ordered = [...grid.children].filter(
      (card): card is HTMLElement => card instanceof HTMLElement && !card.hidden,
    );
    if (ordered.length < 2) return;
    const before = new Map(ordered.map((card) => [card, card.getBoundingClientRect()]));
    const shuffled = [...ordered];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    if (shuffled.every((card, i) => card === ordered[i])) shuffled.push(shuffled.shift()!);
    grid.append(...shuffled);
    lamp.measure();
    count.parentElement!.setAttribute(
      'aria-label',
      `Collection shuffled. ${ordered.length} things to discover.`,
    );
    if (motion.matches) return;
    // The pile forms mid-screen, so the deal is seen even when the grid
    // starts below the fold.
    shuffleButton
      .querySelector('.icon')
      ?.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(360deg)' }], {
        duration: 900,
        easing: SPRING,
      });
    const area = grid.getBoundingClientRect();
    const pile = {
      x: clamp(area.left + area.width / 2, 0, innerWidth),
      y: innerHeight * 0.55,
    };
    shuffled.forEach((card, i) => {
      const old = before.get(card)!;
      const box = card.getBoundingClientRect();
      const c = centre(box);
      const spin = (Math.random() - 0.5) * 28;
      const toPile = `translate(${pile.x - c.x}px, ${pile.y - c.y}px)`;
      card.style.zIndex = String(40 + shuffled.length - i);
      // Only the photos travel as a deck; names and links wait in place.
      for (const part of card.querySelectorAll(':scope > :not(.product-art)'))
        part.animate(
          [
            { opacity: 1 },
            { opacity: 0, offset: 0.12 },
            { opacity: 0, offset: 0.82 },
            { opacity: 1 },
          ],
          { duration: 1500 },
        );
      card
        .animate(
          [
            {
              transform: `translate(${old.left - box.left}px, ${old.top - box.top}px)`,
              easing: 'cubic-bezier(.5,0,.35,1)',
            },
            { transform: `${toPile} rotate(${spin}deg) scale(.6)`, offset: 0.36 },
            {
              transform: `${toPile} rotate(${-spin * 0.3}deg) scale(.6)`,
              offset: 0.44 + i * (0.4 / shuffled.length),
              easing: 'cubic-bezier(.2,.9,.25,1)',
            },
            { transform: 'none' },
          ],
          { duration: 1500 },
        )
        .finished.finally(() => card.style.removeProperty('z-index'));
    });
  });

  // Discovery: seen for a moment, hovered, or focused. The dots are
  // decorative; the collection count stays the accessible summary.
  const dots = document.createElement('span');
  dots.className = 'constellation';
  dots.setAttribute('aria-hidden', 'true');
  const dotOf = new Map<HTMLElement, HTMLElement>();
  cards.forEach((card, i) => {
    const dot = document.createElement('i');
    const colour = card.style.getPropertyValue('--glow');
    if (colour) dot.style.setProperty('--c', colour);
    const at = markPosition(i);
    dot.style.setProperty('--tx', `${(at.x - i * 11).toFixed(1)}px`);
    dot.style.setProperty('--ty', `${at.y.toFixed(1)}px`);
    dot.style.setProperty('--i', String(i));
    dots.append(dot);
    dotOf.set(card, dot);
  });
  // Ring lines, centred on the dots (6px dots; positions are their corners).
  const ns = 'http://www.w3.org/2000/svg';
  const lines = document.createElementNS(ns, 'svg');
  lines.setAttribute('focusable', 'false');
  for (const ring of RINGS) {
    const ellipse = document.createElementNS(ns, 'ellipse');
    ellipse.setAttribute('cx', String(ring.x + 3));
    ellipse.setAttribute('cy', String(ring.y + 3));
    ellipse.setAttribute('rx', '20');
    ellipse.setAttribute('ry', '12');
    ellipse.setAttribute('pathLength', '100');
    ellipse.setAttribute('transform', `rotate(-31.5 ${ring.x + 3} ${ring.y + 3})`);
    lines.append(ellipse);
  }
  dots.prepend(lines);
  count.parentElement!.append(dots);
  const seen = new Set<HTMLElement>();
  const waiting = new Map<HTMLElement, number>();
  function discover(card: HTMLElement) {
    if (seen.has(card)) return;
    seen.add(card);
    dotOf.get(card)!.classList.add('is-lit');
    if (seen.size < cards.length) return;
    dots.classList.add('is-complete');
    grid.classList.add('is-celebrating');
    setTimeout(() => grid.classList.remove('is-celebrating'), 2600);
  }
  function soon(card: HTMLElement, ms: number) {
    if (seen.has(card) || waiting.has(card)) return;
    waiting.set(
      card,
      window.setTimeout(() => {
        waiting.delete(card);
        discover(card);
      }, ms),
    );
  }
  function cancel(card: HTMLElement) {
    clearTimeout(waiting.get(card));
    waiting.delete(card);
  }
  const watcher = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const card = entry.target as HTMLElement;
        if (entry.isIntersecting) soon(card, 1200);
        else cancel(card);
      }
    },
    { threshold: 0.6 },
  );
  for (const card of cards) {
    watcher.observe(card);
    card.addEventListener('pointerenter', () => {
      tint(card);
      soon(card, 450);
    });
    card.addEventListener('focusin', () => {
      tint(card);
      lamp.aim(card);
      discover(card);
    });
  }
  grid.addEventListener('pointerleave', () => tint(null));
}

function setupGallery(main: HTMLImageElement) {
  const thumbnails = [...document.querySelectorAll<HTMLAnchorElement>('[data-gallery-src]')];
  for (const thumbnail of thumbnails)
    thumbnail.addEventListener('click', (event) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      const swap = () => {
        main.src = thumbnail.dataset.gallerySrc!;
        main.alt = thumbnail.dataset.galleryAlt!;
        for (const item of thumbnails) {
          if (item === thumbnail) item.setAttribute('aria-current', 'true');
          else item.removeAttribute('aria-current');
        }
      };
      // The main photo morphs between views where the browser supports it.
      // A hidden page skips the transition (the swap still runs) and rejects
      // its ready promise, which is expected, not an error.
      if (document.startViewTransition && !motion.matches && !document.hidden)
        document.startViewTransition(swap).ready.catch(() => {});
      else swap();
    });
}

export function mountCabinet() {
  const grid = document.querySelector<HTMLElement>('.product-grid');
  const toolbar = document.querySelector<HTMLElement>('.catalog-toolbar');
  const main = document.querySelector<HTMLImageElement>('[data-gallery-main]');
  const targets = grid
    ? [...grid.querySelectorAll<HTMLElement>('.product-card')]
    : main
      ? [main.closest<HTMLElement>('.product-gallery')!]
      : [];
  if (!targets.length) return;
  const lamp = createLamp(
    targets,
    (el) => el.querySelector<HTMLElement>('.product-art, .gallery-main') ?? el,
  );
  if (grid && toolbar) setupCollection(grid, toolbar, lamp);
  if (main) {
    tint(main.closest<HTMLElement>('.product-detail'));
    setupGallery(main);
  }
}
