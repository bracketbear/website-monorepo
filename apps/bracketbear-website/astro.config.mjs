// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import markdoc from '@astrojs/markdoc';
import svgr from 'vite-plugin-svgr';

const bracketbearCss = '/packages/core/dist/styles/bracketbear.tailwind.css';

// https://astro.build/config
export default defineConfig({
  integrations: [react(), markdoc()],
  vite: {
    fs: {
      allow: ['..', '../..'],
      watch: {
        ignored: [
          // Ignore everything under node_modules except core so we react to changes to the core styles
          '**/node_modules/**',
          '!**/node_modules/@bracketbear/core/dist/**',
        ],
      },
      optimizeDeps: {
        // ensure Vite pre-bundles your core package so HMR works
        include: ['@bracketbear/core'],
      },
    },
    plugins: [
      // @ts-expect-error: Bug with TailwindCSS Vite plugin type definition
      tailwindcss(),
      // @ts-expect-error: Bug with Vite plugin type definition
      svgr(),
      // TODO: There's a bug where you have to save global.css in order for the HMR to work.
      // TODO: pull this out into UX kit and make it a plugin.
      {
        name: 'vite-plugin-watch-ui-kit-css',
        enforce: 'post',
        handleHotUpdate({ file, server }) {
          if (file.endsWith(bracketbearCss)) {
            console.log('handleHotUpdate', file);
            server.ws.send({ type: 'full-reload' });
            return [];
          }
        },
      },
    ],
  },
  output: 'static',
});
