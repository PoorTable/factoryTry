/**
 * useGarmentCamera — capture plumbing for the garment camera flow.
 *
 * Wraps a `CameraView` ref (expo-camera) behind a tiny state machine:
 * `'viewfinder'` (live preview) → `takePhoto` → `'frozen'` (captured still)
 * → `retake` → back to `'viewfinder'`. The Camera Capture screen (APP-19)
 * attaches `cameraRef`, `pictureSize`, and `onCameraReady` to its
 * `<CameraView />` and drives the UI from `{ photoUri, state }`.
 */

import { Asset } from 'expo-asset';
import { CameraView } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useCallback, useRef, useState } from 'react';

/**
 * Long-edge cap for captured garment photos. Keeps AI uploads and disk
 * usage sane (per APP-27 spec: ≤1600px long edge).
 */
export const MAX_PHOTO_LONG_EDGE_PX = 1600;

export type GarmentCameraState = 'viewfinder' | 'frozen';

/**
 * Picks the largest available picture size whose long edge fits within
 * MAX_PHOTO_LONG_EDGE_PX. Sizes arrive as `"WIDTHxHEIGHT"` strings from
 * `getAvailablePictureSizesAsync`. Returns `undefined` when nothing
 * parses or fits, letting expo-camera keep its default size.
 */
export function pickConstrainedPictureSize(sizes: string[]): string | undefined {
  let best: { size: string; longEdge: number } | null = null;
  for (const size of sizes) {
    const [width, height] = size.split('x').map(Number);
    if (!Number.isFinite(width) || !Number.isFinite(height)) continue;
    const longEdge = Math.max(width, height);
    if (longEdge > MAX_PHOTO_LONG_EDGE_PX) continue;
    if (!best || longEdge > best.longEdge) {
      best = { size, longEdge };
    }
  }
  return best?.size;
}

/**
 * Dev/simulator fallback: the iOS Simulator has no camera, so capture
 * yields nothing there. In dev builds we fall back to a bundled sample
 * garment image (resolved to a local `file://` URI via expo-asset) so the
 * capture → save → render flow stays demoable and screenshot-reviewable.
 * Returns `null` outside dev or if the asset cannot be resolved.
 */
async function sampleGarmentFallbackUri(): Promise<string | null> {
  if (!__DEV__) return null;
  try {
    const asset = Asset.fromModule(require('@/assets/images/sample-garment.jpg'));
    await asset.downloadAsync();
    return asset.localUri ?? asset.uri;
  } catch {
    return null;
  }
}

export function useGarmentCamera() {
  const cameraRef = useRef<CameraView>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [state, setState] = useState<GarmentCameraState>('viewfinder');
  const [pictureSize, setPictureSize] = useState<string | undefined>(undefined);

  /**
   * Pass to `<CameraView onCameraReady />`. Resolves the ≤1600px picture
   * size once the native camera session is up (sizes are unknown before).
   */
  const onCameraReady = useCallback(async () => {
    const camera = cameraRef.current;
    if (!camera) return;
    try {
      const sizes = await camera.getAvailablePictureSizesAsync();
      setPictureSize(pickConstrainedPictureSize(sizes));
    } catch {
      // Size enumeration is best-effort; the default size still captures.
    }
  }, []);

  /**
   * Freezes the flow on a resolved image URI (from capture or library) and
   * fires the confirm haptic. Both `takePhoto` and `loadPhoto` funnel through
   * here so the downstream identify → save path has a single entry point.
   */
  const commitPhoto = useCallback((uri: string): string => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {
      // Haptics are decorative; ignore devices without support.
    });
    setPhotoUri(uri);
    setState('frozen');
    return uri;
  }, []);

  /**
   * Loads an externally-resolved image URI (e.g. from the photo library
   * picker) into the same `frozen` state a captured frame produces. The
   * caller (capture screen) owns the picker + permission flow; this hook
   * is just the shared funnel that keeps the identify pipeline single-entry.
   */
  const loadPhoto = useCallback(
    (uri: string): string => commitPhoto(uri),
    [commitPhoto],
  );

  /**
   * Captures a still, freezes the flow, and returns the temp URI (camera
   * cache — persist it via photo-store's `savePhoto`). When no camera is
   * available (iOS Simulator) or capture fails, dev builds fall back to
   * the bundled sample garment image; otherwise returns `null`.
   */
  const takePhoto = useCallback(async (): Promise<string | null> => {
    let uri: string | null = null;
    const camera = cameraRef.current;
    if (camera) {
      try {
        const photo = await camera.takePictureAsync({ quality: 0.85, shutterSound: false });
        uri = photo?.uri ?? null;
      } catch {
        uri = null;
      }
    }
    if (!uri) {
      // No camera (iOS Simulator) or capture failed — dev sample fallback.
      uri = await sampleGarmentFallbackUri();
    }
    if (!uri) return null;
    return commitPhoto(uri);
  }, [commitPhoto]);

  /** Discards the frozen still and returns to the live viewfinder. */
  const retake = useCallback(() => {
    setPhotoUri(null);
    setState('viewfinder');
  }, []);

  return {
    cameraRef,
    pictureSize,
    onCameraReady,
    takePhoto,
    loadPhoto,
    retake,
    photoUri,
    state,
  };
}
