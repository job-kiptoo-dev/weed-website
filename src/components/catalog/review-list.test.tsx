import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Review } from "@/types/catalog";
import { ReviewList } from "./review-list";

function makeReview(overrides: Partial<Review> = {}): Review {
  return {
    id: "rev_1",
    productId: "prod_test",
    userId: null,
    authorName: "Maya R.",
    rating: 5,
    title: "Mild taste",
    body: "Easy dropper, arrived quickly.",
    status: "published",
    createdAt: "2025-02-10T15:00:00.000Z",
    updatedAt: "2025-02-10T15:00:00.000Z",
    ...overrides,
  };
}

describe("ReviewList", () => {
  it("lists published reviews only with a formatted date", () => {
    render(
      <ReviewList
        reviews={[
          makeReview(),
          makeReview({
            id: "rev_2",
            title: "Hidden one",
            status: "hidden",
          }),
        ]}
        ratingAverage={5}
        reviewCount={1}
      />,
    );
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.getByRole("heading", { name: "Mild taste" })).toBeTruthy();
    expect(screen.queryByText("Hidden one")).toBeNull();
    expect(screen.getByText("Feb 10, 2025")).toBeTruthy();
    expect(screen.getByText("5 out of 5 from 1 review")).toBeTruthy();
    expect(
      screen.getByText("Reviews open with customer accounts in a later phase."),
    ).toBeTruthy();
  });

  it("shows the empty copy when there are no reviews", () => {
    render(<ReviewList reviews={[]} ratingAverage={0} reviewCount={0} />);
    expect(screen.getByText("No reviews yet.")).toBeTruthy();
    expect(screen.queryByRole("article")).toBeNull();
  });
});
