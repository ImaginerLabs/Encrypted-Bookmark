/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/__tests__/**/*.test.{ts,tsx}"],
    exclude: ["node_modules", "dist", "e2e"],
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "lcov", "html"],
      reportsDirectory: "./coverage",
      include: [
        "src/services/**/*.ts",
        "src/storage/**/*.ts",
        "src/utils/**/*.ts",
        "src/popup/hooks/**/*.ts",
        "src/services/parsers/**/*.ts",
      ],
      exclude: [
        "src/**/__tests__/**",
        "src/**/index.ts",
        "src/test/**",
        "src/**/*.d.ts",
        "src/**/*.css",
        "src/**/*.md",
      ],
      thresholds: {
        lines: 40,
        functions: 40,
        branches: 30,
        statements: 40,
      },
    },
  },
});
