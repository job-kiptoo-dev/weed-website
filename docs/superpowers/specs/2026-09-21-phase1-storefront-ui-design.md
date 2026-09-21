# Haven Botanics — Phase 1 implementation spec (foundation + design system + storefront UI on mock data)

Repo: `/home/cpt/dev/main/Haven-Ways/weed-website` (already scaffolded; do not re-scaffold). Approved plan: `/home/cpt/.claude/plans/radiant-leaping-forest.md`.

Verified repo state: Next 16.3.5 (App Router, `src/`, `@/*`, `reactCompiler: true`), React 19.2.8, TypeScript 5.9.3 strict, Tailwind 4.3.3 (`@import "tailwindcss"` + `@theme inline` in `src/app/globals.css`), ESLint 9.39 flat config via `eslint-config-next` 16.3.5 (includes `eslint-plugin-react-hooks` v7 recommended rules, `jsx-a11y`, `import`), pnpm 11.3. Existing files: `src/app/layout.tsx` (Geist fonts, `LayoutProps<"/">`), `src/app/page.tsx` (boilerplate), `src/app/globals.css`, `src/app/favicon.ico`, `public/{file,globe,next,vercel,window}.svg`, `next.config.ts` (only `reactCompiler: true`), `eslint.config.mjs`, `postcss.config.mjs`, `tsconfig.json` (includes `**/*.ts`, `**/*.tsx`, `.next/types/**/*.ts`), `next-env.d.ts` (git-ignored, imports `./.next/types/routes.d.ts`). Project `CLAUDE.md` is just `@AGENTS.md`, which contains only the Next.js "read the bundled docs" rule; there are no project architecture rules (no microfrontend/event-bus rules) to apply. Global CLAUDE.md rules that apply: strict TS, no `any`, colocated tests for business logic, explicit error handling (no silent catches), no secrets, match existing style (double quotes, semicolons — the scaffold style), suggest a semantic commit message at the end.

---

## 0. Risks, dependencies, open questions (read first)

**Risks**

- `tsc --noEmit` fails on a clean checkout unless `.next/types/routes.d.ts` exists (referenced by `next-env.d.ts`). The `typecheck` script must be `next typegen && tsc --noEmit` (docs: `03-api-reference/06-cli/next.md` "next typegen options").
- `eslint-plugin-react-hooks` v7 (pulled in by `eslint-config-next` 16.3.5) ships React-Compiler-aware rules (`react-hooks/set-state-in-effect`, `react-hooks/refs`, `react-hooks/purity`, ...). Reading `localStorage` in a `useEffect` and calling `setState` synchronously will be flagged. The cart store must use `useSyncExternalStore` (see hooks section). Do not add `useMemo`/`useCallback` by hand; the compiler handles memoization.
- Production build fails if a Client Component calls `useSearchParams()` on a statically rendered route without a `<Suspense>` boundary (`04-functions/use-search-params.md`, "Good to know"). This spec avoids `useSearchParams` entirely: pages parse the `searchParams` Promise and pass plain props to client components; client components build URLs with `URLSearchParams` and call `router.push`.
- `error.tsx` in Next 16.3 receives `{ error, retry }` (`retry` stable since 16.3.0; `reset` still exists but `retry` is preferred) — `03-file-conventions/error.md`.
- jsdom does not implement `HTMLDialogElement.showModal()`. Do not unit-test Dialog/Drawer open behaviour; verify manually.
- `picsum.photos` is a third-party placeholder host; if offline, `next/image` requests fail visually only. `images.remotePatterns` must allow it.
- "Full spectrum" is a real COA label that in practice implies trace THC. The brief requires THC-free copy. Resolution: the spec sheet shows `Spectrum: Full | Broad | Isolate` as a lab-label fact only; no product copy, FAQ, or page text mentions THC, intoxication, or any health/medical outcome. FDA-style disclaimer lives in the footer (that is a standard compliance statement, not a claim).

**Dependencies (people/process)**

- None external. Phase 1 has no env vars, no network services, no Phase 0 dependency.

**Open questions resolved by this spec (decisions, not blockers)**

1. jsonb specs column name: plan says "weight/metadata jsonb (lab-tested, mg strength, ingredients)". This spec names the field `specs` (typed `ProductSpecs | null`). Phase 2 should name the Drizzle column `specs`; if it keeps `metadata`, the service maps it, components untouched.
2. `categorySlug` on products: DB has `categoryId`. The row type has `categoryId`; the view types returned by services embed `category: { id, name, slug }`. Components never rely on a bare `categorySlug`.
3. Rating/reviewCount are not columns; services compute `ratingAverage` and `reviewCount` from the reviews mock (mirrors a Phase 2 aggregate query).
4. Cart line pricing (store holds only `{ productId, variantId, quantity }`): a `GET /api/products?ids=` route handler returns product summaries; the client resolves prices through it. Mocks and services never enter the client bundle. This also mirrors Phase 5's server-priced cart.
5. 404 with storefront chrome: root `app/not-found.tsx` renders inside the root layout only (no header/footer). Add `src/app/(storefront)/[...rest]/page.tsx` that calls `notFound()` so unmatched URLs render `src/app/(storefront)/not-found.tsx` with full chrome (`03-file-conventions/not-found.md`: root not-found handles unmatched URLs; segment not-found handles `notFound()` thrown within).
6. `Button` polymorphism: `href?: string` prop renders `next/link` instead of implementing an `asChild` Slot. No Radix.
7. Icons: a small inline SVG module `src/components/ui/icons.tsx` (about 14 icons). No icon library dependency.
8. Component file naming: kebab-case files, PascalCase named exports (`product-card.tsx` exports `ProductCard`). Route files follow Next conventions.
9. `typedRoutes` not enabled in Phase 1 (adds cast friction for dynamic hrefs); Phase 9 may enable it.
10. No `metadataBase`/OG images in Phase 1 (Phase 9 owns SEO); avoids build warnings without a real domain.
11. Hero copy and the 30 product seeds are specified below so the developer does not invent them.

**MVP vs nice-to-have**: everything in sections 3–9 is MVP unless tagged `[nice]`.

---

## 1. Next 16 conventions the developer must follow

All paths relative to `node_modules/next/dist/docs/01-app/` (resolve through the pnpm symlink `node_modules/next`).

- `params` and `searchParams` are **Promises**; `await` them in async Server Component pages (`01-getting-started/03-layouts-and-pages.md`; `03-api-reference/03-file-conventions/page.md`). `searchParams` is a plain object `{ [key]: string | string[] | undefined }`, not `URLSearchParams`. Reading `searchParams` opts the page into dynamic rendering.
- Global helper types `PageProps<'/route'>`, `LayoutProps<'/route'>`, `RouteContext<'/route'>` are generated by `next dev | next build | next typegen`, no import needed (`03-api-reference/05-config/02-typescript.md` "Route-Aware Type Helpers"). Use `PageProps<"/product/[slug]">` etc. For the route-group layout use `{ children: React.ReactNode }` (route-group literal key is not documented; check `.next/types/routes.d.ts` if you want the exact key).
- `next-env.d.ts` is managed by Next and git-ignored; never edit it (`02-typescript.md`). Run `next typegen` before `tsc` in CI/scripts (`06-cli/next.md`).
- Root layout must render `<html>` and `<body>`; nested layouts wrap `children` (`03-layouts-and-pages.md`). Route groups `(name)` do not affect URLs; same URL in two groups is an error (`03-file-conventions/route-groups.md`).
- Component hierarchy per segment: `layout` > `template` > `error` (error boundary) > `loading` (Suspense) > `not-found` > `page` (`01-getting-started/02-project-structure.md`). `loading.tsx` wraps `page` and nested layouts, not the same-level layout (`03-file-conventions/loading.md`). Call `notFound()` before any `await` that may suspend so the 404 status can still be set (`loading.md` "Status Codes").
- `error.tsx` must be `'use client'`; props are `{ error: Error & { digest?: string }; retry: () => void }` (`03-file-conventions/error.md`). Log with `console.error` in an effect.
- Server Components by default; add `'use client'` only for state, events, effects, browser APIs, hooks. Everything imported by a `'use client'` file joins the client bundle; pass Server Components as `children`. Context providers are Client Components rendered as deep as possible (`01-getting-started/05-server-and-client-components.md`).
- `next/image` remote hosts require `images.remotePatterns` with `protocol`, `hostname`, `pathname` (`01-getting-started/12-images.md`). Remote images need `width`/`height` or `fill`; always pass `sizes` when responsive.
- `next/font/google`: call once in a module, use `variable` to expose a CSS var; variable fonts need no `weight`; extra variable axes via `axes: [...]` (`01-getting-started/13-fonts.md`, `03-api-reference/02-components/font.md`). Verified in Next's font data: `Bricolage Grotesque` is variable with axes `opsz` (12–96), `wdth`, `wght`; `Figtree` is variable (`wght` 300–900, normal + italic). Import names: `Bricolage_Grotesque`, `Figtree`.
- Metadata: export `metadata` (static) or `generateMetadata` (async, receives the same Promise props) from Server Component pages/layouts only; use `title: { default, template }` in root (`01-getting-started/14-metadata-and-og-images.md`). Use React `cache()` to dedupe a fetch shared by `generateMetadata` and the page.
- Route handlers: `export async function GET(request: NextRequest)` in `route.ts`; cannot coexist with `page.tsx` at the same segment; return `Response.json(...)`; reading `request.nextUrl`/`request.url` makes it dynamic (`01-getting-started/15-route-handlers.md`).
- Middleware is now `proxy.ts` (`01-getting-started/16-proxy.md`). Not needed in Phase 1; do not create `middleware.ts`.
- React Compiler is on (`reactCompiler: true`, `05-config/01-next-config-js/reactCompiler.md`). Opt out a component with `"use no memo"` only if strictly necessary.
- `next lint` no longer exists; `pnpm lint` runs `eslint` directly (already so in `package.json`). `next build` does not lint.

