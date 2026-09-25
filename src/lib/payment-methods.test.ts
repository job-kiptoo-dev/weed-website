import { describe, expect, it } from "vitest";
import {
  PAYMENT_METHOD_IDS,
  PAYMENT_METHOD_PRESETS,
  type PaymentMethodConfig,
  effectivePaymentProvider,
  enabledPaymentMethods,
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
    const preset = PAYMENT_METHOD_PRESETS[id];
    for (const copy of [preset.instructions, preset.stripeInstructions]) {
      if (copy === undefined) continue;
      const text = copy.toLowerCase();
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
    }
  });

  it("tells card payers arranging by phone that no card details are entered", () => {
    const { instructions } = PAYMENT_METHOD_PRESETS.card;
    expect(instructions).toContain("No card details are ever entered");
    expect(instructions.toLowerCase()).not.toContain("cvv");
  });

  it("gives the card method Stripe copy for the on-page fields", () => {
    const copy = PAYMENT_METHOD_PRESETS.card.stripeInstructions;
    expect(copy).toBeDefined();
    expect(copy).toContain("Enter your card details on this page");
    expect(copy).toContain("Stripe");
    expect(copy).toContain("never see or store your card number");
    expect(copy).toContain("{phone}");
    expect(copy).not.toMatch(PHONE_PATTERN);
  });

  it("gives Stripe copy to the Stripe-intent methods only", () => {
    for (const id of PAYMENT_METHOD_IDS) {
      const preset = PAYMENT_METHOD_PRESETS[id];
      if (preset.provider === "stripe") continue;
      expect(preset.stripeInstructions).toBeUndefined();
    }
  });

  it.each(["zelle", "chime", "cash-app", "venmo", "bitcoin"] as const)(
    "%s says a person sends the details after the order",
    (id) => {
      expect(PAYMENT_METHOD_PRESETS[id].instructions).toContain(
        "A person will send you",
      );
    },
  );

  it("marks only the card method with the intent to use Stripe", () => {
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

  it("prefers the Stripe copy only when the provider is stripe", () => {
    const method = {
      instructions: "A person will call {phone}.",
      stripeInstructions: "Enter your card below; questions on {phone}.",
    };
    const contact = { phone: "(555) 010-4242" };

    expect(resolvePaymentInstructions(method, contact)).toBe(
      "A person will call (555) 010-4242.",
    );
    expect(resolvePaymentInstructions(method, contact, "manual")).toBe(
      "A person will call (555) 010-4242.",
    );
    expect(resolvePaymentInstructions(method, contact, "stripe")).toBe(
      "Enter your card below; questions on (555) 010-4242.",
    );
  });

  it("falls back to the manual copy when a method has no Stripe copy", () => {
    expect(
      resolvePaymentInstructions(
        { instructions: "Call {phone}." },
        { phone: "(555) 010-4242" },
        "stripe",
      ),
    ).toBe("Call (555) 010-4242.");
  });

  it("resolves a real preset without leaving a placeholder behind", () => {
    const resolved = resolvePaymentInstructions(PAYMENT_METHOD_PRESETS.zelle, {
      phone: "(555) 010-4242",
    });
    expect(resolved).toContain("(555) 010-4242");
    expect(resolved).not.toContain("{phone}");
  });
});

describe("effectivePaymentProvider", () => {
  const methods = [configFor("zelle", true), configFor("card", true)];

  it("resolves a Stripe-intent method to stripe once the keys exist", () => {
    expect(effectivePaymentProvider("card", methods, true)).toBe("stripe");
  });

  it("falls the card method back to manual with no Stripe configured", () => {
    expect(effectivePaymentProvider("card", methods, false)).toBe("manual");
  });

  it("leaves a manual method manual either way", () => {
    expect(effectivePaymentProvider("zelle", methods, false)).toBe("manual");
    expect(effectivePaymentProvider("zelle", methods, true)).toBe("manual");
  });

  it("falls back to manual for a method the config does not list", () => {
    expect(effectivePaymentProvider("venmo", methods, true)).toBe("manual");
    expect(effectivePaymentProvider("card", [], true)).toBe("manual");
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
