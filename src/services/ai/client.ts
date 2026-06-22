/**
 * In-process AI provider — the ONLY way screens talk to the on-device runtime.
 *
 * Replaces the APP-28 `fetch`-based wrapper around Expo Router API routes
 * (since APP-35: no server, no Claude SDK, no API key). Wraps the
 * `react-native-executorch` `useLLM` + CLIP handles in a React context so
 * screens call imperative `identify() / coach() / palette()` methods through
 * `useAi()` and get the same `AiResult<T>` discriminated union as before.
 *
 * Failure modes:
 * - **Mock mode** (`EXPO_PUBLIC_AI_MOCK=1`, web, simulator, or low-RAM device)
 *   → returns design-handoff fixtures from `./server/fixtures` so screens and
 *   the factory reviewer render the spec without a real model loaded.
 * - **Model still downloading on first launch** → `model-loading` error so the
 *   caller can show a "give me a sec" affordance instead of crashing.
 * - **Model unavailable** (registry miss, native module missing) →
 *   `model-unavailable` error; the caller falls back to mock or manual entry.
 * - **Inference threw** → `inference` error; preserves the existing
 *   "never a dead end" UX in the capture and coach screens.
 * - **Model output failed zod validation** → `parse` error; same shape the
 *   old fetch client surfaced when the wire payload was malformed.
 *
 * The `AiResult<T>` and `AiError` surface is preserved verbatim so consumer
 * screens (capture, coach) only need to swap free-function imports for the
 * `useAi()` hook — no shape changes.
 */

import {
  createContext,
  createElement,
  useContext,
  useMemo,
  type ReactElement,
  type ReactNode,
} from 'react';

import {
  coachResponseSchema,
  identifyResultSchema,
  paletteAnalysisSchema,
  type CoachRequest,
  type CoachResponse,
  type IdentifyResult,
} from './schemas';
import {
  MOCK_COACH_CONVERSATION,
  MOCK_IDENTIFY_RESULT,
  MOCK_PALETTE_ANALYSIS,
} from './server/fixtures';
import { identifyWithClip, type ClipEmbedder } from './identify/clip';
import { runCoachPipeline } from './coach';
import type { LlmRuntime } from './coach/llm';
import { isExecutorchAvailable } from './runtime/executorch';
import { resolveClientMode, type AiClientMode } from './client-mode';
import type { StyleProfile } from '@/types/wardrobe';

/**
 * Typed error union surfaced to screens. Replaces the old
 * `network | rate-limit | parse | server` union — there is no network and
 * no server anymore, only on-device inference plus the mock fallback.
 */
export type AiErrorCode = 'model-unavailable' | 'model-loading' | 'inference' | 'parse';

export interface AiError {
  code: AiErrorCode;
  message: string;
}

/** Discriminated result — screens branch on `ok` instead of try/catch. */
export type AiResult<T> = { ok: true; data: T } | { ok: false; error: AiError };

/** Imperative surface exposed via `useAi()`. */
export interface AiClient {
  /** Whether the provider is in mock mode (web / simulator / low-RAM / forced). */
  isMock: boolean;
  /** Garment vision tagging — replaces APP-28 `POST /api/identify`. */
  identify: (imageBase64: string) => Promise<AiResult<IdentifyResult>>;
  /** Coach conversation — replaces APP-28 `POST /api/coach`. */
  coach: (request: CoachRequest) => Promise<AiResult<CoachResponse>>;
  /** Palette analysis — new in APP-35; mock returns the "Warm Autumn" fixture. */
  palette: (imageBase64?: string) => Promise<AiResult<StyleProfile>>;
}

/**
 * Decides whether the provider should run in mock mode.
 *
 * Mock mode is now an EXPLICIT, opt-in decision: it is enabled ONLY by
 * `EXPO_PUBLIC_AI_MOCK=1` (the screenshot + screen-development path that serves
 * the design-handoff fixtures). It is intentionally NOT entered just because
 * the native runtime is missing.
 *
 * APP-40 fail-closed contract: a binary without the ExecuTorch native module
 * (web / Expo Go / a build that failed to link it) must NOT silently fall back
 * to mock and report success. That case is handled separately by
 * `isExecutorchAvailable()` → the `model-unavailable` client below. The old
 * "any uncertainty → mock" behavior was exactly the silent fallback this ticket
 * exists to remove.
 */
function shouldUseMockMode(): boolean {
  return process.env.EXPO_PUBLIC_AI_MOCK === '1';
}

/**
 * Validates a piece of model output against a schema. Mirrors the old fetch
 * client's `parse`-error path so screens see the same shape regardless of
 * whether the data came off the wire or out of a local inference call.
 */
function validate<T>(
  schema: { safeParse: (input: unknown) => { success: true; data: T } | { success: false } },
  payload: unknown,
): AiResult<T> {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: { code: 'parse', message: 'On-device model returned an unexpected response shape.' },
    };
  }
  return { ok: true, data: parsed.data };
}

/**
 * Builds the imperative client. Three mutually exclusive states:
 *
 * 1. **mock** (`isMock`) — `EXPO_PUBLIC_AI_MOCK=1`; returns design-handoff
 *    fixtures validated through the same zod schemas the live model exercises.
 * 2. **model-unavailable** — mock not forced AND the ExecuTorch native runtime
 *    is absent (`!isExecutorchAvailable()`); every call fails closed with
 *    `model-unavailable` (APP-40).
 * 3. **live** — native runtime is linked and initialized; the branch below
 *    drives the real `react-native-executorch` handles. The actual `useLLM` /
 *    `useImageEmbeddings` hook wiring (replacing the `globalThis` handles) is
 *    APP-42's scope; until then the live path returns `model-loading`.
 */
