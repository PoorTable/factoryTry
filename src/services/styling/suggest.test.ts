/**
 * Vanilla node:test suite for the local outfit-suggestion engine (APP-31).
 *
 * Run via `npm test`, which calls
 *   node --experimental-strip-types --test src/services/styling/suggest.test.ts
 *
 * No Jest, no Vitest — only the standard library + node:assert. Imports are
 * relative so they resolve under node's TS strip-types loader without a
 * tsconfig path map.
 *
 * Cases (matching APP-31 acceptance):
 *   - empty draft → vibeScore is exactly 0
 *   - full draft (Editor at large / SEED_OUTFITS[0]) → vibeScore in [88,96]
 *   - single-category wardrobe → suggestForSlot returns the right shape
 *   - clashing palette (red / green / blue / yellow) → vibe < cohesive
 *   - determinism: same (slot, items, draft, seed) → same order across runs
 */

import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import type { Item, OutfitDraft } from '../../types/wardrobe';
import {
  colorDistance,
  paletteCohesion,
  suggestForSlot,
  surpriseLook,
  vibeScore,
} from './suggest.ts';

// ---------------------------------------------------------------------------
// Fixtures — mirror the relevant subset of src/data/seed.ts so the test file
// is self-contained (node's strip-types loader can't resolve the `@/` path
// alias without a tsconfig hook).
// ---------------------------------------------------------------------------

function mkItem(over: Partial<Item> & Pick<Item, 'id' | 'name' | 'category'>): Item {
  return {
    color: '#000000',
    swatches: [],
    season: 'all',
    photoUri: null,
    wornCount: 0,
    isFavorite: false,
    createdAt: '2026-06-01T00:00:00.000Z',
    ...over,
  } as Item;
}

/** Subset of SEED_ITEMS exercised by the suite (ids + categories preserved). */
const SEED_ITEMS: Item[] = [
  mkItem({ id: 'i1',  name: 'Linen camp shirt',   category: 'Tops',        color: '#E7D9BE', swatches: ['#E7D9BE', '#C7B68F'], season: 'summer' }),
  mkItem({ id: 'i3',  name: 'Pleated trouser',    category: 'Bottoms',     color: '#6B5F52', swatches: ['#6B5F52'],            season: 'all' }),
  mkItem({ id: 'i4',  name: 'Cashmere mock',      category: 'Tops',        color: '#A35836', swatches: ['#A35836', '#8A4426'], season: 'fall' }),
  mkItem({ id: 'i5',  name: 'Suede loafer',       category: 'Shoes',       color: '#7C4A2A', swatches: ['#7C4A2A'],            season: 'all' }),
  mkItem({ id: 'i6',  name: 'Silk scarf',         category: 'Accessories', color: '#C97B5E', swatches: ['#C97B5E', '#E7D9BE', '#7A8454'], season: 'all' }),
  mkItem({ id: 'i15', name: 'Linen wide-leg',     category: 'Bottoms',     color: '#DDD3C0', swatches: ['#DDD3C0'],            season: 'summer' }),
  mkItem({ id: 'i16', name: 'White sneaker',      category: 'Shoes',       color: '#F1EBE0', swatches: ['#F1EBE0', '#2A2520'], season: 'all' }),
];

/** Mirror of SEED_OUTFITS[0] — "Sunday slow" per data/seed.ts, treated by
 *  the gates as the canonical "Editor at large"-style cohesive full look.
 *  Padded with i6 (accessory) so the draft fills all four slots. */
const SEED_OUTFITS = [
  { id: 'o1', name: 'Sunday slow', vibe: 88, itemIds: ['i1', 'i15', 'i16'] },
];

const EMPTY_DRAFT: OutfitDraft = { top: null, bottom: null, shoes: null, extra: null };

// ---------------------------------------------------------------------------
// vibeScore — empty draft must be exactly 0 (GATE-7a)
// ---------------------------------------------------------------------------

test('vibeScore: empty draft returns exactly 0', () => {
  assert.equal(vibeScore(EMPTY_DRAFT, []), 0);
  assert.equal(vibeScore(EMPTY_DRAFT, SEED_ITEMS), 0);
});

// ---------------------------------------------------------------------------
// vibeScore — full cohesive draft (Editor at large / SEED_OUTFITS[0]) lands
// in the [88, 96] band (GATE-7b)
// ---------------------------------------------------------------------------

test('vibeScore: Editor at large / SEED_OUTFITS[0] full draft is in [88, 96]', () => {
  // SEED_OUTFITS[0] has 3 items; pad with i6 (accessory) for the EXTRA slot
  // so the draft is full — matches the "full 4-slot cohesive look" intent
  // of the calibration target. Expected ≈ 88-92.
  const baseIds = SEED_OUTFITS[0].itemIds;
  assert.equal(baseIds.length, 3, 'SEED_OUTFITS[0] has 3 itemIds');
  const fullDraft: OutfitDraft = {
    top: baseIds[0],     // i1 — Tops
    bottom: baseIds[1],  // i15 — Bottoms
    shoes: baseIds[2],   // i16 — Shoes
    extra: 'i6',         // accessory pad
  };
  const score = vibeScore(fullDraft, SEED_ITEMS);
  assert.ok(
    score >= 88 && score <= 96,
    `expected Editor at large vibe in [88, 96], got ${score}`
  );
});

