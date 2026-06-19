/**
 * On-device model registry (APP-35, manifest-driven via APP-36).
 *
 * Reads the canonical model list from `assets/ai-models/models.json` so the
 * runtime downloader, the registry, and the docs all share a single source of
 * truth (see `docs/ai-models/README.md`). This module exposes the same public
 * surface APP-35 already consumes (`MODEL_REGISTRY`, `MODEL_DEFAULTS`,
 * `listModels`, and the named entry shortcuts) so callers keep compiling.
 *
 * The default chat LLM is now **Qwen2.5 1.5B Instruct (4-bit)** under the
 * Apache-2.0 license — chosen per APP-36's "fully free" constraint over
 * Llama 3.2 1B (Llama Community license, free but not OSI-approved). Llama
 * stays in the registry as an opt-in alternative.
 *
 * The registry is platform-neutral: no `react-native-executorch` import, so
 * it is safe to bundle in screens, the provider, and the download-progress
 * UI. The JSON manifest itself is bundled as a static asset.
 */

import manifestJson from '../../../assets/ai-models/models.json';

import {
  type RawManifest,
  type RawManifestEntry,
  parseManifest,
} from './manifest.ts';

/** Discriminant on `kind` — chat LLMs and vision models have different shapes. */
export type ModelKind = 'llm' | 'vision';

/** Approximate device-memory floor (in GB) required to load a model safely. */
export interface ModelRamRequirement {
  /** Hard floor — below this, the runtime falls back to mock mode. */
  minGb: number;
  /** Comfortable headroom — at or above this the model has room to breathe. */
  recommendedGb: number;
}

/** Base fields every registry entry shares. */
interface BaseModelEntry {
  /** Stable lookup id — also used as the on-disk cache key. */
  id: string;
  /** Human label shown in the download-progress UI. */
  displayName: string;
  /** Kind discriminant. */
  kind: ModelKind;
  /** Approximate on-disk size, used for the progress UI ETA. */
  sizeMb: number;
  /** RAM gates — under `minGb` the provider returns the mock fallback. */
  ram: ModelRamRequirement;
}

/** Chat / styling LLM (Qwen, Llama, Hammer, etc.). */
export interface LlmModelEntry extends BaseModelEntry {
  kind: 'llm';
  /** Quantized weights file URL (typically a `.pte` ExecuTorch model). */
  modelUrl: string;
  /** Companion tokenizer file URL (BPE `.bin` / `.json` per ExecuTorch). */
  tokenizerUrl: string;
  /** Chat template family the prompt builder needs to honor. */
  promptTemplate: 'llama-3' | 'hammer-2' | 'qwen-2.5';
}

/** Vision encoder (CLIP). */
export interface VisionModelEntry extends BaseModelEntry {
  kind: 'vision';
  /** Image encoder weights URL. */
  modelUrl: string;
  /** Optional separately-shipped text encoder (CLIP image+text variant). */
  textEncoderUrl?: string;
}

export type ModelEntry = LlmModelEntry | VisionModelEntry;

/** Convert a parsed manifest entry into the typed `ModelEntry` shape. */
function toModelEntry(raw: RawManifestEntry): ModelEntry {
  if (raw.role === 'chat') {
    return {
      id: raw.id,
      displayName: raw.displayName,
      kind: 'llm',
      sizeMb: raw.sizeMb ?? Math.round(raw.sizeBytes / (1024 * 1024)),
      ram: raw.ram ?? { minGb: 3, recommendedGb: 4 },
      modelUrl: raw.url,
      tokenizerUrl: raw.tokenizerUrl as string,
      promptTemplate: (raw.promptTemplate ?? 'llama-3') as LlmModelEntry['promptTemplate'],
    };
  }
  return {
    id: raw.id,
    displayName: raw.displayName,
    kind: 'vision',
    sizeMb: raw.sizeMb ?? Math.round(raw.sizeBytes / (1024 * 1024)),
    ram: raw.ram ?? { minGb: 2, recommendedGb: 3 },
    modelUrl: raw.url,
    textEncoderUrl: raw.textEncoderUrl,
  };
}

