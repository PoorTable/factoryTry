import { Image } from 'expo-image';
import { cssInterop } from 'nativewind';
import { Pressable, Text, View } from 'react-native';

import { useWardrobeStore } from '@/store/wardrobe-store';
import { Colors } from '@/theme/tokens';
import type { Item } from '@/types/wardrobe';

// expo-image is not NativeWind-aware by default; map className → style so this
// file stays className-only (AGENTS.md strict styling rule).
cssInterop(Image, { className: 'style' });

type ItemCardProps = {
  item: Item;
  /** Masonry photo height (160–280px), computed by the grid from item data. */
  photoHeight: number;
};

/**
 * ItemCard — one wardrobe card of the masonry grid (design:
 * screen-wardrobe.png). Photo block with 14px radius and a mono caps category
 * overlay, serif item name, then swatch dots (left) + `worn N×` (right).
 * When `photoUri` is null the block renders the flat `item.color` placeholder.
 * Favorited items show a cognac heart in a paper-glass roundel at the photo's
 * top-right; pressing it calls the store's `toggleFavorite(id)`.
 */
export function ItemCard({ item, photoHeight }: ItemCardProps) {
  const toggleFavorite = useWardrobeStore((state) => state.toggleFavorite);

  // Runtime, data-driven values — no static Tailwind class can express the
  // per-item masonry height or hex colors; layout, radius, and typography
  // stay in className (pattern: chat/outfit-card-bubble.tsx).
  const photoFrame = { height: photoHeight };
  const placeholderColor = { backgroundColor: item.color };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.name}
      className="active:scale-[0.97]"
    >
      <View className="overflow-hidden rounded-item" style={photoFrame}>
        {item.photoUri ? (
          <Image
            source={{ uri: item.photoUri }}
            contentFit="cover"
            accessibilityLabel={item.name}
            className="h-full w-full"
          />
        ) : (
          <View className="h-full w-full" style={placeholderColor} />
        )}
        <Text className="absolute bottom-2 left-2.5 font-mono text-[9px] uppercase tracking-[1.2px] text-paper/80">
          {item.category}
        </Text>
        {item.isFavorite ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Unfavorite ${item.name}`}
            hitSlop={8}
            onPress={() => toggleFavorite(item.id)}
            className="absolute right-2 top-2 h-7 w-7 items-center justify-center rounded-full bg-paper/85 active:opacity-70"
          >
            <Image
              source="sf:heart.fill"
              tintColor={Colors.cognac}
              className="h-[13px] w-[13px]"
              accessibilityLabel="Favorite"
            />
          </Pressable>
        ) : null}
      </View>

      <Text numberOfLines={1} className="mt-2 font-serif text-[16px] leading-5 text-ink">
        {item.name}
      </Text>

      <View className="mt-1 flex-row items-center justify-between">
        <View className="flex-row items-center gap-1">
          {item.swatches.map((hex, index) => {
            const dotColor = { backgroundColor: hex };
            return (
              <View
                key={`${hex}-${index}`}
                accessibilityLabel={`Swatch ${hex}`}
                className="h-[7px] w-[7px] rounded-full border-[0.5px] border-ink/10"
                style={dotColor}
              />
            );
          })}
        </View>
        <Text className="font-sans text-[10px] text-muted">{`worn ${item.wornCount}×`}</Text>
      </View>
    </Pressable>
  );
}
