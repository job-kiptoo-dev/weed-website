import { describe, expect, it } from "vitest";
import { PAYMENT_METHOD_IDS, PAYMENT_METHOD_PRESETS } from "./payment-methods";
import { HOUR_MS, MINUTE_MS } from "./rate-limit";
import { describeStore, siteConfig } from "./site-config";

describe("describeStore", () => {
  it("mentions accessories, glassware, flower and pre-rolls while smokable hemp is on", () => {
    expect(describeStore({ smokableHemp: true })).toBe(
      "Small-batch hemp-derived CBD tinctures, gummies, topicals and teas, plus smoking accessories, glassware, hemp flower and pre-rolls. Third-party lab tested and labeled by strength and spectrum.",
    );
  });

  it("keeps glassware but drops flower and pre-rolls while smokable hemp is off", () => {
    const description = describeStore({ smokableHemp: false });
    expect(description).toBe(
      "Small-batch hemp-derived CBD tinctures, gummies, topicals and teas, plus smoking accessories and glassware. Third-party lab tested and labeled by strength and spectrum.",
    );
    expect(description.toLowerCase()).not.toContain("pre-roll");
    expect(description.toLowerCase()).not.toContain("flower");
  });

  it("uses the current flags for siteConfig.description", () => {
    expect(siteConfig.description).toBe(describeStore(siteConfig.features));
  });
});

describe("siteConfig contact details", () => {
  it("uses the client's live contact address and the brand handles", () => {
    // The real inbox and number the client gave us: they render in the footer,
    // on /contact and inside every payment instruction ({phone}), so a change
    // here changes the whole site. Placeholders must never come back.
    expect(siteConfig.contact.email).toBe("Sharekac25@gmail.com");
    expect(siteConfig.contact.phone).toBe("(850) 328-3550");
    expect(siteConfig.social.map((link) => link.href)).toEqual([
      "https://instagram.com/botanicssupplyco",
      "https://tiktok.com/@botanicssupplyco",
    ]);
  });
});

describe("siteConfig.checkout", () => {
  it("reuses the shipping rates so /cart and /checkout can't diverge", () => {
    expect(siteConfig.checkout.delivery).toEqual({
      freeDeliveryThresholdCents: siteConfig.shipping.freeThresholdCents,
      deliveryFeeCents: siteConfig.shipping.flatRateCents,
      pickupDiscountCents: 0,
    });
  });

  it("budgets the checkout actions per IP, per email and per coupon code", () => {
    expect(siteConfig.checkout.rateLimits).toEqual({
      placeOrderPerIp: { limit: 5, windowMs: HOUR_MS },
      placeOrderPerEmail: { limit: 3, windowMs: HOUR_MS },
      quotePerIp: { limit: 60, windowMs: MINUTE_MS },
      quoteCouponCodesPerIp: { limit: 5, windowMs: HOUR_MS },
    });
  });

  it("leaves one session far more quotes than a customer can trigger", () => {
    const { quotePerIp } = siteConfig.checkout.rateLimits;
    // One re-quote per settled change (250 ms debounce): a customer editing
    // the cart, switching order type and retrying a coupon sends a handful a
    // minute. Ten times that still has to fit.
    const busySessionPerMinute = 6;
    expect(quotePerIp.windowMs).toBe(MINUTE_MS);
    expect(quotePerIp.limit).toBeGreaterThanOrEqual(busySessionPerMinute * 10);
  });

  it("starts with both tax rates at 0, so no tax row renders", () => {
    expect(siteConfig.checkout.taxes).toEqual({
      excisePercent: 0,
      salesPercent: 0,
    });
  });

  it("offers all eight payment methods, in order and enabled", () => {
    expect(siteConfig.checkout.paymentMethods.map((m) => m.id)).toEqual([
      ...PAYMENT_METHOD_IDS,
    ]);
    for (const method of siteConfig.checkout.paymentMethods) {
      expect(method.enabled).toBe(true);
      expect(method.instructions).toBe(
        PAYMENT_METHOD_PRESETS[method.id].instructions,
      );
      // The config spreads the presets, so the provider cannot drift: card is
      // taken by Stripe (and hidden where Stripe is unconfigured), the rest
      // are arranged by a person.
      expect(method.provider).toBe(PAYMENT_METHOD_PRESETS[method.id].provider);
    }
  });

  it("gives every method a licensed mark except Chime, which has none", () => {
    const logos = Object.fromEntries(
      siteConfig.checkout.paymentMethods.map((m) => [m.id, m.logo]),
    );

    expect(logos).toEqual({
      zelle: "/images/payments/zelle.svg",
      "apple-pay": "/images/payments/apple-pay.svg",
      // No CC0 Chime mark exists, so the radio shows a text badge instead.
      chime: undefined,
      // Ours, not a card network's: never Visa, Mastercard or Amex.
      card: "/images/payments/card.svg",
      bitcoin: "/images/payments/bitcoin.svg",
      paypal: "/images/payments/paypal.svg",
      "cash-app": "/images/payments/cash-app.svg",
      venmo: "/images/payments/venmo.svg",
    });
  });

  it("shows only honest security badges", () => {
    expect(
      siteConfig.checkout.securityBadges.map((badge) => badge.label),
    ).toEqual([
      "Secure checkout",
      "We never see or store card details",
      "Lab tested, 21+",
    ]);
    const labels = siteConfig.checkout.securityBadges
      .map((badge) => badge.label.toLowerCase())
      .join(" ");
    for (const claim of [
      "accredited",
      "virus",
      "visa",
      "mastercard",
      "guarantee",
      "verified",
    ]) {
      expect(labels).not.toContain(claim);
    }
  });
});
