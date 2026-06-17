/**
 * Vanilla node:test suite for the palette analysis + style classification
 * module (APP-32). Mirrors the runner conventions of `suggest.test.ts` so
 * `npm test` picks it up via `node --experimental-strip-types --test ...`.
 *
 * Cases (matching APP-32 acceptance):
 *   - aggregatePalette returns exactly 10 segments and pcts sum to 100
 *   - near-duplicate hexes collapse to one cluster (clustering correctness)
 *   - nameForHex hits the right curated family (cognac, sand, indigo, sage)
 *   - largestRemainder pct rounding is integer and totals 100
 *   - classifyProfile is deterministic + offline (warm+muted+mid → Warm Autumn)
 *   - generateInsight references real wardrobe colors and includes italic *…*
 *   - computeProfile accepts an async insight generator and falls back on error
 */

import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import type { Item } from '../../types/wardrobe';
import {
  aggregatePalette,
  classifyProfile,
  computeProfile,
  generateInsight,
  nameForHex,
  paletteStats,
  profileCacheKey,
} from './palette.ts';

// ---------------------------------------------------------------------------
// Fixtures — a warm-autumn-skewing subset of SEED_ITEMS (data/seed.ts), kept
// self-contained so the strip-types loader doesn't need to resolve the `@/`
// alias.
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

const WARM_AUTUMN_ITEMS: Item[] = [
  mkItem({ id: 'i1',  name: 'Linen camp shirt',   category: 'Tops',        color: '#E7D9BE', swatches: ['#E7D9BE', '#C7B68F'] }),
  mkItem({ id: 'i2',  name: 'Wool trench',        category: 'Outerwear',   color: '#B89368', swatches: ['#B89368', '#8E6F4B'] }),
  mkItem({ id: 'i3',  name: 'Pleated trouser',    category: 'Bottoms',     color: '#6B5F52', swatches: ['#6B5F52'] }),
  mkItem({ id: 'i4',  name: 'Cashmere mock',      category: 'Tops',        color: '#A35836', swatches: ['#A35836', '#8A4426'] }),
  mkItem({ id: 'i5',  name: 'Suede loafer',       category: 'Shoes',       color: '#7C4A2A', swatches: ['#7C4A2A'] }),
  mkItem({ id: 'i6',  name: 'Silk scarf',         category: 'Accessories', color: '#C97B5E', swatches: ['#C97B5E', '#7A8454'] }),
  mkItem({ id: 'i7',  name: 'Olive chore coat',   category: 'Outerwear',   color: '#7A8454', swatches: ['#7A8454'] }),
];

// ---------------------------------------------------------------------------
// aggregatePalette: 10 segments, pcts sum to 100 (GATE-3)
// ---------------------------------------------------------------------------

test('aggregatePalette: exactly 10 segments and pcts sum to 100', () => {
  const palette = aggregatePalette(WARM_AUTUMN_ITEMS);
  assert.equal(palette.length, 10, 'palette has 10 segments');
  const total = palette.reduce((s, seg) => s + seg.pct, 0);
  assert.equal(total, 100, `pcts must sum to 100, got ${total}`);
  for (const seg of palette) {
    assert.equal(typeof seg.pct, 'number');
    assert.ok(Number.isInteger(seg.pct), `pct ${seg.pct} is integer`);
    assert.ok(seg.pct >= 0, `pct ${seg.pct} is non-negative`);
    assert.ok(seg.hex.startsWith('#'), 'hex begins with #');
    assert.ok(seg.name.length > 0, 'segment has a name');
  }
});

test('aggregatePalette: empty wardrobe still returns 10 segments summing to 100', () => {
  const palette = aggregatePalette([]);
  assert.equal(palette.length, 10);
  assert.equal(palette.reduce((s, seg) => s + seg.pct, 0), 100);
});

// ---------------------------------------------------------------------------
// Clustering: near-duplicate swatches collapse (GATE-8)
// ---------------------------------------------------------------------------

test('aggregatePalette: near-duplicate hexes collapse into a single cluster', () => {
  // Two very close warm browns + one distinct olive. Clustering should
  // produce a single dominant warm cluster — not two segments named "Cognac".
  const items: Item[] = [
    mkItem({ id: 'a', name: '', category: 'Tops',    swatches: ['#A35836', '#A55937', '#A4593A'] }),
    mkItem({ id: 'b', name: '', category: 'Bottoms', swatches: ['#7A8454'] }),
  ];
  const palette = aggregatePalette(items);
  // The first segment (largest cluster) should be the warm-brown family.
  const top = palette[0];
  assert.equal(top.name, 'Cognac', `top cluster should be Cognac, got ${top.name}`);
  // No other Cognac segments — duplicates collapsed.
  const cognacCount = palette.filter((seg) => seg.name === 'Cognac').length;
  assert.equal(cognacCount, 1, 'near-duplicate cognac swatches collapse to one segment');
});

// ---------------------------------------------------------------------------
// Naming: nearest-color hits the right family (GATE-2)
// ---------------------------------------------------------------------------

