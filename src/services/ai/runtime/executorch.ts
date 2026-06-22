/**
 * ExecuTorch native runtime bootstrap + capability probe (APP-40).
 *
 * This is the native-enablement layer the unmock chain (APP-37/APP-41/APP-42)
 * silently assumed already existed. It does two things, both fail-closed:
 *
 * 1. `initAiRuntime()` — called once at the app entry (`src/app/_layout.tsx`).
 *    Per the upstream Expo docs, an Expo app must wire the resource fetcher:
 *    `initExecutorch({ resourceFetcher: ExpoResourceFetcher })`. We do that
 *    inside a guarded `require` + try/catch so that a binary WITHOUT the
 *    ExecuTorch native module linked (Expo Go, web, a bundle where the module
 *    failed to register) does not crash — it records the failure and reports
 *    the runtime as unavailable.
 *
 * 2. `isExecutorchAvailable()` — the real capability probe. The truth source is
 *    `react-native-executorch`'s own published `isAvailable` boolean ("Whether
 *    the native ExecuTorch runtime is available on this device. Returns `false`
 *    when native libraries cannot be loaded"). Combined with "did init succeed",
 *    this is what `client.ts` branches on to decide live-vs-unavailable.
 *
 * FAIL-CLOSED CONTRACT (APP-40 AC): when the native module is absent we surface
 * `available: false` — callers must then return a `model-unavailable` error.
 * We NEVER silently substitute mock fixtures here. Mock mode is a separate,
 * explicit decision driven only by `EXPO_PUBLIC_AI_MOCK=1` in `client.ts`.
 *
 * `react-native-executorch` is loaded via `require` rather than a static import
 * on purpose: it is the first and only JS entry point into the native package,
 * and a static top-level import would make module evaluation itself a failure
 * surface on platforms that cannot resolve/evaluate the native module. The
 * guarded require keeps every failure path inside the try/catch below.
 */

import { Platform } from 'react-native';

/** Snapshot for the on-device diagnostics readout (APP-40 AC #4). */
export interface ExecutorchDiagnostics {
  /** Live runtime usable: native module linked AND init succeeded. */
  available: boolean;
  /** Native ExecuTorch module reports itself linked (RNE `isAvailable`). */
  nativeModuleLinked: boolean;
  /** `initExecutorch` ran without throwing. */
  initialized: boolean;
  /** Running platform (`ios` / `android` / `web`). */
  platform: typeof Platform.OS;
  /** Installed `react-native-executorch` package version, or null if absent. */
  runtimeVersion: string | null;
  /** Human-readable reason the runtime is unavailable, or null when available. */
  error: string | null;
}

let initialized = false;
let initError: string | null = null;
let initRan = false;

/**
 * Reads `isAvailable` from the native package. Wrapped so a resolution/eval
 * failure (web, Expo Go) is treated as "not linked" rather than throwing.
 */
function readNativeAvailable(): boolean {
  if (Platform.OS === 'web') return false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const rne = require('react-native-executorch') as { isAvailable?: boolean };
    return rne.isAvailable === true;
  } catch {
    return false;
  }
}

/** Reads the installed RNE package version for the diagnostics readout. */
function readRuntimeVersion(): string | null {
  try {
    const pkg = require('react-native-executorch/package.json') as { version?: string };
    return pkg.version ?? null;
  } catch {
    return null;
  }
}

/**
 * Initializes the ExecuTorch resource fetcher at the app entry. Idempotent —
 * safe to call again on a fast-refresh remount. Returns a diagnostics snapshot
 * so the caller can log the outcome at startup.
 */
export function initAiRuntime(): ExecutorchDiagnostics {
  if (initRan) return getExecutorchDiagnostics();
  initRan = true;

  if (Platform.OS === 'web') {
    initError = 'ExecuTorch native runtime is not available on web.';
    return getExecutorchDiagnostics();
  }

  if (!readNativeAvailable()) {
    initError =
      'ExecuTorch native module is not linked in this binary (Expo Go, or a build without the native module). Run a custom dev client.';
    return getExecutorchDiagnostics();
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { initExecutorch } = require('react-native-executorch') as {
      initExecutorch: (config: { resourceFetcher: unknown }) => void;
    };
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ExpoResourceFetcher } = require('react-native-executorch-expo-resource-fetcher') as {
      ExpoResourceFetcher: unknown;
    };
    initExecutorch({ resourceFetcher: ExpoResourceFetcher });
    initialized = true;
    initError = null;
  } catch (e) {
    initialized = false;
    initError =
      e instanceof Error ? e.message : 'Failed to initialize the ExecuTorch runtime.';
  }

  return getExecutorchDiagnostics();
}

/**
 * The capability gate. `true` only when the native module is linked AND
 * `initExecutorch` completed. Any uncertainty resolves to `false` — callers
 * MUST surface `model-unavailable` rather than fall back to mock.
 */
export function isExecutorchAvailable(): boolean {
  return Platform.OS !== 'web' && initialized && readNativeAvailable();
}

/** Full diagnostics snapshot for the on-device readout screen. */
export function getExecutorchDiagnostics(): ExecutorchDiagnostics {
  const nativeModuleLinked = readNativeAvailable();
  return {
    available: Platform.OS !== 'web' && initialized && nativeModuleLinked,
    nativeModuleLinked,
    initialized,
    platform: Platform.OS,
    runtimeVersion: readRuntimeVersion(),
    error: initError,
  };
}
