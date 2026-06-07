import { StyleSheet, Text, View, type ViewProps } from 'react-native';

import { Colors } from '@/theme/tokens';

type CoachAvatarProps = ViewProps & {
  /** Diameter — defaults to 40 */
  size?: number;
};

/**
 * CoachAvatar — 40px brand mark roundel for the AI style coach.
 * Renders a solid cognac circle with an italic "I" in the center.
 * Uses cognac as the dominant background (design allows gradient exception
 * for CoachAvatar; we approximate with a solid cognac fill layered with
 * a slightly lighter inner circle to suggest depth without a gradient lib).
 */
export function CoachAvatar({ size = 40, style, ...rest }: CoachAvatarProps) {
  const fontSize = size * 0.45;

  return (
    <View
      style={[
        styles.outer,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: Colors['cognac-deep'],
        },
        style,
      ]}
      {...rest}
    >
      {/* Inner circle for terracotta center highlight */}
      <View
        style={[
          styles.inner,
          {
            width: size * 0.7,
            height: size * 0.7,
            borderRadius: (size * 0.7) / 2,
            backgroundColor: Colors.terracotta,
          },
        ]}
      />
      <Text style={[styles.glyph, { fontSize, lineHeight: size }]}>I</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  inner: {
    position: 'absolute',
  },
  glyph: {
    color: '#FFFFFF',
    fontStyle: 'italic',
    fontWeight: '600',
    textAlign: 'center',
    zIndex: 1,
  },
});
