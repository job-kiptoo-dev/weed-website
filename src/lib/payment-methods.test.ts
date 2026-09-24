import { describe, expect, it } from "vitest";
import {
  PAYMENT_METHOD_IDS,
  PAYMENT_METHOD_PRESETS,
  type PaymentMethodConfig,
  enabledPaymentMethods,
  paymentProviderFor,
  resolvePaymentInstructions,
} from "./payment-methods";

const PHONE_PATTERN = /\+?1?[ (]?\d{3}[) -]\d{3}-\d{4}/;

function configFor(
  id: (typeof PAYMENT_METHOD_IDS)[number],
  enabled: boolean,
): PaymentMethodConfig {
  return { ...PAYMENT_METHOD_PRESETS[id], enabled };
}

describe("PAYMENT_METHOD_PRESETS", () => {
  it("covers every id exactly once, keyed by its own id", () => {
    expect(Object.keys(PAYMENT_METHOD_PRESETS).sort()).toEqual(
      [...PAYMENT_METHOD_IDS].sort(),
    );
    for (const id of PAYMENT_METHOD_IDS) {
      expect(PAYMENT_METHOD_PRESETS[id].id).toBe(id);
    }
  });

  it.each(PAYMENT_METHOD_IDS)(
    "%s carries the {phone} placeholder and no literal number",
    (id) => {
      const { instructions } = PAYMENT_METHOD_PRESETS[id];
      expect(instructions).toContain("{phone}");
      expect(instructions).not.toMatch(PHONE_PATTERN);
    },
  );

  it.each(PAYMENT_METHOD_IDS)("%s never claims payment was taken", (id) => {
    const text = PAYMENT_METHOD_PRESETS[id].instructions.toLowerCase();
    for (const claim of [
      "payment received",
      "payment successful",
      "paid in full",
      "buyer protection",
      "protected",
      "refund guarantee",
    ]) {
      expect(text).not.toContain(claim);
    }
  });

  it("tells card payers that no card details are entered here", () => {
    const { instructions } = PAYMENT_METHOD_PRESETS.card;
    expect(instructions).toContain("No card details are ever entered");
    expect(instructions.toLowerCase()).not.toContain("cvv");
  });

  it.each(["zelle", "chime", "cash-app", "venmo", "bitcoin"] as const)(
    "%s says a person sends the details after the order",
    (id) => {
      expect(PAYMENT_METHOD_PRESETS[id].instructions).toContain(
        "A person will send you",
      );
    },
  );

  it("marks only the card method as taken by Stripe", () => {
    expect(PAYMENT_METHOD_PRESETS.card.provider).toBe("stripe");
    for (const id of PAYMENT_METHOD_IDS) {
      if (id === "card") continue;
      expect(PAYMENT_METHOD_PRESETS[id].provider).toBe("manual");
    }
  });

  it("ships no logo paths, so the UI falls back to text badges", () => {
    for (const id of PAYMENT_METHOD_IDS) {
      expect(PAYMENT_METHOD_PRESETS[id]).not.toHaveProperty("logo");
    }
  });
});

describe("resolvePaymentInstructions", () => {
  it("substitutes every {phone} occurrence", () => {
    expect(
      resolvePaymentInstructions(
        { instructions: "Call {phone} or text {phone}." },
        { phone: "(555) 010-4242" },
      ),
    ).toBe("Call (555) 010-4242 or text (555) 010-4242.");
  });

  it("leaves copy without the placeholder untouched", () => {
    expect(
      resolvePaymentInstructions(
        { instructions: "We'll be in touch." },
        { phone: "(555) 010-4242" },
      ),
    ).toBe("We'll be in touch.");
  });

  it("resolves a real preset without leaving a placeholder behind", () => {
    const resolved = resolvePaymentInstructions(PAYMENT_METHOD_PRESETS.zelle, {
      phone: "(555) 010-4242",
    });
    expect(resolved).toContain("(555) 010-4242");
    expect(resolved).not.toContain("{phone}");
  });
});

describe("paymentProviderFor", () => {
  const methods = [configFor("zelle", true), configFor("card", true)];

  it("reads the provider off the configured method", () => {
    expect(paymentProviderFor("card", methods)).toBe("stripe");
    expect(paymentProviderFor("zelle", methods)).toBe("manual");
  });

  it("falls back to manual for a method the config does not list", () => {
    expect(paymentProviderFor("venmo", methods)).toBe("manual");
    expect(paymentProviderFor("card", [])).toBe("manual");
  });
});

describe("enabledPaymentMethods", () => {
  it("drops disabled methods and keeps the configured order", () => {
    const methods = [
      configFor("zelle", true),
      configFor("card", false),
      configFor("venmo", true),
    ];
    expect(enabledPaymentMethods(methods).map((m) => m.id)).toEqual([
      "zelle",
      "venmo",
    ]);
  });

  it("returns an empty list when nothing is enabled", () => {
    expect(enabledPaymentMethods([configFor("zelle", false)])).toEqual([]);
  });
});
