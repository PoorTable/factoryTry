import { cssInterop } from 'nativewind';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { CoachAvatar } from '@/components/ui/CoachAvatar';

// Reanimated views are not NativeWind-aware by default; map className → style
// so this file stays className-only (AGENTS.md strict styling rule).
cssInterop(Animated.View, { className: 'style' });

/** Full bounce cycle per APP-21 spec: 1.2s. */
const CYCLE_MS = 1200;
/** Stagger between the three dots. */
const STAGGER_MS = 150;

function Dot({ delay }: { delay: number }) {
  const offset = useSharedValue(0);

  useEffect(() => {
    offset.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-4, { duration: CYCLE_MS / 4, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: CYCLE_MS / 4, easing: Easing.in(Easing.quad) }),
          withTiming(0, { duration: CYCLE_MS / 2 })
        ),
        -1
      )
    );
  }, [delay, offset]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: offset.value }],
  }));

  return <Animated.View className="h-1.5 w-1.5 rounded-full bg-muted" style={animatedStyle} />;
}

/**
 * TypingIndicator — three bouncing dots in an Iris-style white bubble,
 * shown while a coach request is in flight (design/APP-21: 1.2s loop).
 */
export function TypingIndicator() {
  return (
    <View className="flex-row items-end gap-2 self-start">
      <CoachAvatar size={26} />
      <View className="flex-row items-center gap-1 rounded-2xl rounded-bl-md border border-hairline bg-white px-4 py-3.5">
        <Dot delay={0} />
        <Dot delay={STAGGER_MS} />
        <Dot delay={STAGGER_MS * 2} />
      </View>
    </View>
  );
}
