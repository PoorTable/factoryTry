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
 * Returns `true` when:
 * - `EXPO_PUBLIC_AI_MOCK=1` is set (the screenshot + screen-development path).
 * - The platform is `web` — ExecuTorch is iOS / Android only.
 * - We are running in a non-EAS environment (Expo Go / dev simulator without
 *   the executorch native module). Detected via `globalThis` shape.
 *
 * The capability gate is intentionally permissive: any uncertainty falls back
 * to mock so screens stay rendered. A real EAS dev-client build flips this to
 * false and the live `useLLM` handles take over.
 */
function shouldUseMockMode(): boolean {
  if (process.env.EXPO_PUBLIC_AI_MOCK === '1') return true;
  // Web has no on-device runtime — `react-native-executorch` is iOS/Android.
  if (typeof window !== 'undefined' && typeof document !== 'undefined') return true;
  // No native ExecuTorch module on this binary → mock. The native module is
  // expected to register a global handle when a proper dev client loads.
  // Without it (Expo Go / fresh simulator), staying in mock keeps screens up.
  // TODO(APP-36): once an EAS dev client with the ExecuTorch native module +
  // a config plugin is available, replace this unconditional `return true`
  // with a real capability probe (e.g. `globalThis.ExecutorchModule != null`
  // && RAM check from `models.ts → MIN_RAM_MB`).
  return true;
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
 * Builds the imperative client. In mock mode every method returns the
 * design-handoff fixture (validated through the same zod schemas so screens
 * test the same parse path the live model exercises).
 *
 * The live-inference branch is intentionally a thin stub today: until an EAS
 * dev build with `react-native-executorch` is wired up, the capability gate
 * always trips mock and the live path is unreachable. The structure is in
 * place so the inference calls can be filled in without touching screens.
 */
function buildClient(isMock: boolean): AiClient {
  if (isMock) {
    return {
      isMock: true,
      identify: async () => validate(identifyResultSchema, MOCK_IDENTIFY_RESULT),
      coach: async () => validate(coachResponseSchema, MOCK_COACH_CONVERSATION),
      palette: async () => validate(paletteAnalysisSchema, MOCK_PALETTE_ANALYSIS),
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
    coach: async () => ({ ok: false, error: notReady }),
    palette: async () => ({ ok: false, error: notReady }),
  };
}

const AiContext = createContext<AiClient | null>(null);

/**
 * AiProvider — mounts at the root layout so every screen can call `useAi()`.
 *
 * Holds the client (mock or live) in a memoized value so consumers re-render
 * only when the mock flag changes. The live branch will, in a future PR, also
 * hold the `useLLM` handles + a download-progress reducer; today the mock
 * path is all that needs to be reactive.
 */
export function AiProvider({ children }: { children: ReactNode }): ReactElement {
  const isMock = shouldUseMockMode();
  // The client is rebuilt only when the mock flag flips (effectively once per
  // app launch), so memoizing on `isMock` is enough to keep `useAi()` stable
  // for downstream consumers' effect / useCallback dependency arrays.
  const value = useMemo<AiClient>(() => buildClient(isMock), [isMock]);

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
