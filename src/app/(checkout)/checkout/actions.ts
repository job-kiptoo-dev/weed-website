"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { handleActionError, ok, type ActionResult } from "@/lib/action-result";
import { getSession } from "@/lib/auth/guards";
import { stripeConfigured } from "@/lib/env";
import {
  RateLimitError,
  ValidationError,
  type FieldErrors,
} from "@/lib/errors";
import { effectivePaymentProvider } from "@/lib/payment-methods";
import {
  rateLimitKey,
  resolveClientIp,
  type RateLimitBudget,
} from "@/lib/rate-limit";
import { siteConfig } from "@/lib/site-config";
import { checkoutInputSchema } from "@/lib/validation/checkout.schema";
import { orderService } from "@/services/order.service";
import { rateLimitService } from "@/services/rate-limit.service";
import type { OrderQuote } from "@/types/order";

/**
 * Only the fields pricing needs, reusing the checkout rules rather than
 * restating them, so the quote and the order can never disagree about what a
 * valid line, order type or coupon code is.
 */
const quoteOrderSchema = checkoutInputSchema.pick({
  lines: true,
  orderType: true,
  discountCode: true,
});

/**
 * Zod issues → `FieldErrors`, keyed by the dotted path (`billing.postalCode`,
 * `lines.0.quantity`) the form uses for its input ids.
 */
function toFieldErrors(error: z.ZodError): FieldErrors {
  const fieldErrors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "form";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return fieldErrors;
}

const BUDGETS = siteConfig.checkout.rateLimits;

/**
 * Both actions below are open to guests by design, so the only thing
 * standing between a script and the catalog's stock, a coupon campaign's
 * uses or the owner's inbox is this limiter. Next's origin check stops a
 * cross-site browser request, not a direct one.
 */
async function clientIp(): Promise<string> {
  const headerList = await headers();
  return resolveClientIp(
    headerList.get("x-forwarded-for"),
    headerList.get("x-real-ip"),
  );
}

/**
 * Counts one attempt and stops here when the budget is spent. The customer
 * only ever sees the generic message; the key (hashed) and the count stay in
 * the server log.
 */
async function assertUnderBudget(
  key: string,
  budget: RateLimitBudget,
  context: string,
): Promise<void> {
  const decision = await rateLimitService.consume(key, budget);
  if (decision.ok) return;
  console.warn({
    event: "rate_limited",
    context,
    key,
    count: decision.count,
    limit: decision.limit,
    retryAfterMs: decision.retryAfterMs,
  });
  throw new RateLimitError();
}

/**
 * Budgets *distinct* coupon codes, not quotes carrying one: a customer
 * retrying a code this IP already had priced is never limited, while walking
 * the code space (a valid code is visible in the quote, an invalid one in its
 * issues) runs out after a handful of guesses. The marker and the counter
 * share the window length, so they roll over together.
 *
 * The marker is read first and only written once the counter has allowed the
 * code, never before: marking up front would make a code the budget *blocked*
 * free on its next try, because the early exit would then skip the counter
 * and price the cart. Anyone sending each guess twice would be held only by
 * the much larger per-IP quote budget, which is the guessing this one exists
 * to stop. The cost of this order is that two parallel first tries of one code
 * each spend a count, which is the guesser's problem and not the customer's.
 */
async function assertCouponUnderBudget(
  ip: string,
  code: string,
  context: string,
): Promise<void> {
  const budget = BUDGETS.quoteCouponCodesPerIp;
  const codeKey = rateLimitKey("checkout:quote:coupon-code", ip, code);
  if (await rateLimitService.seenInWindow(codeKey, budget.windowMs)) return;
  await assertUnderBudget(
    rateLimitKey("checkout:quote:coupon", ip),
    budget,
    context,
  );
  await rateLimitService.firstUseInWindow(codeKey, budget.windowMs);
}

function confirmationPath(orderNumber: string, token: string): string {
  const number = encodeURIComponent(orderNumber);
  return `/checkout/confirmation/${number}?t=${encodeURIComponent(token)}`;
}

