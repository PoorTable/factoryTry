import { SymbolView } from 'expo-symbols';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { PaletteWheel } from '@/components/ui/PaletteWheel';
import { SerifTitle } from '@/components/ui/SerifTitle';
import { SoftCard } from '@/components/ui/SoftCard';
import { Colors, Radius, Spacing } from '@/theme/tokens';
import { FontFamily } from '@/theme/typography';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StyleProfile = {
  name: string;
  season: string;
  tagline: string;
  palette: { color: string; name: string; pct: number }[];
  stats: { pieces: number; outfits: number; wornThisMonth: number };
  mostWorn: string[];
  irisInsight: string;
};

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_PROFILE: StyleProfile = {
  name: 'Iris Calder',
  season: 'Warm Autumn',
  tagline: 'quiet, layered, tactile',
  palette: [
    { color: '#A35836', name: 'Cognac', pct: 22 },
    { color: '#C4956A', name: 'Camel', pct: 15 },
    { color: '#E8D5B7', name: 'Sand', pct: 13 },
    { color: '#3D3228', name: 'Espresso', pct: 11 },
    { color: '#8A4A2A', name: 'Rust', pct: 10 },
    { color: '#2A3E52', name: 'Navy', pct: 9 },
    { color: '#4A3B2E', name: 'Bark', pct: 8 },
    { color: '#6B7A4A', name: 'Olive', pct: 7 },
    { color: '#F0E8DC', name: 'Cream', pct: 3 },
    { color: '#1A1A1A', name: 'Ebony', pct: 2 },
  ],
  stats: { pieces: 54, outfits: 12, wornThisMonth: 28 },
  mostWorn: ['item-1', 'item-2', 'item-3', 'item-4', 'item-5', 'item-6', 'item-7'],
  irisInsight:
    'You reach for warm earth tones 78% of the time, yet your navy pieces haven\'t been worn this season. A navy trouser could bridge your two colour worlds.',
};

const MOST_WORN_ITEMS = [
  { id: 'item-1', name: 'Cashmere knit', wornCount: 18, color: '#A35836' },
  { id: 'item-2', name: 'Pleated trousers', wornCount: 14, color: '#5C5040' },
  { id: 'item-3', name: 'Suede blazer', wornCount: 12, color: '#8A6845' },
  { id: 'item-4', name: 'Linen shirt', wornCount: 10, color: '#E8D5B7' },
  { id: 'item-5', name: 'Wool coat', wornCount: 9, color: '#3D3228' },
  { id: 'item-6', name: 'Silk blouse', wornCount: 8, color: '#C4956A' },
  { id: 'item-7', name: 'Ankle boots', wornCount: 7, color: '#2A2520' },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function PaletteCenter() {
  return (
    <View style={wheelStyles.center}>
      <Text style={wheelStyles.eyebrow}>YOUR PALETTE</Text>
      <SerifTitle size="section" italic style={wheelStyles.seasonText}>
        {'Warm\nAutumn'}
      </SerifTitle>
    </View>
  );
}

const wheelStyles = StyleSheet.create({
  center: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  eyebrow: {
    fontFamily: FontFamily.mono,
    fontSize: 8,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: Colors.muted,
    textAlign: 'center',
  },
  seasonText: {
    fontSize: 19,
    lineHeight: 24,
    textAlign: 'center',
  },
});

function ColorLegend({ palette }: { palette: StyleProfile['palette'] }) {
  const top4 = palette.slice(0, 4);
  return (
    <View style={legendStyles.container}>
      <View style={legendStyles.row}>
        {top4.slice(0, 3).map((item) => (
          <View key={item.name} style={legendStyles.item}>
            <View style={[legendStyles.dot, { backgroundColor: item.color }]} />
            <Text style={legendStyles.label}>
              {item.name}
              {item.pct < 22 ? ` ${item.pct}%` : ''}
            </Text>
          </View>
        ))}
      </View>
      <View style={legendStyles.row}>
        {top4.slice(3).map((item) => (
          <View key={item.name} style={legendStyles.item}>
            <View style={[legendStyles.dot, { backgroundColor: item.color }]} />
            <Text style={legendStyles.label}>
              {item.name} {item.pct}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const legendStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontFamily: FontFamily.sans,
    fontSize: 11,
    color: Colors.muted,
  },
});

function StatCards({ stats }: { stats: StyleProfile['stats'] }) {
  return (
    <View style={statStyles.row}>
      <SoftCard style={statStyles.card}>
        <Text style={statStyles.number}>{stats.pieces}</Text>
        <Text style={statStyles.label}>pieces</Text>
      </SoftCard>
      <SoftCard style={statStyles.card}>
        <Text style={[statStyles.number, statStyles.cognacNumber]}>{stats.outfits}</Text>
        <Text style={statStyles.label}>outfits saved</Text>
      </SoftCard>
      <SoftCard style={statStyles.card}>
        <Text style={statStyles.number}>{stats.wornThisMonth}</Text>
        <Text style={statStyles.label}>worn this month</Text>
      </SoftCard>
    </View>
  );
}

const statStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: Spacing.screenH,
    marginTop: 20,
  },
  card: {
    flex: 1,
    padding: 14,
    backgroundColor: '#FFFFFF',
  },
  number: {
    fontFamily: FontFamily.serif,
    fontSize: 30,
    fontWeight: '500',
    lineHeight: 36,
    color: Colors.ink,
  },
  cognacNumber: {
    color: Colors.cognac,
  },
  label: {
    fontFamily: FontFamily.sans,
    fontSize: 10.5,
    color: Colors.muted,
    lineHeight: 14,
    marginTop: 2,
  },
});

