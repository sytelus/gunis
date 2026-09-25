/** Pure gesture recognizers for the landing page's hidden "upgrade". They hold
 * no DOM state, so tests can exercise them directly. */

const TURN = Math.PI * 2;

/**
 * Recognizes one deliberate loop drawn around a center: the signed angle swept
 * must reach a full turn within `windowMs`. Coordinates are relative to the
 * center and normalized by its radii, so an ellipse around the sculpture
 * counts. Wiggles cancel out, a jump or a pause breaks the stroke, and points
 * too close to or far from the center are ignored.
 */
export function createLoopTracker({
  windowMs = 6000,
  gapMs = 650,
  minRadius = 0.3,
  maxRadius = 3,
  maxStep = 1.2,
} = {}) {
  let last: number | null = null;
  let lastTime = -Infinity;
  let total = 0;
  let history: { time: number; total: number }[] = [];
  function reset() {
    last = null;
    total = 0;
    history = [];
  }
  return {
    reset,
    /** Returns true once, when a full loop completes. */
    add(x: number, y: number, time: number): boolean {
      if (time - lastTime > gapMs) reset();
      lastTime = time;
      const radius = Math.hypot(x, y);
      if (radius < minRadius || radius > maxRadius) {
        last = null;
        return false;
      }
      const angle = Math.atan2(y, x);
      if (last !== null) {
        let step = angle - last;
        if (step > Math.PI) step -= TURN;
        else if (step < -Math.PI) step += TURN;
        // A jump (leaving and re-entering the ring elsewhere) is skipped, not
        // counted, so the loop still needs a full turn of actual drawing.
        if (Math.abs(step) <= maxStep) total += step;
      }
      last = angle;
      history.push({ time, total });
      while (history.length && time - history[0].time > windowMs) history.shift();
      if (history.some((sample) => Math.abs(total - sample.total) >= TURN)) {
        reset();
        return true;
      }
      return false;
    },
  };
}

const DIRECTIONS: Record<string, number> = {
  ArrowRight: 0,
  ArrowDown: 1,
  ArrowLeft: 2,
  ArrowUp: 3,
};

/** Keyboard parity for drawing a loop: four arrow presses that rotate
 * consistently (for example Up, Right, Down, Left) in either direction. */
export function isArrowLoop(keys: readonly string[]): boolean {
  if (keys.length < 4) return false;
  const turns = keys.slice(-4).map((key) => DIRECTIONS[key]);
  if (turns.some((turn) => turn === undefined)) return false;
  const steps = turns.slice(1).map((turn, i) => (turn - turns[i] + 4) % 4);
  return steps.every((step) => step === 1) || steps.every((step) => step === 3);
}
