import { Text, View } from 'react-native';

type StatCardsProps = {
  /** Total piece count — `useWardrobeStore.totalCount()` or `items.length`. */
  pieces: number;
  /** Saved outfits count — `outfits.length`. */
  outfits: number;
  /** Worn-this-month count — memoized over items in the parent. */
  wornThisMonth: number;
};

type StatCardProps = {
  /** Large Cormorant numeric value. */
  value: number;
  /** Two-line muted caption beneath the number. */
  labelTop: string;
  labelBottom?: string;
  /** Render value in cognac to mark the hero metric (outfits saved). */
  hero?: boolean;
};

/** One white stat card — Cormorant 30px number + 10.5px muted caption. */
function StatCard({ value, labelTop, labelBottom, hero = false }: StatCardProps) {
  return (
    <View className="flex-1 rounded-card-sm border border-hairline bg-paper px-4 py-3.5">
      <Text
        className={`font-serif text-[30px] leading-[34px] ${hero ? 'text-cognac' : 'text-ink'}`}
      >
        {value}
      </Text>
      <Text className="mt-1 font-sans text-[10.5px] leading-[14px] text-muted">
        {labelTop}
      </Text>
      {labelBottom ? (
        <Text className="font-sans text-[10.5px] leading-[14px] text-muted">
          {labelBottom}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * StatCards — row of three white stat cards (design: screen-profile.png).
 *
 * Pieces / outfits-saved (cognac hero metric) / worn-this-month. Every number
 * is store-derived in the parent (`totalCount` / `outfits.length` / a memoized
 * selector over items) — never hardcoded.
 */
export function StatCards({ pieces, outfits, wornThisMonth }: StatCardsProps) {
  return (
    <View className="mt-6 flex-row gap-3 px-screen-h">
      <StatCard value={pieces} labelTop="pieces" />
      <StatCard value={outfits} labelTop="outfits saved" hero />
      <StatCard value={wornThisMonth} labelTop="worn this" labelBottom="month" />
    </View>
  );
}
