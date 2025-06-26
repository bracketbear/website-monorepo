// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import keystatic from '@keystatic/astro';
import markdoc from '@astrojs/markdoc';
import svgr from 'vite-plugin-svgr';

const bracketbearCss = '/packages/ui-kit/dist/styles/bracketbear.tailwind.css' as const;

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
        }
      },
    ],
  },
  output: 'static',
  experimental: {
    // Enable experimental support for SVG images as components
    svg: true,
  },
});
