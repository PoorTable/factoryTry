/**
 * Server-only Anthropic client singleton.
 *
 * IMPORTANT: this module must only be imported from Expo Router API routes
 * (`src/app/api/*+api.ts`). It reads `ANTHROPIC_API_KEY` from the server
 * environment — importing it from client code would crash at runtime and
 * would risk leaking the key into the app bundle.
 */

import Anthropic from '@anthropic-ai/sdk';

/** Model strings per the AI service-layer spec (APP-28). */
export const MODELS = {
  /** Chat / styling judgment. */
  chat: 'claude-fable-5',
  /** Cheap vision tagging. */
  vision: 'claude-haiku-4-5-20251001',
} as const;

/**
 * Mock mode: when `EXPO_PUBLIC_AI_MOCK=1`, routes return canned fixtures
 * (see ./fixtures.ts) instead of calling the Claude API. This keeps screen
 * tickets and reviewers independent of a live key.
 */
export function isMockMode(): boolean {
  return process.env.EXPO_PUBLIC_AI_MOCK === '1';
}

/** Whether a real key is configured — check before calling `anthropic()`. */
export function hasApiKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let client: Anthropic | null = null;

/**
 * Lazily constructed Anthropic client singleton. Throws if
 * `ANTHROPIC_API_KEY` is missing — callers should gate on `hasApiKey()`
 * (or `isMockMode()`) first and return a proper error envelope instead.
 */
export function anthropic(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set in the server environment.');
  }
  client ??= new Anthropic({ apiKey });
  return client;
}
