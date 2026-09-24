# Spec: Checkout page + order creation

Matches the reference checkout layout; user chose the full 8-method payment list and configurable tax rows.

## 0. Risks
- R1 Zelle/Venmo/Cash App/PayPal F&F prohibit or don't protect goods payments; accounts get frozen and buyers have no dispute path. Each method sits behind an `enabled` flag in siteConfig. The UI never implies buyer protection.
- R2 Don't copy brand logos. Ship neutral text badges + `public/images/payments/README.md` telling the client to add official assets from each brand's press page (permitted only for methods actually accepted). Missing `logo` → text badge.
- R3 Orders now store real names/addresses/phones in Neon, and `notifyNewOrder` emails order details to a Gmail inbox. Privacy page must state what's collected, why, who sees it, retention (recommend: order records incl. address snapshots kept 7 years for tax; account-linked saved addresses deleted with the account).
- R4 Zero PCI scope: no card numbers, CVV, bank or account credentials are ever collected. "Pay With Card" means "we contact you to arrange card payment", never a card form. State this on the page and in privacy copy.
- R5 No payment is taken: `paymentStatus: "pending"` always; no copy may claim payment succeeded/received/processed.
- R6 Inventory decrements at creation with no payment guarantee; unpaid orders hold stock. Restock-on-cancel is an explicit follow-up (no admin UI yet).
- R7 Guest confirmation URL carries a token (lands in history/emails) — accepted deliberately.
- R8 `RESEND_API_KEY` unset → `sendEmail` logs only. The confirmation page must NOT say an email is on its way.

## Dependencies / open questions
- Read the installed Next 16.3.5 conventions (async `params`/`searchParams`, `PageProps`/`LayoutProps`, `"use server"`) before writing route code; `node_modules/next/dist/docs/` may not exist — check `generate-agent-files.js` and the installed types.
- Docker Postgres for the `db` vitest project. `BETTER_AUTH_SECRET` already required; the confirmation token derives from it. No new env vars.
- Defaults: `salesPercent: 0` and `excisePercent: 0` (a tax row renders only when its percent > 0) — client confirms the real rate; all 8 methods `enabled: true`; no state blocklist for smokable hemp in MVP; pickup orders still collect a billing address (pickup location = `siteConfig.contact.address`); `pickupDiscountCents: 0` (if non-zero it must go into `discountCents`, never a negative `shippingCents`).

## 1. Acceptance criteria
AC1 guest completes `/checkout` → confirmation with a real `BSC-1000xx`. AC2 signed-in prefills name/email and links `userId`. AC3 every money value comes from the server. AC4 stored rows satisfy the DB checks, asserted in code before insert. AC5 `status`/`paymentStatus` both `pending`; no payment-taken copy. AC6 selecting a method reveals instructions; phone renders from `siteConfig.contact.phone` (no literal in checkout code). AC7 inventory decremented atomically; out-of-stock/archived mid-checkout blocks with a named error. AC8 valid coupon reduces total and increments `uses`; invalid ones are rejected and the order still prices. AC9 confirmation reachable by the placing guest (token) or the signed-in owner only. AC10 `notifyNewOrder` called once; failure logs, never rolls back. AC11 layout matches the reference, navy/orange tokens, accent "Place order". AC12 one h1, fieldset/legend on both radio groups, labels everywhere, `aria-live` totals, `role="alert"` summary. AC13 lint, typecheck, unit and db projects pass.

