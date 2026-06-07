import { Tabs } from 'expo-router';
import { useState } from 'react';

import { RecallTabBar, RecallTabBarTabName } from '@/components/tab-bar';

export default function TabsLayout() {
  const [activeTab, setActiveTab] = useState<RecallTabBarTabName>('closet');

  return (
    <Tabs
      tabBar={(props) => (
        <RecallTabBar
          activeTab={activeTab}
          onTabPress={(tab) => {
            setActiveTab(tab);
            const route = props.state.routes.find((r) => r.name === tab);
            if (route) {
              props.navigation.navigate(tab);
            }
          }}
          onCapturePress={() => {
            // FAB action — placeholder for capture flow
          }}
        />
      )}
      screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="closet" />
      <Tabs.Screen name="outfits" />
      <Tabs.Screen name="coach" />
      <Tabs.Screen name="you" />
    </Tabs>
  );
}
