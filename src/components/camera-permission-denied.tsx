import * as Linking from 'expo-linking';
import { Pressable, Text, View } from 'react-native';

/**
 * CameraPermissionDenied — graceful denied state for the garment camera.
 * Paper background, serif explanation, and a settings deep link so the
 * user can re-enable camera access. Rendered by the capture flow
 * (APP-19) whenever camera permission has been refused.
 */
export function CameraPermissionDenied() {
  return (
    <View className="flex-1 items-center justify-center bg-paper px-screen-h">
      <Text className="font-mono text-[10px] uppercase tracking-[1.6px] text-muted">
        Camera access
      </Text>
      <Text className="mt-3 text-center font-serif text-[26px] leading-8 text-ink">
        Wardrobe needs your camera
      </Text>
      <Text className="mt-2 text-center font-serif text-[17px] leading-6 text-ink-soft">
        To photograph garments and add them to your closet, allow camera
        access in Settings.
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open Settings"
        hitSlop={12}
        onPress={() => {
          Linking.openSettings().catch(() => {
            // Settings deep link is best-effort; nothing to recover here.
          });
        }}
        className="mt-6 rounded-pill border border-hairline bg-paper-2 px-5 py-2.5 active:opacity-70"
      >
        <Text className="font-mono text-[11px] uppercase tracking-[1.6px] text-cognac">
          Open Settings
        </Text>
      </Pressable>
    </View>
  );
}
