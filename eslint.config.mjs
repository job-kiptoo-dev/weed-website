import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Layering: only the data layer (services, auth, the db module itself)
  // and test helpers talk to the database; the seed data is for seeding and
  // tests, never runtime code.
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/db", "@/lib/db/*"],
              message:
                "Read data through src/services (or src/lib/auth); only the data layer imports the database.",
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      "src/services/**/*.{ts,tsx}",
      "src/lib/auth/**/*.{ts,tsx}",
      "src/app/api/auth/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/db/seed-data", "@/lib/db/seed-data/*"],
              message:
                "Seed data is for the seed and tests only; query the database instead.",
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      "src/lib/db/**/*.{ts,tsx}",
      "src/services/**/*.test.{ts,tsx}",
      "src/test/**/*.{ts,tsx}",
    ],
    rules: { "no-restricted-imports": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
