import { Tabs } from 'expo-router';

import { RecallTabBar, RecallTabBarTabName } from '@/components/tab-bar';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => {
        const activeTab = props.state.routes[props.state.index].name as RecallTabBarTabName;
        return (
          <RecallTabBar
            activeTab={activeTab}
            onTabPress={(tab) => props.navigation.navigate(tab)}
            onCapturePress={() => {}}
          />
        );
      }}
      screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="closet" />
      <Tabs.Screen name="outfits" />
      <Tabs.Screen name="coach" />
      <Tabs.Screen name="you" />
    </Tabs>
  );
}
