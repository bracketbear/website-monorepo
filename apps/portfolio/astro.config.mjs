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
      tailwindcss(),
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
          // Rolldown (Vite 8) only supports the function form of manualChunks
          manualChunks: (id) => {
            // Separate vendor chunks for better caching
            if (/node_modules\/(react|react-dom)\//.test(id)) {
              return 'react-vendor';
            }
            if (/node_modules\/(pixi\.js|@pixi)\//.test(id)) {
              return 'pixi-vendor';
            }
            if (id.includes('flateralus')) {
              return 'flateralus-vendor';
            }
          },
        },
      },
    },
  },
  output: 'static',
  prefetch: {
    prefetchAll: false, // Disable automatic prefetching to reduce initial load
    defaultStrategy: 'viewport', // Only prefetch when elements enter viewport
  },
});
