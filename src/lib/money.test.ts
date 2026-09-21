import { describe, expect, it } from "vitest";
import { formatMoney } from "./money";

describe("formatMoney", () => {
  it("formats zero", () => {
    expect(formatMoney(0)).toBe("$0.00");
  });

  it("formats cents below one dollar boundary", () => {
    expect(formatMoney(695)).toBe("$6.95");
  });

  it("formats thousands with grouping", () => {
    expect(formatMoney(123456)).toBe("$1,234.56");
  });

  it("formats negative amounts", () => {
    expect(formatMoney(-500)).toBe("-$5.00");
  });

  it("supports another currency", () => {
    expect(formatMoney(1000, "EUR")).toBe("€10.00");
  });
});
