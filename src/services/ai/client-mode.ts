/**
 * Pure resolution of which AI client the provider should build (APP-40).
 *
 * Kept free of any React / React Native import so the fail-closed decision can
 * be unit-tested under `node --test` without a native runtime.
 *
 * The three modes are mutually exclusive and ordered:
 *  1. `mock` — explicit opt-in via `EXPO_PUBLIC_AI_MOCK=1` only.
 *  2. `unavailable` — mock NOT forced and the ExecuTorch native runtime is
 *     absent. This is the fail-closed branch: callers must surface
 *     `model-unavailable`, never silently fall back to mock.
 *  3. `live` — the native runtime is linked and initialized.
 */
export type AiClientMode = 'mock' | 'unavailable' | 'live';

export function resolveClientMode(input: {
  /** Whether `EXPO_PUBLIC_AI_MOCK=1` forced mock mode. */
  mockForced: boolean;
  /** Whether the ExecuTorch native runtime is linked + initialized. */
  executorchAvailable: boolean;
}): AiClientMode {
  if (input.mockForced) return 'mock';
  if (!input.executorchAvailable) return 'unavailable';
  return 'live';
}
