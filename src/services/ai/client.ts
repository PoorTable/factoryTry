/**
 * Typed AI client — the ONLY way screens talk to the AI API routes.
 *
 * Thin `fetch` wrapper with:
 * - zod-validated responses (malformed payloads become a typed `parse`
 *   error instead of crashing screens),
 * - a 15s timeout via AbortController,
 * - a typed error union: `network | rate-limit | parse | server`.
 *
 * Never imports the Anthropic SDK and never sees the server-side API key —
 * all Claude access happens server-side in `src/app/api/*+api.ts`.
 */

import Constants from 'expo-constants';
import { z } from 'zod';

import { chatReplySchema, type ChatReply } from './schemas';

/** Typed error union surfaced to screens. */
export type AiErrorCode = 'network' | 'rate-limit' | 'parse' | 'server';

export interface AiError {
  code: AiErrorCode;
  message: string;
}

/** Discriminated result — screens branch on `ok` instead of try/catch. */
export type AiResult<T> = { ok: true; data: T } | { ok: false; error: AiError };

/** Per-request timeout (15s), enforced with an AbortController. */
const REQUEST_TIMEOUT_MS = 15_000;

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

async function postJson<T>(path: string, body: unknown, schema: z.ZodType<T>): Promise<AiResult<T>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

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
          ? `Request timed out after ${REQUEST_TIMEOUT_MS / 1000}s.`
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
