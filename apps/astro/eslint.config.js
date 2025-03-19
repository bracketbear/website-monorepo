import eslintPluginAstro from 'eslint-plugin-astro';
import love from 'eslint-config-love';

const MAX_LINE_LENGTH = 100;

export default [
  ...eslintPluginAstro.configs.recommended,
  love,
  {
    rules: {
      "max-len": ["error", { "code": MAX_LINE_LENGTH, "ignoreUrls": true }],
      "comma-dangle": ["error", "always-multiline"],
    },
    ignores: [
      "node_modules/",
      "dist/",
      ".astro/",
      ".env",
      ".env.production",
      "npm-debug.log*",
      "yarn-debug.log*",
      "yarn-error.log*",
      "pnpm-debug.log*",
      ".vscode/",
      ".idea/",
      "src/assets/",
    ],
  },
];