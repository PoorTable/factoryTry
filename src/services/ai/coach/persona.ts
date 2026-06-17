/**
 * Iris persona system prompt builder (APP-30).
 *
 * Returns the compact system prompt the on-device LLM (default Llama 3.2 1B
 * via react-native-executorch) receives at the head of every coach turn.
 *
 * The prompt is intentionally short — small models burn precious context
 * tokens on long instructions and start forgetting them past ~500 tokens.
 * We pack only what the model genuinely needs:
 *
 *   1. Persona — warm, editorial, concise; never invent items.
 *   2. Wardrobe summary — id, name, category, swatches, wornCount per item.
 *      Outfits and the user's style profile are included in compact form.
 *   3. Windowing reminder — the model only sees the last ~20 turns, so it
 *      should not reference content that may have aged out.
 *
 * Outfit + palette JSON is NOT requested from the model: those bubbles are
 * assembled by the deterministic engines (APP-31 / APP-32). The model is
 * scoped to prose so it stays inside the envelope small LLMs handle well.
 *
 * Pure module — no runtime, no React. Test-runnable under
 * `node --experimental-strip-types --test`.
 */

import type { CoachRequest } from '../schemas';

/**
 * Format a single item summary as one line: `id | name | category | swatches | worn=N`.
 * Compact form keeps a ~50-item wardrobe under ~1.5k tokens.
 */
function formatItemLine(it: CoachRequest['wardrobe']['items'][number]): string {
  const sw = it.swatches.length > 0 ? it.swatches.join(',') : '—';
  return `${it.id} | ${it.name} | ${it.category} | ${sw} | worn=${it.wornCount}`;
}

/**
 * Format a saved outfit as `name (vibe=N) → id1,id2,id3` for the prompt.
 */
function formatOutfitLine(o: CoachRequest['wardrobe']['outfits'][number]): string {
  return `${o.name} (vibe=${o.vibe}) → ${o.itemIds.join(',')}`;
}

/**
 * Build the Iris system prompt. Accepts the same `wardrobe` shape the wire
 * contract uses (`CoachRequest['wardrobe']`) so the live `client.ts` path can
 * pass its request through unchanged.
 *
 * Always returns a non-empty string; degenerate inputs (no items, no outfits)
 * still produce a valid prompt that explicitly tells the model the closet is
 * empty so it can respond appropriately instead of hallucinating.
 */
export function buildIrisSystemPrompt(wardrobe: CoachRequest['wardrobe']): string {
  const { items, outfits, profile } = wardrobe;

  const persona = [
    'You are Iris, a warm, editorial style coach.',
    'Be concise — two short sentences at most per reply unless asked to elaborate.',
    'Never invent items. Only reference garments by name from the wardrobe below.',
    'Speak in second person ("you", "your closet"). Avoid generic fashion advice.',
  ].join(' ');

  const profileLine =
    `Style profile: ${profile.paletteName} — ${profile.tagline}.`;

  const itemsBlock =
    items.length === 0
      ? 'Wardrobe: (empty — gently tell the user to add a piece first.)'
      : `Wardrobe (${items.length} items):\n${items.map(formatItemLine).join('\n')}`;

  const outfitsBlock =
    outfits.length === 0
      ? 'Saved outfits: (none yet.)'
      : `Saved outfits (${outfits.length}):\n${outfits.map(formatOutfitLine).join('\n')}`;

  const windowing =
    'You only see the last ~20 conversation turns. Do not reference content that may have scrolled out of view.';

  return [persona, profileLine, itemsBlock, outfitsBlock, windowing].join('\n\n');
}
