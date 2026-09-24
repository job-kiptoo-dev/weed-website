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

/**
 * Display names for the state select. Keyed by `UsStateCode`, so TypeScript
 * rejects a missing or unknown code: the list and `US_STATE_CODES` can't drift.
 */
const US_STATE_NAMES: Record<UsStateCode, string> = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  DC: "District of Columbia",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
};

/** `US_STATE_CODES` in the same order, paired with their display names. */
export const US_STATES: readonly { code: UsStateCode; name: string }[] =
  US_STATE_CODES.map((code) => ({ code, name: US_STATE_NAMES[code] }));

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
