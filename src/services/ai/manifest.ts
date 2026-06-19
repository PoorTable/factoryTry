/**
 * Manifest schema + validator for `assets/ai-models/models.json` (APP-36).
 *
 * Pure, dependency-free TypeScript so it can run under both the Expo bundler
 * and the `node --experimental-strip-types --test` runner (and the
 * verify-models-manifest CLI). No `zod` import — keeps this module bundle-safe
 * and import-cycle-free with the rest of `src/services/ai/`.
 *
 * The shape mirrors the gates in `.claude/factory-gates.local.md`:
 *   - id, role ("chat"|"vision"), url (https), sha256 (64-hex), sizeBytes (int>0),
 *     license (string), version (string), displayName (string)
 *   - chat entries additionally require `tokenizerUrl` (https)
 *   - vision entries optionally include `textEncoderUrl` (https when present)
 */

/** Role discriminant — only "chat" and "vision" are valid. */
export type ManifestRole = 'chat' | 'vision';

/** Optional RAM hint shared with the typed `ModelEntry` shape. */
export interface ManifestRamHint {
  minGb: number;
  recommendedGb: number;
}

/** Raw (unvalidated) entry as it appears in models.json. */
export interface RawManifestEntry {
  id: string;
  role: ManifestRole;
  displayName: string;
  version: string;
  license: string;
  url: string;
  tokenizerUrl?: string;
  textEncoderUrl?: string;
  sha256: string;
  sizeBytes: number;
  /** Legacy/companion fields the typed registry consumes. */
  kind?: 'llm' | 'vision';
  sizeMb?: number;
  ram?: ManifestRamHint;
  promptTemplate?: string;
  /** Mark which chat/vision entry the runtime should pick by default. */
  default?: boolean;
}

/** Top-level shape of `models.json`. */
export interface RawManifest {
  schemaVersion?: number;
  models: RawManifestEntry[];
}

const HTTPS_URL = /^https:\/\//;
const SHA256_HEX = /^[0-9a-f]{64}$/;

/** Validation error with a path hint for the offending field. */
export class ManifestValidationError extends Error {
  readonly path: string;
  constructor(path: string, message: string) {
    super(`${path}: ${message}`);
    this.name = 'ManifestValidationError';
    this.path = path;
  }
}

function requireString(obj: Record<string, unknown>, key: string, path: string): string {
  const v = obj[key];
  if (typeof v !== 'string' || v.length === 0) {
    throw new ManifestValidationError(`${path}.${key}`, `expected non-empty string, got ${typeof v}`);
  }
  return v;
}

function requireHttpsUrl(obj: Record<string, unknown>, key: string, path: string): string {
  const v = requireString(obj, key, path);
  if (!HTTPS_URL.test(v)) {
    throw new ManifestValidationError(`${path}.${key}`, `expected https:// URL, got "${v}"`);
  }
  return v;
}

function optionalHttpsUrl(obj: Record<string, unknown>, key: string, path: string): string | undefined {
  const v = obj[key];
  if (v === undefined || v === null) return undefined;
  if (typeof v !== 'string' || !HTTPS_URL.test(v)) {
    throw new ManifestValidationError(`${path}.${key}`, `expected https:// URL or omitted, got ${JSON.stringify(v)}`);
  }
  return v;
}

/**
 * Validate a single raw entry against the schema gates. Returns the entry
 * narrowed to `RawManifestEntry` on success; throws `ManifestValidationError`
 * on the first violation.
 */
export function validateEntry(raw: unknown, path: string): RawManifestEntry {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new ManifestValidationError(path, 'expected object');
  }
  const obj = raw as Record<string, unknown>;

  const id = requireString(obj, 'id', path);
  const role = requireString(obj, 'role', path);
  if (role !== 'chat' && role !== 'vision') {
    throw new ManifestValidationError(`${path}.role`, `expected "chat" | "vision", got "${role}"`);
  }
  const displayName = requireString(obj, 'displayName', path);
  const version = requireString(obj, 'version', path);
  const license = requireString(obj, 'license', path);
  const url = requireHttpsUrl(obj, 'url', path);
  const sha256 = requireString(obj, 'sha256', path);
  if (!SHA256_HEX.test(sha256)) {
    throw new ManifestValidationError(`${path}.sha256`, `expected 64-char lowercase hex, got "${sha256}"`);
  }
  const sizeBytes = obj.sizeBytes;
  if (!Number.isInteger(sizeBytes) || (sizeBytes as number) <= 0) {
    throw new ManifestValidationError(`${path}.sizeBytes`, `expected positive integer, got ${JSON.stringify(sizeBytes)}`);
  }

  const tokenizerUrl =
    role === 'chat'
      ? requireHttpsUrl(obj, 'tokenizerUrl', path)
      : optionalHttpsUrl(obj, 'tokenizerUrl', path);
  const textEncoderUrl = optionalHttpsUrl(obj, 'textEncoderUrl', path);

  const entry: RawManifestEntry = {
    id,
    role,
    displayName,
    version,
    license,
    url,
    sha256,
    sizeBytes: sizeBytes as number,
  };
  if (tokenizerUrl !== undefined) entry.tokenizerUrl = tokenizerUrl;
  if (textEncoderUrl !== undefined) entry.textEncoderUrl = textEncoderUrl;

  // Pass-through hints used by the typed registry.
  if (obj.kind === 'llm' || obj.kind === 'vision') entry.kind = obj.kind;
  if (typeof obj.sizeMb === 'number' && Number.isFinite(obj.sizeMb)) entry.sizeMb = obj.sizeMb;
  if (obj.ram && typeof obj.ram === 'object') {
    const ram = obj.ram as Record<string, unknown>;
    if (typeof ram.minGb === 'number' && typeof ram.recommendedGb === 'number') {
      entry.ram = { minGb: ram.minGb, recommendedGb: ram.recommendedGb };
    }
  }
  if (typeof obj.promptTemplate === 'string') entry.promptTemplate = obj.promptTemplate;
  if (typeof obj.default === 'boolean') entry.default = obj.default;

  return entry;
}

/**
 * Parse + validate a full manifest object. Returns the validated entry list.
 * Throws on the first schema violation or if neither role is represented.
 */
export function parseManifest(input: unknown): RawManifestEntry[] {
  if (!input || typeof input !== 'object') {
    throw new ManifestValidationError('$', 'expected object root');
  }
  const root = input as Record<string, unknown>;
  const list = Array.isArray(root) ? (root as unknown[]) : (root.models as unknown[]);
  if (!Array.isArray(list) || list.length === 0) {
    throw new ManifestValidationError('$.models', 'expected non-empty array');
  }
  const entries = list.map((raw, i) => validateEntry(raw, `$.models[${i}]`));

  const seen = new Set<string>();
  for (const e of entries) {
    if (seen.has(e.id)) {
      throw new ManifestValidationError(`$.models[${e.id}]`, 'duplicate id');
    }
    seen.add(e.id);
  }

  const roles = new Set(entries.map((e) => e.role));
  if (!roles.has('chat')) {
    throw new ManifestValidationError('$.models', 'missing entry with role="chat"');
  }
  if (!roles.has('vision')) {
    throw new ManifestValidationError('$.models', 'missing entry with role="vision"');
  }

  return entries;
}

/** All HTTPS URLs referenced by an entry — used by the offline/online verifier. */
export function collectUrls(entry: RawManifestEntry): string[] {
  const urls = [entry.url];
  if (entry.tokenizerUrl) urls.push(entry.tokenizerUrl);
  if (entry.textEncoderUrl) urls.push(entry.textEncoderUrl);
  return urls;
}
