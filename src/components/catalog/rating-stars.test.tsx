import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RatingStars } from "./rating-stars";

describe("RatingStars", () => {
  it("exposes the rating as an accessible label", () => {
    render(<RatingStars value={4.25} count={12} />);
    expect(
      screen.getByRole("img", { name: "4.3 out of 5 stars" }),
    ).toBeTruthy();
    expect(screen.getByText("(12)")).toBeTruthy();
  });

  it("omits the count when not provided", () => {
    render(<RatingStars value={5} />);
    expect(screen.queryByText(/\(\d+\)/)).toBeNull();
  });
});
