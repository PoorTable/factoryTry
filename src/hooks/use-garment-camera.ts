/**
 * useGarmentCamera — capture plumbing for the garment camera flow.
 *
 * Wraps a `CameraView` ref (expo-camera) behind a tiny state machine:
 * `'viewfinder'` (live preview) → `takePhoto` → `'frozen'` (captured still)
 * → `retake` → back to `'viewfinder'`. The Camera Capture screen (APP-19)
 * attaches `cameraRef`, `pictureSize`, and `onCameraReady` to its
 * `<CameraView />` and drives the UI from `{ photoUri, state }`.
 */

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
   * Captures a still, freezes the flow, and returns the temp URI (camera
   * cache — persist it via photo-store's `savePhoto`). Returns `null` if
   * the camera is not mounted/ready or capture fails.
   */
  const takePhoto = useCallback(async (): Promise<string | null> => {
    const camera = cameraRef.current;
    if (!camera) return null;
    try {
      const photo = await camera.takePictureAsync({ quality: 0.85, shutterSound: false });
      if (!photo?.uri) return null;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {
        // Haptics are decorative; ignore devices without support.
      });
      setPhotoUri(photo.uri);
      setState('frozen');
      return photo.uri;
    } catch {
      return null;
    }
  }, []);

  /** Discards the frozen still and returns to the live viewfinder. */
  const retake = useCallback(() => {
    setPhotoUri(null);
    setState('viewfinder');
  }, []);

  return { cameraRef, pictureSize, onCameraReady, takePhoto, retake, photoUri, state };
}
