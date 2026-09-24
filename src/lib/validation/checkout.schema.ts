/**
 * Checkout input. The client validates with these schemas and the server
 * re-validates the same way; every money value is recomputed server-side from
 * the product rows, so nothing about price is accepted from the browser.
 */
import { z } from "zod";
import { ORDER_TYPES } from "@/lib/order-pricing";
import { PAYMENT_METHOD_IDS } from "@/lib/payment-methods";
import { siteConfig } from "@/lib/site-config";
import {
  US_STATE_CODES,
  US_ZIP_PATTERN,
} from "@/lib/validation/address.schema";

/** Blank optional fields become null, which is how the order snapshot stores them. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => (value == null || value === "" ? null : value));

const nameField = (label: string) =>
  z
    .string()
    .trim()
    .min(2, { error: `Enter your ${label}.` })
    .max(50);

/** Digits and the usual separators; we call or text this number, so it matters. */
export const CHECKOUT_PHONE_PATTERN = /^[\d\s().+-]+$/;

/** A US number has 10; a leading country code pushes it higher. */
const MIN_PHONE_DIGITS = 10;

const phoneField = z
  .string()
  .trim()
  .min(7, { error: "Enter a phone number we can reach you on." })
  .max(30)
  .regex(CHECKOUT_PHONE_PATTERN, {
    error: "Use digits, spaces, brackets, + or - only.",
  })
  .refine((value) => (value.match(/\d/g)?.length ?? 0) >= MIN_PHONE_DIGITS, {
    error: "Enter a 10-digit phone number, including the area code.",
  });

/**
 * Unlike `addressSchema`, the phone number is required: every payment method
 * needs a person to reach the customer after the order is placed.
 */
export const checkoutAddressSchema = z.object({
  firstName: nameField("first name"),
  lastName: nameField("last name"),
  company: optionalText(80),
  country: z.literal("US").default("US"),
  line1: z
    .string()
    .trim()
    .min(3, { error: "Enter a street address." })
    .max(120),
  line2: optionalText(120),
  city: z.string().trim().min(2, { error: "Enter a town or city." }).max(80),
  state: z
    .string()
    .trim()
    .toUpperCase()
    .pipe(z.enum(US_STATE_CODES, { error: "Choose a US state." })),
  postalCode: z
    .string()
    .trim()
    .regex(US_ZIP_PATTERN, { error: "Enter a 5-digit ZIP code." }),
  phone: phoneField,
});

export type CheckoutAddressInput = z.infer<typeof checkoutAddressSchema>;

/** Codes are stored uppercase (`discount_codes_code_upper_check`). */
const discountCodeField = z
  .string()
  .trim()
  .toUpperCase()
  .max(40)
  .nullish()
  .transform((value) => (value == null || value === "" ? null : value));

export const checkoutLineSchema = z.object({
  productId: z.string().trim().min(1),
  variantId: z
    .string()
    .trim()
    .min(1)
    .nullish()
    .transform((value) => value ?? null),
  quantity: z
    .number()
    .int()
    .min(1)
    .max(siteConfig.cart.maxQuantityPerLine, {
      error: `Up to ${siteConfig.cart.maxQuantityPerLine} per item.`,
    }),
});

export type CheckoutLineInput = z.infer<typeof checkoutLineSchema>;

/** One order can't carry more lines than this; the server caps it again. */
export const MAX_CHECKOUT_LINES = 50;

export const checkoutInputSchema = z.object({
  billing: checkoutAddressSchema,
  /** Null when "Deliver to a different address?" is off. */
  shipping: checkoutAddressSchema.nullable().default(null),
  email: z.email({ error: "Enter a valid email address." }),
  notes: optionalText(1000),
  orderType: z.enum(ORDER_TYPES),
  paymentMethod: z.enum(PAYMENT_METHOD_IDS),
  marketingOptIn: z.boolean().default(false),
  discountCode: discountCodeField,
  lines: z
    .array(checkoutLineSchema)
    .min(1, { error: "Your cart is empty." })
    .max(MAX_CHECKOUT_LINES, { error: "Too many items in one order." }),
});

export type CheckoutInput = z.infer<typeof checkoutInputSchema>;
