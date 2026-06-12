import { Image } from 'expo-image';
import { cssInterop } from 'nativewind';
import { Pressable, Text, View } from 'react-native';

import { SerifTitle } from '@/components/ui/SerifTitle';
import type { Item } from '@/types/wardrobe';

// expo-image is not NativeWind-aware by default; map className → style so this
// file stays className-only (AGENTS.md strict styling rule).
cssInterop(Image, { className: 'style' });

type OutfitCardBubbleProps = {
  /** Proposal name, e.g. "Quiet luxury". */
  name: string;
  /** Vibe score 0–100, shown in the gold pill. */
  vibe: number;
  note?: string;
  /** Resolved wardrobe items for the proposal's itemIds, in order. */
  items: Item[];
  /** Whether this proposal has already been saved via "Save look". */
  saved: boolean;
  onSaveLook: () => void;
};

/**
 * OutfitCardBubble — Iris outfit proposal card (design: screen-chat.png).
 * Three rounded item slots, serif title with the gold vibe pill, the note,
 * and the "Save look" / "Try on" action row. `onSaveLook` is the ONLY place
 * a proposal is persisted (store `saveOutfit`); receipt never saves.
 */
export function OutfitCardBubble({
  name,
  vibe,
  note,
  items,
  saved,
  onSaveLook,
}: OutfitCardBubbleProps) {
  return (
    <View className="ml-9 max-w-[88%] self-start rounded-card border border-hairline bg-white p-3">
      <View className="flex-row gap-2">
        {items.map((item) => {
          // Runtime, data-driven hex — no Tailwind class can express it, so
          // the flat-color placeholder goes through a computed style value;
          // all layout/spacing stays in className.
          const slotColor = { backgroundColor: item.color };
          return item.photoUri ? (
            <Image
              key={item.id}
              source={{ uri: item.photoUri }}
              contentFit="cover"
              accessibilityLabel={item.name}
              className="h-24 flex-1 rounded-item"
            />
          ) : (
            <View
              key={item.id}
              accessibilityLabel={item.name}
              className="h-24 flex-1 rounded-item"
              style={slotColor}
            />
          );
        })}
      </View>

      <View className="mt-3 flex-row items-center justify-between">
        <SerifTitle size="section">{name}</SerifTitle>
        <View className="flex-row items-center gap-1 rounded-pill bg-amber/15 px-2.5 py-1">
          <View className="h-1.5 w-1.5 rounded-full bg-amber" />
          <Text className="font-sans text-[12px] font-medium text-amber">{vibe}</Text>
        </View>
      </View>

      {note ? (
        <Text className="mt-1 font-sans text-[13px] leading-5 text-ink-soft">{note}</Text>
      ) : null}

      <View className="mt-3 flex-row items-center gap-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={saved ? 'Look saved' : 'Save look'}
          disabled={saved}
          onPress={onSaveLook}
          className="flex-1 items-center rounded-pill bg-ink py-2.5 active:opacity-80 disabled:opacity-60"
        >
          <Text className="font-sans text-[13px] font-medium text-paper">
            {saved ? 'Saved' : 'Save look'}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Try on"
          className="items-center rounded-pill border border-stone px-5 py-2.5 active:opacity-70"
        >
          <Text className="font-sans text-[13px] font-medium text-ink">Try on</Text>
        </Pressable>
      </View>
    </View>
  );
}
