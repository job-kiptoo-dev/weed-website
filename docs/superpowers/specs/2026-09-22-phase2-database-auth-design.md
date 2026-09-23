# Phase 2 spec: database and authentication (Botanics Supply Co.)

Repo root: `/home/cpt/dev/main/Haven-Ways/weed-website`. All paths below are under this root unless they start with `/`.

This spec is based on reading these sources:
- the master plan (`/home/cpt/.claude/plans/radiant-leaping-forest.md`)
- Addendum A of the Phase 1.5 spec
- every service, mock, type, service test, page and hook named in the brief
- `vitest.config.mts`, `.gitignore`, `.prettierignore` and `eslint.config.mjs`
- the Next 16 docs in `node_modules/next/dist/docs/`: `cacheComponents.md`, `use-cache.md`, `migrating-to-cache-components.md`, `caching-without-cache-components.md`, `16-proxy.md` and the proxy API reference

**Rules applied**
- Project `CLAUDE.md` is `@AGENTS.md`: read the Next docs before writing Next code and heed deprecations. Specifically: `proxy.ts` replaces middleware, Proxy runs on Node by default, and `use cache` only works with `cacheComponents`.
- Global rules: strict TypeScript with no `any`, tests for business logic, explicit error handling, no secrets in code, and match the existing style (the ContactForm validation pattern, `cn()`, the `Input` `error` prop).
- The project has no microfrontend or event-bus rules, so nothing here splits the app.

---

## 0. Risks, dependencies and open questions (read first)

### Risks

- **R1. `.env.local` points at the production Neon database.**
  - `vercel env pull` wires the same Neon database to every environment.
  - Today that database is empty and the live site doesn't read it, so migrating and seeding it now is safe.
  - After launch, a dev truncate-and-reseed would wipe real data. The seed guard (section 7) mitigates this, and a Neon `dev` branch is recommended (Q1).
- **R2. The build will depend on the database.**
  - These routes prerender at build time and will query the database: `(storefront)/layout.tsx` (`listCategories`), the home page, the static pages, and `generateStaticParams` in `/shop/[category]`.
  - The database must be migrated and seeded before the first Phase 2 deploy. If it is not, the build fails.
  - Migrations never run inside the Vercel build (section 10).
- **R3. PGlite support for full-text search is not verified.**
  - The generated `tsvector` column uses `to_tsvector('english', …)` (the Snowball stemmer) and `websearch_to_tsquery`. Core Postgres 17 has both, and PGlite is Postgres 17 compiled to WASM, so they should work, but I have not verified it.
  - Task T2 starts with a 15-minute go/no-go spike.
  - Fallback: `createTestDb()` switches to a real Postgres when `TEST_DATABASE_URL` is set (local Docker `postgres:17-alpine`, one temporary database per test file). The same tests run against it.
- **R4. Library APIs may have drifted since my training data.** Pin the latest stable versions at install time and check these names against the installed versions:
  - Better Auth:
    - `drizzleAdapter` from `better-auth/adapters/drizzle`
    - `toNextJsHandler` and `nextCookies` from `better-auth/next-js`
    - `getSessionCookie` from `better-auth/cookies`
    - `admin` from `better-auth/plugins` and `adminClient` from `better-auth/client/plugins`
    - `hashPassword` from `better-auth/crypto`
    - `authClient.requestPasswordReset` (older versions call it `forgetPassword`)
    - the endpoint paths used in rate-limit `customRules`
  - Drizzle:
    - whether the installed version is 1.x (uses `defineRelations`) or 0.4x (uses `relations()`)
    - `.generatedAlwaysAs()`, `.nullsNotDistinct()`, `pgSequence`
    - `drizzle-orm/pglite/migrator`
- **R5. Better Auth's rate limiter only covers HTTP calls to `/api/auth/*`.** Calling `auth.api.signInEmail` from a server action would bypass it. Decision: the auth forms use the client SDK (section 6).
- **R6. Pages would freeze at build time without Cache Components.**
  - DB-backed static routes would be frozen until the next redeploy.
  - Mitigation: `export const revalidate = 3600` in `(storefront)/layout.tsx` (section 8).
- **R7. The Account link can briefly show the wrong label.** Session state is read on the client so pages stay static. While the session loads, the link renders "Account" (neutral: the proxy redirects anonymous users) and resolves to "Sign in" or "Account".
- **R8. Neon Auth was provisioned alongside the database.**
  - It adds the `NEON_AUTH_*` / `VITE_NEON_AUTH_URL` variables and may create a `neon_auth` schema.
  - **We use Better Auth, not Neon Auth.** `drizzle.config.ts` sets `schemaFilter: ["public"]` so drizzle-kit never touches `neon_auth`. Leave the variables unused. Optionally disable Neon Auth in the Neon console.
- **R9. Search behaviour changes.**
  - Today search is a substring match. It becomes Postgres full-text search with stemming, plus a name `ILIKE` fallback so partial words like "gum" still match.
  - The tests are rewritten to the new semantics (section 9).
- **R10. Vercel Deployment Protection on previews blocks unauthenticated HTTP calls.** The HTTP e2e test runs against the local dev server, not against previews.
- **R11. Existing localStorage carts and wishlists (`haven-cart-v1`, `haven-wishlist-v1`) keep working.** Seeded rows keep the exact mock IDs (`prod_<slug>`, `var_<slug>-<key>`, `cat_<slug>`).

### Dependencies (external, user actions)

- Vercel env vars `BETTER_AUTH_SECRET` (all environments) and `BETTER_AUTH_URL` (Production) must exist **before the first push of Phase 2 code** (T1).
- `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` must be set locally before `db:seed`.

### Open questions (recommendation given; items marked USER need your answer)

| # | Question | Recommendation |
|---|---|---|
| Q1 USER | Create a Neon `dev` branch for local dev? | **Yes.** Put its URLs in `.env.development.local`, which Next and the scripts load before `.env.local` and which `vercel env pull` doesn't overwrite. Until then, local dev uses the production database and the seed guard is the only protection. |
| Q2 USER | Password-reset email: log the link or provision Resend? | **Defer Resend.** Resend needs a verified sending domain, and the brand uses the placeholder `botanicssupply.example`. In development, log the reset link on the server. In production with no provider, `/forgot-password` shows "Email reset isn't available yet. Contact hello@botanicssupply.example" and the server logs the request without the token. Adding Resend later is a single `sendEmail()` implementation. |
| Q3 USER | Seed demo customers and orders into production? | **Yes, while the site is a demo.** `db:seed --catalog-only` exists for later real use. |
| Q4 USER | Social handles | Placeholders `https://instagram.com/botanicssupplyco` and `https://tiktok.com/@botanicssupplyco` until you supply real handles, or set `social: []` to hide them. |
| Q5 USER | 21+ confirmation at sign-up | A required "I am 21 or older" checkbox, validated but **not persisted** in Phase 2. Proof of age belongs to checkout (Phase 6). |
| Q6 | Grinder copy says black aluminum, photo shows brass | Change the copy to brass (keep the photo). |
| Q7 | Email verification | Off in Phase 2 because no email provider exists. Turn it on with Resend. |
| Q8 | Header session: server or client? | Client (`authClient.useSession()`), so all storefront pages stay static and ISR. |

### MVP vs nice-to-have

- **MVP:** everything in tasks T1 to T7.
- **Nice-to-have (not in Phase 2):**
  - `generateStaticParams` for product pages
  - password show/hide toggle
  - focusing the first invalid field
  - a `categories.feature_flag` column instead of a slug constant
  - Neon preview branching
  - `@vercel/functions` `attachDatabasePool`, if it supports postgres.js
  - an ESLint rule forbidding `@/lib/db` outside allowed folders (recommended but optional)

---

## 1. Decisions

1. **Driver: `postgres` (postgres.js) over TCP with the pooled `DATABASE_URL`**, not `@neondatabase/serverless`.
   - The neon-http driver has no interactive transactions. Phase 5 cart merge, Phase 6 order creation and the Stripe webhook need them, and Better Auth's adapter can use them.
   - Vercel Fluid Compute reuses instances and serves concurrent requests per instance, so a module-level pool is the right model. The WebSocket driver adds a handshake per connection for no gain.
   - Local dev behaves identically. Drizzle has first-class `drizzle-orm/postgres-js`, and drizzle-kit uses the same driver.
   - Client options: `{ max: 5, idle_timeout: 20, connect_timeout: 10, prepare: false }`. `prepare: false` is needed because the Neon pooler is PgBouncer in transaction mode.
   - Keep a `globalThis` singleton in development so HMR doesn't leak connections.
   - Scripts (migrate, seed) use `DATABASE_URL_UNPOOLED` with `max: 1`.
2. **Better Auth** (user requirement), not Neon Auth.
   - Email and password, Drizzle adapter, `usePlural: true`. That gives `users`, `sessions`, `accounts`, `verifications` and avoids the reserved word `user`.
   - `admin` plugin with `defaultRole: "customer"` and `adminRoles: ["admin"]`. This gives ban and impersonation for Phase 8 for free. `users.role` is a pg enum `user_role ('customer','admin')`, so an invalid role fails closed at the database.
3. **IDs:** text primary keys with prefixes.
   - Seeded rows keep the mock IDs (R11).
   - New rows use `newId(prefix)` = `${prefix}_${randomUUID without dashes}` from `src/lib/db/ids.ts`.
   - Better Auth generates its own user and session IDs. The seed uses deterministic `user_admin` and `user_customer_1` to `user_customer_4`.
4. **Reviews:**
   - `user_id` is nullable (`ON DELETE SET NULL`) and there is a new `author_name` column. The 40 historical reviews have no real accounts.
   - **Type change:** `Review.userId: string | null`. Only `review-list.test.tsx` fixtures touch it, and no component reads it.
5. **Feature flag at query level.**
   - The seed always inserts all 6 categories and 35 products.
   - Services exclude `hemp-pre-rolls` when `features.smokableHemp` is false, so flipping the flag needs no database change.
   - This replaces Addendum A1.4's "don't seed", per the brief.
6. **Services become factories.**
   - `createProductService({ getDb, features })` and `createCategoryService(...)`.
   - The exported `productService` and `categoryService` use `getDb` from `src/lib/db/client.ts` and `siteConfig.features`, with **identical method signatures and return types**.
   - Tests inject PGlite and either flag value. No `vi.mock` of the database is needed.
7. **`contentService` stays typed config in code.**
   - `src/mocks/content.ts` moves to `src/content/site-content.ts`.
   - Copy is developer-edited, reviewed and typed, and no admin content UI is planned. A CMS table would add migrations and forms for no user benefit. Revisit if non-developers need to edit copy.
