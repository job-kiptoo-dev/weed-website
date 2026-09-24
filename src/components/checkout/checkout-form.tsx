"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useState,
  useSyncExternalStore,
  type FormEvent,
  type ReactNode,
} from "react";
import type { z } from "zod";
import {
  placeOrderAction,
  quoteOrderAction,
} from "@/app/(checkout)/checkout/actions";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/hooks/use-cart";
import { useDebounce } from "@/hooks/use-debounce";
import type { FieldErrors } from "@/lib/errors";
import {
  enabledPaymentMethods,
  PAYMENT_METHOD_IDS,
  type PaymentMethodConfig,
  type PaymentMethodId,
} from "@/lib/payment-methods";
import { siteConfig } from "@/lib/site-config";
import {
  checkoutInputSchema,
  type CheckoutLineInput,
} from "@/lib/validation/checkout.schema";
import type { OrderQuote, OrderType } from "@/types/order";
import {
  ADDRESS_FIELDS,
  BillingDetailsForm,
  EMPTY_ADDRESS_VALUES,
  type AddressPrefix,
  type CheckoutAddressErrors,
  type CheckoutAddressField,
  type CheckoutAddressValues,
} from "./billing-details-form";
import { CouponForm } from "./coupon-form";
import {
  isBlockingIssue,
  OrderSummary,
  type QuoteStatus,
} from "./order-summary";
import { OrderTypeRadios } from "./order-type-radios";
import { PaymentMethodRadios } from "./payment-method-radios";
import { PlaceOrderButton } from "./place-order-button";
import { ShippingAddressToggle } from "./shipping-address-toggle";

/** Prefill for a signed-in customer; null for a guest checking out. */
export interface CheckoutCustomer {
  name: string;
  email: string;
}

interface CheckoutFormProps {
  customer: CheckoutCustomer | null;
  /**
   * Stripe's publishable key, read from the server env by the page and passed
   * down rather than baked into the bundle as `NEXT_PUBLIC_*`. Null means this
   * environment has no Stripe, so no card method is offered at all.
   */
  stripePublishableKey: string | null;
  /** Server-rendered trust panels, placed at the foot of the summary column. */
  aside?: ReactNode;
}

/** Re-pricing waits this long after the last change, so typing isn't chatty. */
const QUOTE_DEBOUNCE_MS = 250;

const SUMMARY_MESSAGE = "Please fix the highlighted fields.";
const QUOTE_FAILED_MESSAGE = "We couldn't price your order.";
const SUBMIT_FAILED_MESSAGE =
  "We couldn't place your order. Your cart is safe — please try again.";
const SHIPPING_FIELDSET_ID = "checkout-shipping-address";

const PAYMENT_METHODS = enabledPaymentMethods(
  siteConfig.checkout.paymentMethods,
);

/**
 * A method whose payment Stripe takes is only offered where Stripe is
 * configured; every manual method is always offered. The server applies the
 * same rule in `placeOrderAction`, so this is convenience, not security.
 */
function availablePaymentMethods(
  stripePublishableKey: string | null,
): PaymentMethodConfig[] {
  return PAYMENT_METHODS.filter(
    (method) => method.provider !== "stripe" || stripePublishableKey !== null,
  );
}

/** What the debounced quote effect sends; serialised so it compares by value. */
interface QuoteRequest {
  lines: CheckoutLineInput[];
  orderType: OrderType;
  discountCode: string | null;
}

/** The last successful quote, tagged with the request it answers. */
interface QuoteResult {
  key: string;
  quote: OrderQuote;
}

interface QuoteFailure {
  key: string;
  message: string;
}

type ErrorMap = Record<string, string>;

/**
 * False during the server render and the first client render, true after.
 * `useSyncExternalStore` rather than an effect: the cart lives in the
 * browser, so "no lines yet" must not be mistaken for "empty cart".
 */
function useHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

/** First message per dotted path (`billing.phone`), like the auth forms. */
function firstErrors(issues: readonly z.core.$ZodIssue[]): ErrorMap {
  const errors: ErrorMap = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join(".") || "form";
    errors[key] ??= issue.message;
  }
  return errors;
}

/** Server `fieldErrors` use the same keys, so they merge into the same state. */
function fromFieldErrors(fieldErrors: FieldErrors | undefined): ErrorMap {
  const errors: ErrorMap = {};
  for (const [key, messages] of Object.entries(fieldErrors ?? {})) {
    const first = messages[0];
    if (first !== undefined) errors[key] = first;
  }
  return errors;
}

function addressErrors(errors: ErrorMap, prefix: AddressPrefix) {
  const result: CheckoutAddressErrors = {};
  for (const field of ADDRESS_FIELDS) {
    const message = errors[`${prefix}.${field}`];
    if (message !== undefined) result[field] = message;
  }
  return result;
}

