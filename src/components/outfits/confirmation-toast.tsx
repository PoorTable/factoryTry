import { useEffect } from 'react';
import { Text } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cssInterop } from 'nativewind';

// SafeAreaView and Animated.View are not NativeWind-aware by default; map
// className → style so this file stays className-only (AGENTS.md strict rule).
cssInterop(SafeAreaView, { className: 'style' });
cssInterop(Animated.View, { className: 'style' });

type ConfirmationToastProps = {
  /** Toast copy (e.g. "Saved \"Quiet luxury\""). When non-null, the toast slides up. */
  message: string | null;
  onHide: () => void;
};

/** Fade + lift duration; toast holds for 1500ms then unmounts. */
const FADE_MS = 220;
const HOLD_MS = 1500;

/**
 * ConfirmationToast — cognac pill that slides up over the tab bar after a
 * Save look confirmation (design: cognac accent per AGENTS.md / Colors.cognac).
 *
 * The parent passes `message` to summon and a `onHide` callback that fires
 * after the fade-out completes — typically the parent then clears its
 * `toastMessage` state.
 *
 * Uses `react-native-reanimated` shared values for the slide-in / hold /
 * slide-out timeline, so the toast never blocks input on the screen below.
 */
export function ConfirmationToast({ message, onHide }: ConfirmationToastProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (message === null) return;
    progress.value = withTiming(1, {
      duration: FADE_MS,
      easing: Easing.out(Easing.cubic),
    });
    progress.value = withDelay(
      FADE_MS + HOLD_MS,
      withTiming(
        0,
        { duration: FADE_MS, easing: Easing.in(Easing.cubic) },
        (finished) => {
          'worklet';
          if (finished) {
            // Bridge back to JS so the parent can null `message`.
            runOnJS(onHide)();
          }
        }
      )
    );
    // We intentionally do NOT include `progress` in deps — the shared value
    // identity is stable for the lifetime of the component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 24 }],
  }));

  if (message === null) return null;

  return (
    <SafeAreaView
      edges={['bottom']}
      pointerEvents="none"
      className="absolute bottom-0 left-0 right-0 items-center"
    >
      <Animated.View
        style={animatedStyle}
        className="mb-[96px] rounded-pill bg-cognac px-5 py-2.5 shadow-[0_10px_24px_rgba(163,88,54,0.35)]"
      >
        <Text className="font-sans text-[13px] font-medium text-paper">
          {message}
        </Text>
      </Animated.View>
    </SafeAreaView>
  );
}
