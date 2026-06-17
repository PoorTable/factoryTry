/**
 * Thin LLM wrapper for the coach pipeline (APP-30).
 *
 * Bridges the deterministic coach pipeline (`./index.ts`) to the on-device
 * runtime hooked up by APP-35 (`react-native-executorch`'s `useLLM`). Lives
 * in its own file for the same reason `./identify/clip.ts` does: the runtime
 * is iOS/Android-only and would crash under `node --experimental-strip-types`,
 * so every other module in this folder stays purely test-runnable.
 *
 * The runtime handle is typed loosely (rather than importing
 * `react-native-executorch` directly) so this file remains importable in any
 * environment. APP-35 publishes the handle on `globalThis.__aiLlmRuntime`;
 * `client.ts` reads it and passes it down.
 */

import type { CoachTurn } from '../schemas';

/**
 * Loose runtime shape — mirrors what `useLLM` exposes at runtime. We only
 * need a single async generate call returning a string. The runtime layer is
 * free to enforce a timeout, max-tokens cap, or anything else internally.
 */
export interface LlmRuntime {
  /**
   * Generate a single response. The runtime is expected to handle templating
   * (chat formatting, BOS/EOS tokens) internally so this layer stays simple.
   *
   * @param system  The Iris persona prompt (see `./persona.ts`).
   * @param turns   The windowed conversation history (see `./window.ts`).
   * @returns       The model's reply text (trimmed).
   */
  generate: (system: string, turns: readonly CoachTurn[]) => Promise<string>;
}

/**
 * Default reply when the runtime returns an empty string. Keeps the chat
 * surface graceful (the caller can still ship a `text` bubble) instead of
 * surfacing the empty-string as a parse error to the screen.
 */
const FALLBACK_REPLY =
  'Give me a beat — I want to make sure I have the right pieces in mind.';

/**
 * Drive the on-device LLM for one coach turn.
 *
 * Returns the model's reply text (trimmed). On empty/whitespace output we
 * substitute a short Iris-voice fallback so the chat never renders an empty
 * bubble. Any thrown error propagates — the caller (`./index.ts`) turns it
 * into an `inference` error in `client.ts`.
 */
export async function generateIrisReply(
  runtime: LlmRuntime,
  system: string,
  turns: readonly CoachTurn[],
): Promise<string> {
  const raw = await runtime.generate(system, turns);
  const trimmed = typeof raw === 'string' ? raw.trim() : '';
  return trimmed.length > 0 ? trimmed : FALLBACK_REPLY;
}
