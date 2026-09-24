import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckoutSteps } from "@/components/checkout/checkout-steps";
import { ConfirmationSummary } from "@/components/checkout/confirmation-summary";
import { PaymentStatusNotice } from "@/components/checkout/payment-status-notice";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth/guards";
import { siteConfig } from "@/lib/site-config";
import { orderService } from "@/services/order.service";
import type { OrderAddress } from "@/types/order";

export const metadata: Metadata = {
  title: "Order confirmed",
  // Never indexed: the URL carries a token and shows a customer's address.
  robots: { index: false },
};

/** One token value only; `?t=a&t=b` arrives as an array and is not a token. */
function readToken(value: string | string[] | undefined): string | null {
  return typeof value === "string" ? value : null;
}

/** Same person, same place: no point printing the snapshot twice. */
function isSameAddress(a: OrderAddress, b: OrderAddress): boolean {
  return (
    a.fullName === b.fullName &&
    (a.company ?? null) === (b.company ?? null) &&
    a.line1 === b.line1 &&
    a.line2 === b.line2 &&
    a.city === b.city &&
    a.state === b.state &&
    a.postalCode === b.postalCode &&
    a.country === b.country &&
    a.phone === b.phone
  );
}

function AddressBlock({
  heading,
  address,
}: {
  heading: string;
  address: OrderAddress;
}) {
  return (
    <div className="flex flex-col gap-1 text-sm">
      <h3 className="text-base font-medium text-ink">{heading}</h3>
      <address className="text-ink-muted not-italic">
        {[
          address.fullName,
          address.company,
          address.line1,
          address.line2,
          `${address.city}, ${address.state} ${address.postalCode}`,
          address.country,
          address.phone,
        ]
          .filter((line): line is string => Boolean(line))
          .map((line, index) => (
            // Static, ordered list: two lines can legitimately read the same.
            <span key={index} className="block">
              {line}
            </span>
          ))}
      </address>
    </div>
  );
}

export default async function OrderConfirmationPage(
  props: PageProps<"/checkout/confirmation/[orderNumber]">,
) {
  const [{ orderNumber }, searchParams] = await Promise.all([
    props.params,
    props.searchParams,
  ]);

  // Readable by the signed-in owner, or by whoever holds the link's token.
  // Anything else — wrong token, stranger, unknown number — is a 404.
  const session = await getSession();
  const order = await orderService.getOrderByNumber(orderNumber, {
    userId: session?.user.id ?? null,
    token: readToken(searchParams.t),
  });
  if (!order) notFound();

  const isPickup = order.checkoutMeta?.orderType === "pickup";
  const deliveryAddress = order.shippingAddress;
  // `billingAddress` is null only on orders that predate the checkout form.
  const billingAddress = order.billingAddress ?? deliveryAddress;
  const showBilling =
    isPickup || !isSameAddress(billingAddress, deliveryAddress);

  return (
    <Container className="flex flex-col gap-6 py-8 md:gap-8 md:py-12">
      <CheckoutSteps current={3} />
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl tracking-display md:text-5xl">
          Thank you, your order is in
        </h1>
        <p className="text-lg text-ink-muted">
          Order number{" "}
          <strong className="font-medium text-ink tabular-nums">
            {order.orderNumber}
          </strong>
          . Keep the link to this page if you want to open your order again.
        </p>
      </div>

      {/* R5 and R8, told per `payment_status`: a paid or refunded order must
          not be shown the "nothing has been charged" copy. */}
      <PaymentStatusNotice status={order.paymentStatus} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-start">
        <div className="flex flex-col gap-6">
          <section
            aria-labelledby="confirmation-next-heading"
            className="flex flex-col gap-2 rounded-card border border-line bg-surface p-5 sm:p-6"
          >
            <h2 id="confirmation-next-heading" className="text-2xl">
              What happens next
            </h2>
            <p className="text-sm text-ink-muted">
              {order.paymentStatus === "pending"
                ? "A person will get in touch on the phone number or email below to arrange payment."
                : "A person will get in touch on the phone number or email below about this order."}{" "}
              You can also reach us on {siteConfig.contact.phone} or{" "}
              {siteConfig.contact.email} and quote your order number.
            </p>
            <p className="text-sm text-ink-muted">
              We have your contact email as {order.email}.
            </p>
          </section>

          <section
            aria-labelledby="confirmation-details-heading"
            className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5 sm:p-6"
          >
            <h2 id="confirmation-details-heading" className="text-2xl">
              {isPickup ? "Curbside pickup" : "Delivery"}
            </h2>
            {isPickup ? (
              <div className="flex flex-col gap-1 text-sm">
                <h3 className="text-base font-medium text-ink">Collect from</h3>
                <address className="text-ink-muted not-italic">
                  {siteConfig.contact.address.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </address>
                <p className="text-ink-muted">
                  We will confirm a pickup time when we call.
                </p>
              </div>
            ) : (
              <AddressBlock heading="Delivering to" address={deliveryAddress} />
            )}
            {showBilling ? (
              <AddressBlock
                heading="Billing address"
                address={billingAddress}
              />
            ) : null}
            {order.notes ? (
              <div className="flex flex-col gap-1 text-sm">
                <h3 className="text-base font-medium text-ink">Order notes</h3>
                <p className="text-ink-muted">{order.notes}</p>
              </div>
            ) : null}
          </section>

          <div>
            <Button href="/shop" variant="secondary">
              Continue shopping
            </Button>
          </div>
        </div>

        <ConfirmationSummary order={order} />
      </div>
    </Container>
  );
}
