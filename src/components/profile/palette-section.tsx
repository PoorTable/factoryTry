import { Text, View } from 'react-native';

import { PaletteWheel } from '@/components/ui/PaletteWheel';
import type { StyleProfile } from '@/types/wardrobe';

const WHEEL_SIZE = 220;
/** Inner-hole ratio chosen so outer ≈ 106px / inner ≈ 56px per design spec. */
const WHEEL_INNER_RATIO = 56 / 106;

type PaletteSectionProps = {
  /** Full palette (10 segments). The first 4 by `pct` order surface as labels. */
  palette: StyleProfile['palette'];
  /** Display name shown inside the wheel center (e.g. "Warm Autumn"). */
  paletteName: string;
};

/**
 * PaletteSection — central palette donut + center label + top-4 dot legend.
 *
 * Reuses `PaletteWheel` (no new arc-path math here — see GATE-3) by mapping
 * `{hex, name, pct}` segments down to the `{color, pct}` shape the wheel
 * consumes. The wheel sits inside a relatively-positioned wrapper with an
 * absolutely-centered Text block carrying the mono `YOUR PALETTE` eyebrow and
 * the italic Cormorant `paletteName` split onto two lines.
 */
export function PaletteSection({ palette, paletteName }: PaletteSectionProps) {
  const wheelSegments = palette.map((seg) => ({ color: seg.hex, pct: seg.pct }));
  const topLabels = palette.slice(0, 4);
  // Split paletteName across two lines for the wheel center label (e.g.
  // "Warm" / "Autumn"). Falls back to a single line if no space.
  const [firstWord, ...restWords] = paletteName.split(' ');
  const secondLine = restWords.join(' ');

  return (
    <View className="items-center px-screen-h pt-6">
      <View className="relative items-center justify-center">
        <PaletteWheel
          segments={wheelSegments}
          size={WHEEL_SIZE}
          innerRatio={WHEEL_INNER_RATIO}
          accessibilityLabel={`${paletteName} palette wheel`}
        />
        <View className="absolute items-center justify-center">
          <Text className="font-mono text-[9px] uppercase tracking-[1.6px] text-muted">
            YOUR PALETTE
          </Text>
          <Text className="mt-1 text-center font-serif text-[19px] italic leading-[22px] text-ink">
            {firstWord}
          </Text>
          {secondLine ? (
            <Text className="text-center font-serif text-[19px] italic leading-[22px] text-ink">
              {secondLine}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Top-4 color labels — dot + name + percent */}
      <View className="mt-4 flex-row flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
        {topLabels.map((seg) => {
          const dotStyle = { backgroundColor: seg.hex };
          return (
            <View key={seg.hex} className="flex-row items-center gap-1.5">
              <View
                accessibilityLabel={`${seg.name} swatch`}
                className="h-2 w-2 rounded-full"
                style={dotStyle}
              />
              <Text className="font-sans text-[11px] text-ink-soft">{seg.name}</Text>
              <Text className="font-sans text-[11px] text-muted">{seg.pct}%</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
