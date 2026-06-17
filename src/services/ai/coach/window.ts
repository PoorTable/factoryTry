/**
 * Conversation windowing helper (APP-30).
 *
 * Small on-device LLMs have tight context budgets and the wire contract
 * (`coachRequestSchema.messages`) gives us an open-ended history. This helper
 * trims the history to the most recent N turns before it reaches the model.
 *
 * Rules:
 *   - Keeps order — the last N entries are returned in their original order.
 *   - Never breaks a user→ai pair at the boundary: if the oldest kept entry is
 *     an `ai` turn (orphaned reply with no user turn above it), we drop one
 *     extra so the window starts on a `user` turn or on a clean pair.
 *   - `max` ≤ 0 → empty array; `max` ≥ history.length → history unchanged.
 *
 * Pure module. Test-runnable under `node --experimental-strip-types --test`.
 */

import type { CoachTurn } from '../schemas';

/**
 * Window `turns` to at most `max` entries (default 20). See module docstring
 * for the orphan-`ai` rule. Returns a new array — `turns` is not mutated.
 */
export function windowTurns(turns: readonly CoachTurn[], max: number = 20): CoachTurn[] {
  if (!Array.isArray(turns) || turns.length === 0) return [];
  if (max <= 0) return [];
  if (turns.length <= max) return turns.slice();

  // Take the last `max`, then nudge the start forward if it is an orphaned
  // `ai` turn (no matching user above it) — this keeps the LLM from seeing a
  // reply that references context it cannot see.
  const start = Math.max(0, turns.length - max);
  let windowed = turns.slice(start);
  if (windowed.length > 0 && windowed[0].from === 'ai') {
    windowed = windowed.slice(1);
  }
  return windowed;
}
