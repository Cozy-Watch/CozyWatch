import js from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import importPlugin from "eslint-plugin-import";
import globals from "globals";

export default [
  js.configs.recommended,
  ...tsPlugin.configs["flat/recommended"],
  importPlugin.flatConfigs.recommended,
  importPlugin.flatConfigs.electron,
  importPlugin.flatConfigs.typescript,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
    },
  },
  {
    ignores: ["node_modules/**", ".vite/**", "out/**", "patches/**"],
  },
];
