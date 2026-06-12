import { ScrollView, View } from 'react-native';

import { ItemCard } from '@/components/closet/item-card';
import type { Item } from '@/types/wardrobe';

/** Masonry photo-height range per the design spec (160–280px). */
const MIN_PHOTO_HEIGHT = 160;
const MAX_PHOTO_HEIGHT = 280;
/** Step between the discrete masonry heights — 6 rungs across the range. */
const HEIGHT_STEP = 24;
/** Approximate fixed height of a card's text block (name + meta row + gaps). */
const TEXT_BLOCK_HEIGHT = 56;

/**
 * Deterministic per-item photo height in [160, 280], driven by item data.
 * The design handoff's masonry hint `h` was dropped from the seed (see
 * src/data/seed.ts), so the height derives from a stable id hash instead —
 * the same item always gets the same height, with no layout jitter on
 * re-render or filter changes.
 */
export function photoHeightFor(item: Item): number {
  let hash = 0;
  for (let index = 0; index < item.id.length; index++) {
    hash = (hash * 31 + item.id.charCodeAt(index)) % 997;
  }
  const rungs = (MAX_PHOTO_HEIGHT - MIN_PHOTO_HEIGHT) / HEIGHT_STEP + 1;
  return MIN_PHOTO_HEIGHT + (hash % rungs) * HEIGHT_STEP;
}

/**
 * Greedy shortest-column split: each item goes to whichever column is
 * currently shorter, so the two columns flow independently (true masonry,
 * not uniform rows). Pure — no store or React access.
 */
export function splitColumns(items: Item[]): [Item[], Item[]] {
  const left: Item[] = [];
  const right: Item[] = [];
  let leftHeight = 0;
  let rightHeight = 0;

  for (const item of items) {
    const cardHeight = photoHeightFor(item) + TEXT_BLOCK_HEIGHT;
    if (leftHeight <= rightHeight) {
      left.push(item);
      leftHeight += cardHeight;
    } else {
      right.push(item);
      rightHeight += cardHeight;
    }
  }

  return [left, right];
}

type MasonryGridProps = {
  /** Items to lay out — already filtered by the screen. */
  items: Item[];
};

/**
 * MasonryGrid — two-column wardrobe grid (design: screen-wardrobe.png).
 * Columns have independent heights; the 10px gap uses the `grid` spacing
 * token both between and inside columns.
 */
export function MasonryGrid({ items }: MasonryGridProps) {
  const [left, right] = splitColumns(items);

  return (
    <ScrollView
      className="flex-1"
      showsVerticalScrollIndicator={false}
      contentContainerClassName="flex-row gap-grid px-screen-h pb-6 pt-1"
    >
      <View className="flex-1 gap-grid">
        {left.map((item) => (
          <ItemCard key={item.id} item={item} photoHeight={photoHeightFor(item)} />
        ))}
      </View>
      <View className="flex-1 gap-grid">
        {right.map((item) => (
          <ItemCard key={item.id} item={item} photoHeight={photoHeightFor(item)} />
        ))}
      </View>
    </ScrollView>
  );
}
