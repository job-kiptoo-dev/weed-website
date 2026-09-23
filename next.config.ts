import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // PGlite loads its WASM and data files relative to its own module, so it
  // must run from node_modules rather than be bundled. It backs the
  // in-memory local development database (src/lib/db/dev-db.ts).
  serverExternalPackages: ["@electric-sql/pglite"],
  // Vercel always uses Neon, so keep the ~10 MB PGlite files out of the
  // serverless function traces there. Local builds use PGlite instead, and
  // every build worker seeds its own copy (~600 MB each), so cap the worker
  // count there to keep memory-constrained machines from running out.
  ...(process.env.VERCEL === "1"
    ? {
        outputFileTracingExcludes: {
          "/*": [
            "node_modules/@electric-sql/pglite/**",
            "node_modules/.pnpm/@electric-sql+pglite@*/**",
          ],
        },
      }
    : { experimental: { cpus: 2 } }),
};

export default nextConfig;
