import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import { cssInterop } from 'nativewind';
import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';

import { CameraPermissionDenied } from '@/components/camera-permission-denied';
import { useGarmentCamera } from '@/hooks/use-garment-camera';

// Third-party views are not NativeWind-aware by default; map className → style
// so this screen stays className-only (AGENTS.md strict styling rule).
cssInterop(CameraView, { className: 'style' });
cssInterop(Image, { className: 'style' });

/**
 * Capture route — the camera infrastructure surface for APP-27.
 *
 * Owns the permission flow (request → denied state → settings deep link)
 * and a minimal viewfinder/frozen capture loop driven by useGarmentCamera.
 * APP-19 (Camera Capture + AI Tagging) builds its full UI on top of this
 * plumbing; until then this screen keeps the flow demoable end to end —
 * including the simulator sample-garment fallback.
 */
export default function CaptureScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const { cameraRef, pictureSize, onCameraReady, takePhoto, retake, photoUri, state } =
    useGarmentCamera();

  // First visit: fire the system permission prompt once it can be shown.
  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  // Permission still resolving, or the system prompt is on screen.
  if (!permission || (!permission.granted && permission.canAskAgain)) {
    return <View className="flex-1 bg-paper" />;
  }

  if (!permission.granted) {
    return <CameraPermissionDenied />;
  }

  return (
    <View className="flex-1 bg-paper">
      {state === 'viewfinder' ? (
        <CameraView
          ref={cameraRef}
          facing="back"
          pictureSize={pictureSize}
          onCameraReady={onCameraReady}
          className="flex-1"
        />
      ) : (
        <View className="flex-1 items-center justify-center px-screen-h">
          {photoUri ? (
            <Image
              source={{ uri: photoUri }}
              contentFit="cover"
              accessibilityLabel="Captured garment photo"
              className="aspect-[3/4] w-full rounded-item"
            />
          ) : null}
        </View>
      )}

      <View className="items-center px-screen-h pb-14 pt-5">
        {state === 'viewfinder' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Take photo"
            hitSlop={12}
            onPress={() => {
              takePhoto().catch(() => {
                // Capture is best-effort; the hook already swallows errors.
              });
            }}
            className="rounded-pill border border-hairline bg-paper-2 px-6 py-3 active:opacity-70"
          >
            <Text className="font-mono text-[11px] uppercase tracking-[1.6px] text-cognac">
              Take photo
            </Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retake photo"
            hitSlop={12}
            onPress={retake}
            className="rounded-pill border border-hairline bg-paper-2 px-6 py-3 active:opacity-70"
          >
            <Text className="font-mono text-[11px] uppercase tracking-[1.6px] text-cognac">
              Retake
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
