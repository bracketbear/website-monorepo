import eslintPluginAstro from "eslint-plugin-astro";
import love from "eslint-config-love";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";

export default [
  love,
  ...eslintPluginAstro.configs.recommended,
  eslintPluginPrettierRecommended,
  {
    rules: {
      "comma-dangle": ["error", "always-multiline"],
    },
    ignores: [
      "**/node_modules/**",
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
  {
    files: ["*.astro"],
    parser: "astro-eslint-parser",
    extends: ["plugin:astro/recommended"],
    rules: {
      "quotes": ["error", "single"],
    },
  },
];
