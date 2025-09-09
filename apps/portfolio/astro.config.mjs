// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import svgr from 'vite-plugin-svgr';

const bracketbearCss = '/packages/core/dist/styles/bracketbear.tailwind.css';

// https://astro.build/config
export default defineConfig({
  integrations: [react()],
  vite: {
    plugins: [
      // @ts-expect-error: Bug with TailwindCSS Vite plugin type definition
      tailwindcss(),
      // @ts-expect-error: Bug with TailwindCSS Vite plugin type definition
      svgr(),
      // TODO: There's a bug where you have to save global.css in order for the HMR to work.
      // TODO: pull this out into UX kit and make it a plugin.
      {
        name: 'vite-plugin-watch-ui-kit-css',
        enforce: 'post',
        handleHotUpdate({ file, server }) {
          if (file.endsWith(bracketbearCss)) {
            server.ws.send({ type: 'full-reload' });
            return [];
          }
        },
      },
    ],
    build: {
      cssCodeSplit: true, // Enable CSS code splitting
      rollupOptions: {
        output: {
          manualChunks: {
            // Separate vendor chunks for better caching
            'react-vendor': ['react', 'react-dom'],
            'pixi-vendor': ['pixi.js'],
            'flateralus-vendor': [
              '@bracketbear/flateralus-react',
              '@bracketbear/flateralus-pixi',
              '@bracketbear/flateralus-pixi-animations',
            ],
          },
        },
      },
    },
  },
  output: 'static',
  compressHTML: true,
  prefetch: {
    prefetchAll: false, // Disable automatic prefetching to reduce initial load
    defaultStrategy: 'viewport', // Only prefetch when elements enter viewport
  },
});
