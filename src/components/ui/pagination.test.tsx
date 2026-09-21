import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Pagination } from "./pagination";

const hrefFor = (page: number) => (page > 1 ? `/shop?page=${page}` : "/shop");

describe("Pagination", () => {
  it("marks the current page and disables previous on the first page", () => {
    const { container } = render(
      <Pagination page={1} totalPages={2} hrefFor={hrefFor} />,
    );
    const current = screen.getByRole("link", { name: "1" });
    expect(current.getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "2" }).getAttribute("href")).toBe(
      "/shop?page=2",
    );
    expect(screen.queryByRole("link", { name: "Previous page" })).toBeNull();
    expect(container.querySelector('[aria-disabled="true"]')?.textContent).toBe(
      "Previous page",
    );
    expect(
      screen.getByRole("link", { name: "Next page" }).getAttribute("href"),
    ).toBe("/shop?page=2");
  });

  it("elides distant pages and hides the ellipsis from assistive tech", () => {
    const { container } = render(
      <Pagination page={5} totalPages={18} hrefFor={hrefFor} />,
    );
    const numbers = screen
      .getAllByRole("link")
      .map((link) => link.textContent)
      .filter((text) => text !== "");
    expect(numbers).toEqual(["1", "4", "5", "6", "18"]);
    expect(container.querySelectorAll('li[aria-hidden="true"]')).toHaveLength(
      2,
    );
    expect(
      screen.getByRole("link", { name: "Previous page" }).getAttribute("href"),
    ).toBe("/shop?page=4");
  });
});
