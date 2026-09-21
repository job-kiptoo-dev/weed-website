import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SearchSuggestion } from "@/types/catalog";
import { SearchBar } from "./search-bar";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

const suggestions: SearchSuggestion[] = [
  {
    type: "category",
    label: "Gummies & Edibles",
    href: "/shop/gummies-edibles",
    imageUrl: null,
    priceCents: null,
  },
  {
    type: "product",
    label: "Berry bomb gummies",
    href: "/product/mixed-berry-gummies",
    imageUrl: "/images/products/gummies-edibles/gummy-bears.jpg",
    priceCents: 3200,
  },
];

function typeQuery(value: string) {
  fireEvent.change(screen.getByRole("combobox"), { target: { value } });
}

describe("SearchBar", () => {
  beforeEach(() => {
    push.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches suggestions after the debounce and navigates with the keyboard", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(Response.json({ suggestions }));
    render(<SearchBar />);
    const input = screen.getByRole("combobox");
    expect(input.getAttribute("aria-expanded")).toBe("false");

    typeQuery("g");
    typeQuery("gum");
    const options = await screen.findAllByRole("option");
    expect(options).toHaveLength(2);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(String(fetchSpy.mock.calls[0][0])).toBe("/api/search?q=gum");
    expect(input.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("$32.00")).toBeTruthy();

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(input.getAttribute("aria-activedescendant")).toBe(options[1].id);
    expect(options[1].getAttribute("aria-selected")).toBe("true");

    fireEvent.submit(screen.getByRole("search"));
    expect(push).toHaveBeenCalledWith("/product/mixed-berry-gummies");
    expect(input.getAttribute("aria-expanded")).toBe("false");
  });

  it("submits the query to the shop when no option is active", () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ suggestions: [] }),
    );
    render(<SearchBar />);
    typeQuery("mint tea");
    fireEvent.submit(screen.getByRole("search"));
    expect(push).toHaveBeenCalledWith("/shop?q=mint%20tea");
  });

  it("closes the listbox on Escape", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ suggestions }),
    );
    render(<SearchBar />);
    const input = screen.getByRole("combobox");
    typeQuery("gum");
    await screen.findAllByRole("option");
    fireEvent.keyDown(input, { key: "Escape" });
    expect(input.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("option")).toBeNull();
  });

  it("shows an inline message when the request fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
    render(<SearchBar />);
    typeQuery("gum");
    await waitFor(() => {
      expect(screen.getByRole("status").textContent).toBe(
        "Search is unavailable right now",
      );
    });
  });
});
