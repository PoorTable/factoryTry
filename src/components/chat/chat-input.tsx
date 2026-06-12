import { Image } from 'expo-image';
import { cssInterop } from 'nativewind';
import { Pressable, TextInput, View } from 'react-native';

import { Colors } from '@/theme/tokens';

// expo-image is not NativeWind-aware by default; map className → style so this
// file stays className-only (AGENTS.md strict styling rule).
cssInterop(Image, { className: 'style' });

type ChatInputProps = {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
};

/**
 * ChatInput — the "Ask Iris…" white pill composer with the lamp glyph and
 * the circular send button (design: screen-chat.png). Never disabled —
 * after an error the user must always be able to send the next message.
 */
export function ChatInput({ value, onChangeText, onSend }: ChatInputProps) {
  return (
    <View className="flex-row items-center gap-2 rounded-pill border border-hairline bg-white py-1.5 pl-5 pr-1.5">
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSend}
        placeholder="Ask Iris…"
        placeholderTextColor={Colors.muted}
        returnKeyType="send"
        submitBehavior="submit"
        accessibilityLabel="Message Iris"
        className="h-9 flex-1 font-sans text-[14px] text-ink"
      />
      <Image
        source="sf:lamp.desk"
        tintColor={Colors.muted}
        className="h-[18px] w-[18px]"
        accessibilityLabel="Inspiration"
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Send message"
        hitSlop={6}
        onPress={onSend}
        className="h-9 w-9 items-center justify-center rounded-full bg-mist active:opacity-70"
      >
        <Image
          source="sf:arrow.right"
          tintColor={Colors.ink}
          className="h-4 w-4"
          accessibilityLabel="Send"
        />
      </Pressable>
    </View>
  );
}
