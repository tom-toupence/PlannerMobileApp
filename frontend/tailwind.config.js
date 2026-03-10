const { hairlineWidth, platformSelect } = require('nativewind/theme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // App dark theme palette
        bg: '#0B0B1A',
        surface: '#151528',
        'surface-light': '#1E1E36',
        'surface-lighter': '#2A2A4A',
        accent: {
          DEFAULT: '#7C5CFC',
          dark: '#5531D9',
          light: '#9F85FF',
          glow: 'rgba(124,92,252,0.3)',
        },
        cyan: '#00D4FF',
        teal: '#00C9A7',
        pink: '#FF6B9D',
        'app-red': '#FF5A5A',
        'text-primary': '#EEEEF6',
        'text-secondary': '#8B8CA7',
        'text-muted': '#5A5B75',
        'app-border': '#252540',
      },
      borderWidth: {
        hairline: hairlineWidth(),
      },
    },
  },
  plugins: [],
};