function PersonalityCards() {
  return (
    <View style={personalityStyles.row}>
      {/* Most-worn shape */}
      <SoftCard style={personalityStyles.card}>
        <Eyebrow style={personalityStyles.eyebrow}>MOST-WORN SHAPE</Eyebrow>
        <Text style={personalityStyles.headline}>
          <SerifTitle size="item">{'High-waist '}</SerifTitle>
          <SerifTitle size="item" italic>
            trouser
          </SerifTitle>
        </Text>
        <Text style={personalityStyles.sub}>14 of last 30 days</Text>
      </SoftCard>

      {/* Underused */}
      <SoftCard style={personalityStyles.card}>
        <Eyebrow style={personalityStyles.eyebrow}>UNDERUSED</Eyebrow>
        <Text style={personalityStyles.headline}>
          <SerifTitle size="item">{'7 '}</SerifTitle>
          <SerifTitle size="item" italic>
            pieces
          </SerifTitle>
        </Text>
        <Text style={personalityStyles.sub}>not worn this season</Text>
      </SoftCard>
    </View>
  );
}

const personalityStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: Spacing.screenH,
    marginTop: 12,
  },
  card: {
    flex: 1,
    padding: 14,
    backgroundColor: '#FFFFFF',
  },
  eyebrow: {
    marginBottom: 8,
  },
  headline: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  sub: {
    fontFamily: FontFamily.sans,
    fontSize: 11,
    color: Colors.muted,
    marginTop: 4,
  },
});

