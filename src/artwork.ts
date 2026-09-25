/**
 * Landing-page artwork orchestration: input, time, discovery and settling.
 *
 * The authored <img> stays the source of truth and the fallback at every stage.
 * With WebGL2 a page-wide light field (light-field.ts) redraws the sculpture and
 * a GPU swarm of "small brains"; otherwise the image responds with perspective
 * and the SVG curiosity trail. Either way:
 *
 * - One requestAnimationFrame loop drives everything, including the headline.
 * - Arrival motion lasts 4.5 animation seconds and every interaction adds 3.2;
 *   the final 1.1 seconds ease all motion to rest and then no frames run.
 *   Escape settles immediately. Reduced motion keeps everything still.
 * - Discovery is layered. Stirred motes lead to the sculpture until it has been
 *   explored (level 1), then learn to flow along it; tapping, holding and
 *   shaking teach the swarm to anticipate the pointer (level 2); drawing a loop
 *   around the sculpture (or four rotating arrow keys, a circular phone tilt, or
 *   enough play) "upgrades" it (level 3). Nothing is stored between visits.
 */
import { createCuriosityTrail } from './curiosity-trail';
import { createLoopTracker, isArrowLoop } from './gestures';
import { createHeadline } from './headline';
import {
  createFieldState,
  createLightField,
  type LightField,
  type LoopPoint,
  type Rect,
} from './light-field';
import mapsUrl from './assets/learning-loop-maps.png';
import { points } from './data/loop-path.json';

const INTRO = 4.5;
const RESPONSE = 3.2;
const CALM = 1.1;
const HOVER_RIPPLE = 0.45;
// Floor-glow ellipse in image UV, measured by scripts/sculpture-maps.mjs.
const FLOOR: [number, number, number, number] = [0.4974, 0.9232, 0.3375, 0.0293];
// Observed frame pacing, never GPU identity, picks the drawing-buffer budget
// and swarm density. Level factors let the swarm grow as the visitor plays.
const TIERS = [
  { pixels: 1.4e6, density: 1 / 150 },
  { pixels: 3.2e6, density: 1 / 85 },
  { pixels: 5.6e6, density: 1 / 55 },
];
const LEVEL_SWARM = [0.72, 0.86, 1, 1.12];

type SensorPermission = { requestPermission?: () => Promise<string> };

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
/** Writes a uniform vector in place; the frame loop allocates nothing. */
function put(target: Float32Array, a: number, b: number, c: number, d: number) {
  target[0] = a;
  target[1] = b;
  target[2] = c;
  target[3] = d;
}
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

async function loadImage(url: string): Promise<HTMLImageElement | null> {
  const image = new Image();
  image.decoding = 'async';
  image.src = url;
  try {
    await image.decode();
    return image;
  } catch {
    return null;
  }
}

/** The artwork's studio backdrop is one step darker than the page paper. The
 * shader adds this difference so the feathered edge disappears completely. */
function paperShift(image: HTMLImageElement): [number, number, number] {
  const probe = document.createElement('canvas');
  probe.width = probe.height = 8;
  const context = probe.getContext('2d', { willReadFrequently: true });
  const paper = getComputedStyle(document.documentElement).backgroundColor.match(/[\d.]+/g);
  if (!context || !paper || paper.length < 3) return [0, 0, 0];
  context.drawImage(image, 0, 0, 24, 24, 0, 0, 8, 8);
  const data = context.getImageData(0, 0, 8, 8).data;
  return [0, 1, 2].map((c) => {
    let sum = 0;
    for (let i = c; i < data.length; i += 4) sum += data[i];
    return (Number(paper[c]) - sum / 64) / 255;
  }) as [number, number, number];
}

