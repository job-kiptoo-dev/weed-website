import { Check, Lock } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { enabledPaymentMethods } from "@/lib/payment-methods";
import { siteConfig, type CheckoutSecurityBadge } from "@/lib/site-config";

interface SecurityBadgesProps {
  className?: string;
}

/**
 * Claims we can stand behind, plus the methods we actually accept. The "we
 * accept" line is derived from the enabled payment methods rather than listed
 * by hand, so it can never advertise a method that is switched off. No
 * card-network marks, antivirus seals or "accredited business" claims.
 */
export function SecurityBadges({ className }: SecurityBadgesProps) {
  const badges: readonly CheckoutSecurityBadge[] =
    siteConfig.checkout.securityBadges;
  const accepted = enabledPaymentMethods(
    siteConfig.checkout.paymentMethods,
  ).map((method) => method.label);

  return (
    <section
      aria-labelledby="checkout-security-heading"
      className={cn(
        "flex flex-col gap-3 rounded-card border border-line bg-surface p-5",
        className,
      )}
    >
      <h2 id="checkout-security-heading" className="text-base font-medium">
        How your order is handled
      </h2>
      <ul className="flex flex-col gap-2 text-sm text-ink-muted">
        {badges.map((badge) => (
          <li key={badge.id} className="flex items-start gap-2">
            {badge.icon === "lock" ? (
              <Lock className="size-4 shrink-0 text-brand" />
            ) : (
              <Check className="size-4 shrink-0 text-success" />
            )}
            {badge.label}
          </li>
        ))}
      </ul>
      {accepted.length > 0 ? (
        <p className="text-sm text-ink-muted">
          We accept {accepted.join(", ")}.
        </p>
      ) : null}
    </section>
  );
}