---

## 2. Dependencies to add (latest stable of each; no version pins invented here)

Prod (`pnpm add clsx tailwind-merge zod`):

- `clsx` + `tailwind-merge` — `cn()` helper (required by brief).
- `zod` (v4) — client-side validation for Newsletter and Contact; shared schemas reused server-side in later phases (plan: Zod v4).

Dev (`pnpm add -D prettier prettier-plugin-tailwindcss vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom`):

- `prettier`, `prettier-plugin-tailwindcss` — `format` script; the plugin needs `tailwindStylesheet` for v4.
- `vitest`, `@vitejs/plugin-react`, `jsdom` — test runner + JSX + DOM env (jsdom chosen over happy-dom: RTL's documented default).
- `@testing-library/react`, `@testing-library/dom` (required peer of RTL v16+) — Accordion smoke test and hook test.

Explicitly not added: Radix/shadcn (native `<dialog>` covers Modal/Drawer a11y), icon libraries (inline SVG), `vite-tsconfig-paths` (alias set manually in `vitest.config.ts`), `@testing-library/jest-dom` `[nice]`, `eslint-config-prettier` (eslint-config-next has no stylistic rules that conflict).

---

## 3. File tree

Modify:

- `package.json` — scripts: `"typecheck": "next typegen && tsc --noEmit"`, `"test": "vitest run"`, `"test:watch": "vitest"`, `"format": "prettier --write ."`, `"format:check": "prettier --check ."`.
- `next.config.ts` — add `images.remotePatterns: [{ protocol: "https", hostname: "picsum.photos", pathname: "/seed/**" }]`.
- `src/app/layout.tsx` — fonts, metadata, `lang="en"`, body classes; no providers here.
- `src/app/globals.css` — replace entirely with tokens (section 4).
- `.gitignore` — nothing needed (`next-env.d.ts`, `.env*`, `coverage` already ignored).

Delete:

- `src/app/page.tsx` (home moves into the route group), `public/file.svg`, `public/globe.svg`, `public/next.svg`, `public/vercel.svg`, `public/window.svg`. Keep `src/app/favicon.ico`.

Create (root):

- `.prettierrc` — `{ "plugins": ["prettier-plugin-tailwindcss"], "tailwindStylesheet": "./src/app/globals.css", "tailwindFunctions": ["cn"] }` (defaults otherwise: double quotes, semicolons, 80 cols — matches scaffold).
- `.prettierignore` — `.next`, `node_modules`, `pnpm-lock.yaml`, `next-env.d.ts`, `AGENTS.md`.
- `vitest.config.ts` — `defineConfig({ plugins: [react()], test: { environment: "jsdom", include: ["src/**/*.test.{ts,tsx}"], setupFiles: ["./vitest.setup.ts"], globals: false }, resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } } })`.
- `vitest.setup.ts` — `afterEach(cleanup)` from RTL (needed because `globals: false`).

Create (`src/`):

```
src/types/catalog.ts
src/types/cart.ts
src/types/content.ts
src/lib/site-config.ts
src/lib/money.ts            + money.test.ts
src/lib/cn.ts               + cn.test.ts
src/lib/cart.ts             + cart.test.ts        (pure reducer + totals)
src/lib/shop-query.ts       + shop-query.test.ts  [nice]
src/lib/validation/newsletter.schema.ts
src/lib/validation/contact.schema.ts
src/mocks/catalog.ts        (categories, products, images, variants, reviews)
src/mocks/content.ts        (faq, trust features, testimonials, collections, static page copy)
src/services/product.service.ts   + product.service.test.ts
src/services/category.service.ts
src/hooks/use-cart.tsx      + use-cart.test.tsx
src/hooks/use-cart-lines.ts
src/hooks/use-debounce.ts
src/hooks/use-wishlist.ts
src/components/ui/{button,input,select,textarea,checkbox,badge,dialog,drawer,toast,skeleton,empty-state,error-state,pagination,accordion,icons,visually-hidden}.tsx
src/components/layout/{container,announcement-bar,header,categories-menu,cart-button,mobile-menu,search-bar,footer,newsletter,providers}.tsx
src/components/catalog/{hero,category-card,product-card,product-grid,product-filters,product-sort,product-gallery,quantity-selector,add-to-cart-button,wishlist-button,related-products,review-list,rating-stars,spec-sheet,price,variant-selector,product-purchase-panel,shop-listing,shop-listing-skeleton}.tsx
src/components/cart/{cart-drawer,cart-item,cart-summary,discount-code-form}.tsx
src/components/marketing/{promo-section,trust-features,collection-strip,faq-accordion}.tsx
src/app/api/search/route.ts
src/app/api/products/route.ts
src/app/(storefront)/layout.tsx
src/app/(storefront)/page.tsx
src/app/(storefront)/not-found.tsx
src/app/(storefront)/error.tsx
src/app/(storefront)/[...rest]/page.tsx
src/app/(storefront)/shop/page.tsx
src/app/(storefront)/shop/loading.tsx
src/app/(storefront)/shop/error.tsx
src/app/(storefront)/shop/[category]/page.tsx
src/app/(storefront)/shop/[category]/loading.tsx
src/app/(storefront)/product/[slug]/page.tsx
src/app/(storefront)/product/[slug]/loading.tsx   [nice]
src/app/(storefront)/cart/page.tsx
src/app/(storefront)/checkout/page.tsx
src/app/(storefront)/account/page.tsx
src/app/(storefront)/about/page.tsx
src/app/(storefront)/faq/page.tsx
src/app/(storefront)/contact/page.tsx
src/app/(storefront)/privacy/page.tsx
src/app/(storefront)/terms/page.tsx
```

Layering rule (from plan): pages/components → services → mocks. Components and pages never import `src/mocks/*`. Services never import React. Client components never import services (they call `/api/*` route handlers).

---

## 4. Design tokens

`src/app/globals.css` (replace whole file; light theme only; remove dark-mode block):

```css
@import "tailwindcss";

@theme {
  --color-*: initial;
  --color-canvas: #f3f5f0;
  --color-surface: #ffffff;
  --color-ink: #152219;
  --color-ink-muted: #4f5e55;
  --color-moss: #2f5e3f;
  --color-moss-hover: #254b32;
  --color-moss-soft: #e4ece4;
  --color-iris: #5b4fb0;
  --color-iris-soft: #eceaf7;
  --color-line: #dde3da;
  --color-danger: #b3261e;
  --color-success: #2f5e3f;
  --color-white: #ffffff;
  --color-black: #000000;
  --color-transparent: transparent;

  --text-*: initial;
  --text-sm: 0.875rem;
  --text-sm--line-height: 1.25rem; /* 14/20 */
  --text-base: 1rem;
  --text-base--line-height: 1.5rem; /* 16/24 */
  --text-lg: 1.125rem;
  --text-lg--line-height: 1.75rem; /* 18/28 */
  --text-xl: 1.25rem;
  --text-xl--line-height: 1.75rem; /* 20/28 */
  --text-2xl: 1.5rem;
  --text-2xl--line-height: 2rem; /* 24/32 */
  --text-3xl: 2rem;
  --text-3xl--line-height: 2.5rem; /* 32/40 */
  --text-4xl: 2.75rem;
  --text-4xl--line-height: 3rem; /* 44/48 */
  --text-5xl: 4rem;
  --text-5xl--line-height: 4.25rem; /* 64/68 */

  --radius-*: initial;
  --radius-btn: 10px;
  --radius-input: 10px;
  --radius-card: 16px;
  --radius-full: 9999px;

  --shadow-*: initial;
  --shadow-elevation: 0 16px 40px -12px rgb(21 34 25 / 0.22);

  --tracking-display: -0.025em;
  --ease-soft: cubic-bezier(0.22, 1, 0.36, 1);

  --animate-reveal: reveal 360ms var(--ease-soft) both;
  @keyframes reveal {
    from {
      opacity: 0;
      transform: translateY(12px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
}

@theme inline {
  --font-sans: var(--font-figtree), ui-sans-serif, system-ui, sans-serif;
  --font-display:
    var(--font-bricolage), var(--font-figtree), ui-sans-serif, sans-serif;
}

@layer base {
  body {
    @apply bg-canvas font-sans text-ink;
  }
  :focus-visible {
    outline: 2px solid var(--color-iris);
    outline-offset: 2px;
  }
  .font-display {
    font-optical-sizing: auto;
  }
  h1,
  h2,
  h3 {
    @apply font-display;
    text-wrap: balance;
  }
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
}
```

Usage rules: `bg-canvas`, `bg-surface`, `text-ink`, `text-ink-muted`, `bg-moss hover:bg-moss-hover`, `text-iris`, `border-line`, `rounded-btn`, `rounded-input`, `rounded-card`, `rounded-full`, `shadow-elevation` (drawer/dialog only), `text-4xl md:text-5xl tracking-display font-display` for the hero H1. Cards: `border border-line bg-surface rounded-card`, no shadows, no gradients. Hero reveal: children get `motion-safe:animate-reveal` with inline `style={{ animationDelay: `${i * 60}ms` }}` for i = 0..4 (last ends at 240 + 360 = 600ms). Product card: `group` on the card; image wrapper `overflow-hidden`; image `transition-transform duration-300 ease-soft group-hover:scale-[1.02]`; "Add to cart" row `translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:opacity-100 group-focus-within:translate-y-0 [@media(hover:none)]:opacity-100 [@media(hover:none)]:translate-y-0`.

Copy rules (enforced in review): sentence case everywhere; no all-caps labels; no eyebrow labels; no single-word colored words in headlines; no "→" in buttons; no " · " separators (use spaced text or `<ul>` with borders); CTA text names the action ("Add to cart", "View all tinctures", "Continue shopping", "Go to checkout"). Empty catalog copy exactly: "Nothing here yet. Try another category or search."

Root layout (`src/app/layout.tsx`):

```ts
const display = Bricolage_Grotesque({
  subsets: ["latin"],
  axes: ["opsz"],
  variable: "--font-bricolage",
  display: "swap",
});
const body = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  display: "swap",
});
export const metadata: Metadata = {
  title: { default: "Haven Botanics", template: "%s | Haven Botanics" },
  description: siteConfig.description,
};
// <html lang="en" className={`${display.variable} ${body.variable} h-full antialiased`}><body className="flex min-h-full flex-col">{children}</body>
```

Keep `LayoutProps<"/">` typing as the scaffold does.

---

## 5. Types (`src/types/catalog.ts`) — camelCase mirrors of the plan's DB schema

```ts
export type ProductStatus = "draft" | "active" | "archived";
export type Spectrum = "full" | "broad" | "isolate";
export type ReviewStatus = "published" | "hidden";

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}
export interface ProductImage {
  id: string;
  productId: string;
  url: string;
  alt: string;
  sortOrder: number;
}
export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  sku: string;
  priceCents: number | null;
  inventory: number;
  sortOrder: number;
  isDefault: boolean;
}
export interface ProductSpecs {
  strengthMg: number;
  spectrum: Spectrum;
  labTested: boolean;
  servingSize: string;
  ingredients: string[];
}
export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  priceCents: number;
  compareAtPriceCents: number | null;
  sku: string;
  categoryId: string;
  inventory: number;
  status: ProductStatus;
  featured: boolean;
  specs: ProductSpecs | null;
  createdAt: string;
  updatedAt: string;
}
export interface Review {
  id: string;
  productId: string;
  userId: string;
  authorName: string;
  rating: 1 | 2 | 3 | 4 | 5;
  title: string;
  body: string;
  status: ReviewStatus;
  createdAt: string;
  updatedAt: string;
}

/* View types returned by services (what components consume) */
export type CategoryRef = Pick<Category, "id" | "name" | "slug">;
export interface CategoryWithCount extends Category {
  productCount: number;
}
export interface ProductSummary extends Product {
  category: CategoryRef;
  images: ProductImage[];
  variants: ProductVariant[];
  ratingAverage: number;
  reviewCount: number;
}
export interface ProductDetail extends ProductSummary {
  reviews: Review[];
}
export interface SearchSuggestion {
  type: "product" | "category";
  label: string;
  href: string;
  imageUrl: string | null;
  priceCents: number | null;
}
```

Dates are ISO strings (serializable to Client Components). Ids are stable strings like `"prod_calm-full-spectrum-oil"`, `"var_calm-full-spectrum-oil-500"`, `"cat_tinctures"`.

`src/types/cart.ts`:

```ts
export interface CartLine {
  productId: string;
  variantId: string | null;
  quantity: number;
}
export interface CartState {
  lines: CartLine[];
}
export type CartAction =
  | {
      type: "add";
      productId: string;
      variantId: string | null;
      quantity: number;
    }
  | {
      type: "setQuantity";
      productId: string;
      variantId: string | null;
      quantity: number;
    }
  | { type: "remove"; productId: string; variantId: string | null }
  | { type: "clear" };
export interface PricedCartLine extends CartLine {
  product: ProductSummary;
  variant: ProductVariant | null;
  name: string;
  variantName: string | null;
  imageUrl: string | null;
  unitPriceCents: number;
  lineTotalCents: number;
}
export interface CartTotals {
  subtotalCents: number;
  shippingCents: number;
  discountCents: number;
  totalCents: number;
  itemCount: number;
  freeShippingRemainingCents: number;
}
```

`src/types/content.ts`: `FaqItem { id; question; answer }`, `TrustFeature { id; title; description; icon: IconName }`, `Testimonial { id; quote; author; location }`, `Collection { id; title; description; href; imageUrl }`, `StaticPage { slug; title; intro; sections: { heading; paragraphs: string[] }[] }`.

`src/lib/site-config.ts` (single `siteConfig` const, `as const` where useful): `name: "Haven Botanics"`, `tagline: "Hemp-derived CBD, made plainly."`, `description`, `announcement: "Free shipping on orders over $75"`, `nav: [{label:"Shop",href:"/shop"},{label:"About",href:"/about"},{label:"FAQ",href:"/faq"},{label:"Contact",href:"/contact"}]` (Categories dropdown is rendered from `categoryService`), `footerGroups: [{title:"Shop",links:[...category links + "All products"]},{title:"Company",links:[About, Contact, FAQ]},{title:"Legal",links:[Privacy, Terms]}]`, `social: [{label:"Instagram",href:"https://instagram.com/havenbotanics"},{label:"TikTok",...}]` (placeholders), `shipping: { freeThresholdCents: 7500, flatRateCents: 695, estimateText: "Ships in 1 to 2 business days" }`, `cart: { maxQuantityPerLine: 10 }`, `contact: { email: "hello@havenbotanics.example", phone: "(555) 010-4242", address: ["120 Meadow Lane","Portland, OR 97201"] }`, `legal: { disclaimer: "These statements have not been evaluated by the Food and Drug Administration. These products are not intended to diagnose, treat, cure, or prevent any disease.", ageNotice: "For adults 18 and over." }`.

---

## 6. Service signatures (`src/services/*.ts`, plain async TS, no React; read from `src/mocks/*` in Phase 1)

```ts
// product.service.ts
export type ProductSort = "featured" | "newest" | "price-asc" | "price-desc" | "rating";
export interface ListProductsParams { category?: string; query?: string; sort?: ProductSort; minPriceCents?: number; maxPriceCents?: number; inStock?: boolean; page?: number; pageSize?: number; }
export interface Paginated<T> { items: T[]; page: number; pageSize: number; total: number; totalPages: number; }
export const productService = {
  listProducts(params?: ListProductsParams): Promise<Paginated<ProductSummary>>;   // defaults: sort "featured", page 1, pageSize 12; only status "active"; page clamped to [1, max(totalPages,1)]
  getProductBySlug(slug: string): Promise<ProductDetail | null>;                 // null for unknown or non-active
  getProductsByIds(ids: string[]): Promise<ProductSummary[]>;                    // active only, order preserved
  getFeaturedProducts(limit?: number): Promise<ProductSummary[]>;                // default 8
  getRelatedProducts(productId: string, limit?: number): Promise<ProductSummary[]>; // same category, excludes self, default 4
  searchSuggestions(query: string, limit?: number): Promise<SearchSuggestion[]>; // [] if query.trim().length < 2; default 6; product name/sku match + category name match
  getPriceRangeCents(): Promise<{ minCents: number; maxCents: number }>;
};
// category.service.ts
export const categoryService = {
  listCategories(): Promise<CategoryWithCount[]>;          // sorted by sortOrder; count = active products
  getCategoryBySlug(slug: string): Promise<CategoryWithCount | null>;
};
```

Rules: `query` matches case-insensitively against `name`, `shortDescription`, `sku`, `category.name` (Phase 2 swaps for tsvector). Price filter uses `priceCents` inclusive. `inStock` = `inventory > 0`. Sort `featured` = featured first, then `createdAt` desc; `newest` = `createdAt` desc; `rating` = `ratingAverage` desc then `reviewCount` desc. Wrap `getProductBySlug`/`getCategoryBySlug` with React `cache()` at the page level (in the page file, not the service) so `generateMetadata` and the page share one call. Each service function should `await` a `Promise.resolve()` (keeps call sites honest about async).

`src/lib/money.ts`: `formatMoney(cents: number, currency = "USD"): string` via `Intl.NumberFormat("en-US", { style: "currency", currency })` on `cents / 100`.
`src/lib/cn.ts`: `cn(...inputs: ClassValue[]) => twMerge(clsx(inputs))`.
`src/lib/cart.ts` (pure): `cartReducer(state: CartState, action: CartAction): CartState` (add merges same product+variant, quantity clamped 1..`maxQuantityPerLine`; setQuantity ≤ 0 removes), `lineKey(line)`, `computeTotals(lines: PricedCartLine[], rules: { freeThresholdCents; flatRateCents }): CartTotals` (shipping 0 when no lines or subtotal ≥ threshold; discount always 0 in Phase 1).
`src/lib/shop-query.ts`: `parseShopQuery(sp: Record<string, string | string[] | undefined>): ShopQuery` (`q`, `sort`, `min`/`max` whole dollars → cents, `stock` "1" → true, `page` int ≥ 1; invalid values fall back silently) and `buildShopHref(base: string, q: Partial<ShopQuery>): string`.
Validation: `newsletterSchema = z.object({ email: z.email() })`; `contactSchema = z.object({ name: z.string().trim().min(2).max(80), email: z.email(), subject: z.string().trim().min(3).max(120), message: z.string().trim().min(20).max(2000) })`.

Mock data (`src/mocks/catalog.ts`) — all products `status: "active"` except `gift-box` (`archived`, so tests can prove status filtering). Images: 3 per product, `https://picsum.photos/seed/${slug}-${n}/1200/1200`, alt = `${name}, view ${n}`. Categories (sortOrder 1–5, image `https://picsum.photos/seed/cat-${slug}/1200/900`): `tinctures` "Tinctures", `gummies-edibles` "Gummies & Edibles", `topicals` "Topicals", `teas-wellness` "Teas & Wellness", `accessories` "Accessories". `createdAt` values staggered over 2025 so "newest" is deterministic. Product `priceCents` = default variant price; variant `priceCents` overrides where listed; variant `sku` = `${SKU}-${strength}`.

| slug                       | name                       | cat             | variants (name → price)                  | spectrum / strength / serving  | flags           |
| -------------------------- | -------------------------- | --------------- | ---------------------------------------- | ------------------------------ | --------------- |
| calm-full-spectrum-oil     | Calm full-spectrum oil     | tinctures       | 500 mg $39, 1000 mg $64, 2000 mg $109    | full / 1000 / 1 mL             | featured        |
| daily-broad-spectrum-drops | Daily broad-spectrum drops | tinctures       | 500 $36, 1000 $59, 2000 $99              | broad / 1000 / 1 mL            | featured        |
| evening-cbd-cbn-drops      | Evening CBD and CBN drops  | tinctures       | 750 $54, 1500 $89                        | broad / 750 / 1 mL             |                 |
| mint-isolate-tincture      | Mint isolate tincture      | tinctures       | 1000 $49 (compareAt $59), 2000 $84       | isolate / 1000 / 1 mL          | sale            |
| citrus-full-spectrum-oil   | Citrus full-spectrum oil   | tinctures       | 1000 $64, 2000 $109                      | full / 1000 / 1 mL             |                 |
| unflavored-isolate-oil     | Unflavored isolate oil     | tinctures       | 500 $29, 1000 $46                        | isolate / 500 / 1 mL           | inventory 0     |
| mixed-berry-gummies        | Mixed berry gummies        | gummies-edibles | 10 mg, 30 count $32; 25 mg, 30 count $54 | broad / 10 / 1 gummy           | featured        |
| citrus-isolate-gummies     | Citrus isolate gummies     | gummies-edibles | 25 mg, 30 count $49; 25 mg, 60 count $89 | isolate / 25 / 1 gummy         |                 |
| evening-gummies            | Evening gummies with CBN   | gummies-edibles | 15 mg, 30 count $44                      | broad / 15 / 1 gummy           |                 |
| sour-apple-gummies         | Sour apple gummies         | gummies-edibles | 25 mg, 30 count $49 (compareAt $56)      | broad / 25 / 1 gummy           | sale            |
| honey-sticks               | Honey sticks               | gummies-edibles | 10 mg, 10 count $18                      | isolate / 10 / 1 stick         |                 |
| dark-chocolate-squares     | Dark chocolate squares     | gummies-edibles | 15 mg, 12 count $24; 15 mg, 24 count $42 | broad / 15 / 1 square          | featured        |
| cooling-muscle-balm        | Cooling muscle balm        | topicals        | 500 mg $34, 1000 mg $56                  | broad / 500 / pea-sized amount | featured        |
| warming-body-cream         | Warming body cream         | topicals        | 1000 mg $48                              | full / 1000 / pea-sized amount |                 |
| unscented-body-lotion      | Unscented body lotion      | topicals        | 500 $32, 1000 $52                        | isolate / 500 / pump           |                 |
| lip-balm-duo               | Lip balm duo               | topicals        | 50 mg $12                                | isolate / 50 / as needed       |                 |
| bath-soak                  | Bath soak                  | topicals        | 200 mg $22                               | isolate / 200 / 1 scoop        |                 |
| roll-on-stick              | Roll-on stick              | topicals        | 750 mg $38 (compareAt $44)               | broad / 750 / 2 swipes         | featured, sale  |
| chamomile-evening-tea      | Chamomile evening tea      | teas-wellness   | 10 sachets $24                           | isolate / 20 / 1 sachet        | featured        |
| peppermint-day-tea         | Peppermint day tea         | teas-wellness   | 10 sachets $24                           | isolate / 20 / 1 sachet        |                 |
| ginger-lemon-tea           | Ginger lemon tea           | teas-wellness   | 10 sachets $24                           | broad / 20 / 1 sachet          |                 |
| matcha-blend               | Matcha blend               | teas-wellness   | 100 g $36                                | isolate / 500 / 1 tsp          |                 |
| broad-spectrum-softgels    | Broad-spectrum softgels    | teas-wellness   | 30 count $52, 60 count $94               | broad / 25 / 1 softgel         | featured        |
| hot-cocoa-mix              | Hot cocoa mix              | teas-wellness   | 10 servings $26                          | isolate / 15 / 1 packet        | inventory 0     |
| glass-dropper-set          | Glass dropper set          | accessories     | single $9                                | specs null                     |                 |
| travel-tin                 | Travel tin                 | accessories     | single $14                               | null                           |                 |
| daily-notes-journal        | Daily notes journal        | accessories     | single $16                               | null                           |                 |
| ceramic-infuser-mug        | Ceramic infuser mug        | accessories     | single $28                               | null                           |                 |
| canvas-tote                | Canvas tote                | accessories     | single $18                               | null                           |                 |
| gift-box                   | Gift box                   | accessories     | single $12                               | null                           | status archived |

Single-variant products still have one variant (`isDefault: true`, `priceCents: null`, name "One size" or the count). `labTested: true` for all products with specs; `ingredients` 2–4 plain items ("MCT oil", "hemp extract", "peppermint oil"). `shortDescription` ≤ 110 chars, `description` 2 short paragraphs (join with `\n\n`), tone: plain, factual, sensory (taste, texture, dropper, packaging); never outcomes/feelings/health. Reviews: ~40 across ~15 products, ratings 3–5, `status: "published"` except 2 `hidden` (excluded from aggregates), author first names + initial, bodies about taste/texture/packaging/shipping only.

`src/mocks/content.ts`: 8 FAQ items (shipping time, returns 30 days, lab reports/COA on request, how to read strength, serving size guidance phrased as "start small and see how it fits your routine", spectrum definitions without THC mention, storage, age policy), 4 trust features (Third-party lab tested / Free shipping over $75 / 30-day returns / US-grown hemp), 3 testimonials, 3 collections (Evening → `/shop?q=evening`, Everyday → `/shop/tinctures`, On the go → `/shop/topicals`), static pages `about`, `privacy`, `terms`, `contact` intro. `home.hero`: title "Hemp-derived CBD, made plainly.", body "Small-batch tinctures, gummies, topicals and teas. Every product is third-party lab tested and labeled by strength and spectrum, so you know exactly what you're buying.", primary CTA "Shop tinctures" → `/shop/tinctures`, secondary "Browse all products" → `/shop`; hero product plate uses `calm-full-spectrum-oil`. Promo section: "Lab reports for every batch" with body about requesting COAs, CTA "Read the FAQ".

---

## 7. Component contracts

Legend: **S** = Server Component (no directive), **C** = `'use client'`. Every component accepts `className?: string` merged with `cn()`. All `next/image` usages pass `sizes`.

UI (`src/components/ui/`)

- `Button` C-free (S; it renders `<button>`/`<Link>`, no hooks): `{ variant?: "primary"|"secondary"|"ghost"|"danger"; size?: "sm"|"md"|"lg"; loading?: boolean; href?: string; disabled?; type?; children; ...ButtonHTMLAttributes }`. Loading: `aria-busy`, `disabled`, inline spinner + keeps label. `href` renders `Link` with same classes (no `disabled` on links). Base: `rounded-btn font-medium inline-flex items-center gap-2`, heights 36/44/52. Primary `bg-moss text-white hover:bg-moss-hover`; secondary `border border-line bg-surface text-ink hover:bg-moss-soft`; ghost `text-ink hover:bg-moss-soft`; danger `bg-danger text-white`.
- `Input`, `Select`, `Textarea` (S, `forwardRef` not needed in React 19 — `ref` is a prop): `{ label: string; id: string; hint?: string; error?: string; ...native }`. Label always rendered (`<label htmlFor>`), `aria-describedby` links hint/error ids, `aria-invalid` when error, error text `role="alert"`? No — plain `<p id>` in `text-danger`; the form-level summary handles announcements. `rounded-input border-line bg-surface h-11 px-3`.
- `Checkbox` (S): `{ label; id; description?; ...native }`, native input styled with `accent-moss`.
- `Badge` (S): `{ tone?: "neutral"|"moss"|"iris"|"danger"; children }` pill `rounded-full text-sm px-2.5 py-0.5`. Iris only for "Sale"/"Low stock"/"New".
- `Dialog` C: `{ open: boolean; onClose: () => void; title: string; description?: string; children; size?: "sm"|"md" }`. Native `<dialog>`; effect syncs `open` → `showModal()`/`close()`; `onClose` handler on the element (fires on Esc); backdrop click closes (compare `event.target === dialogRef.current`); `aria-labelledby` = title id; body `overflow-hidden` while open (add/remove in the same effect with cleanup); `shadow-elevation rounded-card bg-surface`; open transition `motion-safe:animate-reveal`. Native dialog supplies focus trap, `aria-modal`, and focus return.
- `Drawer` C: same API plus `side?: "right"|"left"`; same `<dialog>` mechanics, panel `fixed inset-y-0 w-[min(100vw,26rem)]` sliding in via `transition-transform`; close button first focusable; `aria-labelledby`.
- `Toast` C (`toast.tsx` exports `ToastProvider`, `useToast`, `Toaster`): `useToast()` → `{ toast(input: { title: string; description?: string; tone?: "neutral"|"success"|"danger"; action?: { label; onClick } }) : void }`. `Toaster` renders `<div role="status" aria-live="polite" aria-atomic="false">` stacking max 3, auto-dismiss 4000ms (`setTimeout` in effect with cleanup), each with a "Dismiss" button. Throws a descriptive `Error` if `useToast` is used outside the provider.
- `Skeleton` (S): `{ className }` block `animate-pulse bg-moss-soft rounded-card`, `aria-hidden`.
- `EmptyState` (S): `{ title: string; description?: string; action?: { label; href } }`.
- `ErrorState` C-agnostic (S; the caller passes handlers): `{ title?: string; description?: string; onRetry?: () => void; retryLabel?: string }` — used by `error.tsx` files (which are C, so importing into them is fine).
- `Pagination` (S): `{ page; totalPages; hrefFor: (page: number) => string }` → `<nav aria-label="Pagination">` with Previous/Next links (rendered as `<span aria-disabled="true">` at bounds) and page links with `aria-current="page"`; windowed to 5 numbers.
- `Accordion` C: `{ items: { id: string; title: string; content: React.ReactNode }[]; allowMultiple?: boolean; defaultOpenIds?: string[] }`. Markup per item: `<h3><button id={`${id}-trigger`} aria-expanded aria-controls={`${id}-panel`}></button></h3><div id={`${id}-panel`} role="region" aria-labelledby={`${id}-trigger`} hidden={!open}>`. Keys on trigger: ArrowDown/ArrowUp move focus (wrap), Home/End first/last; Enter/Space native. Test lives at `accordion.test.tsx`.
- `icons.tsx` (S): `Icon` components `Cart, Search, Menu, Close, ChevronDown, ChevronLeft, ChevronRight, Heart, HeartFilled, User, Plus, Minus, Check, Star, StarFilled, Alert, Leaf, Truck, Shield, Refresh`; 24px viewBox, `stroke="currentColor"`, `aria-hidden` by default, `title?` prop to make one accessible. `export type IconName`.
- `VisuallyHidden` (S): `sr-only` span.

Layout (`src/components/layout/`)

- `Container` (S): `mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8`.
- `Providers` C: wraps `ToastProvider` > `CartProvider` > children. Rendered in the storefront layout only.
- `AnnouncementBar` (S): text from `siteConfig.announcement`, `bg-moss text-white text-sm text-center py-2`, `role="region" aria-label="Announcement"`. Not dismissible in Phase 1.
- `Header` (S; async, awaits `categoryService.listCategories()`): sticky `top-0 z-40 border-b border-line bg-canvas/95 backdrop-blur`; logo = text wordmark "Haven Botanics" in `font-display font-semibold text-xl` (`Link` to `/`) + a small `Leaf` icon; desktop nav `<nav aria-label="Primary">`: Shop, `CategoriesMenu`, About, FAQ, Contact; right cluster: `SearchBar`, Account (`Button variant ghost href="/account"` with `User` icon + visually hidden "Account" on mobile), `CartButton`, `MobileMenu` trigger (visible `< lg`).
- `CategoriesMenu` C: `{ categories: CategoryRef[] }` → `<button aria-expanded aria-haspopup="menu">Categories</button>` + `<ul role="menu">` of `role="menuitem"` links; opens on click/Enter/ArrowDown, closes on Esc/outside click/blur-out; arrow keys move between items. Also listed on mobile inside `MobileMenu`.
- `CartButton` C: reads `useCart().itemCount`, renders count badge (`aria-label={`Cart, ${n} items`}`), `onClick={openDrawer}`.
- `MobileMenu` C: `{ nav: NavLink[]; categories: CategoryRef[] }` hamburger `aria-label="Open menu"` → `Drawer side="left"` listing nav + categories + Account link.
- `SearchBar` C: `{ placeholder?: string }` — form `role="search"` with `<input role="combobox" aria-expanded aria-controls="search-listbox" aria-activedescendant aria-autocomplete="list">`; `useDebounce(value, 250)`; fetch `/api/search?q=` with `AbortController` cleanup; `<ul id="search-listbox" role="listbox">` with `role="option"` items (image thumb, label, price); ArrowUp/Down cycle, Enter navigates to active option (`router.push`) or submits `/shop?q=`; Esc closes; outside click closes. On mobile (< md) the input collapses to an icon button that expands. Fetch errors set an inline "Search is unavailable right now" message (no silent catch).
- `Footer` (S): `footerGroups` columns, contact block, socials (external links `rel="noreferrer"`), `legal.disclaimer` + `ageNotice` in `text-sm text-ink-muted`, copyright with current year.
- `Newsletter` C: `{ heading?: string }` form with `Input` (email), submit "Subscribe"; validates with `newsletterSchema` on submit; success state: "Thanks. You're on the list." shown in `role="status"`; on error shows field error. No network; note in a comment that Phase 10 wires the server action. (Success here is acceptable because the brief explicitly says "success/error states, no network".)

Catalog (`src/components/catalog/`)

- `Hero` (S): `{ content: HeroContent; product: ProductSummary }` two-column at `lg`; left H1 `text-4xl md:text-5xl font-display tracking-display`, body `text-lg text-ink-muted`, two Buttons; right "product plate": `rounded-card border border-line bg-surface p-4` with `next/image` (`sizes="(min-width: 1024px) 40vw, 100vw"`, `priority`) and `SpecSheet variant="full"` below. Five reveal children with staggered delays.
- `SpecSheet` (S): `{ specs: ProductSpecs; variant?: "compact"|"full" }` → `<dl>` rows "Strength" (`${strengthMg} mg`), "Spectrum" (Full spectrum/Broad spectrum/Isolate), "Lab tested" ("Yes, third party"); full variant adds "Serving" and "Ingredients". Rows separated by `border-t border-line`, values `tabular-nums`, `text-sm`. Returns null if `specs` is null.
- `Price` (S): `{ priceCents; compareAtPriceCents?: number | null; size?: "sm"|"md"|"lg" }` — compare-at as `<s>` with `text-ink-muted` plus `VisuallyHidden` "Original price"; current price first; when on sale wrap current in `text-iris`.
- `RatingStars` (S): `{ value: number; count?: number }` 5 icons, `aria-label={`${value} out of 5 stars`}`, count text "(12)".
- `CategoryCard` (S): `{ category: CategoryWithCount }` → `Link href={`/shop/${slug}`}` card with image (`sizes="(min-width: 768px) 33vw, 100vw"`), name, `${productCount} products`.
- `ProductCard` (S wrapper containing C islands `AddToCartButton`, `WishlistButton`): `{ product: ProductSummary; priority?: boolean }` → `<article>`; image `Link` (`sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw"`); Badges: "Sale" (iris) when compare-at, "Out of stock" (neutral) when `inventory === 0`; name link (`text-base font-medium`), `Price size="sm"`, `RatingStars` when `reviewCount > 0`, compact `SpecSheet`, footer row with `AddToCartButton` (default variant, qty 1, `size="sm"`, `fullWidth`) and `WishlistButton`. Out of stock → button disabled with label "Out of stock".
- `ProductGrid` (S): `{ products: ProductSummary[]; emptyAction?: { label; href } }` → `<ul>` grid `grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6`; renders `EmptyState` with the mandated copy when empty.
- `ProductFilters` C: `{ categories: CategoryRef[]; current: ShopQuery; basePath: string; lockedCategory?: string; priceRange: { minCents; maxCents } }` — a `<form aria-label="Filters">` with: category `Select` (navigates to `/shop/<slug>` or `/shop`; disabled + shown when `lockedCategory`), min/max price `Input type="number"` (whole dollars), "In stock only" `Checkbox`, "Apply" and "Clear" buttons. Apply → `router.push(buildShopHref(basePath, { ...current, ...changes, page: 1 }))`. On `< lg` the filters live inside a `Drawer` opened by a "Filters" button showing active count.
- `ProductSort` C: `{ current: ProductSort; hrefFor: (sort: ProductSort) => string }` — labeled `Select` "Sort by" with options Featured / Newest / Price: low to high / Price: high to low / Top rated; `onChange` → `router.push`.
- `ShopListing` (S, async): `{ query: ShopQuery; category?: CategoryWithCount; basePath: string; title: string; description?: string }` — calls `productService.listProducts`, `categoryService.listCategories`, `getPriceRangeCents`; renders heading + result count ("29 products"), `ProductFilters`, `ProductSort`, `ProductGrid`, `Pagination`. Used by both `/shop` and `/shop/[category]`.
- `ShopListingSkeleton` (S): heading skeleton + 8 card skeletons; used by both `loading.tsx` files.
- `ProductGallery` C: `{ images: ProductImage[]; name: string }` main `next/image` (`sizes="(min-width: 1024px) 50vw, 100vw"`, `priority`) + thumbnail `<ul>` of `<button aria-label={`Show image ${i+1}`} aria-current={active}>`; ArrowLeft/Right on a focused thumb move selection; `role="group" aria-roledescription="carousel"` on the wrapper.
- `VariantSelector` C: `{ variants: ProductVariant[]; value: string; onChange: (id: string) => void; legend?: string }` → `<fieldset><legend>Strength</legend>` with native radio inputs (`sr-only`) and styled `<label>` chips (`rounded-full border-line`, checked `border-moss bg-moss-soft`); out-of-stock variant disabled with "(out of stock)" in label.
- `QuantitySelector` C: `{ value; min?: 1; max?: siteConfig.cart.maxQuantityPerLine; onChange; id; label?: "Quantity" }` — group with `-`/`+` icon buttons (`aria-label="Decrease quantity"/"Increase quantity"`) around a numeric `<input inputMode="numeric">` bound to a visible or sr-only label.
- `AddToCartButton` C: `{ productId: string; variantId: string | null; quantity?: number; disabled?: boolean; size?; fullWidth?: boolean; label?: string }` — on click `addLine(...)`, `toast({ title: "Added to cart", tone: "success", action: { label: "View cart", onClick: openDrawer } })`, then `openDrawer()`; 600ms `loading` state is NOT faked — just call and open the drawer.
- `WishlistButton` C: `{ productId; name }` icon toggle `aria-pressed`, `aria-label={`Save ${name}`}`; uses `useWishlist()` (localStorage `haven-wishlist-v1`, `useSyncExternalStore`). Toast "Saved to wishlist" / "Removed from wishlist".
- `ProductPurchasePanel` C: `{ product: ProductDetail }` holds `selectedVariantId` (default variant) + `quantity`; computes `unitPriceCents = variant.priceCents ?? product.priceCents`; renders `Price`, `VariantSelector`, `QuantitySelector`, `AddToCartButton`, `WishlistButton`, stock line ("In stock" / "Only 3 left" when ≤ 5 / "Out of stock"), shipping note from `siteConfig.shipping`.
- `RelatedProducts` (S, async): `{ productId: string }` → heading "You might also like" + `ProductGrid`; returns null if none.
- `ReviewList` (S): `{ reviews: Review[]; ratingAverage; reviewCount }` → summary + `<ul>` of `<article>` (stars, title, author, date via `Intl.DateTimeFormat`); empty copy "No reviews yet."; a note "Reviews open with customer accounts in a later phase." (no fake form).

Cart (`src/components/cart/`)

- `CartDrawer` C: no props; `useCart()` for `isDrawerOpen/closeDrawer`, `useCartLines()` for priced lines; `Drawer title="Your cart"`; lists `CartItem`s, `CartSummary compact`, Buttons "View cart" (`/cart`) and "Go to checkout" (`/checkout`); empty state "Your cart is empty." + "Continue shopping" (`/shop`). Skeleton rows while `status === "loading"`; `ErrorState` with retry when `status === "error"`.
- `CartItem` C: `{ line: PricedCartLine; compact?: boolean }` image (`sizes="96px"`), name link, variant name, unit price, `QuantitySelector`, "Remove" button (`aria-label={`Remove ${name}`}`), line total.
- `CartSummary` (S-compatible pure render; keep S): `{ totals: CartTotals; compact?: boolean }` → `<dl>` Subtotal / Shipping ("Free" or amount, with "Add {x} more for free shipping" hint when applicable) / Total; note "Taxes calculated at checkout".
- `DiscountCodeForm` C: `Input` "Discount code" + "Apply" → on submit shows info line `role="status"`: "Discount codes arrive with checkout in a later phase." Never a success state.

Marketing (`src/components/marketing/`)

- `PromoSection` (S): `{ title; body; cta: { label; href }; imageUrl }` two-column on `md`, `bg-moss-soft rounded-card`.
- `TrustFeatures` (S): `{ features: TrustFeature[] }` 4-up grid, icon from `icons.tsx`.
- `CollectionStrip` (S): `{ collections: Collection[] }` 3 image cards, each a `Link`.
- `FAQAccordion` (S wrapper around C `Accordion`): `{ items: FaqItem[]; limit?: number; moreHref?: string }`.

Hooks (`src/hooks/`)

- `use-cart.tsx` C: module-level store `{ state: CartState; listeners }`, persisted to `localStorage["haven-cart-v1"]` (JSON, validated with a small Zod schema on read; invalid → empty cart + `console.warn`). `CartProvider` holds drawer UI state (`isDrawerOpen`) in `useState` and exposes context; cart lines come from `useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)` where `getServerSnapshot` returns a frozen `EMPTY` constant (prevents hydration mismatch and satisfies `react-hooks/set-state-in-effect`). `useCart()` → `{ lines, itemCount, addLine(productId, variantId, quantity), setQuantity, removeLine, clear, isDrawerOpen, openDrawer, closeDrawer }`. File header comment: "Phase 1 client-only cart. Replaced by cartService + server actions in Phase 5. Stores ids and quantities only; prices are resolved from product data."
- `use-cart-lines.ts` C: `useCartLines(): { status: "idle"|"loading"|"ready"|"error"; lines: PricedCartLine[]; totals: CartTotals; refetch }` — effect keyed on the sorted unique product ids string; fetches `/api/products?ids=`; keeps a `Map<productId, ProductSummary>`; derives `PricedCartLine[]` (drops lines whose product/variant no longer exists) and `computeTotals(lines, siteConfig.shipping)`.
- `use-debounce.ts`: `useDebounce<T>(value: T, ms: number): T`.
- `use-wishlist.ts`: same store pattern as cart; `{ ids, has(id), toggle(id) }`.

Route handlers

- `src/app/api/search/route.ts`: `GET(request: NextRequest)` → `q = request.nextUrl.searchParams.get("q") ?? ""`; `Response.json({ suggestions: await productService.searchSuggestions(q) })`.
- `src/app/api/products/route.ts`: `GET` → `ids` comma-separated, max 50, dedupe; `Response.json({ products })`; 400 JSON `{ error: "ids is required" }` when missing.

---

## 8. Pages (all Server Components unless noted; all inside `src/app/(storefront)/`)

- `layout.tsx` (`{ children }`): `<Providers><AnnouncementBar /><Header /><main id="main" className="flex-1">{children}</main><Footer /><CartDrawer /><Toaster /></Providers>`. Add a skip link "Skip to content" (`href="#main"`, `sr-only focus:not-sr-only`) as the first child.
- `page.tsx` (`/`): `metadata = { title: "Haven Botanics", description }` (override template with an absolute title: `title: { absolute: "Haven Botanics" }`). Data: `getFeaturedProducts(8)`, `listCategories()`, `getProductBySlug(content.home.heroProductSlug)`, content mocks via a tiny `contentService` (add `src/services/content.service.ts` with `getHomeContent()`, `getFaqItems()`, `getStaticPage(slug)` so pages don't import mocks). Sections in order: Hero, "Shop by category" (5 `CategoryCard`), "Featured products" (`ProductGrid` + "View all products"), `PromoSection`, `CollectionStrip`, `TrustFeatures`, FAQ preview (`FAQAccordion limit={4} moreHref="/faq"`), `Newsletter`. Static route.
- `shop/page.tsx` (`PageProps<"/shop">`): `const query = parseShopQuery(await props.searchParams)`; `metadata = { title: "Shop" }`; renders `<ShopListing query basePath="/shop" title="All products" />`. URL params: `q`, `sort`, `min`, `max` (whole dollars), `stock=1`, `page`. States: loading (`shop/loading.tsx` → `ShopListingSkeleton`), empty (grid EmptyState + "Clear filters" link), error (`shop/error.tsx` C using `ErrorState` with `retry`).
- `shop/[category]/page.tsx` (`PageProps<"/shop/[category]">`): `const { category } = await props.params; const cat = await getCategory(category); if (!cat) notFound();` before any other await; `generateMetadata` returns `{ title: cat.name, description: cat.description }` (or `{ title: "Category not found" }` when null; the page handles the 404). Renders `ShopListing` with `category`, `basePath={`/shop/${cat.slug}`}`, header with name + description. `shop/[category]/loading.tsx` → skeleton. `[nice]` `generateStaticParams` from `listCategories()`.
- `product/[slug]/page.tsx` (`PageProps<"/product/[slug]">`): `getProduct = cache((slug) => productService.getProductBySlug(slug))`; `notFound()` if null; `generateMetadata` → `{ title: product.name, description: product.shortDescription }`. Layout: breadcrumb `<nav aria-label="Breadcrumb">` Home / Shop / {category} / {name}; two columns at `lg`: `ProductGallery` | (`h1`, `RatingStars`, `Price`, `shortDescription`, `ProductPurchasePanel`, full `SpecSheet`); below: description (paragraphs), shipping and returns block (from `siteConfig.shipping` + FAQ), `FAQAccordion limit={3}` (product FAQ subset ids from content), `ReviewList`, `RelatedProducts`. `[nice]` `loading.tsx` skeleton.
- `cart/page.tsx`: `metadata = { title: "Cart" }`; renders C `CartPageContent` (put it in `src/components/cart/cart-page-content.tsx`): `useCartLines()`; table-like list of `CartItem`s, `DiscountCodeForm`, `CartSummary`, Buttons "Continue shopping" (`/shop`, secondary) and "Go to checkout" (`/checkout`, primary; disabled when empty); empty state as in the drawer.
- `checkout/page.tsx`: `metadata = { title: "Checkout" }`; static copy: "Checkout arrives in a later phase." + explanation that cart contents are kept in this browser + Buttons "Back to cart", "Continue shopping". No form.
- `account/page.tsx`: `metadata = { title: "Account" }`; "Accounts arrive in Phase 2." + short list of what accounts will include (order history, addresses) + "Continue shopping". No login form.
- `about/page.tsx`, `privacy/page.tsx`, `terms/page.tsx`, `faq/page.tsx`: content from `contentService.getStaticPage(slug)` rendered by a shared `ProseLayout` (S; `src/components/layout/prose-layout.tsx`): `h1` + intro + sections `h2` + paragraphs; `max-w-3xl`. FAQ page renders all items with `Accordion allowMultiple`. Each exports static `metadata` with `title`.
- `contact/page.tsx`: intro + contact details (`siteConfig.contact`) + C `ContactForm` (`src/components/layout/contact-form.tsx`): fields name, email, subject, message using `Input/Textarea`, `contactSchema` on submit (field errors + `role="alert"` summary "Please fix the highlighted fields."); on valid submit shows info state `role="status"`: "Sending isn't wired up yet. Email us at hello@havenbotanics.example in the meantime." Never a success state.
- `not-found.tsx`: `h1` "Page not found", body, Buttons "Go home", "Browse the shop". `[...rest]/page.tsx`: `export default function CatchAll() { notFound(); }`.
- `error.tsx` (C): logs `error` in `useEffect`, renders `ErrorState title="Something went wrong" onRetry={retry}`.
- Root `src/app/layout.tsx` stays the only place with `<html>/<body>`.

Client component list (the only `'use client'` files): `providers`, `categories-menu`, `cart-button`, `mobile-menu`, `search-bar`, `newsletter`, `contact-form`, `product-filters`, `product-sort`, `product-gallery`, `variant-selector`, `quantity-selector`, `add-to-cart-button`, `wishlist-button`, `product-purchase-panel`, `cart-drawer`, `cart-item`, `cart-page-content`, `discount-code-form`, `dialog`, `drawer`, `toast`, `accordion`, `use-cart.tsx` and other hooks, both `error.tsx` files.

---

## 9. Ordered task breakdown

**T1 — Foundation, tooling, tokens, fonts**
Files: `package.json`, `.prettierrc`, `.prettierignore`, `vitest.config.ts`, `vitest.setup.ts`, `next.config.ts`, `src/app/globals.css`, `src/app/layout.tsx`, `src/lib/site-config.ts`, `src/lib/cn.ts` (+test), `src/lib/money.ts` (+test); delete `public/*.svg`; move `src/app/page.tsx` to a temporary `src/app/(storefront)/page.tsx` placeholder ("Haven Botanics") so the build stays green.
Approach: install deps; add scripts; write tokens; set fonts + metadata; run `pnpm format`.
Accept: `pnpm typecheck`, `pnpm lint`, `pnpm test` (2 test files pass), `pnpm build` all green; `pnpm dev` shows placeholder in Figtree on `#F3F5F0`; no `public/*.svg` remain.

**T2 — Types, mocks, services, pure cart logic, tests**
Files: `src/types/*`, `src/mocks/catalog.ts`, `src/mocks/content.ts`, `src/services/{product,category,content}.service.ts`, `src/services/product.service.test.ts`, `src/lib/cart.ts` (+test), `src/lib/shop-query.ts`, `src/lib/validation/*`.
Accept: `product.service.test.ts` covers: default list (29 active, pageSize 12, totalPages 3), archived excluded, category filter, query on name/sku (case-insensitive), price-asc sort monotonic, min/max inclusive, inStock excludes the 2 zero-inventory products, page clamp, `getProductBySlug("gift-box")` → null, related excludes self and matches category, `searchSuggestions("x")` → `[]`, `searchSuggestions("gum")` ≤ 6 with a category suggestion. `cart.test.ts` covers merge/clamp/remove/totals (695 below $75, 0 at/above, 0 when empty). `money.test.ts`: `0 → "$0.00"`, `695 → "$6.95"`, `123456 → "$1,234.56"`, `-500 → "-$5.00"`. Typecheck/lint green.

**T3 — UI primitives**
Files: `src/components/ui/*` incl. `accordion.test.tsx`.
Accept: each primitive renders without props errors in a scratch page (delete scratch page after); Accordion test passes (first trigger `aria-expanded="false"`, click → `"true"` and region `hidden` removed, ArrowDown moves focus to next trigger, End → last); Dialog manual: Esc closes, focus returns to trigger, background does not scroll; focus rings are iris on every interactive element.

**T4 — Cart store, hooks, route handlers**
Files: `src/hooks/*`, `src/hooks/use-cart.test.tsx`, `src/app/api/search/route.ts`, `src/app/api/products/route.ts`.
Accept: `use-cart.test.tsx` (renderHook inside `CartProvider`): add → itemCount 1, add same → quantity 2, setQuantity 0 removes, clear empties, persisted JSON in `localStorage["haven-cart-v1"]`. `curl localhost:3000/api/search?q=gum` returns JSON suggestions; `?q=g` returns `[]`; `/api/products?ids=prod_calm-full-spectrum-oil` returns one product; missing ids → 400. No `react-hooks/*` lint errors.

**T5 — Layout shell**
Files: `src/components/layout/*` (except contact-form/prose-layout), `src/components/cart/{cart-drawer,cart-item,cart-summary}.tsx`, `src/app/(storefront)/layout.tsx`, `not-found.tsx`, `error.tsx`, `[...rest]/page.tsx`.
Accept: header sticky with all nav items at 1280; hamburger drawer at 375 and 768; Categories menu keyboard operable (Enter opens, arrows move, Esc closes); SearchBar shows suggestions after 2 chars, arrows + Enter navigate; cart button count updates; `/does-not-exist` shows storefront 404 with header/footer; skip link visible on Tab.

**T6 — Home page + marketing sections + catalog display components**
Files: `src/components/catalog/{hero,category-card,product-card,product-grid,spec-sheet,price,rating-stars,add-to-cart-button,wishlist-button}.tsx`, `src/components/marketing/*`, `src/app/(storefront)/page.tsx`.
Accept: `/` renders all 8 sections in order; hero reveal completes within 600ms and is disabled with reduced motion (DevTools emulation); product card hover scales image 1.02 and reveals "Add to cart"; keyboard Tab reaches "Add to cart" without hover; adding opens the drawer with correct price; wishlist toggles `aria-pressed`; newsletter validates and shows success/error states; Lighthouse a11y on `/` ≥ 95.

**T7 — Shop and category listing**
Files: `src/components/catalog/{product-filters,product-sort,shop-listing,shop-listing-skeleton}.tsx`, `src/app/(storefront)/shop/**`.
Accept: `/shop?q=tea&sort=price-asc&min=20&max=40&stock=1&page=1` filters correctly and the UI reflects each param; changing any filter resets page to 1; `/shop/topicals` shows 6 products with the category description; `/shop/nope` → 404; `/shop?min=999` shows the exact empty copy with a "Clear filters" link; `loading.tsx` skeleton visible on slow 3G throttling; page `<title>` is "Topicals | Haven Botanics".

**T8 — Product detail page**
Files: `src/components/catalog/{product-gallery,variant-selector,quantity-selector,product-purchase-panel,related-products,review-list}.tsx`, `src/app/(storefront)/product/[slug]/page.tsx`.
Accept: `/product/calm-full-spectrum-oil` shows gallery (thumb keyboard nav works), switching variant changes price to $64/$109, quantity clamps 1–10, add to cart adds the selected variant with the chosen quantity, out-of-stock product disables the button, related shows 4 tinctures excluding self, reviews list renders only published; `/product/gift-box` and `/product/nope` → 404; title "Calm full-spectrum oil | Haven Botanics".

**T9 — Cart, checkout placeholder, account placeholder, static pages, contact**
Files: `src/components/cart/{cart-page-content,discount-code-form}.tsx`, `src/components/layout/{prose-layout,contact-form}.tsx`, `src/app/(storefront)/{cart,checkout,account,about,faq,contact,privacy,terms}/page.tsx`.
Accept: `/cart` quantity edits and removals update totals; shipping shows $6.95 under $75 and "Free" at/above; discount code shows the info message only; "Go to checkout" leads to the placeholder; `/account` has no form; contact form shows field errors then the "Sending isn't wired up yet" state; all static pages have titles via the template; no medical claims anywhere (grep for "anxiety|pain|treat|cure|relief|sleep aid|THC" across `src/mocks` and `src/app` returns nothing except the footer disclaimer sentence).

**T10 — Polish, a11y, responsive, cleanup**
Files: any.
Accept: walk every route at 375/768/1280 with no horizontal scroll; keyboard-only pass through header, search, category menu, mobile menu, drawer, dialog, filters, gallery, variant radios, accordion; all images have `alt` and `sizes`; no `'use client'` beyond the list in section 8; `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` all green; no unused exports/files (scratch pages removed); suggest commit message `feat: phase 1 storefront foundation, design system and mock catalog`.

---

## 10. Verification

Commands (from `/home/cpt/dev/main/Haven-Ways/weed-website`):

- `pnpm install` (after adding deps) → `pnpm typecheck` → `pnpm lint` → `pnpm test` → `pnpm build` → `pnpm format:check`.
- `pnpm dev` then: `curl -s "localhost:3000/api/search?q=gum" | head -c 400`; `curl -s "localhost:3000/api/products?ids=prod_calm-full-spectrum-oil"`; `curl -s -o /dev/null -w "%{http_code}" localhost:3000/shop/nope` (expect 404 since `notFound()` runs before streaming).

Manual checks: routes `/`, `/shop`, `/shop/tinctures`, `/product/calm-full-spectrum-oil`, `/product/unflavored-isolate-oil` (out of stock), `/cart` (empty and filled), `/checkout`, `/account`, `/about`, `/faq`, `/contact`, `/privacy`, `/terms`, `/nope` at 375/768/1280; `prefers-reduced-motion` emulation disables hero reveal and hover transitions; contrast spot-check with DevTools on `text-ink-muted` over `bg-canvas` (≥ 4.5:1) and iris on iris-soft; cart persists across reload; no console errors or hydration warnings in dev.

Ambiguities resolved (summary): see section 0 items 1–11 (specs column name, category embedding, computed ratings, API-based cart pricing, catch-all 404, `href` instead of `asChild`, inline icons, kebab-case files, no typedRoutes, no metadataBase, and hero/product seed content specified here). Newsletter shows a success state because the brief asks for success/error states with no network; contact and discount forms never show success, per the brief.
