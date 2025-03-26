import eslintPluginAstro from "eslint-plugin-astro";
import love from "eslint-config-love";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";

export default [
  love,
  ...eslintPluginAstro.configs.recommended,
  eslintPluginPrettierRecommended,
  {
    rules: {
      "comma-dangle": [
        "error",
        {
          arrays: "always-multiline",
          objects: "always-multiline",
          imports: "always-multiline",
          exports: "always-multiline",
          functions: "ignore",
        },
      ],
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
    parserOptions: {
      parser: "@typescript-eslint/parser",
      extraFileExtensions: [".astro"],
      project: "./tsconfig.json",
    },
    extends: ["plugin:astro/recommended"],
    rules: {
      quotes: ["error", "single"],
    },
  },
];
