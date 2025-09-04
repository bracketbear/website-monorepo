import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: [
      'packages/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'apps/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'scripts/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
    ],
    exclude: [
      '.astro',
      '**/*.d.ts',
      '**/node_modules/**',
      '**/*.dist/**',
      '**/*.astro',
      'packages/core/src/astro/**/*',
    ],
    setupFiles: ['./vitest.setup.ts'],
    silent: true,
    onConsoleLog(log, type) {
      if (type === 'stderr') return false;
      return true;
    },
  },
  resolve: {
    alias: {
      '@bracketbear/core': resolve(__dirname, './packages/core/src'),
      '@bracketbear/core/react': resolve(
        __dirname,
        './packages/core/src/react'
      ),
      '@bracketbear/astro-content': resolve(
        __dirname,
        './packages/astro-content'
      ),
    },
  },
});
