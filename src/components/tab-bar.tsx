import { GlassView } from 'expo-glass-effect';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const BASE_BAR_HEIGHT = 49;

type TabName = 'timeline' | 'search' | 'digest' | 'settings';

type TabConfig = {
  name: TabName;
  label: string;
  symbol: 'square.stack' | 'magnifyingglass' | 'lightbulb' | 'gearshape';
};

const TABS: TabConfig[] = [
  { name: 'timeline', label: 'Timeline', symbol: 'square.stack' },
  { name: 'search', label: 'Search', symbol: 'magnifyingglass' },
  { name: 'digest', label: 'Digest', symbol: 'lightbulb' },
  { name: 'settings', label: 'Settings', symbol: 'gearshape' },
];

type RecallTabBarProps = {
  activeTab: TabName;
  onTabPress: (tab: TabName) => void;
  onCapturePress: () => void;
};

export function RecallTabBar({ activeTab, onTabPress, onCapturePress }: RecallTabBarProps) {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const colorMode = scheme === 'unspecified' ? 'light' : scheme;
  const colors = Colors[colorMode];

  const barHeight = BASE_BAR_HEIGHT + insets.bottom;

  return (
    <View style={[styles.wrapper, { height: barHeight }]}>
      {/* Border top line */}
      <View style={[styles.borderTop, { backgroundColor: colors.line }]} />

      {/* Blurred background via GlassView */}
      <GlassView
        glassEffectStyle="regular"
        colorScheme={colorMode === 'dark' ? 'dark' : 'light'}
        style={StyleSheet.absoluteFill}
      />

      {/* FAB — overlaps the tab bar top edge by ~10px */}
      <View style={styles.fabContainer}>
        <Pressable
          onPress={onCapturePress}
          style={({ pressed }) => [styles.fab, { backgroundColor: colors.accent }, pressed && styles.fabPressed]}
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
              <SymbolView
                name={tab.symbol}
                size={22}
                tintColor={iconColor}
              />
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
              <SymbolView
                name={tab.symbol}
                size={22}
                tintColor={iconColor}
              />
              <Text style={[styles.label, { color: iconColor }]}>{tab.label}</Text>
            </Pressable>
          );
        })}
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
    // Total height spec: 92px (49px bar + 34px home indicator inset + padding)
    // Actual height is computed from BASE_BAR_HEIGHT + insets.bottom at runtime
    overflow: 'visible',
  },
  borderTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingTop: 8,
    paddingHorizontal: 8,
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
    shadowColor: 'rgba(79,124,255,1)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
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
