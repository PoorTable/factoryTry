import { Link } from 'expo-router';
import { cssInterop } from 'nativewind';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ClosetHeader } from '@/components/closet/closet-header';
import { useWardrobeStore } from '@/store/wardrobe-store';

// SafeAreaView is not NativeWind-aware by default; map className → style so
// this screen stays className-only (AGENTS.md strict styling rule).
cssInterop(SafeAreaView, { className: 'style' });

export default function ClosetScreen() {
  const pieceCount = useWardrobeStore((state) => state.totalCount());

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-paper">
      <ClosetHeader pieceCount={pieceCount} />

      {/* Temporary camera entry point (APP-27 infrastructure); the chip row,
          masonry grid, and cognac FAB land in the next gates of APP-18. */}
      <View className="flex-1 items-center justify-center">
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
