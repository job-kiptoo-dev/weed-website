# Spec: Stripe Elements card payments at checkout

Grounded in the code as it stands on `main` (uncommitted Phase-2 checkout). Read-only exploration; nothing was modified. No `bash` tool was available in this session, so every version/CLI check below is written as a command for the implementer, with an explicit decision rule rather than an assumption.

---

## 0. RISKS, DEPENDENCIES, OPEN QUESTIONS (read first)

### Blocking dependency — Stripe is not provisioned yet
`vercel integration add stripe` returned `integration_terms_acceptance_required`. **The user must do this before T2 can be verified end to end** (T1 can start now):

1. Open the Vercel dashboard → Integrations → Marketplace → Stripe → **Accept the marketplace terms** in the browser (CLI cannot accept them).
2. Re-run `vercel integration add stripe` (scope: the working personal scope `captain-jobs-projects`, not the suspended `biiarons-projects` — see memory).
3. `vercel env ls` and note the **exact** names injected. Expect `STRIPE_SECRET_KEY` and a publishable key; the publishable one is injected under one of `STRIPE_PUBLISHABLE_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` / `STRIPE_PUBLISHABLE_KEY_LIVE` depending on the integration version. **Do not guess — read the names off `vercel env ls` and make `src/lib/env.ts` match.** The design below reads the publishable key server-side and passes it down as a prop, so it works whatever the name is and needs no `NEXT_PUBLIC_` rename (see §4).
4. `STRIPE_WEBHOOK_SECRET` is **never** injected by the integration. The user creates it: locally from `stripe listen`, in production from Dashboard → Developers → Webhooks (see §11).
5. Do **not** run `vercel env pull .env.local` — `.env.example` forbids it (it clobbers local-only `SEED_ADMIN_*`). Pull to the scratch dir if needed: `vercel env pull /tmp/claude-1000/.../scratchpad/.env.vercel --environment=preview`, then hand-copy the two names into `.env.local`.

