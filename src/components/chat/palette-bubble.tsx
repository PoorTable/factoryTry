import { Text, View } from 'react-native';

import { CoachAvatar } from '@/components/ui/CoachAvatar';

type PaletteBubbleProps = {
  /** Hex colors to render as rounded swatch tiles. */
  swatches: string[];
  note?: string;
};

/**
 * PaletteBubble — Iris palette reply: a white card with small rounded
 * swatch tiles and a caption, small roundel at its bottom-left
 * (design: screen-chat.png).
 */
export function PaletteBubble({ swatches, note }: PaletteBubbleProps) {
  return (
    <View className="max-w-[85%] flex-row items-end gap-2 self-start">
      <CoachAvatar size={26} />
      <View className="flex-shrink rounded-2xl rounded-bl-md border border-hairline bg-white px-4 py-3">
        <View className="flex-row gap-2">
          {swatches.map((hex, index) => {
            // Runtime, data-driven hex — no Tailwind class can express it;
            // layout/radius/border stay in className.
            const tileColor = { backgroundColor: hex };
            return (
              <View
                key={`${hex}-${index}`}
                accessibilityLabel={`Swatch ${hex}`}
                className="h-9 w-9 rounded-[10px] border border-ink/10"
                style={tileColor}
              />
            );
          })}
        </View>
        {note ? (
          <Text className="mt-2 font-sans text-[14px] leading-5 text-ink">{note}</Text>
        ) : null}
      </View>
    </View>
  );
}
