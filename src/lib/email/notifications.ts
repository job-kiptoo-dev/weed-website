import "server-only";
import { getServerEnv, type ServerEnv } from "@/lib/env";
import { formatMoney } from "@/lib/money";
import {
  DEFAULT_EMAIL_FROM,
  sendEmail,
  type SendEmailDeps,
  type SendResult,
} from "./send";

/*
 * Store-owner notifications. `orderService.createOrder` calls notifyNewOrder
 * once, after its transaction commits; Phase 10 calls notifyContactMessage
 * from the contact form action.
 *
 * Neither ever sends while `RESEND_API_KEY` is unset: `sendEmail` only logs
 * and returns `{ sent: false, reason: "not-configured" }`. An unset
 * ORDER_NOTIFICATION_EMAIL means there is no recipient at all, which is the
 * same result. Callers log that outcome, so a shop receiving no order emails
 * shows up in the server logs rather than silently.
 */

export type NotificationEnv = Pick<
  ServerEnv,
  | "RESEND_API_KEY"
  | "EMAIL_FROM"
  | "NODE_ENV"
  | "ORDER_NOTIFICATION_EMAIL"
  | "CONTACT_NOTIFICATION_EMAIL"
>;

export interface NotifyDeps extends Omit<SendEmailDeps, "env"> {
  env?: NotificationEnv;
}

export interface NewOrderNotification {
  orderNumber: string;
  customerEmail: string;
  totalCents: number;
  itemCount: number;
  placedAt: Date;
}

export interface ContactMessageNotification {
  name: string;
  email: string;
  subject: string;
  message: string;
}

const NOT_CONFIGURED: SendResult = { sent: false, reason: "not-configured" };

export async function notifyNewOrder(
  order: NewOrderNotification,
  deps: NotifyDeps = {},
): Promise<SendResult> {
  const env = deps.env ?? getServerEnv();
  const to = env.ORDER_NOTIFICATION_EMAIL;
  if (!to) return NOT_CONFIGURED;

  const total = formatMoney(order.totalCents);
  const items = `${order.itemCount} ${order.itemCount === 1 ? "item" : "items"}`;
  return sendEmail(
    {
      kind: "order-notification",
      to,
      subject: `New order ${order.orderNumber}, ${total}`,
      text: [
        `Order: ${order.orderNumber}`,
        `Customer: ${order.customerEmail}`,
        `Total: ${total} (${items})`,
        `Placed: ${order.placedAt.toISOString()}`,
      ].join("\n"),
    },
    { ...deps, env },
  );
}

/** Goes to CONTACT_NOTIFICATION_EMAIL, falling back to the order inbox. */
export async function notifyContactMessage(
  input: ContactMessageNotification,
  deps: NotifyDeps = {},
): Promise<SendResult> {
  const env = deps.env ?? getServerEnv();
  const to = env.CONTACT_NOTIFICATION_EMAIL ?? env.ORDER_NOTIFICATION_EMAIL;
  if (!to) return NOT_CONFIGURED;

  return sendEmail(
    {
      kind: "contact-notification",
      to,
      subject: `Contact form: ${input.subject}`,
      text: [
        `From: ${input.name} <${input.email}>`,
        `Subject: ${input.subject}`,
        "",
        input.message,
      ].join("\n"),
    },
    { ...deps, env },
  );
}

/** Domain of an address in `Name <user@domain>` or `user@domain` form. */
function senderDomain(from: string): string {
  const address = /<([^>]+)>/.exec(from)?.[1] ?? from;
  return address
    .slice(address.lastIndexOf("@") + 1)
    .trim()
    .toLowerCase();
}

/**
 * True while email can't reach arbitrary customers: no API key, or the
 * sender is Resend's test domain (delivers only to the account owner).
 * The forgot-password page passes it to the form to show the demo notice.
 */
export function isEmailDeliveryLimited(
  env: Pick<ServerEnv, "RESEND_API_KEY" | "EMAIL_FROM"> = getServerEnv(),
): boolean {
  if (!env.RESEND_API_KEY) return true;
  return senderDomain(env.EMAIL_FROM ?? DEFAULT_EMAIL_FROM) === "resend.dev";
}
