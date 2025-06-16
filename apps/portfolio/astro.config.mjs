// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import keystatic from '@keystatic/astro';
import markdoc from '@astrojs/markdoc';
import svgr from 'vite-plugin-svgr';

// https://astro.build/config
export default defineConfig({
  integrations: [
    react(),
    markdoc(),
    // Bug when trying to statically render website. This disabless Keystatic when building.
    !import.meta.env.PROD ? keystatic() : null,
  ],
  vite: {
    plugins: [
      // @ts-expect-error: Bug with TailwindCSS Vite plugin type definition
      tailwindcss(),
      // @ts-expect-error: Bug with TailwindCSS Vite plugin type definition
      svgr(),
    ],
  },
  output: 'static',
  experimental: {
    // Enable experimental support for SVG images as components
    svg: true,
  },
});
