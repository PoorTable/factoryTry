/**
 * Local, on-device palette analysis + style profile classification (APP-32).
 *
 * Pure module — no React, react-native, expo, or network access. Imports only
 * types from the wardrobe model. Replaces the prior `POST /api/profile`
 * Claude path; both classification and the fallback insight are now produced
 * locally. The on-device LLM (APP-35) can later drop in via the
 * `insightGenerator` seam on `computeProfile`.
 *
 * Public surface:
 *   - aggregatePalette(items)           → exactly 10 segments, pcts sum to 100
 *   - nameForHex(hex)                   → nearest entry from the curated table
 *   - classifyProfile(items|stats)      → { paletteName, tagline }
 *   - generateInsight(items, palette)   → templated, italic-emphasis string
 *   - computeProfile(items, options?)   → full StyleProfile (sync or async)
 *   - profileCacheKey(items)            → memoization key for the store
 *
 * Mirrors the conventions of `./suggest.ts` (same hex/HSL helpers, same
 * node:test-friendly relative imports, same "no side effects, no React"
 * discipline).
 */

import type { Item, StyleProfile } from '../../types/wardrobe';

// ---------------------------------------------------------------------------
// Curated color-name table
// ---------------------------------------------------------------------------

/**
 * Closed vocabulary of palette segment names. Warm-autumn family is heavily
 * represented (Cognac, Camel, Sand, Espresso, Olive, Bone, Terracotta) per
 * the design handoff (data/seed.ts SEED_PALETTE); cool/neutral families are
 * included so non-warm wardrobes still get a meaningful nearest match.
 *
 * Names are matched against an item's hex by nearest squared-RGB distance
 * (see `nameForHex`). The order here is irrelevant to correctness.
 */
export const COLOR_NAME_TABLE: readonly { name: string; hex: string }[] = [
  // Warm autumn core
  { name: 'Cognac',     hex: '#A35836' },
  { name: 'Camel',      hex: '#B89368' },
  { name: 'Sand',       hex: '#E7D9BE' },
  { name: 'Espresso',   hex: '#6B5F52' },
  { name: 'Olive',      hex: '#7A8454' },
  { name: 'Bone',       hex: '#DDD3C0' },
  { name: 'Terracotta', hex: '#C97B5E' },
  { name: 'Rust',       hex: '#B86F4A' },
  { name: 'Mustard',    hex: '#C9A14A' },
  { name: 'Caramel',    hex: '#8E6F4B' },
  // Neutrals
  { name: 'Ink',        hex: '#2A2520' },
  { name: 'Charcoal',   hex: '#3A3A3A' },
  { name: 'Stone',      hex: '#9A9A8E' },
  { name: 'Cream',      hex: '#F1EBE0' },
  { name: 'Sage',       hex: '#9CAE8E' },
  // Cool accents
  { name: 'Indigo',     hex: '#3D4A5C' },
  { name: 'Slate',      hex: '#6E7A88' },
  { name: 'Plum',       hex: '#6B4858' },
  { name: 'Mist',       hex: '#E2EDE7' },
  { name: 'Forest',     hex: '#2E4A3A' },
];

// ---------------------------------------------------------------------------
// Color helpers (pure)
// ---------------------------------------------------------------------------

/** Parse "#RRGGBB" → [r,g,b] in 0..255. Returns [0,0,0] on malformed input. */
function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [0, 0, 0];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

