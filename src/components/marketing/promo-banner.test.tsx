import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { makeProduct } from "@/test/catalog-fixtures";
import type { PromoBannerContent } from "@/types/content";
import { PromoBanner } from "./promo-banner";

const content: PromoBannerContent = {
  title: "Cool mint isolate is on sale",
  subtitle: "A clean peppermint taste.",
  productSlug: "mint-isolate-tincture",
  ctaLabel: "Shop cool mint isolate",
  imageUrl: "/images/promo/mint-tincture.jpg",
  imageAlt: "Two corked glass vials on burlap",
};

const product = makeProduct({
  name: "Cool mint isolate",
  slug: "mint-isolate-tincture",
  priceCents: 4900,
  compareAtPriceCents: 5900,
});

describe("PromoBanner", () => {
  it("renders the title as the h1 with the subtitle", () => {
    render(<PromoBanner content={content} product={product} />);
    expect(
      screen.getByRole("heading", { level: 1, name: content.title }),
    ).toBeTruthy();
    expect(screen.getByText(content.subtitle)).toBeTruthy();
    expect(screen.getByRole("img", { name: content.imageAlt })).toBeTruthy();
  });

  it("links to the product and shows its sale price", () => {
    render(<PromoBanner content={content} product={product} />);
    const cta = screen.getByRole("link", { name: content.ctaLabel });
    expect(cta.getAttribute("href")).toBe("/product/mint-isolate-tincture");
    expect(screen.getByText("Cool mint isolate")).toBeTruthy();
    expect(screen.getByText("$49.00")).toBeTruthy();
    expect(screen.getByText("$59.00").closest("s")).not.toBeNull();
  });

  it("degrades to a shop link without a price when the product is missing", () => {
    render(<PromoBanner content={content} product={null} />);
    const cta = screen.getByRole("link", { name: "Browse all products" });
    expect(cta.getAttribute("href")).toBe("/shop");
    expect(screen.queryByRole("link", { name: content.ctaLabel })).toBeNull();
    expect(screen.queryByText(/\$\d/)).toBeNull();
  });
});
