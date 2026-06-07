/**
 * Wardrobe typography system.
 * Font role definitions for all 7 roles using the three brand typefaces:
 * - Cormorant Garamond (serif, editorial headings)
 * - DM Sans (body, chips, UI text)
 * - JetBrains Mono (eyebrow labels)
 *
 * Fonts are loaded at app startup via @expo-google-fonts packages.
 */

// ---------------------------------------------------------------------------
// Font family constants
// ---------------------------------------------------------------------------

export const FontFamily = {
  /** Cormorant Garamond — titles and hero text */
  serif: 'CormorantGaramond_500Medium',
  /** Cormorant Garamond Italic — italic variant for headers */
  serifItalic: 'CormorantGaramond_500Medium_Italic',
  /** DM Sans Regular — body, captions, UI text */
  sans: 'DMSans_400Regular',
  /** DM Sans Medium — chips, buttons */
  sansMedium: 'DMSans_500Medium',
  /** DM Sans SemiBold — emphasis */
  sansSemiBold: 'DMSans_600SemiBold',
  /** JetBrains Mono Regular — eyebrow labels */
  mono: 'JetBrainsMono_400Regular',
} as const;

// ---------------------------------------------------------------------------
// Typography roles
// ---------------------------------------------------------------------------

export const Typography = {
  /** Hero title — Cormorant Garamond 500, 36px */
  heroTitle: {
    fontFamily: FontFamily.serif,
    fontSize: 36,
    fontWeight: '500' as const,
    lineHeight: 42,
  },
  /** Page title — Cormorant Garamond 500, 30-32px */
  pageTitle: {
    fontFamily: FontFamily.serif,
    fontSize: 32,
    fontWeight: '500' as const,
    lineHeight: 38,
  },
  /** Section title — Cormorant Garamond 500, 19-22px */
  sectionTitle: {
    fontFamily: FontFamily.serif,
    fontSize: 20,
    fontWeight: '500' as const,
    lineHeight: 26,
  },
  /** Item name (grid) — Cormorant Garamond 500, 16px */
  itemName: {
    fontFamily: FontFamily.serif,
    fontSize: 16,
    fontWeight: '500' as const,
    lineHeight: 20,
  },
  /** Body / chat — DM Sans 400, 13.5-14px */
  body: {
    fontFamily: FontFamily.sans,
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  /** Chip / button — DM Sans 500-600, 12.5-13.5px */
  chip: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 13,
    fontWeight: '500' as const,
    lineHeight: 18,
  },
  /** Eyebrow — JetBrains Mono 400, 10px, uppercase, 1.6 letter-spacing */
  eyebrow: {
    fontFamily: FontFamily.mono,
    fontSize: 10,
    fontWeight: '400' as const,
    lineHeight: 14,
    letterSpacing: 1.6,
    textTransform: 'uppercase' as const,
  },
} as const;

export type TypographyRole = keyof typeof Typography;
