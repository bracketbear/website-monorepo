import { defineConfig } from 'eslint/config';
import love from 'eslint-config-love';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import prettierPlugin from 'eslint-plugin-prettier';

export default defineConfig([
  // Base configuration for all files
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.astro/**',
      '**/.next/**',
      '**/build/**',
      '**/coverage/**',
      '.env*',
      'npm-debug.log*',
      'yarn-debug.log*',
      'yarn-error.log*',
      'pnpm-debug.log*',
      '.vscode/',
      '.idea/',
      '**/src/assets/**',
      '**/public/**',
    ],
  },

  // JavaScript/TypeScript files
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    ...love,
    plugins: {
      '@typescript-eslint': typescriptEslint,
      prettier: prettierPlugin,
    },
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      'comma-dangle': 'off',
      'prefer-destructuring': 'off',
      '@typescript-eslint/no-magic-numbers': [
        'error',
        {
          detectObjects: false,
          ignoreArrayIndexes: true,
          ignoreDefaultValues: true,
          ignore: [-1, 0, 1, 2],
        },
      ],
      '@typescript-eslint/no-unused-vars': ['error'],
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
  },
]);
