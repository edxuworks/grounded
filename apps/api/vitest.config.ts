import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    // Use 'node' environment — tests run in Node.js context, not jsdom.
    environment: "node",
    // Global test utilities (describe, it, expect) available without importing.
    globals: true,
    // Setup file runs before each test file — used for mock resets.
    setupFiles: ["./src/__tests__/setup.ts"],
    // Coverage config: only collect coverage from src/, excluding test files.
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/__tests__/**", "src/index.ts"],
      // Enforce minimum coverage thresholds — CI fails if these are not met.
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
      },
    },
  },
  resolve: {
    alias: {
      // Must match tsconfig.json paths for tests to resolve imports correctly.
      "@": path.resolve(__dirname, "./src"),
      // Point workspace packages at their TypeScript source so tests run without
      // needing a prior `pnpm build` in those packages.  Vitest (via esbuild)
      // compiles them on the fly — no dist/ required in the dev/test loop.
      "@grounded/types": path.resolve(__dirname, "../../packages/types/src/index.ts"),
      "@grounded/db": path.resolve(__dirname, "../../packages/db/src/index.ts"),
    },
  },
});
