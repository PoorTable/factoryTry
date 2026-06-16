/**
 * Local, on-device outfit-suggestion engine (APP-31, Layer 1).
 *
 * Pure module — no React, react-native, expo, or network access. Imports only
 * types from the wardrobe model. Lives behind the same `vibeScoreFor`
 * signature the store already exposes so screens stay untouched.
 *
 * Public surface:
 *   - suggestForSlot(slot, items, draft, seed?)  → ranked Item[] for the rail
 *   - vibeScore(draft, items)                    → 0..100 weighted blend
 *   - surpriseLook(items, seed?)                 → full 4-slot OutfitDraft
 *
 * Also exports two helpers used by the unit tests:
 *   - colorDistance(hexA, hexB)                  → 0..180 (degrees on hue circle)
 *   - paletteCohesion(swatches)                  → 0..1 cohesion score
 */

import type { Category, Item, OutfitDraft, Season } from '../../types/wardrobe';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Slot = 'top' | 'bottom' | 'shoes' | 'extra';

/** Slot → wardrobe categories. EXTRA = Outerwear OR Accessories. */
const SLOT_CATEGORIES: Record<Slot, Category[]> = {
  top: ['Tops'],
  bottom: ['Bottoms'],
  shoes: ['Shoes'],
  extra: ['Outerwear', 'Accessories'],
};

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

