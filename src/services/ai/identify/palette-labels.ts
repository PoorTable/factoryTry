/**
 * Palette-label nearest-match (APP-29).
 *
 * Pure module — given 1–3 hex swatches, return a short palette label like
 * "Warm neutral" or "Cool blue" for the camera screen's palette tag pill.
 *
 * The curated table groups colors into family clusters (warm neutral, cool
 * blue, sage, …) rather than single names. The nearest-match runs against
 * the mean swatch (centroid of the input) so a multi-swatch garment resolves
 * to a single coherent label.
 *
 * Canonical: the design fixture's `paletteLabel` is "Warm neutral" for the
 * swatches `['#D8C3A5', '#B8A285', '#8A6F52']`. GATE-4 pins that mapping.
 */

/** Internal: parsed RGB triple. */
interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** Parse "#RRGGBB" / "#RGB" → Rgb. Returns null on malformed input. */
function parseHex(hex: string): Rgb | null {
  const trimmed = hex.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{6}$/.test(trimmed)) {
    const n = parseInt(trimmed, 16);
    return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
  }
  if (/^[0-9a-fA-F]{3}$/.test(trimmed)) {
    const r = parseInt(trimmed[0] + trimmed[0], 16);
    const g = parseInt(trimmed[1] + trimmed[1], 16);
    const b = parseInt(trimmed[2] + trimmed[2], 16);
    return { r, g, b };
  }
  return null;
}

function dist2(a: Rgb, b: Rgb): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return dr * dr + dg * dg + db * db;
}

/**
 * Curated palette-label table — short, designer-voice labels for the camera
 * tag. Each entry's `hex` is the family centroid the nearest-match compares
 * against. The "Warm neutral" centroid is tuned to the design fixture's
 * three swatches so the canonical "Linen camp shirt" set resolves cleanly.
 *
 * Exported (read-only) so unit tests can document new entries by spot-check.
 */
export const PALETTE_LABEL_TABLE: readonly { label: string; hex: string }[] = [
  // Warm neutrals — design canonical: '#D8C3A5','#B8A285','#8A6F52' → "Warm neutral"
  { label: 'Warm neutral', hex: '#BFA482' },
  { label: 'Cool neutral', hex: '#C7CBD0' },
  { label: 'Soft cream',   hex: '#EFE6D6' },
  // Warm chromatics
  { label: 'Warm earth',   hex: '#8A5A3A' },
  { label: 'Cognac',       hex: '#A35836' },
  { label: 'Mustard',      hex: '#C9A14A' },
  { label: 'Terracotta',   hex: '#C97B5E' },
  // Cool chromatics
  { label: 'Cool blue',    hex: '#3D5A82' },
  { label: 'Slate grey',   hex: '#6E7A88' },
  { label: 'Sage',         hex: '#9CAE8E' },
  { label: 'Forest',       hex: '#2E4A3A' },
  { label: 'Plum',         hex: '#6B4858' },
  // Pure neutrals
  { label: 'Charcoal',     hex: '#3A3A3A' },
  { label: 'Off black',    hex: '#1F1B17' },
  { label: 'Ivory',        hex: '#F4ECDD' },
  // Rich / saturated
  { label: 'Burgundy',     hex: '#6E2A30' },
  { label: 'Navy',         hex: '#1F2A44' },
];

/**
 * Mean of an Rgb list. Returns mid-grey when empty.
 */
function meanRgb(swatches: Rgb[]): Rgb {
  if (swatches.length === 0) return { r: 128, g: 128, b: 128 };
  let r = 0;
  let g = 0;
  let b = 0;
  for (const s of swatches) {
    r += s.r;
    g += s.g;
    b += s.b;
  }
  return { r: r / swatches.length, g: g / swatches.length, b: b / swatches.length };
}

/**
 * Nearest palette label for a list of hex swatches.
 *
 * - Parses each hex, drops malformed entries.
 * - Computes the swatch mean (centroid of the cluster).
 * - Returns the closest curated label by squared RGB distance.
 *
 * Empty / all-malformed input falls back to "Warm neutral" — matches the
 * design fixture, so a botched input never produces a screen-breaking label.
 */
export function nearestPaletteLabel(swatches: readonly string[]): string {
  const parsed: Rgb[] = [];
  for (const hex of swatches) {
    const p = parseHex(hex);
    if (p) parsed.push(p);
  }
  if (parsed.length === 0) return 'Warm neutral';

  const mean = meanRgb(parsed);

  let best = PALETTE_LABEL_TABLE[0];
  let bestDist = Infinity;
  for (const entry of PALETTE_LABEL_TABLE) {
    const ehex = parseHex(entry.hex);
    if (!ehex) continue;
    const d = dist2(mean, ehex);
    if (d < bestDist) {
      bestDist = d;
      best = entry;
    }
  }
  return best.label;
}
