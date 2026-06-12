/**
 * Typed AI client — the ONLY way screens talk to the AI API routes.
 *
 * Thin `fetch` wrapper with:
 * - zod-validated responses (malformed payloads become a typed `parse`
 *   error instead of crashing screens),
 * - a per-request timeout via AbortController (15s default, 8s for identify),
 * - a typed error union: `network | rate-limit | parse | server`.
 *
 * Never imports the Anthropic SDK and never sees the server-side API key —
 * all Claude access happens server-side in `src/app/api/*+api.ts`.
 */

import Constants from 'expo-constants';
import { z } from 'zod';

import {
  chatReplySchema,
  coachResponseSchema,
  identifyResultSchema,
  type ChatReply,
  type CoachRequest,
  type CoachResponse,
  type IdentifyResult,
} from './schemas';

/** Typed error union surfaced to screens. */
export type AiErrorCode = 'network' | 'rate-limit' | 'parse' | 'server';

export interface AiError {
  code: AiErrorCode;
  message: string;
}

/** Discriminated result — screens branch on `ok` instead of try/catch. */
export type AiResult<T> = { ok: true; data: T } | { ok: false; error: AiError };

/** Default per-request timeout (15s), enforced with an AbortController. */
const REQUEST_TIMEOUT_MS = 15_000;

/**
 * Identify-specific timeout (8s) — the camera flow shows the frozen-frame
 * state until the response lands; past 8s APP-19 falls back to manual entry,
 * so the request must resolve (to a typed error) by then.
 */
const IDENTIFY_TIMEOUT_MS = 8_000;

/**
 * Origin of the API routes. On a physical device the Metro server is not
 * `localhost`, so `EXPO_PUBLIC_API_URL` wins; in dev we fall back to the
 * Metro host (`hostUri`), and on web to a relative path (same origin).
 */
function apiOrigin(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL;
  if (configured) return configured.replace(/\/$/, '');

  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) return `http://${hostUri}`;

  return '';
}

async function postJson<T>(
  path: string,
  body: unknown,
  schema: z.ZodType<T>,
  timeoutMs: number = REQUEST_TIMEOUT_MS,
): Promise<AiResult<T>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${apiOrigin()}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (cause) {
    const aborted = cause instanceof Error && cause.name === 'AbortError';
    return {
      ok: false,
      error: {
        code: 'network',
        message: aborted
          ? `Request timed out after ${timeoutMs / 1000}s.`
          : 'Could not reach the AI service. Check your connection and EXPO_PUBLIC_API_URL.',
      },
    };
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 429) {
    return {
      ok: false,
      error: { code: 'rate-limit', message: 'The AI service is rate limited. Try again shortly.' },
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      error: { code: 'server', message: `AI service responded with HTTP ${response.status}.` },
    };
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return {
      ok: false,
      error: { code: 'parse', message: 'AI service returned a non-JSON response.' },
    };
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: { code: 'parse', message: 'AI service returned an unexpected response shape.' },
    };
  }

  return { ok: true, data: parsed.data };
}

/** Sends one coach-chat message: `POST /api/chat` → `{ reply }`. */
export function sendChatMessage(message: string): Promise<AiResult<ChatReply>> {
  return postJson('/api/chat', { message }, chatReplySchema);
}

/**
 * Identifies a garment from a captured photo: `POST /api/identify` → the
 * structured record that pre-fills the confirm panel and the four AI tags.
 *
 * Uses the 8s identify timeout (not the default 15s) — timeout/offline
 * resolves to `{ ok: false, error }` so APP-19 can land the user in manual
 * entry instead of a dead end.
 */
export function identifyGarment(imageBase64: string): Promise<AiResult<IdentifyResult>> {
  return postJson('/api/identify', { imageBase64 }, identifyResultSchema, IDENTIFY_TIMEOUT_MS);
}

/**
 * Sends the conversation to Iris: `POST /api/coach` → one or more structured
 * reply messages (`text` | `outfit` | `palette`) for the chat bubbles (APP-21).
 *
 * Takes the full `{ messages, wardrobe }` payload — history oldest-first (the
 * server windows to the last 20 turns) plus the compact wardrobe context.
 * Timeout/offline/parse failures resolve to `{ ok: false, error }` so the
 * chat screen can append an italic system note and keep the input usable.
 */
export function sendCoachMessage(request: CoachRequest): Promise<AiResult<CoachResponse>> {
  return postJson('/api/coach', request, coachResponseSchema);
}
