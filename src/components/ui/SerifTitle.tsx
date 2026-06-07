import { Text, type TextStyle, type TextProps } from 'react-native';

import { Colors } from '@/theme/tokens';
import { FontFamily, Typography } from '@/theme/typography';

type SerifTitleSize = 'hero' | 'page' | 'section' | 'item';

type SerifTitleProps = TextProps & {
  children: React.ReactNode;
  /** Size variant — defaults to 'page' */
  size?: SerifTitleSize;
  /** Render in italic variant */
  italic?: boolean;
};

const sizeStyles: Record<SerifTitleSize, TextStyle> = {
  hero: Typography.heroTitle,
  page: Typography.pageTitle,
  section: Typography.sectionTitle,
  item: Typography.itemName,
};

/**
 * SerifTitle — Cormorant Garamond 500, configurable size and italic variant.
 * The italic-second-word headline pattern (`Your *wardrobe*`) is load-bearing;
 * use `italic` prop on a second SerifTitle span inside a Text parent.
 */
export function SerifTitle({ children, size = 'page', italic = false, style, ...rest }: SerifTitleProps) {
  const sizeStyle = sizeStyles[size];
  const fontFamily = italic ? FontFamily.serifItalic : FontFamily.serif;

  return (
    <Text
      style={[
        sizeStyle,
        { fontFamily, color: Colors.ink },
        style,
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
}
