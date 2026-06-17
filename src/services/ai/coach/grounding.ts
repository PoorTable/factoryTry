/**
 * Item-id grounding filter (APP-30).
 *
 * Last safety net before an outfit reply leaves the pipeline. Drops any
 * proposed item id that is not present in the caller's wardrobe payload —
 * the LLM cannot invent a garment that does not exist in the user's closet.
 *
 * Why a separate module: the on-device LLM is not the source of outfit
 * proposals (the deterministic engine `services/styling/suggest.ts` is), but
 * defense-in-depth matters — any future code path that lets the model touch
 * item ids must pass through this filter first.
 *
 * Pure module. Test-runnable under `node --experimental-strip-types --test`.
 */

import type { ItemSummary } from '../schemas';

/**
 * Return the subset of `proposed` ids that exist in `items`. Preserves the
 * input order, drops duplicates (first occurrence wins), and never throws.
 *
 * The caller (typically the coach pipeline) decides what to do with an empty
 * result — usually fall back to a plain `text` reply rather than emit an
 * outfit bubble pointing at nothing.
 */
export function groundItemIds(
  proposed: readonly string[],
  items: readonly ItemSummary[],
): string[] {
  if (!Array.isArray(proposed) || proposed.length === 0) return [];
  if (!Array.isArray(items) || items.length === 0) return [];
  const known = new Set<string>();
  for (const it of items) known.add(it.id);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of proposed) {
    if (typeof id !== 'string' || id.length === 0) continue;
    if (!known.has(id)) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}