8. **Cache Components stay OFF in Phase 2.**
   - `use cache` and `cacheTag` require `cacheComponents: true` (docs: `use-cache.md`, "Usage").
   - Enabling it changes the whole app:
     - Every awaited `params`/`searchParams` must move inside `<Suspense>`.
     - The layout-level `notFound()` pattern used for real 404 statuses in `shop/[category]/layout.tsx` and `product/[slug]/layout.tsx` must be reworked.
     - `usePathname` and `useSearchParams` users need boundaries.
     - `<Activity>` preserves drawer and dialog state across navigations, which affects CartDrawer and MobileMenu.
   - The master plan already puts `use cache` and tags in Phase 3, so adopt it there (section 8).
   - Phase 2 uses `revalidate = 3600` on the storefront layout, plus React `cache()` in the existing `get-product.ts` and `get-category.ts`.
9. **Auth forms use the Better Auth client SDK** (`authClient.signIn.email` and so on), not server actions.
   - This keeps Better Auth's rate limiting and origin/CSRF checks.
   - Forms validate with the shared Zod schemas first. Server-side, Better Auth enforces password length and email format.
   - Error codes map to user messages in `src/lib/auth/error-messages.ts`.
10. **Error handling is introduced now (minimal):** `AppError`, `NotFoundError`, `ValidationError`, `AuthError`, `ConflictError`, `ActionResult<T>` and `handleActionError`.
    - The `/api/products` and `/api/search` handlers and the guards need them.
    - Database errors are caught at route boundaries, logged with a structured `console.error`, and answered with a generic `{ error: "Something went wrong" }` 500.
11. **Skip `drizzle-zod`.**
    - Form shapes differ from table shapes: confirm password, trimmed strings, dollars in the admin form versus cents in the database.
    - drizzle-zod's Zod v4 support has lagged or moved between packages.
    - Instead: hand-written schemas plus a compile-time alignment test (`expectTypeOf<z.infer<typeof productInputSchema>>().toExtend<Omit<typeof products.$inferInsert, "id" | "createdAt" | "updatedAt" | "searchVector">>()`).
12. **Migrations are generated SQL in `drizzle/`, applied manually with `pnpm db:migrate` (unpooled URL) before deploying code that needs them.** Never during `next build`.
13. **Search:** a weighted generated `tsvector` on products (and a small one on categories), matched with `websearch_to_tsquery('english', q)`, OR exact SKU match (product or variant, case-insensitive), OR `name ILIKE %q%`. SKU matches rank first (section 5).
14. **Dev port:** never 3000. Run `pnpm dev --port 3002`, or 3001 if free. Dev trusted origins include `localhost:3001` and `localhost:3002`. Leave the `dev` script unchanged, and document the flag in the README.

---

## 2. Dependencies

| Package | Kind | Why |
|---|---|---|
| `drizzle-orm` | dep | ORM and query builder (master plan) |
| `postgres` | dep | Driver (decision 1) |
| `better-auth` | dep | Auth (user requirement). Includes the Drizzle adapter, Next helpers, `crypto.hashPassword` and the React client |
| `server-only` | dep | Build-time guard so `lib/db`, `lib/auth/server` and `lib/env` never enter client bundles. Tiny, official, zero dependencies |
| `drizzle-kit` | dev | Generate and run migrations, Studio |
| `@electric-sql/pglite` | dev | In-process Postgres for service, schema and seed tests |
| `tsx` | dev | Runs `seed.ts` with the `@/` tsconfig paths (Node's native type stripping can't resolve aliases or extensionless imports) |

**Not added:**
- `dotenv`: use Node's built-in `process.loadEnvFile`.
- `@neondatabase/serverless`: see decision 1.
- `drizzle-zod`: see decision 11.
- `resend`: see Q2.
- `@better-auth/cli`: run once with `pnpm dlx` to cross-check the auth schema.

---

## 3. File tree

```
CREATE
.env.example                         names only (section 10)
drizzle.config.ts                    dialect postgresql, schema ./src/lib/db/schema/index.ts, out ./drizzle,
                                     url DATABASE_URL_UNPOOLED, schemaFilter ["public"], strict, verbose;
                                     loads .env.development.local then .env.local via process.loadEnvFile when present
drizzle/0000_<name>.sql, drizzle/meta/*   generated, committed
vitest.e2e.config.mts                node env, include tests/e2e/**/*.e2e.ts, no setup scrubbing
tests/e2e/auth.e2e.ts                HTTP sign-up/sign-in/session/account/sign-out against E2E_BASE_URL
src/instrumentation.ts               register(): if NEXT_RUNTIME === "nodejs", call getServerEnv() (fail fast, names only)
src/proxy.ts                         cookie-presence redirect for /account/*, /admin/*
src/content/site-content.ts          moved from src/mocks/content.ts (+ copy fixes)
src/lib/env.ts (+ env.test.ts)       parseServerEnv(source) pure; getServerEnv() memoized; "server-only"
src/lib/errors.ts                    AppError hierarchy
src/lib/action-result.ts (+ test)    ActionResult<T>, ok(), fail(), handleActionError(), toErrorResponse()
src/lib/safe-redirect.ts (+ test)    safeRedirectPath(next, fallback)
src/lib/catalog-visibility.ts (+ test)  SMOKABLE_HEMP_CATEGORY, isCategoryEnabled(slug, features)
src/lib/db/client.ts                 getDb(): Database (postgres.js, singleton, "server-only"; throws if process.env.VITEST)
src/lib/db/types.ts                  Database = PgDatabase<PgQueryResultHKT, typeof schema, ...>
src/lib/db/ids.ts                    newId(prefix)
src/lib/db/load-local-env.ts         loads .env.development.local, .env.local, .env.seed.local if present (scripts only)
src/lib/db/schema/enums.ts           all pgEnums
src/lib/db/schema/tsvector.ts        customType tsvector
src/lib/db/schema/auth.ts            users, sessions, accounts, verifications, authRateLimits
src/lib/db/schema/catalog.ts         categories, products, productImages, productVariants
src/lib/db/schema/reviews.ts
src/lib/db/schema/carts.ts           carts, cartItems
src/lib/db/schema/orders.ts          orders, orderItems, orderNumberSeq
src/lib/db/schema/addresses.ts
src/lib/db/schema/wishlist.ts
src/lib/db/schema/discounts.ts
src/lib/db/schema/marketing.ts       newsletterSubscribers, contactMessages
src/lib/db/schema/rate-limits.ts
src/lib/db/schema/index.ts           re-exports all tables + relations
src/lib/db/relations.ts
src/lib/db/schema.test.ts            PGlite: migrations apply, FTS, constraints, cascades
src/lib/db/seed-data/catalog.ts      moved from src/mocks/catalog.ts (builders, no runtime constants)
src/lib/db/seed-data/people.ts       customers, addresses (no passwords)
src/lib/db/seed-data/orders.ts       10 order specs
src/lib/db/seed-data/marketing.ts    discount codes, newsletter, contact messages
src/lib/db/seed/guard.ts (+ test)    assertSeedAllowed()
src/lib/db/seed/insert.ts            truncateAll(db), insertCatalog(db), insertPeople(db, pw),
                                     insertReviews(db), insertOrders(db), insertMarketing(db)
src/lib/db/seed/seed.test.ts         PGlite: counts, idempotency, order-total invariants
src/lib/db/seed.ts                   CLI entry
src/services/catalog.mappers.ts (+ test)  row -> Category/Product/ProductSummary/Review (Date -> ISO, rating narrowing)
src/services/product.queries.ts      visibility/filter/sort/search SQL fragments (pure builders)
src/services/category.service.test.ts
src/lib/auth/server.ts               betterAuth config ("server-only")
src/lib/auth/client.ts               createAuthClient({ plugins: [adminClient()] })
src/lib/auth/guards.ts (+ test)      getSession, requireUser, requireAdmin, assertUser, assertAdmin
src/lib/auth/roles.ts (+ test)       UserRole, parseRole, isAdmin
src/lib/auth/trusted-origins.ts (+ test)  buildTrustedOrigins(env), resolveBaseUrl(env)
src/lib/auth/error-messages.ts (+ test)   authErrorMessage(code)
src/lib/email/send.ts (+ test)       sendEmail(); dev: log; prod without provider: log without link
src/lib/validation/auth.schema.ts (+ test)
src/lib/validation/address.schema.ts (+ test)
src/lib/validation/product.schema.ts (+ test)  productSpecsSchema, productInputSchema
src/lib/validation/category.schema.ts (+ test)
src/app/api/auth/[...all]/route.ts   export const { GET, POST } = toNextJsHandler(auth)
src/app/api/search/route.test.ts
src/app/(storefront)/(auth)/layout.tsx          centered narrow Container
src/app/(storefront)/(auth)/sign-in/page.tsx
src/app/(storefront)/(auth)/sign-up/page.tsx
src/app/(storefront)/(auth)/forgot-password/page.tsx
src/app/(storefront)/(auth)/reset-password/page.tsx
src/components/auth/auth-card.tsx
src/components/auth/form-alert.tsx
src/components/auth/sign-in-form.tsx (+ test)
src/components/auth/sign-up-form.tsx (+ test)
src/components/auth/forgot-password-form.tsx (+ test)
src/components/auth/reset-password-form.tsx (+ test)
src/components/layout/account-nav-link.tsx (+ test)
src/components/account/sign-out-button.tsx (+ test)
src/hooks/use-cart-lines.test.tsx
src/test/db.ts                       createTestDb({ seed?: boolean }) -> { db, close }
src/test/empty-module.ts             vitest alias target for "server-only"

CHANGE
package.json          deps; scripts (below)
vitest.config.mts     alias "server-only" -> src/test/empty-module.ts; exclude tests/e2e
vitest.setup.ts       delete process.env.DATABASE_URL / DATABASE_URL_UNPOOLED / POSTGRES_URL*
.gitignore            add "!.env.example" after ".env*" (currently .env.example would be ignored)
.prettierignore       add "drizzle"
eslint.config.mjs     no-restricted-imports: "@/lib/db/seed-data/*" only in src/lib/db/**, src/services/**/*.test.ts,
                      src/test/**; "@/lib/db/*" not in src/components/**, src/hooks/**, src/app/**
                      (except src/app/api/auth)
src/types/catalog.ts  Review.userId: string | null; move ProductSort, ListProductsParams, Paginated<T> here
src/services/product.service.ts / category.service.ts   Drizzle, factories; re-export the moved types
src/services/content.service.ts                         read src/content/site-content.ts
src/services/product.service.test.ts / content.service.test.ts   rewritten (section 9)
src/lib/shop-query.ts (+ test)  export MAX_QUERY_LENGTH = 100; q = q.slice(0, 100); import ProductSort from types
src/components/catalog/product-sort.tsx   import type from @/types/catalog
src/app/api/search/route.ts     cap q at MAX_QUERY_LENGTH; try/catch -> toErrorResponse
src/app/api/products/route.ts   try/catch -> toErrorResponse
src/hooks/use-cart-lines.ts     prune ghost lines after a successful fetch
src/lib/site-config.ts          remove Account from nav; description; contact email; social
src/components/layout/header.tsx, mobile-menu.tsx   render <AccountNavLink>
src/components/layout/contact-form.test.tsx          expected email string
src/components/catalog/shop-listing.test.tsx         vi.mock services with fixtures
src/app/(storefront)/layout.tsx                      export const revalidate = 3600
src/app/(storefront)/account/page.tsx                real dashboard
src/test/catalog-fixtures.ts                         comment only (no mocks reference)
docs/image-credits.md                                neutral flower wording (section 7)
README.md                                            "Database and auth" section

DELETE
src/mocks/catalog.ts, src/mocks/content.ts   (git mv to seed-data / content; directory removed)
```

