/**
 * Wardrobe design token system.
 * Single source of truth for the Wardrobe app's color palette, spacing,
 * radii, and shadow definitions.
 */

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

export const Colors = {
  /** Primary background */
  paper: '#F8F4EE',
  /** Elevated background */
  'paper-2': '#F1EBE0',
  /** Primary text */
  ink: '#2A2520',
  /** Secondary text */
  'ink-soft': '#4A3F36',
  /** Tertiary text, hairlines */
  muted: '#8A7C6E',
  /** Card borders, dividers */
  hairline: '#DDD3C2',
  /** Subtle surface */
  mist: '#ECE6DC',
  /** Chip borders */
  stone: '#D6CCBC',
  /** Primary accent — FAB, user bubble, links */
  cognac: '#A35836',
  /** Pressed/hover of cognac */
  'cognac-deep': '#8A4426',
  /** Secondary accent */
  terracotta: '#C97B5E',
  /** Tertiary accent */
  clay: '#B86F4A',
  /** Vibe score ring only — do not reuse */
  amber: '#C89B3C',
} as const;

export type ColorToken = keyof typeof Colors;

// ---------------------------------------------------------------------------
// Spacing — based on design specs
// ---------------------------------------------------------------------------

export const Spacing = {
  /** Screen horizontal padding */
  screenH: 22,
  /** 4pt */
  xs: 4,
  /** 8pt */
  sm: 8,
  /** 12pt */
  md: 12,
  /** 16pt */
  lg: 16,
  /** 24pt */
  xl: 24,
  /** 32pt */
  xxl: 32,
} as const;

// ---------------------------------------------------------------------------
// Border radii
// ---------------------------------------------------------------------------

export const Radius = {
  /** Cards */
  card: 18,
  /** Small stat cards */
  cardSm: 16,
  /** Item photos */
  item: 14,
  /** Tab bar, composer */
  tabBar: 28,
  /** Pill — chips, tags */
  pill: 999,
  /** FAB */
  fab: 999,
} as const;

// ---------------------------------------------------------------------------
// Dimensions
// ---------------------------------------------------------------------------

export const Dimensions = {
  /** FAB diameter */
  fab: 58,
  /** Tab bar height */
  tabBar: 64,
  /** Tab bar bottom offset */
  tabBarBottomOffset: 24,
  /** Tab bar side insets */
  tabBarInset: 12,
} as const;

// ---------------------------------------------------------------------------
// Shadows — expressed as style-sheet-compatible objects
// ---------------------------------------------------------------------------

export const Shadows = {
  /** Card resting */
  card: {
    shadowColor: 'rgba(42,37,32,1)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 1,
    elevation: 1,
  },
  /** Floating panel */
  floating: {
    shadowColor: 'rgba(42,37,32,1)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 6,
  },
  /** Sticky bottom */
  stickyBottom: {
    shadowColor: 'rgba(42,37,32,1)',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 12,
  },
  /** Cognac FAB */
  fab: {
    shadowColor: 'rgba(163,88,54,1)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
  },
  /** AI tag pill */
  aiPill: {
    shadowColor: 'rgba(42,37,32,1)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 11,
    elevation: 5,
  },
} as const;
