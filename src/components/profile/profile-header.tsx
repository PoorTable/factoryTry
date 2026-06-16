import { Image } from 'expo-image';
import { cssInterop } from 'nativewind';
import { Pressable, Text, View } from 'react-native';

import { Colors } from '@/theme/tokens';

// expo-image is not NativeWind-aware by default; map className → style so this
// file stays className-only (AGENTS.md strict styling rule).
cssInterop(Image, { className: 'style' });

type ProfileHeaderProps = {
  /** Style season label rendered inside the cognac-tinted chip (e.g. "Warm Autumn"). */
  paletteName: string;
  /** Italic muted tagline rendered next to the chip (e.g. "quiet, layered, tactile"). */
  tagline: string;
};

/**
 * ProfileHeader — top of the Style Profile screen (design: screen-profile.png).
 *
 * Renders the mono `STYLE PROFILE` eyebrow, the headline `Iris Calder` where
 * the surname `Calder` is italic Cormorant (the load-bearing italic-in-headline
 * brand device), the cognac-tinted `Warm Autumn` chip with italic muted
 * tagline, and a trailing 36px settings cog button.
 */
export function ProfileHeader({ paletteName, tagline }: ProfileHeaderProps) {
  return (
    <View className="flex-row items-start justify-between px-screen-h pt-2">
      <View className="flex-1 gap-1">
        <Text className="font-mono text-[10px] uppercase tracking-[1.8px] text-muted">
          STYLE PROFILE
        </Text>
        <Text className="mt-0.5">
          <Text className="font-serif text-[34px] leading-[40px] text-ink">Iris </Text>
          <Text className="font-serif text-[34px] italic leading-[40px] text-ink">Calder</Text>
        </Text>

        <View className="mt-2 flex-row items-center gap-3">
          <View className="rounded-pill bg-[rgba(163,88,54,0.10)] px-3 py-1">
            <Text className="font-sans-medium text-[12px] text-cognac-deep">{paletteName}</Text>
          </View>
          <Text
            numberOfLines={1}
            className="flex-1 font-serif text-[14px] italic leading-5 text-muted"
          >
            {tagline}
          </Text>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Settings"
        hitSlop={8}
        className="ml-3 h-[36px] w-[36px] items-center justify-center rounded-full border border-hairline bg-paper active:opacity-70"
      >
        <Image
          source="sf:gearshape"
          tintColor={Colors['ink-soft']}
          className="h-4 w-4"
          accessibilityLabel="Settings cog"
        />
      </Pressable>
    </View>
  );
}