**package.json scripts:**
- `"db:generate": "drizzle-kit generate"`
- `"db:migrate": "drizzle-kit migrate"`
- `"db:studio": "drizzle-kit studio"`
- `"db:seed": "tsx src/lib/db/seed.ts"`
- `"test:e2e:auth": "vitest run --config vitest.e2e.config.mts"`

---

## 4. Schema

All tables use:
- `created_at` and `updated_at` as `timestamptz not null default now()`, with `updated_at` set via `.$onUpdate(() => new Date())`
- explicit snake_case column names
- a third argument that returns an array of indexes and constraints

Money is integer cents with `check (>= 0)`.

**Enums (`enums.ts`):**
- `user_role (customer, admin)`
- `product_status (draft, active, archived)`
- `review_status (published, hidden)`
- `order_status (pending, paid, processing, shipped, delivered, cancelled, refunded)`
- `payment_status (pending, paid, failed, refunded)`
- `discount_type (percent, fixed)`

### Auth (`auth.ts`)

Cross-check against `pnpm dlx @better-auth/cli generate` output written to the scratchpad.

- **users:**
  - `id` text PK, `name` text not null, `email` text not null unique, `email_verified` bool default false, `image` text
  - `role` user_role not null default `'customer'`
  - `banned` bool default false, `ban_reason` text, `ban_expires` timestamptz
  - `phone` text (additionalField, `input: false`)
  - timestamps
- **sessions:**
  - `id` PK, `token` text unique, `expires_at`, `ip_address`, `user_agent`
  - `user_id` → users **CASCADE**
  - `impersonated_by` text
  - timestamps
  - index on `user_id`
- **accounts:**
  - `id` PK, `account_id`, `provider_id`
  - `user_id` → users **CASCADE**
  - `access_token`, `refresh_token`, `id_token`, `access_token_expires_at`, `refresh_token_expires_at`, `scope`, `password`
  - timestamps
  - index on `user_id`; unique (`provider_id`, `account_id`)
- **verifications:** `id`, `identifier`, `value`, `expires_at`, timestamps; index on `identifier`.
- **auth_rate_limits** (Better Auth `rateLimit.modelName`): `id`, `key` unique, `count` int, `last_request` bigint.

### Catalog (`catalog.ts`)

- **categories:**
  - `id` text PK, `name`, `slug` unique, `description` text not null, `image_url` text, `sort_order` int not null
  - `search_vector` tsvector generated: `setweight(to_tsvector('english', coalesce(name,'')), 'A')`
  - timestamps
  - indexes: `sort_order`; GIN(`search_vector`)
- **products:**
  - `id`, `name`, `slug` unique, `description`, `short_description`
  - `price_cents` int not null ≥ 0
  - `compare_at_price_cents` int null, with check (`null or > price_cents`)
  - `sku` unique
  - `category_id` → categories **RESTRICT**
  - `inventory` int not null default 0 ≥ 0
  - `status` product_status default `'draft'`, `featured` bool default false
  - `specs` jsonb null `.$type<ProductSpecs>()`
  - `search_vector` tsvector **generated always, stored**:

    ```
    setweight(to_tsvector('english', coalesce(name,'')),'A') ||
    setweight(to_tsvector('english', coalesce(sku,'')),'A') ||
    setweight(to_tsvector('english', coalesce(short_description,'')),'B') ||
    setweight(to_tsvector('english', coalesce(description,'')),'C')
    ```

  - timestamps
  - indexes: `category_id`; (`status`, `featured`); `created_at`; `price_cents`; GIN(`search_vector`). Slug and SKU already have unique indexes.
- **product_images:** `id`, `product_id` → products **CASCADE**, `url`, `alt` not null, `sort_order`; index on (`product_id`, `sort_order`).
- **product_variants:**
  - `id`, `product_id` → products **CASCADE**, `name`, `sku` unique, `price_cents` int null (override, ≥ 0), `inventory` int ≥ 0, `sort_order`, `is_default` bool
  - index on (`product_id`, `sort_order`)
  - partial unique (`product_id`) where `is_default` (one default per product)

### Other aggregates

- **reviews:**
  - `id`, `product_id` → products **CASCADE**, `user_id` → users **SET NULL** (nullable)
  - `author_name` text not null, `rating` smallint with check 1..5, `title`, `body`, `status` review_status default `'published'`
  - timestamps
  - unique (`product_id`, `user_id`). Multiple NULLs are allowed, which is intended.
  - index on (`product_id`, `status`)
- **carts:**
  - `id`, `user_id` → users **CASCADE** unique nullable, `guest_token` unique nullable
  - check (`user_id is not null or guest_token is not null`)
  - timestamps; index on `updated_at` (for pruning after 30 days)
- **cart_items:**
  - `id`, `cart_id` → carts **CASCADE**, `product_id` → products **CASCADE**, `variant_id` → product_variants **CASCADE** nullable
  - `quantity` int check > 0
  - timestamps
  - unique (`cart_id`, `product_id`, `variant_id`) **NULLS NOT DISTINCT** (PG 15+; Neon and PGlite are 17)
- **orders:**
  - `id`, `order_number` text unique, default `'BSC-' || nextval('order_number_seq')` (sequence starts at 100001)
  - `user_id` → users **SET NULL** (null for guests), `email`
  - `status` order_status default `'pending'`, `payment_status` default `'pending'`
  - `subtotal_cents`, `shipping_cents`, `discount_cents`, `tax_cents` (default 0), `total_cents`
  - check `total_cents = subtotal_cents + shipping_cents + tax_cents - discount_cents`
  - `discount_code` text (snapshot, no FK)
  - `shipping_address` jsonb not null `$type<OrderAddress>`, `billing_address` jsonb null
  - `stripe_payment_intent_id` unique null, `notes` text
  - timestamps
  - indexes: `user_id`, `status`, `created_at`, `email`
- **order_items:**
  - `id`, `order_id` → orders **CASCADE**, `product_id` → products **SET NULL**, `variant_id` → variants **SET NULL**
  - `product_name`, `variant_name` null, `sku`
  - `quantity` > 0, `unit_price_cents`, `total_cents`, with check `total = unit * quantity`
  - `image_url` null
  - indexes: `order_id`, `product_id`
- **addresses:**
  - `id`, `user_id` → users **CASCADE**
  - `label`, `full_name`, `line1`, `line2`, `city`, `state`, `postal_code`, `country` default `'US'`, `phone`
  - `is_default_shipping`, `is_default_billing`
  - timestamps
  - index on `user_id`; partial unique (`user_id`) where `is_default_shipping`, and the same for billing
- **wishlist_items:** `user_id` → users **CASCADE**, `product_id` → products **CASCADE**, `created_at`; PK (`user_id`, `product_id`); index on `product_id`.
- **discount_codes:**
  - `id`, `code` unique with check `code = upper(code)`, `type` discount_type
  - `value` int, with check (`type <> 'percent' or value between 1 and 100`) and `value > 0`
  - `min_subtotal_cents` default 0, `active` bool default true, `expires_at` null, `max_uses` null, `uses` default 0
  - timestamps
- **newsletter_subscribers:** `id`, `email` unique with check `email = lower(email)`, `created_at`, `unsubscribed_at` null.
- **contact_messages:** `id`, `name`, `email`, `subject`, `message`, `created_at`, `handled_at` null; index on `created_at`.
- **rate_limits:** `key` text, `window_start` timestamptz, `count` int default 0; PK (`key`, `window_start`); index on `window_start`. The table only; the helper comes in Phase 10.

**Relations (`relations.ts`):**
- categories 1→n products
- products → images, variants, reviews, category
- users → sessions, accounts, addresses, orders, reviews, wishlist, cart
- orders → items
- carts → items

### Mapping to existing TypeScript types

These live in `src/types/catalog.ts` and components don't change.

| TS field | Column / derivation |
|---|---|
| `Category.*` | categories columns; `imageUrl` ← `image_url`; `createdAt`/`updatedAt` ← `toISOString()` |
| `CategoryWithCount.productCount` | `count(p.id) filter (where p.status='active')` (includes zero-inventory products, as today) |
| `Product.*` | products columns; `specs` ← jsonb (nullable); timestamps as ISO; `search_vector` is **never selected** |
| `ProductImage`, `ProductVariant` | 1:1 columns (`priceCents` null means "use product price", as today) |
| `Review.*` | reviews + `author_name` → `authorName`; `rating` narrowed to `1\|2\|3\|4\|5` by `toRating()` (throws on out-of-range); **`userId: string \| null`** |
| `ProductSummary.category` | join categories → `{ id, name, slug }` |
| `ProductSummary.images/variants` | ordered by `sort_order` |
| `ratingAverage` / `reviewCount` | published-review aggregate, `coalesce(avg,0)::float8`, `count(*)::int` |
| `ProductDetail.reviews` | published only, `created_at desc` |
| `SearchSuggestion` | computed (section 5) |

---

## 5. Service implementations

**Shared pieces (`product.queries.ts`):**