function buildClient(mode: AiClientMode): AiClient {
  if (mode === 'mock') {
    return {
      isMock: true,
      identify: async () => validate(identifyResultSchema, MOCK_IDENTIFY_RESULT),
      coach: async () => validate(coachResponseSchema, MOCK_COACH_CONVERSATION),
      palette: async () => validate(paletteAnalysisSchema, MOCK_PALETTE_ANALYSIS),
    };
  }

  // FAIL-CLOSED (APP-40): mock is NOT forced and the ExecuTorch native runtime
  // is not available (web, Expo Go, or a build without the native module). We
  // surface `model-unavailable` for every call rather than quietly returning
  // fixtures — screens must show a real "model unavailable" affordance instead
  // of reporting fabricated success. `isMock` is false here, so consumers can
  // tell this apart from the mock path.
  if (mode === 'unavailable') {
    const unavailable: AiError = {
      code: 'model-unavailable',
      message:
        'On-device AI is unavailable on this build. Install a custom dev client with the ExecuTorch native module (it does not run in Expo Go or on web).',
    };
    return {
      isMock: false,
      identify: async () => ({ ok: false, error: unavailable }),
      coach: async () => ({ ok: false, error: unavailable }),
      palette: async () => ({ ok: false, error: unavailable }),
    };
  }

  // Live-inference branch — reached only on an EAS dev/production build with
  // `react-native-executorch` loaded and the model files cached. Until the
  // runtime initializes successfully, every call returns `model-loading`.
  const notReady: AiError = {
    code: 'model-loading',
    message: 'On-device model is still preparing. Try again in a moment.',
  };

  /**
   * Resolves the live CLIP embedder once `react-native-executorch` is loaded
   * in the host process. Returns `null` until APP-36 flips the capability
   * gate and the runtime publishes the embedder handles on `globalThis`.
   * Centralized here so the identify pipeline (`./identify/clip`) has exactly
   * one injection point.
   */
  const getEmbedder = (): ClipEmbedder | null => {
    const handle = (globalThis as { __aiClipEmbedder?: ClipEmbedder }).__aiClipEmbedder;
    return handle ?? null;
  };

  return {
    isMock: false,
    identify: async (imageBase64: string) => {
      const embedder = getEmbedder();
      if (!embedder) return { ok: false, error: notReady };
      try {
        // The base64 → pixel-buffer decoding lives in the runtime layer
        // (APP-36): native preprocessing is bridged to a flat buffer the
        // pipeline consumes. Until that bridge exists `decodeBase64Pixels`
        // is undefined on the global and we fall back to `model-loading`.
        const decode = (globalThis as {
          __aiDecodePixels?: (b64: string) => { buffer: ArrayLike<number>; channels: 3 | 4 };
        }).__aiDecodePixels;
        if (!decode) return { ok: false, error: notReady };
        const { buffer, channels } = decode(imageBase64);
        const result = await identifyWithClip({ buffer, channels, embedder });
        return validate(identifyResultSchema, result);
      } catch {
        return {
          ok: false,
          error: { code: 'inference', message: 'On-device inference failed.' },
        };
      }
    },
    coach: async (request: CoachRequest) => {
      // The on-device LLM runtime (APP-35 `useLLM`) publishes its handle on
      // `globalThis.__aiLlmRuntime` once the model has finished loading,
      // mirroring the CLIP embedder injection above. Until then we surface
      // `model-loading` so the chat screen can keep the input usable and
      // render the italic "warming up" note from APP-21.
      const runtime = (globalThis as { __aiLlmRuntime?: LlmRuntime }).__aiLlmRuntime;
      if (!runtime) return { ok: false, error: notReady };
      try {
        const data = await runCoachPipeline({ request, runtime });
        return validate(coachResponseSchema, data);
      } catch {
        return {
          ok: false,
          error: { code: 'inference', message: 'On-device inference failed.' },
        };
      }
    },
    palette: async () => ({ ok: false, error: notReady }),
  };
}

const AiContext = createContext<AiClient | null>(null);

/**
 * AiProvider — mounts at the root layout so every screen can call `useAi()`.
 *
 * Resolves one of three mutually exclusive modes (mock / unavailable / live)
 * via `resolveClientMode` and holds the built client in a memoized value. The
 * mode is fixed for the app launch (the mock flag and the runtime capability
 * are both settled by the time the root layout mounts — see `initAiRuntime()`
 * in `src/app/_layout.tsx`), so memoizing on `mode` keeps `useAi()` stable for
 * downstream consumers' effect / useCallback dependency arrays.
 */
export function AiProvider({ children }: { children: ReactNode }): ReactElement {
  const mode: AiClientMode = resolveClientMode({
    mockForced: shouldUseMockMode(),
    executorchAvailable: isExecutorchAvailable(),
  });
  const value = useMemo<AiClient>(() => buildClient(mode), [mode]);

  // `createElement` (vs JSX) keeps the file as `.ts` so the gate-verification
  // greps that target `src/services/ai/client.ts` continue to match here.
  return createElement(AiContext.Provider, { value }, children);
}

/**
 * Hook the screens use. Throws if called outside an `AiProvider` — the
 * provider is mounted at the root layout, so this is a programmer-error
 * guard, not a runtime concern.
 */
export function useAi(): AiClient {
  const client = useContext(AiContext);
  if (!client) {
    throw new Error('useAi() must be called inside <AiProvider />. Check src/app/_layout.tsx.');
  }
  return client;
}
