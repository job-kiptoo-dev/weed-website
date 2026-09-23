import { defineConfig } from "vitest/config";

/*
 * HTTP end-to-end tests against a running server (see tests/e2e). Not part
 * of `pnpm test`: run them by hand with `pnpm test:e2e:auth`, pointing
 * E2E_BASE_URL at a dev server (default http://localhost:3002). No setup
 * file and no database: the tests only speak HTTP.
 */
export default defineConfig({
  test: {
    name: "e2e",
    environment: "node",
    include: ["tests/e2e/**/*.e2e.ts"],
    globals: false,
    fileParallelism: false,
    // The first request to a dev server compiles the route.
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
