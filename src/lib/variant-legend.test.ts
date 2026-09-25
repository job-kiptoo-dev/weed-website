import { describe, expect, it } from "vitest";
import { variantLegend } from "./variant-legend";

describe("variantLegend", () => {
  it("uses Strength when every variant is a milligram amount", () => {
    expect(
      variantLegend([{ name: "500 mg" }, { name: "1,000 mg" }], true),
    ).toBe("Strength");
  });

  it("uses Size for count, pack and mixed variants", () => {
    expect(
      variantLegend(
        [{ name: "10 mg, 30 count" }, { name: "25 mg, 30 count" }],
        true,
      ),
    ).toBe("Size");
    expect(variantLegend([{ name: "10 sachets" }], true)).toBe("Size");
    expect(
      variantLegend(
        [
          { name: "3.5 g" },
          { name: "7 g" },
          { name: "14 g" },
          { name: "28 g" },
          { name: "56 g" },
        ],
        true,
      ),
    ).toBe("Size");
    expect(
      variantLegend([{ name: "500 mg" }, { name: "30 count" }], true),
    ).toBe("Size");
  });

  it("uses Option for products without specs", () => {
    expect(variantLegend([{ name: "Small" }, { name: "Large" }], false)).toBe(
      "Option",
    );
    expect(variantLegend([{ name: "500 mg" }], false)).toBe("Option");
  });
});
