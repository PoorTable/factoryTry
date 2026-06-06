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
        // Recall base colors (light)
        bg: '#F8F8F6',
        'bg-grouped': '#F1F1EE',
        card: '#FFFFFF',
        'card-2': '#FBFBF9',
        fill: '#EFEFEC',
        'fill-2': '#E7E7E3',
        ink: '#0F1115',
        'ink-2': '#62656C',
        'ink-3': '#9A9DA4',

        // Accent & semantic
        accent: '#4F7CFF',
        'accent-press': '#3E63D6',
        'accent-soft': 'rgba(79,124,255,0.10)',
        success: '#5BB98C',
        'success-soft': 'rgba(91,185,140,0.14)',
      },
      spacing: {
        // Recall 4pt grid
        'r-xs': '4px',
        'r-sm': '8px',
        'r-md': '12px',
        'r-lg': '16px',
        'r-xl': '20px',
      },
      borderRadius: {
        // Recall radius tokens
        'r-sm': '10px',
        'r-md': '14px',
        'r-lg': '20px',
        'r-card': '22px',
        'r-xl': '26px',
        'r-sheet': '28px',
        'r-pill': '999px',
      },
    },
  },
  plugins: [],
};
