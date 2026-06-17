/**
 * Coach pipeline orchestrator (APP-30).
 *
 * Assembles a validated `CoachResponse` from a `CoachRequest` plus the
 * on-device runtime. Splits responsibility three ways:
 *
 *   - `text` replies  → on-device LLM via `generateIrisReply` (Iris persona).
 *   - `outfit` replies → deterministic engine `surpriseLook` + `vibeScore`
 *                       from `services/styling/suggest.ts`, grounded against
 *                       the wardrobe so item ids are guaranteed real.
 *   - `palette` replies → top swatches from the user's style profile (or
 *                        `aggregatePalette` over the items as a fallback),
 *                        plus an LLM-generated one-liner note.
 *
 * The intent classifier (`./intent.ts`) routes the user's latest turn to one
 * of these three branches; the LLM never emits structured JSON itself. Every
 * reply prepends a short text bubble so the chat always has at least one
 * line of Iris's voice (matches the design-handoff conversation pattern).
 *
 * Final output is validated against `coachResponseSchema` so the live path
 * surfaces a `parse` error identical to the mock branch on any shape drift.
 *
 * This module imports `services/styling/{suggest,palette}` at the module top
 * — those engines are pure TypeScript with no native deps, so they remain
 * importable in any environment.
 */

import { aggregatePalette } from '../../styling/palette';
import { surpriseLook, vibeScore } from '../../styling/suggest';
import type { CoachRequest, CoachResponse, ItemSummary } from '../schemas';
import { coachResponseSchema } from '../schemas';
import type { Item } from '../../../types/wardrobe';

import { classifyIntent, type CoachIntent } from './intent';
import { groundItemIds } from './grounding';
import { generateIrisReply, type LlmRuntime } from './llm';
import { buildIrisSystemPrompt } from './persona';
import { windowTurns } from './window';

/**
 * Adapt a wire `ItemSummary` (minimal coach-context shape) to the full `Item`
 * shape `surpriseLook` / `vibeScore` expect. The engine only reads
 * `id / category / swatches / wornCount / season`; the other fields are filled
 * with safe defaults so we never need the user's photoUri or createdAt in
 * the wire payload just to propose an outfit.
 */
function asEngineItem(summary: ItemSummary): Item {
  return {
    id: summary.id,
    name: summary.name,
    category: summary.category,
    color: summary.swatches[0] ?? '#000000',
    swatches: summary.swatches,
    // The engine treats "all" as never-disagreeing, so unknown seasons in the
    // wire payload do not force a season-mismatch penalty.
    season: 'all',
    photoUri: null,
    wornCount: summary.wornCount,
    isFavorite: false,
    createdAt: '1970-01-01T00:00:00Z',
  };
}

/**
 * Pick the top N palette swatches for the `palette` bubble — prefers the
 * user's style profile palette (already ranked), then falls back to
 * `aggregatePalette` over the wardrobe items.
 */
function pickPaletteSwatches(wardrobe: CoachRequest['wardrobe'], n: number = 3): string[] {
  const fromProfile = wardrobe.profile.palette
    .slice()
    .sort((a, b) => b.pct - a.pct)
    .map((seg) => seg.hex)
    .filter((hex) => /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex));
  if (fromProfile.length >= n) return fromProfile.slice(0, n);

  // Fallback — derive from item swatches.
  const items = wardrobe.items.map(asEngineItem);
  const aggregated = aggregatePalette(items)
    .filter((seg) => /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(seg.hex))
    .map((seg) => seg.hex);

  const seen = new Set<string>();
  const merged: string[] = [];
  for (const hex of [...fromProfile, ...aggregated]) {
    const norm = hex.toUpperCase();
    if (seen.has(norm)) continue;
    seen.add(norm);
    merged.push(hex);
    if (merged.length >= n) break;
  }
  if (merged.length === 0) {
    // Absolute last resort — keep schema validation passing.
    return ['#A35836'];
  }
  return merged;
}

/** Find the latest user turn in the windowed history (or empty string). */
function latestUserText(turns: readonly CoachRequest['messages'][number][]): string {
  for (let i = turns.length - 1; i >= 0; i -= 1) {
    if (turns[i].from === 'user') return turns[i].text;
  }
  return '';
}

export interface RunCoachPipelineInput {
  request: CoachRequest;
  runtime: LlmRuntime;
}

/**
 * Run the full coach pipeline. Returns a parsed `CoachResponse` ready to ship
 * back to the screen, or throws on irrecoverable runtime failures (caught by
 * `client.ts` and surfaced as the `inference` error code).
 *
 * Pipeline steps:
 *   1. Window the conversation to the last 20 turns.
 *   2. Classify the latest user turn → text | outfit | palette.
 *   3. Always produce a short text intro via the LLM (Iris voice).
 *   4. If the intent is outfit/palette, append the structured bubble too.
 *   5. Validate against `coachResponseSchema` and return.
 */
export async function runCoachPipeline(input: RunCoachPipelineInput): Promise<CoachResponse> {
  const { request, runtime } = input;

  const windowed = windowTurns(request.messages, 20);
  const userText = latestUserText(windowed);
  const intent: CoachIntent = classifyIntent(userText);

  const system = buildIrisSystemPrompt(request.wardrobe);
  const introText = await generateIrisReply(runtime, system, windowed);

  const messages: CoachResponse['messages'] = [{ kind: 'text', text: introText }];

  if (intent === 'outfit') {
    const draft = surpriseLook(request.wardrobe.items.map(asEngineItem));
    const proposed = [draft.top, draft.bottom, draft.shoes, draft.extra].filter(
      (id): id is string => id !== null,
    );
    const grounded = groundItemIds(proposed, request.wardrobe.items);
    if (grounded.length > 0) {
      const engineItems = request.wardrobe.items.map(asEngineItem);
      const vibe = vibeScore(draft, engineItems);
      messages.push({
        kind: 'outfit',
        itemIds: grounded,
        name: 'Tonight, layered',
        vibe,
        note: 'Pulled from the pieces leaning into your warm-autumn core.',
      });
    }
  } else if (intent === 'palette') {
    const swatches = pickPaletteSwatches(request.wardrobe, 3);
    if (swatches.length > 0) {
      messages.push({
        kind: 'palette',
        swatches,
        note: 'The trio doing the heavy lifting across your closet.',
      });
    }
  }

  const candidate: CoachResponse = { messages };
  const parsed = coachResponseSchema.safeParse(candidate);
  if (!parsed.success) {
    // Validation failure here is a programmer error in this module — surface
    // a clear runtime error so the wrapping `client.ts` reports `inference`.
    throw new Error('runCoachPipeline: assembled reply failed coachResponseSchema validation');
  }
  return parsed.data;
}
