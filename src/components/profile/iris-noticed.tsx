import { Image } from 'expo-image';
import { cssInterop } from 'nativewind';
import { Text, View } from 'react-native';

import { Colors } from '@/theme/tokens';

// expo-image is not NativeWind-aware by default; map className → style so this
// file stays className-only (AGENTS.md strict styling rule).
cssInterop(Image, { className: 'style' });

type IrisNoticedProps = {
  /** Insight copy — `profile.insight` from the store. */
  insight: string;
};

/**
 * IrisNoticed — mist-bg callout card at the bottom of the Style Profile
 * (design: screen-profile.png).
 *
 * 36px paper roundel with a cognac-stroked star icon, mono `IRIS NOTICED`
 * eyebrow, and the italic Cormorant insight copy sourced from `profile.insight`.
 * Mist background + stone border anchors the section visually as a soft
 * "noticed by Iris" voice.
 */
export function IrisNoticed({ insight }: IrisNoticedProps) {
  return (
    <View className="mx-screen-h mb-6 mt-6 rounded-card border border-stone bg-mist p-4">
      <View className="flex-row items-start gap-3">
        <View className="h-9 w-9 items-center justify-center rounded-full bg-paper">
          <Image
            source="sf:star"
            tintColor={Colors.cognac}
            className="h-4 w-4"
            accessibilityLabel="Iris star"
          />
        </View>
        <View className="flex-1">
          <Text className="font-mono text-[9px] uppercase tracking-[1.6px] text-muted">
            IRIS NOTICED
          </Text>
          <Text className="mt-1 font-serif text-[16px] italic leading-[22px] text-ink-soft">
            {insight}
          </Text>
        </View>
      </View>
    </View>
  );
}
