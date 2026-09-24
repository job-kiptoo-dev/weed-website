import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { siteConfig } from "@/lib/site-config";
import { CheckoutHeader } from "./checkout-header";

describe("CheckoutHeader", () => {
  it("links the shop name home and names the page", () => {
    render(<CheckoutHeader />);

    const home = screen.getByRole("link", { name: siteConfig.name });
    expect(home.getAttribute("href")).toBe("/");
    expect(screen.getByText("Checkout")).toBeTruthy();
  });

  it("carries no storefront navigation", () => {
    render(<CheckoutHeader />);

    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
