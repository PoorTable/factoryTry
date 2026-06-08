import React from 'react';

import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { Colors, Dimensions, Radius } from '@/theme/tokens';

// Pill geometry — passed to the native host via style spread so the tab bar
// floats above screen edges with rounded corners instead of spanning edge-to-edge.
const TabsHost = NativeTabs as React.ComponentType<
  React.ComponentProps<typeof NativeTabs> & { style?: object }
>;

const pillStyle = {
  borderRadius: Radius.tabBar,
  marginHorizontal: Dimensions.tabBarInset,
  bottom: Dimensions.tabBarBottomOffset,
  position: 'absolute' as const,
  left: 0,
  right: 0,
};

export default function AppTabs() {
  return (
    <TabsHost
      tintColor={Colors.cognac}
      backgroundColor={Colors.paper}
      shadowColor={Colors.ink}
      iconColor={{ default: Colors.muted, selected: Colors.cognac }}
      style={pillStyle}
    >
      <NativeTabs.Trigger name="closet">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'tray', selected: 'tray.fill' }}
          md="inbox"
        />
        <NativeTabs.Trigger.Label>Closet</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="outfits">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'hanger', selected: 'hanger' }}
          md="checkroom"
        />
        <NativeTabs.Trigger.Label>Outfits</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="coach">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'message', selected: 'message.fill' }}
          md="chat_bubble"
        />
        <NativeTabs.Trigger.Label>Coach</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="you">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'person', selected: 'person.fill' }}
          md="person"
        />
        <NativeTabs.Trigger.Label>You</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </TabsHost>
  );
}
