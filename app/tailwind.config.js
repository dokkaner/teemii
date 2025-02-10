/** @type {import('tailwindcss').Config} */
import typography from '@tailwindcss/typography'
import daisyui from 'daisyui'
import scrollbar from 'tailwind-scrollbar'
import filterUtilities from 'tailwind-filter-utilities'

export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}'
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        main: {
          50: 'var(--main-50)',
          100: 'var(--main-100)',
          200: 'var(--main-200)',
          300: 'var(--main-300)',
          400: 'var(--main-400)',
          500: 'var(--main-500)',
          600: 'var(--main-600)',
          700: 'var(--main-700)',
          800: 'var(--main-800)',
          900: 'var(--main-900)'
        },
        light: {
          50: 'var(--light-50)',
          100: 'var(--light-100)',
          200: 'var(--light-200)',
          300: 'var(--light-300)',
          400: 'var(--light-400)',
          500: 'var(--light-500)',
          600: 'var(--light-600)',
          700: 'var(--light-700)',
          800: 'var(--light-800)',
          900: 'var(--light-900)'
        },
        accent: {
          100: 'var(--accent-100)',
          200: 'var(--accent-200)',
          300: 'var(--accent-300)',
          400: 'var(--accent-400)',
          500: 'var(--accent-500)',
          600: 'var(--accent-600)',
          700: 'var(--accent-700)'
        },
        dark: {
          100: 'var(--dark-100)',
          200: 'var(--dark-200)',
          300: 'var(--dark-300)',
          400: 'var(--dark-400)',
          500: 'var(--dark-500)',
          600: 'var(--dark-600)',
          700: 'var(--dark-700)',
          800: 'var(--dark-800)',
          900: 'var(--dark-900)'
        },
        darkMain: {
          300: 'var(--dark-main-300)',
          400: 'var(--dark-main-400)',
          500: 'var(--dark-main-500)',
          600: 'var(--dark-main-600)',
          700: 'var(--dark-main-700)',
          800: 'var(--dark-main-800)'
        },
        darkLight: {
          50: 'var(--dark-light-50)',
          100: 'var(--dark-light-100)',
          200: 'var(--dark-light-200)',
          300: 'var(--dark-light-300)',
          400: 'var(--dark-light-400)',
          500: 'var(--dark-light-500)'
        },
        darkAccent: {
          100: 'var(--dark-accent-100)',
          200: 'var(--dark-accent-200)',
          300: 'var(--dark-accent-300)',
          400: 'var(--dark-accent-400)',
          500: 'var(--dark-accent-500)',
          600: 'var(--dark-accent-600)',
          700: 'var(--dark-accent-700)'
        },
        green: {
          50: 'var(--green-50)',
          400: 'var(--green-400)',
          700: 'var(--green-700)'
        }
      },
      transitionProperty: {
        width: 'width'
      },
      textShadow: {
        sm: '0 1px 2px var(--tw-shadow-color)',
        DEFAULT: '0 2px 4px var(--tw-shadow-color)',
        lg: '0 8px 16px var(--tw-shadow-color)'
      }
    }
  },
  plugins: [
    typography,
    daisyui,
    scrollbar,
    filterUtilities,
    function ({ addUtilities }) {
      const newUtilities = {
        '.text-shadow-sm': {
          textShadow: '0 1px 2px var(--tw-shadow-color, rgba(0, 0, 0, 0.1))'
        },
        '.text-shadow': {
          textShadow: '0 2px 4px var(--tw-shadow-color, rgba(0, 0, 0, 0.1))'
        },
        '.text-shadow-lg': {
          textShadow: '0 8px 16px var(--tw-shadow-color, rgba(0, 0, 0, 0.1))'
        },
        '.chapter-view': {},
        '.home-view': {},
        '.manga-view': {},
        '.mangas-view': {},
        '.search-view': {},
        '.border-main\\/10': {
          borderColor: 'rgb(var(--main-color) / 0.1)'
        },
        '.text-main': {
          color: 'var(--main-color)'
        },
        '.text-green': {
          color: 'var(--green-color)'
        },
        '.-px-1': {
          paddingLeft: '-0.25rem',
          paddingRight: '-0.25rem'
        }
      }
      addUtilities(newUtilities)
    }
  ],
  daisyui: {
    themes: ['light', 'dark']
  }
}