/** "Ada Byron Lovelace" → first "Ada", last "Byron Lovelace". */
function splitName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return { firstName: name.trim(), lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function toAddressInput(values: CheckoutAddressValues) {
  return {
    firstName: values.firstName,
    lastName: values.lastName,
    company: values.company,
    // The select offers exactly one option and the shop ships US-only; the
    // schema pins this to "US" server-side too.
    country: "US" as const,
    line1: values.line1,
    line2: values.line2,
    city: values.city,
    state: values.state,
    postalCode: values.postalCode,
    phone: values.phone,
  };
}

/**
 * The one client island of the checkout. It owns the cart, the form values,
 * the order type, the payment method, the coupon and every error, and it
 * computes no money: `quoteOrderAction` prices the cart on the server and
 * this component only renders what comes back.
 */
export function CheckoutForm({
  customer,
  stripePublishableKey,
  aside,
}: CheckoutFormProps) {
  const router = useRouter();
  const { lines: cartLines, clear } = useCart();

  const paymentMethods = availablePaymentMethods(stripePublishableKey);

  const [billing, setBilling] = useState<CheckoutAddressValues>(() => ({
    ...EMPTY_ADDRESS_VALUES,
    ...(customer ? splitName(customer.name) : null),
  }));
  const [shipping, setShipping] =
    useState<CheckoutAddressValues>(EMPTY_ADDRESS_VALUES);
  const [shipElsewhere, setShipElsewhere] = useState(false);
  const [email, setEmail] = useState(customer?.email ?? "");
  const [notes, setNotes] = useState("");
  const [orderType, setOrderType] = useState<OrderType>("delivery");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId>(
    () => paymentMethods[0]?.id ?? PAYMENT_METHOD_IDS[0],
  );
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [appliedCode, setAppliedCode] = useState<string | null>(null);

  const [errors, setErrors] = useState<ErrorMap>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Both carry the request they answer, so the status can be derived rather
  // than set from inside the effect (which would cascade renders).
  const [quoteResult, setQuoteResult] = useState<QuoteResult | null>(null);
  const [quoteFailure, setQuoteFailure] = useState<QuoteFailure | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  // The cart only exists in the browser, so nothing about it is known until
  // after hydration: an empty cart before that is not an empty cart.
  const hydrated = useHydrated();
  const [placed, setPlaced] = useState(false);

  const quoteKey = JSON.stringify({
    lines: cartLines.map((line) => ({
      productId: line.productId,
      variantId: line.variantId,
      quantity: line.quantity,
    })),
    orderType,
    discountCode: appliedCode,
  } satisfies QuoteRequest);
  const debouncedKey = useDebounce(quoteKey, QUOTE_DEBOUNCE_MS);

  useEffect(() => {
    if (!hydrated || placed) return;
    if (cartLines.length === 0) router.replace("/cart");
  }, [hydrated, placed, cartLines.length, router]);

  useEffect(() => {
    if (!hydrated) return;
    const request = JSON.parse(debouncedKey) as QuoteRequest;
    if (request.lines.length === 0) return;

    let cancelled = false;
    quoteOrderAction(request)
      .then((result) => {
        if (cancelled) return;
        if (result.ok) {
          setQuoteResult({ key: debouncedKey, quote: result.data });
          setQuoteFailure(null);
          return;
        }
        setQuoteFailure({ key: debouncedKey, message: result.error.message });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.error("Checkout: pricing request failed", error);
        setQuoteFailure({ key: debouncedKey, message: QUOTE_FAILED_MESSAGE });
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedKey, hydrated, retryToken]);

  function clearError(key: string) {
    setErrors((prev) => {
      if (prev[key] === undefined) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function updateAddress(
    prefix: AddressPrefix,
    field: CheckoutAddressField,
    value: string,
  ) {
    const setValues = prefix === "billing" ? setBilling : setShipping;
    setValues((prev) => ({ ...prev, [field]: value }));
    clearError(`${prefix}.${field}`);
  }

  function buildPayload(): z.input<typeof checkoutInputSchema> {
    return {
      billing: toAddressInput(billing),
      shipping: shipElsewhere ? toAddressInput(shipping) : null,
      email,
      notes,
      orderType,
      paymentMethod,
      marketingOptIn,
      discountCode: appliedCode,
      lines: cartLines.map((line) => ({
        productId: line.productId,
        variantId: line.variantId,
        quantity: line.quantity,
      })),
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const payload = buildPayload();
    const parsed = checkoutInputSchema.safeParse(payload);
    if (!parsed.success) {
      setErrors(firstErrors(parsed.error.issues));
      setFormError(SUMMARY_MESSAGE);
      return;
    }

    setErrors({});
    setPending(true);
    let result;
    try {
      result = await placeOrderAction(payload);
    } catch (error) {
      console.error("Checkout: placing the order failed", error);
      setFormError(SUBMIT_FAILED_MESSAGE);
      setPending(false);
      return;
    }

    if (!result.ok) {
      // Server validation uses the same keys, so messages land on the same
      // fields. The cart is untouched: the customer can fix and retry.
      setErrors(fromFieldErrors(result.error.fieldErrors));
      setFormError(result.error.message);
      setPending(false);
      return;
    }

    // Only now is the cart safe to empty: the order row exists.
    setPlaced(true);
    clear();
    router.replace(result.data.confirmationPath);
  }

  // The quote on screen is whatever came back last; it is only "ready" when
  // it answers the request the cart, order type and coupon currently describe.
  const quote = quoteResult?.quote ?? null;
  const quoteError =
    quoteFailure?.key === debouncedKey ? quoteFailure.message : null;
  const quoteStatus: QuoteStatus = quoteError
    ? "error"
    : quoteResult?.key === debouncedKey
      ? "ready"
      : "loading";

  const couponIssue = quote?.issues.find(
    (issue) => issue.kind === "invalid_coupon",
  );
  const hasBlockingIssue = quote?.issues.some(isBlockingIssue) ?? false;
  const cartError = Object.entries(errors).find(([key]) =>
    key.startsWith("lines"),
  )?.[1];
  const canSubmit =
    hydrated &&
    !pending &&
    !hasBlockingIssue &&
    quoteStatus !== "error" &&
    quote !== null &&
    quote.lines.length > 0;

  const alertClass =
    "rounded-card border border-danger/40 bg-danger/5 px-4 py-3 text-sm text-danger";

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]"
    >
      <div className="flex flex-col gap-6">
        <section
          aria-labelledby="checkout-billing-heading"
          className="flex flex-col gap-5 rounded-card border border-line bg-surface p-5 sm:p-6"
        >
          <h2 id="checkout-billing-heading" className="text-2xl">
            Billing details
          </h2>
          {formError ? (
            <p role="alert" className={alertClass}>
              {formError}
            </p>
          ) : null}
          <BillingDetailsForm
            prefix="billing"
            values={billing}
            errors={addressErrors(errors, "billing")}
            disabled={pending}
            onChange={(field, value) => updateAddress("billing", field, value)}
          />
          <Input
            id="checkout-email"
            label="Email address"
            type="email"
            autoComplete="email"
            required
            disabled={pending}
            value={email}
            error={errors.email}
            onChange={(event) => {
              setEmail(event.target.value);
              clearError("email");
            }}
          />
          <div className="flex flex-col gap-5 border-t border-line pt-5">
            <ShippingAddressToggle
              checked={shipElsewhere}
              disabled={pending}
              controls={SHIPPING_FIELDSET_ID}
              onChange={setShipElsewhere}
            />
            {shipElsewhere ? (
              <fieldset
                id={SHIPPING_FIELDSET_ID}
                className="flex flex-col gap-5"
              >
                <legend className="text-lg">Delivery address</legend>
                <BillingDetailsForm
                  prefix="shipping"
                  values={shipping}
                  errors={addressErrors(errors, "shipping")}
                  disabled={pending}
                  onChange={(field, value) =>
                    updateAddress("shipping", field, value)
                  }
                />
              </fieldset>
            ) : null}
          </div>
          <Textarea
            id="checkout-notes"
            label="Order notes (optional)"
            hint="Notes about your order, e.g. special notes for delivery."
            disabled={pending}
            value={notes}
            error={errors.notes}
            onChange={(event) => {
              setNotes(event.target.value);
              clearError("notes");
            }}
          />
        </section>
        <CouponForm
          appliedCode={appliedCode}
          disabled={pending}
          error={
            couponIssue
              ? `Coupon ${couponIssue.label} couldn't be applied.`
              : undefined
          }
          onApply={(code) => setAppliedCode(code.toUpperCase())}
          onRemove={() => setAppliedCode(null)}
        />
      </div>

      <div className="flex flex-col gap-4">
        <OrderSummary
          quote={quote}
          status={quoteStatus}
          errorMessage={quoteError}
          onRetry={() => {
            setQuoteFailure(null);
            setRetryToken((token) => token + 1);
          }}
        >
          <OrderTypeRadios
            value={orderType}
            disabled={pending}
            onChange={setOrderType}
          />
        </OrderSummary>
        <PaymentMethodRadios
          methods={paymentMethods}
          value={paymentMethod}
          disabled={pending}
          error={errors.paymentMethod}
          onChange={(value) => {
            setPaymentMethod(value);
            clearError("paymentMethod");
          }}
        />
        <Checkbox
          id="checkout-marketing"
          label="I would like to receive exclusive emails with discounts and product information"
          checked={marketingOptIn}
          disabled={pending}
          onChange={(event) => setMarketingOptIn(event.target.checked)}
        />
        {cartError ? (
          <p role="alert" className={alertClass}>
            {cartError}
          </p>
        ) : null}
        <PlaceOrderButton disabled={!canSubmit} pending={pending} />
        <p className="text-sm text-ink-muted">
          Placing your order does not take payment. We contact you afterwards to
          arrange it.
        </p>
        {aside}
      </div>
    </form>
  );
}
