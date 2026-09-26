import test from 'node:test';
import assert from 'node:assert/strict';
import {
  POSITIONS,
  STEP,
  positionOf,
  ringAt,
  scramble,
  solved,
  tapsToSolve,
  turn,
} from '../src/puzzle.ts';

test('a tap turns only the ring you touch, one step, wrapping around', () => {
  assert.deepEqual(turn([0, 0, 0], 1), [0, 1, 0]);
  assert.deepEqual(turn([5, 0, 0], 0), [0, 0, 0]);
  assert.deepEqual(turn([0, 0, 0], 2, -1), [0, 0, 5], 'turning back also wraps');
});

test('tapping each ring until its bead is home always solves the puzzle', () => {
  let seed = 11;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 50; i++) {
    let rings = scramble(random);
    assert.ok(
      rings.every((position) => position !== 0),
      'every ring starts out of place',
    );
    assert.equal(new Set(rings).size, rings.length, 'no two rings start alike');
    const taps = tapsToSolve(rings);
    for (let ring = 0; ring < rings.length; ring++)
      while (rings[ring] !== 0) rings = turn(rings, ring);
    assert.ok(solved(rings));
    assert.ok(taps <= rings.length * (POSITIONS - 1));
  }
});

test('ring angles map to the nearest position; clockwise is a decreasing angle', () => {
  assert.equal(positionOf(0), 0);
  assert.equal(positionOf(-STEP), 1);
  assert.equal(positionOf(-STEP * 1.4), 1, 'a drag snaps to the nearest step');
  assert.equal(positionOf(STEP), POSITIONS - 1);
  assert.equal(positionOf(-Math.PI * 2 - STEP * 2), 2, 'whole turns do not count');
});

test('points map to rings from the centre outward', () => {
  assert.equal(ringAt(0, 0), 0);
  assert.equal(ringAt(0.2, 0), 1);
  assert.equal(ringAt(0, -0.35), 2);
  assert.equal(ringAt(0.4, 0.3), -1);
});