/** [r,g,b] (0..255) → "#RRGGBB" (uppercase, no alpha). */
function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`.toUpperCase();
}

/** RGB → HSL. h in 0..360, s/l in 0..1. */
function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const R = r / 255;
  const G = g / 255;
  const B = b / 255;
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === R) h = ((G - B) / d + (G < B ? 6 : 0)) * 60;
  else if (max === G) h = ((B - R) / d + 2) * 60;
  else h = ((R - G) / d + 4) * 60;
  return { h, s, l };
}

/** Squared RGB distance — cheap, monotonic with Euclidean RGB distance. */
function rgbDist2(a: [number, number, number], b: [number, number, number]): number {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return dr * dr + dg * dg + db * db;
}

/**
 * Nearest entry from `COLOR_NAME_TABLE` for an arbitrary hex.
 * Empty / malformed input falls back to the warmest neutral ("Bone").
 */
export function nameForHex(hex: string): string {
  if (!hex) return 'Bone';
  const rgb = hexToRgb(hex);
  let bestName = COLOR_NAME_TABLE[0].name;
  let bestDist = Infinity;
  for (const entry of COLOR_NAME_TABLE) {
    const d = rgbDist2(rgb, hexToRgb(entry.hex));
    if (d < bestDist) {
      bestDist = d;
      bestName = entry.name;
    }
  }
  return bestName;
}

// ---------------------------------------------------------------------------
// Clustering & aggregation
// ---------------------------------------------------------------------------

/** Threshold (squared RGB) below which two swatches collapse to one cluster. */
const CLUSTER_THRESHOLD2 = 40 * 40; // ~40 units in RGB space — visually near-duplicates

interface Cluster {
  hexes: string[];
  count: number;
  // Running RGB mean for centroid.
  r: number;
  g: number;
  b: number;
}

function clusterCentroidHex(c: Cluster): string {
  return rgbToHex(c.r / c.count, c.g / c.count, c.b / c.count);
}

/**
 * Greedy single-link clustering of input hexes by squared RGB distance.
 * Each hex is added to the nearest existing cluster within
 * `CLUSTER_THRESHOLD2`, otherwise it seeds a new cluster. Order-dependent
 * but deterministic for a given input order — which is all we need because
 * items have stable ids and we iterate them in a stable order.
 */
function clusterHexes(hexes: string[]): Cluster[] {
  const clusters: Cluster[] = [];
  for (const hex of hexes) {
    const rgb = hexToRgb(hex);
    let bestIdx = -1;
    let bestDist = CLUSTER_THRESHOLD2;
    for (let i = 0; i < clusters.length; i += 1) {
      const c = clusters[i];
      const centroid: [number, number, number] = [c.r / c.count, c.g / c.count, c.b / c.count];
      const d = rgbDist2(rgb, centroid);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    if (bestIdx === -1) {
      clusters.push({ hexes: [hex], count: 1, r: rgb[0], g: rgb[1], b: rgb[2] });
    } else {
      const c = clusters[bestIdx];
      c.hexes.push(hex);
      c.count += 1;
      c.r += rgb[0];
      c.g += rgb[1];
      c.b += rgb[2];
    }
  }
  return clusters;
}

/**
 * Round an array of fractional percentages to integers that sum to exactly
 * 100 (largest-remainder method). Stable for inputs whose floats already sum
 * to ~100; gracefully redistributes when they don't.
 */
function largestRemainderRound(values: number[], total = 100): number[] {
  if (values.length === 0) return [];
  const sum = values.reduce((s, v) => s + v, 0);
  if (sum <= 0) {
    // Even split fallback.
    const base = Math.floor(total / values.length);
    const out = values.map(() => base);
    let remainder = total - base * values.length;
    for (let i = 0; i < out.length && remainder > 0; i += 1) {
      out[i] += 1;
      remainder -= 1;
    }
    return out;
  }
  const scaled = values.map((v) => (v / sum) * total);
  const floors = scaled.map((v) => Math.floor(v));
  const remainders = scaled.map((v, i) => ({ i, frac: v - floors[i] }));
  const used = floors.reduce((s, v) => s + v, 0);
  let leftover = total - used;
  remainders.sort((a, b) => b.frac - a.frac);
  for (let k = 0; k < remainders.length && leftover > 0; k += 1) {
    floors[remainders[k].i] += 1;
    leftover -= 1;
  }
  return floors;
}

/** Palette segment shape — re-exported via `StyleProfile['palette'][number]`. */
export type PaletteSegment = StyleProfile['palette'][number];

/**
 * Aggregate item swatches → exactly 10 named segments whose `pct` sum to 100.
 *
 * - Collects every swatch on every item (duplicates contribute weight).
 * - Clusters near-duplicate hexes (greedy single-link, RGB distance ≤ 40).
 * - Sorts clusters by weight; takes the top 10 (or pads from the curated
 *   color table when the wardrobe is too small to fill ten distinct clusters).
 * - Centroid hex → nearest curated color name; pct = largest-remainder
 *   rounded share that sums to exactly 100.
 *
 * On empty input, returns ten zero-weighted segments drawn from the curated
 * table so downstream renderers (donut, swatch grid) never crash on `[]`.
 */
export function aggregatePalette(items: readonly Item[]): PaletteSegment[] {
  const hexes: string[] = [];
  for (const it of items) {
    for (const hex of it.swatches) hexes.push(hex);
  }

  if (hexes.length === 0) {
    // Empty wardrobe — emit a flat 10-segment placeholder that still sums to
    // 100 so the wheel renders. Names/colors come from the curated table head.
    const pcts = largestRemainderRound(new Array(10).fill(1));
    return COLOR_NAME_TABLE.slice(0, 10).map((entry, i) => ({
      hex: entry.hex,
      name: entry.name,
      pct: pcts[i],
    }));
  }

  let clusters = clusterHexes(hexes);
  // Largest first.
  clusters.sort((a, b) => b.count - a.count);

  // Pad with curated colors (weight 0) if the wardrobe has < 10 distinct
  // clusters — keeps the wheel at exactly 10 segments.
  if (clusters.length < 10) {
    const usedNames = new Set(clusters.map((c) => nameForHex(clusterCentroidHex(c))));
    for (const entry of COLOR_NAME_TABLE) {
      if (clusters.length >= 10) break;
      if (usedNames.has(entry.name)) continue;
      const rgb = hexToRgb(entry.hex);
      // Tiny weight (0.5) — smaller than any real cluster, present but
      // negligible; ensures the rounded pct may legitimately round to 0.
      clusters.push({ hexes: [entry.hex], count: 0.5, r: rgb[0], g: rgb[1], b: rgb[2] });
      usedNames.add(entry.name);
    }
  }

  clusters = clusters.slice(0, 10);

  const pcts = largestRemainderRound(clusters.map((c) => c.count));

  return clusters.map((c, i) => {
    const hex = clusterCentroidHex(c);
    return { hex, name: nameForHex(hex), pct: pcts[i] };
  });
}

// ---------------------------------------------------------------------------
// Wardrobe-level color statistics (drive classification)
// ---------------------------------------------------------------------------

/**
 * Coarse warmth / saturation / value distribution across all item swatches.
 * Hue buckets are tagged warm/cool/neutral so we can detect a "warm autumn"
 * wardrobe vs a "cool summer" one without enumerating every season's exact
 * hue range.
 */
export interface PaletteStats {
  /** Share of pixels (proxied by swatch count) classified as warm (orange/red/yellow). */
  warm: number;
  /** Share of pixels classified as cool (green/blue/violet). */
  cool: number;
  /** Mean HSL saturation across all swatches, 0..1. */
  saturation: number;
  /** Mean HSL lightness across all swatches, 0..1. */
  value: number;
}

/** Hue → 'warm' | 'cool' | 'neutral' (neutrals are very-low-saturation swatches). */
function hueClass(h: number, s: number): 'warm' | 'cool' | 'neutral' {
  if (s < 0.12) return 'neutral';
  // Warm: red→orange→yellow (0..70) plus the magenta arc (315..360).
  if (h <= 70 || h >= 315) return 'warm';
  // Cool: green→blue→violet (140..280).
  if (h >= 140 && h <= 280) return 'cool';
  // 70..140 and 280..315 are warm-ish neutrals (yellow-green, magenta-pink).
  return 'warm';
}

export function paletteStats(items: readonly Item[]): PaletteStats {
  const hexes: string[] = [];
  for (const it of items) for (const hex of it.swatches) hexes.push(hex);
  if (hexes.length === 0) {
    return { warm: 0, cool: 0, saturation: 0, value: 0.5 };
  }
  let warm = 0;
  let cool = 0;
  let sSum = 0;
  let lSum = 0;
  for (const hex of hexes) {
    const hsl = rgbToHsl(...hexToRgb(hex));
    sSum += hsl.s;
    lSum += hsl.l;
    const cls = hueClass(hsl.h, hsl.s);
    if (cls === 'warm') warm += 1;
    else if (cls === 'cool') cool += 1;
  }
  return {
    warm: warm / hexes.length,
    cool: cool / hexes.length,
    saturation: sSum / hexes.length,
    value: lSum / hexes.length,
  };
}

// ---------------------------------------------------------------------------
// Classification (deterministic, offline)
// ---------------------------------------------------------------------------

export interface Classification {
  paletteName: string;
  tagline: string;
}

/**
 * Map aggregated stats → seasonal classification.
 *
 * Heuristics:
 *   warmth  = warm > cool             (warm vs cool)
 *   muted   = saturation < 0.55       (muted vs clear)
 *   light   = value > 0.55            (light vs deep)
 *
 * | warmth | muted | light | paletteName          |
 * |--------|-------|-------|----------------------|
 * | warm   | muted | mid   | Warm Autumn          |
 * | warm   | clear | light | Warm Spring          |
 * | warm   | clear | deep  | Deep Autumn          |
 * | warm   | muted | light | Soft Autumn          |
 * | cool   | muted | light | Cool Summer          |
 * | cool   | muted | deep  | Soft Winter          |
 * | cool   | clear | light | Light Summer         |
 * | cool   | clear | deep  | Cool Winter          |
 *
 * Empty wardrobe → "Warm Autumn" (the seeded design's default), so the
 * Style Profile screen still renders before any items exist.
 */
export function classifyProfile(input: readonly Item[] | PaletteStats): Classification {
  const stats: PaletteStats = Array.isArray(input) ? paletteStats(input) : (input as PaletteStats);

  // Empty wardrobe → fall back to the seeded persona.
  if (stats.warm === 0 && stats.cool === 0 && stats.saturation === 0) {
    return { paletteName: 'Warm Autumn', tagline: 'quiet, layered, tactile' };
  }

  const warm = stats.warm >= stats.cool;
  const muted = stats.saturation < 0.55;
  const light = stats.value > 0.55;

  if (warm && muted && !light) {
    return { paletteName: 'Warm Autumn', tagline: 'quiet, layered, tactile' };
  }
  if (warm && muted && light) {
    return { paletteName: 'Soft Autumn', tagline: 'sunlit, soft, lived-in' };
  }
  if (warm && !muted && light) {
    return { paletteName: 'Warm Spring', tagline: 'bright, fresh, golden' };
  }
  if (warm && !muted && !light) {
    return { paletteName: 'Deep Autumn', tagline: 'rich, grounded, smoky' };
  }
  if (!warm && muted && light) {
    return { paletteName: 'Cool Summer', tagline: 'misty, calm, considered' };
  }
  if (!warm && muted && !light) {
    return { paletteName: 'Soft Winter', tagline: 'dusky, refined, quiet' };
  }
  if (!warm && !muted && light) {
    return { paletteName: 'Light Summer', tagline: 'cool, bright, breezy' };
  }
  return { paletteName: 'Cool Winter', tagline: 'sharp, modern, graphic' };
}

// ---------------------------------------------------------------------------
// Insight (templated fallback + async-generator seam for APP-35)
// ---------------------------------------------------------------------------

/**
 * Context handed to a custom insight generator. Mirrors what the on-device
 * LLM (APP-35) needs — the user's top palette, a detected gap, and the
 * classification — so it can phrase Iris's voice without re-computing
 * anything. `gapColor` is the name of a curated color NOT well-represented
 * in the wardrobe (e.g. "soft sage" when warm-autumn lacks green).
 */
export interface InsightContext {
  palette: PaletteSegment[];
  classification: Classification;
  /** Name of a curated color underrepresented in the wardrobe (lowercase, adjective-friendly). */
  gapColor: string;
  /** Names of the two most prominent colors in the wardrobe (lowercase). */
  topColors: [string, string];
}

/**
 * Pick a curated color that is underrepresented in the supplied palette so
 * the insight can suggest a "round out your palette" piece. Prefers warm
 * autumn-adjacent options (sage, plum, mist) so the suggestion stays in
 * the design's voice; falls back to any curated color not already present.
 */
function pickGapColor(palette: PaletteSegment[]): string {
  const present = new Set(palette.map((seg) => seg.name));
  const preferred = ['Sage', 'Plum', 'Mist', 'Slate', 'Indigo', 'Forest', 'Cream'];
  for (const name of preferred) {
    if (!present.has(name)) return name.toLowerCase();
  }
  for (const entry of COLOR_NAME_TABLE) {
    if (!present.has(entry.name)) return entry.name.toLowerCase();
  }
  // Fall back to the design's spec'd suggestion.
  return 'soft sage';
}

/**
 * Build the templated fallback insight. Always references real colors from
 * the wardrobe (the two most prominent palette segments) and a gap color
 * drawn from the curated table — never invented hex values, never colors
 * absent from the analysis. The italic `*…*` span flags the gap-piece
 * suggestion for Iris's emphasized phrasing.
 *
 * Empty wardrobe → seeded spec verbatim so the Style Profile screen reads
 * correctly before any items are added.
 */
export function generateInsight(items: readonly Item[], palette: PaletteSegment[]): string {
  if (palette.length === 0 || items.length === 0) {
    return 'You wear cognac and camel a lot. A *soft sage knit* would round out your palette nicely.';
  }
  const sorted = [...palette].sort((a, b) => b.pct - a.pct);
  const first = (sorted[0]?.name ?? 'cognac').toLowerCase();
  const second = (sorted[1]?.name ?? 'camel').toLowerCase();
  const gap = pickGapColor(palette);
  return `You wear ${first} and ${second} a lot. A *soft ${gap} knit* would round out your palette nicely.`;
}

/**
 * Async insight generator seam — APP-35's on-device LLM plugs in here. The
 * caller passes a function that maps `InsightContext → Promise<string>`; if
 * it resolves to a non-empty string we use it, otherwise we fall back to the
 * templated path. Any thrown/rejected error is swallowed and the template
 * wins, so the screen is never blocked by a missing model.
 */
export type InsightGenerator = (ctx: InsightContext) => Promise<string>;

// ---------------------------------------------------------------------------
// Memoization key (for the wardrobe store)
// ---------------------------------------------------------------------------

/**
 * Stable key that changes iff anything affecting the profile changed. The
 * store uses it to skip recompute when an unrelated slice updates (chat,
 * draft, favorites). Items contribute id + wornCount + swatch list; ordering
 * is implicit because items themselves have a stable order in the store.
 */
export function profileCacheKey(items: readonly Item[]): string {
  return items.map((it) => `${it.id}:${it.wornCount}:${it.swatches.join(',')}`).join('|');
}

// ---------------------------------------------------------------------------
// computeProfile — entry-point for the store
// ---------------------------------------------------------------------------

export interface ComputeProfileOptions {
  /**
   * Optional on-device async insight generator (APP-35). When supplied,
   * `computeProfile` returns a `Promise<StyleProfile>`; the promise resolves
   * with the LLM insight on success or the templated fallback on failure.
   * Without this option, `computeProfile` is fully synchronous.
   */
  insightGenerator?: InsightGenerator;
}

/**
 * Build a complete `StyleProfile` from the user's wardrobe.
 *
 * Synchronous (no `insightGenerator`) — returns the templated insight path.
 * Asynchronous (with `insightGenerator`) — returns a Promise that awaits the
 * on-device LLM and falls back to the template on error / empty output.
 *
 * Either way, the returned object's shape matches `StyleProfile` exactly
 * (no extra fields), so it round-trips through `paletteAnalysisSchema`.
 */
export function computeProfile(items: readonly Item[]): StyleProfile;
export function computeProfile(
  items: readonly Item[],
  options: ComputeProfileOptions
): StyleProfile | Promise<StyleProfile>;
export function computeProfile(
  items: readonly Item[],
  options: ComputeProfileOptions = {}
): StyleProfile | Promise<StyleProfile> {
  const palette = aggregatePalette(items);
  const classification = classifyProfile(items);
  const templated = generateInsight(items, palette);

  const base: StyleProfile = {
    paletteName: classification.paletteName,
    tagline: classification.tagline,
    palette,
    insight: templated,
  };

  if (!options.insightGenerator) return base;

  const ctx: InsightContext = {
    palette,
    classification,
    gapColor: pickGapColor(palette),
    topColors: [
      (palette[0]?.name ?? 'Cognac').toLowerCase(),
      (palette[1]?.name ?? 'Camel').toLowerCase(),
    ],
  };

  return Promise.resolve()
    .then(() => options.insightGenerator!(ctx))
    .then((text) => {
      const trimmed = typeof text === 'string' ? text.trim() : '';
      return trimmed.length > 0 ? { ...base, insight: trimmed } : base;
    })
    .catch(() => base);
}
