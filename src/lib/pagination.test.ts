import { describe, expect, it } from "vitest";
import { paginationItems } from "./pagination";

describe("paginationItems", () => {
  it("lists every page when there are few", () => {
    expect(paginationItems(1, 3)).toEqual([1, 2, 3]);
  });

  it("keeps the leading run on the first page", () => {
    expect(paginationItems(1, 18)).toEqual([1, 2, 3, 4, 5, "ellipsis", 18]);
  });

  it("keeps the leading run up to page 4", () => {
    expect(paginationItems(4, 18)).toEqual([1, 2, 3, 4, 5, "ellipsis", 18]);
  });

  it("centres a three-page window with an ellipsis on both sides", () => {
    expect(paginationItems(5, 18)).toEqual([
      1,
      "ellipsis",
      4,
      5,
      6,
      "ellipsis",
      18,
    ]);
  });

  it("keeps the trailing run on the last page", () => {
    expect(paginationItems(18, 18)).toEqual([
      1,
      "ellipsis",
      14,
      15,
      16,
      17,
      18,
    ]);
  });
});
