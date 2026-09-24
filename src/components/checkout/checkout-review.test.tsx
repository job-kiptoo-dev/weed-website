import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { FeaturedReview } from "@/types/catalog";
import { CheckoutReview } from "./checkout-review";

const review: FeaturedReview = {
  id: "rev_1",
  authorName: "Jordan P.",
  rating: 5,
  title: "Exactly as described",
  body: "Arrived in two days and the lab report matched the label.",
  createdAt: "2026-09-01T00:00:00.000Z",
  productName: "Calm tincture",
  productSlug: "calm-tincture",
};

describe("CheckoutReview", () => {
  it("quotes the review with its rating, author and product", () => {
    render(<CheckoutReview review={review} />);

    expect(screen.getByText(review.title)).toBeTruthy();
    expect(screen.getByText(review.body)).toBeTruthy();
    expect(screen.getByText("Jordan P. on Calm tincture")).toBeTruthy();
    expect(screen.getByRole("img", { name: "5 out of 5 stars" })).toBeTruthy();
  });

  it("renders nothing when there is no review", () => {
    const { container } = render(<CheckoutReview review={null} />);

    expect(container.innerHTML).toBe("");
  });
});
