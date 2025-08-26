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
  },
  output: 'static',
});
