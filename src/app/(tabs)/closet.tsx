import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { cssInterop } from 'nativewind';
import { useState } from 'react';
import { Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useShallow } from 'zustand/react/shallow';

import { CategoryChipRow } from '@/components/closet/category-chip-row';
import { ClosetHeader } from '@/components/closet/closet-header';
import { MasonryGrid } from '@/components/closet/masonry-grid';
import { useWardrobeStore } from '@/store/wardrobe-store';
import { Colors } from '@/theme/tokens';
import type { Category } from '@/types/wardrobe';

// SafeAreaView and expo-image are not NativeWind-aware by default; map
// className → style so this screen stays className-only (AGENTS.md strict
// styling rule).
cssInterop(SafeAreaView, { className: 'style' });
cssInterop(Image, { className: 'style' });

export default function ClosetScreen() {
  const [filter, setFilter] = useState<Category | null>(null);

  const pieceCount = useWardrobeStore((state) => state.totalCount());
  // byCategory returns a fresh array per call; useShallow keeps the snapshot
  // reference stable across renders so zustand v5's Object.is check passes.
  const visibleItems = useWardrobeStore(useShallow((state) => state.byCategory(filter)));

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-paper">
      <ClosetHeader pieceCount={pieceCount} />

      <CategoryChipRow selected={filter} onSelect={setFilter} />

      <MasonryGrid items={visibleItems} />

      {/* Cognac FAB — opens the camera capture flow (design: screen-wardrobe.png,
          58px circle 22px from right / 108px from bottom). */}
      <Link href="/capture" asChild>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add garment with camera"
          hitSlop={8}
          className="absolute bottom-[108px] right-[22px] h-[58px] w-[58px] items-center justify-center rounded-full bg-cognac shadow-[0_10px_24px_rgba(163,88,54,0.35),0_2px_4px_rgba(42,37,32,0.10)] active:opacity-90"
        >
          <Image
            source="sf:plus"
            tintColor={Colors.paper}
            className="h-6 w-6"
            accessibilityLabel="Add"
          />
        </Pressable>
      </Link>
    </SafeAreaView>
  );
}
