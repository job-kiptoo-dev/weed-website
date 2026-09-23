/** Seed discount codes, newsletter subscribers and contact messages. */
import { DEMO_EMAIL_DOMAIN } from "./people";

export interface DiscountCodeSpec {
  id: string;
  code: string;
  type: "percent" | "fixed";
  /** Percent (1-100) or cents, depending on `type`. */
  value: number;
  minSubtotalCents: number;
  maxUses: number | null;
  expiresAt: string | null;
  createdAt: string;
}

export const WELCOME_CODE = "WELCOME10";

export const discountCodeSpecs: readonly DiscountCodeSpec[] = [
  {
    id: "disc_welcome10",
    code: WELCOME_CODE,
    type: "percent",
    value: 10,
    minSubtotalCents: 0,
    maxUses: null,
    expiresAt: null,
    createdAt: "2026-06-01T08:00:00.000Z",
  },
  {
    id: "disc_save5",
    code: "SAVE5",
    type: "fixed",
    value: 500,
    minSubtotalCents: 4000,
    maxUses: 100,
    expiresAt: "2027-12-31T23:59:59.000Z",
    createdAt: "2026-06-01T08:00:00.000Z",
  },
];

export interface NewsletterSubscriberSpec {
  id: string;
  email: string;
  createdAt: string;
}

export const newsletterSubscriberSpecs: readonly NewsletterSubscriberSpec[] = [
  {
    id: "news_1",
    email: `ada@${DEMO_EMAIL_DOMAIN}`,
    createdAt: "2026-06-02T17:25:00.000Z",
  },
  {
    id: "news_2",
    email: `reader1@${DEMO_EMAIL_DOMAIN}`,
    createdAt: "2026-07-14T10:00:00.000Z",
  },
  {
    id: "news_3",
    email: `reader2@${DEMO_EMAIL_DOMAIN}`,
    createdAt: "2026-08-29T18:30:00.000Z",
  },
];

export interface ContactMessageSpec {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
  handledAt: string | null;
}

export const contactMessageSpecs: readonly ContactMessageSpec[] = [
  {
    id: "msg_1",
    name: "Priya S.",
    email: `priya@${DEMO_EMAIL_DOMAIN}`,
    subject: "Lab report",
    message:
      "Could you send the certificate of analysis for the full-spectrum oil, batch 2041?",
    createdAt: "2026-08-18T15:12:00.000Z",
    handledAt: "2026-08-19T09:30:00.000Z",
  },
  {
    id: "msg_2",
    name: "Marcus T.",
    email: `marcus@${DEMO_EMAIL_DOMAIN}`,
    subject: "Wholesale",
    message:
      "Do you offer wholesale pricing for a small tea shop? We would start with the tea sachets.",
    createdAt: "2026-09-10T11:48:00.000Z",
    handledAt: null,
  },
];
