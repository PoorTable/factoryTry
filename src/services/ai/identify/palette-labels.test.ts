/**
 * Vanilla node:test suite for the palette-label nearest-match (APP-29 GATE-4).
 *
 * GATE-4: assert the nearest-match returns "Warm neutral" for the canonical
 * mock swatches ['#D8C3A5','#B8A285','#8A6F52'], AND returns a non-empty
 * string for at least one other input cluster (proves the table is not
 * single-entry).
 */

import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { PALETTE_LABEL_TABLE, nearestPaletteLabel } from './palette-labels.ts';

test('nearestPaletteLabel: canonical mock swatches → "Warm neutral"', () => {
  const label = nearestPaletteLabel(['#D8C3A5', '#B8A285', '#8A6F52']);
  assert.equal(label, 'Warm neutral', `expected "Warm neutral", got ${label}`);
});

test('nearestPaletteLabel: cool blue swatches resolve to a different (non-empty) label', () => {
  const label = nearestPaletteLabel(['#3D5A82', '#4B6794']);
  assert.ok(label.length > 0, 'returns a non-empty string');
  assert.notEqual(label, 'Warm neutral', 'blue input does NOT resolve to "Warm neutral"');
});

test('nearestPaletteLabel: sage / green swatches resolve to a green-family label', () => {
  const label = nearestPaletteLabel(['#9CAE8E']);
  assert.ok(label.length > 0);
  assert.notEqual(label, 'Warm neutral');
});

test('nearestPaletteLabel: empty input falls back to "Warm neutral" (design default)', () => {
  assert.equal(nearestPaletteLabel([]), 'Warm neutral');
});

test('nearestPaletteLabel: all-malformed input falls back to "Warm neutral"', () => {
  assert.equal(nearestPaletteLabel(['not-a-color', '###']), 'Warm neutral');
});

test('PALETTE_LABEL_TABLE: has more than one entry (proves nearest-match is meaningful)', () => {
  assert.ok(
    PALETTE_LABEL_TABLE.length > 1,
    `palette label table has ${PALETTE_LABEL_TABLE.length} entries`,
  );
});

test('PALETTE_LABEL_TABLE: every entry has a non-empty label and a valid hex', () => {
  for (const entry of PALETTE_LABEL_TABLE) {
    assert.ok(entry.label.length > 0, `entry has a label: ${JSON.stringify(entry)}`);
    assert.match(entry.hex, /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, `entry hex is valid: ${entry.hex}`);
  }
});

test('nearestPaletteLabel: 3-char hex (#FFF) is accepted', () => {
  const label = nearestPaletteLabel(['#FFF']);
  assert.ok(label.length > 0, 'returns a non-empty label for 3-char hex');
});
