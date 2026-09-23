/**
 * Ten deterministic demo orders (`BSC-100001` to `BSC-100010`). Prices,
 * names, SKUs and images are snapshotted from the seed catalog when the
 * seed runs, so only product slugs and variant keys live here.
 */
import type { OrderAddress } from "@/types/order";
import { WELCOME_CODE } from "./marketing";
import { DEMO_EMAIL_DOMAIN, type CustomerHandle } from "./people";

export type SeedOrderStatus =
  | "pending"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export interface SeedGuest {
  email: string;
  address: OrderAddress;
}

export interface SeedOrderItemSpec {
  product: string;
  /** Variant key (`var_<slug>-<key>`); defaults to the default variant. */
  variant?: string;
  quantity: number;
}

export interface SeedOrderSpec {
  /** Numeric part of the order number: `BSC-<number>`. */
  number: number;
  customer: CustomerHandle | SeedGuest;
  status: SeedOrderStatus;
  createdAt: string;
  items: readonly SeedOrderItemSpec[];
  discountCode?: string;
  notes?: string;
}

export const ORDER_NUMBER_PREFIX = "BSC-";

const guest1: SeedGuest = {
  email: `guest1@${DEMO_EMAIL_DOMAIN}`,
  address: {
    fullName: "Jordan Ellis",
    line1: "560 Birch Court",
    line2: null,
    city: "Boise",
    state: "ID",
    postalCode: "83702",
    country: "US",
    phone: null,
  },
};

const guest2: SeedGuest = {
  email: `guest2@${DEMO_EMAIL_DOMAIN}`,
  address: {
    fullName: "Sam Whitaker",
    line1: "88 Canal Street",
    line2: "Floor 2",
    city: "Minneapolis",
    state: "MN",
    postalCode: "55401",
    country: "US",
    phone: "(555) 010-2202",
  },
};

export const orderSpecs: readonly SeedOrderSpec[] = [
  {
    number: 100001,
    customer: "ada",
    status: "delivered",
    createdAt: "2026-07-02T18:14:00.000Z",
    items: [
      { product: "calm-full-spectrum-oil", variant: "1000", quantity: 1 },
      { product: "mixed-berry-gummies", quantity: 1 },
    ],
    discountCode: WELCOME_CODE,
  },
  {
    number: 100002,
    customer: "ben",
    status: "delivered",
    createdAt: "2026-07-09T08:41:00.000Z",
    items: [{ product: "cooling-muscle-balm", quantity: 1 }],
  },
  {
    number: 100003,
    customer: guest1,
    status: "refunded",
    createdAt: "2026-07-18T13:02:00.000Z",
    items: [
      { product: "four-piece-grinder", quantity: 1 },
      {
        product: "unbleached-papers-and-cones",
        variant: "cones-6",
        quantity: 2,
      },
    ],
    notes: "Refunded: parcel lost in transit.",
  },
  {
    number: 100004,
    customer: "cara",
    status: "shipped",
    createdAt: "2026-08-04T20:27:00.000Z",
    items: [
      { product: "broad-spectrum-softgels", variant: "60", quantity: 1 },
      { product: "chamomile-evening-tea", quantity: 1 },
    ],
  },
  {
    number: 100005,
    customer: "dev",
    status: "cancelled",
    createdAt: "2026-08-11T10:55:00.000Z",
    items: [
      { product: "dark-chocolate-squares", variant: "15-24", quantity: 1 },
    ],
  },
  {
    number: 100006,
    customer: "ada",
    status: "shipped",
    createdAt: "2026-08-22T16:38:00.000Z",
    items: [
      { product: "evening-gummies", quantity: 2 },
      { product: "lip-balm-duo", quantity: 1 },
    ],
  },
  {
    number: 100007,
    customer: "ben",
    status: "processing",
    createdAt: "2026-09-02T09:12:00.000Z",
    items: [
      { product: "mint-isolate-tincture", quantity: 1 },
      { product: "peppermint-day-tea", quantity: 1 },
      { product: "honey-sticks", quantity: 1 },
    ],
  },
  {
    number: 100008,
    customer: guest2,
    status: "paid",
    createdAt: "2026-09-08T19:46:00.000Z",
    items: [
      { product: "smell-proof-glass-jar", variant: "250", quantity: 1 },
      { product: "bamboo-rolling-tray", variant: "large", quantity: 1 },
      { product: "ceramic-ashtray", quantity: 1 },
    ],
  },
  {
    number: 100009,
    customer: "cara",
    status: "paid",
    createdAt: "2026-09-12T12:03:00.000Z",
    items: [
      { product: "citrus-full-spectrum-oil", variant: "2000", quantity: 1 },
    ],
  },
  {
    number: 100010,
    customer: "dev",
    status: "pending",
    createdAt: "2026-09-15T07:21:00.000Z",
    items: [
      { product: "warming-body-cream", quantity: 1 },
      { product: "bath-soak", quantity: 2 },
    ],
  },
];
