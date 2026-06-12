import { Text, View } from 'react-native';

type UserBubbleProps = {
  text: string;
};

/**
 * UserBubble — right-aligned cognac chat bubble with cream text
 * (design: screen-chat.png).
 */
export function UserBubble({ text }: UserBubbleProps) {
  return (
    <View className="max-w-[78%] self-end rounded-2xl rounded-br-md bg-cognac px-4 py-2.5">
      <Text className="font-sans text-[14px] leading-5 text-paper">{text}</Text>
    </View>
  );
}
