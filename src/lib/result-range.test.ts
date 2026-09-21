import { describe, expect, it } from "vitest";
import { resultRangeLabel } from "./result-range";

describe("resultRangeLabel", () => {
  it("shows the range of a full page", () => {
    expect(resultRangeLabel({ page: 1, pageSize: 20, total: 30 })).toBe(
      "Showing 1–20 of 30 results",
    );
  });

  it("ends the range at the total on the last page", () => {
    expect(resultRangeLabel({ page: 2, pageSize: 20, total: 30 })).toBe(
      "Showing 21–30 of 30 results",
    );
  });

  it("handles a single result and no results", () => {
    expect(resultRangeLabel({ page: 1, pageSize: 20, total: 1 })).toBe(
      "Showing the single result",
    );
    expect(resultRangeLabel({ page: 1, pageSize: 20, total: 0 })).toBe(
      "No results",
    );
  });

  it("appends the search term", () => {
    expect(
      resultRangeLabel({ page: 1, pageSize: 20, total: 4, query: "tea" }),
    ).toBe('Showing 1–4 of 4 results for "tea"');
    expect(
      resultRangeLabel({ page: 1, pageSize: 20, total: 0, query: "tea" }),
    ).toBe('No results for "tea"');
  });
});