test('nameForHex: arbitrary hexes resolve to the closest curated family', () => {
  assert.equal(nameForHex('#A35836'), 'Cognac');
  assert.equal(nameForHex('#E7D9BE'), 'Sand');
  assert.equal(nameForHex('#3D4A5C'), 'Indigo');
  assert.equal(nameForHex('#7A8454'), 'Olive');
  // A close-but-not-identical sage tone — should still resolve to Sage.
  assert.equal(nameForHex('#9DAF8F'), 'Sage');
});

// ---------------------------------------------------------------------------
// Classification: warm + muted + mid → Warm Autumn (GATE-4)
// ---------------------------------------------------------------------------

test('classifyProfile: warm-autumn wardrobe → Warm Autumn / quiet, layered, tactile', () => {
  const result = classifyProfile(WARM_AUTUMN_ITEMS);
  assert.equal(result.paletteName, 'Warm Autumn');
  assert.equal(result.tagline, 'quiet, layered, tactile');
});

test('classifyProfile: cool / clear / light wardrobe → Light Summer', () => {
  const coolItems: Item[] = [
    mkItem({ id: 'c1', name: '', category: 'Tops',    swatches: ['#7CC8F7', '#A6E2F0'] }),
    mkItem({ id: 'c2', name: '', category: 'Bottoms', swatches: ['#8FB8E8'] }),
    mkItem({ id: 'c3', name: '', category: 'Shoes',   swatches: ['#D7E8F5', '#A0C8E0'] }),
  ];
  const result = classifyProfile(coolItems);
  assert.equal(result.paletteName, 'Light Summer');
});

test('classifyProfile: deterministic — same input, same output across runs', () => {
  const a = classifyProfile(WARM_AUTUMN_ITEMS);
  const b = classifyProfile(WARM_AUTUMN_ITEMS);
  assert.deepEqual(a, b);
});

test('paletteStats: empty wardrobe returns neutral defaults', () => {
  const stats = paletteStats([]);
  assert.equal(stats.warm, 0);
  assert.equal(stats.cool, 0);
  assert.equal(stats.saturation, 0);
});

// ---------------------------------------------------------------------------
// Insight: references real colors + italic emphasis (GATE-5)
// ---------------------------------------------------------------------------

test('generateInsight: includes italic *…* emphasis and references real palette colors', () => {
  const palette = aggregatePalette(WARM_AUTUMN_ITEMS);
  const insight = generateInsight(WARM_AUTUMN_ITEMS, palette);

  assert.match(insight, /\*[^*]+\*/, 'insight contains an italic *…* span');

  // The two highlighted colors must appear in the palette (lowercased).
  const paletteNames = new Set(palette.map((seg) => seg.name.toLowerCase()));
  // Extract the "You wear X and Y a lot" colors.
  const m = /You wear (\w+) and (\w+) a lot/.exec(insight);
  assert.ok(m, `insight matches the templated shape: ${insight}`);
  if (m) {
    assert.ok(paletteNames.has(m[1]), `${m[1]} appears in the wardrobe palette`);
    assert.ok(paletteNames.has(m[2]), `${m[2]} appears in the wardrobe palette`);
  }
});

test('generateInsight: empty wardrobe falls back to the seeded copy verbatim', () => {
  const insight = generateInsight([], []);
  assert.match(insight, /cognac and camel/);
  assert.match(insight, /\*soft sage knit\*/);
});

// ---------------------------------------------------------------------------
// computeProfile: shape + async insight seam (GATE-6)
// ---------------------------------------------------------------------------

test('computeProfile: sync path returns a StyleProfile-shaped object', () => {
  const profile = computeProfile(WARM_AUTUMN_ITEMS);
  assert.equal(profile.paletteName, 'Warm Autumn');
  assert.equal(profile.tagline, 'quiet, layered, tactile');
  assert.equal(profile.palette.length, 10);
  assert.equal(profile.palette.reduce((s, seg) => s + seg.pct, 0), 100);
  assert.equal(typeof profile.insight, 'string');
});

test('computeProfile: async insight generator overrides the templated path', async () => {
  const result = await computeProfile(WARM_AUTUMN_ITEMS, {
    insightGenerator: async () => 'Iris drafted this *with care*.',
  });
  assert.equal(typeof result, 'object');
  assert.equal((result as { insight?: string }).insight, 'Iris drafted this *with care*.');
});

test('computeProfile: async generator failure falls back to the templated insight', async () => {
  const result = await computeProfile(WARM_AUTUMN_ITEMS, {
    insightGenerator: async () => {
      throw new Error('no model loaded');
    },
  });
  const profile = result as { insight?: string };
  assert.ok(profile.insight && profile.insight.includes('*'), 'fallback insight present');
});

test('profileCacheKey: changes when item swatches or wornCount change', () => {
  const k1 = profileCacheKey(WARM_AUTUMN_ITEMS);
  const bumped = WARM_AUTUMN_ITEMS.map((it, i) =>
    i === 0 ? { ...it, wornCount: it.wornCount + 1 } : it
  );
  const k2 = profileCacheKey(bumped);
  assert.notEqual(k1, k2, 'wornCount change invalidates the cache key');
});
