const defaultTheme = require('tailwindcss/defaultTheme')
const plugin = require('tailwindcss/plugin')

module.exports = {
  mode: 'jit',
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    fontFamily: {
      sans: ['Radio Canada', ...defaultTheme.fontFamily.sans]
    },
    extend: {
      textShadow: {
        sm: '0 1px 2px var(--tw-shadow-color)',
        DEFAULT: '0 2px 4px var(--tw-shadow-color)',
        lg: '0 8px 16px var(--tw-shadow-color)',
      },
      colors: {
        red: {
          50: '#fef6f6',
          100: '#fdecec',
          200: '#facccf',
          300: '#f8acaf',
          400: '#f47f7e',
          500: '#f2504e',
          600: '#d61c1c',
          700: '#b51717',
          800: '#930f0f',
          900: '#770b0b'
        },
        accent: {
          50: '#f2fcfb',
          100: '#e6faf6',
          200: '#bff2e9',
          300: '#99e9dc',
          400: '#4dd9c1',
          500: '#00c9a7',
          600: '#00b596',
          700: '#00977d',
          800: '#007964',
          900: '#006252'
        },
        light: {
          50: '#fffeff',
          100: '#fffdff',
          200: '#fefaff',
          300: '#fdf7ff',
          400: '#fcf0ff',
          500: '#ffb7f7',
          600: '#e2d3e6',
          700: '#bcb0bf',
          800: '#978c99',
          900: '#7b737d'
        },
        main: {
          50: '#f7f6f7',
          100: '#eeedf0',
          200: '#d5d3d8',
          300: '#bcb8c1',
          400: '#8a8393',
          500: '#584e64',
          600: '#4f465a',
          700: '#423b4b',
          800: '#352f3c',
          900: '#2b2631'
        },
        dark: {
          50: '#f4f4f5',
          100: '#eae9eb',
          200: '#cac8cd',
          300: '#aaa7ae',
          400: '#6a6472',
          500: '#2a2235',
          600: '#261f30',
          700: '#201a28',
          800: '#191420',
          900: '#15111a'
        }
      }
    }
  },
  plugins: [
    plugin(function ({ addUtilities }) {
      addUtilities({
        '.bg-overlay': {
          background: 'linear-gradient(var(--overlay-angle, 0deg), var(--overlay-colors)), var(--overlay-image)',
          'background-position': 'center',
          'background-size': 'cover',
          'background-repeat': 'no-repeat'
        },
      })
    }),
    plugin(function ({ matchUtilities, theme }) {
      matchUtilities(
        {
          'text-shadow': (value) => ({
            textShadow: value,
          }),
        },
        { values: theme('textShadow') }
      )
    }),
    require('daisyui'),
    require('tailwind-scrollbar'),
    require('tailwind-filter-utilities'),
    require('@tailwindcss/typography')
  ],
  daisyui: {
    themes: false,
    darkTheme: "light"
  },
}
