import { existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Local env files for scripts (drizzle-kit, migrate, seed), in precedence
 * order. `process.loadEnvFile` never overrides a variable that is already
 * set, so earlier files and the shell win, matching Next's own order.
 */
export const LOCAL_ENV_FILES = [
  ".env.development.local",
  ".env.local",
  ".env.seed.local",
] as const;

/** Loads the files that exist and returns their names (never values). */
export function loadLocalEnv(root: string = process.cwd()): string[] {
  const loaded: string[] = [];
  for (const file of LOCAL_ENV_FILES) {
    const path = resolve(root, file);
    if (existsSync(path)) {
      process.loadEnvFile(path);
      loaded.push(file);
    }
  }
  return loaded;
}
