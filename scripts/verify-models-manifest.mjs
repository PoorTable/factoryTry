#!/usr/bin/env node
/**
 * verify-models-manifest (APP-36 GATE-5).
 *
 * Validates `assets/ai-models/models.json` against the schema gates and,
 * when online, runs HTTP HEAD against every URL to confirm the published
 * `Content-Length` matches the manifest's `sizeBytes`.
 *
 * Usage:
 *   node scripts/verify-models-manifest.mjs                 # online (HEAD requests)
 *   node scripts/verify-models-manifest.mjs --offline       # schema-only
 *   VERIFY_MODELS_OFFLINE=1 node scripts/verify-models-manifest.mjs
 *
 * Exit codes:
 *   0  schema valid (offline) or schema valid + all HEAD checks passed (online)
 *   1  schema validation failed
 *   2  HEAD request failed or content-length mismatch (online only)
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const MANIFEST_PATH = resolve(ROOT, 'assets/ai-models/models.json');

const HTTPS_URL = /^https:\/\//;
const SHA256_HEX = /^[0-9a-f]{64}$/;

/** Inline copy of the schema validator so this script has no relative TS deps. */
function validateEntry(raw, path) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error(`${path}: expected object`);
  }
  const r = (k) => {
    const v = raw[k];
    if (typeof v !== 'string' || v.length === 0) {
      throw new Error(`${path}.${k}: expected non-empty string`);
    }
    return v;
  };
  const id = r('id');
  const role = r('role');
  if (role !== 'chat' && role !== 'vision') {
    throw new Error(`${path}.role: expected "chat" | "vision", got "${role}"`);
  }
  r('displayName');
  r('version');
  r('license');
  const url = r('url');
  if (!HTTPS_URL.test(url)) throw new Error(`${path}.url: expected https://, got "${url}"`);
  const sha = r('sha256');
  if (!SHA256_HEX.test(sha)) throw new Error(`${path}.sha256: expected 64-char lowercase hex`);
  const sz = raw.sizeBytes;
  if (!Number.isInteger(sz) || sz <= 0) {
    throw new Error(`${path}.sizeBytes: expected positive integer, got ${JSON.stringify(sz)}`);
  }
  if (role === 'chat') {
    const tu = raw.tokenizerUrl;
    if (typeof tu !== 'string' || !HTTPS_URL.test(tu)) {
      throw new Error(`${path}.tokenizerUrl: chat entries require https tokenizerUrl`);
    }
  } else if (raw.tokenizerUrl !== undefined && raw.tokenizerUrl !== null) {
    if (typeof raw.tokenizerUrl !== 'string' || !HTTPS_URL.test(raw.tokenizerUrl)) {
      throw new Error(`${path}.tokenizerUrl: expected https or omitted`);
    }
  }
  if (raw.textEncoderUrl !== undefined && raw.textEncoderUrl !== null) {
    if (typeof raw.textEncoderUrl !== 'string' || !HTTPS_URL.test(raw.textEncoderUrl)) {
      throw new Error(`${path}.textEncoderUrl: expected https or omitted`);
    }
  }
  return { id, role, ...raw };
}

function parseManifest(input) {
  if (!input || typeof input !== 'object') throw new Error('$: expected object root');
  const list = Array.isArray(input) ? input : input.models;
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error('$.models: expected non-empty array');
  }
  const entries = list.map((raw, i) => validateEntry(raw, `$.models[${i}]`));
  const seen = new Set();
  for (const e of entries) {
    if (seen.has(e.id)) throw new Error(`$.models[${e.id}]: duplicate id`);
    seen.add(e.id);
  }
  const roles = new Set(entries.map((e) => e.role));
  if (!roles.has('chat')) throw new Error('$.models: missing role="chat"');
  if (!roles.has('vision')) throw new Error('$.models: missing role="vision"');
  return entries;
}

function isOffline(argv, env) {
  if (argv.includes('--offline') || argv.includes('--no-network')) return true;
  if (env.VERIFY_MODELS_OFFLINE === '1' || env.VERIFY_MODELS_OFFLINE === 'true') return true;
  return false;
}

/** Run HTTP HEAD against a single URL with a short timeout. */
async function headCheck(url, expectedBytes) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10_000);
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: ctrl.signal });
    if (!res.ok) {
      return { ok: false, reason: `status ${res.status}` };
    }
    const lenHeader = res.headers.get('content-length');
    if (lenHeader && expectedBytes !== undefined) {
      const len = Number(lenHeader);
      if (Number.isFinite(len) && Math.abs(len - expectedBytes) > 0) {
        return { ok: false, reason: `content-length ${len} != sizeBytes ${expectedBytes}` };
      }
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err?.message ?? String(err) };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  let raw;
  try {
    raw = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
  } catch (err) {
    console.error(`[verify-models-manifest] failed to read ${MANIFEST_PATH}: ${err.message}`);
    process.exit(1);
  }

  let entries;
  try {
    entries = parseManifest(raw);
  } catch (err) {
    console.error(`[verify-models-manifest] schema error: ${err.message}`);
    process.exit(1);
  }

  console.log(`[verify-models-manifest] schema OK — ${entries.length} entries`);

  if (isOffline(process.argv, process.env)) {
    console.log('[verify-models-manifest] offline mode — skipping HEAD checks');
    process.exit(0);
  }

  let failed = 0;
  for (const e of entries) {
    const targets = [{ kind: 'model', url: e.url, expected: e.sizeBytes }];
    if (e.tokenizerUrl) targets.push({ kind: 'tokenizer', url: e.tokenizerUrl, expected: undefined });
    if (e.textEncoderUrl) targets.push({ kind: 'textEncoder', url: e.textEncoderUrl, expected: undefined });
    for (const t of targets) {
      const res = await headCheck(t.url, t.expected);
      if (!res.ok) {
        failed += 1;
        console.error(`  FAIL [${e.id}/${t.kind}] ${t.url}: ${res.reason}`);
      } else {
        console.log(`  ok   [${e.id}/${t.kind}] ${t.url}`);
      }
    }
  }
  process.exit(failed === 0 ? 0 : 2);
}

main().catch((err) => {
  console.error(`[verify-models-manifest] unexpected error: ${err?.stack ?? err}`);
  process.exit(1);
});
