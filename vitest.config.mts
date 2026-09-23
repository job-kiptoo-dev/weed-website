import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { configDefaults, defineConfig } from "vitest/config";

/*
 * Database tests each start an in-memory PGlite (~600 MB resident), so they
 * run in their own project, one file at a time, after the unit tests.
 * Running several at once gets workers killed on memory-constrained
 * machines. Test files under these folders that never touch a database are
 * fast and run there too.
 */
const DB_TESTS = [
  "src/lib/db/**/*.test.ts",
  "src/services/**/*.test.ts",
  "src/**/*.db.test.ts",
];

export default defineConfig({
  plugins: [react()],
  test: {
    setupFiles: ["./vitest.setup.ts"],
    globals: false,
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "jsdom",
          include: ["src/**/*.test.{ts,tsx}"],
          exclude: [...configDefaults.exclude, ...DB_TESTS],
        },
      },
      {
        extends: true,
        test: {
          name: "db",
          environment: "node",
          include: DB_TESTS,
          fileParallelism: false,
          sequence: { groupOrder: 1 },
        },
      },
    ],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(
        new URL("./src/test/empty-module.ts", import.meta.url),
      ),
    },
  },
});
