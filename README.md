# Botanics

Storefront for Botanics, a small-batch hemp-derived CBD brand (tinctures,
gummies, topicals and teas). Phase 1 ships the design system and the full
storefront UI on top of in-repo mock data; no database, payments or accounts yet.

## Stack

- Next.js 16 (App Router, Turbopack) with React 19 and the React Compiler
- TypeScript in strict mode
- Tailwind CSS v4 with project tokens in `src/app/globals.css`
- Zod for form validation
- Vitest + Testing Library (jsdom) for unit tests
- ESLint (`eslint-config-next`) and Prettier (with the Tailwind plugin)
- pnpm, Node 24+

## Scripts

| Command             | What it does                                      |
| ------------------- | ------------------------------------------------- |
| `pnpm dev`          | Start the dev server (use `-p 3001` if 3000 busy) |
| `pnpm build`        | Production build                                  |
| `pnpm start`        | Serve the production build                        |
| `pnpm typecheck`    | Generate route types and run `tsc --noEmit`       |
| `pnpm lint`         | ESLint                                            |
| `pnpm test`         | Run the unit tests once                           |
| `pnpm test:watch`   | Run the unit tests in watch mode                  |
| `pnpm format`       | Prettier, write mode                              |
| `pnpm format:check` | Prettier, check mode                              |

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
  services/       Data access (product, category, content); the only importers of mocks
  mocks/          Phase 1 seed catalog and content
  types/          Shared TypeScript types
  test/           Test fixtures
docs/superpowers/specs/  Design specs
```

Pages are Server Components by default. Client Components are limited to the
interactive islands listed in the Phase 1 spec.

## Phase 1: mock data

All catalog and content data comes from `src/mocks` through the services in
`src/services`. See
`docs/superpowers/specs/2026-09-21-phase1-storefront-ui-design.md` for the full
spec, component contracts and verification steps.

The `/checkout` and `/account` routes are placeholders until later phases. The
cart is persisted in `localStorage` and priced through `/api/products`.

## Verification

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build && pnpm format:check
```