// ---------------------------------------------------------------------------
// suggestForSlot — single-category wardrobe never throws and returns
// only items in the matching category (GATE-6)
// ---------------------------------------------------------------------------

test('suggestForSlot: single-category wardrobe (Tops only) is well-behaved', () => {
  const topsOnly: Item[] = SEED_ITEMS.filter((it) => it.category === 'Tops');

  const topResults = suggestForSlot('top', topsOnly, EMPTY_DRAFT);
  assert.ok(topResults.length === topsOnly.length, 'top slot returns every Tops item');
  for (const it of topResults) assert.equal(it.category, 'Tops');

  const bottomResults = suggestForSlot('bottom', topsOnly, EMPTY_DRAFT);
  assert.deepEqual(bottomResults, [], 'bottom slot has no candidates');

  // vibe still computes without throwing — empty draft, single-cat wardrobe.
  assert.equal(vibeScore(EMPTY_DRAFT, topsOnly), 0);
});

// ---------------------------------------------------------------------------
// vibeScore — clashing palette is strictly less than cohesive (GATE-7c)
// ---------------------------------------------------------------------------

test('vibeScore: clashing palette (red / green / blue / yellow) < cohesive', () => {
  const clashItems: Item[] = [
    mkItem({ id: 'r', name: 'Red top',     category: 'Tops',    color: '#E53935', swatches: ['#E53935'], season: 'all' }),
    mkItem({ id: 'g', name: 'Green pant',  category: 'Bottoms', color: '#43A047', swatches: ['#43A047'], season: 'all' }),
    mkItem({ id: 'b', name: 'Blue shoe',   category: 'Shoes',   color: '#1E88E5', swatches: ['#1E88E5'], season: 'all' }),
    mkItem({ id: 'y', name: 'Yellow scarf', category: 'Accessories', color: '#FDD835', swatches: ['#FDD835'], season: 'all' }),
  ];
  const clashDraft: OutfitDraft = { top: 'r', bottom: 'g', shoes: 'b', extra: 'y' };
  const clashScore = vibeScore(clashDraft, clashItems);

  const cohesiveDraft: OutfitDraft = { top: 'i1', bottom: 'i15', shoes: 'i16', extra: 'i6' };
  const cohesiveScore = vibeScore(cohesiveDraft, SEED_ITEMS);

  assert.ok(
    clashScore < cohesiveScore,
    `expected clashing (${clashScore}) < cohesive (${cohesiveScore})`
  );
});

// ---------------------------------------------------------------------------
// Determinism — same inputs, same order (GATE-8)
// ---------------------------------------------------------------------------

test('suggestForSlot: determinism across repeated calls', () => {
  const a = suggestForSlot('top', SEED_ITEMS, EMPTY_DRAFT, 0).map((it) => it.id);
  const b = suggestForSlot('top', SEED_ITEMS, EMPTY_DRAFT, 0).map((it) => it.id);
  assert.deepEqual(a, b, 'seed 0 is deterministic');

  const c = suggestForSlot('extra', SEED_ITEMS, EMPTY_DRAFT, 42).map((it) => it.id);
  const d = suggestForSlot('extra', SEED_ITEMS, EMPTY_DRAFT, 42).map((it) => it.id);
  assert.deepEqual(c, d, 'seed 42 is deterministic');
});

// ---------------------------------------------------------------------------
// surpriseLook — fills 4 slots (when wardrobe supports it) with unique items
// ---------------------------------------------------------------------------

test('surpriseLook: deterministic full 4-slot draft from a complete wardrobe', () => {
  const look = surpriseLook(SEED_ITEMS, 7);
  const ids = [look.top, look.bottom, look.shoes, look.extra].filter(
    (id): id is string => id !== null
  );
  assert.equal(ids.length, 4, 'all four slots are filled');
  assert.equal(new Set(ids).size, 4, 'no item is reused across slots');

  const repeat = surpriseLook(SEED_ITEMS, 7);
  assert.deepEqual(look, repeat, 'surpriseLook is deterministic for the same seed');
});

// ---------------------------------------------------------------------------
// Color helpers — sanity checks on the exposed primitives
// ---------------------------------------------------------------------------

test('colorDistance: neutrals do not clash with anything', () => {
  // A truly desaturated gray vs any saturated color → 0 (no hue conflict).
  assert.equal(colorDistance('#888888', '#A35836'), 0);
  assert.equal(colorDistance('#A35836', '#888888'), 0);
});

test('paletteCohesion: single swatch returns 1', () => {
  assert.equal(paletteCohesion(['#A35836']), 1);
  assert.equal(paletteCohesion([]), 1);
});

test('paletteCohesion: red + green is less cohesive than red + dusty red', () => {
  const clash = paletteCohesion(['#E53935', '#43A047']);
  const harmony = paletteCohesion(['#E53935', '#C97B5E']);
  assert.ok(clash < harmony, `expected clash (${clash}) < harmony (${harmony})`);
});
