/**
 * Vanilla node:test suite for the conversation windowing helper (APP-30 GATE-4).
 */

import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import type { CoachTurn } from '../schemas.ts';

import { windowTurns } from './window.ts';

function mkTurns(n: number): CoachTurn[] {
  const out: CoachTurn[] = [];
  for (let i = 0; i < n; i += 1) {
    out.push({ from: i % 2 === 0 ? 'user' : 'ai', text: `t${i}` });
  }
  return out;
}

test('windowTurns: history shorter than max → returned unchanged', () => {
  const turns = mkTurns(4);
  const out = windowTurns(turns, 20);
  assert.deepEqual(out, turns);
  // Returns a new array (or same) — must not be mutated in place.
  out.push({ from: 'user', text: 'mut' });
  assert.equal(turns.length, 4, 'caller mutation must not affect source array');
});

test('windowTurns: trims to the last `max` entries, preserving order', () => {
  const turns = mkTurns(30);
  const out = windowTurns(turns, 20);
  assert.ok(out.length <= 20, `windowed length ${out.length} ≤ 20`);
  assert.ok(out.length >= 19, `windowed length ${out.length} ≥ 19 (orphan-ai rule)`);
  // First kept turn comes from somewhere in the last 21 of the input.
  assert.equal(out[out.length - 1].text, 't29');
});

test('windowTurns: drops a leading orphaned `ai` turn', () => {
  // Last 4 of mkTurns are ['user','ai','user','ai'] starting at index 26.
  // With max=4, last-4 are t26..t29 starting with `user` — no orphan to drop.
  // Force an orphan by asking for max=3, which yields t27..t29 = [ai,user,ai].
  const turns = mkTurns(30);
  const out = windowTurns(turns, 3);
  assert.equal(out.length, 2, 'orphan ai is dropped');
  assert.equal(out[0].from, 'user');
  assert.equal(out[out.length - 1].text, 't29');
});

test('windowTurns: max ≤ 0 → empty array', () => {
  assert.deepEqual(windowTurns(mkTurns(5), 0), []);
  assert.deepEqual(windowTurns(mkTurns(5), -3), []);
});

test('windowTurns: empty input → empty array', () => {
  assert.deepEqual(windowTurns([]), []);
  assert.deepEqual(windowTurns([], 20), []);
});

test('windowTurns: default max is 20', () => {
  const out = windowTurns(mkTurns(40));
  assert.ok(out.length <= 20, `default cap of 20 — got ${out.length}`);
});

test('windowTurns: original ordering preserved', () => {
  const turns = mkTurns(25);
  const out = windowTurns(turns, 10);
  for (let i = 1; i < out.length; i += 1) {
    // text is t<index>; parse and assert monotonically increasing.
    const a = Number(out[i - 1].text.slice(1));
    const b = Number(out[i].text.slice(1));
    assert.ok(b > a, `order preserved: ${out[i - 1].text} before ${out[i].text}`);
  }
});