## 2. Routing
New `(checkout)` group; DELETE `src/app/(storefront)/checkout/page.tsx` (same URL can't exist twice; storefront layout also exports `revalidate = 3600` and fetches categories).
```
src/app/(checkout)/layout.tsx                                   new (skip link, Providers — useCart needs CartProvider — CheckoutHeader, main, Toaster; no revalidate, no CartDrawer/Footer)
src/app/(checkout)/error.tsx                                    new
src/app/(checkout)/checkout/page.tsx                            new
src/app/(checkout)/checkout/actions.ts                          new ("use server")
src/app/(checkout)/checkout/confirmation/[orderNumber]/page.tsx new
```
Check in a dev server that `/checkout` and the confirmation route don't fall through to `(storefront)/[...rest]`.

## 3. Layout
Header (logo left / "Checkout" right) → `CheckoutSteps current={2}` → `grid lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]`.
LEFT "Billing details": First/Last name (sm:grid-cols-2), Company (optional), Country (US-only select), Street address (line1 "House number and street name", line2 "Apartment, suite, unit, etc. (optional)"), Town/City, State (select), ZIP, Phone, Email, "Deliver to a different address?" → second address fieldset, Order notes textarea.
RIGHT "Your order": line items (thumb, name, × qty, price), Subtotal, Order Type radios (Free Delivery / Curbside Pickup) between Subtotal and taxes, Excise Tax + Sales Tax (each only when percent > 0), Total, payment radios (8, logo slot right, instructions under selection), marketing opt-in, full-width accent "Place order" with padlock, SecurityBadges, CheckoutReview (omitted when no review).
BOTTOM LEFT: "Have a coupon? Click here to enter your code" → reveals input.

## 4. Config
`siteConfig.checkout`: `taxes { excisePercent, salesPercent }`, `delivery { freeDeliveryThresholdCents, deliveryFeeCents, pickupDiscountCents }` **referencing `siteConfig.shipping`** so `/cart` and `/checkout` can't diverge, `paymentMethods[]`, `securityBadges[]`.
`src/lib/payment-methods.ts`: `PAYMENT_METHOD_IDS = ["zelle","apple-pay","chime","card","bitcoin","paypal","cash-app","venmo"]`, `PaymentMethodConfig { id, label, instructions, logo?, enabled }`, `resolvePaymentInstructions(m, contact)` substituting `{phone}`, `enabledPaymentMethods(cfg)`. Instructions template per the reference: "Kindly call/text our customer service on {phone} for payment instructions after placing your order." `z.enum(PAYMENT_METHOD_IDS)` server-side; the server also rejects disabled methods.
Security badges (honest only): padlock + "Secure checkout", "We never see or store card details", "Lab tested, 21+", and the list of methods actually offered. No Accredited Business/antivirus/Visa marks.

## 5. Pricing — `src/lib/order-pricing.ts` (pure)
`computeOrderTotals(lines, options)` → `{ subtotalCents, discountCents, shippingCents, exciseTaxCents, salesTaxCents, taxCents, totalCents }`, plus `assertTotalsConsistent`.
1. subtotal = Σ unit × qty. 2. percent → `Math.round(subtotal*value/100)`, fixed → `min(value, subtotal)`, clamped ≤ subtotal (same as the seed). 3. delivery fee decided on the PRE-discount subtotal; pickup → 0. 4. tax base = subtotal − discount (floor 0); **shipping is not taxed**. 5. each tax line rounded independently half-up so the two rows sum exactly to stored `tax_cents`. 6. `total = subtotal + shipping + tax − discount` (identical to `orders_total_check`). 7. `assertTotalsConsistent` re-checks and throws before any insert.

## 6. `orderService` (factory pattern like product.service)
`priceOrder(lines, options, db?)`, `createOrder(input)`, `getOrderByNumber(number, viewer)`.
priceOrder: merge duplicate (product,variant) lines, clamp qty to `cart.maxQuantityPerLine`, cap 50 lines; load via `visibleProduct(features)` so archived/draft/flag-hidden can't be ordered; `unitPrice = variant?.priceCents ?? product.priceCents`; stock from variant else product; issues `unavailable` / `out_of_stock` (line dropped) / `invalid_coupon` (priced without it); coupon valid when active AND not expired AND subtotal ≥ min AND uses < maxUses. Returns quoted lines carrying snapshot fields (name, variantName, sku, imageUrl) so summary and insert share data.
createOrder (one transaction): re-price inside the transaction; blocking issues → `ConflictError` naming items; inventory via guarded `update ... where id = $id and inventory >= $q returning id` (product and variant), zero rows → ConflictError and rollback; coupon `update ... where (max_uses is null or uses < max_uses) returning id`, zero rows → re-price without the discount (never fail an order over a coupon); insert order (`orderNumber` omitted so the sequence default applies; `userId` from the session only; email lowercased; money from the quote; address snapshots; `checkoutMeta`); insert items; marketing opt-in → `insert ... on conflict do nothing` with lowercased email. After commit: `notifyNewOrder` in try/catch that logs via `logUnexpectedError`.
`getOrderByNumber(number, { userId, token })` → returns the order when owner matches or `verifyOrderToken` passes, else null → page calls `notFound()`.
Inventory: decrement at creation, no reservation (no payment step, no job runner). Restock-on-cancel is a named follow-up.

## 7. Order record + the one migration
Reuse: status, paymentStatus, email, userId, notes, discountCode, subtotal/shipping/discount/tax/total cents, address jsonb, order_number default.
`OrderAddress` gains `company?: string | null` — TypeScript only, no SQL (column is jsonb, field optional).
**One additive migration:** `ALTER TABLE "orders" ADD COLUMN "checkout_meta" jsonb;` (nullable, no backfill), typed `CheckoutMeta { paymentMethod, orderType, exciseTaxCents, salesTaxCents, marketingOptIn }`. Chosen over 3 scalar columns: the table already snapshots in jsonb, no admin filtering exists yet, future fields cost no migration.
`src/lib/order-access.ts` (server-only): HMAC-SHA256 over the order id keyed by `BETTER_AUTH_SECRET`, base64url, 32 chars; `verifyOrderToken` uses `timingSafeEqual`. Nothing stored.

## 8. Data flow
Page = Server Component: `getSession()` (never `requireUser`), `reviewService.getFeaturedReview()`, renders steps/review/badges + one client island `CheckoutForm`.
Island reads `useCart()`; on hydration and whenever `{lines, orderType, appliedCode}` change (debounced ~250 ms) calls server action `quoteOrderAction` → `ActionResult<OrderQuote>`; `/api/products` and `use-cart-lines` are NOT used here. Submit → `placeOrderAction`; on ok, clear the cart then `router.replace(data.confirmationPath)`. Client never computes money; summary shows a skeleton until the first quote.
Both actions in `actions.ts`, Zod-validated, `userId` from `getSession()` inside the action, errors through `handleActionError`.
Mid-checkout changes: `OrderQuote.issues` → warning block above totals naming each item; blocking issues disable submit; a lost race returns CONFLICT and re-quotes. Empty cart (after hydration) → `router.replace("/cart")`.

## 9. Components (`src/components/checkout/`)
`CheckoutHeader` (server), `CheckoutSteps` (server, `<ol>`, `aria-current="step"`, completed get Check + sr-only "completed"), **`CheckoutForm` (the one client island)**, `BillingDetailsForm` (client, `prefix: "billing"|"shipping"` namespacing ids and autoComplete), `ShippingAddressToggle`, `OrderSummary` (client; `aria-live="polite"`; `children` slot holds the order-type radios), `OrderTypeRadios`, `PaymentMethodRadios` (logo slot right or text badge; instructions in a `<p id>` referenced by `aria-describedby`), `CouponForm` (collapsed, `aria-expanded`/`aria-controls`), `PlaceOrderButton` (accent, full width, Lock icon), `SecurityBadges` (server), `CheckoutReview` (server, null when none), `ConfirmationSummary` (server).
Add a `Lock` icon to `src/components/ui/icons.tsx`. Add `US_STATES` (code + name) beside the existing `US_STATE_CODES`/`US_ZIP_PATTERN` in `address.schema.ts`, derived from the same tuple. Country select is US-only.

## 10. Validation and states
`src/lib/validation/checkout.schema.ts`: `checkoutAddressSchema` (names 2..50, company optional→null, `country: z.literal("US").default("US")`, line1 3..120, line2 optional→null, city, state uppercased `z.enum(US_STATE_CODES)`, ZIP regex, **phone required** unlike `addressSchema`), and `checkoutInputSchema` (billing, nullable shipping, `z.email()`, notes ≤1000, orderType, paymentMethod, marketingOptIn, optional discountCode, lines 1..50 with qty 1..maxQuantityPerLine).
Client validates with the same schema (ContactForm pattern: first error per field, cleared on change, `role="alert"` summary); server re-validates and returns `fieldErrors` merged into the same state.
States: first-load skeleton; quote error with retry (submit disabled); empty cart redirect; blocking stock issues; invalid coupon inline; submit pending; server failure keeps the cart intact for retry.

## 11. Confirmation page
Server Component, `robots: { index: false }`, title "Order confirmed". Reads `params.orderNumber` + `searchParams.t` (verify async signatures against the installed Next), `getSession()`, `getOrderByNumber`, null → `notFound()`. Shows steps at 3, the order number, a clear "We have not taken payment yet" banner, the chosen method's instructions, delivery vs pickup (pickup shows `siteConfig.contact.address`), address snapshot, items, all totals rows, links to `/shop`. Must NOT promise an email. `placeOrderAction` returns the full path including the token.

## 12. Emails
`notifyNewOrder` after commit; optional customer copy is a nice-to-have. Both only log until `RESEND_API_KEY` is set — say so in a code comment. Unset `ORDER_NOTIFICATION_EMAIL` → `{ sent: false, reason: "not-configured" }` and the order still succeeds.

## 13. Tests
Unit: `order-pricing` (threshold both sides, pickup, percent/fixed discounts, clamp, half-up rounding on odd cents, excise off/on, shipping untaxed, the total identity, assert throwing), `order-access` (stable, differs, rejects wrong/short/empty), `payment-methods` (`{phone}` substitution, no literal phone, disabled filtered), `checkout.schema`, and component tests for `checkout-form`, `order-summary`, `payment-method-radios`, `coupon-form`.
DB (Docker, one file at a time): `order.service.test.ts` — guest create end to end; signed-in links userId; inventory decremented (product and variant); out-of-stock rejected with **no partial rows**; archived/hidden-category rejected; coupon accepted/expired/inactive/under-minimum/exhausted and `uses` incremented; order number `/^BSC-1\d{5}$/`; inconsistent totals caught before Postgres; `getOrderByNumber` for valid token / wrong token / owner / stranger. `review.service.test.ts` — highest-rated recent published, null when none, hidden-category excluded.

## 14. Tasks
- **T1** config, pure pricing, order-access, validation, `US_STATES`, `Lock` icon, payments README. Verify: lint/typecheck/unit; grep proves no literal phone in checkout code.
- **T2** `checkout_meta` migration, `orderService`, `reviewService`, email wiring. Verify: `pnpm db:generate` produces exactly that one ALTER; db project on Docker; no partial writes on any failure path.
- **T3** route group, layout, page shell, both server actions; delete the storefront checkout page. Verify: `pnpm build` (proves no duplicate route), dev server on port 3100 (never 3000).
- **T4** the form, summary and remaining components. Verify: unit tests; manual pass against the reference; keyboard-only through both radio groups and both toggles; totals announce on Free Delivery ↔ Curbside Pickup.
- **T5** confirmation page, cart discount-form copy (it still says "arrives in a later phase"), privacy copy. Verify: place a guest order, open the confirmation URL in a private window (works), strip `?t=` (404), alter the order number (404); no sentence claims payment taken or email sent.

## 15. Scope
MVP = T1–T5. Out: customer confirmation email copy, one-click "remove unavailable items", saved-address prefill/save, non-zero pickup discount, per-state tax rates, admin cancel + restock, payment brand logo images, server-side cart persistence.
