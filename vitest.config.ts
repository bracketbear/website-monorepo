import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'packages/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'apps/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
    ],
    exclude: [
      'node_modules',
      'dist',
      '.astro',
      '**/*.d.ts',
      '**/node_modules/**',
    ],
  },
  resolve: {
    alias: {
      '@bracketbear/core': resolve(__dirname, './packages/core/src'),
      '@bracketbear/astro-content': resolve(
        __dirname,
        './packages/astro-content'
      ),
    },
  },
});
