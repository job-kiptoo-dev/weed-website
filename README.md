# Botanics

Storefront for Botanics, a small-batch hemp-derived CBD brand (tinctures,
gummies, topicals and teas). The catalog is served from Postgres (Neon on
Vercel, an in-memory PGlite database seeded from data files locally), with
email/password accounts via Better Auth. Payments and checkout come in later
phases.

## Stack

- Next.js 16 (App Router, Turbopack) with React 19 and the React Compiler
- TypeScript in strict mode
- Tailwind CSS v4 with project tokens in `src/app/globals.css`
- Zod for form validation
- Vitest + Testing Library (jsdom) for unit tests
- ESLint (`eslint-config-next`) and Prettier (with the Tailwind plugin)
- pnpm, Node 24+

## Scripts

| Command                                                 | What it does                                                                 |
| ------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `pnpm dev`                                              | Start the dev server (pass `--port 3001` or 3002)                            |
| `pnpm build`                                            | Production build                                                             |
| `pnpm start`                                            | Serve the production build                                                   |
| `pnpm typecheck`                                        | Generate route types and run `tsc --noEmit`                                  |
| `pnpm lint`                                             | ESLint                                                                       |
| `pnpm test`                                             | Run the unit tests once                                                      |
| `pnpm test:watch`                                       | Run the unit tests in watch mode                                             |
| `pnpm test:e2e:auth`                                    | HTTP auth tests against a running server (`E2E_BASE_URL`, default port 3002) |
| `pnpm format`                                           | Prettier, write mode                                                         |
| `pnpm format:check`                                     | Prettier, check mode                                                         |
| `pnpm db:generate`                                      | Generate a Drizzle migration from the schema (no database needed)            |
| `pnpm db:migrate --target=neon`                         | Apply migrations to Neon                                                     |
| `pnpm db:seed --target=neon [--force] [--catalog-only]` | Seed Neon. Truncates all tables, including users, even with `--catalog-only` |
| `pnpm db:studio`                                        | Open Drizzle Studio against Neon                                             |

`db:studio` opens the real Neon database with write access.

## Local development

```bash
pnpm install
pnpm dev --port 3001   # or 3002; never port 3000
```

Use port 3001 or 3002. Never use 3000: the auth base URL and trusted origins
only allow `localhost:3001` and `localhost:3002`.

`.env.local` needs `BETTER_AUTH_SECRET` (generate it with
`openssl rand -base64 32`). See `.env.example` for every variable.

### The local database

- `pnpm dev` runs against an in-memory PGlite database. On first use it is
  migrated from `drizzle/` and seeded from the data files in
  `src/lib/db/seed-data/`. The server log shows `[db] using in-memory PGlite`.
- Data resets on every restart, including accounts you create. Edit the data
  files to change the local catalog.
- `DATABASE_URL` in `.env.local` is ignored locally. To run against Neon
  instead, set `USE_NEON_LOCALLY=1`; this reads and writes the real database.
- `pnpm db:migrate` and `pnpm db:seed` only touch Neon and refuse to run
  without `--target=neon`. Local dev seeds itself.

### Dev accounts

These exist only in the local in-memory database, and the Neon seed refuses
them.

| Email                       | Role     | Password                |
| --------------------------- | -------- | ----------------------- |
| `admin@botanicssupply.test` | admin    | `botanics-dev-password` |
| `ada@botanicssupply.test`   | customer | `botanics-dev-password` |
| `ben@botanicssupply.test`   | customer | `botanics-dev-password` |
| `cara@botanicssupply.test`  | customer | `botanics-dev-password` |
| `dev@botanicssupply.test`   | customer | `botanics-dev-password` |

Without `RESEND_API_KEY`, password reset emails are not sent. The reset link
is printed in the server log (`email_dev_log`).

### Environment variables from Vercel

Never run `vercel env pull .env.local`. It overwrites the file and deletes
local-only values such as `SEED_ADMIN_*`, `ORDER_NOTIFICATION_EMAIL` and
`BETTER_AUTH_SECRET`. Pull into a scratch file instead and copy the keys you
need:

```bash
vercel env pull /tmp/vercel.env
```

## Project structure

```
src/
  app/            App Router: root layout, (storefront) route group, API routes
  components/
    ui/           Primitives (Button, Input, Dialog, Drawer, Accordion, Toast, ...)
    layout/       Header, footer, search, menus, newsletter, contact form
    catalog/      Hero, product cards, grid, filters, gallery, purchase panel
    cart/         Cart drawer, cart page, line items, summary
    marketing/    Home page sections
  hooks/          Cart, wishlist, cart pricing, debounce
  lib/            Pure helpers: money, cart maths, shop query parsing, validation
  services/       Data access (product, category, content); with lib/auth, the only importers of the database layer
  content/        Typed site copy
  lib/db/         Drizzle schema, migrations runner, seed data and seed CLI, PGlite dev database
  lib/auth/       Better Auth server, client and guards
  lib/email/      Resend transport and notifications
  types/          Shared TypeScript types
  test/           Test fixtures
docs/superpowers/specs/  Design specs
```

Pages are Server Components by default. Client Components are limited to the
interactive islands listed in the Phase 1 spec.

## Data

The services in `src/services` read through Drizzle (Phase 2 has no writes).
On Vercel they use Neon; locally they use in-memory PGlite, which resets on
every restart (see [The local database](#the-local-database)). `/account` is a real dashboard for
signed-in users; the orders and saved addresses UI arrive in Phase 7. The cart
is persisted in `localStorage` and priced through `/api/products`. See
`docs/superpowers/specs/2026-09-22-phase2-database-auth-design.md` for the full
spec.

## Deploying

The Vercel project (`haven-botanics`, scope `captain-jobs-projects`) is not
connected to git: `vercel deploy` uploads the working tree. `.vercelignore`
keeps `products.json` and env files out of the upload.

Environment variables on Vercel:

- `DATABASE_URL`, `DATABASE_URL_UNPOOLED`: from the Neon integration
- `BETTER_AUTH_SECRET`: a different value for Production, Preview and
  Development
- `BETTER_AUTH_URL`: Production only (`https://haven-botanics.vercel.app`);
  previews derive it from the deployment URL
- `ORDER_NOTIFICATION_EMAIL`; optionally `RESEND_API_KEY` and `EMAIL_FROM`.
  Without `RESEND_API_KEY`, production logs "email not configured" and sends
  nothing
- `SEED_*` never go on Vercel; they live in `.env.local`

Order:

1. `pnpm db:migrate --target=neon` **before** deploying code that needs the
   new schema. Keep migrations backward compatible (expand, then contract) so
   the live site and instant rollback keep working.
2. `pnpm db:seed --target=neon` only for the first seed. The guard refuses
   when `NODE_ENV` or `VERCEL_ENV` is `production`, or when the database holds
   users other than the seeded admin and the seed domains. `--force` skips the
   guard and truncates every table, real accounts included.
3. `vercel deploy` for a preview (behind Vercel Deployment Protection) and
   smoke-test it, then `vercel deploy --prod`.

Run `pnpm test:e2e:auth` against a local dev server, never production: it
creates accounts.

## Verification

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build && pnpm format:check
```
