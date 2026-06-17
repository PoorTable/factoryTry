/**
 * Coach intent classifier (APP-30).
 *
 * Pure, deterministic, regex-first. Given the user's latest turn, picks one of
 * three reply kinds the chat screen knows how to render:
 *
 *   - `outfit`  — the user is asking for an outfit / look / what to wear.
 *   - `palette` — the user is asking about colors that work together.
 *   - `text`   — everything else (advice, conversation, follow-ups).
 *
 * Why regex-first (not LLM-driven): small on-device models are unreliable at
 * routing structured intents. Routing locally guarantees the deterministic
 * outfit/palette engines (APP-31 / APP-32) are invoked when — and only when —
 * the user explicitly asks for them. The LLM is left to write prose only.
 *
 * Test-runnability: this module is pure TypeScript with no runtime imports,
 * so it runs cleanly under `node --experimental-strip-types --test` (see
 * `intent.test.ts`).
 */

export type CoachIntent = 'text' | 'outfit' | 'palette';

/**
 * Phrases that mark an explicit outfit / look request. Each pattern is a
 * lowercase substring; matching is done after `toLowerCase()`. Patterns are
 * kept conservative — they target verbs and nouns a user is unlikely to use
 * unless they really want a look proposed.
 */
const OUTFIT_PATTERNS: readonly RegExp[] = [
  /\bwhat (should|do) i wear\b/,
  /\bwhat to wear\b/,
  /\bdress me\b/,
  /\bbuild me (an? )?(look|outfit)\b/,
  /\b(suggest|propose|put together|throw together).*\b(an? )?(outfit|look|fit)\b/,
  /\bstyle me\b/,
  /\bfit check\b/,
  /\bsurprise me\b/,
];

/**
 * Phrases that mark an explicit palette / color request. As above, conservative
 * patterns keyed to clear color-question language so a stray mention of "blue"
 * inside a normal sentence does not trigger the palette engine.
 */
const PALETTE_PATTERNS: readonly RegExp[] = [
  /\bpalettes?\b/,
  /\b(what|which|good) colou?rs?\b/,
  /\bcolou?rs? (work|go|pair|match|clash)\b/,
  /\bcolou?r combo\b/,
  /\bcolou?r combinations?\b/,
  /\bcolou?r story\b/,
  /\bswatches?\b/,
  /\b(go|goes) with (this|that|these|those)\b/,
  /\bwhat (matches|pairs)\b/,
];

/**
 * Classify the user's latest turn into one of three intents.
 *
 * - Empty / whitespace-only input → `text` (Iris just answers conversationally).
 * - Palette patterns are checked before outfit patterns so questions like
 *   "what colors go with this outfit?" route to `palette`, not `outfit`.
 * - Otherwise → `text`.
 *
 * Deterministic: same input → same output, no side effects.
 */
export function classifyIntent(userText: string): CoachIntent {
  if (typeof userText !== 'string') return 'text';
  const t = userText.toLowerCase().trim();
  if (t.length === 0) return 'text';

  for (const p of PALETTE_PATTERNS) {
    if (p.test(t)) return 'palette';
  }
  for (const p of OUTFIT_PATTERNS) {
    if (p.test(t)) return 'outfit';
  }
  return 'text';
}
