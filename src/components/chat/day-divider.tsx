import { Text, View } from 'react-native';

type DayDividerProps = {
  /** Display label, e.g. "TODAY". */
  label?: string;
  /** Time string, e.g. "8:14". */
  time?: string;
};

/**
 * DayDivider — hairline-and-dashes day separator above the conversation
 * (design: `─── TODAY · 8:14 ───`). Renders inert; the label/time are
 * passed in so the divider can be re-used for other day groupings later.
 */
export function DayDivider({ label = 'TODAY', time }: DayDividerProps) {
  return (
    <View className="my-2 flex-row items-center justify-center gap-2">
      <View className="h-px flex-1 bg-hairline" />
      <Text className="font-sans text-[11px] tracking-[2px] text-muted">
        {time ? `${label} · ${time}` : label}
      </Text>
      <View className="h-px flex-1 bg-hairline" />
    </View>
  );
}
