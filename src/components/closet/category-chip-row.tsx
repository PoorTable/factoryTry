import { Pressable, ScrollView, Text } from 'react-native';

import type { Category } from '@/types/wardrobe';

type CategoryChipRowProps = {
  /** Active filter — null means "All". */
  selected: Category | null;
  onSelect: (category: Category | null) => void;
};

/** Chip options in design order; null = "All" (no filter). */
const OPTIONS: { label: string; value: Category | null }[] = [
  { label: 'All', value: null },
  { label: 'Tops', value: 'Tops' },
  { label: 'Bottoms', value: 'Bottoms' },
  { label: 'Outerwear', value: 'Outerwear' },
  { label: 'Shoes', value: 'Shoes' },
  { label: 'Accessories', value: 'Accessories' },
];

/**
 * CategoryChipRow — horizontally scrolling filter pills for the Wardrobe grid
 * (design: screen-wardrobe.png). Active chip = ink fill + paper text;
 * inactive = transparent with stone border.
 */
export function CategoryChipRow({ selected, onSelect }: CategoryChipRowProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="grow-0"
      contentContainerClassName="flex-row gap-2 px-screen-h pb-3"
    >
      {OPTIONS.map(({ label, value }) => {
        const active = selected === value;
        return (
          <Pressable
            key={label}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(value)}
            className={
              active
                ? 'rounded-pill border border-ink bg-ink px-3.5 py-[7px] active:opacity-75'
                : 'rounded-pill border border-stone bg-transparent px-3.5 py-[7px] active:opacity-75'
            }
          >
            <Text
              className={
                active
                  ? 'font-sans-medium text-[13px] leading-[18px] text-paper'
                  : 'font-sans-medium text-[13px] leading-[18px] text-ink'
              }
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
