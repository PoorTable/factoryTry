/**
 * Thin CLIP wrapper (APP-29).
 *
 * Bridges the pure pipeline (`./labels`, `./swatches`, `./palette-labels`,
 * `./name-template`) to the on-device runtime. Calls into
 * `react-native-executorch` for the actual zero-shot inference; everything
 * downstream of the embedding pair is pure TypeScript.
 *
 * Why a wrapper module: the runtime hook calls (`useTextEmbeddings`,
 * `useClassification` etc.) are platform-only — they crash under
 * `node --experimental-strip-types`, which is the harness GATE-3/4/5 run the
 * pure-helper tests under. Confining the runtime touch to this single file
 * lets every other module in `./identify/` stay test-runnable.
 *
 * The live `identify()` branch in `client.ts` calls `identifyWithClip()` here
 * with the pixel buffer; this function runs the four steps:
 *   1. Extract dominant swatches (`./swatches`).
 *   2. Resolve the palette label (`./palette-labels`).
 *   3. Run CLIP zero-shot over the enum-pinned category, season, and mood
 *      label sets (`./labels`).
 *   4. Template the editorial name (`./name-template`).
 *
 * Until APP-36 flips `shouldUseMockMode()` to allow live runs on hardware,
 * the live branch is unreachable on the simulator — but the structure is in
 * place so APP-36 can light it up without touching screens.
 */

import type { IdentifyResult } from '../schemas';

import { CATEGORY_LABELS, MOOD_LABELS, SEASON_LABELS } from './labels';
import { nearestPaletteLabel } from './palette-labels';
import { templateName } from './name-template';
import { extractSwatches, type PixelChannels } from './swatches';

/**
 * Runtime handle the live provider passes through. We type it loosely (rather
 * than importing `react-native-executorch` directly) so this module stays
 * importable under `node --experimental-strip-types` even though the runtime
 * itself is iOS / Android only.
 *
 * The expected shape mirrors what `useTextEmbeddings` and an image-embedding
 * variant return at runtime: an async `forward(input)` that produces a
 * fixed-length number[] embedding.
 */
export interface ClipEmbedder {
  /** Encode an image buffer (RGB / RGBA flat) into a CLIP embedding. */
  encodeImage: (buffer: ArrayLike<number>, channels: PixelChannels) => Promise<number[]>;
  /** Encode a text prompt into a CLIP embedding. */
  encodeText: (prompt: string) => Promise<number[]>;
}

/** Cosine similarity between two equal-length number vectors. */
function cosine(a: readonly number[], b: readonly number[]): number {
  const n = Math.min(a.length, b.length);
  if (n === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < n; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  if (denom === 0) return 0;
  return dot / denom;
}

/**
 * Numerically-stable softmax. Returns an array of probabilities summing to 1.
 */
function softmax(values: readonly number[]): number[] {
  if (values.length === 0) return [];
  let max = -Infinity;
  for (const v of values) if (v > max) max = v;
  const exps = values.map((v) => Math.exp(v - max));
  const sum = exps.reduce((s, v) => s + v, 0);
  if (sum === 0) return exps.map(() => 1 / values.length);
  return exps.map((e) => e / sum);
}

/**
 * Zero-shot classify an image embedding against a label set. Returns the
 * argmax label and the top-1 softmax probability (used as `confidence`).
 */
async function zeroShotClassify<T extends string>(
  imageEmbedding: readonly number[],
  labels: readonly T[],
  prompts: readonly string[],
  embedder: ClipEmbedder,
): Promise<{ label: T; confidence: number }> {
  if (labels.length === 0) {
    throw new Error('zeroShotClassify: empty label set');
  }
  const textEmbeddings = await Promise.all(prompts.map((p) => embedder.encodeText(p)));
  const sims = textEmbeddings.map((te) => cosine(imageEmbedding, te));
  // CLIP convention: scale similarities by 100 before softmax — sharpens the
  // top-1 margin, which is what we use as `confidence`.
  const probs = softmax(sims.map((s) => s * 100));
  let bestIdx = 0;
  for (let i = 1; i < probs.length; i += 1) {
    if (probs[i] > probs[bestIdx]) bestIdx = i;
  }
  return { label: labels[bestIdx], confidence: probs[bestIdx] };
}

export interface IdentifyWithClipInput {
  /** Flat pixel buffer from the captured photo (downscaled). */
  buffer: ArrayLike<number>;
  /** Buffer channel layout. */
  channels: PixelChannels;
  /** Runtime embedder handles (image + text). */
  embedder: ClipEmbedder;
}

/**
 * Full on-device identify pipeline. Returns an `IdentifyResult` that satisfies
 * `identifyResultSchema` (the caller still runs it through `validate()` for
 * defense-in-depth).
 *
 * The category confidence drives the overall `confidence` — it is the field
 * the camera flow uses to gate the manual-edit fallback (<0.4).
 */
export async function identifyWithClip(input: IdentifyWithClipInput): Promise<IdentifyResult> {
  const { buffer, channels, embedder } = input;

  // 1. Local color extraction (no model).
  const swatches = extractSwatches(buffer, { k: 3, channels });

  // 2. Palette label nearest-match (no model).
  const paletteLabel = nearestPaletteLabel(swatches);

  // 3. CLIP image embedding (single forward) + three zero-shot classifications.
  const imageEmbedding = await embedder.encodeImage(buffer, channels);

  const { buildPrompts } = await import('./labels');

  const [category, season, mood] = await Promise.all([
    zeroShotClassify(
      imageEmbedding,
      CATEGORY_LABELS,
      buildPrompts(CATEGORY_LABELS, 'garment'),
      embedder,
    ),
    zeroShotClassify(
      imageEmbedding,
      SEASON_LABELS,
      buildPrompts(SEASON_LABELS, 'season'),
      embedder,
    ),
    zeroShotClassify(
      imageEmbedding,
      MOOD_LABELS,
      buildPrompts(MOOD_LABELS, 'mood'),
      embedder,
    ),
  ]);

  // 4. Templated name from category + palette label.
  const name = templateName(category.label, paletteLabel);

  return {
    name,
    category: category.label,
    season: season.label,
    mood: mood.label,
    paletteLabel,
    swatches,
    confidence: category.confidence,
  };
}
