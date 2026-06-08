import { SymbolView } from 'expo-symbols';
import { Tabs } from 'expo-router';

import { Colors } from '@/theme/tokens';
import { FontFamily } from '@/theme/typography';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.cognac,
        tabBarInactiveTintColor: Colors.muted,
        tabBarStyle: {
          backgroundColor: Colors.paper,
          height: 88,
          borderTopWidth: 1,
          borderTopColor: Colors.hairline,
        },
        tabBarLabelStyle: {
          fontFamily: FontFamily.sansMedium,
          fontSize: 10,
        },
      }}>
      <Tabs.Screen
        name="closet"
        options={{
          title: 'Closet',
          tabBarIcon: ({ color, size }) => (
            <SymbolView name="tray" size={size} tintColor={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="outfits"
        options={{
          title: 'Outfits',
          tabBarIcon: ({ color, size }) => (
            <SymbolView name="hanger" size={size} tintColor={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="coach"
        options={{
          title: 'Coach',
          tabBarIcon: ({ color, size }) => (
            <SymbolView name="message" size={size} tintColor={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="you"
        options={{
          title: 'You',
          tabBarIcon: ({ color, size }) => (
            <SymbolView name="person" size={size} tintColor={color} />
          ),
        }}
      />
    </Tabs>
  );
}