### Risks
- **R1 (highest) — Stripe may refuse this business.** Stripe requires **pre-approval for CBD/hemp** and routinely prohibits **smokable hemp** and **smoking accessories**. This catalog has all three: `src/lib/db/seed-data/catalog.ts` defines categories `hemp-pre-rolls` ("Hemp pre-rolls"), `hemp-flower`, `glassware` and `accessories`. Consequence if rejected (or terminated later, possibly with a funds hold): **nothing breaks.** The card method is env-gated (§4) — with no Stripe keys in an environment, the `card` radio is filtered out of the UI and the server rejects it, and the other 7 manual methods behave exactly as today. Test mode keeps working for development regardless.
- **R2 — live keys must not be used before written approval.** Enforced in the env schema: `sk_live_*` is rejected unless `VERCEL_ENV === "production"`, and mixed test/live key modes are rejected outright (§4). Recommendation: leave the production env **without** Stripe keys until approval lands, so production silently shows 7 manual methods and preview runs test mode.
- **R3 — orders exist before payment.** Recommended flow (§2) keeps today's invariant: the order row and the inventory claim happen first, the charge second. An abandoned or declined card payment leaves a `pending` order holding stock — identical to every manual method today (checkout spec R6). **Failure does not restock and does not refund coupon uses** (§6, with reasons). Restock-on-cancel remains the pre-existing named follow-up.
- **R4 — webhook lag.** `payment_intent.succeeded` can arrive before or after the browser reaches the confirmation page. The page must never claim "paid" from a client-side signal; truth comes from `orders.payment_status`, written only by the webhook. The interim state is shown honestly and polled (§7).
- **R5 — copy currently lies once card is live.** `src/lib/payment-methods.ts:76` ("No card details are ever entered on this site"), `src/content/site-content.ts:192` ("There is no card form anywhere on it"), `src/components/checkout/checkout-form.tsx:486` and `src/components/checkout/payment-status-notice.tsx:66` all assert there is no card form. All four must change in the same PR as the UI (§9). Tests currently assert the old copy (`src/lib/payment-methods.test.ts:52`, `src/lib/site-config.test.ts:83`, `src/components/checkout/confirmation-summary.test.tsx:154`).
- **R6 — deferred-intent amount coupling.** With `PaymentElement` in deferred mode, Stripe validates that the Elements `amount` matches the PaymentIntent at `confirmPayment` time. Mitigation: `placeOrderAction` returns the authoritative `amountCents` from the created order and the client calls `elements.update({ amount })` with *that* number before confirming. Residual risk: a re-`submit()` may be required after `update()`; treat an amount-mismatch error as "update + submit + confirm again, never create a second order" (§7). Named fallback: `CardElement` + `confirmCardPayment`, which needs no amount at all — allowed by T4's acceptance criteria as long as the `CardPaymentApi` contract holds.
- **R7 — Stripe.js is a third-party script.** Ad-blockers/CSP can make `loadStripe` resolve `null`. Must be handled explicitly (message: "Card payment can't load right now — choose another method"), never a silent failure. There is no `middleware.ts` and no CSP headers today; if one is added later it needs `script-src`/`frame-src js.stripe.com` and `connect-src api.stripe.com`.
- **R8 — no rate limiting exists** for server actions/route handlers (the only limiter is Better Auth's internal one, `src/lib/auth/server.ts`). PaymentIntent creation is reachable only through `placeOrderAction`, which already writes an order, so abuse costs an order row. Accepted for MVP; noted as a nice-to-have.
- **R9 — local DB is in-memory PGlite** (`src/lib/db/client.ts`), per dev-server process and wiped on restart. `stripe listen --forward-to localhost:3100/...` hits the same process, so the webhook sees the same data — but the order and the webhook must happen within one `pnpm dev` run.

### Open questions (each has a stated default so nobody is blocked)
1. Exact injected env var names — **must** be confirmed via `vercel env ls` (above).
2. Statement descriptor / DBA name for card statements — default: leave to the Stripe account setting, set no `statement_descriptor_suffix`.
3. Should Stripe email a receipt (`receipt_email`)? Default **no** for MVP (Stripe only sends receipts in live mode, and the confirmation page must not promise an email — checkout spec R8). Listed as a nice-to-have.
4. Keep the `card` radio visible in production before approval? Default **no** — achieved by not setting production Stripe env vars.
5. Stripe Dashboard: Link and wallets must be off for the PaymentElement (§11). If the user wants Apple Pay via Stripe later, the existing *manual* `apple-pay` method has to be retired first — two Apple Pay paths would be dishonest.

### Architecture rules applied
- Project `CLAUDE.md` only does `@AGENTS.md`; `AGENTS.md`'s single rule is **"this is not the Next.js you know — read `node_modules/next/dist/docs/` before writing code."** That folder **does not exist in the current install** (verified), and neither does `node_modules/next/dist/server/lib/generate-agent-files.js`. So: run `pnpm dev` once (it regenerates the AGENTS.md block and the docs if that version ships them) and otherwise verify Next 16.3.5 conventions against the **installed types and existing code**, which already demonstrate them: `PageProps<"/checkout/confirmation/[orderNumber]">` with awaited `params`/`searchParams` (confirmation page), `LayoutProps<"/">`, `"use server"` action files, and `NextRequest`-based route handlers (`src/app/api/products/route.ts`). Do not delete the AGENTS.md block; commit it with the work.
- **There are no microfrontend or event-bus rules in this project.** A microfrontend would not be justified here anyway: one route, shared cart context (`Providers`/`CartProvider` in `src/app/(checkout)/layout.tsx`), shared Tailwind v4 theme tokens, and a server action already co-located with the page. Everything below stays in this single Next app — no new package, no new deployment unit.
- Global rules honoured: TS strict, **no `any`** (narrow `Stripe.Event` by `event.type`, never cast `event.data.object`), tests colocated, **no secrets in code** (all keys via `src/lib/env.ts`), explicit error handling with `logUnexpectedError` — **no silent catch**, small focused commits.
- Ops constraints: RAM is limited → db tests run one file at a time (already `fileParallelism: false`), Docker Postgres via `TEST_DATABASE_URL` on **5433**; dev server on **3100**, never 3000.

### No migration required
`orders.stripe_payment_intent_id text unique` already exists (`src/lib/db/schema/orders.ts:45`) and `checkout_meta jsonb` already exists (migration `drizzle/0001_romantic_morlun.sql`). The one new stored field, `paymentProvider`, goes **inside** `checkoutMeta` (jsonb → TypeScript-only change, exactly like `OrderAddress.company`). **`pnpm db:generate` must produce no new SQL.** If it does, something typed a column by mistake.

---

## 1. Problem and acceptance criteria

**Problem.** Today every payment method is a manual arrangement: the order is stored `status: "pending" / paymentStatus: "pending"` and a person phones the customer (`src/lib/payment-methods.ts`). "Pay With Card" is the most-chosen option and the worst experience — the customer must wait for a call and read a card number aloud. We want card number / expiry / CVC entered inline on `/checkout`, styled to match, with the card data going **straight to Stripe** (our servers never see it), while all 7 other manual methods keep working byte-for-byte as they do now.

**Acceptance criteria**
- **AC1** With Stripe configured, selecting "Pay With Card" reveals card number, expiry and CVC fields inline in the existing summary column; selecting any other method hides them.
- **AC2** No card number, expiry or CVC value ever reaches our server, our logs, our DOM outside Stripe's iframes, `localStorage`, or a URL. Neither does the client secret (never logged, never in a URL).
- **AC3** The charged amount is always `orders.total_cents`, read from the committed order row on the server. No amount from the browser is ever trusted.
- **AC4** Placing a card order creates exactly one order and exactly one PaymentIntent, even on double-submit or retry after a decline (Stripe idempotency key + a reused stored `stripe_payment_intent_id`).
- **AC5** A declined card leaves the customer on `/checkout` with Stripe's own message in the existing `role="alert"` block, a one-click retry that does **not** create a second order, and a visible link to their saved order.
- **AC6** `orders.payment_status` is written **only** by the webhook. `payment_intent.succeeded` → `paid` (and `status` `pending`→`paid`); `payment_intent.payment_failed` → `failed` (only from `pending`); a full `charge.refunded` → `refunded`.
- **AC7** The webhook verifies `stripe-signature` against `STRIPE_WEBHOOK_SECRET` using the **raw** body; an invalid signature writes nothing and returns 400.
- **AC8** Delivering the same event twice changes nothing on the second delivery and still returns 200. A `payment_intent.succeeded` whose `amount_received` ≠ `orders.total_cents` does **not** mark the order paid (logged, 200).
- **AC9** The confirmation page never claims "paid" until the DB says so. While a card order is `pending` it says it is confirming and refreshes itself; after the poll window it says it is still confirming and the order is saved. `redirect_status` from a 3-D Secure return only changes wording, never state.
- **AC10** 3-D Secure works: a challenge card completes and lands on the confirmation page (in-page modal, or full redirect via `return_url` with the confirmation token intact).
- **AC11** With **no** Stripe env vars, `/checkout` renders 7 methods (no `card` radio), `placeOrderAction` rejects `paymentMethod: "card"` with a field error, and every existing test still passes. No user-visible error, no console error.
- **AC12** Copy is honest everywhere: card instructions, checkout footer line, confirmation notice, `ConfirmationSummary`, security badges, privacy and terms. Nothing says "there is no card form"; nothing promises an email; manual methods' copy is unchanged.
- **AC13** Env: a half-configured Stripe (1 or 2 of the 3 vars) fails at boot naming the missing variable; mixed test/live keys fail; `sk_live_*` outside `VERCEL_ENV=production` fails.
- **AC14** `pnpm lint`, `pnpm typecheck`, `pnpm vitest run --project unit` and the `db` project all pass; `pnpm build` succeeds; `pnpm db:generate` produces no new migration.

---

## 2. Payment flow decision — **(a) order first, then PaymentIntent, paid by webhook**

**Chosen: (a).** Exact sequence:

| # | Where | What |
|---|---|---|
| 1 | client | Our Zod validation (`checkoutInputSchema`) — unchanged. |
| 2 | client | `elements.submit()` — validates the card fields **before** anything is written. A bad card number creates no order. |
| 3 | client → server | `placeOrderAction(payload)` (existing shape, unchanged). |
| 4 | server | `orderService.createOrder` — the existing single transaction: re-price, claim coupon, claim inventory with guarded updates, insert order + items, newsletter opt-in. Now also writes `checkoutMeta.paymentProvider`. |
| 5 | server | **After commit** (never inside the transaction — a network call would hold a Neon-pooler/PGlite transaction open): `paymentService.createIntentForOrder(orderId)` reads the committed row, creates the PI with `amount = total_cents`, idempotency key `order:<orderId>:pi:v1`, then a guarded `update ... set stripe_payment_intent_id = $pi where id = $orderId and stripe_payment_intent_id is null`. |
| 6 | server → client | `ok({ orderNumber, confirmationPath, payment: { clientSecret, paymentIntentId, amountCents } })`. `payment` is `null` for every manual method (today's exact payload shape plus one nullable key). |
| 7 | client | Mark `placed`, `clear()` the cart, `elements.update({ amount: payment.amountCents })`, `stripe.confirmPayment({ elements, clientSecret, confirmParams: { return_url }, redirect: "if_required" })`. |
| 8 | client | `succeeded`/`processing` → `router.replace(confirmationPath)`. Redirect-required → Stripe navigates. Error → stay, show message, retry (step 2 + 7 only). |
| 9 | Stripe → server | `POST /api/webhooks/stripe` → `payment_status = paid`. Authoritative. |
| 10 | server | Confirmation page renders from the DB; polls briefly while still `pending`. |

**Why not (b) PaymentIntent first?**
1. **Money before stock.** Inventory is claimed at order creation (`claimInventory`, guarded `inventory >= qty`). Charging first means charging for stock we then discover is gone → refunds as the normal failure mode. Worst possible outcome for a shop with one owner and no admin UI.
2. **Two pricing passes, two chances to disagree.** The amount charged would be computed before `createOrder` re-prices inside its transaction; the charge could differ from the stored order. With (a) the amount is read from the committed row — impossible to diverge.
3. **The order would have to be built inside the webhook** from PI `metadata`, which means round-tripping billing + shipping addresses, notes, line items and the coupon through Stripe metadata (500 chars/key) or a new staging table — a new table, a new code path and a new failure mode, for no gain.
4. **Abandoned payments leave no trace.** This shop's model is a person following up. With (a) an abandoned card payment is still a `pending` order the owner can call about — the same thing they already do for the 7 manual methods. With (b) it is invisible.
5. **Double-submit is already handled** by (a): `pending` disables the button, the client keeps the created order in state, and the Stripe idempotency key plus reuse of the stored `stripe_payment_intent_id` make a second attempt a no-op.

**Accepted cost of (a):** unpaid card orders hold stock (pre-existing R6) and `orders` accumulates `pending` rows for abandoned card attempts — indistinguishable from today's manual orders, so no new operational burden.

**On "a card failure must not lose the customer's cart":** the cart is cleared at step 7 — deliberately, and it is strictly *better* than keeping it. Once the order row exists, keeping the cart is a duplicate-order hazard: a reload after a decline would let the customer place a second order and claim stock twice. Instead the **persisted order supersedes the cart**: retry re-confirms the same PaymentIntent (no re-entry of anything), and the decline alert always shows "Your order `BSC-100xxx` is saved — view your order" pointing at the tokenised confirmation path. Nothing the customer typed is ever lost. `placed` (already in `checkout-form.tsx`) must stay `true` through the decline path, or the existing empty-cart effect (`checkout-form.tsx:218-221`) would bounce them to `/cart` mid-retry.

---

## 3. Packages

Install: `pnpm add stripe @stripe/stripe-js @stripe/react-stripe-js`

**Verify before installing** (no network writes):
```
pnpm view stripe version
pnpm view @stripe/stripe-js version
pnpm view @stripe/react-stripe-js version peerDependencies
```
Installed context: `react@19.2.8`, `react-dom@19.2.8`, `next@16.3.5`, `reactCompiler: true`, `typescript@^5`.

**Decision rule for the React wrapper:** `@stripe/react-stripe-js` added React 19 to its `peerDependencies` in v3 (the v2 line is `react@^16.8 || ^17 || ^18` only). If `pnpm view @stripe/react-stripe-js peerDependencies` shows `19` in the range → install the current major and proceed. If it does **not**, or if pnpm reports a peer conflict, **do not use `--force`**: take the fallback.

**Resolved in T1 (2026-09-24):** `pnpm view` reported `stripe@22.6.2`, `@stripe/stripe-js@9.17.0`, `@stripe/react-stripe-js@6.12.0` with `peerDependencies: { react: ">=16.8.0 <20.0.0", react-dom: ">=16.8.0 <20.0.0", "@stripe/stripe-js": ">=9.16.0 <10.0.0" }` — React 19 is in range, so the wrapper is installed (pnpm resolved `6.11.0`) with **no peer warning and no `--force`**. The fallback below is therefore **not** taken; T4 uses `Elements` + `PaymentElement` as preferred.

**Fallback (no React wrapper):** use `@stripe/stripe-js` only — `loadStripe`, `stripe.elements({ mode, amount, currency, paymentMethodTypes, appearance })`, `elements.create("payment")`, `.mount(node)` against a ref in an effect, `elements.submit()`, `stripe.confirmPayment(...)`, `element.destroy()` on unmount. This is why all Stripe interaction is confined to **one** file behind the `CardPaymentApi` contract (§7): the fallback changes that file's internals only, and its tests and the rest of the app are untouched.

Notes: `stripe` (Node SDK) is server-only — it must never be imported from a `"use client"` file or from `site-config.ts`. Route handlers default to the Node runtime in Next 16, so `stripe.webhooks.constructEvent` (sync, node `crypto`) is fine; `constructEventAsync` is only needed on Edge. Pin `apiVersion` explicitly in `getStripe()` so an SDK bump can't silently change event shapes. React Compiler note: the Elements `options` object is derived from props/state and the compiler will memoize it — do not add manual `useMemo`, but do not build it inline inside JSX in a way that defeats memoization either.

---

## 4. Env and config gating

### `src/lib/env.ts` (+ `.env.example`, + `src/lib/env.test.ts`)
Add three optional vars, using the **names confirmed from `vercel env ls`**:
- `STRIPE_SECRET_KEY` — `optionalString`, must match `/^(sk|rk)_(test|live)_/`.
- `STRIPE_PUBLISHABLE_KEY` — `optionalString`, must match `/^pk_(test|live)_/`. (If the integration injects it as `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, use that name here; it is still read server-side.)
- `STRIPE_WEBHOOK_SECRET` — `optionalString`, must match `/^whsec_/`.

Add to the existing `.superRefine`:
- **All-or-nothing:** if any of the three is set, all three are required; the issue path names each missing one (so a half-configured deploy fails at boot via `src/instrumentation.ts`, not at checkout).
- **Mode match:** the `test`/`live` segment of the secret and publishable keys must be equal (catches `pk_live` + `sk_test`).
- **No live keys outside production:** a `sk_live_`/`pk_live_` pair is an error unless `VERCEL_ENV === "production"`. This is the R2 guard.

A single derived helper, `stripeConfigured(env)` → `boolean`, lives beside them.

### Publishable key delivery — **prop, not `NEXT_PUBLIC_`**
`src/app/(checkout)/checkout/page.tsx` is a Server Component. It reads `getServerEnv().STRIPE_PUBLISHABLE_KEY` and passes `stripePublishableKey: string | null` into `CheckoutForm`. Benefits: works with whatever name the integration chose, no `NEXT_PUBLIC_` duplicate to keep in sync, no key baked into the client bundle for pages that don't need it. (Publishable keys are public by design; this is about naming and blast radius, not secrecy.)

### `src/lib/payment-methods.ts` — provider marking
`PaymentMethodPreset`/`PaymentMethodConfig` gain `provider: PaymentProvider` where `type PaymentProvider = "manual" | "stripe"`. `card` gets `provider: "stripe"`; the other seven get `"manual"`. Add `export function paymentProviderFor(id, methods): PaymentProvider`. `siteConfig.checkout.paymentMethods` spreads the presets as it already does, so nothing about `enabled`/`logo` changes and **`siteConfig` never reads env** (it is imported by client components).

### Availability filter (the R1/R2 escape hatch)
`CheckoutForm` receives `stripePublishableKey`. It renders `PAYMENT_METHODS.filter(m => m.provider !== "stripe" || stripePublishableKey !== null)`, and picks the first *available* method as the default (today it is `PAYMENT_METHODS[0]?.id`, which is `zelle`, so the default is unaffected). Server side, `placeOrderAction` throws `ValidationError("Card payments are unavailable right now. Please choose another method.", { paymentMethod: [...] })` when the method's provider is `stripe` and `stripeConfigured()` is false. **Turning card payments off is therefore an env change, not a code change** — exactly what we need if Stripe rejects the account.

### `src/types/order.ts`
`CheckoutMeta` gains `paymentProvider?: PaymentProvider` (optional → orders predating this read as `manual`, same pattern as `OrderAddress.company`). jsonb, no SQL.

---

## 5. Server pieces

### `src/lib/payments/stripe-client.ts` (new, `import "server-only"`)
`getStripe(): Stripe` — memoized on `globalThis` like `src/lib/db/client.ts` does, so dev HMR reuses one client. Constructed from `getServerEnv().STRIPE_SECRET_KEY` with a pinned `apiVersion`, `appInfo: { name: "botanics-supply-co" }`, `maxNetworkRetries: 2`, `timeout: 10_000`. Throws a clear `Error` if the key is absent — callers are always behind `stripeConfigured()`.

### `src/lib/payments/payment-intent.ts` (new, pure — no I/O, no `server-only`)
- `buildPaymentIntentParams({ orderId, orderNumber, totalCents }) → Stripe.PaymentIntentCreateParams`:
  `{ amount: totalCents, currency: "usd", payment_method_types: ["card"], description: \`Order ${orderNumber}\`, metadata: { orderId, orderNumber } }`.
  **Card only** (not `automatic_payment_methods`) so the PaymentElement can't surface wallets or redirect methods that would collide with the manual Apple Pay / PayPal options. **No PII in metadata** — no email, no address; Stripe's own guidance, and it keeps the customer's data in one place.
- `paymentIntentIdempotencyKey(orderId) → \`order:${orderId}:pi:v1\`` — stable per order, so a retried action can never create a second PI.
- `MIN_CHARGE_CENTS = 50` (Stripe's USD minimum) — used by the client to decide whether the card fields can mount.
Currency is `"usd"`: all prices are USD cents and `formatMoney` (`src/lib/money.ts`) defaults to `"USD"`.

### `src/services/payment.service.ts` (new — factory pattern, matching `order.service.ts`)
`createPaymentService({ getDb, stripe })` so tests inject both; `export const paymentService` binds `getDb` and `getStripe`.

- **`createIntentForOrder(orderId): Promise<{ clientSecret, paymentIntentId, amountCents }>`**
  1. `select id, order_number, total_cents, payment_status, stripe_payment_intent_id from orders where id = $orderId` — **the amount comes from here, never from the caller.**
  2. If `stripe_payment_intent_id` is already set → `stripe.paymentIntents.retrieve(id)` and return its `client_secret` (double-submit and reload-retry both land here). Log a warning if its `amount` ≠ `total_cents` (should be impossible; order totals are immutable).
  3. Otherwise `stripe.paymentIntents.create(buildPaymentIntentParams(...), { idempotencyKey: paymentIntentIdempotencyKey(orderId) })`, then guarded `update orders set stripe_payment_intent_id = $pi, updated_at = now() where id = $orderId and stripe_payment_intent_id is null returning id`. Zero rows → a concurrent call won the race: re-read the row and return *that* PI's secret (log it).
  4. Never log the client secret.
- **`markPaid({ paymentIntentId, amountReceivedCents })`** → `update orders set payment_status = 'paid', status = case when status = 'pending' then 'paid' else status end, updated_at = now() where stripe_payment_intent_id = $pi and payment_status <> 'paid' and total_cents = $amountReceivedCents returning id, order_number`. Returns a discriminated result: `{ kind: "updated", orderNumber }` | `{ kind: "already-paid" }` | `{ kind: "amount-mismatch", expectedCents, receivedCents }` | `{ kind: "unknown-intent" }` (distinguish the last three with one follow-up select on the failure path only). The amount predicate is the guard that a tampered or partial amount can never mark an order paid.
- **`markFailed({ paymentIntentId })`** → `... set payment_status = 'failed' where stripe_payment_intent_id = $pi and payment_status = 'pending' returning id`. Never downgrades `paid`/`refunded`.
- **`markRefunded({ paymentIntentId })`** → `... set payment_status = 'refunded', status = 'refunded' where stripe_payment_intent_id = $pi and payment_status = 'paid' returning id`.

Every one of these is a **single guarded UPDATE**, which is what makes webhook replay a no-op without a new table.

### `src/app/(checkout)/checkout/actions.ts` (modified)
`placeOrderAction`'s result type becomes `{ orderNumber: string; confirmationPath: string; payment: OrderPaymentHandoff | null }` where `OrderPaymentHandoff = { clientSecret: string; paymentIntentId: string; amountCents: number }`.

- Compute `provider = paymentProviderFor(parsed.data.paymentMethod, siteConfig.checkout.paymentMethods)`.
- `provider === "stripe" && !stripeConfigured()` → `ValidationError` on `paymentMethod` (AC11) **before** any write.
- `createOrder` as today.
- `provider === "manual"` → `ok({ orderNumber, confirmationPath, payment: null })` — byte-identical behaviour to today plus one `null`.
- `provider === "stripe"` → `try { payment = await paymentService.createIntentForOrder(orderId) } catch (error) { logUnexpectedError(error, "checkout.placeOrderAction:createIntent"); payment = null }`. **The action still returns `ok`.** The order exists and inventory is claimed; failing the action would strand the customer and tempt them into a duplicate order. With `payment: null` the client navigates to the confirmation page, which shows the honest "we couldn't start the card payment — we'll contact you" state (order is `pending`). Explicit, logged, no silent catch.
- `orderService.createOrder` needs `createOrderResult.orderId` (already returned) and must write `checkoutMeta.paymentProvider` — that is the only change to `order.service.ts`.

---

## 6. Webhook

### `src/app/api/webhooks/stripe/route.ts` (new)
```
export async function POST(request: NextRequest): Promise<Response>
```
Exact behaviour, in order:
1. `const secret = getServerEnv().STRIPE_WEBHOOK_SECRET`; missing → log and return **503** (never 200 — a silent 200 would hide a misconfigured deploy while Stripe marks events delivered).
2. `const signature = request.headers.get("stripe-signature")`; null → **400**.
3. **Raw body in Next 16:** `const raw = await request.text()`. That is the whole story — Route Handlers hand you the untouched `Request`; there is no `bodyParser` to disable (that was `pages/api`) and no `export const config`. **Never call `request.json()`** — re-serialising changes bytes and breaks the HMAC. There is no `middleware.ts` in this repo (verified), so nothing can rewrite the body upstream; if one is ever added it must skip `/api/webhooks/**`. `runtime = "nodejs"` is the default; declaring it is optional. No `dynamic`/`revalidate` needed — POST handlers are never cached.
4. `stripe.webhooks.constructEvent(raw, signature, secret)` inside `try/catch`; on throw → log (message only, never the body or the secret) and **400** (Stripe does not retry a 400, which is correct for a bad signature).
5. `const command = interpretStripeEvent(event)` (below). `null` → `Response.json({ received: true, handled: false })` **200**. Returning non-2xx for events we don't care about would make Stripe retry them for a day.
6. Apply the command through `paymentService`, log the discriminated outcome (`updated` / `already-paid` / `amount-mismatch` / `unknown-intent`) with the order number and event id. `amount-mismatch` is a `console.error` — it means someone tampered or an order total changed, and the owner needs to know.
7. **200** on success. Any unexpected throw → `logUnexpectedError` + **500**, so Stripe retries with its own backoff.

### `src/lib/payments/stripe-webhook.ts` (new, pure)
`interpretStripeEvent(event: Stripe.Event): WebhookCommand | null` — keeps the route to ~25 lines and makes the interesting logic trivially testable.
```
type WebhookCommand =
  | { kind: "paid"; paymentIntentId: string; amountReceivedCents: number }
  | { kind: "failed"; paymentIntentId: string; reason: string | null }
  | { kind: "refunded"; paymentIntentId: string };
```
- `payment_intent.succeeded` → `paid` with `amount_received`.
- `payment_intent.payment_failed` → `failed` with `last_payment_error?.code ?? null` (a code, not a customer message).
- `charge.refunded` → `refunded` **only when `charge.amount_refunded === charge.amount`** (this event also fires for partial refunds); a partial refund returns `null` and is logged — partial-refund state is out of MVP scope.
- Anything else, or a missing/non-string `payment_intent` id → `null`.
- Narrow via `event.type` switch on the typed `Stripe.Event` union. **No `as any`.**

### Idempotency
State transitions do the work: every update is `where stripe_payment_intent_id = $pi and payment_status <op> ...`, so a second delivery matches zero rows → "already handled" → 200, nothing written. This holds whether the duplicate arrives before or after the browser reaches the confirmation page, and whether `succeeded` arrives before or after `payment_failed` (a `failed` can never overwrite `paid`). A `stripe_events` dedupe table is **not** needed for these three events; add it when handling events that are not idempotent by state (nice-to-have).

### Inventory and coupons on failure — deliberately untouched
- **No restock.** A failed payment is retryable; restocking would let another customer take the item while this one is still on the 3-D Secure screen. A `failed` order is not a cancelled order, and restock-on-cancel is already the pre-existing named follow-up (checkout spec §6/R6).
- **No coupon decrement.** `claimDiscount` increments `uses` inside the order transaction; reversing it on a payment failure would let the same coupon be used twice by retrying. The coupon is spent because an order exists.
Both decisions belong in a code comment on the webhook handler so nobody "fixes" them later by accident.

---

## 7. Client UI

### `src/components/checkout/card-payment-fields.tsx` (new, `"use client"`) — the only file that touches Stripe.js
Props: `{ publishableKey: string; amountCents: number; onApiReady: (api: CardPaymentApi | null) => void; disabled?: boolean }`.
Contract (identical for the React-wrapper and the raw-Stripe.js implementations, so R6's fallback is a local change):
```
interface CardPaymentApi {
  validate(): Promise<{ error?: string }>;                      // elements.submit()
  confirm(args: { clientSecret: string; amountCents: number; returnUrl: string }):
    Promise<
      | { status: "succeeded" | "processing" | "redirecting" }
      | { error: string }
    >;
}
```
Structure: module-level `loadStripe` memo keyed by publishable key (`Map<string, Promise<Stripe | null>>`) so switching radios never reloads the script; `<Elements stripe={promise} options={{ mode: "payment", amount, currency: "usd", paymentMethodTypes: ["card"], appearance: STRIPE_APPEARANCE }}>` wrapping an inner component that calls `useStripe()`/`useElements()`, renders `<PaymentElement options={{ layout: "tab" | "accordion", wallets: { applePay: "never", googlePay: "never" }, fields: { billingDetails: "never" } }} />` and publishes the api via `onApiReady` (cleanup: `onApiReady(null)`).
- `wallets: never` because Apple Pay is already offered as a separate **manual** method — two Apple Pay paths would be dishonest (see open question 5).
- `billingDetails: "never"` because our form already collects name and address; pass them in `confirmParams.payment_method_data.billing_details` from `CheckoutForm` state instead of asking twice. (If Stripe requires a field we don't send, fall back to `billingDetails: "auto"` and accept the duplicate postal code.)
- `loadStripe` resolving `null` → render the R7 message and call `onApiReady(null)`; `CheckoutForm` then treats card as unusable and says so rather than letting the customer press a dead button.
- `confirm` maps Stripe results: `paymentIntent.status === "succeeded" | "processing"` → that status; `requires_action` with a redirect in flight → `"redirecting"`; `error.type === "card_error" | "validation_error"` → `{ error: error.message }` (customer-safe by design); any other error type → `{ error: "We couldn't process that card. Please try again or choose another method." }` **plus** `console.error` of the real error. No silent catch.

### `src/lib/payments/stripe-appearance.ts` (new, client-safe)
`STRIPE_APPEARANCE: Appearance` mapping our navy/orange tokens. Elements render **inside Stripe-hosted iframes and cannot read our CSS custom properties**, so these hexes are a deliberate mirror of `src/app/globals.css` and must be kept in step — say so in a comment, and unit-test the object so a token change that isn't mirrored is at least visible in a diff.
- `theme: "stripe"`, `variables`: `colorPrimary: "#f26a1b"` (`--color-accent`), `colorBackground: "#ffffff"` (`--color-surface`), `colorText: "#12163a"` (`--color-ink`), `colorTextSecondary: "#4b5070"` (`--color-ink-muted`), `colorDanger: "#b3261e"` (`--color-danger`), `borderRadius: "10px"` (`--radius-input`), `fontSizeBase: "16px"`, `spacingUnit: "4px"`.
- `rules`: `.Input` → `border: 1px solid #dde0ea` (`--color-line`); `.Input:focus` → `outline: 2px solid #f26a1b; outline-offset: 2px` (matches the global `:focus-visible` rule); `.Input--invalid` → danger border; `.Label` → `color: #4b5070; font-size: 14px` (`--text-sm`).
- `fontFamily: "ui-sans-serif, system-ui, sans-serif"`. Figtree comes from `next/font` and is not reachable inside the iframe; loading it via `fonts: [{ cssSrc }]` is a nice-to-have.

### `src/components/checkout/payment-method-radios.tsx` (modified)
Add one optional prop: `slot?: (method: PaymentMethodConfig) => ReactNode`, rendered **inside the selected `<li>`, directly under the instructions `<p>`**. The component stays presentational and imports nothing from Stripe; every existing test keeps passing. `CheckoutForm` passes a slot that returns `<CardPaymentFields>` only for `method.provider === "stripe"`.
- Accessibility: the card fields live inside the selected radio's `<li>` and after the `<p id="...-instructions">` already referenced by `aria-describedby`, so a screen reader hears the method, then how it works, then reaches the fields. Mounting on selection means the iframes are created/destroyed as the radio changes — correct (card data must not survive switching to Bitcoin). Hidden-but-mounted card fields are rejected as an a11y and trust hazard.

### `src/components/checkout/checkout-form.tsx` (modified)
New prop `stripePublishableKey: string | null`. New state `placedOrder: { orderNumber; confirmationPath; payment: OrderPaymentHandoff | null } | null` and `cardApi: CardPaymentApi | null`.
- Methods list filtered as in §4; default method = first available.
- The card slot mounts only when: the method is selected **and** `stripePublishableKey !== null` **and** `quoteStatus === "ready"` **and** `quote.totals.totalCents >= MIN_CHARGE_CENTS`. Before that, render a small "Preparing secure card fields…" line in the same `text-sm text-ink-muted` style (the summary already shows a skeleton until the first quote).
- `amountCents={quote.totals.totalCents}` — changing order type or coupon re-quotes and flows into the Elements `amount` automatically.
- `canSubmit` additionally requires, when card is selected, `cardApi !== null`.

**Submit sequence** (replacing `handleSubmit`; manual methods keep today's exact path):
1. `preventDefault()`, clear `formError`.
2. `checkoutInputSchema.safeParse` → existing `firstErrors` / `SUMMARY_MESSAGE` behaviour.
3. If card: `const v = await cardApi.validate()`; `v.error` → set `formError` (and `errors.paymentMethod`) and **stop — nothing is written**.
4. `setPending(true)`. If `placedOrder === null` → `placeOrderAction(payload)`; `!ok` → existing `fromFieldErrors` path, `setPending(false)`, cart untouched. On ok → `setPlacedOrder(result.data)`, `setPlaced(true)`, `clear()`. If `placedOrder !== null` (retry after a decline) → **skip this step entirely**; never a second order.
5. `payment === null` (manual method, or the PI-creation failure path) → `router.replace(confirmationPath)`. Done.
6. Card: `elements.update({ amount: payment.amountCents })` (inside `CardPaymentApi.confirm`), then `confirm({ clientSecret, amountCents, returnUrl: new URL(confirmationPath, window.location.origin).toString() })` with `redirect: "if_required"` — so only true redirect flows leave the page, and when they do they come back to the confirmation URL **with the `?t=` token intact**.
7. `succeeded` / `processing` → `router.replace(confirmationPath)`. `redirecting` → do nothing, keep `pending` true (Stripe is navigating). `{ error }` → `setPending(false)`, render the message in the existing `role="alert"` block **plus** the recovery line: "Your order **BSC-100xxx** is saved. <Link to confirmationPath>View your order</Link>." Button stays enabled: pressing it again re-runs 3 and 6 only.
- If Stripe returns an amount-mismatch error (R6): call `validate()` again and re-`confirm()` once with the stored `payment.amountCents`; if it fails again, show the generic message plus the saved-order link. **Never create a second order.**
- Footer line (`checkout-form.tsx:485-488`) becomes method-aware: card → "Your card is charged when you place this order. Everything else happens by phone afterwards."; manual → today's sentence verbatim.

---

## 8. Confirmation page

`src/app/(checkout)/checkout/confirmation/[orderNumber]/page.tsx` (modified):
- `provider = order.checkoutMeta?.paymentProvider ?? "manual"` (old orders read as manual).
- Read `searchParams.redirect_status` through a validator against `["succeeded", "processing", "failed", "requires_payment_method"]` → `RedirectStatus | null`. It is untrusted user input: it **only** picks wording, never state. Same single-value guard as the existing `readToken` helper.
- `confirming = provider === "stripe" && order.paymentStatus === "pending"`.

`src/components/checkout/payment-status-notice.tsx` (modified) — props become `{ status, provider, redirectStatus }`. Variants:
- **manual, any status** → exactly today's four notices, unchanged.
- **stripe + paid** → "Payment received" / "Your card payment of $X went through. There's nothing else to do — we're getting your order ready." (no email promise unless `receipt_email` is turned on).
- **stripe + pending**, `redirectStatus` `succeeded`/`processing`/absent → "We're confirming your payment" / "Your bank has approved it and we're waiting for the confirmation to reach us. This page updates itself." + `PaymentStatusPoller`.
- **stripe + pending**, `redirectStatus` `failed`/`requires_payment_method` → "Your payment didn't go through" / "We have no record of a completed payment, so nothing has been charged. Call or text {phone} and we'll sort it out." (honest: the DB still says pending.)
- **stripe + failed** → today's failed copy, plus the phone/email contact line.
- **stripe + refunded** → today's refunded copy.
- Footer line replaces the current unconditional "We never collect card numbers, CVV codes or bank credentials on this site" (`payment-status-notice.tsx:66`): stripe → "Your card details were typed into Stripe's own fields and sent straight to Stripe. We never see or store your card number."; manual → today's line.

`src/components/checkout/payment-status-poller.tsx` (new, `"use client"`): props `{ status: OrderPaymentStatus }`. Effect calls `router.refresh()` at 1s, 2s, 4s, 8s (four tries, ~15s) and stops as soon as `status !== "pending"` (the prop changes when the RSC re-renders) or the attempts run out. `router.refresh()` rather than a new endpoint: it re-renders the Server Component with the token already in the URL, so there is no new surface to authorise. Renders an `aria-live="polite"` "Checking with your bank…" line, and when exhausted: "Still confirming. Your order is saved — we'll be in touch if anything went wrong." Mount with `key={status}` so the timers reset cleanly.

`src/components/checkout/confirmation-summary.tsx` (modified): the block at lines 147-160 prints the method's instructions whenever `paymentStatus === "pending"`. For `provider === "stripe"` **suppress the instructions** (they describe the checkout page — "Pay by card now" on a confirmation page is nonsense) and keep the "Payment: Pay With Card" heading. `PaymentStatusNotice` carries the status copy. Manual methods unchanged.

"What happens next" (page lines 124-130): for a paid card order say "We're getting your order ready. We'll be in touch on the phone number or email below if we need anything."; never "to arrange payment".

---

## 9. Copy and legal

**`src/lib/payment-methods.ts` — `card.instructions` (new):**
> "Pay by card now. Enter your card details below and they go straight to Stripe, our payment processor — we never see or store your card number or security code. You'll know right away whether the payment went through. Questions? Call or text {phone}."

Constraints this satisfies (existing tests): keeps the `{phone}` placeholder and no literal number (`payment-methods.test.ts:30`); contains none of "payment received", "payment successful", "paid in full", "buyer protection", "protected", "refund guarantee" (`:38`); avoids the literal "cvv" (`:55`). The test at `:52` ("No card details are ever entered") **must be rewritten** to assert "go straight to Stripe" and "never see or store". Also fix the file's header comment (lines 1-13), which currently states no payment is ever taken on this site.

**`src/lib/site-config.ts`:** keep the badge "We never see or store card details" — still true with Elements. Add a fourth: `{ id: "stripe-card", label: "Card payments processed by Stripe" }`, and update `site-config.test.ts:83-104` (which asserts the exact three labels, and forbids "visa"/"mastercard"/"verified" — "Stripe" is a processor, not a card-network mark, so the badge stays honest and no `logo` is added).

**`src/content/site-content.ts`** — privacy "Payment details" (lines 190-194) rewritten to:
> "If you pay by card, the card fields at checkout are hosted by Stripe, our payment processor. Your card number, expiry date and security code go straight from your browser to Stripe. They never reach our servers and we never store them. All we keep is Stripe's reference for the payment and whether it succeeded."
> "For every other payment method we collect nothing: a person contacts you afterwards to arrange payment, and nothing you tell them then is stored on the site. We never ask for bank logins or wallet credentials anywhere."
> "Stripe handles your card data under its own privacy policy (stripe.com/privacy). Because the card fields are Stripe's and card data never touches our systems, we are in PCI DSS scope SAQ A."

Terms "Orders and payment" (line 236-239): add "Card payments are taken at checkout by Stripe. All other payment methods are arranged with you after you place the order."

**Other copy sites:** `checkout-form.tsx:485-488` (method-aware, §7), `payment-status-notice.tsx:23 & 66` (§8), `confirmation-summary.tsx` (§8), `order.service.ts:10-12` header comment ("No payment is taken anywhere on this site" is no longer true — reword to "payment, when taken, is taken by Stripe after this transaction commits"). `confirmation-summary.test.tsx:154` asserts the "No payment is taken on this site." string and must be updated for the stripe case.

**PCI position, stated for the record:** Stripe Elements means card data is entered into Stripe-hosted iframes on a page we serve over HTTPS; it is never in our DOM, our logs, our request bodies or our database. That keeps the merchant in **SAQ A**, the lightest self-assessment. Anything that would break SAQ A — proxying card data, building our own card inputs, using Stripe's raw `paymentMethods.create` from our server — is out of bounds.

---

## 10. Tests

New/changed test files (all colocated, per the global rules):

**Unit project (`pnpm vitest run --project unit`)**
- `src/lib/payments/payment-intent.test.ts` — amount equals the order total exactly; `currency: "usd"`; `payment_method_types: ["card"]`; metadata contains `orderId` + `orderNumber` and **no** email/address/phone key; `description` contains the order number; idempotency key stable across two calls for one order and different across orders.
- `src/lib/payments/stripe-webhook.test.ts` — `payment_intent.succeeded` → `{ kind: "paid", amountReceivedCents }`; `payment_intent.payment_failed` → `failed` with the error **code** (never a customer message); full `charge.refunded` → `refunded`; **partial** `charge.refunded` → `null`; unknown event type → `null`; missing/non-string `payment_intent` → `null`.
- `src/lib/payments/stripe-appearance.test.ts` — the hexes equal the documented `globals.css` tokens (`#f26a1b`, `#12163a`, `#4b5070`, `#dde0ea`, `#b3261e`) and `borderRadius` is `10px`.
- `src/app/api/webhooks/stripe/route.test.ts` (`// @vitest-environment node`) — **sign real payloads with `stripe.webhooks.generateTestHeaderString({ payload, secret })`** and let the real `constructEvent` run (no network, genuine verification): valid signature → 200 and the matching `paymentService` method called once with the PI id and amount; tampered payload / wrong secret / missing `stripe-signature` → 400 **and no `paymentService` call**; unknown event type → 200 with `handled: false` and no call; missing `STRIPE_WEBHOOK_SECRET` → 503; `paymentService` throwing → 500 (so Stripe retries). Mock: `vi.mock("@/services/payment.service", ...)` for the ports; set `process.env.STRIPE_*` at the top of the file like `order.service.test.ts` does for `BETTER_AUTH_SECRET`.
- `src/lib/env.test.ts` (extended) — full test-mode trio parses; **only** `STRIPE_SECRET_KEY` set → throws naming the other two; `pk_live` + `sk_test` → throws; `sk_live` with `VERCEL_ENV=preview` → throws; `sk_live` + `pk_live` with `VERCEL_ENV=production` → parses; bad prefixes rejected; **no test ever echoes a key value** (the existing suite's rule).
- `src/lib/payment-methods.test.ts` (extended) — `card.provider === "stripe"`, all others `"manual"`; the new card copy assertions (§9); `paymentProviderFor` returns `"manual"` for an id missing from the config.
- `src/components/checkout/card-payment-fields.test.tsx` — **mock exactly**: `vi.mock("@stripe/stripe-js", () => ({ loadStripe: vi.fn(async () => ({})) }))` and `vi.mock("@stripe/react-stripe-js", () => ({ Elements: ({ children }) => children, PaymentElement: () => <div data-testid="stripe-card-fields" />, useStripe: () => stripeMock, useElements: () => elementsMock }))` with `elementsMock = { submit: vi.fn(), update: vi.fn() }` and `stripeMock = { confirmPayment: vi.fn() }`. Cases: `submit()` error → `validate()` returns that message and `confirmPayment` is never called; `confirmPayment` → `{ paymentIntent: { status: "succeeded" } }` → `{ status: "succeeded" }`; `{ error: { type: "card_error", message: "Your card was declined." } }` → that exact message; `{ error: { type: "api_error", message: "<internal>" } }` → the generic message and the real one logged, **not rendered**; `loadStripe` resolving `null` → the unavailable message and `onApiReady(null)`.
- `src/components/checkout/checkout-form.test.tsx` (extended, same mocks) — card fields appear only when the card radio is selected; switching to another method unmounts them; `stripePublishableKey={null}` → **no card radio at all** and all existing tests unchanged; submit order of operations is `elements.submit()` → `placeOrderAction` → `confirmPayment(clientSecret)`; a decline shows the message, does **not** navigate, does **not** clear-and-redirect to `/cart`, and a second click calls `placeOrderAction` **exactly once** in total while calling `confirmPayment` twice; success navigates to `confirmationPath`; `payment: null` from the action navigates straight to the confirmation page.
- `src/components/checkout/payment-method-radios.test.tsx` (extended) — the `slot` renders only under the selected method and only for `provider === "stripe"`.
- `src/components/checkout/payment-status-notice.test.tsx` (extended) — all `provider × status × redirectStatus` combinations: no manual copy changed; no stripe+pending variant says "paid"; no variant promises an email; the footer line differs by provider.
- `src/components/checkout/payment-status-poller.test.tsx` — refreshes on a schedule with `vi.useFakeTimers()`; stops when `status` changes; stops after the last attempt and shows the "still confirming" line.
- `src/app/(checkout)/checkout/actions.test.ts` (extended; already mocks `getSession` and `orderService`) — add `vi.mock("@/services/payment.service")`: manual method → `payment: null` and the payment service untouched; card with Stripe configured → `createIntentForOrder(orderId)` called and its handoff returned; card with Stripe **unconfigured** → `ValidationError` on `paymentMethod` and `createOrder` **never called**; `createIntentForOrder` throwing → result is still `ok` with `payment: null` and the error logged.

**DB project (Docker, one file at a time)** — `src/services/payment.service.test.ts` (matches the existing `src/services/**/*.test.ts` glob, so it lands in the `db` project automatically; copy the `order.service.test.ts` harness: `createTestDb({ seed: seedCatalogWithReviews })`, `createPaymentService({ getDb: async () => testDb.db, stripe: fakeStripe })`). `fakeStripe = { paymentIntents: { create: vi.fn(), retrieve: vi.fn() } }` — **never the real SDK**, no network.
- `createIntentForOrder`: `create` receives `amount === order.total_cents` and the expected idempotency key; `stripe_payment_intent_id` is persisted; a second call `retrieve`s and does **not** `create`; a concurrent claim (pre-set the column) returns the stored PI's secret.
- `markPaid`: `pending → paid` and `status pending → paid`; second call → `already-paid`, row byte-identical; wrong amount → `amount-mismatch` and the row untouched; unknown PI → `unknown-intent`.
- `markFailed`: `pending → failed`; called on a `paid` order → no change (never downgrades).
- `markRefunded`: `paid → refunded` with `status = refunded`; on a `pending` order → no change.
- Inventory and `discount_codes.uses` are **unchanged** by every failure path (the §6 decision, asserted).
- `stripe_payment_intent_id` uniqueness: two orders cannot hold the same PI id.

---

## 11. Ops: env, local testing, Stripe Dashboard

**What the user must do** (in order; steps 1-3 unblock T2's manual verification):
1. **Accept the Vercel Marketplace terms for Stripe in the browser**, then re-run `vercel integration add stripe` in the `captain-jobs-projects` scope. (This is the current blocker: `integration_terms_acceptance_required`.)
2. `vercel env ls` → confirm the injected names, and which environments they landed in (`vercel env ls production`, `... preview`). Report the exact names so `src/lib/env.ts` matches.
3. **Stripe Dashboard, test mode:** Settings → Payment methods → leave **Card** on, turn **Link** and wallets **off** (otherwise the PaymentElement shows a Link email field and Apple/Google Pay that collide with our manual methods). Confirm the account's business description and product categories match the catalog.
4. **Restricted-business application for CBD/hemp** (Support → "sell CBD/hemp"). Until written approval: **no live keys anywhere.** Note explicitly that hemp pre-rolls, hemp flower and smoking accessories are commonly refused (R1).
5. **Production webhook (after approval):** Developers → Webhooks → Add endpoint `https://<prod-domain>/api/webhooks/stripe`, events `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`. Copy the signing secret → `vercel env add STRIPE_WEBHOOK_SECRET production`. Preview deployments get their own endpoint or rely on `stripe listen`.
6. Optional: statement descriptor (open question 2), Radar defaults (Stripe's are fine).

**Local testing without a public URL** — the Stripe CLI is the whole answer:
```
stripe login
stripe listen --forward-to localhost:3100/api/webhooks/stripe     # prints whsec_... -> STRIPE_WEBHOOK_SECRET in .env.local
pnpm dev -- -p 3100                                                # never port 3000
stripe trigger payment_intent.succeeded                            # shape smoke test only
```
Real end-to-end: place an order through `/checkout` with test cards — success `4242 4242 4242 4242`, 3-D Secure challenge `4000 0027 6000 3184`, generic decline `4000 0000 0000 0002`, insufficient funds `4000 0000 0000 9995` (any future expiry, any CVC, any ZIP). Remember R9: the local DB is in-memory PGlite, so the order and its webhook must happen in the same `pnpm dev` run.

`.env.example` gains the three names (names only, no values — that file's own rule):
```
# Stripe (card payments). Injected by the Vercel Marketplace integration;
# STRIPE_WEBHOOK_SECRET comes from `stripe listen` locally and the Dashboard in production.
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
```

---

## 12. Tasks

Verification commands, once, for reference: `pnpm lint` · `pnpm typecheck` · `pnpm vitest run --project unit` · `pnpm build` · db project: `docker run --rm -p 5433:5432 -e POSTGRES_PASSWORD=postgres postgres:17-alpine` then `TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5433/postgres pnpm vitest run --project db <one file>` (one file at a time — RAM) · dev server `pnpm dev -- -p 3100` (never 3000) · `pnpm db:generate` must produce nothing new.

### T1 — Packages, env, provider marking, copy (no UI, no Stripe calls)
Files: `package.json`, `pnpm-lock.yaml`, `src/lib/env.ts` + `.test.ts`, `.env.example`, `src/lib/payment-methods.ts` + `.test.ts`, `src/lib/site-config.ts` + `.test.ts`, `src/types/order.ts`, `src/lib/payments/payment-intent.ts` + `.test.ts`, `src/lib/payments/stripe-appearance.ts` + `.test.ts`, `src/content/site-content.ts`, `src/lib/public-images.test.ts` (if the badge change touches it).
Approach: run the three `pnpm view` checks and record the decision on the React wrapper in the commit body; install; add the three env vars with the format/all-or-nothing/mode/live-key refinements; add `provider` to the presets and `paymentProviderFor`; rewrite the card, privacy and terms copy; add the pure PI-params and appearance modules.
Acceptance: AC13; AC12 for the non-UI copy; `provider` present on all 8 methods.
Verify: `pnpm lint && pnpm typecheck && pnpm vitest run --project unit`; `pnpm db:generate` produces no SQL; `rg -n "no card form|No card details are ever entered" src/` returns nothing.

### T2 — Server: Stripe client, payment service, action wiring
Files: `src/lib/payments/stripe-client.ts`, `src/services/payment.service.ts` + `.test.ts`, `src/app/(checkout)/checkout/actions.ts` + `.test.ts`, `src/services/order.service.ts` (write `checkoutMeta.paymentProvider`; fix the header comment).
Approach: memoized `getStripe()` with a pinned `apiVersion`; `createIntentForOrder` reads the amount from the order row, reuses an existing PI, and stores the id with a guarded update; `markPaid/markFailed/markRefunded` as single guarded updates returning discriminated results; `placeOrderAction` gains the provider gate and the post-commit PI creation with the `payment: null` fallback.
Acceptance: AC3, AC4, AC11; the PI-creation network call is provably outside the DB transaction.
Verify: unit project; `TEST_DATABASE_URL=... pnpm vitest run --project db src/services/payment.service.test.ts`; then `pnpm vitest run --project db src/services/order.service.test.ts` (unchanged behaviour). Grep the diff to confirm no `stripe` import inside any `"use client"` file.

### T3 — Webhook
Files: `src/app/api/webhooks/stripe/route.ts` + `.test.ts`, `src/lib/payments/stripe-webhook.ts` + `.test.ts`.
Approach: raw body via `await request.text()`, `constructEvent` with the signature header, pure `interpretStripeEvent`, apply via `paymentService`, status codes exactly as §6 (400 bad signature, 503 unconfigured, 200 handled/ignored, 500 our failure). Comment the deliberate no-restock / no-coupon-reversal decision.
Acceptance: AC6, AC7, AC8.
Verify: unit project (real signatures via `generateTestHeaderString`); `pnpm build`; with `stripe listen` running, `stripe trigger payment_intent.succeeded` returns 200 in the CLI and logs `unknown-intent` (no matching order) — proving verification and the guarded update both work.

### T4 — Client UI
Files: `src/components/checkout/card-payment-fields.tsx` + `.test.tsx`, `src/components/checkout/payment-method-radios.tsx` + `.test.tsx`, `src/components/checkout/checkout-form.tsx` + `.test.tsx`, `src/app/(checkout)/checkout/page.tsx`.
Approach: the page reads the publishable key and passes it down; the radios gain the `slot` prop; `CheckoutForm` gains the `placedOrder`/`cardApi` state and the submit sequence of §7. Either `PaymentElement` in deferred mode (preferred) or `CardElement` + `confirmCardPayment` (approved fallback) — as long as the `CardPaymentApi` contract and its tests hold.
Acceptance: AC1, AC2, AC4, AC5, AC10, AC11, AC12 (checkout copy).
Verify: unit project. Manual on `pnpm dev -- -p 3100` with `stripe listen` running: card fields appear only on the card radio and visually match our inputs (accent focus ring, 10px radius, 14px labels); `4242…` → confirmation page; `4000 0027 6000 3184` → 3-D Secure completes → confirmation page; `4000 0000 0000 0002` → declined message + saved-order link, retry works, DevTools Network shows **one** `placeOrderAction` call and no second order in the DB; keyboard-only through the radio group into the card fields and out; with `STRIPE_*` removed from `.env.local` and the server restarted, 7 methods render and nothing errors.

### T5 — Confirmation page, poller, summary
Files: `src/app/(checkout)/checkout/confirmation/[orderNumber]/page.tsx`, `src/components/checkout/payment-status-notice.tsx` + `.test.tsx`, `src/components/checkout/payment-status-poller.tsx` + `.test.tsx`, `src/components/checkout/confirmation-summary.tsx` + `.test.tsx`.
Approach: provider-aware notice, validated `redirect_status` for wording only, the refresh poller, suppress stripe instructions in the summary, provider-aware "what happens next".
Acceptance: AC9, AC12.
Verify: unit project. Manual: stop `stripe listen`, place a card order → the page says it is confirming and never "paid"; start `stripe listen` and resend the event → the page flips to "Payment received" without a manual reload; with `stripe listen` already running the paid state appears within a poll or two; then confirm a **manual** order's confirmation page is byte-identical to before (screenshot diff or read-through); strip `?t=` → 404; wrong order number → 404; `?redirect_status=paid-lol` → falls back to the neutral confirming copy.

**Suggested commit (one focused commit per task, or squashed):**
`feat: take card payments with Stripe Elements at checkout`

---

## 13. Scope

**MVP = T1–T5.** Card number/expiry/CVC inline, direct to Stripe, one PaymentIntent per order, webhook-owned payment status, honest copy everywhere, all 7 manual methods untouched, and a no-code off switch if Stripe says no.

**Nice-to-haves (explicitly out):** `receipt_email` / Stripe receipts; a `notifyPaymentReceived` owner email; a `stripe_events` dedupe table; retrying a failed card **from the confirmation page** (needs a fresh client secret via a token-gated action); Apple/Google Pay through Stripe (requires retiring the manual `apple-pay` method first); partial refunds and a refund UI; restock-on-cancel (pre-existing follow-up); Figtree inside the Elements iframe; rate limiting `placeOrderAction`; saved cards / `setup_future_usage`; Stripe Tax.

---

## Key file reference (absolute paths)
- Spec this builds on: `/home/cpt/dev/main/Haven-Ways/weed-website/docs/superpowers/specs/2026-09-23-checkout-design.md`
- Client island to extend: `/home/cpt/dev/main/Haven-Ways/weed-website/src/components/checkout/checkout-form.tsx`
- Radios (gain `slot`): `/home/cpt/dev/main/Haven-Ways/weed-website/src/components/checkout/payment-method-radios.tsx`
- Method config + copy: `/home/cpt/dev/main/Haven-Ways/weed-website/src/lib/payment-methods.ts`, `/home/cpt/dev/main/Haven-Ways/weed-website/src/lib/site-config.ts`
- Actions: `/home/cpt/dev/main/Haven-Ways/weed-website/src/app/(checkout)/checkout/actions.ts`
- Order service (single transaction): `/home/cpt/dev/main/Haven-Ways/weed-website/src/services/order.service.ts`
- Orders schema (`stripe_payment_intent_id` line 45, `checkout_meta` line 48): `/home/cpt/dev/main/Haven-Ways/weed-website/src/lib/db/schema/orders.ts`
- Env (boot-validated by `src/instrumentation.ts`): `/home/cpt/dev/main/Haven-Ways/weed-website/src/lib/env.ts`
- Confirmation page + notice + summary: `/home/cpt/dev/main/Haven-Ways/weed-website/src/app/(checkout)/checkout/confirmation/[orderNumber]/page.tsx`, `/home/cpt/dev/main/Haven-Ways/weed-website/src/components/checkout/payment-status-notice.tsx`, `/home/cpt/dev/main/Haven-Ways/weed-website/src/components/checkout/confirmation-summary.tsx`
- Privacy/terms copy: `/home/cpt/dev/main/Haven-Ways/weed-website/src/content/site-content.ts` (privacy "Payment details" at lines 190-194)
- Design tokens to mirror into the Stripe appearance: `/home/cpt/dev/main/Haven-Ways/weed-website/src/app/globals.css` (lines 5-49)
- Route-handler precedent: `/home/cpt/dev/main/Haven-Ways/weed-website/src/app/api/products/route.ts`
- Test harness for the db project: `/home/cpt/dev/main/Haven-Ways/weed-website/src/test/db.ts`, `/home/cpt/dev/main/Haven-Ways/weed-website/vitest.config.mts`
