/**
 * Seed people: the admin and four demo customers, their addresses and
 * wishlists. No emails or passwords here; those come from `SeedAccounts`
 * (dev: `./dev-accounts`, Neon: `SEED_ADMIN_*` plus random passwords).
 */
import type { OrderAddress } from "@/types/order";

/** Demo customers seeded into Neon: `ada@botanicssupply.example`, … */
export const DEMO_EMAIL_DOMAIN = "botanicssupply.example";
/** Local development accounts: `admin@botanicssupply.test`, … */
export const DEV_EMAIL_DOMAIN = "botanicssupply.test";
/** Users on these domains are seed data; anyone else is a real user. */
export const SEED_EMAIL_DOMAINS = [DEMO_EMAIL_DOMAIN, DEV_EMAIL_DOMAIN];

export const ADMIN_USER_ID = "user_admin";
export const ADMIN_NAME = "Store Admin";

export const CUSTOMER_HANDLES = ["ada", "ben", "cara", "dev"] as const;
export type CustomerHandle = (typeof CUSTOMER_HANDLES)[number];

export interface CustomerProfile {
  id: string;
  handle: CustomerHandle;
  name: string;
  phone: string;
  address: OrderAddress;
  createdAt: string;
}

export const customerProfiles: readonly CustomerProfile[] = [
  {
    id: "user_customer_1",
    handle: "ada",
    name: "Ada Brooks",
    phone: "(555) 010-1101",
    address: {
      fullName: "Ada Brooks",
      line1: "418 Alder Street",
      line2: "Apt 3B",
      city: "Portland",
      state: "OR",
      postalCode: "97205",
      country: "US",
      phone: "(555) 010-1101",
    },
    createdAt: "2026-06-02T17:20:00.000Z",
  },
  {
    id: "user_customer_2",
    handle: "ben",
    name: "Ben Okafor",
    phone: "(555) 010-1102",
    address: {
      fullName: "Ben Okafor",
      line1: "72 Harbor View Road",
      line2: null,
      city: "Seattle",
      state: "WA",
      postalCode: "98121",
      country: "US",
      phone: "(555) 010-1102",
    },
    createdAt: "2026-06-11T09:45:00.000Z",
  },
  {
    id: "user_customer_3",
    handle: "cara",
    name: "Cara Lindqvist",
    phone: "(555) 010-1103",
    address: {
      fullName: "Cara Lindqvist",
      line1: "1905 Juniper Avenue",
      line2: null,
      city: "Denver",
      state: "CO",
      postalCode: "80206",
      country: "US",
      phone: "(555) 010-1103",
    },
    createdAt: "2026-06-19T21:05:00.000Z",
  },
  {
    id: "user_customer_4",
    handle: "dev",
    name: "Dev Raman",
    phone: "(555) 010-1104",
    address: {
      fullName: "Dev Raman",
      line1: "33 Orchard Lane",
      line2: "Unit 12",
      city: "Austin",
      state: "TX",
      postalCode: "78704",
      country: "US",
      phone: "(555) 010-1104",
    },
    createdAt: "2026-06-24T14:30:00.000Z",
  },
];

export const ADMIN_CREATED_AT = "2026-06-01T08:00:00.000Z";

export interface WishlistSpec {
  customer: CustomerHandle;
  product: string;
  createdAt: string;
}

export const wishlistSpecs: readonly WishlistSpec[] = [
  {
    customer: "ada",
    product: "evening-cbd-cbn-drops",
    createdAt: "2026-07-04T19:00:00.000Z",
  },
  {
    customer: "ada",
    product: "bath-soak",
    createdAt: "2026-08-12T20:15:00.000Z",
  },
  {
    customer: "ben",
    product: "broad-spectrum-softgels",
    createdAt: "2026-07-21T07:40:00.000Z",
  },
  {
    customer: "cara",
    product: "smell-proof-glass-jar",
    createdAt: "2026-08-03T16:25:00.000Z",
  },
  {
    customer: "dev",
    product: "dark-chocolate-squares",
    createdAt: "2026-09-01T12:10:00.000Z",
  },
];
