/**
 * The sculpture puzzle, as pure logic (no DOM, no time), so tests can
 * exercise it directly.
 *
 * The picture of the sculpture is cut into concentric rings, like a dial.
 * Each ring sits at one of six positions (steps of 60 degrees); position 0 is
 * the original picture. Every ring carries a bead that sits under a fixed
 * marker at the top when the ring is home, so the goal reads without words:
 * line the beads up. A tap turns one ring one step clockwise; a drag turns it
 * freely and it snaps to the nearest step.
 */
export const RINGS = 3;
export const POSITIONS = 6;
export const STEP = (Math.PI * 2) / POSITIONS;
/** Outer radius of each ring, in image heights, around CENTER (image UV). */
export const RADII = [0.15, 0.29, 0.47] as const;
export const CENTER = { x: 0.53, y: 0.51 } as const;

export type Rings = readonly number[];

/** Turns one ring by `steps` (positive is clockwise on screen). */
export function turn(rings: Rings, ring: number, steps = 1): number[] {
  const next = [...rings];
  next[ring] = (((next[ring] + steps) % POSITIONS) + POSITIONS) % POSITIONS;
  return next;
}

export const solved = (rings: Rings) => rings.every((position) => position === 0);

/** The fewest single-step taps (clockwise) that solve `rings`. */
export const tapsToSolve = (rings: Rings) =>
  rings.reduce((sum, position) => sum + ((POSITIONS - position) % POSITIONS), 0);

/** A scramble where every ring is visibly out of place and no two rings are
 * in the same position, so each one needs its own look. */
export function scramble(random = Math.random): number[] {
  const positions = [1, 2, 3, 4, 5];
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }
  return positions.slice(0, RINGS);
}

/** Which ring a point is on, from its offset to CENTER in image heights;
 * -1 outside the rings. */
export function ringAt(dx: number, dy: number): number {
  const r = Math.hypot(dx, dy);
  return RADII.findIndex((radius) => r < radius);
}

/** The position nearest to a ring angle (the shader's angle: content turns
 * clockwise as the angle decreases). */
export const positionOf = (angle: number) =>
  ((Math.round(-angle / STEP) % POSITIONS) + POSITIONS) % POSITIONS;