- `visibleProduct(features)`: `products.status = 'active'`, plus `categories.slug <> 'hemp-pre-rolls'` when the flag is off. Every product query inner-joins categories.
- `visibleCategory(features)`: `categories.slug <> …` when the flag is off.
- `reviewStats` CTE:

  ```
  select product_id, avg(rating)::float8 rating_average, count(*)::int review_count
  from reviews where status = 'published' group by product_id
  ```

  It is left-joined.
- `normalizeQuery(q)`: trim, then slice to 100 characters. An empty result means no search.
- `likePattern(q)`: `%` + q with `\`, `%` and `_` escaped + `%`, used with `ILIKE … ESCAPE '\'`.
- `hydrateSummaries(db, rows)`: one relational query `findMany({ where: inArray(products.id, ids), with: { images: { orderBy: sort_order }, variants: { orderBy: sort_order } } })`. Results are merged by ID and `catalog.mappers` builds `ProductSummary[]` **in the order of `ids`**.

**`listProducts(params)`**
- Clamp `pageSize` to `max(1, floor(pageSize))`, capped at 100.
- Build the filters:
  - `category` → `categories.slug = $category`
  - `minPriceCents` / `maxPriceCents` → inclusive bounds on `products.price_cents`
  - `inStock` → `products.inventory > 0`
  - `query`: let `tsq = websearch_to_tsquery('english', $q)`. The match condition is:

    ```
    upper(p.sku) = upper($q)
    OR EXISTS (select 1 from product_variants v where v.product_id = p.id and upper(v.sku) = upper($q))
    OR p.search_vector @@ tsq
    OR c.search_vector @@ tsq
    OR p.name ILIKE $pattern
    ```

- **Query 1:** `select count(*)` with the same `where`. Compute `totalPages = ceil(total/size)`, then clamp the page exactly as today (`clampPage`, with a minimum of 1 even when `total = 0`).
- **Query 2:** select `p.id` (plus the sort keys), apply the ordering below, then `limit size offset (page-1)*size`.
- Ordering, with `p.id` as the final tie-break everywhere for deterministic pages:
  - `featured`:
    - with a query: relevance desc, then featured desc, created_at desc
    - without a query: featured desc, created_at desc
  - `newest`: created_at desc
  - `price-asc` / `price-desc`: price_cents asc / desc
  - `rating`: rating_average desc, review_count desc
  - Relevance expression:

    ```
    (sku exact [product or variant] ? 100 : 0)
    + ts_rank_cd(p.search_vector, tsq)
    + 0.5 * ts_rank_cd(c.search_vector, tsq)
    + (p.name ILIKE pattern ? 0.1 : 0)
    ```

- **Query 3:** `hydrateSummaries`. Return `{ items, page, pageSize, total, totalPages }`. With no results: `items: []`, `total 0`, `totalPages 0`, `page 1`.

**`getProductBySlug(slug)`**
- One relational query: `findFirst({ where: slug = $1 and visible, with: { category, images, variants, reviews: { where: published, orderBy: created_at desc } } })`.
- The visibility join requires the category, so use the relation filter or a follow-up check `isCategoryEnabled(category.slug)`.
- `ratingAverage` and `reviewCount` are computed from the returned published reviews, which gives the same numbers as the aggregate.
- Returns `null` when the product is missing, archived, draft or hidden.

**`getProductsByIds(ids)`**
- Deduplicate, cap at 50, then `inArray` + visible → `hydrateSummaries`.
- Preserve the requested order and drop unknown, archived or hidden IDs (matches the existing test).

**`getFeaturedProducts(limit = 8)`**
- visible and `featured` → `created_at desc, id` → limit → hydrate.

**`getRelatedProducts(productId, limit = 4)`**
- Look up the source's `category_id` regardless of status, as today. If there is no source, or its category is hidden, return `[]`.
- Otherwise: visible, same category, `id <> source`, featured sort, limit, hydrate.

**`searchSuggestions(query, limit = 6)`**
- `normalizeQuery`. Return `[]` if the result is shorter than 2 characters.
- **Categories:** visible and `name ILIKE pattern`, ordered by `sort_order`. Map to `{ type: "category", label, href: /shop/<slug>, imageUrl, priceCents: null }`.
- **Products:** build a prefix query from the input:
  - lowercase it and split on `[^a-z0-9]+`
  - drop empty tokens and keep at most 5
  - form `tok1:* & tok2:*` and pass it as a bound parameter to `to_tsquery('english', $1)`. Tokens are restricted to `[a-z0-9]`, so tsquery syntax can't be injected.
  - match: `p.search_vector @@ prefixQuery OR p.name ILIKE pattern OR p.sku ILIKE pattern`
  - order: sku exact first, then featured desc, created_at desc; limit.
  - fetch only the first image (lateral subquery or hydrate).
- Result: categories first, then products, sliced to `limit`.
- Existing expectations still hold: "gum" returns the Gummies & Edibles category plus products; "HB-ACC-GRINDER" returns only "Four-piece metal grinder", because only the grinder carries the `grinder` token.

**`getPriceRangeCents()`**
- `select min(price_cents), max(price_cents)` over visible products. Return `{ minCents: 0, maxCents: 0 }` when the result is null.

**`listCategories()`**
- Visible categories left-joined to products, with an active `count filter`, grouped by `c.id`, ordered by `sort_order`.

**`getCategoryBySlug(slug)`**
- The same query with `slug = $1`. Returns `null` when the category is missing or hidden.

**`contentService`**
- Unchanged API. It reads `buildContent(siteConfig.features)` from `src/content/site-content.ts`.

**Dedupe**
- The existing `get-product.ts` and `get-category.ts` keep React `cache()`. Services never import React (layering rule).

**Errors**
- Services let driver errors propagate.
- The route handlers `/api/products` and `/api/search` wrap calls in `try/catch → toErrorResponse(error, "api.search")`: 500 with a generic message, plus a structured `console.error({ event, context, error })`.
- Pages rely on the existing `(storefront)/error.tsx` and `shop/error.tsx` boundaries, which never render error details.

---

## 6. Auth design

**`src/lib/auth/server.ts`** (imports `server-only`):

```
betterAuth({
  appName: siteConfig.name,
  baseURL: resolveBaseUrl(env),
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(getDb(), {
    provider: "pg",
    usePlural: true,
    schema: { users, sessions, accounts, verifications, authRateLimits },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: PASSWORD_MIN_LENGTH,  // 10
    maxPasswordLength: 128,
    autoSignIn: true,
    requireEmailVerification: false,
    resetPasswordTokenExpiresIn: 3600,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: ({ user, url }) =>
      sendEmail({ kind: "password-reset", to: user.email, url }),
  },
  user: { additionalFields: { phone: { type: "string", required: false, input: false } } },
  session: {
    expiresIn: 30 days,
    updateAge: 1 day,
    cookieCache: { enabled: true, maxAge: 300 },
  },
  trustedOrigins: buildTrustedOrigins(env),
  rateLimit: {
    storage: "database",
    modelName: "authRateLimit",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 3 },
      "/request-password-reset": { window: 300, max: 3 },
    },
  },
  plugins: [admin({ defaultRole: "customer", adminRoles: ["admin"] }), nextCookies()], // nextCookies last
})
```

**Cookies**
- Better Auth defaults: httpOnly, `SameSite=Lax`, `Secure`, and a `__Secure-` prefix whenever the base URL is https. Keep the default `better-auth` cookie prefix so `getSessionCookie` needs no options.
- Rate limiting is enabled by Better Auth in production only, which is its default. Storage is the database because in-memory storage is per instance on serverless.

**Base URL and trusted origins (`trusted-origins.ts`, pure and tested)**
- `resolveBaseUrl`:
  1. `BETTER_AUTH_URL` if set (required when `VERCEL_ENV=production`, value `https://haven-botanics.vercel.app`)
  2. otherwise, on preview, `https://${VERCEL_BRANCH_URL ?? VERCEL_URL}`
  3. otherwise, in development, `http://localhost:3001`
- `buildTrustedOrigins` returns the base URL, plus:
  - on preview: `https://${VERCEL_URL}` and `https://${VERCEL_BRANCH_URL}`
  - in development: `http://localhost:3001` and `http://localhost:3002`
- No wildcards. Never 3000.

**CSRF**
- Better Auth checks `Origin` against the trusted origins on state-changing requests.
- Cookies are `SameSite=Lax`.
- Next server actions separately check Origin against Host.

**Roles (`roles.ts`)**
- `type UserRole = "customer" | "admin"`.
- `parseRole(value: unknown): UserRole` returns `"admin"` only for exactly `"admin"` and `"customer"` for everything else (fail closed).
- `isAdmin(user) => parseRole(user.role) === "admin"`.
- Admins are created only by the seed. Sign-up can never set a role because the admin plugin fields are not user input.

**Guards (`guards.ts`)**
- `getSession = cache(async () => auth.api.getSession({ headers: await headers() }))`, returning a `Session | null` type inferred from `auth.$Infer.Session`.
- `requireUser(next: string)`: returns the session, or `redirect("/sign-in?next=" + encodeURIComponent(next))`.
- `requireAdmin(next: string)`:
  - fetches the session with `query: { disableCookieCache: true }`, so a role change or ban takes effect immediately
  - no session → redirect to sign-in
  - not an admin → `notFound()`, so the admin area's existence isn't revealed
- `assertUser()` and `assertAdmin()`, for future server actions: throw `AuthError("UNAUTHENTICATED" | "FORBIDDEN")`.
- `/admin` is **not built** (Phase 8). `requireAdmin` exists and is tested.

**Proxy (`src/proxy.ts`)**
- `export function proxy(request)`:
  - `if (!getSessionCookie(request))` → `NextResponse.redirect(new URL("/sign-in?next=" + encodeURIComponent(pathname + search), request.url))`
  - otherwise `NextResponse.next()`
- `export const config = { matcher: ["/account/:path*", "/admin/:path*"] }`.
- Cookie presence only. The real check is `requireUser`/`requireAdmin` in the page (and later in every action).

**Route handler:** `src/app/api/auth/[...all]/route.ts` → `toNextJsHandler(auth)`.

**Client (`client.ts`):** `createAuthClient({ plugins: [adminClient()] })`, same origin with no baseURL. Exports `authClient`, `useSession`, `signIn`, `signUp`, `signOut`.

**Pages** (`src/app/(storefront)/(auth)/…`; they inherit the storefront header and footer; `(auth)/layout.tsx` gives a centered `max-w-md` card):

- **`/sign-in`**
  - The server page reads `searchParams.next` and applies `safeRedirectPath(next, "/account")`.
  - If `getSession()` returns a session, it redirects to that target.
  - Renders `<SignInForm next={…} />`.
