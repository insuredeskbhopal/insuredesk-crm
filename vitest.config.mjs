import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.js"],
    include: ["tests/**/*.{test,spec}.{js,jsx,ts,tsx}"],
    exclude: ["archive/**", "**/node_modules/**", "dist/**", ".next/**"],
  },
});
