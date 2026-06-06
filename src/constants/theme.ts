/**
 * Recall design token system.
 * Single source of truth for colors, typography, spacing, border radius, and shadows.
 */

import '@/global.css';

import { Platform } from 'react-native';

// ---------------------------------------------------------------------------
// Colors — Light & Dark
// ---------------------------------------------------------------------------

export const Colors = {
  light: {
    // Recall base tokens
    bg: '#F8F8F6',
    'bg-grouped': '#F1F1EE',
    card: '#FFFFFF',
    'card-2': '#FBFBF9',
    fill: '#EFEFEC',
    'fill-2': '#E7E7E3',
    ink: '#0F1115',
    'ink-2': '#62656C',
    'ink-3': '#9A9DA4',
    line: 'rgba(15,17,21,0.08)',
    'line-strong': 'rgba(15,17,21,0.13)',

    // Accent & semantic
    accent: '#4F7CFF',
    'accent-press': '#3E63D6',
    'accent-soft': 'rgba(79,124,255,0.10)',
    success: '#5BB98C',
    'success-soft': 'rgba(91,185,140,0.14)',

    // Legacy keys — preserved for backward compatibility
    text: '#0F1115',
    background: '#F8F8F6',
    backgroundElement: '#EFEFEC',
    backgroundSelected: '#E7E7E3',
    textSecondary: '#62656C',
  },
  dark: {
    // Recall base tokens
    bg: '#0F1115',
    'bg-grouped': '#0B0C0F',
    card: '#1A1D23',
    'card-2': '#16181D',
    fill: '#22252C',
    'fill-2': '#2A2E36',
    ink: '#F4F5F7',
    'ink-2': '#9CA0A9',
    'ink-3': '#686C75',
    line: 'rgba(255,255,255,0.08)',
    'line-strong': 'rgba(255,255,255,0.14)',

    // Accent & semantic
    accent: '#5C86FF',
    'accent-press': '#5C86FF',
    'accent-soft': 'rgba(92,134,255,0.16)',
    success: '#5BB98C',
    'success-soft': 'rgba(91,185,140,0.18)',

    // Legacy keys — preserved for backward compatibility
    text: '#F4F5F7',
    background: '#0F1115',
    backgroundElement: '#22252C',
    backgroundSelected: '#2A2E36',
    textSecondary: '#9CA0A9',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

// ---------------------------------------------------------------------------
// Typography ramp (iOS SF Pro / system)
// ---------------------------------------------------------------------------

export const Typography = {
  largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: '700' as const, letterSpacing: -0.68 },
  title1: { fontSize: 28, lineHeight: 34, fontWeight: '700' as const, letterSpacing: -0.98 },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: '700' as const, letterSpacing: -0.66 },
  title3: { fontSize: 20, lineHeight: 25, fontWeight: '600' as const, letterSpacing: -0.4 },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600' as const, letterSpacing: -0.34 },
  body: { fontSize: 17, lineHeight: 22, fontWeight: '400' as const, letterSpacing: -0.17 },
  callout: { fontSize: 16, lineHeight: 21, fontWeight: '400' as const, letterSpacing: -0.16 },
  subhead: { fontSize: 15, lineHeight: 20, fontWeight: '400' as const, letterSpacing: -0.15 },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const, letterSpacing: 0 },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' as const, letterSpacing: 0.36 },
  /** Screen title — slightly tighter large title */
  screenTitle: { fontSize: 32, lineHeight: 38, fontWeight: '700' as const, letterSpacing: -0.64 },
} as const;

// ---------------------------------------------------------------------------
// Fonts
// ---------------------------------------------------------------------------

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

// ---------------------------------------------------------------------------
// Spacing — 4pt grid
// ---------------------------------------------------------------------------

export const Spacing = {
  /** 4pt */
  xs: 4,
  /** 8pt */
  sm: 8,
  /** 12pt */
  md: 12,
  /** 16pt */
  lg: 16,
  /** 20pt — screen edge */
  xl: 20,

  // Named aliases retained for backward compatibility
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

// ---------------------------------------------------------------------------
// Border radius
// ---------------------------------------------------------------------------

export const Radius = {
  /** 10 — chips */
  sm: 10,
  /** 14 — buttons */
  md: 14,
  /** 20 — grouped lists, tiles */
  lg: 20,
  /** 22 — memory cards, AI answer */
  card: 22,
  /** 26 */
  xl: 26,
  /** 28 — capture sheet top corners */
  sheet: 28,
  /** 999 — search pill, tags, FAB */
  pill: 999,
} as const;

// ---------------------------------------------------------------------------
// Shadows
// ---------------------------------------------------------------------------

export const Shadows = {
  card: {
    light: '0 1px 2px rgba(15,17,21,0.05), 0 10px 26px -12px rgba(15,17,21,0.10)',
    dark: '0 1px 2px rgba(0,0,0,0.4), 0 12px 30px -14px rgba(0,0,0,0.6)',
  },
  pop: {
    light: '0 8px 16px -6px rgba(15,17,21,0.12), 0 30px 60px -20px rgba(15,17,21,0.28)',
    dark: '0 8px 16px -6px rgba(15,17,21,0.12), 0 30px 60px -20px rgba(15,17,21,0.28)',
  },
  accentGlow: {
    light: '0 6px 16px -2px rgba(79,124,255,0.5)',
    dark: '0 6px 16px -2px rgba(92,134,255,0.5)',
  },
} as const;

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
