// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import markdoc from '@astrojs/markdoc';
import svgr from 'vite-plugin-svgr';

const bracketbearCss = '/packages/ui-kit/dist/styles/bracketbear.tailwind.css';

// https://astro.build/config
export default defineConfig({
  integrations: [react(), markdoc()],
  vite: {
    fs: {
      allow: ['..', '../..'],
      watch: {
        ignored: [
          // Ignore everything under node_modules except ui-kit so we react to changes to the ui-kit styles
          '**/node_modules/**',
          '!**/node_modules/@bracketbear/ui-kit/dist/**',
        ],
      },
      optimizeDeps: {
        // ensure Vite pre-bundles your ui-kit so HMR works
        include: ['@bracketbear/ui-kit'],
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
  experimental: {
    // Enable experimental support for SVG images as components
    svg: true,
  },
});
