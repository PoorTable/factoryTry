import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const BASE_BAR_HEIGHT = 49;

type TabName = 'closet' | 'outfits' | 'coach' | 'you';

type TabConfig = {
  name: TabName;
  label: string;
  symbol: 'square.3.layers.3d' | 'hanger' | 'bubble.left' | 'person';
};

const TABS: TabConfig[] = [
  { name: 'closet', label: 'Closet', symbol: 'square.3.layers.3d' },
  { name: 'outfits', label: 'Outfits', symbol: 'hanger' },
  { name: 'coach', label: 'Coach', symbol: 'bubble.left' },
  { name: 'you', label: 'You', symbol: 'person' },
];

export type RecallTabBarTabName = TabName;

type RecallTabBarProps = {
  activeTab: TabName;
  onTabPress: (tab: TabName) => void;
  onCapturePress: () => void;
};

export function RecallTabBar({ activeTab, onTabPress, onCapturePress }: RecallTabBarProps) {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const colorMode = scheme === 'dark' ? 'dark' : 'light';
  const colors = Colors[colorMode];

  const barHeight = BASE_BAR_HEIGHT + insets.bottom;

  return (
    <View style={[styles.wrapper, { height: barHeight + 10 }]}>
      {/* Floating pill */}
      <View
        style={[
          styles.pill,
          {
            backgroundColor: colors['card-2'],
            shadowColor: '#000',
          },
        ]}>
        {/* FAB — overlaps the pill top edge by ~10px */}
        <View style={styles.fabContainer}>
          <Pressable
            onPress={onCapturePress}
            style={({ pressed }) => [
              styles.fab,
              { backgroundColor: colors.accent },
              pressed && styles.fabPressed,
            ]}
            accessibilityLabel="Capture">
            <Text style={styles.fabGlyph}>+</Text>
          </Pressable>
        </View>

        {/* Tab items row */}
        <View style={[styles.row, { paddingBottom: insets.bottom }]}>
          {/* Left two tabs */}
          {TABS.slice(0, 2).map((tab) => {
            const isActive = activeTab === tab.name;
            const iconColor = isActive ? colors.accent : colors['ink-3'];
            return (
              <Pressable
                key={tab.name}
                style={styles.tabItem}
                onPress={() => onTabPress(tab.name)}
                accessibilityLabel={tab.label}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}>
                <SymbolView name={tab.symbol} size={22} tintColor={iconColor} />
                <Text style={[styles.label, { color: iconColor }]}>{tab.label}</Text>
              </Pressable>
            );
          })}

          {/* Center spacer for FAB */}
          <View style={styles.fabSpacer} />

          {/* Right two tabs */}
          {TABS.slice(2).map((tab) => {
            const isActive = activeTab === tab.name;
            const iconColor = isActive ? colors.accent : colors['ink-3'];
            return (
              <Pressable
                key={tab.name}
                style={styles.tabItem}
                onPress={() => onTabPress(tab.name)}
                accessibilityLabel={tab.label}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}>
                <SymbolView name={tab.symbol} size={22} tintColor={iconColor} />
                <Text style={[styles.label, { color: iconColor }]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    overflow: 'visible',
    justifyContent: 'flex-end',
    paddingBottom: 8,
  },
  pill: {
    marginHorizontal: 16,
    borderRadius: 28,
    overflow: 'visible',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    paddingHorizontal: 8,
    minHeight: BASE_BAR_HEIGHT,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
  },
  fabSpacer: {
    width: 58,
    marginHorizontal: 8,
  },
  fabContainer: {
    position: 'absolute',
    top: -10,
    alignSelf: 'center',
    left: '50%',
    marginLeft: -29,
    zIndex: 10,
  },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  fabPressed: {
    opacity: 0.85,
  },
  fabGlyph: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 32,
    textAlign: 'center',
  },
});
