import Svg, { Circle } from 'react-native-svg';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { Colors } from '@/theme/tokens';
import { Typography } from '@/theme/typography';
import { Text } from 'react-native';

type VibeScoreProps = ViewProps & {
  /** Score from 0–100 */
  score: number;
  /** Diameter of the circular dial — defaults to 64 */
  size?: number;
};

/**
 * VibeScore — a 64px circular dial with an amber ring showing the outfit score.
 * The ring is drawn via SVG arc; the score number sits in the center.
 */
export function VibeScore({ score, size = 64, style, ...rest }: VibeScoreProps) {
  const clampedScore = Math.min(100, Math.max(0, score));
  const strokeWidth = 4;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (clampedScore / 100) * circumference;
  const center = size / 2;

  return (
    <View style={[{ width: size, height: size }, styles.wrapper, style]} {...rest}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        {/* Track ring */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={Colors.hairline}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Amber progress ring */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={Colors.amber}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${progress} ${circumference - progress}`}
          strokeDashoffset={circumference / 4}
          strokeLinecap="round"
          rotation={-90}
          origin={`${center}, ${center}`}
        />
      </Svg>
      <Text style={[Typography.chip, styles.scoreText]}>
        {clampedScore}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    color: Colors.ink,
    fontWeight: '600',
  },
});
