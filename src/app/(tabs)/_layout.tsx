import { Tabs, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { RecallTabBar, type RecallTabBarTabName } from '@/components/tab-bar';

type TabName = RecallTabBarTabName;

export default function TabsLayout() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabName>('timeline');
  const handleTabPress = (tab: TabName) => {
    setActiveTab(tab);
    router.navigate(`/(tabs)/${tab}` as Parameters<typeof router.navigate>[0]);
  };

  const handleCapturePress = () => {
    // Capture sheet is not yet built — no-op for now
    console.log('Capture FAB pressed');
  };

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: 'none' },
        }}
        tabBar={() => null}>
        <Tabs.Screen name="timeline/index" options={{ title: 'Closet' }} />
        <Tabs.Screen name="search/index" options={{ title: 'Outfits' }} />
        <Tabs.Screen name="digest/index" options={{ title: 'Coach' }} />
        <Tabs.Screen name="settings/index" options={{ title: 'Settings' }} />
        <Tabs.Screen name="profile/index" options={{ title: 'You' }} />
      </Tabs>
      <RecallTabBar
        activeTab={activeTab}
        onTabPress={handleTabPress}
        onCapturePress={handleCapturePress}
      />
    </View>
  );
}
