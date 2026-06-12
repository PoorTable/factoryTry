import { Text, View } from 'react-native';

import { CoachAvatar } from '@/components/ui/CoachAvatar';

type IrisTextBubbleProps = {
  text: string;
};

/**
 * IrisTextBubble — left-aligned white card with the small Iris roundel
 * sitting at its bottom-left (design: screen-chat.png).
 */
export function IrisTextBubble({ text }: IrisTextBubbleProps) {
  return (
    <View className="max-w-[85%] flex-row items-end gap-2 self-start">
      <CoachAvatar size={26} />
      <View className="flex-shrink rounded-2xl rounded-bl-md border border-hairline bg-white px-4 py-2.5">
        <Text className="font-sans text-[14px] leading-5 text-ink">{text}</Text>
      </View>
    </View>
  );
}
