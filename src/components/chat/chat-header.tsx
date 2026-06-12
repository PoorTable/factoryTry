import { Image } from 'expo-image';
import { cssInterop } from 'nativewind';
import { Pressable, Text, View } from 'react-native';

import { CoachAvatar } from '@/components/ui/CoachAvatar';
import { SerifTitle } from '@/components/ui/SerifTitle';
import { Colors } from '@/theme/tokens';

// expo-image is not NativeWind-aware by default; map className → style so this
// file stays className-only (AGENTS.md strict styling rule).
cssInterop(Image, { className: 'style' });

type ChatHeaderProps = {
  /** Wardrobe size for the "knows your N pieces" status line. */
  pieceCount: number;
};

/**
 * ChatHeader — Iris identity bar for the Coach tab (design: screen-chat.png).
 * Cognac roundel avatar, serif "Iris" with italic "your style coach", a
 * green-dot status line, and an ellipsis menu affordance on the right.
 */
export function ChatHeader({ pieceCount }: ChatHeaderProps) {
  return (
    <View className="flex-row items-center gap-3 border-b border-hairline bg-paper px-screen-h pb-3 pt-1">
      <CoachAvatar size={42} />

      <View className="flex-1">
        <View className="flex-row items-baseline gap-1.5">
          <SerifTitle size="section">Iris</SerifTitle>
          <SerifTitle size="item" italic className="text-muted">
            your style coach
          </SerifTitle>
        </View>
        <View className="mt-0.5 flex-row items-center gap-1.5">
          <View className="h-1.5 w-1.5 rounded-full bg-sage" />
          <Text className="font-sans text-[12px] text-muted">
            knows your {pieceCount} pieces
          </Text>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Coach options"
        hitSlop={8}
        className="h-9 w-9 items-center justify-center rounded-full border border-hairline bg-white active:opacity-70"
      >
        <Image
          source="sf:ellipsis"
          tintColor={Colors['ink-soft']}
          className="h-3.5 w-3.5"
          accessibilityLabel="More options"
        />
      </Pressable>
    </View>
  );
}
