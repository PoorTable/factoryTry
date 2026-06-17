/**
 * k-means swatch extraction (APP-29).
 *
 * Pure function — given a flat pixel buffer (RGBA or RGB) from a downscaled
 * camera photo, return 1–3 dominant hex swatches. No `react-native-executorch`,
 * no React, no Expo — runs both in the live pipeline and under
 * `node --experimental-strip-types --test`.
 *
 * Algorithm: standard Lloyd's k-means in RGB space.
 *   1. Seed k centroids deterministically by even-indexing the pixel buffer
 *      (`kmeans++` would be slightly better but overkill for k≤3 on a
 *      downscaled buffer — and "deterministic" matters more for testability).
 *   2. Iterate: assign each pixel to its nearest centroid, recompute each
 *      centroid as the mean of its assignments. Cap at 12 iterations so we
 *      always return on a real device.
 *   3. Sort centroids by cluster size (largest first), drop empty clusters,
 *      cap at 3 — matches `identifyResultSchema`'s `swatches` constraint
 *      (`min(1).max(3)` of `#RRGGBB`).
 *
 * Hex output is uppercase `#RRGGBB`, which is the form `identifyResultSchema`
 * (via the `hexColorSchema` regex `^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$`)
 * accepts and what the design fixture (`['#D8C3A5', '#B8A285', '#8A6F52']`)
 * uses.
 */

/**
 * Channel count of the input buffer. 4 covers RGBA from `expo-image` /
 * `expo-camera` (alpha-discarded), 3 covers raw RGB.
 */
export type PixelChannels = 3 | 4;

export interface ExtractSwatchesOptions {
  /** Number of dominant colors to return (clamped to 1–3). Default 3. */
  k?: number;
  /** Channel count of the buffer (RGB=3, RGBA=4). Default 4. */
  channels?: PixelChannels;
  /** Hard cap on iterations. Default 12 — converges well before this on photos. */
  maxIterations?: number;
}

interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** [r,g,b] (0..255) → "#RRGGBB" uppercase. Clamps for safety. */
function rgbToHex({ r, g, b }: Rgb): string {
  const c = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`.toUpperCase();
}

/** Squared RGB distance — monotonic with Euclidean, cheaper than sqrt. */
function dist2(a: Rgb, b: Rgb): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return dr * dr + dg * dg + db * db;
}

/**
 * Seed k centroids by walking the pixel buffer at evenly-spaced offsets.
 * Deterministic for a given input — important so unit tests don't flake.
 */
function seedCentroids(pixels: Rgb[], k: number): Rgb[] {
  if (pixels.length === 0) return [];
  const centroids: Rgb[] = [];
  const step = Math.max(1, Math.floor(pixels.length / k));
  for (let i = 0; i < k; i += 1) {
    const idx = Math.min(pixels.length - 1, i * step);
    centroids.push({ ...pixels[idx] });
  }
  return centroids;
}

/**
 * Lloyd's k-means. Returns the final centroids and the size of each cluster,
 * so the caller can sort by dominance.
 */
function kmeans(pixels: Rgb[], k: number, maxIterations: number): { centroid: Rgb; size: number }[] {
  if (pixels.length === 0 || k <= 0) return [];
  const effectiveK = Math.min(k, pixels.length);
  let centroids = seedCentroids(pixels, effectiveK);

  for (let iter = 0; iter < maxIterations; iter += 1) {
    const sums = centroids.map(() => ({ r: 0, g: 0, b: 0, count: 0 }));
    for (let i = 0; i < pixels.length; i += 1) {
      const px = pixels[i];
      let bestIdx = 0;
      let bestDist = dist2(px, centroids[0]);
      for (let j = 1; j < centroids.length; j += 1) {
        const d = dist2(px, centroids[j]);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = j;
        }
      }
      const s = sums[bestIdx];
      s.r += px.r;
      s.g += px.g;
      s.b += px.b;
      s.count += 1;
    }
    let moved = false;
    const next: Rgb[] = centroids.map((c, i) => {
      const s = sums[i];
      if (s.count === 0) return c;
      const nc: Rgb = { r: s.r / s.count, g: s.g / s.count, b: s.b / s.count };
      if (!moved && dist2(nc, c) > 0.5) moved = true;
      return nc;
    });
    centroids = next;
    if (!moved) break;
  }

  // Final assignment pass for accurate cluster sizes.
  const finalSizes = centroids.map(() => 0);
  for (let i = 0; i < pixels.length; i += 1) {
    const px = pixels[i];
    let bestIdx = 0;
    let bestDist = dist2(px, centroids[0]);
    for (let j = 1; j < centroids.length; j += 1) {
      const d = dist2(px, centroids[j]);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = j;
      }
    }
    finalSizes[bestIdx] += 1;
  }

  return centroids.map((centroid, i) => ({ centroid, size: finalSizes[i] }));
}

/**
 * Decode a flat pixel buffer (Uint8Array-like or number[]) into `Rgb[]`.
 * Skips fully-transparent pixels (alpha < 16) so cut-out PNGs don't poison
 * the centroids with a giant black cluster.
 */
function decodePixels(
  buffer: ArrayLike<number>,
  channels: PixelChannels,
): Rgb[] {
  const out: Rgb[] = [];
  const len = buffer.length;
  for (let i = 0; i + channels - 1 < len; i += channels) {
    if (channels === 4) {
      const a = buffer[i + 3];
      if (a < 16) continue;
    }
    out.push({ r: buffer[i], g: buffer[i + 1], b: buffer[i + 2] });
  }
  return out;
}

/**
 * Extract 1–3 dominant hex swatches from a flat pixel buffer.
 *
 * Empty / malformed input falls back to a single neutral swatch (`#808080`)
 * so the camera flow never returns zero swatches (which would fail
 * `identifyResultSchema`'s `min(1)` constraint).
 */
export function extractSwatches(
  buffer: ArrayLike<number>,
  options: ExtractSwatchesOptions = {},
): string[] {
  const k = Math.max(1, Math.min(3, options.k ?? 3));
  const channels: PixelChannels = options.channels ?? 4;
  const maxIterations = options.maxIterations ?? 12;

  const pixels = decodePixels(buffer, channels);
  if (pixels.length === 0) {
    return ['#808080'];
  }

  const clusters = kmeans(pixels, k, maxIterations)
    .filter((c) => c.size > 0)
    .sort((a, b) => b.size - a.size);

  if (clusters.length === 0) {
    // Should be unreachable when pixels.length > 0, but defend the contract.
    return ['#808080'];
  }

  return clusters.slice(0, k).map((c) => rgbToHex(c.centroid));
}
