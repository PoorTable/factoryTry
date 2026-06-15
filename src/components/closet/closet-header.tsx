import { Image } from 'expo-image';
import { cssInterop } from 'nativewind';
import { Pressable, Text, View } from 'react-native';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { SerifTitle } from '@/components/ui/SerifTitle';
import { Colors } from '@/theme/tokens';

// expo-image is not NativeWind-aware by default; map className → style so this
// file stays className-only (AGENTS.md strict styling rule).
cssInterop(Image, { className: 'style' });

type ClosetHeaderProps = {
  /** Wardrobe size for the `CLOSET · N PIECES` eyebrow — store-derived. */
  pieceCount: number;
};

/**
 * ClosetHeader — top bar of the Wardrobe grid (design: screen-wardrobe.png).
 * Mono eyebrow with the live piece count, serif "Your wardrobe" headline with
 * the load-bearing italic span, and a 38px circular hairline search button.
 */
export function ClosetHeader({ pieceCount }: ClosetHeaderProps) {
  return (
    <View className="flex-row items-end justify-between bg-paper px-screen-h pb-4 pt-2">
      <View className="gap-1">
        <Eyebrow>{`Closet · ${pieceCount} pieces`}</Eyebrow>
        <Text>
          <SerifTitle size="page">Your </SerifTitle>
          <SerifTitle size="page" italic>
            wardrobe
          </SerifTitle>
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Search wardrobe"
        hitSlop={8}
        className="h-[38px] w-[38px] items-center justify-center rounded-full border border-hairline bg-paper active:opacity-70"
      >
        <Image
          source="sf:magnifyingglass"
          tintColor={Colors['ink-soft']}
          className="h-4 w-4"
          accessibilityLabel="Search"
        />
      </Pressable>
    </View>
  );
}
