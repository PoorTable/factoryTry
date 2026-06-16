import { cssInterop } from 'nativewind';
import { useMemo } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import { IrisNoticed } from '@/components/profile/iris-noticed';
import { MostWornStrip } from '@/components/profile/most-worn-strip';
import { PaletteSection } from '@/components/profile/palette-section';
import { PersonalityCards } from '@/components/profile/personality-cards';
import { ProfileHeader } from '@/components/profile/profile-header';
import { StatCards } from '@/components/profile/stat-cards';
import { SEED_PROFILE } from '@/data/seed';
import { useWardrobeStore } from '@/store/wardrobe-store';

// SafeAreaView is not NativeWind-aware by default; map className → style so
// this screen stays className-only (AGENTS.md strict styling rule).
cssInterop(SafeAreaView, { className: 'style' });

/**
 * YouScreen — Screen 5: Style Profile (design: docs/design-screenshots/screen-profile.png).
 *
 * A reflective summary over the wardrobe character: header with `Iris Calder`
 * italic-surname device + `Warm Autumn` chip + tagline, central palette donut
 * (reusing `PaletteWheel`), top-4 color legend, three stat cards (pieces /
 * outfits saved cognac hero / worn-this-month), two personality cards
 * (most-worn shape + underused), the "Most worn this season" horizontal strip,
 * and the mist-bg "Iris noticed" insight callout.
 *
 * Data flow — every number is live off the Zustand store:
 *   - `pieces`         ← `items.length` (matches `totalCount()`)
 *   - `outfits saved`  ← `outfits.length`
 *   - `worn this month` ← memoized: count of items with `wornCount > 0`
 *   - `underused`      ← memoized: count of items with `wornCount === 0`
 *   - most-worn strip  ← `mostWorn(7)`
 *
 * Profile slice (palette segments, season name, tagline, insight) is presented
 * verbatim from the seeded `StyleProfile`. APP-32 will swap in a computed
 * profile without touching this screen.
 */
export default function YouScreen() {
  const profile = useWardrobeStore((state) => state.profile);
  const items = useWardrobeStore(useShallow((state) => state.items));
  const outfits = useWardrobeStore(useShallow((state) => state.outfits));
  // mostWorn(n) returns a fresh array per call; useShallow keeps the snapshot
  // reference stable across renders so zustand v5's Object.is check passes.
  const topWorn = useWardrobeStore(useShallow((state) => state.mostWorn(7)));

  // First render may run before AsyncStorage rehydration plants the seed —
  // fall back to SEED_PROFILE so the screen is never blank.
  const activeProfile = profile ?? SEED_PROFILE;

  const { wornThisMonth, underusedCount } = useMemo(() => {
    let worn = 0;
    let unused = 0;
    for (const item of items) {
      if (item.wornCount > 0) worn += 1;
      else unused += 1;
    }
    return { wornThisMonth: worn, underusedCount: unused };
  }, [items]);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-paper">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="pb-[120px]"
      >
        <ProfileHeader
          paletteName={activeProfile.paletteName}
          tagline={activeProfile.tagline}
        />

        <PaletteSection
          palette={activeProfile.palette}
          paletteName={activeProfile.paletteName}
        />

        <StatCards
          pieces={items.length}
          outfits={outfits.length}
          wornThisMonth={wornThisMonth}
        />

        <PersonalityCards underusedCount={underusedCount} />

        <MostWornStrip items={topWorn} />

        <IrisNoticed insight={activeProfile.insight ?? SEED_PROFILE.insight ?? ''} />
      </ScrollView>
    </SafeAreaView>
  );
}
