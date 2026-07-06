import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "next/headers": fileURLToPath(new URL("./tests/mocks/next-headers.js", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.js"],
    include: ["tests/**/*.{test,spec}.{js,jsx,ts,tsx}"],
    exclude: ["archive/**", "**/node_modules/**", "dist/**", ".next/**"],
    server: {
      deps: {
        inline: ["next"],
      },
    },
  },
});
