/**
 * Presentation-only play for the real HTML heading.
 *
 * - "Learning" is split into aria-hidden letters whose widths are locked to the
 *   measured glyph advances (kerning and tracking included), so the variable
 *   weight can swell under the pointer, a phone tilt or an upgrade without ever
 *   shifting layout. A visually hidden copy keeps the word for screen readers.
 * - "Upgraded." gains an aria-hidden overlay of the same word that only paints
 *   a prismatic band where the light passes, like foil catching a lamp.
 *
 * Without this module the heading is ordinary static text.
 */
export type HeadlineInput = {
  x: number; // pointer, page px
  y: number;
  presence: number; // 0..1, recent pointer movement
  light: number; // light offset -1..1 across the page
  energy: number; // 0..1, how much a phone tilt is moving the light
  charge: number; // 0..1, energy gathered by a press-and-hold
  time: number; // animation seconds
};

export type HeadlinePlay = {
  measure(): void;
  update(input: HeadlineInput): void;
  celebrate(time: number): void;
  rest(): void;
  destroy(): void;
};

const BASE = 500;
const SWELL = 190;

export function createHeadline(heading: HTMLElement, origin: () => DOMRect): HeadlinePlay | null {
  const sans = heading.querySelector<HTMLElement>('.headline-sans');
  const em = heading.querySelector<HTMLElement>('em');
  const text = sans?.firstChild;
  if (!sans || !em || !(text instanceof Text) || sans.childNodes.length !== 1) return null;
  const word = text.data;
  if (!word.trim()) return null;

  // Measure each glyph's advance from the laid-out text before splitting it.
  const size = parseFloat(getComputedStyle(sans).fontSize) || 1;
  const range = document.createRange();
  const boxes = Array.from(word, (_, i) => {
    range.setStart(text, i);
    range.setEnd(text, i + 1);
    return range.getBoundingClientRect();
  });
  const letters = boxes.map((box, i) => {
    const letter = document.createElement('span');
    letter.textContent = word[i];
    const advance = i < boxes.length - 1 ? boxes[i + 1].left - box.left : box.width;
    letter.style.width = `${advance / size}em`;
    return letter;
  });
  const visual = document.createElement('span');
  visual.className = 'headline-letters';
  visual.setAttribute('aria-hidden', 'true');
  visual.append(...letters);
  const label = document.createElement('span');
  label.className = 'sr-only';
  label.textContent = word;
  sans.replaceChildren(label, visual);

  const sheen = document.createElement('span');
  sheen.className = 'headline-sheen';
  sheen.setAttribute('aria-hidden', 'true');
  sheen.textContent = em.textContent;
  em.append(sheen);
  heading.classList.add('is-playful');

  const weights = letters.map(() => BASE);
  let centers: { x: number; y: number }[] = [];
  let radius = 100;
  let italic = { left: 0, width: 1, y: 0 };
  let celebratedAt = -100;
  let sheenState = '';

  function setWeight(i: number, weight: number) {
    if (weight === weights[i]) return;
    weights[i] = weight;
    letters[i].style.fontWeight = weight === BASE ? '' : String(weight);
  }
  function setSheen(position: number, strength: number) {
    const next = `${position.toFixed(1)}|${strength.toFixed(2)}`;
    if (next === sheenState) return;
    sheenState = next;
    sheen.style.setProperty('--sheen-x', `${position.toFixed(1)}%`);
    sheen.style.opacity = strength.toFixed(2);
  }

  return {
    measure() {
      const o = origin();
      centers = letters.map((letter) => {
        const box = letter.getBoundingClientRect();
        return { x: box.left - o.left + box.width / 2, y: box.top - o.top + box.height / 2 };
      });
      radius = (parseFloat(getComputedStyle(sans).fontSize) || 100) * 0.95;
      const box = sheen.getBoundingClientRect();
      italic = {
        left: box.left - o.left,
        width: Math.max(1, box.width),
        y: box.top - o.top + box.height / 2,
      };
    },
    update({ x, y, presence, light, energy, charge, time }) {
      const since = time - celebratedAt;
      const last = Math.max(1, letters.length - 1);
      for (let i = 0; i < letters.length; i++) {
        const c = centers[i];
        if (!c) continue;
        const near =
          presence * Math.exp(-((x - c.x) ** 2 + ((y - c.y) * 1.3) ** 2) / (radius * radius));
        // Tilting a phone sends a swell through the word; an upgrade ripples it.
        const along = i / last;
        const tilt = energy * Math.exp(-((along - (0.5 + light * 0.55)) ** 2) / 0.045);
        const wave = since < 1.8 ? Math.exp(-((along - (since * 1.1 - 0.2)) ** 2) / 0.02) : 0;
        const swell = Math.max(near, tilt, wave, charge * 0.45);
        setWeight(i, Math.round(BASE + SWELL * Math.min(1, swell)));
      }
      if (since >= 0.45 && since < 1.95) setSheen(-25 + ((since - 0.45) / 1.5) * 150, 1);
      else if (charge > 0.02) setSheen(50 + Math.sin(time * 2.6) * 38, charge);
      else {
        const over = presence * Math.exp(-(((y - italic.y) / (radius * 1.15)) ** 2));
        const pointer = ((x - italic.left) / italic.width) * 100;
        setSheen(
          over > energy ? pointer : 50 + light * 62,
          Math.min(1, Math.max(over * 0.95, energy)),
        );
      }
    },
    celebrate(time) {
      celebratedAt = time;
    },
    rest() {
      letters.forEach((_, i) => setWeight(i, BASE));
      setSheen(50, 0);
    },
    destroy() {
      sans.replaceChildren(word);
      sheen.remove();
      heading.classList.remove('is-playful');
    },
  };
}
