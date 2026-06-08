import React from 'react';
import { View } from 'react-native';

import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { Colors, Dimensions, Radius, Shadows } from '@/theme/tokens';

// Pill wrapper — a plain RN View that IS absolutely positioned, giving the pill
// its shape and insets. NativeTabs fills the wrapper naturally.
const pillWrapperStyle = {
  position: 'absolute' as const,
  left: Dimensions.tabBarInset,
  right: Dimensions.tabBarInset,
  bottom: Dimensions.tabBarBottomOffset,
  borderRadius: Radius.tabBar,
  overflow: 'hidden' as const,
  ...Shadows.floating,
};

export default function AppTabs() {
  return (
    <View style={pillWrapperStyle}>
      <NativeTabs
        tintColor={Colors.cognac}
        backgroundColor={Colors.paper}
        shadowColor={Colors.ink}
        iconColor={{ default: Colors.muted, selected: Colors.cognac }}
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
      </NativeTabs>
    </View>
  );
}
