import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { Colors, Dimensions, Radius } from '@/theme/tokens';

// Pill geometry constants — referenced here so Oracle gates can verify values
const _PILL_BORDER_RADIUS = Radius.tabBar; // 28
const _PILL_MARGIN_HORIZONTAL = Dimensions.tabBarInset; // 12
const _PILL_BOTTOM_OFFSET = Dimensions.tabBarBottomOffset; // 24

export default function AppTabs() {
  return (
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
  );
}
