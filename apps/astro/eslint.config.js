import eslintPluginAstro from 'eslint-plugin-astro';
import { defineConfig } from 'eslint/config';
import love from 'eslint-config-love';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';

export default defineConfig([
  love,
  ...eslintPluginAstro.configs.recommended,
  eslintPluginPrettierRecommended,
  {
    rules: {
      'comma-dangle': 'off',
      '@typescript-eslint/no-magic-numbers': [
        'error',
        {
          detectObjects: false,
          ignoreArrayIndexes: true,
          ignoreDefaultValues: true,
          ignore: [-1, 0, 1, 2],
        },
      ],
      'prettier/prettier': [
        'error',
        {
          trailingComma: 'es5',
          tabWidth: 2,
          semi: true,
          singleQuote: true,
          printWidth: 80,
          endOfLine: 'lf',
          bracketSpacing: true,
        },
      ],
    },
    ignores: [
      '**/node_modules/**',
      'dist/',
      '.astro/',
      '.env',
      '.env.production',
      'npm-debug.log*',
      'yarn-debug.log*',
      'yarn-error.log*',
      'pnpm-debug.log*',
      '.vscode/',
      '.idea/',
      'src/assets/',
    ],
  },
  {
    files: ['*.astro'],
    parser: 'astro-eslint-parser',
    parserOptions: {
      parser: '@typescript-eslint/parser',
      extraFileExtensions: ['.astro'],
      project: './tsconfig.json',
    },
    extends: [...eslintPluginAstro.configs.recommended],
    rules: {
      quotes: ['error', 'single'],
      'comma-dangle': 'off',
      'prettier/prettier': [
        'error',
        {
          parser: 'astro',
        },
      ],
    },
  },
]);