/**
 * Prices the cart. The browser sends what it holds and renders what comes
 * back; it never computes money itself, and nothing is written here.
 */
export async function quoteOrderAction(
  input: z.input<typeof quoteOrderSchema>,
): Promise<ActionResult<OrderQuote>> {
  try {
    const parsed = quoteOrderSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(
        "We couldn't price your cart.",
        toFieldErrors(parsed.error),
      );
    }

    // After validation, so a malformed request can't spend the budget.
    const context = "checkout.quoteOrderAction";
    const ip = await clientIp();
    await assertUnderBudget(
      rateLimitKey("checkout:quote:ip", ip),
      BUDGETS.quotePerIp,
      context,
    );
    const code = parsed.data.discountCode;
    if (code != null) await assertCouponUnderBudget(ip, code, context);

    const quote = await orderService.priceOrder(parsed.data.lines, {
      orderType: parsed.data.orderType,
      discountCode: parsed.data.discountCode,
    });
    return ok(quote);
  } catch (error) {
    return handleActionError(error, "checkout.quoteOrderAction");
  }
}

/**
 * Creates the order and hands back where to send the customer. No payment is
 * taken; `createOrder` re-prices inside its transaction, so the totals stored
 * are the server's own.
 */
export async function placeOrderAction(
  input: z.input<typeof checkoutInputSchema>,
): Promise<ActionResult<{ orderNumber: string; confirmationPath: string }>> {
  try {
    const parsed = checkoutInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(undefined, toFieldErrors(parsed.error));
    }

    // What the payment method *does* here is decided by the server's own
    // configuration, never by the browser: every method is offered, and the
    // Stripe-backed one degrades to a manual arrangement wherever Stripe is
    // unconfigured. That is the off switch if Stripe declines the account —
    // an env change, not a code change.
    const stripeIsConfigured = stripeConfigured();
    const provider = effectivePaymentProvider(
      parsed.data.paymentMethod,
      siteConfig.checkout.paymentMethods,
      stripeIsConfigured,
    );
    // Unreachable while `effectivePaymentProvider` derives `stripe` from the
    // same flag; kept as the last gate in front of `createOrder`, so that a
    // future path resolving `stripe` some other way (a per-method override, a
    // Stripe-only express button) still cannot store an order as card-paid
    // with no Stripe behind it.
    if (provider === "stripe" && !stripeIsConfigured) {
      const message =
        "Card payments are unavailable right now. Please choose another method.";
      throw new ValidationError(message, { paymentMethod: [message] });
    }

    // Counted per IP and per email address, and only for requests that
    // passed the schema: a customer fixing form errors spends nothing, while
    // every attempt that could reach `createOrder` (and so claim stock, a
    // coupon use and an owner notification) spends one. Attempts rather than
    // commits, because the counter is incremented in one statement and a
    // read-then-write check would let a parallel burst through.
    const context = "checkout.placeOrderAction";
    const ip = await clientIp();
    await assertUnderBudget(
      rateLimitKey("checkout:place:ip", ip),
      BUDGETS.placeOrderPerIp,
      context,
    );
    await assertUnderBudget(
      rateLimitKey("checkout:place:email", parsed.data.email.toLowerCase()),
      BUDGETS.placeOrderPerEmail,
      context,
    );

    // Ownership comes from the session only. A `userId` taken from the payload
    // would let anyone attach an order to someone else's account.
    const session = await getSession();
    const { orderNumber, token } = await orderService.createOrder({
      ...parsed.data,
      userId: session?.user.id ?? null,
      // Stored on the order: how this payment was actually handled, not how
      // the config would like to handle it one day.
      paymentProvider: provider,
    });

    return ok({
      orderNumber,
      confirmationPath: confirmationPath(orderNumber, token),
    });
  } catch (error) {
    return handleActionError(error, "checkout.placeOrderAction");
  }
}
