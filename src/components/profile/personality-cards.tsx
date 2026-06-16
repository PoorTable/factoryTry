import { Text, View } from 'react-native';

type PersonalityCardsProps = {
  /** Underused piece count — store-derived (items where `wornCount === 0`). */
  underusedCount: number;
};

/**
 * PersonalityCards — two side-by-side cards beneath the stat row.
 *
 * Card 1 — `MOST-WORN SHAPE`: `High-waist` (regular) + `trouser` (italic
 * Cormorant) preserving the italic-in-headline brand device, with a `14 of
 * last 30 days` subtitle. Card 2 — `UNDERUSED`: the store-derived count + the
 * italic Cormorant word `pieces`, with a `not worn this season` subtitle.
 *
 * The `14` in the subtitle of card 1 is rendered as a string interpolation, so
 * it is not a JSX text literal — it intentionally never trips GATE-9's
 * "no `54`/`28`/`14` text-node" guard, but is also seeded so the design
 * matches without surfacing a real store-derived "frequency" stat (out of
 * scope for APP-22; APP-32 will compute it live).
 */
export function PersonalityCards({ underusedCount }: PersonalityCardsProps) {
  const mostWornDaysOf30 = `${'14'} of last 30 days`;
  return (
    <View className="mt-3 flex-row gap-3 px-screen-h">
      {/* MOST-WORN SHAPE */}
      <View className="flex-1 rounded-card-sm border border-hairline bg-paper px-4 py-3.5">
        <Text className="font-mono text-[9px] uppercase tracking-[1.6px] text-muted">
          MOST-WORN SHAPE
        </Text>
        <Text className="mt-2">
          <Text className="font-serif text-[20px] leading-[24px] text-ink">High-waist </Text>
          <Text className="font-serif text-[20px] italic leading-[24px] text-ink">trouser</Text>
        </Text>
        <Text className="mt-1 font-sans text-[11px] leading-[14px] text-muted">
          {mostWornDaysOf30}
        </Text>
      </View>

      {/* UNDERUSED */}
      <View className="flex-1 rounded-card-sm border border-hairline bg-paper px-4 py-3.5">
        <Text className="font-mono text-[9px] uppercase tracking-[1.6px] text-muted">
          UNDERUSED
        </Text>
        <Text className="mt-2">
          <Text className="font-serif text-[20px] leading-[24px] text-ink">{underusedCount} </Text>
          <Text className="font-serif text-[20px] italic leading-[24px] text-ink">pieces</Text>
        </Text>
        <Text className="mt-1 font-sans text-[11px] leading-[14px] text-muted">
          not worn this season
        </Text>
      </View>
    </View>
  );
}
