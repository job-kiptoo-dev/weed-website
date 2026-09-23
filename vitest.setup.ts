import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Tests must never reach a real database. Database tests inject an
// in-memory PGlite instance (src/test/db.ts) and getDb() refuses to run
// under Vitest; scrubbing the URLs is a second line of defence.
for (const name of Object.keys(process.env)) {
  if (name.startsWith("DATABASE_URL") || name.startsWith("POSTGRES_URL")) {
    delete process.env[name];
  }
}

afterEach(() => {
  cleanup();
});
