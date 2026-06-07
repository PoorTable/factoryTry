import { Text, type TextProps } from 'react-native';

import { Colors } from '@/theme/tokens';
import { Typography } from '@/theme/typography';

type EyebrowProps = TextProps & {
  children: React.ReactNode;
};

/**
 * Eyebrow label — JetBrains Mono, 10px, uppercase, 1.6 letter-spacing.
 * Used for section labels and category callouts throughout the app.
 */
export function Eyebrow({ children, style, ...rest }: EyebrowProps) {
  return (
    <Text
      style={[
        Typography.eyebrow,
        { color: Colors.muted },
        style,
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
}
