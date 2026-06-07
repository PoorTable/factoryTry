import { Pressable, StyleSheet, Text, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { Colors, Radius } from '@/theme/tokens';
import { Typography } from '@/theme/typography';

type ChipTone = 'default' | 'ai';

type ChipProps = Omit<PressableProps, 'style'> & {
  children: React.ReactNode;
  /** Whether this chip is the selected/active option */
  active?: boolean;
  /** Visual tone — 'ai' renders paper-glass style with shadow */
  tone?: ChipTone;
  style?: StyleProp<ViewStyle>;
};

/**
 * Chip — pill-shaped selectable tag.
 * - default: outline (stone border, transparent bg)
 * - active: ink fill with paper text
 * - tone="ai": paper-glass + shadow treatment for AI-generated content
 */
export function Chip({ children, active = false, tone = 'default', style, ...rest }: ChipProps) {
  const isAi = tone === 'ai';

  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        active ? styles.active : styles.inactive,
        isAi && styles.ai,
        pressed && styles.pressed,
        style,
      ]}
      {...rest}
    >
      <Text
        style={[
          styles.label,
          active ? styles.labelActive : styles.labelInactive,
          isAi && styles.labelAi,
        ]}
      >
        {children}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 7,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  inactive: {
    backgroundColor: 'transparent',
    borderColor: Colors.stone,
  },
  active: {
    backgroundColor: Colors.ink,
    borderColor: Colors.ink,
  },
  ai: {
    backgroundColor: Colors.paper,
    borderColor: Colors.hairline,
    shadowColor: 'rgba(42,37,32,1)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 11,
    elevation: 5,
  },
  pressed: {
    opacity: 0.75,
  },
  label: {
    ...Typography.chip,
  },
  labelInactive: {
    color: Colors.ink,
  },
  labelActive: {
    color: Colors.paper,
  },
  labelAi: {
    color: Colors['ink-soft'],
  },
});
