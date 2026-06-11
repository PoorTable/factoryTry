/**
 * Camera tag mapping — pure helpers between the identify API response and
 * the four floating AI tag pills on the camera screen (APP-19).
 *
 * This module is client-safe (no Anthropic SDK, no Expo APIs, never imported
 * by server routes) and side-effect free: APP-19 owns the tag reveal
 * animation; this file only provides the data and the fixed design positions.
 */

import type { IdentifyResult } from './schemas';

/** The four camera overlay tags, in design reveal order. */
export type CameraTagKey = 'item' | 'mood' | 'palette' | 'season';

/**
 * Fixed overlay position for a tag pill, as percentages (0–100) of the
 * frozen camera frame — `top` from the frame's top edge, `left` from its
 * left edge.
 */
export interface CameraTagPosition {
  top: number;
  left: number;
}

/** One floating tag pill: key, display label, and its fixed overlay position. */
export interface CameraTag {
  key: CameraTagKey;
  label: string;
  position: CameraTagPosition;
}

/**
 * Fixed design positions for the scattered tag pills, taken from the design
 * reference (`docs/design-screenshots/screen-camera.png`): item name upper
 * mid-left, season upper right, mood mid-right, palette lower left.
 */
export const CAMERA_TAG_POSITIONS: Record<CameraTagKey, CameraTagPosition> = {
  item: { top: 24, left: 26 },
  season: { top: 36, left: 64 },
  mood: { top: 47, left: 56 },
  palette: { top: 66, left: 10 },
};

/**
 * Below this confidence the camera flow skips straight to the confirm panel
 * with the name field focused for manual edit (per the APP-29 spec).
 */
export const LOW_CONFIDENCE_THRESHOLD = 0.4;

/** True when the identify result is too uncertain to auto-fill — APP-19 opens manual edit. */
export function isLowConfidence(result: Pick<IdentifyResult, 'confidence'>): boolean {
  return result.confidence < LOW_CONFIDENCE_THRESHOLD;
}

/** Capitalizes a season value for pill display, e.g. `spring` → `Spring`. */
function seasonLabel(season: IdentifyResult['season']): string {
  return season.charAt(0).toUpperCase() + season.slice(1);
}

/**
 * Maps an identify response to the four camera tags at their fixed design
 * positions, in reveal order: item (name) → mood → palette (paletteLabel)
 * → season.
 */
export function mapIdentifyResultToTags(result: IdentifyResult): CameraTag[] {
  return [
    { key: 'item', label: result.name, position: CAMERA_TAG_POSITIONS.item },
    { key: 'mood', label: result.mood, position: CAMERA_TAG_POSITIONS.mood },
    { key: 'palette', label: result.paletteLabel, position: CAMERA_TAG_POSITIONS.palette },
    { key: 'season', label: seasonLabel(result.season), position: CAMERA_TAG_POSITIONS.season },
  ];
}
