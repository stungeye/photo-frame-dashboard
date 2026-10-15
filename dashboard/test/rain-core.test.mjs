import test from 'node:test';
import assert from 'node:assert/strict';
import { RainField, nextDelay, GLYPHS, TONES } from '../public/rain/frame-core.js';

test('painting only dirty cells reconstructs the complete field over time', () => {
  const field = new RainField(640, 430, 123);
  const painted = new Uint16Array(field.count);
  painted.fill(65535);
  for (let frame = 0; frame < 500; frame++) {
    if (frame === 100) field.pulse(300, 250);
    if (frame === 200) field.surge();
    if (frame === 300) field.invalidate();
    const count = field.step(.1);
    const unique = new Set();
    for (let n = 0; n < count; n++) {
      const i = field.dirty[n];
      assert.ok(!unique.has(i), 'a cell must not be queued twice');
      unique.add(i);
      painted[i] = field.level[i] ? field.glyph[i] * TONES + field.level[i] : 0;
    }
    for (let i = 0; i < field.count; i++) {
      assert.equal(painted[i], field.level[i] ? field.glyph[i] * TONES + field.level[i] : 0);
      assert.ok(field.glyph[i] < GLYPHS.length);
      assert.ok(field.level[i] < TONES);
    }
  }
});

test('an unchanged tick needs no paint; invalidation repaints once', () => {
  const field = new RainField(640, 430, 5);
  assert.equal(field.step(0), field.count);
  assert.equal(field.step(0), 0);
  field.invalidate();
  assert.equal(field.step(0), field.count);
  assert.equal(field.step(0), 0);
});

test('simulation storage stays fixed through long runs and repeated touch pulses', () => {
  const field = new RainField(640, 430, 6);
  const arrays = [field.glyph, field.level, field.dirty, field.drawn, field.head, field.pulseAge, field.pulseDistance];
  const bytes = field.bytes;
  let maximum = 0;
  for (let i = 0; i < 10000; i++) {
    if (i % 20 === 0) field.pulse(i % 640, i % 430);
    maximum = Math.max(maximum, field.step(.1));
  }
  assert.deepEqual(arrays, [field.glyph, field.level, field.dirty, field.drawn, field.head, field.pulseAge, field.pulseDistance]);
  assert.equal(field.bytes, bytes);
  assert.ok(bytes < 12000);
  assert.ok(maximum <= field.count);
  for (let i = 0; i < 20; i++) field.step(.1);
  assert.deepEqual([...field.pulseAge], [-1, -1]);
});

test('head motion follows elapsed time, not achieved frame count', () => {
  const fast = new RainField(640, 430, 7), slow = new RainField(640, 430, 7);
  for (let i = 0; i < 10; i++) fast.step(.1);
  for (let i = 0; i < 4; i++) slow.step(.25);
  for (let i = 0; i < fast.cols; i++) assert.ok(Math.abs(fast.head[i] - slow.head[i]) < .0001);
  const stalled = new RainField(640, 430, 7), bounded = new RainField(640, 430, 7);
  stalled.step(1000); bounded.step(.25);
  assert.deepEqual(stalled.head, bounded.head);
});

test('normal rain repaints a minority of cells at the target cadence', () => {
  let changed = 0, cells = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const field = new RainField(640, 430, seed);
    field.step(0);
    for (let i = 0; i < 100; i++) { changed += field.step(.1); cells += field.count; }
  }
  assert.ok(changed / cells < .45, `dirty fraction ${changed / cells}`);
});

test('the scheduler leaves idle time rather than chasing missed frames', () => {
  assert.equal(nextDelay(0, 10), 100);
  assert.equal(nextDelay(5, 10), 95);
  assert.equal(nextDelay(50, 10), 200);
  assert.equal(nextDelay(300, 10), 1200);
});