- **`/sign-up`:** the same pattern, with `<SignUpForm next>`. Link to sign-in.
- **`/forgot-password`**
  - Renders `<ForgotPasswordForm emailEnabled={…} />`, where `emailEnabled` is `NODE_ENV !== "production" || Boolean(env.RESEND_API_KEY)`.
  - When email is disabled, it shows the contact notice from Q2.
  - It always shows the same "If an account exists for that email, we've sent a reset link" status, to prevent account enumeration.
- **`/reset-password?token=…`**
  - Renders `<ResetPasswordForm token>` and calls `authClient.resetPassword({ newPassword, token })`.
  - A missing or invalid token shows an error with a link to `/forgot-password`.
  - On success, redirects to `/sign-in?reset=1`, which shows a "Password updated" status.
- `metadata` titles: "Sign in", "Create account", "Forgot password", "Reset password", all with `robots: { index: false }`.

**Forms** (client, matching the ContactForm pattern):
- Controlled inputs through `Input` with `error`.
- A `noValidate` form, a summary `<p role="alert">` ("Please fix the highlighted fields."), and per-field messages.
- `autoComplete` values: `email`, `current-password`, `new-password`, `name`.
- While submitting: the submit button is `disabled` with `aria-busy`, and its label changes ("Signing in…", "Creating account…").
- A server error from `authErrorMessage(error.code)` shows in `FormAlert` (`role="alert"`).
- On success: `router.replace(next)` then `router.refresh()`.
- Sign-up fields: name, email, password, confirm password, and the 21+ checkbox (Q5).
- Password hint: "At least 10 characters."
- Error message mapping, with a generic fallback of "Something went wrong. Please try again.":

| Code | Message |
|---|---|
| `INVALID_EMAIL_OR_PASSWORD` | "Email or password is incorrect." |
| `USER_ALREADY_EXISTS` | "An account with this email already exists. Sign in instead." |
| `PASSWORD_TOO_SHORT` | "Use at least 10 characters." |
| HTTP 429 | "Too many attempts. Wait a minute and try again." |
| `INVALID_TOKEN` | "This reset link is invalid or has expired." |

**Header and account**
- Remove `{ label: "Account" }` from `siteConfig.nav`.
- `<AccountNavLink />` (client) is placed as the last item of the desktop nav, and as the last item of the mobile menu's nav list with an `onNavigate={close}` prop.
- It uses `useSession()`:
  - pending → "Account" linking to `/account`
  - no session → "Sign in" linking to `/sign-in`
  - session → "Account" linking to `/account`
- Classes: the same `navLinkClass` / `linkClass`.
- `/account` (`account/page.tsx`, dynamic because it reads headers):
  - `const session = await requireUser("/account")`
  - shows "Hi, {name}", the email, and "Member since {Month YYYY}"
  - `<SignOutButton />` calls `authClient.signOut()`, then `router.replace("/")` and `router.refresh()`. Errors show a toast.
  - A "Coming soon" card lists **Orders, Saved addresses, Profile settings** as placeholders for Phase 7, plus a "Continue shopping" link.

---

## 7. Seed design

**Data moves**
- `git mv src/mocks/catalog.ts src/lib/db/seed-data/catalog.ts`:
  - delete the runtime `export const { categories, … } = buildCatalog(...)`
  - export `buildSeedCatalog(): SeedCatalog`, which returns all categories and products regardless of the flag and keeps the IDs, sort orders, `photoPools`, variants and reviews
  - `SMOKABLE_HEMP_CATEGORY` and `isCategoryEnabled` move to `src/lib/catalog-visibility.ts`
- `git mv src/mocks/content.ts src/content/site-content.ts`:
  - remove the "mock" wording
  - keep `buildContent(features)` and export `getSiteContent()` = `buildContent(siteConfig.features)`
- Nothing at runtime imports `seed-data`. ESLint enforces this.

**Copy fixes applied during the move** (Phase 1.5 review):
- **Honey straws:**
  - gummies category description: "honey sticks" → "honey straws"
  - `honey-sticks` product: "10 sticks per box" → "10 straws per box"; "Ten sticks per box" → "Ten straws per box"; `servingSize` "1 stick" → "1 straw"; description "the amount per stick" → "per straw"
  - FAQ strength answer: "honey sticks" → "honey straws"
  - **The slug stays `honey-sticks`.**
- **Grinder (Q6):**
  - shortDescription: "Four-piece brass grinder with diamond-cut teeth, a fine mesh screen and a magnetic lid. 55 mm across."
  - description: "machined from aluminum" → "machined from brass"; "Anodized matte black finish." → "Brushed brass finish."
- **Flower alt text:** the sources can't be verified from the repo; `docs/image-credits.md` holds our own descriptions, not the photographers' titles. Use neutral wording:
  - `flower-jar`: "Dried flower buds with orange hairs inside an open clear glass jar"
  - `flower-buds`: "Close-up of dried flower buds on a white cloth"
  - `pre-roll-duo`: "…its open end packed with dried flower, on a dark surface"
  - Update the matching credits rows the same way. If the implementer confirms the Unsplash title says "hemp" or "CBD", "hemp" may stay for that file.
- **Emails and handles:**
  - `siteConfig.contact.email = "hello@botanicssupply.example"`
  - the privacy page "Contact" paragraph uses `siteConfig.contact.email` instead of a literal
  - social links per Q4
  - the contact-form test expectation is updated
- **`siteConfig.description`** is computed from the flag:
  - on: "Small-batch hemp-derived CBD tinctures, gummies, topicals and teas, plus smoking accessories and hemp pre-rolls. Third-party lab tested and labeled by strength and spectrum."
  - off: the same without "and hemp pre-rolls".

**CLI (`src/lib/db/seed.ts`), run as `pnpm db:seed [--force] [--catalog-only]`:**

1. `loadLocalEnv()`, then Zod-parse the seed environment:
   - `DATABASE_URL_UNPOOLED` (url)
   - `SEED_ADMIN_EMAIL` (email)
   - `SEED_ADMIN_PASSWORD` (min 12)
   - optional `SEED_CUSTOMER_PASSWORD` (min 10)

   Missing names are printed; values never are.
2. Connect with postgres.js (`max: 1`).
3. **Guard** (`assertSeedAllowed`, pure):
   - Refuse without `--force` if `NODE_ENV === "production"` or `VERCEL_ENV === "production"`.
   - Refuse without `--force` if any user exists whose email doesn't end in `@botanicssupply.example` and isn't `SEED_ADMIN_EMAIL`. That means real data is present.
   - Print the target host (hostname only).
4. In one transaction:
   - `TRUNCATE` every app and auth table `RESTART IDENTITY CASCADE`. Never touch the `drizzle` migrations schema.
   - Insert the catalog: 6 categories, 35 products (34 active plus the archived `gift-box`), 105 images, the variants, all with the mock IDs, timestamps and ordering.
   - `productSpecsSchema` validates every `specs` object first.
