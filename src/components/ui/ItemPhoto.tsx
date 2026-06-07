import { Image } from 'expo-image';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { Colors, Radius } from '@/theme/tokens';

type ItemPhotoProps = ViewProps & {
  /** URI for the item image. If omitted, a placeholder block is shown. */
  uri?: string;
  /** Width of the photo block */
  width?: number;
  /** Height of the photo block */
  height?: number;
};

/**
 * ItemPhoto — rounded photo block for wardrobe items.
 * Shows a mist-colored placeholder when no URI is provided.
 * Replace placeholder by passing a valid `uri` prop in production.
 */
export function ItemPhoto({ uri, width = 120, height = 120, style, ...rest }: ItemPhotoProps) {
  return (
    <View style={[styles.wrapper, { width, height }, style]} {...rest}>
      {uri ? (
        <Image
          source={{ uri }}
          style={styles.image}
          contentFit="cover"
        />
      ) : (
        <View style={[styles.placeholder, { width, height }]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: Radius.item,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    backgroundColor: Colors.mist,
    borderRadius: Radius.item,
  },
});
