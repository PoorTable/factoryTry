/**
 * Enum-pinned CLIP zero-shot label sets (APP-29).
 *
 * The category and season label arrays are derived FROM the canonical
 * `Category` and `Season` types in `@/types/wardrobe`. The `satisfies readonly
 * Category[]` / `satisfies readonly Season[]` annotations turn any future
 * change to those enums into a compile-time error here — preventing the silent
 * "enum drift" the task description explicitly warns about (where the model
 * could classify into a label that no longer matches the schema).
 *
 * The mood label set is curated (not enum-pinned) because there is no `Mood`
 * type in the wardrobe model; the task description lists "Casual", "Tailored",
 * "Sporty", "Evening", etc. as the curated vocabulary.
 *
 * All three sets feed the CLIP wrapper (`./clip.ts`): for each label, the
 * wrapper builds a templated text prompt ("a photo of a {label} garment"),
 * encodes it, then picks the argmax over cosine similarity with the image
 * embedding. The top-1 softmax margin doubles as the `confidence` field.
 *
 * Pure module — no React, no Expo, no `react-native-executorch` import — so
 * it is safe to use from unit tests under `node --experimental-strip-types`.
 */

import type { Category, Season } from '@/types/wardrobe';

/**
 * CLIP category labels — pinned to the five wardrobe enum values. A change to
 * `Category` in `src/types/wardrobe.ts` (e.g. adding "Headwear") forces this
 * file to fail typecheck until the new value is added here too.
 */
export const CATEGORY_LABELS = [
  'Tops',
  'Bottoms',
  'Outerwear',
  'Shoes',
  'Accessories',
] as const satisfies readonly Category[];

export type CategoryLabel = (typeof CATEGORY_LABELS)[number];

/**
 * CLIP season labels — pinned to the five wardrobe season values. Same
 * compile-time drift guard as `CATEGORY_LABELS`.
 */
export const SEASON_LABELS = [
  'all',
  'spring',
  'summer',
  'fall',
  'winter',
] as const satisfies readonly Season[];

export type SeasonLabel = (typeof SEASON_LABELS)[number];

/**
 * Curated mood labels for the camera flow's mood tag pill. The set mirrors
 * the task description ("Casual", "Tailored", "Sporty", "Evening", …) and the
 * "Casual" canonical fixture value in `MOCK_IDENTIFY_RESULT`.
 *
 * Not enum-pinned because there is no `Mood` type in the wardrobe model —
 * mood is a free-form display string on `IdentifyResult.mood` (the camera
 * screen just shows it in the pill).
 */
export const MOOD_LABELS = [
  'Casual',
  'Tailored',
  'Sporty',
  'Evening',
  'Streetwear',
  'Minimal',
  'Boho',
  'Romantic',
] as const;

export type MoodLabel = (typeof MOOD_LABELS)[number];

/**
 * Builds the CLIP text prompts for a label set. Templated as
 * "a photo of a {label} {kind}" so all three label sets share the same
 * embedding distribution — CLIP works better with full natural-language
 * prompts than bare nouns.
 */
export function buildPrompts(
  labels: readonly string[],
  kind: 'garment' | 'outfit' | 'season' | 'mood',
): string[] {
  return labels.map((label) => {
    switch (kind) {
      case 'season':
        return `a photo of a ${label} season garment`;
      case 'mood':
        return `a ${label.toLowerCase()} style garment`;
      case 'outfit':
        return `a photo of a ${label.toLowerCase()} outfit`;
      case 'garment':
      default:
        return `a photo of a ${label.toLowerCase()} garment`;
    }
  });
}
