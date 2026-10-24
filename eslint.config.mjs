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
    settings: {
      "import/resolver": {
        typescript: {
          project: "./tsconfig.json",
        },
        node: {
          extensions: [".js", ".jsx", ".ts", ".tsx"],
          moduleDirectory: ["node_modules", "."],
        },
      },
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
    },
  },
  {
    files: ["scripts/maker-dmg.ts"],
    // npm omits this optional native build dependency on Linux and Windows.
    rules: { "import/no-unresolved": ["error", { ignore: ["^ds-store$"] }] },
  },
  {
    ignores: ["node_modules/**", ".vite/**", "out/**", "patches/**"],
  },
];
