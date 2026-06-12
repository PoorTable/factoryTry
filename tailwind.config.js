/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './app/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Wardrobe palette — must stay byte-identical to src/theme/tokens.ts Colors
        paper: '#F8F4EE',
        'paper-2': '#F1EBE0',
        ink: '#2A2520',
        'ink-soft': '#4A3F36',
        muted: '#8A7C6E',
        hairline: '#DDD3C2',
        mist: '#ECE6DC',
        stone: '#D6CCBC',
        cognac: '#A35836',
        'cognac-deep': '#8A4426',
        terracotta: '#C97B5E',
        clay: '#B86F4A',
        /** Vibe score ring only — do not reuse */
        amber: '#C89B3C',

        // Swatch tones used by seed data
        sage: '#7A8454',
        camel: '#B89368',
        'slate-warm': '#6E7A88',
        plum: '#6B4858',
        sand: '#E7D9BE',
        bone: '#DDD3C0',
      },
      spacing: {
        /** Screen horizontal padding */
        'screen-h': '22px',
        /** Wardrobe grid gap */
        grid: '10px',
      },
      borderRadius: {
        /** Cards */
        card: '18px',
        /** Small stat cards */
        'card-sm': '16px',
        /** Item photos */
        item: '14px',
        /** Tab bar, composer */
        surface: '28px',
        /** Pill — chips, tags */
        pill: '999px',
      },
      fontFamily: {
        serif: ['CormorantGaramond_500Medium'],
        sans: ['DMSans_400Regular'],
        /** Chips, buttons — mirrors Typography.chip (DM Sans Medium) */
        'sans-medium': ['DMSans_500Medium'],
        mono: ['JetBrainsMono_400Regular'],
      },
    },
  },
  plugins: [],
};
