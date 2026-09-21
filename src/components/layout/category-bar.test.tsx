import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CategoryBar } from "./category-bar";

const categories = [
  { id: "cat_1", name: "Tinctures", slug: "tinctures" },
  { id: "cat_2", name: "Gummies & Edibles", slug: "gummies-edibles" },
  { id: "cat_3", name: "Topicals", slug: "topicals" },
  { id: "cat_4", name: "Teas & Wellness", slug: "teas-wellness" },
  { id: "cat_5", name: "Accessories", slug: "accessories" },
];

describe("CategoryBar", () => {
  it("renders a Categories nav with Shop all first, linking to /shop", () => {
    render(<CategoryBar categories={categories} />);
    const nav = screen.getByRole("navigation", { name: "Categories" });
    const links = within(nav).getAllByRole("link");
    expect(links[0].textContent).toBe("Shop all");
    expect(links[0].getAttribute("href")).toBe("/shop");
  });

  it("renders a link to each category page", () => {
    render(<CategoryBar categories={categories} />);
    const nav = screen.getByRole("navigation", { name: "Categories" });
    const categoryLinks = within(nav).getAllByRole("link").slice(1);
    expect(categoryLinks).toHaveLength(5);
    expect(
      categoryLinks.map((link) => [
        link.textContent,
        link.getAttribute("href"),
      ]),
    ).toEqual(categories.map((c) => [c.name, `/shop/${c.slug}`]));
  });
});
