import { type PropsWithChildren } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { Colors, Radius, Shadows } from '@/theme/tokens';

type SoftCardProps = PropsWithChildren<ViewProps>;

/**
 * SoftCard — 18px-radius white card with hairline border and resting shadow.
 * The canonical container for closet items, outfit suggestions, stat blocks, etc.
 */
export function SoftCard({ children, style, ...rest }: SoftCardProps) {
  return (
    <View style={[styles.card, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.card,
    backgroundColor: Colors.paper,
    borderWidth: 1,
    borderColor: Colors.hairline,
    ...Shadows.card,
  },
});
