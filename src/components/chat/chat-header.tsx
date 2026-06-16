import { LinearGradient } from 'expo-linear-gradient';
import { cssInterop } from 'nativewind';
import { Pressable, Text, View } from 'react-native';

// LinearGradient is not NativeWind-aware by default; map className → style so
// this file stays className-only (AGENTS.md strict styling rule).
cssInterop(LinearGradient, { className: 'style' });

type ChatHeaderProps = {
  /** Wardrobe size for the "knows your N pieces" status line. */
  pieceCount: number;
};

/**
 * ChatHeader — Iris identity bar for the Coach tab (design: screen-chat.png).
 *
 * The CoachAvatar is rendered inline here using a three-stop LinearGradient
 * (terracotta → cognac → cognac-deep) — the design system's only gradient
 * exception (APP-25). The italic Cormorant "I" sits centered on top.
 */
export function ChatHeader({ pieceCount }: ChatHeaderProps) {
  return (
    <View className="flex-row items-center gap-3 border-b border-hairline bg-paper px-screen-h pb-3 pt-1">
      {/* CoachAvatar — 40px round gradient roundel with italic Cormorant "I" */}
      <LinearGradient
        // terracotta → cognac → cognac-deep (APP-25's only gradient exception).
        colors={['#C97B5E', '#A35836', '#8A4426']}
        start={{ x: 0.2, y: 0.1 }}
        end={{ x: 0.9, y: 1 }}
        className="h-10 w-10 items-center justify-center rounded-full"
      >
        <Text className="font-serif italic text-[20px] leading-[22px] text-paper">I</Text>
      </LinearGradient>

      <View className="flex-1">
        <View className="flex-row items-baseline gap-1.5">
          <Text className="font-serif text-[19px] leading-[22px] text-ink">Iris</Text>
          <Text className="font-serif italic text-[11px] leading-[14px] text-muted">
            your style coach
          </Text>
        </View>
        <View className="mt-0.5 flex-row items-center gap-1.5">
          <View className="h-1.5 w-1.5 rounded-full bg-sage" />
          <Text className="font-sans text-[12px] text-muted">
            {`knows your ${pieceCount} pieces`}
          </Text>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Coach options"
        hitSlop={8}
        className="h-8 w-8 items-center justify-center rounded-full border border-hairline bg-white active:opacity-70"
      >
        <Text className="font-sans text-[16px] leading-[16px] text-ink-soft">⋯</Text>
      </Pressable>
    </View>
  );
}
