import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

export default function ClosetScreen() {
  return (
    <View className="flex-1 items-center justify-center">
      <Text className="text-2xl">Closet</Text>
      {/* Entry point to the camera capture flow (APP-27 infrastructure);
          APP-19 replaces this placeholder with the real closet UI. */}
      <Link href="/capture" asChild>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add garment with camera"
          hitSlop={12}
          className="mt-6 rounded-pill border border-hairline bg-paper-2 px-5 py-2.5 active:opacity-70"
        >
          <Text className="font-mono text-[11px] uppercase tracking-[1.6px] text-cognac">
            Add with camera
          </Text>
        </Pressable>
      </Link>
    </View>
  );
}
