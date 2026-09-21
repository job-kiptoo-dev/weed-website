import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CategoryRail } from "./category-rail";

const categories = [
  { id: "c1", name: "Tinctures", slug: "tinctures" },
  { id: "c2", name: "Gummies & Edibles", slug: "gummies-edibles" },
  { id: "c3", name: "Topicals", slug: "topicals" },
  { id: "c4", name: "Teas & Wellness", slug: "teas-wellness" },
  { id: "c5", name: "Accessories", slug: "accessories" },
].map((category) => ({
  ...category,
  imageUrl:
    category.slug === "accessories"
      ? null
      : `/images/categories/${category.slug}.jpg`,
}));

describe("CategoryRail", () => {
  it("renders a heading and one link per category", () => {
    render(<CategoryRail categories={categories} />);
    const section = screen.getByRole("region", { name: "Shop by category" });
    const links = within(section).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual(
      categories.map((category) => category.name),
    );
    expect(links.map((link) => link.getAttribute("href"))).toEqual(
      categories.map((category) => `/shop/${category.slug}`),
    );
  });
});
