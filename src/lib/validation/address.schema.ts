import { z } from "zod";

/** USPS codes for the 50 states and DC (shipping is US-only). */
export const US_STATE_CODES = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "DC",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
] as const;

export type UsStateCode = (typeof US_STATE_CODES)[number];

/** `12345` or `12345-6789`. */
export const US_ZIP_PATTERN = /^\d{5}(?:-\d{4})?$/;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === "" ? null : value))
    .nullable()
    .optional();

export const addressSchema = z.object({
  label: optionalText(40),
  fullName: z
    .string()
    .trim()
    .min(2, { error: "Enter the recipient's full name." })
    .max(100),
  line1: z
    .string()
    .trim()
    .min(3, { error: "Enter a street address." })
    .max(120),
  line2: optionalText(120),
  city: z.string().trim().min(2, { error: "Enter a city." }).max(80),
  state: z
    .string()
    .trim()
    .toUpperCase()
    .pipe(z.enum(US_STATE_CODES, { error: "Choose a US state." })),
  postalCode: z
    .string()
    .trim()
    .regex(US_ZIP_PATTERN, { error: "Enter a 5-digit ZIP code." }),
  country: z.literal("US").default("US"),
  phone: optionalText(30),
  isDefaultShipping: z.boolean().default(false),
  isDefaultBilling: z.boolean().default(false),
});

export type AddressInput = z.infer<typeof addressSchema>;
