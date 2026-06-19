/**
 * Vanilla node:test suite for the models.json manifest + loader (APP-36 GATE-6).
 *
 * Runs under `node --experimental-strip-types --test src/services/ai/manifest.test.ts`.
 * Uses fs to read the JSON directly so the loader can be exercised without
 * the Expo bundler asset-resolution machinery.
 *
 * Covers:
 *   (a) loader returns entries matching the shape consumed via
 *       MODEL_DEFAULTS.chat (LlmModelEntry) and MODEL_DEFAULTS.vision (VisionModelEntry).
 *   (b) schema validator rejects entries with bad sha256, negative sizeBytes,
 *       missing license, non-https url, missing chat tokenizerUrl, bad role, etc.
 *   (c) at least one chat entry is Apache-2.0/MIT (the OSI-approved gate).
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import {
  ManifestValidationError,
  collectUrls,
  parseManifest,
  validateEntry,
} from './manifest.ts';

const here = dirname(fileURLToPath(import.meta.url));
const MANIFEST_PATH = resolve(here, '../../../assets/ai-models/models.json');

function loadJson(): unknown {
  return JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
}

// ----- (a) loader returns shapes that match MODEL_DEFAULTS callers -----------

test('parseManifest: returns >= 2 entries with both chat and vision roles', () => {
  const entries = parseManifest(loadJson());
  assert.ok(entries.length >= 2, 'expected at least 2 entries');
  const roles = new Set(entries.map((e) => e.role));
  assert.ok(roles.has('chat'), 'missing role="chat"');
  assert.ok(roles.has('vision'), 'missing role="vision"');
});

test('parseManifest: defaults.chat is a chat entry; defaults.vision is a vision entry', () => {
  const entries = parseManifest(loadJson());
  const chat = entries.find((e) => e.role === 'chat' && e.default === true) ?? entries.find((e) => e.role === 'chat');
  const vision = entries.find((e) => e.role === 'vision' && e.default === true) ?? entries.find((e) => e.role === 'vision');
  assert.ok(chat, 'no chat default');
  assert.ok(vision, 'no vision default');
  assert.equal(chat!.role, 'chat');
  assert.equal(vision!.role, 'vision');
  // Caller shape: MODEL_DEFAULTS.chat consumers read url+tokenizerUrl+id+displayName.
  assert.ok(/^https:\/\//.test(chat!.url), 'chat url must be https');
  assert.ok(chat!.tokenizerUrl && /^https:\/\//.test(chat!.tokenizerUrl), 'chat tokenizerUrl must be https');
  assert.ok(chat!.id.length > 0);
  assert.ok(chat!.displayName.length > 0);
  assert.ok(/^https:\/\//.test(vision!.url), 'vision url must be https');
});

test('parseManifest: at least one chat entry is Apache-2.0 or MIT (OSI permissive)', () => {
  const entries = parseManifest(loadJson());
  const chats = entries.filter((e) => e.role === 'chat');
  const permissive = chats.find((e) =>
    ['Apache-2.0', 'MIT', 'apache-2.0', 'mit'].includes(e.license),
  );
  assert.ok(permissive, 'no chat entry under Apache-2.0 / MIT');
});

test('collectUrls: returns model url + tokenizerUrl for chat, model url + optional text encoder for vision', () => {
  const entries = parseManifest(loadJson());
  const chat = entries.find((e) => e.role === 'chat')!;
  const vision = entries.find((e) => e.role === 'vision')!;
  const chatUrls = collectUrls(chat);
  assert.ok(chatUrls.includes(chat.url));
  assert.ok(chatUrls.includes(chat.tokenizerUrl!));
  const visionUrls = collectUrls(vision);
  assert.ok(visionUrls.includes(vision.url));
});

// ----- (b) schema validator rejects bad entries -----------------------------

function goodEntry(): Record<string, unknown> {
  return {
    id: 'test-model',
    role: 'chat',
    displayName: 'Test Model',
    version: '1.0.0',
    license: 'Apache-2.0',
    url: 'https://example.com/model.pte',
    tokenizerUrl: 'https://example.com/tokenizer.bin',
    sha256: 'a'.repeat(64),
    sizeBytes: 1024,
  };
}

test('validateEntry: accepts a well-formed chat entry', () => {
  const e = validateEntry(goodEntry(), '$');
  assert.equal(e.id, 'test-model');
  assert.equal(e.role, 'chat');
});

test('validateEntry: rejects bad sha256 (wrong length)', () => {
  const bad = { ...goodEntry(), sha256: 'abc' };
  assert.throws(() => validateEntry(bad, '$'), ManifestValidationError);
});

test('validateEntry: rejects bad sha256 (uppercase hex)', () => {
  const bad = { ...goodEntry(), sha256: 'A'.repeat(64) };
  assert.throws(() => validateEntry(bad, '$'), ManifestValidationError);
});

test('validateEntry: rejects negative sizeBytes', () => {
  const bad = { ...goodEntry(), sizeBytes: -1 };
  assert.throws(() => validateEntry(bad, '$'), ManifestValidationError);
});

test('validateEntry: rejects non-integer sizeBytes', () => {
  const bad = { ...goodEntry(), sizeBytes: 1.5 };
  assert.throws(() => validateEntry(bad, '$'), ManifestValidationError);
});

test('validateEntry: rejects missing license', () => {
  const bad = goodEntry();
  delete bad.license;
  assert.throws(() => validateEntry(bad, '$'), ManifestValidationError);
});

test('validateEntry: rejects non-https url', () => {
  const bad = { ...goodEntry(), url: 'http://example.com/model.pte' };
  assert.throws(() => validateEntry(bad, '$'), ManifestValidationError);
});

test('validateEntry: rejects unknown role', () => {
  const bad = { ...goodEntry(), role: 'audio' };
  assert.throws(() => validateEntry(bad, '$'), ManifestValidationError);
});

test('validateEntry: chat entry without tokenizerUrl is rejected', () => {
  const bad = goodEntry();
  delete bad.tokenizerUrl;
  assert.throws(() => validateEntry(bad, '$'), ManifestValidationError);
});

test('validateEntry: vision entry without tokenizerUrl is accepted', () => {
  const e = validateEntry(
    {
      id: 'v',
      role: 'vision',
      displayName: 'V',
      version: '1',
      license: 'MIT',
      url: 'https://example.com/v.pte',
      sha256: 'b'.repeat(64),
      sizeBytes: 2048,
    },
    '$',
  );
  assert.equal(e.role, 'vision');
});

test('parseManifest: rejects manifest missing the vision role', () => {
  const onlyChat = { models: [goodEntry()] };
  assert.throws(() => parseManifest(onlyChat), ManifestValidationError);
});

test('parseManifest: rejects manifest with duplicate ids', () => {
  const dup = { models: [goodEntry(), goodEntry(), { ...goodEntry(), id: 'v', role: 'vision', sha256: 'c'.repeat(64) }] };
  assert.throws(() => parseManifest(dup), ManifestValidationError);
});
