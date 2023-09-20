import plugin from 'tailwindcss/plugin'

// Putting this here so I can reference it in the theme
// in multiple places. Might be a better way? 🤷‍♂️
const blackColor = '#262626'

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend:
    {
      fontFamily: {
        sans: ['Heebo', 'sans-serif'],
        heading: ['Bungee', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#F1880D',
          dark: '#C26D0A',
          lightest: '#FCE7CF',
        },
        secondary: {
          DEFAULT: '#B8D5B8',
          dark: '#78AF78',
        },
        warning: {
          DEFAULT: '#FFC107',
          dark: '#E0A800',
          darker: '#C69500',
        },
        error: {
          DEFAULT: '#DC3545',
          dark: '#C82333',
          darker: '#B21F2D',
        },
        success: {
          DEFAULT: '#28A745',
          dark: '#218838',
          darker: '#1C7430',
        },
        white: {
          DEFAULT: '#FFFFFF',
          dark: '#F2F2F2',
          darker: '#E5E5E5',
        },
        black: {
          DEFAULT: blackColor,
        },
        'alt-1': {
          DEFAULT: '#6883BA',
        },
        'alt-2': {
          DEFAULT: '#E072A4',
        },
      },
    },
    container: {
      center: true,
      padding: '1rem',
    },
  },
  plugins: [
    plugin(function ({ addUtilities }) {
      const newUtilities = {
        // TODO: Make this so you can set color and width
        '.text-stroke': {
          '-webkit-text-stroke': `0.125rem ${blackColor}`,
        },
        '.text-hard-shadow': {
          'text-shadow': `0.125em 0.125em 0 ${blackColor}`,
        },
        '.hard-shadow': {
          'box-shadow': `0.25rem 0.25rem 0 ${blackColor}`,
        },
        '.hard-shadow-xl': {
          'box-shadow': `0.5rem 0.5rem 0 ${blackColor}`,
        },
      }

      addUtilities(newUtilities)
    }),
  ],
}
