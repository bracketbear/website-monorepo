// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  integrations: [react()],
  vite: {
    // @ts-ignore: Bug with TailwindCSS Vite plugin type definition
    plugins: [tailwindcss()],
  },
});