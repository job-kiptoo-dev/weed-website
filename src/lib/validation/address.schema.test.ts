import { describe, expect, it } from "vitest";
import { addressSchema } from "./address.schema";

const VALID = {
  fullName: "Ada Park",
  line1: "123 Alder St",
  city: "Portland",
  state: "OR",
  postalCode: "97205",
};

describe("addressSchema", () => {
  it("accepts a minimal US address and applies defaults", () => {
    expect(addressSchema.parse(VALID)).toEqual({
      ...VALID,
      country: "US",
      isDefaultShipping: false,
      isDefaultBilling: false,
    });
  });

  it.each(["97205", "97205-1234", " 97205 "])(
    "accepts ZIP %j",
    (postalCode) => {
      expect(addressSchema.safeParse({ ...VALID, postalCode }).success).toBe(
        true,
      );
    },
  );

  it.each(["9720", "972051", "97205-12", "ABCDE", "97205 1234", ""])(
    "rejects ZIP %j",
    (postalCode) => {
      expect(addressSchema.safeParse({ ...VALID, postalCode }).success).toBe(
        false,
      );
    },
  );

  it("accepts state codes case-insensitively, including DC", () => {
    expect(addressSchema.parse({ ...VALID, state: "wa" }).state).toBe("WA");
    expect(addressSchema.parse({ ...VALID, state: "DC" }).state).toBe("DC");
  });

  it.each(["XX", "Oregon", "PR", ""])("rejects state %j", (state) => {
    expect(addressSchema.safeParse({ ...VALID, state }).success).toBe(false);
  });

  it("turns blank optional fields into null", () => {
    const parsed = addressSchema.parse({ ...VALID, line2: "  ", phone: "" });
    expect(parsed.line2).toBeNull();
    expect(parsed.phone).toBeNull();
  });

  it("only ships to the US", () => {
    expect(addressSchema.safeParse({ ...VALID, country: "CA" }).success).toBe(
      false,
    );
  });
});
