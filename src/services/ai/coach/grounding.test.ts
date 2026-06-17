/**
 * Vanilla node:test suite for the item-id grounding filter (APP-30 GATE-4).
 */

import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import type { ItemSummary } from '../schemas.ts';

import { groundItemIds } from './grounding.ts';

function mkItem(id: string): ItemSummary {
  return { id, name: id, category: 'Tops', swatches: [], wornCount: 0 };
}

test('groundItemIds: drops ids not present in the wardrobe', () => {
  const items = ['i1', 'i2', 'i3'].map(mkItem);
  const out = groundItemIds(['i1', 'i9', 'i2'], items);
  assert.deepEqual(out, ['i1', 'i2']);
});

test('groundItemIds: preserves input order', () => {
  const items = ['a', 'b', 'c', 'd'].map(mkItem);
  const out = groundItemIds(['d', 'a', 'c'], items);
  assert.deepEqual(out, ['d', 'a', 'c']);
});

test('groundItemIds: deduplicates (first occurrence wins)', () => {
  const items = ['x', 'y'].map(mkItem);
  const out = groundItemIds(['x', 'y', 'x', 'y'], items);
  assert.deepEqual(out, ['x', 'y']);
});

test('groundItemIds: empty proposal → empty result', () => {
  const items = ['a', 'b'].map(mkItem);
  assert.deepEqual(groundItemIds([], items), []);
});

test('groundItemIds: empty wardrobe → empty result (no hallucinations)', () => {
  assert.deepEqual(groundItemIds(['anything'], []), []);
});

test('groundItemIds: junk inputs skipped, never throws', () => {
  const items = ['a'].map(mkItem);
  // @ts-expect-error — defensive guard
  assert.deepEqual(groundItemIds([null, undefined, '', 'a'], items), ['a']);
  // @ts-expect-error — defensive guard
  assert.deepEqual(groundItemIds(null, items), []);
  // @ts-expect-error — defensive guard
  assert.deepEqual(groundItemIds(['a'], null), []);
});

test('groundItemIds: all-real ids pass through unchanged', () => {
  const items = ['i1', 'i2', 'i3', 'i4', 'i5'].map(mkItem);
  const out = groundItemIds(['i2', 'i3', 'i5'], items);
  assert.deepEqual(out, ['i2', 'i3', 'i5']);
});
