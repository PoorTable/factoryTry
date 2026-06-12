import { Link } from 'expo-router';
import { cssInterop } from 'nativewind';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useShallow } from 'zustand/react/shallow';

import { CategoryChipRow } from '@/components/closet/category-chip-row';
import { ClosetHeader } from '@/components/closet/closet-header';
import { MasonryGrid } from '@/components/closet/masonry-grid';
import { useWardrobeStore } from '@/store/wardrobe-store';
import type { Category } from '@/types/wardrobe';

// SafeAreaView is not NativeWind-aware by default; map className → style so
// this screen stays className-only (AGENTS.md strict styling rule).
cssInterop(SafeAreaView, { className: 'style' });

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

      {/* Temporary camera entry point (APP-27 infrastructure); the cognac FAB
          lands in a later gate of APP-18. */}
      <View className="items-center pb-6">
        <Link href="/capture" asChild>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add garment with camera"
            hitSlop={12}
            className="rounded-pill border border-hairline bg-paper-2 px-5 py-2.5 active:opacity-70"
          >
            <Text className="font-mono text-[11px] uppercase tracking-[1.6px] text-cognac">
              Add with camera
            </Text>
          </Pressable>
        </Link>
      </View>
    </SafeAreaView>
  );
}
