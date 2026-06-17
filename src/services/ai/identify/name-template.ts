/**
 * Name templating (APP-29).
 *
 * Pure function — given a `Category` plus a palette label / dominant color
 * descriptor, produce a short boutique-editorial item name like
 * "Linen camp shirt" or "Wool trench".
 *
 * The template is intentionally simple: each category maps to a noun (the
 * garment type) plus an optional material/cut adjective that varies with the
 * dominant color/palette label. The name is what pre-fills the camera
 * confirm panel — the user can always edit it — so we err on the side of
 * descriptive over clever.
 *
 * The output is constrained:
 *  - Always non-empty (`identifyResultSchema.name.min(1)`).
 *  - Always a different noun per category (so the unit test in
 *    `name-template.test.ts` can assert "different categories produce
 *    different name shapes" per GATE-5).
 */

import type { Category } from '@/types/wardrobe';

/**
 * Per-category noun set. The first entry is the default; later entries are
 * picked by a hash of the palette label so different palettes nudge the noun
 * (e.g. "Linen camp shirt" vs "Cashmere mock" — both Tops).
 */
const CATEGORY_NOUNS: Record<Category, readonly string[]> = {
  Tops: ['camp shirt', 'mock', 'tee', 'blouse', 'crewneck'],
  Bottoms: ['trouser', 'jean', 'short', 'skirt', 'chino'],
  Outerwear: ['trench', 'jacket', 'coat', 'overshirt', 'parka'],
  Shoes: ['loafer', 'sneaker', 'boot', 'sandal', 'mule'],
  Accessories: ['scarf', 'belt', 'cap', 'tote', 'sunglass'],
};

/**
 * Adjective table keyed by canonical palette-label words. Falls back to a
 * generic adjective when no canonical word is present, so the template never
 * produces a stuttered "warm warm shirt".
 */
const PALETTE_ADJECTIVE: Record<string, string> = {
  neutral: 'linen',
  warm: 'linen',
  earth: 'suede',
  cool: 'cotton',
  blue: 'cotton',
  cream: 'silk',
  ivory: 'silk',
  cognac: 'leather',
  mustard: 'cotton',
  terracotta: 'linen',
  slate: 'wool',
  sage: 'cotton',
  forest: 'corduroy',
  plum: 'velvet',
  charcoal: 'wool',
  black: 'wool',
  burgundy: 'wool',
  navy: 'wool',
};

/** Cheap, deterministic, stable string → small-int hash. */
function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h;
}

/**
 * Capitalize the first letter of a phrase. "linen camp shirt" → "Linen camp shirt".
 */
function capitalize(phrase: string): string {
  if (phrase.length === 0) return phrase;
  return phrase[0].toUpperCase() + phrase.slice(1);
}

/**
 * Pick the material/cut adjective implied by the palette label. Iterates the
 * label's words and returns the first match in `PALETTE_ADJECTIVE`; falls
 * back to "linen" (matches the canonical "Linen camp shirt" fixture).
 */
function adjectiveForPalette(paletteLabel: string): string {
  const words = paletteLabel.toLowerCase().split(/\s+/);
  for (const w of words) {
    if (PALETTE_ADJECTIVE[w]) return PALETTE_ADJECTIVE[w];
  }
  return 'linen';
}

/**
 * Template a garment name from category + palette label.
 *
 * - Pulls the per-category noun set; picks one deterministically based on a
 *   hash of the palette label so different palettes vary the noun.
 * - Pairs the noun with a material adjective derived from the palette label.
 * - Returns "Adjective noun" capitalized (e.g. "Linen camp shirt").
 *
 * Always returns a non-empty string ≥ 3 chars. Different categories produce
 * different nouns by construction (each category's set is disjoint above).
 */
export function templateName(category: Category, paletteLabel: string): string {
  const nouns = CATEGORY_NOUNS[category];
  const idx = hashString(paletteLabel.toLowerCase()) % nouns.length;
  const noun = nouns[idx];
  const adjective = adjectiveForPalette(paletteLabel);
  return capitalize(`${adjective} ${noun}`);
}
