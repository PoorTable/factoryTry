import { Image } from 'expo-image';
import { cssInterop } from 'nativewind';
import { Alert, Pressable, Text, View } from 'react-native';

import { useWardrobeStore } from '@/store/wardrobe-store';
import type { Item, Outfit } from '@/types/wardrobe';

// expo-image is not NativeWind-aware by default; map className → style so
// this file stays className-only (AGENTS.md strict styling rule).
cssInterop(Image, { className: 'style' });

const THUMB_W = 56;
const THUMB_H = 70;

type SavedOutfitsListProps = {
  /** Fires after "Wear today" so the parent can show a cognac confirmation toast. */
  onWornToast: (name: string) => void;
  /** Fires after "Load into builder" so the parent can navigate / scroll. */
  onLoaded?: (outfit: Outfit) => void;
};

type SavedOutfitRowProps = {
  outfit: Outfit;
  items: Item[];
  onLoad: () => void;
  onWear: () => void;
  onDelete: () => void;
};

/** ItemThumb — 56×70 cover image OR flat-color placeholder fallback. */
function ItemThumb({ item }: { item: Item }) {
  const frame = { width: THUMB_W, height: THUMB_H };
  const placeholder = { backgroundColor: item.color };
  if (item.photoUri) {
    return (
      <Image
        source={{ uri: item.photoUri }}
        contentFit="cover"
        accessibilityLabel={item.name}
        className="rounded-item"
        style={frame}
      />
    );
  }
  return <View accessibilityLabel={item.name} className="rounded-item" style={[frame, placeholder]} />;
}

/**
 * SavedOutfitRow — one saved-look row inside the list. Layout:
 *   thumbs (up to 3) │ name + vibe pill │ Wear today
 * Long-press exposes the destructive Delete action via a native Alert.
 *
 * Tap loads the outfit into the Builder draft (sets each slot in order).
 * "Wear today" calls `wearOutfit(id)` and fires `onWornToast(name)` so the
 * parent can show the cognac confirmation toast.
 */
function SavedOutfitRow({ outfit, items, onLoad, onWear, onDelete }: SavedOutfitRowProps) {
  const byId = new Map(items.map((item) => [item.id, item]));
  const thumbs = outfit.itemIds
    .slice(0, 3)
    .map((id) => byId.get(id))
    .filter((item): item is Item => item !== undefined);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Load saved look ${outfit.name}`}
      accessibilityHint="Long-press to delete"
      onPress={onLoad}
      onLongPress={onDelete}
      className="mb-3 rounded-card border border-hairline bg-paper px-3 py-3 active:opacity-90"
    >
      <View className="flex-row items-center gap-3">
        {/* 3-thumbnail row (left). */}
        <View className="flex-row items-center gap-1.5">
          {thumbs.map((item) => (
            <ItemThumb key={item.id} item={item} />
          ))}
        </View>

        {/* Name + vibe pill + worn meta (middle, flexes). */}
        <View className="flex-1">
          <Text numberOfLines={1} className="font-serif text-[18px] leading-6 text-ink">
            {outfit.name}
          </Text>
          <View className="mt-1.5 flex-row items-center gap-2">
            <View className="flex-row items-center gap-1 rounded-pill bg-amber/15 px-2 py-0.5">
              <View className="h-1 w-1 rounded-full bg-amber" />
              <Text className="font-sans text-[11px] font-medium text-amber">
                {outfit.vibe}
              </Text>
            </View>
            {outfit.lastWornAt ? (
              <Text className="font-mono text-[9px] uppercase tracking-[1.2px] text-muted">
                LAST WORN
              </Text>
            ) : null}
          </View>
        </View>

        {/* Wear today (right). Calls wearOutfit + fires the toast in the parent. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Wear ${outfit.name} today`}
          hitSlop={6}
          onPress={onWear}
          className="rounded-pill border border-cognac/50 bg-paper px-3 py-2 active:opacity-70"
        >
          <Text className="font-sans text-[11px] font-medium text-cognac">
            Wear today
          </Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

/**
 * SavedOutfitsList — the lightweight section the Outfits tab renders above
 * the Builder area (design: cognac "Save look" CTA produces these rows).
 *
 * Reads `outfits` + `items` from the persisted store and renders each saved
 * look with a 3-thumbnail row, name, vibe pill, and "Wear today" action.
 * Tapping a row loads the outfit into the Builder draft (`setSlot` calls,
 * which trigger vibe recompute via the engine — APP-31). Long-press shows a
 * native confirm dialog and calls `deleteOutfit(id)` on accept.
 *
 * Items are never removed when an outfit is deleted (APP-33 acceptance).
 */
export function SavedOutfitsList({ onWornToast, onLoaded }: SavedOutfitsListProps) {
  const outfits = useWardrobeStore((state) => state.outfits);
  const items = useWardrobeStore((state) => state.items);
  const setSlot = useWardrobeStore((state) => state.setSlot);
  const resetDraft = useWardrobeStore((state) => state.resetDraft);
  const wearOutfit = useWardrobeStore((state) => state.wearOutfit);
  const deleteOutfit = useWardrobeStore((state) => state.deleteOutfit);

  if (outfits.length === 0) {
    return (
      <View className="mt-2 rounded-card border border-hairline bg-mist px-4 py-5">
        <Text className="font-mono text-[10px] tracking-[1.6px] text-muted">
          SAVED LOOKS
        </Text>
        <Text className="mt-2 font-serif text-[16px] italic leading-5 text-ink-soft">
          Build a look and tap “Save look” — it lands here.
        </Text>
      </View>
    );
  }

  // Most recently saved first.
  const ordered = [...outfits].sort((a, b) =>
    a.savedAt < b.savedAt ? 1 : a.savedAt > b.savedAt ? -1 : 0
  );

  const handleLoad = (outfit: Outfit) => {
    // Resolve each slot from the outfit's itemIds by category.
    const byId = new Map(items.map((item) => [item.id, item]));
    resetDraft();
    let extraId: string | null = null;
    for (const id of outfit.itemIds) {
      const item = byId.get(id);
      if (!item) continue;
      switch (item.category) {
        case 'Tops':
          setSlot('top', item.id);
          break;
        case 'Bottoms':
          setSlot('bottom', item.id);
          break;
        case 'Shoes':
          setSlot('shoes', item.id);
          break;
        case 'Outerwear':
        case 'Accessories':
          if (!extraId) extraId = item.id;
          break;
      }
    }
    if (extraId) setSlot('extra', extraId);
    onLoaded?.(outfit);
  };

  const handleWear = (outfit: Outfit) => {
    wearOutfit(outfit.id);
    onWornToast(`Worn today · ${outfit.name}`);
  };

  const handleDelete = (outfit: Outfit) => {
    Alert.alert(
      `Delete “${outfit.name}”?`,
      'The outfit will be removed. Items in your wardrobe stay.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteOutfit(outfit.id),
        },
      ]
    );
  };

  return (
    <View className="mt-2">
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="font-mono text-[10px] tracking-[1.6px] text-muted">
          SAVED LOOKS
        </Text>
        <Text className="font-mono text-[10px] tracking-[1.6px] text-muted">
          {`${outfits.length} TOTAL`}
        </Text>
      </View>
      {ordered.map((outfit) => (
        <SavedOutfitRow
          key={outfit.id}
          outfit={outfit}
          items={items}
          onLoad={() => handleLoad(outfit)}
          onWear={() => handleWear(outfit)}
          onDelete={() => handleDelete(outfit)}
        />
      ))}
    </View>
  );
}
