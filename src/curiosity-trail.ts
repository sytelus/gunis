/** Brief refractive fragments, not a drawn guide line. The artwork supplies
 * time and owns all event handlers, visibility and reduced-motion behavior. */
type Point = { x: number; y: number };
const CAPACITY = 48;
const EMISSION_INTERVAL = 0.055;
// Deep chromatic cores hold up on paper; glow alone has too little contrast.
const COLORS = ['#a84219', '#684588', '#326a7c', '#896013', '#c63d18'];
const FRAGMENTS = [
  'M-3 0L0-1.2L3 .2L0 1.2Z', // thin glass sliver
  'M-1.8-1.5L2.4-.5L.7 2Z', // rotating shard
  'M-4-.3Q0-1.4 4 .2Q0 .7-4-.3Z', // curved filament
  'M0-2.5Q.4-.4 2 0Q.4 .4 0 2.5Q-.4 .4-2 0Q-.4-.4 0-2.5Z', // small glint
  'M-1 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0', // dust mote
];

export function createCuriosityTrail(host: HTMLElement) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.classList.add('curiosity-trail');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.style.opacity = '0';
  // Reuse a fixed pool: pointer movement never grows the DOM or starts a timer.
  const fragments = Array.from({ length: CAPACITY }, (_, i) => {
    const group = document.createElementNS(ns, 'g');
    const halo = document.createElementNS(ns, 'circle');
    halo.setAttribute('r', i % 5 === 3 ? '4.5' : '2.5');
    halo.setAttribute('fill', '#e5b05a');
    halo.setAttribute('opacity', '.28');
    const shape = document.createElementNS(ns, 'path');
    shape.setAttribute('d', FRAGMENTS[i % FRAGMENTS.length]);
    shape.setAttribute('fill', COLORS[i % COLORS.length]);
    group.append(halo, shape);
    group.setAttribute('opacity', '0');
    svg.append(group);
    return {
      group,
      born: -10,
      life: 0.5,
      from: { x: 0, y: 0 },
      control: { x: 0, y: 0 },
      to: { x: 0, y: 0 },
      angle: 0,
      spin: 0,
      size: 1,
      phase: 0,
    };
  });
  host.append(svg);
  let next = 0;
  let emittedAt = -10;
  let discovered = false;

  function clear() {
    emittedAt = -10;
    for (const fragment of fragments) {
      fragment.born = -10;
      fragment.group.setAttribute('opacity', '0');
    }
    svg.style.opacity = '0';
  }

  return {
    point(x: number, y: number, destination: Point, time: number) {
      if (discovered || time - emittedAt < EMISSION_INTERVAL) return;
      emittedAt = time;
      for (let i = 0; i < 8; i++) {
        const fragment = fragments[next++ % CAPACITY];
        const scatter = (Math.random() - 0.5) * 42;
        fragment.born = time;
        // Each fragment finishes within 650ms, even if the pointer stops.
        fragment.life = 0.38 + Math.random() * 0.27;
        fragment.from = { x: x + (Math.random() - 0.5) * 18, y: y + (Math.random() - 0.5) * 18 };
        fragment.to = { x: destination.x + scatter * 0.25, y: destination.y + scatter };
        fragment.control = {
          x: x + (destination.x - x) * 0.55 + scatter,
          y: y + (destination.y - y) * 0.25 + scatter,
        };
        fragment.angle = Math.random() * 180;
        fragment.spin = (Math.random() - 0.5) * 160;
        fragment.size = 1.6 + Math.random() * 0.9;
        fragment.phase = Math.random() * Math.PI;
      }
    },
    hide: clear,
    dismiss() {
      discovered = true;
      clear();
    },
    draw(time: number) {
      let active = false;
      for (const fragment of fragments) {
        const age = (time - fragment.born) / fragment.life;
        if (age < 0 || age >= 1) {
          fragment.group.setAttribute('opacity', '0');
          continue;
        }
        active = true;
        // Accelerate toward the sculpture; independent curves, tumbling and
        // twinkle create a small refractive wake without showing the paths.
        const t = age * age * (2 - age);
        const x =
          (1 - t) ** 2 * fragment.from.x +
          2 * (1 - t) * t * fragment.control.x +
          t * t * fragment.to.x;
        const y =
          (1 - t) ** 2 * fragment.from.y +
          2 * (1 - t) * t * fragment.control.y +
          t * t * fragment.to.y;
        // Keep a readable core for most of the short flight. Only its first
        // 8% and final 20% fade; twinkle must not make the whole wake vanish.
        const light = 0.82 + 0.18 * Math.sin(age * Math.PI * 2 + fragment.phase) ** 2;
        const opacity = Math.min(1, age / 0.08, (1 - age) / 0.2) * light;
        fragment.group.setAttribute('opacity', String(opacity));
        fragment.group.setAttribute(
          'transform',
          `translate(${x} ${y}) rotate(${fragment.angle + age * fragment.spin}) scale(${fragment.size * (1 - age * 0.3)})`,
        );
      }
      svg.style.opacity = active ? '1' : '0';
    },
    destroy: () => svg.remove(),
  };
}
