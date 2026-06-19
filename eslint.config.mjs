import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import reactPlugin from "eslint-plugin-react";

export default [
  {
    ignores: [".next/**", ".vite/**", "dist/**", "node_modules/**", "coverage/**"],
  },
  js.configs.recommended,
  {
    files: ["**/*.{js,jsx,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        Blob: "readonly",
        Buffer: "readonly",
        File: "readonly",
        FormData: "readonly",
        URL: "readonly",
        React: "readonly",
        Response: "readonly",
        console: "readonly",
        document: "readonly",
        fetch: "readonly",
        globalThis: "readonly",
        module: "readonly",
        process: "readonly",
        require: "readonly",
        self: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        exports: "readonly",
        setTimeout: "readonly",
        window: "readonly",
      },
    },
    plugins: {
      "@next/next": nextPlugin,
      react: reactPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-control-regex": "off",
      "no-empty": ["error", { allowEmptyCatch: true }],
      "react/jsx-uses-react": "off",
      "react/jsx-uses-vars": "error",
    },
  },
];
