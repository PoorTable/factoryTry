import { StyleSheet, View, type ViewProps } from 'react-native';

type SwatchDotsProps = ViewProps & {
  /** Array of hex color strings to render as dots */
  colors: string[];
  /** Diameter of each dot in pixels — defaults to 7 */
  size?: number;
  /** Gap between dots — defaults to 4 */
  gap?: number;
};

/**
 * SwatchDots — a horizontal row of small color circles.
 * Each dot is 7px with a subtle inner stroke (border) for definition.
 */
export function SwatchDots({ colors, size = 7, gap = 4, style, ...rest }: SwatchDotsProps) {
  return (
    <View style={[styles.row, { gap }, style]} {...rest}>
      {colors.map((color, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: color,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  dot: {
    borderWidth: 0.5,
    borderColor: 'rgba(42,37,32,0.12)',
  },
});
