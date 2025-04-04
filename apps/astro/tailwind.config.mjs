/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        cream: '#F5F5DC', // Adding cream color
        'brand-orange': {
          400: '#FF4500', // Vibrant red-orange
          500: '#FF5F1F', // Bright orange
          600: '#FF7A3D', // Mid orange
          700: '#FF954F', // Light orange
        },
        'brand-yellow': {
          400: '#FFB347', // Deep yellow-orange
          500: '#FFC261', // Bright yellow-orange
          600: '#FFD17A', // Light yellow-orange
          700: '#FFE194', // Pale yellow-orange
        },
      },
      backgroundImage: {
        'gradient-to-r': 'linear-gradient(to right, var(--tw-gradient-stops))',
        'gradient-to-br':
          'linear-gradient(to bottom right, var(--tw-gradient-stops))',
        'gradient-to-b': 'linear-gradient(to bottom, var(--tw-gradient-stops))',
        'gradient-to-tr':
          'linear-gradient(to top right, var(--tw-gradient-stops))',
        'gradient-radial':
          'radial-gradient(circle at center, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
};