5. Unless `--catalog-only`:
   - **People:**
     - admin: `user_admin`, role `admin`, name "Store Admin"
     - customers `user_customer_1` to `user_customer_4`: `ada|ben|cara|dev@botanicssupply.example`, role `customer`, `email_verified` true
     - each gets an `accounts` row with `provider_id: "credential"`, `account_id = user.id`, and `password = await hashPassword(pw)` (Better Auth's scrypt)
     - customer passwords come from `SEED_CUSTOMER_PASSWORD`, or else a random 24-byte value that is never printed
     - one default US address per customer
   - **Reviews:** the 42 seed reviews (40 published, 2 hidden), with `user_id` null and `author_name` from the seed.
   - **Discount codes:**
     - `WELCOME10`: percent 10, no minimum, active
     - `SAVE5`: fixed 500, `min_subtotal_cents` 4000, `max_uses` 100, `expires_at` 2027-12-31
   - **Orders:** 10 deterministic orders, `BSC-100001` to `BSC-100010`, then `setval('order_number_seq', 100010)`:
     - statuses: pending ×1, paid ×2, processing ×1, shipped ×2, delivered ×2, cancelled ×1, refunded ×1
     - payment status: pending→pending, cancelled→failed, refunded→refunded, everything else paid
     - 8 orders across the 4 customers and 2 guest orders (`user_id` null, `guest1|guest2@botanicssupply.example`)
     - 1 to 3 items each from active products, with name, SKU and image snapshots
     - shipping follows `siteConfig.shipping` (free at ≥ 7500, otherwise 695); one order uses `WELCOME10`; tax 0
     - fixed `created_at` dates between 2026-07-01 and 2026-09-15 (no `Date.now()`, so runs are deterministic)
   - **Wishlist:** 5 items. **Newsletter:** 3 subscribers. **Contact messages:** 2. **Carts:** none (Phase 5).
6. Print counts per table and exit 0. On error, log the message and exit 1. The transaction rolls back, so the seed is idempotent.

---

## 8. Caching and revalidation

- **Phase 2 (previous caching model, `cacheComponents` off):**
  - Add `export const revalidate = 3600` to `src/app/(storefront)/layout.tsx`. Every statically prerendered storefront route becomes ISR: `/`, `/about`, `/faq`, `/privacy`, `/terms`, `/contact`, and `/shop/[category]` paths from `generateStaticParams` until `searchParams` makes them dynamic.
  - Routes that read `searchParams`, headers or cookies stay dynamic: `/shop`, `/shop/[category]` with a query, `/product/[slug]` (no `generateStaticParams`), `/account`, the auth pages and `/api/*`.
  - The header's session read is client-side, so nothing in the shared layout forces dynamic rendering.
  - After a reseed, content refreshes within an hour or on the next deploy.
- **Per-request dedupe:** React `cache()` in `get-product.ts`, `get-category.ts` and `getSession`.
- **Phase 3 (planned, not built here):**
  - Enable `cacheComponents: true` and remove `revalidate`, which errors under Cache Components.
  - Mark service read functions `"use cache"` with `cacheLife("hours")` and `cacheTag` from a new `src/lib/cache-tags.ts` (`products`, `product:<slug>`, `categories`).
  - Move `params`/`searchParams` awaits into `<Suspense>` and rework the 404-in-layout pattern.
  - `generateStaticParams` must return at least one param.
  - Audit CartDrawer and MobileMenu under `<Activity>`.
  - Phase 8 admin actions call `updateTag`; webhooks call `revalidateTag(tag, "max")`.
  - `use cache` storage is in-memory per deployment (docs), which is acceptable for this catalog size.

---

## 9. Tests

**PGlite harness (`src/test/db.ts`):**
- `createTestDb({ seed = true })`:
  - if `TEST_DATABASE_URL` is set, use the fallback: create a temporary database and a postgres.js client
  - otherwise `new PGlite()` (in-memory) + `drizzle(client, { schema })` from `drizzle-orm/pglite`
  - then `migrate(db, { migrationsFolder: resolve(process.cwd(), "drizzle") })`, the **same SQL as production**
  - then optionally `insertCatalog`, `insertReviews` and a customer (reusing the seed code)
  - returns `{ db, close }`
- Database test files start with `// @vitest-environment node`, create the database once in `beforeAll` (timeout 30 s) and close it in `afterAll`. They are read-only, so one database per file is enough.
- **Never touching Neon:**
  - `vitest.setup.ts` deletes `DATABASE_URL*` and `POSTGRES_URL*` from `process.env`
  - `getDb()` throws if `process.env.VITEST` is set
  - services in tests are built with `createProductService({ getDb: () => testDb, features })`
  - Vitest doesn't load `.env.local` into `process.env`
- **T2 spike** (first thing): in PGlite, run
  `select to_tsvector('english','Gummies'), websearch_to_tsquery('english','mint -tea'), to_tsquery('english','gum:*')`
  and one generated column. If this fails, switch the harness default to `TEST_DATABASE_URL` (Docker `postgres:17-alpine` on a non-3000 port, for example 5433), document it in the README, and keep everything else unchanged.

**New tests:**
- `schema.test.ts`:
  - migrations apply
  - `search_vector` is populated
  - `websearch_to_tsquery('english','mint')` matches `mint-isolate-tincture`
  - `rating = 6` is rejected
  - a duplicate `(cart_id, product_id, NULL)` is rejected (NULLS NOT DISTINCT)
  - deleting a category that has products is rejected (RESTRICT)
  - deleting a product cascades to its images and variants
  - `compare_at <= price` is rejected
  - a second default variant is rejected
- `seed.test.ts`:
  - counts: 6 categories, 35 products, 105 images, the expected variant sum, 42 reviews, 5 users, 10 orders, 2 codes
  - running twice produces identical counts
  - every order satisfies the totals check and `order_items` sums equal the subtotal
  - the admin's role is `admin` and customers are `customer`
  - `accounts.password` is not plaintext
- `guard.test.ts`: production without `--force` throws; foreign users without `--force` throw; with `--force` it passes; seed-domain users only pass.
- `product.service.test.ts` (rewrite):
  - `describe.each([true, false])` over `smokableHemp`
  - counts derived from `buildSeedCatalog()` filtered by status and `isCategoryEnabled` (34/30 active, 6/5 categories), never hard-coded
  - keep every existing behavioural assertion: defaults, featured first, archived excluded, strengthMg invariant, category filter (topicals 6), price bounds, inStock excluding the two out-of-stock products, sorts, page clamp, detail, hidden reviews, `getProductsByIds` order, featured, related, suggestions, price range, image files exist, brand names, accessories list
  - search tests adjusted to FTS: "MINT" still contains both slugs; "accessories" total 6; `hb-tin-calm` returns exactly one product
  - new cases: an exact variant SKU (`HB-TIN-CALM-500`) ranks first; "gum" partial matches gummies through ILIKE; a 500-character query is truncated without error; `%` and `_` are treated literally
  - flag off: `getProductBySlug("classic-hemp-pre-roll")` is null, suggestions for "pre-roll" are empty, `getPriceRangeCents` excludes hidden products, `getProductsByIds` drops hidden IDs
- `category.service.test.ts`: order, counts (pre-rolls 4 when the flag is on), `getCategoryBySlug("hemp-pre-rolls")` null when off, sort orders stable across flags.
- `content.service.test.ts` (rewrite without the database): the promo slug exists in `buildSeedCatalog()` as active and on sale; row slugs exist and are enabled for the current flag; image files exist; 21+ copy; the flag-off content drops smokable copy; no "honey sticks" anywhere in content or seed text.
- `catalog.mappers.test.ts`: Date to ISO; `toRating` throws on 0 and 6; `priceCents` null passes through.
- Validation schema tests:
  - auth: mismatched passwords, short password, age checkbox required, email trimmed and lowercased
  - address: US ZIP formats, state codes
  - product: slug and SKU regexes, compare-at greater than price, specs shape
  - category
  - a type-alignment `expectTypeOf` test against `$inferInsert`
- `env.test.ts`: missing or short `BETTER_AUTH_SECRET` throws a message that lists names but no values; `BETTER_AUTH_URL` is required when `VERCEL_ENV=production`.
- `action-result.test.ts`: each `AppError` maps to code and message; an unknown error returns the generic message and calls `console.error` (spied); `toErrorResponse` status codes.
- `safe-redirect.test.ts`: accepts `/account`; rejects `//evil.com`, `https://evil.com`, `/\evil`, `javascript:`, and empty input, falling back.
- `trusted-origins.test.ts`: the dev, preview and production matrices; never includes 3000.
- `roles.test.ts` and `guards.test.ts`:
  - mock `@/lib/auth/server`, `next/headers`, and `next/navigation` (`redirect`/`notFound` throw sentinel errors)
  - `requireUser` redirects with the encoded `next`
  - `requireAdmin` redirects anonymous users, 404s customers, returns admin sessions and passes `disableCookieCache`
  - `assertAdmin` throws `AuthError("FORBIDDEN")`
- `error-messages.test.ts`, `send.test.ts` (development logs the URL; production without a key logs no URL).
- Form tests, mocking `@/lib/auth/client` and `next/navigation`:
  - empty submit shows the summary and field errors with `aria-invalid`
  - a valid submit calls the SDK with trimmed values, disables the button and sets `aria-busy`
  - the `INVALID_EMAIL_OR_PASSWORD` message renders in `role="alert"`
  - success calls `router.replace(next)`
  - sign-up checks the mismatch and age checkbox
  - forgot-password shows the same status for any email and shows the notice when `emailEnabled=false`
- `account-nav-link.test.tsx`: the three states. `sign-out-button.test.tsx`: calls `signOut`, then navigates.
- `use-cart-lines.test.tsx`: mock `fetch`. Stored lines `[known, ghostProduct, knownWithGhostVariant]` → after a successful response the store keeps only the known line (`itemCount` updates). On HTTP 500 **nothing is pruned** and the status is `error`.
- `api/search/route.test.ts`: mock the service. A 150-character `q` is passed as 100 characters; a service throw returns 500 with a generic body and no database message.

**Changed tests:**
- `shop-listing.test.tsx`: `vi.mock("@/services/product.service")` and the category service, returning `makeProduct` fixtures (for example 25 products over 2 pages, and a price range). Assertions stay the same.
- `contact-form.test.tsx`: the new email.
- `shop-query.test.ts`: `q` is capped at 100.
- Keep all other component tests unchanged; they use fixtures.

**Ghost-line pruning (`use-cart-lines.ts`):**
- In a `useEffect` keyed on `result`, when `result.key === requestKey && !result.error`, call `removeLine` for each stored line whose product is missing from `result.products`, or whose `variantId` is non-null and missing from `product.variants`.
- Log once with `console.info` giving the count.
- Pruning never happens on error or while loading.

**HTTP e2e (`tests/e2e/auth.e2e.ts`, run manually with `E2E_BASE_URL=http://localhost:3002 pnpm test:e2e:auth`):**
1. Sign up `e2e+<ts>@botanicssupply.example` via `POST /api/auth/sign-up/email` with an `Origin` header → 200 and `Set-Cookie`.
2. `GET /api/auth/get-session` with the cookie returns that email and role `customer`.
3. `GET /account` (redirect `manual`) returns 200 with the cookie, and 307 to `/sign-in?next=%2Faccount` without it.
4. Sign out, then get-session returns null.
5. Sign in with a wrong password returns 401.
6. A cross-origin `Origin: https://evil.example` sign-in is rejected.

This runs against whatever database the dev server uses, which is why Q1 matters. It is not part of `pnpm test`, so CI and local unit runs never touch Neon. There is no CI in the repo today.

---

## 10. Env vars and deployment order

**`.env.example`** (names only, committed after the `.gitignore` fix):
- `DATABASE_URL`, `DATABASE_URL_UNPOOLED`
- `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`
- `RESEND_API_KEY` (optional, unused until Q2)
- `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_CUSTOMER_PASSWORD` (local only)
- `TEST_DATABASE_URL` (optional fallback)
- `E2E_BASE_URL`

**`src/lib/env.ts` schema:**
- `DATABASE_URL`: url, required
- `DATABASE_URL_UNPOOLED`: optional at runtime
- `BETTER_AUTH_SECRET`: min 32
- `BETTER_AUTH_URL`: url, optional except required when `VERCEL_ENV=production`
- `VERCEL_ENV`, `VERCEL_URL`, `VERCEL_BRANCH_URL`, `NODE_ENV`: optional
- `RESEND_API_KEY`: optional

It is validated at boot via `instrumentation.ts`, and at build time on first `getDb()` or auth import.

**Vercel (scope `captain-jobs-projects`, project `haven-botanics`):**
- `BETTER_AUTH_SECRET`: Production, Preview and Development, a different value each, generated with `openssl rand -base64 32`, added via `vercel env add`.
- `BETTER_AUTH_URL`: Production only, `https://haven-botanics.vercel.app`. Previews derive it from `VERCEL_BRANCH_URL`/`VERCEL_URL`.
- `SEED_*`: **never** on Vercel. Put them in `.env.seed.local`, which `vercel env pull` doesn't overwrite.
- Local development: `vercel env pull .env.local` after adding the Development secret, plus `BETTER_AUTH_URL=http://localhost:3001` (or 3002) in `.env.development.local`.

**Order (the live site keeps working at every step):**
1. **T1 precondition:** add the Vercel env vars above.
2. Develop T1 to T6 locally. Generate and commit migrations.
3. `pnpm db:migrate`. This targets Neon main through `DATABASE_URL_UNPOOLED` from `.env.local`, or the dev branch if Q1 is done (in that case, run once more with the production unpooled URL exported inline). The change is additive, and the live Phase 1.5 site never reads the database.
4. `pnpm db:seed`. Against the production database this is its first seed; it's empty, so the guard passes. Later runs need `--force`.
5. Push the branch → Vercel preview build. The build prerenders from the seeded database. Smoke-test the preview in the browser (you are signed in to Vercel, so Deployment Protection passes).
6. Promote or merge to production. Rollback is an instant rollback in Vercel, safe because the schema changes are additive.
7. **Future migrations:** run `db:migrate` before merging code that depends on them, and keep migrations backward-compatible (expand, then contract). Build-time migrations are rejected because preview builds would mutate the shared database before review.
8. **Optional:** Neon preview branching through the integration. It would need a `vercel-build` that runs `db:migrate` only when `VERCEL_ENV=preview`. Defer to Phase 5 or later.

---

## 11. Ordered tasks

Every task ends with `pnpm typecheck && pnpm lint && pnpm test && pnpm build && pnpm format:check` green.

**T1. Dependencies, env, errors**
- Files:
  - `package.json` (dependencies and scripts)
  - `.gitignore` (`!.env.example`), `.env.example`, `.prettierignore`
  - `src/lib/env.ts`, `src/instrumentation.ts`
  - `src/lib/errors.ts`, `src/lib/action-result.ts`, `src/lib/safe-redirect.ts`
  - `vitest.config.mts` (`server-only` alias), `vitest.setup.ts` (env scrub), `src/test/empty-module.ts`
- Approach: install the seven packages; add pure env parsing with a memoized getter; add the error and result helpers with tests.
- Verify: the unit tests for env, action-result and safe-redirect pass; `git check-ignore .env.example` prints nothing; you have added the Vercel env vars.
- Acceptance: no runtime behaviour change; the build still passes.

**T2. Schema, migrations, PGlite harness**
- Files: `drizzle.config.ts`, `src/lib/db/{client,types,ids,load-local-env,relations}.ts`, `src/lib/db/schema/*`, `drizzle/*`, `src/test/db.ts`, `src/lib/db/schema.test.ts`.
- Approach:
  - run the FTS spike first (R3)
  - write the auth tables and reconcile them with `pnpm dlx @better-auth/cli generate` output (planned config, written to the scratchpad)
  - `pnpm db:generate` and review the SQL: the generated column, GIN, NULLS NOT DISTINCT, checks, the sequence
- Verify: `schema.test.ts` passes in PGlite.
- Acceptance: one committed migration; `drizzle-kit check` is clean; no `neon_auth` objects appear in the SQL.

**T3. Seed data move, copy fixes, seed CLI**
- Files: `git mv` the mocks, `src/lib/catalog-visibility.ts`, `src/content/site-content.ts`, `src/lib/db/seed-data/*`, `src/lib/db/seed/*`, `src/lib/db/seed.ts`, `src/lib/site-config.ts`, `docs/image-credits.md`, `contact-form.test.tsx`.
- Approach:
  - point the existing in-memory services at `buildSeedCatalog()` filtered by the flag, and point `contentService` at `site-content`, **temporarily**, so the site keeps working
  - apply the section 7 copy fixes
  - write the seed CLI with the guard
- Verify:
  - `seed.test.ts` and `guard.test.ts` pass
  - `grep -rn "@/mocks" src` returns nothing
  - `grep -rni "honey sticks\|havenbotanics" src` matches only the slug `honey-sticks`
  - `pnpm db:migrate && pnpm db:seed` against Neon prints the expected counts
  - a second `pnpm db:seed` refuses only when foreign users exist
- Acceptance: the Neon database is migrated and seeded **before** any database-reading code exists.

**T4. Services on Drizzle, flag enforcement, review items**
- Files:
  - `product.service.ts`, `category.service.ts`, `product.queries.ts`, `catalog.mappers.ts`
  - the rewritten and new service tests
  - `src/types/catalog.ts`
  - `shop-query.ts`, `product-sort.tsx`
  - `api/search` and `api/products` routes and their tests
  - `use-cart-lines.ts` and its test
  - `shop-listing.test.tsx`
  - `(storefront)/layout.tsx` (revalidate)
  - `eslint.config.mjs`
- Approach: implement section 5 and replace the temporary in-memory reads.
- Verify:
  - all tests pass with the flag at `true`
  - temporarily set `smokableHemp: false`: tests still pass, and `/shop/hemp-pre-rolls` returns 404 on the dev server
  - `pnpm build` passes against Neon
- Acceptance: same page output as before; section 12 HTTP checks 1 to 4 pass; component props unchanged.

**T5. Better Auth backend**
- Files: `src/lib/auth/{server,client,guards,roles,trusted-origins,error-messages}.ts`, `src/lib/email/send.ts`, `src/app/api/auth/[...all]/route.ts`, `src/proxy.ts`, `src/lib/validation/{auth,address,product,category}.schema.ts`, and their tests.
- Approach: section 6. The seeded admin can sign in (its hash comes from `hashPassword`).
- Verify: the unit tests pass; section 12 checks 5 to 9 pass using curl.
- Acceptance: `/account` redirects to sign-in without a cookie; sign-in with the seeded admin returns a session whose role is `admin`.

**T6. Auth UI, header, account**
- Files: `(auth)/layout.tsx` and the four pages, `src/components/auth/*`, `account-nav-link.tsx`, `header.tsx`, `mobile-menu.tsx`, `site-config.ts` (nav), `account/page.tsx`, `sign-out-button.tsx`, and their tests.
- Approach: section 6 pages and forms, matching the ContactForm style.
- Verify:
  - component tests pass
  - manually at 375, 768 and 1280 px on port 3002: sign up, land on `/account` showing name and email, the header shows "Account", sign out, the header shows "Sign in"
  - a wrong password shows the inline alert
  - forgot-password logs the reset URL on the server in development, and that link resets the password
  - keyboard-only pass on all forms
- Acceptance: accessible errors (`role="alert"`, `aria-invalid`, `aria-describedby`), loading states, no layout overflow.

**T7. Deploy, HTTP e2e, docs**
- Files: `tests/e2e/auth.e2e.ts`, `vitest.e2e.config.mts`, `README.md` (database setup, scripts, ports 3001/3002 and never 3000, the seed guard, the migration order, Better Auth not Neon Auth).
- Approach: run the e2e against local dev on port 3002, then follow section 10 steps 5 and 6.
- Verify: `pnpm test:e2e:auth` passes; on the preview and then production, the section 12 production checks pass.
- Acceptance: the live site is served from Postgres, auth works in production, and there are no errors in Vercel logs.

---

## 12. Verification commands

```
pnpm typecheck && pnpm lint && pnpm test && pnpm build && pnpm format:check
pnpm db:generate            # T2 only; commit drizzle/
pnpm db:migrate             # unpooled URL
pnpm db:seed                # prints counts; --force required once real users exist
pnpm db:studio              # spot-check
pnpm dev --port 3002        # never 3000
```

**HTTP checks** (dev server on port 3002):
1. `curl -s "localhost:3002/api/search?q=gum" | jq '.suggestions[0]'` → the Gummies & Edibles category.
2. `curl -s "localhost:3002/api/products?ids=prod_calm-full-spectrum-oil,prod_gift-box" | jq '.products|length'` → `1`.
3. `curl -s "localhost:3002/api/search?q=$(printf 'a%.0s' {1..500})" -o /dev/null -w '%{http_code}'` → `200`.
4. `curl -s -o /dev/null -w '%{http_code}' localhost:3002/shop/hemp-pre-rolls` → `200` with the flag on (`404` when off).
5. `curl -sI localhost:3002/account | grep -i location` → `/sign-in?next=%2Faccount`.
6. Sign up:
   ```
   curl -s -c /tmp/claude-1000/jar -H 'Origin: http://localhost:3002' -H 'Content-Type: application/json' \
     -d '{"name":"E2E","email":"e2e+1@botanicssupply.example","password":"correct-horse-9"}' \
     localhost:3002/api/auth/sign-up/email
   ```
   → 200.
7. `curl -s -b /tmp/claude-1000/jar localhost:3002/api/auth/get-session | jq '.user.role'` → `"customer"`.
8. `curl -s -b /tmp/claude-1000/jar -o /dev/null -w '%{http_code}' localhost:3002/account` → `200`.
9. The same sign-in request with `-H 'Origin: https://evil.example'` → rejected (403).

**Production** (after the promote):
- `curl -sI https://haven-botanics.vercel.app/account` → 307 to `/sign-in`.
- `curl -s https://haven-botanics.vercel.app/api/search?q=mint | jq '.suggestions|length'` → greater than 0.
- Sign in as the seeded admin in the browser → `/account` shows the admin's email.

**Suggested commit message:** `feat: add Postgres catalog, seed and Better Auth accounts (phase 2)`. Per-task commits are also fine, for example `feat: add drizzle schema and migrations` and `feat: swap catalog services to drizzle`.

**Key existing files the plan touches:**
- `/home/cpt/dev/main/Haven-Ways/weed-website/src/services/product.service.ts`
- `/home/cpt/dev/main/Haven-Ways/weed-website/src/services/category.service.ts`
- `/home/cpt/dev/main/Haven-Ways/weed-website/src/services/content.service.ts`
- `/home/cpt/dev/main/Haven-Ways/weed-website/src/mocks/catalog.ts`
- `/home/cpt/dev/main/Haven-Ways/weed-website/src/mocks/content.ts`
- `/home/cpt/dev/main/Haven-Ways/weed-website/src/types/catalog.ts`
- `/home/cpt/dev/main/Haven-Ways/weed-website/src/lib/site-config.ts`
- `/home/cpt/dev/main/Haven-Ways/weed-website/src/lib/shop-query.ts`
- `/home/cpt/dev/main/Haven-Ways/weed-website/src/hooks/use-cart-lines.ts`
- `/home/cpt/dev/main/Haven-Ways/weed-website/src/app/(storefront)/layout.tsx`
- `/home/cpt/dev/main/Haven-Ways/weed-website/src/app/(storefront)/account/page.tsx`
- `/home/cpt/dev/main/Haven-Ways/weed-website/src/components/layout/header.tsx`
- `/home/cpt/dev/main/Haven-Ways/weed-website/src/components/layout/mobile-menu.tsx`
- `/home/cpt/dev/main/Haven-Ways/weed-website/src/components/catalog/shop-listing.test.tsx`
- `/home/cpt/dev/main/Haven-Ways/weed-website/vitest.config.mts`
- `/home/cpt/dev/main/Haven-Ways/weed-website/.gitignore` (`.env*` currently ignores `.env.example`)
- `/home/cpt/dev/main/Haven-Ways/weed-website/next.config.ts` (unchanged in Phase 2; `cacheComponents` deliberately stays off)

---

# Addendum B: user decisions (local data files, Resend, production seed, admin password, notification inbox)

Wins over the sections above where they conflict.

## B0. Risks and dependencies
1. Resend test sender (`onboarding@resend.dev`) only delivers to the Resend account owner; others get 403. `ORDER_NOTIFICATION_EMAIL` must be the Resend account owner's email. Customer reset emails won't arrive until a domain is verified (copy says so, B4).
2. `vercel env pull .env.local` overwrites the file. Never pull into `.env.local` again (it holds `SEED_ADMIN_*`, `ORDER_NOTIFICATION_EMAIL`, `BETTER_AUTH_SECRET`); pull into the scratchpad and copy needed keys.
3. PGlite inside the dev server is unverified (Turbopack, shared between `/api/auth` and pages). T2 spike checks it; fallback B1.5.
4. Local data resets on every restart (intended).
5. Production seeding is destructive after the first run: later runs need `--target=neon --force`.
6. External user steps: `vercel integration add resend` (may need browser claim) and confirming the owner email.

## B1. Local dev uses the data files; production/previews use Neon
- **One code path:** in development `getDb()` returns an in-memory PGlite DB migrated with the same `drizzle/` SQL and seeded from `src/lib/db/seed-data/*` on first use. Rejected: a `DATA_SOURCE=mock` switch (two implementations that drift; auth would still need PGlite).
- **`selectDbTarget(env)`** (`src/lib/db/target.ts`, pure, tested), in order: `VITEST` set → throw (tests inject a DB); `VERCEL === "1"` → neon (`DATABASE_URL` required); `USE_NEON_LOCALLY === "1"` → neon + one-time warn with hostname; else → pglite (ignores `.env.local` `DATABASE_URL`, one-time info log).
- **`getDb(): Promise<Database>`**. Services `await deps.getDb()`; tests pass `async () => testDb`. PGlite promise cached on `globalThis.__bscDevDb` (survives HMR, shared by concurrent first requests, resets on restart). `createDevDb()` in `src/lib/db/dev-db.ts`: `new PGlite()` → `drizzle` → `migrate()` from `drizzle-orm/pglite/migrator` → `seedDatabase(db, { accounts: devAccounts })`. Dynamic import of PGlite.
- **Startup ~1–2 s** once per restart. Dev users share one password hashed once at startup (no precomputed hash); test verifies `verifyPassword`.
- **Dev credentials** (`seed-data/dev-accounts.ts`, public, dev-only, in README): admin `admin@botanicssupply.test`; customers `ada|ben|cara|dev@botanicssupply.test`; password `botanics-dev-password`. Neon seed refuses this module.
- **Scripts:** `db:generate` (no DB); `db:migrate` (`tsx src/lib/db/migrate.ts`, unpooled, `max: 1`) exits 1 without `--target=neon`, prints hostname only; `db:seed` exits 1 without `--target=neon` ("Local dev seeds itself; this command only seeds Neon."), non-seed users need `--force`, uses `SEED_ADMIN_*`; `db:studio` = `DRIZZLE_TARGET=neon drizzle-kit studio` (config sets credentials only then; README warns Studio writes). Seed-domain check accepts `@botanicssupply.example` and `@botanicssupply.test`.
- **Production seed:** admin from `SEED_ADMIN_*`; demo customers `ada|ben|cara|dev@botanicssupply.example` with random never-printed passwords; 10 orders, 42 reviews, 2 discount codes; `--catalog-only` available.
- **Next config:** `serverExternalPackages: ["@electric-sql/pglite"]`; `outputFileTracingExcludes` for PGlite only when `VERCEL`; `@electric-sql/pglite` becomes a dependency.
- **T2 spike:** `pnpm dev --port 3002` with `DATABASE_URL` present → "using in-memory PGlite" log; `/api/search?q=mint` returns results; sign up via `/api/auth/sign-up/email` then `/account` with that cookie → 200; data survives HMR. Fallback: `@electric-sql/pglite-socket` server on 5499 (`pnpm db:local`) with postgres.js; second fallback Docker `postgres:17-alpine` on 5433 with `db:seed --target=local`.
- **Local `pnpm build` uses PGlite** (each worker seeds its own copy); `USE_NEON_LOCALLY=1 pnpm build` optional read-only parity check. Vercel builds use Neon.
- **Env:** `DATABASE_URL` required only for the neon target (`superRefine` on `VERCEL`/`USE_NEON_LOCALLY`); `BETTER_AUTH_SECRET` required everywhere (in `.env.local`); dev `BETTER_AUTH_URL` localhost:3001/3002; add `USE_NEON_LOCALLY`.

## B2. Resend now, test sender
- Provision: `vercel integration add resend` (scope `captain-jobs-projects`, project `haven-botanics`); confirm owner email = notification inbox; `RESEND_API_KEY` lands in Vercel env; copy to `.env.local` only if sending locally.
- Env (names only in `.env.example`): `RESEND_API_KEY` (opt), `EMAIL_FROM` (opt, default `Botanics Supply Co. <onboarding@resend.dev>`), `ORDER_NOTIFICATION_EMAIL` (opt, `z.email()`), `CONTACT_NOTIFICATION_EMAIL` (opt, falls back to order inbox).
- Transport: plain `fetch` to `POST https://api.resend.com/emails` (no SDK).
- `src/lib/email/send.ts` `sendEmail(message): Promise<SendResult>`; `SendResult = { sent: true; id } | { sent: false; reason: "not-configured" | "rejected" | "network" }`. No key: dev logs subject/recipient/action URL; prod logs `warn: email not configured` without URL. Non-2xx → `rejected` (status + Resend error name); thrown fetch → `network`. Never throws; never logs URLs/tokens outside dev.
- Better Auth `sendResetPassword` wraps `after(() => sendEmail(...))` (`next/server`), same response whether or not the account exists; link expires in 1 hour.
- Email verification stays off until a domain is verified.
- `isEmailDeliveryLimited(env)` true when no key or `EMAIL_FROM` domain is `resend.dev`.

## B3. Notifications (Phase 2: stubs only)
- `src/lib/email/notifications.ts`: `notifyNewOrder({ orderNumber, customerEmail, totalCents, itemCount, placedAt })` → not-configured if `ORDER_NOTIFICATION_EMAIL` unset, else `sendEmail` with subject like "New order BSC-100011, $64.00" (`formatMoney`) and plain-text summary. `notifyContactMessage(input)` → `CONTACT_NOTIFICATION_EMAIL ?? ORDER_NOTIFICATION_EMAIL`.
- Phase 6 calls `notifyNewOrder` from the Stripe webhook only on first transition to `paid`; Phase 10 contact action calls `notifyContactMessage`. Phase 2 calls neither.

## B4. Forgot-password copy
- Always after submit: "If an account exists for that email, we've sent a reset link. It expires in 1 hour."
- When `isEmailDeliveryLimited` (Server Component passes the flag): "Heads up: while the store is in demo mode, reset emails can only be delivered to the store owner's inbox. If nothing arrives in a few minutes, email hello@botanicssupply.example and we'll help you get back in."
- Dev with no key: "Dev: the reset link is printed in the server log."

## B5. Q4/Q5
- Admin password generated by the orchestrator; `SEED_ADMIN_EMAIL=admin@botanicssupply.example` and `SEED_ADMIN_PASSWORD` in `.env.local` only (never committed, never on Vercel). Social placeholders `botanicssupplyco`. 21+ checkbox required at sign-up, validated, not stored.

## B6. Task changes
- **T1:** PGlite → dependency; `next.config.ts` external + tracing exclude; env adds `USE_NEON_LOCALLY`, `RESEND_API_KEY`, `EMAIL_FROM`, `ORDER_NOTIFICATION_EMAIL`, `CONTACT_NOTIFICATION_EMAIL`, conditional `DATABASE_URL`; `.env.example`. Preconditions: Vercel env `BETTER_AUTH_SECRET` (all), `BETTER_AUTH_URL` (Production), `ORDER_NOTIFICATION_EMAIL`; Resend integration; local values in `.env.local`. Acceptance: `env.test.ts` covers new vars incl. missing `DATABASE_URL` allowed for pglite.
- **T2:** `target.ts` (+test), `dev-db.ts`, `migrate.ts`; async `getDb`; `drizzle.config.ts` gated on `DRIZZLE_TARGET`; spike (FTS then B1.5). Acceptance: `pnpm dev --port 3002` with prod `DATABASE_URL` present logs PGlite and opens no Neon connection (or works with `DATABASE_URL=postgres://invalid`); `pnpm db:migrate` without flag exits 1.
- **T3:** shared `seedDatabase(db, { accounts })`; `seed-data/dev-accounts.ts`; CLI needs `--target=neon`; guard accepts both domains; `dev-db.test.ts` (counts, dev admin `verifyPassword`, <5 s). Neon migrate/seed moves to T7.
- **T4:** services `await deps.getDb()`. Acceptance: every page works on `pnpm dev` with PGlite; local `pnpm build` needs no Neon.
- **T5:** `createAuth(db)`, memoized `getAuth()` awaiting `getDb()`; `type Auth = ReturnType<typeof createAuth>`; handler `GET/POST = async (req) => (await getAuth()).handler(req)`; guards use `(await getAuth()).api.getSession(...)`; `email/{send,notifications}.ts` + tests (200, 403, network, prod no key logs no URL; notify not-configured/recipient/subject; contact fallback; `isEmailDeliveryLimited`); `sendResetPassword` via `after`.
- **T6:** forgot-password copy per B4; README "Local development" (PGlite + data files, resets, dev credentials, ports 3001/3002 never 3000, `USE_NEON_LOCALLY`, `--target=neon`, `vercel env pull` warning). Acceptance: local sign-in as `admin@botanicssupply.test` shows admin on `/account`; dev-log reset link works.
- **T7 (deploy order):** (1) preconditions done incl. `RESEND_API_KEY` and `ORDER_NOTIFICATION_EMAIL` on Vercel; (2) `pnpm db:migrate --target=neon`; (3) `pnpm db:seed --target=neon`; (4) push → preview smoke: catalog, admin sign-in, owner-inbox reset arrives and works, other-address reset shows demo notice and logs `rejected` without URL; (5) promote, repeat admin sign-in and owner reset on production; (6) `pnpm test:e2e:auth` against local dev (PGlite).

## B7. Verification additions
- `DATABASE_URL=postgres://invalid pnpm dev --port 3002`: pages, search and sign-in work.
- `pnpm db:seed` / `pnpm db:migrate` without the flag exit 1 with the guard message.
- `pnpm build` with network off or `DATABASE_URL` unset succeeds locally.
- Production: Vercel logs show `sendEmail` results after reset tests and no reset URLs.
