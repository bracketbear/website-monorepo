// import eslintPluginAstro from 'eslint-plugin-astro';
import { defineConfig } from 'eslint/config';
import love from 'eslint-config-love';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';

export default defineConfig([
  love,
  // ...eslintPluginAstro.configs.recommended,
  eslintPluginPrettierRecommended,
  {
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
      '@typescript-eslint/no-deprecated': 'off',
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
  // {
  //   files: ['*.astro'],
  //   parser: 'astro-eslint-parser',
  //   parserOptions: {
  //     // Use the TypeScript parser to handle the script parts, but do NOT include the project option
  //     parser: '@typescript-eslint/parser',
  //     extraFileExtensions: ['.astro'],
  //     ecmaVersion: 2020,
  //     sourceType: 'module',
  //   },
  //   rules: {
  //     quotes: ['error', 'single'],
  //     'comma-dangle': 'off',
  //     '@typescript-eslint/no-magic-numbers': 'off',
  //     'prettier/prettier': [
  //       'error',
  //       {
  //         parser: 'astro',
  //       },
  //     ],
  //   },
  // },
]);