/** Wrap a hue difference onto the shorter arc of the hue circle (0..180). */
function hueArc(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/**
 * Distance between two hex colors on the hue circle (0..180 degrees).
 * Low-saturation colors (neutrals like cream, ink, beige) are treated as
 * inherently cohesive — they return 0 against any other color, because
 * neutrals do not clash on the hue axis.
 */
export function colorDistance(hexA: string, hexB: string): number {
  const a = rgbToHsl(...hexToRgb(hexA));
  const b = rgbToHsl(...hexToRgb(hexB));
  // Neutrals contribute no hue conflict.
  if (a.s < 0.15 || b.s < 0.15) return 0;
  return hueArc(a.h, b.h);
}

/**
 * Palette cohesion across a swatch set: `1 - maxPairwiseHueDistance / 180`,
 * clamped to 0..1. A single swatch (or none) returns 1 — nothing to clash
 * with.
 */
export function paletteCohesion(swatches: string[]): number {
  if (swatches.length < 2) return 1;
  let maxDist = 0;
  for (let i = 0; i < swatches.length; i += 1) {
    for (let j = i + 1; j < swatches.length; j += 1) {
      const d = colorDistance(swatches[i], swatches[j]);
      if (d > maxDist) maxDist = d;
    }
  }
  const cohesion = 1 - maxDist / 180;
  return cohesion < 0 ? 0 : cohesion > 1 ? 1 : cohesion;
}

// ---------------------------------------------------------------------------
// Draft introspection (mirrors store helpers, kept local so this module
// stays free of store imports)
// ---------------------------------------------------------------------------

function draftItemIds(draft: OutfitDraft): string[] {
  return [draft.top, draft.bottom, draft.shoes, draft.extra].filter(
    (id): id is string => id !== null
  );
}

function draftItems(draft: OutfitDraft, items: Item[]): Item[] {
  const byId = new Map(items.map((it) => [it.id, it]));
  const out: Item[] = [];
  for (const id of draftItemIds(draft)) {
    const it = byId.get(id);
    if (it) out.push(it);
  }
  return out;
}

function collectSwatches(itemsInDraft: Item[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const it of itemsInDraft) {
    for (const hex of it.swatches) {
      if (!seen.has(hex)) {
        seen.add(hex);
        out.push(hex);
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Season agreement
// ---------------------------------------------------------------------------

/** Modal non-"all" season among draft items, or null if none. */
function modalSeason(itemsInDraft: Item[]): Season | null {
  const counts = new Map<Season, number>();
  for (const it of itemsInDraft) {
    if (it.season === 'all') continue;
    counts.set(it.season, (counts.get(it.season) ?? 0) + 1);
  }
  let best: Season | null = null;
  let bestCount = 0;
  for (const [season, count] of counts) {
    if (count > bestCount) {
      best = season;
      bestCount = count;
    }
  }
  return best;
}

function seasonAgreement(itemsInDraft: Item[]): number {
  if (itemsInDraft.length === 0) return 0;
  const modal = modalSeason(itemsInDraft);
  if (modal === null) return 1; // all items are season 'all'
  let agree = 0;
  for (const it of itemsInDraft) {
    if (it.season === 'all' || it.season === modal) agree += 1;
  }
  return agree / itemsInDraft.length;
}

// ---------------------------------------------------------------------------
// Ranking
// ---------------------------------------------------------------------------

/** Tiny deterministic hash: stable jitter from (seed, itemId) for tie-breaks. */
function seedJitter(seed: number, id: string): number {
  let h = seed * 2654435761;
  for (let i = 0; i < id.length; i += 1) {
    h = (h ^ id.charCodeAt(i)) * 16777619;
  }
  // Map to 0..1
  return ((h >>> 0) % 1000) / 1000;
}

function harmonyAgainst(item: Item, targetSwatches: string[]): number {
  if (targetSwatches.length === 0 || item.swatches.length === 0) return 0.7;
  let sumMin = 0;
  for (const candidate of item.swatches) {
    let min = 180;
    for (const target of targetSwatches) {
      const d = colorDistance(candidate, target);
      if (d < min) min = d;
    }
    sumMin += min;
  }
  const avg = sumMin / item.swatches.length;
  return 1 - avg / 180;
}

function seasonScore(item: Item, modal: Season | null): number {
  if (item.season === 'all') return 1;
  if (modal === null || item.season === modal) return 1;
  return 0.6;
}

function freshnessScore(item: Item): number {
  return 1 / (1 + Math.log(1 + item.wornCount));
}

function scoreCandidate(
  item: Item,
  targetSwatches: string[],
  modal: Season | null,
  seed: number
): number {
  const harmony = harmonyAgainst(item, targetSwatches);
  const season = seasonScore(item, modal);
  const fresh = freshnessScore(item);
  const base = 0.55 * harmony + 0.25 * season + 0.20 * fresh;
  // Tiny jitter for tie-breaks; deterministic given (seed, id).
  return base + (seed === 0 ? 0 : seedJitter(seed, item.id) * 0.05 - 0.025);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Ranked candidate items for the given slot.
 *
 * - Filters by the slot→category mapping
 * - Excludes already-slotted items in the current draft
 * - Ranks by (color harmony to draft swatches) + (season match) + (freshness)
 * - Same `(slot, items, draft, seed)` arguments → same output order
 *   (determinism is enforced by tests).
 */
export function suggestForSlot(slot: Slot, items: Item[], draft: OutfitDraft, seed: number = 0): Item[] {
  const allowed = new Set<Category>(SLOT_CATEGORIES[slot]);
  const slotted = new Set(draftItemIds(draft));
  const candidates = items.filter(
    (it) => allowed.has(it.category) && !slotted.has(it.id)
  );

  const inDraft = draftItems(draft, items);
  const targetSwatches = collectSwatches(inDraft);
  const modal = modalSeason(inDraft);

  // Stable sort: score desc, then id asc for determinism on equal scores.
  return candidates
    .map((item) => ({ item, score: scoreCandidate(item, targetSwatches, modal, seed) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.item.id < b.item.id ? -1 : a.item.id > b.item.id ? 1 : 0;
    })
    .map((entry) => entry.item);
}

/**
 * Weighted-blend vibe score, 0..100.
 *   completeness  (0.50) — filledSlots / 4
 *   paletteCohesion (0.30) — 1 - maxPairwiseHueDistance / 180 across all
 *                            draft swatches (neutrals are treated as
 *                            cohesive — they don't clash on the hue axis)
 *   seasonAgreement (0.20) — share of items whose season matches the modal
 *                            non-"all" season (or 1 if everything is "all")
 *
 * Empty draft returns exactly 0.
 */
export function vibeScore(draft: OutfitDraft, items: Item[]): number {
  const inDraft = draftItems(draft, items);
  if (inDraft.length === 0) return 0;
  const completeness = inDraft.length / 4;
  const swatches = collectSwatches(inDraft);
  const cohesion = paletteCohesion(swatches);
  const season = seasonAgreement(inDraft);
  return Math.round(100 * (0.50 * completeness + 0.30 * cohesion + 0.20 * season));
}

/**
 * Build a full 4-slot OutfitDraft by greedily picking the top-ranked
 * candidate for each slot in turn (top → bottom → shoes → extra). Items
 * already picked into earlier slots are excluded from later ones, so a
 * "Surprise me" look never duplicates the same item across slots.
 *
 * Deterministic for a given (items, seed). If a slot has no candidates the
 * slot stays null.
 */
export function surpriseLook(items: Item[], seed: number = 0): OutfitDraft {
  const order: Slot[] = ['top', 'bottom', 'shoes', 'extra'];
  let draft: OutfitDraft = { top: null, bottom: null, shoes: null, extra: null };
  for (const slot of order) {
    const ranked = suggestForSlot(slot, items, draft, seed);
    if (ranked.length > 0) {
      draft = { ...draft, [slot]: ranked[0].id };
    }
  }
  return draft;
}
