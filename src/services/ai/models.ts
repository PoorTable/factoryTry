/**
 * On-device model registry (APP-35).
 *
 * Lists the ExecuTorch model resources the runtime downloads and caches on
 * first launch via `ExpoResourceFetcher` / `expo-file-system`:
 *
 * - **Llama 3.2 1B Instruct (4-bit)** — default chat / styling-judgment LLM.
 * - **Hammer 2.1 1.5B** — alternative tool-calling LLM (opt-in).
 * - **CLIP ViT-B/32** — vision encoder used for garment ID and palette work.
 *
 * The registry is platform-neutral: it has no `react-native-executorch`
 * import, so it is safe to bundle in screens, the provider, and the
 * download-progress UI.
 *
 * URLs point at the SWM-published mirrors documented at
 * https://docs.swmansion.com/react-native-executorch/. The exact pinned
 * filenames may evolve with the runtime; treat the registry as the single
 * source of truth and update here when bumping ExecuTorch.
 */

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

/** Chat / styling LLM (Llama-family or Hammer). */
export interface LlmModelEntry extends BaseModelEntry {
  kind: 'llm';
  /** Quantized weights file URL (typically a `.pte` ExecuTorch model). */
  modelUrl: string;
  /** Companion tokenizer file URL (BPE `.bin` / `.model` per ExecuTorch). */
  tokenizerUrl: string;
  /** Chat template family the prompt builder needs to honor. */
  promptTemplate: 'llama-3' | 'hammer-2';
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

/**
 * Llama 3.2 1B Instruct — 4-bit ExecuTorch build, the default chat LLM.
 *
 * Chosen as the floor because the 4-bit `.pte` lands at ~1.1GB on disk and
 * runs on 3GB-RAM devices (iPhone 12 / Pixel 6 and up). For mid-range Android
 * (<3GB RAM) the provider trips the capability gate and falls back to mock.
 */
export const LLAMA_3_2_1B_4BIT: LlmModelEntry = {
  id: 'llama-3.2-1b-instruct-4bit',
  displayName: 'Llama 3.2 1B (4-bit)',
  kind: 'llm',
  sizeMb: 1150,
  ram: { minGb: 3, recommendedGb: 4 },
  modelUrl:
    'https://huggingface.co/software-mansion/react-native-executorch-llama-3.2-1b-instruct/resolve/main/llama-3.2-1b-instruct-4bit.pte',
  tokenizerUrl:
    'https://huggingface.co/software-mansion/react-native-executorch-llama-3.2-1b-instruct/resolve/main/tokenizer.bin',
  promptTemplate: 'llama-3',
};

/**
 * Hammer 2.1 1.5B — opt-in tool-calling LLM. Not the default because it is
 * a touch heavier than Llama 1B, but it lights up structured-output tasks
 * (e.g. outfit JSON, palette swatches) more reliably.
 */
export const HAMMER_2_1_1_5B: LlmModelEntry = {
  id: 'hammer-2.1-1.5b',
  displayName: 'Hammer 2.1 1.5B',
  kind: 'llm',
  sizeMb: 1480,
  ram: { minGb: 4, recommendedGb: 6 },
  modelUrl:
    'https://huggingface.co/software-mansion/react-native-executorch-hammer-2.1-1.5b/resolve/main/hammer-2.1-1.5b.pte',
  tokenizerUrl:
    'https://huggingface.co/software-mansion/react-native-executorch-hammer-2.1-1.5b/resolve/main/tokenizer.bin',
  promptTemplate: 'hammer-2',
};

/**
 * CLIP ViT-B/32 — vision encoder for garment classification + palette work.
 * Runs comfortably on the same device class as Llama 1B; bundled as the
 * default vision model because it carries the full image+text pair.
 */
export const CLIP_VIT_B_32: VisionModelEntry = {
  id: 'clip-vit-b-32',
  displayName: 'CLIP ViT-B/32',
  kind: 'vision',
  sizeMb: 350,
  ram: { minGb: 2, recommendedGb: 3 },
  modelUrl:
    'https://huggingface.co/software-mansion/react-native-executorch-clip-vit-b-32/resolve/main/clip-vit-b-32-image.pte',
  textEncoderUrl:
    'https://huggingface.co/software-mansion/react-native-executorch-clip-vit-b-32/resolve/main/clip-vit-b-32-text.pte',
};

/**
 * Canonical registry — index by model id. The provider reads its `chat` and
 * `vision` defaults from `MODEL_DEFAULTS`; future tickets can add entries
 * here without touching the provider wiring.
 */
export const MODEL_REGISTRY: Record<string, ModelEntry> = {
  [LLAMA_3_2_1B_4BIT.id]: LLAMA_3_2_1B_4BIT,
  [HAMMER_2_1_1_5B.id]: HAMMER_2_1_1_5B,
  [CLIP_VIT_B_32.id]: CLIP_VIT_B_32,
};

/** Defaults the provider loads on first run. */
export const MODEL_DEFAULTS = {
  chat: LLAMA_3_2_1B_4BIT,
  vision: CLIP_VIT_B_32,
} as const;

/** Convenience: list every entry (for the download-progress UI). */
export function listModels(): ModelEntry[] {
  return Object.values(MODEL_REGISTRY);
}