/** A small CPU copy of the silhouette for hit-testing the actual figure. */
function readMatte(maps: HTMLImageElement) {
  const w = 112;
  const h = Math.round((w * maps.naturalHeight) / maps.naturalWidth);
  const probe = document.createElement('canvas');
  probe.width = w;
  probe.height = h;
  const context = probe.getContext('2d', { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(maps, 0, 0, w, h);
  const data = context.getImageData(0, 0, w, h).data;
  const values = new Uint8Array(w * h);
  for (let i = 0; i < values.length; i++) values[i] = data[i * 4];
  return { w, h, values };
}

export async function mountArtwork(root: HTMLElement): Promise<() => void> {
  const image = root.querySelector<HTMLImageElement>('.artwork-image')!;
  const surface = root.querySelector<HTMLButtonElement>('.artwork-touch')!;
  const host = root.closest<HTMLElement>('.home-shell')!;
  const hint = document.querySelector<HTMLElement>('.artwork-hint')!;
  const announcement = document.querySelector<HTMLElement>('[data-artwork-announcement]')!;
  const heading = document.querySelector<HTMLElement>('.hero-copy h1');
  const status = document.querySelector<HTMLElement>('.launch-status > span');
  const mark = document.querySelector<HTMLElement>('.brand-mark');
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  const events = new AbortController();
  const options = { signal: events.signal };
  try {
    await image.decode();
  } catch {
    return () => {};
  }
  const maps = await loadImage(mapsUrl);
  const canvas = document.createElement('canvas');
  canvas.className = 'light-field';
  canvas.setAttribute('aria-hidden', 'true');
  host.before(canvas);
  const tone = paperShift(image);
  const matte = maps ? readMatte(maps) : null;
  const makeField = () =>
    maps
      ? createLightField(canvas, image, maps, points as unknown as LoopPoint[], {
          paper: tone,
          floor: FLOOR,
        })
      : null;
  let field: LightField | null = makeField();
  let trail: ReturnType<typeof createCuriosityTrail> | null = null;
  const S = createFieldState();
  let box = canvas.getBoundingClientRect();
  // Letter widths are measured once, so wait for the web fonts first.
  await document.fonts?.ready;
  const headline = heading ? createHeadline(heading, () => box) : null;

  let frame = 0;
  let previous = 0;
  let elapsed = 0;
  let activeUntil = INTRO;
  let paused = media.matches;
  let visible = !document.hidden;
  let art: Rect = { x: 0, y: 0, w: 1, h: 1 };
  let tier = 1;
  let frames = 0;
  let pace = 1 / 60;
  let steady = 0;
  let downgraded = false;
  let areaCount = 0;

  // presence follows recent movement (the swarm's wake); hover stays while the
  // pointer rests over the page (the heading and lens answer a still hand).
  const pointer = { x: -1e4, y: -1e4, px: -1e4, py: -1e4, vx: 0, vy: 0, presence: 0, hover: 0 };
  let hovering = 0;
  let pointerTime = -1e4;
  let pointerType = 'mouse';
  let inside = false;
  let lastHoverRipple = -10;
  const light = { x: 0, y: 0, tx: 0, ty: 0, activity: 0, glint: 0 };
  const lens = { strength: 0, lift: 0 };
  const rippleTimes = [-10, -10, -10, -10];
  let rippleSlot = 0;
  // Holds are measured in real time: animation time runs slower on a busy GPU.
  const press = { active: false, id: -1, start: 0, x: 0, y: 0 };
  const held = () => (performance.now() - press.start) / 1000;
  let burstImpulse = 0;
  let flash = 0;
  let shakeImpulse = 0;
  const exhale = { start: -10, duration: 1, total: 0 };
  let introSweep = true;
  let upgradeAt = -100;
  let upgradeBurst = true;
  let upgraded = 0;
  let level = 0;
  let discovered = false;
  let taps = 0;
  let bursts = 0;
  let playTime = 0;
  let shaken = false;
  const loop = createLoopTracker();
  const tiltLoop = createLoopTracker({ minRadius: 0.35, maxRadius: 4, windowMs: 5000, gapMs: 900 });
  const keys: string[] = [];
  const tilt = {
    base: null as null | { x: number; y: number },
    x: 0,
    y: 0,
    sx: 0,
    sy: 0,
    ax: 0,
    ay: 0,
    time: 0,
  };
  let tiltTime = -1e4;
  let exploration: {
    x: number;
    y: number;
    time: number;
    started: number;
    distance: number;
  } | null = null;

  const center = () => ({ x: art.x + art.w * 0.52, y: art.y + art.h * 0.5 });
  // The canvas's document offset is refreshed on resize, so pointer events
  // never force a layout query.
  const origin = { x: 0, y: 0 };
  function toPage(event: { clientX: number; clientY: number }) {
    return { x: event.clientX + scrollX - origin.x, y: event.clientY + scrollY - origin.y };
  }
  function insideFigure(x: number, y: number) {
    const u = (x - art.x) / art.w;
    const v = (y - art.y) / art.h;
    if (u < 0 || v < 0 || u >= 1 || v >= 1) return false;
    if (!matte) return Math.hypot((u - 0.52) / 0.38, (v - 0.5) / 0.43) <= 1;
    return matte.values[Math.floor(v * matte.h) * matte.w + Math.floor(u * matte.w)] > 127;
  }
  function measure() {
    box = canvas.getBoundingClientRect();
    origin.x = box.left + scrollX;
    origin.y = box.top + scrollY;
    const frameBox = image.getBoundingClientRect();
    const scale = Math.min(
      frameBox.width / image.naturalWidth,
      frameBox.height / image.naturalHeight,
    );
    const w = image.naturalWidth * scale;
    const h = image.naturalHeight * scale;
    art = {
      x: frameBox.left - box.left + (frameBox.width - w) / 2,
      y: frameBox.top - box.top + (frameBox.height - h) / 2,
      w,
      h,
    };
    field?.place(art);
    headline?.measure();
  }
  function updateCount() {
    S.count = Math.round(areaCount * LEVEL_SWARM[level]);
  }
  function resize(redraw = true) {
    measure();
    if (field) {
      const area = Math.max(1, box.width * box.height);
      const dpr = devicePixelRatio || 1;
      // The budget mostly limits empty margins: unless frames are struggling,
      // the sculpture keeps its source detail (or the screen's, if lower).
      const detail = tier > 0 ? Math.min(dpr, image.naturalWidth / Math.max(1, art.w)) : 0;
      const ratio = Math.min(dpr, 2, Math.max(detail, Math.sqrt(TIERS[tier].pixels / area)));
      field.resize(box.width, box.height, ratio);
      areaCount = Math.min(field.capacity, Math.max(1800, area * TIERS[tier].density));
      updateCount();
    }
    if (redraw && !frame) render(false);
  }

  function render(simulate: boolean) {
    if (field) field.frame(S, simulate);
    else {
      // Keep exploration available without WebGL: transform the original
      // asset subtly; no replacement illustration is synthesized.
      const pulse = Math.max(0, 1 - (elapsed - Math.max(...rippleTimes)) / 2);
      image.style.transform = `perspective(1000px) rotateY(${light.x * 4}deg) rotateX(${light.y * 3}deg) translateY(${Math.sin(elapsed * 0.45) * 2}px)`;
      image.style.filter = `saturate(${1 + pulse * 0.22})`;
      trail?.draw(elapsed);
    }
  }

  // Frame pacing: step quality down after sustained long frames; step up once
  // when arrival motion ran at the display's pace. Low Power Mode or a busy
  // GPU simply keeps the lighter tier.
  function adapt(delta: number) {
    if (!field || delta <= 0 || delta > 0.25) return;
    frames++;
    pace = pace * 0.94 + delta * 0.06;
    if (frames < 30) return;
    if (pace > 0.029 && tier > 0) {
      tier--;
      downgraded = true;
      frames = 0;
      steady = 0;
      resize(false);
    } else if (!downgraded && tier < TIERS.length - 1 && pace < 0.0185) {
      if (++steady > 150) {
        tier++;
        frames = 0;
        steady = 0;
        resize(false);
      }
    } else steady = 0;
  }

  let inFrame = false;
  function wake(seconds = RESPONSE) {
    if (paused) return;
    activeUntil = Math.max(activeUntil, elapsed + seconds);
    // Inside a frame the loop continues by itself; scheduling here too would
    // start a second loop.
    if (!frame && !inFrame) schedule();
  }
  function schedule() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    previous = 0;
    if (!paused && visible && elapsed < activeUntil) {
      root.dataset.motion = 'active';
      frame = requestAnimationFrame(animate);
    }
  }
  function animate(now: number) {
    frame = 0;
    if (paused || !visible) return;
    const delta = previous ? (now - previous) / 1000 : 1 / 60;
    previous = now;
    const dt = Math.min(delta, 0.05);
    elapsed += dt;
    inFrame = true;
    adapt(delta);
    tick(dt);
    render(true);
    inFrame = false;
    if (elapsed < activeUntil) frame = requestAnimationFrame(animate);
    else settle();
  }
  function settle() {
    previous = 0;
    // A last, clean still frame: the calm selected design, no motes. Clear
    // transient effects too, so Escape never freezes a half-finished one.
    rippleTimes.fill(-10);
    S.ripples.fill(0);
    lens.strength = flash = burstImpulse = shakeImpulse = 0;
    if (elapsed - upgradeAt < 3.6) {
      upgradeAt = -100;
      upgradeBurst = true;
    }
    exhale.start = -10;
    introSweep = false;
    S.view[0] = S.lens[2] = S.flash[0] = S.light[2] = S.light[3] = S.glow[1] = 0;
    S.charge[2] = S.charge[3] = S.shake[2] = 0;
    S.glow[3] = -1;
    render(false);
    headline?.rest();
    tilt.base = null;
    root.dataset.motion = 'settled';
  }

  function tick(dt: number) {
    const calm = smoothstep(activeUntil - CALM, activeUntil, elapsed);
    const still = 1 - calm;
    const ease = 1 - Math.exp(-dt * 6);
    const c = center();

    // Pointer: presence fades within half a second of the last movement.
    pointer.presence = Math.max(0, pointer.presence - dt * 2.4);
    pointer.vx *= Math.exp(-dt * 7);
    pointer.vy *= Math.exp(-dt * 7);
    hovering += (pointer.hover - hovering) * ease;
    if (pointer.presence > 0.2 || press.active || elapsed - tiltTime < 0.6) playTime += dt;

    // Light: pointer first, then a recent tilt, otherwise it drifts home.
    if (performance.now() - pointerTime > 1200 && elapsed - tiltTime < 2.5) {
      light.tx = tilt.x;
      light.ty = tilt.y;
    }
    const lx = light.x;
    const ly = light.y;
    light.x += (light.tx - light.x) * ease;
    light.y += (light.ty - light.y) * ease;
    const travel = Math.hypot(light.x - lx, light.y - ly) / Math.max(dt, 1e-3);
    light.activity = Math.max(
      light.activity * Math.exp(-dt * 0.9),
      Math.min(1, travel * 0.8 + (inside && pointer.hover > 0 ? 0.6 : 0)),
    );
    light.glint = Math.max(light.glint * Math.exp(-dt * 3), Math.min(1, travel * 1.4));
    tilt.sx += (tilt.x - tilt.sx) * ease;
    tilt.sy += (tilt.y - tilt.sy) * ease;

    // Hold to gather; the vortex follows the pointer while pressed.
    const gather = press.active ? smoothstep(0.18, 1.5, held()) : 0;
    if (press.active && held() < 10) activeUntil = Math.max(activeUntil, elapsed + 1.5);
    flash *= Math.exp(-dt * 2.2);

    // Upgrade: the swarm forms the loop, light runs along it, then it bursts.
    const u = elapsed - upgradeAt;
    const form = u < 3.2 ? smoothstep(0, 0.7, u) * (1 - smoothstep(2.55, 3, u)) : 0;
    if (!upgradeBurst && u >= 2.85) {
      upgradeBurst = true;
      S.charge[0] = c.x;
      S.charge[1] = c.y;
      burstImpulse = 1;
      flash = 1;
    }
    if (upgradeAt > 0) upgraded = Math.min(1, upgraded + dt * 0.5);

    // Discovery: level 2 once play becomes a habit; level 3 by enough play.
    if (level === 1 && (taps >= 3 || bursts >= 1 || playTime >= 9 || shaken)) setLevel(2);
    if (level === 2 && (bursts >= 3 || playTime >= 40)) upgrade();

    put(S.step, dt, elapsed, calm, 0);
    put(S.pointer, pointer.x, pointer.y, pointer.px, pointer.py);
    pointer.px = pointer.x;
    pointer.py = pointer.y;
    put(
      S.motion,
      pointer.vx,
      pointer.vy,
      pointer.presence * still,
      level >= 2 ? Math.min(0.16, 0.05 + playTime * 0.003) : 0,
    );
    put(S.field, still, !discovered && !inside ? 1 : 0, level >= 1 ? 1 : 0, form);
    if (!press.active || burstImpulse) {
      S.charge[2] = 0;
    } else {
      S.charge[0] = press.x;
      S.charge[1] = press.y;
      S.charge[2] = gather * still;
    }
    S.charge[3] = burstImpulse;
    burstImpulse = 0;
    const since = elapsed - exhale.start;
    put(
      S.emit,
      since >= 0 && since < exhale.duration && S.count
        ? Math.min(0.2, ((exhale.total / exhale.duration) * dt) / S.count)
        : 0,
      art.w * 0.6,
      Math.random(),
      0,
    );
    S.shake[2] = shakeImpulse;
    S.shake[3] = Math.random();
    shakeImpulse = 0;
    put(S.light, light.x, light.y, light.activity * still, light.glint * still);
    put(S.view, 1, tilt.sx, tilt.sy, 0);
    lens.strength += ((inside && pointer.hover > 0 ? 1 : 0) * still - lens.strength) * ease;
    put(S.lens, pointer.x, pointer.y - lens.lift, lens.strength, art.w * 0.085);
    for (let i = 0; i < 4; i++) {
      const age = elapsed - rippleTimes[i];
      S.ripples[i * 4 + 2] = age;
      if (age > 2.6) S.ripples[i * 4 + 3] = 0;
    }
    S.flash[0] = flash * still;
    const sweep = elapsed - 0.25;
    put(
      S.glow,
      u * 0.62,
      u < 3.6 ? smoothstep(0, 0.3, u) * (1 - smoothstep(3, 3.6, u)) : 0,
      upgraded,
      introSweep && sweep >= 0 && sweep < 1.7 ? sweep / 1.7 : -1,
    );
    if (sweep >= 1.7) introSweep = false;

    // The heading answers the pointer, a phone tilt (not general light
    // movement) and the energy gathered by a hold.
    const tilted = performance.now() - pointerTime > 1200 && elapsed - tiltTime < 2.5;
    headline?.update({
      x: pointer.x,
      y: pointer.y,
      presence: hovering * still,
      light: tilted ? light.x : 0,
      energy: tilted ? Math.min(1, light.activity * 1.2) * still : 0,
      charge: gather * still,
      time: elapsed,
    });
  }

  function ripple(x: number, y: number, strength = 1) {
    const i = rippleSlot++ % 4;
    S.ripples[i * 4] = x;
    S.ripples[i * 4 + 1] = y;
    S.ripples[i * 4 + 3] = strength;
    rippleTimes[i] = elapsed;
  }
  /** The loop exhales `share` of the swarm as light over `duration` seconds. */
  function breathe(share: number, duration: number, delay = 0) {
    Object.assign(exhale, {
      start: elapsed + delay,
      duration,
      total: Math.min(3200, S.count * share),
    });
  }
  function ping() {
    for (const [element, name] of [
      [status, 'is-ping'],
      [mark, 'is-celebrating'],
    ] as const) {
      if (!element || (name === 'is-celebrating' && level < 3)) continue;
      element.classList.remove(name);
      void element.offsetWidth; // restart the CSS animation
      element.classList.add(name);
    }
  }
  function setLevel(next: number) {
    if (next <= level) return;
    level = next;
    root.dataset.level = String(level);
    updateCount();
    ping();
    if (level < 3) breathe(0.07, 0.6);
  }
  function discover() {
    if (!discovered) {
      discovered = true;
      root.dataset.invite = 'off';
      trail?.dismiss();
    }
    setLevel(1);
  }
  function upgrade() {
    if (paused || elapsed - upgradeAt < 7) return;
    upgradeAt = elapsed;
    upgradeBurst = false;
    discover();
    if (level < 3) {
      level = 3;
      root.dataset.level = '3';
      updateCount();
    }
    headline?.celebrate(elapsed);
    ping();
    wake(5.6);
  }
  /** A charged release counts toward discovery; a tap's splash does not. */
  function burst(x: number, y: number, amount: number, charged = true) {
    if (charged) bursts++;
    // A stronger burst still waiting for its frame keeps its place, e.g. a
    // Space release followed by the button's click.
    if (burstImpulse >= amount) return;
    S.charge[0] = x;
    S.charge[1] = y;
    burstImpulse = amount;
    flash = Math.max(flash, amount);
  }

  function setPaused(value: boolean) {
    paused = value;
    surface.disabled = paused;
    hint.hidden = paused;
    trail?.hide();
    exploration = null;
    holding(false);
    Object.assign(light, { x: 0, y: 0, tx: 0, ty: 0, activity: 0, glint: 0 });
    Object.assign(pointer, { vx: 0, vy: 0, presence: 0 });
    rippleTimes.fill(-10);
    S.ripples.fill(0);
    lens.strength = 0;
    flash = burstImpulse = shakeImpulse = 0;
    elapsed = 0;
    lastHoverRipple = -10;
    tiltTime = -1e4;
    upgradeAt = -100;
    upgradeBurst = true;
    exhale.start = -10;
    activeUntil = paused ? 0 : INTRO;
    introSweep = !paused;
    if (!paused) breathe(0.3, 1.4, 0.3);
    root.dataset.motion = paused ? 'reduced' : 'active';
    tick(0);
    S.view[0] = 0;
    headline?.rest();
    render(false);
    schedule();
  }
  function useRenderer() {
    root.dataset.renderer = field ? 'webgl' : 'image';
    canvas.classList.toggle('is-live', !!field);
    if (field) {
      trail?.destroy();
      trail = null;
      image.style.transform = image.style.filter = '';
    } else if (!trail) {
      trail = createCuriosityTrail(host);
      if (discovered) trail.dismiss();
    }
  }

  function hasExplored(event: PointerEvent, distance: number): boolean {
    if (event.type === 'pointerdown') return true;
    // Require 1.2s of continuous movement, covering 24px, in the inner 82% of
    // the broad interaction ellipse. A casual crossing is not discovery.
    if (distance > 0.82) {
      exploration = null;
      return false;
    }
    const now = event.timeStamp;
    const last = exploration;
    const continuous = last !== null && now - last.time <= 300;
    exploration = {
      x: event.clientX,
      y: event.clientY,
      time: now,
      started: continuous ? last.started : now,
      distance: continuous
        ? last.distance + Math.hypot(event.clientX - last.x, event.clientY - last.y)
        : 0,
    };
    return now - exploration.started >= 1200 && exploration.distance >= 24;
  }
  function release() {
    light.tx = light.ty = 0;
    pointer.presence = pointer.hover = 0;
    inside = false;
    exploration = null;
    holding(false);
    trail?.hide();
  }
  function explore(event: PointerEvent) {
    if (paused || !visible || !event.isPrimary) return;
    const p = toPage(event);
    const c = center();
    const dx = (p.x - c.x) / (art.w * 0.4);
    const dy = (p.y - c.y) / (art.h * 0.44);
    // The loop gesture follows the whole path, even across the header link.
    if (loop.add(dx, dy, event.timeStamp)) upgrade();
    // Do not stir the swarm under navigation. Pointer Events also support
    // hovering pens; ordinary touch screens can only report actual contact.
    if ((event.target as Element).closest?.('a, button:not(.artwork-touch)')) {
      trail?.hide();
      pointer.presence = pointer.hover = 0;
      inside = false;
      exploration = null;
      return;
    }
    const gap = Math.max(8, event.timeStamp - pointerTime) / 1000;
    const fresh = event.timeStamp - pointerTime > 250;
    const vx = fresh ? 0 : (p.x - pointer.x) / gap;
    const vy = fresh ? 0 : (p.y - pointer.y) / gap;
    pointer.vx = pointer.vx * 0.4 + vx * 0.6;
    pointer.vy = pointer.vy * 0.4 + vy * 0.6;
    if (fresh) {
      pointer.px = p.x;
      pointer.py = p.y;
    }
    pointer.x = p.x;
    pointer.y = p.y;
    pointer.presence = pointer.hover = 1;
    pointerTime = event.timeStamp;
    pointerType = event.pointerType;
    lens.lift = pointerType === 'touch' ? 56 : 0;
    light.tx = clamp((p.x - c.x) / (art.w * 0.75), -1, 1);
    light.ty = clamp((p.y - c.y) / (art.h * 0.75), -1, 1);
    if (press.active) {
      press.x = p.x;
      press.y = p.y;
    }
    wake();
    const distance = Math.hypot(dx, dy);
    inside = field ? insideFigure(p.x, p.y) : distance <= 1;
    if (distance <= 1) {
      trail?.hide();
      if (hasExplored(event, distance)) discover();
    } else {
      exploration = null;
      // The fallback trail ends at the silhouette's approximate edge.
      if (trail) {
        const edge = { x: c.x + (p.x - c.x) / distance, y: c.y + (p.y - c.y) / distance };
        trail.point(
          event.clientX,
          event.clientY,
          { x: edge.x + origin.x - scrollX, y: edge.y + origin.y - scrollY },
          elapsed,
        );
      }
      light.tx *= 0.25;
      light.ty *= 0.25;
    }
    if (inside && elapsed - lastHoverRipple > HOVER_RIPPLE) {
      ripple(p.x, p.y - lens.lift, 0.8);
      lastHoverRipple = elapsed;
    }
  }
  function holding(active: boolean) {
    press.active = active;
    // Dragging during a hold should not select page text; otherwise text
    // stays selectable.
    document.documentElement.classList.toggle('is-holding', active);
  }
  function down(event: PointerEvent) {
    // Only the primary button: a context menu can swallow a secondary release.
    if (paused || !event.isPrimary || event.button !== 0) return;
    if ((event.target as Element).closest?.('a, button:not(.artwork-touch)')) return;
    explore(event);
    Object.assign(press, {
      id: event.pointerId,
      start: performance.now(),
      x: pointer.x,
      y: pointer.y,
    });
    holding(true);
    if (inside) {
      ripple(pointer.x, pointer.y, 1);
      burst(pointer.x, pointer.y, 0.3, false);
      taps++;
    }
  }
  function up(event: PointerEvent) {
    // A lifted finger no longer hovers anywhere.
    if (event.pointerType === 'touch') pointer.hover = 0;
    if (!press.active || event.pointerId !== press.id) return;
    const seconds = held();
    holding(false);
    if (seconds > 0.35) {
      burst(press.x, press.y, 0.35 + smoothstep(0.18, 1.5, seconds) * 0.85);
      ripple(press.x, press.y, 1.2);
      wake();
    }
  }
  const listen = <K extends keyof DocumentEventMap>(
    type: K,
    handler: (event: DocumentEventMap[K]) => void,
    passive = true,
  ) => document.addEventListener(type, handler, { ...options, passive });
  listen('pointermove', explore);
  listen('pointerdown', down);
  listen('pointerup', up);
  listen('pointercancel', release);
  listen('pointerout', (event) => {
    if (!event.relatedTarget) release();
  });
  window.addEventListener('scroll', release, { ...options, passive: true });
  // Leaving the artwork with the keyboard returns its light home and ends a
  // Space hold; losing the window ends any hold, so none can stay stuck.
  surface.addEventListener(
    'blur',
    () => {
      light.tx = light.ty = 0;
      if (press.id === -2) holding(false);
    },
    options,
  );
  window.addEventListener('blur', () => holding(false), options);
  // A long press on a touch screen would otherwise open a callout menu.
  surface.addEventListener(
    'contextmenu',
    (event) => {
      if (pointerType === 'touch') event.preventDefault();
    },
    options,
  );

  // Arrow keys move the light and a virtual pointer around the sculpture.
  function virtualPointer() {
    const c = center();
    const p = { x: c.x + light.tx * art.w * 0.62, y: c.y + light.ty * art.h * 0.62 };
    if (pointer.x < -1e3) {
      pointer.px = p.x;
      pointer.py = p.y;
      pointer.vx = pointer.vy = 0;
    } else {
      pointer.vx = (p.x - pointer.x) * 6;
      pointer.vy = (p.y - pointer.y) * 6;
    }
    pointer.x = p.x;
    pointer.y = p.y;
    pointer.presence = 1;
    return p;
  }
  surface.addEventListener(
    'keydown',
    (event) => {
      if (paused) return;
      if (event.key === 'Escape') {
        activeUntil = elapsed;
        holding(false);
        trail?.hide();
        if (frame) {
          cancelAnimationFrame(frame);
          frame = 0;
        }
        settle();
        return;
      }
      const directions: Record<string, [number, number]> = {
        ArrowLeft: [-0.3, 0],
        ArrowRight: [0.3, 0],
        ArrowUp: [0, -0.3],
        ArrowDown: [0, 0.3],
      };
      const direction = directions[event.key];
      if (direction) {
        event.preventDefault();
        discover();
        light.tx = clamp(light.tx + direction[0], -1, 1);
        light.ty = clamp(light.ty + direction[1], -1, 1);
        virtualPointer();
        keys.push(event.key);
        if (keys.length > 4) keys.shift();
        if (isArrowLoop(keys)) {
          keys.length = 0;
          upgrade();
        }
        wake();
      } else if (event.key === ' ' && !event.repeat) {
        const p = virtualPointer();
        Object.assign(press, { id: -2, start: performance.now(), x: p.x, y: p.y });
        holding(true);
        wake();
      }
    },
    options,
  );
  document.addEventListener(
    'keyup',
    (event) => {
      if (event.key === ' ' && press.id === -2) up({ pointerId: -2 } as PointerEvent);
    },
    options,
  );
  // Native keyboard activation and assistive technology dispatch a detail=0
  // click. A real tap is the user gesture iOS requires for motion sensors.
  surface.addEventListener(
    'click',
    (event) => {
      if (paused) return;
      if (event.detail === 0) {
        discover();
        const c = center();
        ripple(c.x, c.y, 1);
        burst(c.x, c.y, 0.3, false);
        wake();
        announcement.textContent = 'A new perspective. The light responds to your curiosity.';
      } else requestSensors();
    },
    options,
  );

  // Tilt moves the light, parallax and glints; a circular tilt draws a loop.
  // A slowly re-centred baseline makes any comfortable holding angle neutral.
  function orientation(event: DeviceOrientationEvent) {
    if (paused || event.beta === null || event.gamma === null) return;
    // iOS before 16.4 has no screen.orientation, only window.orientation.
    const angle =
      screen.orientation?.angle ?? (window as { orientation?: number }).orientation ?? 0;
    let x = event.gamma;
    let y = event.beta;
    if (angle === 90) [x, y] = [event.beta, -event.gamma];
    else if (angle === 270 || angle === -90) [x, y] = [-event.beta, event.gamma];
    else if (angle === 180) [x, y] = [-event.gamma, -event.beta];
    if (!tilt.base) {
      tilt.base = { x, y };
      Object.assign(tilt, { ax: x, ay: y, time: event.timeStamp });
    }
    tilt.base.x += (x - tilt.base.x) * 0.006;
    tilt.base.y += (y - tilt.base.y) * 0.006;
    tilt.x = clamp((x - tilt.base.x) / 18, -1, 1);
    tilt.y = clamp((y - tilt.base.y) / 18, -1, 1);
    // Only a deliberate turn wakes the page. Comparing with an average that
    // trails by about a third of a second ignores tremor and the slow drift of
    // a phone held while reading, which would otherwise keep waking it.
    const gap = clamp((event.timeStamp - tilt.time) / 1000, 0.001, 0.1);
    tilt.time = event.timeStamp;
    const follow = 1 - Math.exp(-gap / 0.35);
    tilt.ax += (x - tilt.ax) * follow;
    tilt.ay += (y - tilt.ay) * follow;
    if (Math.hypot(x - tilt.ax, y - tilt.ay) > 4) {
      tiltTime = elapsed;
      root.dataset.tilt = 'on';
      wake();
    }
    if (tiltLoop.add(tilt.x * 2.5, tilt.y * 2.5, event.timeStamp)) upgrade();
  }
  let shakes = 0;
  let shakeTime = -1e4;
  function motion(event: DeviceMotionEvent) {
    const a = event.acceleration;
    if (paused || !a || a.x === null || a.y === null) return;
    if (Math.hypot(a.x, a.y, a.z ?? 0) < 14) return;
    shakes = event.timeStamp - shakeTime < 700 ? shakes + 1 : 1;
    shakeTime = event.timeStamp;
    if (shakes === 3) {
      shaken = true;
      shakeImpulse = 1;
      const c = center();
      ripple(c.x, c.y, 1);
      wake();
    }
  }
  let sensors = false;
  function listenSensors() {
    if (sensors) return;
    sensors = true;
    window.addEventListener('deviceorientation', orientation, options);
    window.addEventListener('devicemotion', motion, options);
  }
  /** Sensors are secure-context only. Chrome grants them without a prompt;
   * iOS needs the tap handled below, so its first silent attempt fails
   * quietly and is retried from the first real tap on the artwork. */
  function requestSensors() {
    if (sensors || !('DeviceOrientationEvent' in window)) return;
    const request = (DeviceOrientationEvent as unknown as SensorPermission).requestPermission;
    if (!request) return listenSensors();
    request
      .call(DeviceOrientationEvent)
      .then((state) => {
        if (state === 'granted') listenSensors();
      })
      .catch(() => {});
  }
  requestSensors();

  const zoomed = () =>
    document.documentElement.classList.toggle(
      'is-zoomed',
      (window.visualViewport?.scale ?? 1) > 1.01,
    );
  window.visualViewport?.addEventListener('resize', zoomed, options);
  media.addEventListener('change', () => setPaused(media.matches), options);
  document.addEventListener(
    'visibilitychange',
    () => {
      visible = !document.hidden;
      release();
      schedule();
    },
    options,
  );
  const sizeObserver = new ResizeObserver(() => resize());
  sizeObserver.observe(canvas);
  sizeObserver.observe(host);
  sizeObserver.observe(root);
  // Re-measure letter centres once the heading's arrival animation ends.
  heading?.addEventListener('animationend', () => headline?.measure(), options);
  void document.fonts?.ready.then(() => resize());
  canvas.addEventListener(
    'webglcontextlost',
    (event) => {
      event.preventDefault();
      field = null;
      useRenderer();
      schedule();
    },
    options,
  );
  canvas.addEventListener(
    'webglcontextrestored',
    () => {
      field = makeField();
      if (!field) return;
      useRenderer();
      resize();
      setPaused(paused);
    },
    options,
  );

  useRenderer();
  resize();
  surface.hidden = false;
  release();
  setPaused(paused);
  return () => {
    events.abort();
    document.documentElement.classList.remove('is-holding', 'is-zoomed');
    sizeObserver.disconnect();
    cancelAnimationFrame(frame);
    trail?.destroy();
    field?.dispose();
    headline?.destroy();
    canvas.remove();
  };
}