function MostWornSection({ items }: { items: typeof MOST_WORN_ITEMS }) {
  return (
    <View style={mostWornStyles.container}>
      {/* Section heading */}
      <View style={mostWornStyles.headingRow}>
        <Text style={mostWornStyles.heading}>
          <SerifTitle size="section">{'Most worn '}</SerifTitle>
          <SerifTitle size="section" italic>
            this season
          </SerifTitle>
        </Text>
        <View style={mostWornStyles.topChip}>
          <Text style={mostWornStyles.topChipText}>TOP 7</Text>
        </View>
      </View>

      {/* Horizontal scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={mostWornStyles.scrollContent}
        style={mostWornStyles.scroll}>
        {items.map((item, index) => (
          <View key={item.id} style={mostWornStyles.itemCard}>
            {/* Photo with placeholder color */}
            <View style={[mostWornStyles.photo, { backgroundColor: item.color }]}>
              {/* Rank roundel */}
              <View style={mostWornStyles.rankBadge}>
                <Text style={mostWornStyles.rankText}>{index + 1}</Text>
              </View>
            </View>
            <Text style={mostWornStyles.itemName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={mostWornStyles.wornCount}>{item.wornCount}×</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const mostWornStyles = StyleSheet.create({
  container: {
    marginTop: 28,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenH,
    marginBottom: 14,
  },
  heading: {
    flexDirection: 'row',
  },
  topChip: {
    backgroundColor: Colors.mist,
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  topChipText: {
    fontFamily: FontFamily.mono,
    fontSize: 9,
    letterSpacing: 1.2,
    color: Colors.muted,
  },
  scroll: {
    overflow: 'visible',
  },
  scrollContent: {
    paddingHorizontal: Spacing.screenH,
    gap: 10,
  },
  itemCard: {
    width: 90,
  },
  photo: {
    width: 90,
    height: 90,
    borderRadius: Radius.item,
    overflow: 'hidden',
    position: 'relative',
  },
  rankBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontFamily: FontFamily.serif,
    fontSize: 12,
    fontWeight: '500',
    color: Colors.ink,
    lineHeight: 16,
  },
  itemName: {
    fontFamily: FontFamily.sans,
    fontSize: 11,
    color: Colors.ink,
    marginTop: 6,
    lineHeight: 14,
  },
  wornCount: {
    fontFamily: FontFamily.sans,
    fontSize: 10,
    color: Colors.muted,
    marginTop: 2,
  },
});

function IrisNoticed({ insight }: { insight: string }) {
  return (
    <View style={irisStyles.card}>
      <View style={irisStyles.header}>
        <View style={irisStyles.iconRoundel}>
          <SymbolView name="star" size={16} tintColor={Colors.cognac} />
        </View>
        <Eyebrow>IRIS NOTICED</Eyebrow>
      </View>
      <SerifTitle size="item" italic style={irisStyles.insight}>
        {insight}
      </SerifTitle>
    </View>
  );
}

const irisStyles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.screenH,
    marginTop: 20,
    backgroundColor: Colors.mist,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.stone,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  iconRoundel: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.cognac,
  },
  insight: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors['ink-soft'],
  },
});

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function ProfileScreen() {
  const profile = MOCK_PROFILE;
  const [firstName, ...lastNameParts] = profile.name.split(' ');
  const lastName = lastNameParts.join(' ');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Eyebrow>STYLE PROFILE</Eyebrow>
            <Text style={styles.nameRow}>
              <SerifTitle size="page">{firstName + ' '}</SerifTitle>
              <SerifTitle size="page" italic>
                {lastName}
              </SerifTitle>
            </Text>
            <View style={styles.chipRow}>
              <View style={styles.seasonChip}>
                <Text style={styles.seasonChipText}>{profile.season}</Text>
              </View>
              <Text style={styles.tagline}>{profile.tagline}</Text>
            </View>
          </View>
          <View style={styles.settingsButton}>
            <SymbolView name="gearshape" size={20} tintColor={Colors.muted} />
          </View>
        </View>

        {/* Palette Wheel */}
        <View style={styles.wheelContainer}>
          <View style={styles.wheelWrapper}>
            <PaletteWheel
              segments={profile.palette.map(({ color, pct }) => ({ color, pct }))}
              size={220}
              innerRatio={0.53}
            />
            <PaletteCenter />
          </View>
          <ColorLegend palette={profile.palette} />
        </View>

        {/* Stat cards */}
        <StatCards stats={profile.stats} />

        {/* Personality cards */}
        <PersonalityCards />

        {/* Most worn section */}
        <MostWornSection items={MOST_WORN_ITEMS} />

        {/* Iris noticed */}
        <IrisNoticed insight={profile.irisInsight} />

        {/* Bottom padding for tab bar */}
        <View style={styles.tabBarSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.paper,
  },
  scroll: {
    flex: 1,
    backgroundColor: Colors.paper,
  },
  content: {
    paddingBottom: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenH,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerLeft: {
    flex: 1,
    gap: 6,
  },
  nameRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 2,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  seasonChip: {
    backgroundColor: 'rgba(163,88,54,0.10)',
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  seasonChipText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 12,
    color: Colors.cognac,
  },
  tagline: {
    fontFamily: FontFamily.serifItalic,
    fontSize: 13,
    color: Colors.muted,
  },
  settingsButton: {
    marginTop: 28,
    padding: 6,
  },
  wheelContainer: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 4,
  },
  wheelWrapper: {
    width: 220,
    height: 220,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBarSpacer: {
    height: 100,
  },
});
