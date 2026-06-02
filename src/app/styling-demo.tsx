import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function StylingDemoScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-black">
      <ScrollView className="flex-1">
        <View className="px-6 py-8 gap-6">
          <Text className="text-3xl font-bold text-black dark:text-white">
            NativeWind Demo
          </Text>

          <Text className="text-base text-gray-500 dark:text-gray-400">
            This screen demonstrates NativeWind utility classes applied to React Native
            components.
          </Text>

          {/* Color palette */}
          <View className="gap-2">
            <Text className="text-lg font-semibold text-black dark:text-white">
              Colors
            </Text>
            <View className="flex-row gap-2 flex-wrap">
              <View className="w-12 h-12 rounded-lg bg-blue-500" />
              <View className="w-12 h-12 rounded-lg bg-green-500" />
              <View className="w-12 h-12 rounded-lg bg-red-500" />
              <View className="w-12 h-12 rounded-lg bg-yellow-400" />
              <View className="w-12 h-12 rounded-lg bg-purple-500" />
              <View className="w-12 h-12 rounded-lg bg-pink-500" />
            </View>
          </View>

          {/* Typography */}
          <View className="gap-2">
            <Text className="text-lg font-semibold text-black dark:text-white">
              Typography
            </Text>
            <Text className="text-xs text-gray-700 dark:text-gray-300">text-xs</Text>
            <Text className="text-sm text-gray-700 dark:text-gray-300">text-sm</Text>
            <Text className="text-base text-gray-700 dark:text-gray-300">text-base</Text>
            <Text className="text-xl text-gray-700 dark:text-gray-300">text-xl</Text>
            <Text className="text-2xl font-bold text-gray-700 dark:text-gray-300">
              text-2xl bold
            </Text>
          </View>

          {/* Spacing and layout */}
          <View className="gap-2">
            <Text className="text-lg font-semibold text-black dark:text-white">
              Spacing &amp; Layout
            </Text>
            <View className="bg-blue-100 dark:bg-blue-900 rounded-xl p-4">
              <Text className="text-blue-800 dark:text-blue-100 font-medium">
                Rounded card with padding
              </Text>
            </View>
            <View className="flex-row justify-between items-center bg-gray-100 dark:bg-gray-800 rounded-xl p-4">
              <Text className="text-gray-800 dark:text-gray-100">Left</Text>
              <Text className="text-gray-500 dark:text-gray-400">Center</Text>
              <Text className="text-gray-800 dark:text-gray-100">Right</Text>
            </View>
          </View>

          {/* Dark mode demo */}
          <View className="gap-2">
            <Text className="text-lg font-semibold text-black dark:text-white">
              Dark Mode
            </Text>
            <View className="bg-gray-800 dark:bg-gray-100 rounded-xl p-4">
              <Text className="text-white dark:text-gray-900">
                This card inverts in dark mode
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