/**
 * Load and validate the bundled manifest into the typed `ModelEntry` list.
 * Throws if the manifest is malformed — this is the boot-time integrity check.
 */
export function loadManifest(): {
  entries: ModelEntry[];
  raw: RawManifestEntry[];
  defaults: { chat: LlmModelEntry; vision: VisionModelEntry };
} {
  const parsed = parseManifest(manifestJson as RawManifest);
  const entries = parsed.map(toModelEntry);

  const chatRaw = parsed.find((e) => e.role === 'chat' && e.default === true)
    ?? parsed.find((e) => e.role === 'chat');
  const visionRaw = parsed.find((e) => e.role === 'vision' && e.default === true)
    ?? parsed.find((e) => e.role === 'vision');

  if (!chatRaw) throw new Error('models.json: no entry with role="chat"');
  if (!visionRaw) throw new Error('models.json: no entry with role="vision"');

  const chat = toModelEntry(chatRaw) as LlmModelEntry;
  const vision = toModelEntry(visionRaw) as VisionModelEntry;

  return { entries, raw: parsed, defaults: { chat, vision } };
}

const loaded = loadManifest();

function findEntry<T extends ModelEntry>(id: string): T {
  const entry = loaded.entries.find((e) => e.id === id);
  if (!entry) {
    throw new Error(`models.json: missing required entry "${id}"`);
  }
  return entry as T;
}

/**
 * Qwen2.5 1.5B Instruct — 4-bit ExecuTorch build, the **default** chat LLM.
 *
 * Apache-2.0 licensed (OSI-approved permissive). Chosen over Llama 3.2 1B
 * because the task explicitly prefers a fully-free / OSI-approved license.
 * The 4-bit `.pte` lands at ~1.0GB on disk and runs on 3GB-RAM devices.
 */
export const QWEN_2_5_1_5B_4BIT: LlmModelEntry = findEntry<LlmModelEntry>(
  'qwen2.5-1.5b-instruct-4bit',
);

/**
 * Llama 3.2 1B Instruct — 4-bit ExecuTorch build, retained as a non-default
 * alternative chat LLM. Ships under Meta's Llama Community license (free
 * but not OSI-approved); not the default per APP-36's licensing preference.
 */
export const LLAMA_3_2_1B_4BIT: LlmModelEntry = findEntry<LlmModelEntry>(
  'llama-3.2-1b-instruct-4bit',
);

/**
 * Hammer 2.1 1.5B — opt-in tool-calling LLM. Apache-2.0. A touch heavier
 * than Qwen/Llama 1B but lights up structured-output tasks (outfit JSON,
 * palette swatches) more reliably.
 */
export const HAMMER_2_1_1_5B: LlmModelEntry = findEntry<LlmModelEntry>(
  'hammer-2.1-1.5b',
);

/**
 * CLIP ViT-B/32 — vision encoder for garment classification + palette work.
 * MIT-licensed. Runs comfortably on the same device class as Llama/Qwen 1B.
 */
export const CLIP_VIT_B_32: VisionModelEntry = findEntry<VisionModelEntry>(
  'clip-vit-b-32',
);

/**
 * Canonical registry — index by model id. Source of truth lives in
 * `assets/ai-models/models.json`; this object is rebuilt from that file at
 * import time. Future tickets add entries by editing the JSON manifest.
 */
export const MODEL_REGISTRY: Record<string, ModelEntry> = Object.fromEntries(
  loaded.entries.map((e) => [e.id, e]),
);

/** Defaults the provider loads on first run (chat=Apache-2.0 Qwen2.5). */
export const MODEL_DEFAULTS: { chat: LlmModelEntry; vision: VisionModelEntry } = {
  chat: loaded.defaults.chat,
  vision: loaded.defaults.vision,
};

/** Convenience: list every entry (for the download-progress UI). */
export function listModels(): ModelEntry[] {
  return Object.values(MODEL_REGISTRY);
}
