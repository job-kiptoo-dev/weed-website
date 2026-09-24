import { cn } from "@/lib/cn";
import { siteConfig } from "@/lib/site-config";
import type { OrderPaymentStatus } from "@/types/order";

interface PaymentStatusNoticeProps {
  status: OrderPaymentStatus;
  className?: string;
}

const { phone, email } = siteConfig.contact;

/**
 * The confirmation banner has to match the order's `payment_status`: telling
 * the owner of a paid or refunded order that "nothing has been charged" is a
 * lie the page used to tell unconditionally. Only `pending` keeps the
 * no-payment-taken copy (R5), and no status promises an email (R8).
 */
const NOTICES: Readonly<
  Record<OrderPaymentStatus, { heading: string; body: string; tone: string }>
> = {
  pending: {
    heading: "We have not taken payment yet",
    body: "Placing your order does not take payment. We contact you afterwards to arrange it. Nothing has been charged.",
    tone: "border-accent/40 bg-accent/10",
  },
  paid: {
    heading: "Payment recorded",
    body: `This order is marked as paid. Contact us on ${phone} if that looks wrong.`,
    tone: "border-line bg-surface",
  },
  refunded: {
    heading: "This order was refunded",
    body: `This order is marked as refunded. Contact us on ${phone} if the money has not reached you.`,
    tone: "border-line bg-surface",
  },
  failed: {
    heading: "The last payment attempt did not go through",
    body: `Nothing is taken again automatically. Contact us on ${phone} or ${email} with your order number and we will arrange payment.`,
    tone: "border-danger/40 bg-danger/5",
  },
};

export function PaymentStatusNotice({
  status,
  className,
}: PaymentStatusNoticeProps) {
  const notice = NOTICES[status];

  return (
    <section
      aria-labelledby="confirmation-payment-heading"
      className={cn(
        "flex flex-col gap-1 rounded-card border p-5",
        notice.tone,
        className,
      )}
    >
      <h2
        id="confirmation-payment-heading"
        className="text-base font-medium text-ink"
      >
        {notice.heading}
      </h2>
      <p className="text-sm text-ink-muted">{notice.body}</p>
      {/* True at every status: this site never asks for card or bank details. */}
      <p className="text-sm text-ink-muted">
        We never collect card numbers, CVV codes or bank credentials on this
        site.
      </p>
    </section>
  );
}
