import test from 'node:test';
import assert from 'node:assert/strict';
import { createLoopTracker, isArrowLoop } from '../src/gestures.ts';

/** Feeds an arc around the center; returns true if any sample completed a loop. */
function draw(tracker, { turns, radius = 1.2, steps = 72, ms = 2400, start = 0, from = 0 }) {
  let completed = false;
  for (let i = 0; i <= steps; i++) {
    const angle = from + (i / steps) * turns * Math.PI * 2;
    const time = start + (i / steps) * ms;
    completed = tracker.add(Math.cos(angle) * radius, Math.sin(angle) * radius, time) || completed;
  }
  return completed;
}

test('a loop drawn around the sculpture upgrades once, in either direction', () => {
  assert.equal(draw(createLoopTracker(), { turns: 0.9 }), false, 'nine tenths of a turn');
  assert.equal(draw(createLoopTracker(), { turns: 1.05 }), true);
  assert.equal(draw(createLoopTracker(), { turns: -1.05 }), true, 'counter-clockwise');
  // An ellipse hugging the figure counts because coordinates are normalized.
  const tracker = createLoopTracker();
  let completed = false;
  for (let i = 0; i <= 80; i++) {
    const angle = (i / 80) * Math.PI * 2.1;
    completed = tracker.add(Math.cos(angle) * 2.4, Math.sin(angle) * 0.5, i * 30) || completed;
  }
  assert.ok(completed, 'a wide ellipse');
  // The tracker resets after recognizing, so a second loop needs a second turn.
  const again = createLoopTracker();
  assert.ok(draw(again, { turns: 1.05 }));
  assert.equal(draw(again, { turns: 0.5, start: 2500, from: Math.PI * 2.1 }), false);
});

test('wiggles, pauses, slow drifts and passes through the center are not loops', () => {
  const wiggle = createLoopTracker();
  let completed = false;
  for (let i = 0; i < 300; i++) {
    const angle = Math.sin(i / 6) * 2.8;
    completed = wiggle.add(Math.cos(angle), Math.sin(angle), i * 20) || completed;
  }
  assert.equal(completed, false, 'back-and-forth arcs cancel out');
  assert.equal(
    draw(createLoopTracker(), { turns: 1.3, ms: 14000 }),
    false,
    'too slow to be one gesture',
  );
  const paused = createLoopTracker();
  draw(paused, { turns: 0.6, ms: 1200 });
  assert.equal(
    draw(paused, { turns: 0.6, ms: 1200, start: 2600, from: Math.PI * 1.2 }),
    false,
    'a pause breaks the stroke',
  );
  const through = createLoopTracker();
  completed = false;
  for (let i = 0; i <= 60; i++) completed = through.add(-2 + i / 15, 0.05, i * 20) || completed;
  assert.equal(completed, false, 'a straight line across the center');
});

test('four rotating arrow keys draw a loop for keyboard visitors', () => {
  assert.ok(isArrowLoop(['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft']));
  assert.ok(isArrowLoop(['ArrowLeft', 'ArrowDown', 'ArrowRight', 'ArrowUp']));
  assert.ok(isArrowLoop(['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft']));
  assert.equal(isArrowLoop(['ArrowUp', 'ArrowDown', 'ArrowUp', 'ArrowDown']), false);
  assert.equal(isArrowLoop(['ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight']), false);
  assert.equal(isArrowLoop(['ArrowUp', 'ArrowRight', 'ArrowDown']), false);
  assert.equal(isArrowLoop(['ArrowUp', 'ArrowRight', 'Enter', 'ArrowLeft']), false);
});
