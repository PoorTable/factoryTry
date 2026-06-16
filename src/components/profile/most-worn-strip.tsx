import { Image } from 'expo-image';
import { cssInterop } from 'nativewind';
import { ScrollView, Text, View } from 'react-native';

import type { Item } from '@/types/wardrobe';

// expo-image is not NativeWind-aware by default; map className → style so this
// file stays className-only (AGENTS.md strict styling rule).
cssInterop(Image, { className: 'style' });

const CARD_W = 108;
const CARD_H = 132;

type MostWornStripProps = {
  /** Items sorted by `wornCount` desc — typically `mostWorn(7)` from the store. */
  items: Item[];
};

type RankCardProps = {
  item: Item;
  rank: number;
};

function RankCard({ item, rank }: RankCardProps) {
  const photoFrame = { width: CARD_W, height: CARD_H };
  const placeholderColor = { backgroundColor: item.color };

  return (
    <View className="w-[108px]">
      <View className="relative overflow-hidden rounded-item" style={photoFrame}>
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

        {/* Paper roundel rank — 18px circle top-left of the photo. */}
        <View className="absolute left-2 top-2 h-[18px] w-[18px] items-center justify-center rounded-full bg-paper">
          <Text className="font-mono text-[10px] leading-[10px] text-ink">{rank}</Text>
        </View>
      </View>

      <Text numberOfLines={1} className="mt-2 font-serif text-[13px] leading-4 text-ink">
        {item.name}
      </Text>
      <Text className="font-sans text-[10.5px] text-muted">{`worn ${item.wornCount}×`}</Text>
    </View>
  );
}

/**
 * MostWornStrip — "Most worn this season" horizontal scroll strip
 * (design: screen-profile.png).
 *
 * Section header carries the italic-in-headline brand device — `Most worn`
 * regular + `this season` italic Cormorant — with a `TOP 7` mono label on the
 * trailing edge. Each card shows the item photo (or color placeholder), a
 * paper-colored roundel containing the 1-based rank in the photo's top-left
 * corner, the serif item name and the worn-count caption.
 */
export function MostWornStrip({ items }: MostWornStripProps) {
  return (
    <View className="mt-6">
      <View className="flex-row items-end justify-between px-screen-h">
        <Text>
          <Text className="font-serif text-[22px] leading-[26px] text-ink">Most worn </Text>
          <Text className="font-serif text-[22px] italic leading-[26px] text-ink">this season</Text>
        </Text>
        <Text className="font-mono text-[10px] uppercase tracking-[1.6px] text-muted">
          TOP 7
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-3 px-screen-h pt-3"
      >
        {items.map((item, index) => (
          <RankCard key={item.id} item={item} rank={index + 1} />
        ))}
      </ScrollView>
    </View>
  );
}
