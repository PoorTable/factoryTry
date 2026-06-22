/**
 * Vanilla node:test suite for the AI client mode resolver (APP-40 fail-closed AC).
 *
 * Runs under `node --experimental-strip-types --test`; uses relative imports
 * so the strip-types loader can resolve everything without bundler help. This
 * is the RN-free core of the fail-closed contract: when mock is not forced and
 * the native runtime is absent, the resolver MUST return `unavailable` (never
 * `mock`), so the provider surfaces `model-unavailable` instead of fabricating
 * success.
 */

import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { resolveClientMode } from './client-mode.ts';

test('resolveClientMode: EXPO_PUBLIC_AI_MOCK forces mock regardless of runtime', () => {
  assert.equal(resolveClientMode({ mockForced: true, executorchAvailable: false }), 'mock');
  assert.equal(resolveClientMode({ mockForced: true, executorchAvailable: true }), 'mock');
});

test('resolveClientMode: native runtime present + mock not forced → live', () => {
  assert.equal(resolveClientMode({ mockForced: false, executorchAvailable: true }), 'live');
});

test('resolveClientMode: FAIL-CLOSED — no mock, no native runtime → unavailable (NOT mock)', () => {
  const mode = resolveClientMode({ mockForced: false, executorchAvailable: false });
  assert.equal(mode, 'unavailable');
  assert.notEqual(mode, 'mock', 'must never silently fall back to mock when the runtime is absent');
});
