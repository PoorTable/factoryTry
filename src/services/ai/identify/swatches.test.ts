/**
 * Vanilla node:test suite for the k-means swatch extractor (APP-29 GATE-3).
 * Mirrors the runner conventions of `src/services/styling/palette.test.ts`
 * so it picks up under `node --experimental-strip-types --test`.
 *
 * GATE-3: the test MUST exercise the extractor on a synthetic pixel buffer
 * and assert the returned swatches are an array of 1–3 hex strings matching
 * the `#RRGGBB` (or `#RGB`) regex from `identifyResultSchema`.
 */

import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { extractSwatches } from './swatches.ts';

// `identifyResultSchema` accepts `^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$`.
const HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/**
 * Build a flat RGBA pixel buffer from a list of solid color blocks. Each
 * color block contributes `n` pixels in the order given — simulates the
 * dominant-color distribution of a real (downscaled) garment photo.
 */
function makeBuffer(blocks: { rgb: [number, number, number]; n: number }[]): number[] {
  const out: number[] = [];
  for (const block of blocks) {
    for (let i = 0; i < block.n; i += 1) {
      out.push(block.rgb[0], block.rgb[1], block.rgb[2], 255);
    }
  }
  return out;
}

test('extractSwatches: returns 1–3 #RRGGBB hex strings on a synthetic 3-cluster buffer', () => {
  const buffer = makeBuffer([
    { rgb: [216, 195, 165], n: 80 }, // sand
    { rgb: [184, 162, 133], n: 60 }, // tan
    { rgb: [138, 111, 82], n: 40 },  // brown
  ]);

  const swatches = extractSwatches(buffer, { k: 3, channels: 4 });

  assert.ok(Array.isArray(swatches), 'returns an array');
  assert.ok(
    swatches.length >= 1 && swatches.length <= 3,
    `swatches.length ${swatches.length} is in [1,3]`,
  );
  for (const hex of swatches) {
    assert.match(hex, HEX_RE, `swatch ${hex} matches the identifyResultSchema hex regex`);
  }
});

test('extractSwatches: clamps k to at most 3 even when caller asks for more', () => {
  const buffer = makeBuffer([
    { rgb: [255, 0, 0], n: 50 },
    { rgb: [0, 255, 0], n: 50 },
    { rgb: [0, 0, 255], n: 50 },
    { rgb: [255, 255, 0], n: 50 },
  ]);

  const swatches = extractSwatches(buffer, { k: 8, channels: 4 });
  assert.ok(swatches.length <= 3, `k clamp respected, got ${swatches.length}`);
  assert.ok(swatches.length >= 1);
  for (const hex of swatches) {
    assert.match(hex, HEX_RE);
  }
});

test('extractSwatches: respects k=1 and returns exactly one swatch', () => {
  const buffer = makeBuffer([
    { rgb: [100, 80, 60], n: 60 },
    { rgb: [120, 90, 70], n: 60 },
  ]);
  const swatches = extractSwatches(buffer, { k: 1, channels: 4 });
  assert.equal(swatches.length, 1, 'k=1 yields exactly one swatch');
  assert.match(swatches[0], HEX_RE);
});

test('extractSwatches: dominant color appears first in the result (largest cluster wins)', () => {
  // Big red cluster + tiny green cluster — red should be the first swatch.
  const buffer = makeBuffer([
    { rgb: [200, 30, 30], n: 200 },
    { rgb: [40, 180, 60], n: 8 },
  ]);
  const swatches = extractSwatches(buffer, { k: 2, channels: 4 });
  assert.ok(swatches.length >= 1);
  const [first] = swatches;
  // Parse: red channel should dominate.
  const m = /^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/.exec(first);
  assert.ok(m, `first swatch ${first} is RRGGBB`);
  if (m) {
    const r = parseInt(m[1], 16);
    const g = parseInt(m[2], 16);
    const b = parseInt(m[3], 16);
    assert.ok(r > g && r > b, `first swatch ${first} is red-dominant (r=${r}, g=${g}, b=${b})`);
  }
});

test('extractSwatches: empty buffer falls back to a single neutral swatch (never zero)', () => {
  const swatches = extractSwatches([], { k: 3, channels: 4 });
  assert.equal(swatches.length, 1, 'empty input → exactly one fallback swatch');
  assert.match(swatches[0], HEX_RE);
});

test('extractSwatches: RGB-only buffer (channels=3) works without an alpha channel', () => {
  const buffer: number[] = [];
  for (let i = 0; i < 40; i += 1) buffer.push(216, 195, 165);
  for (let i = 0; i < 40; i += 1) buffer.push(138, 111, 82);
  const swatches = extractSwatches(buffer, { k: 2, channels: 3 });
  assert.ok(swatches.length >= 1 && swatches.length <= 3);
  for (const hex of swatches) {
    assert.match(hex, HEX_RE);
  }
});

test('extractSwatches: deterministic on the same input', () => {
  const buffer = makeBuffer([
    { rgb: [216, 195, 165], n: 60 },
    { rgb: [138, 111, 82], n: 40 },
  ]);
  const a = extractSwatches(buffer, { k: 3, channels: 4 });
  const b = extractSwatches(buffer, { k: 3, channels: 4 });
  assert.deepEqual(a, b, 'same input → same output');
});
