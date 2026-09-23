// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { productService } from "@/services/product.service";
import { GET } from "./route";

vi.mock("@/services/product.service", () => ({
  productService: { searchSuggestions: vi.fn() },
}));

const searchSuggestions = vi.mocked(productService.searchSuggestions);

function request(query: string): NextRequest {
  return new NextRequest(`http://localhost/api/search${query}`);
}

describe("GET /api/search", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    searchSuggestions.mockReset();
  });

  it("returns the service's suggestions", async () => {
    const suggestions = [
      {
        type: "category" as const,
        label: "Gummies & Edibles",
        href: "/shop/gummies-edibles",
        imageUrl: null,
        priceCents: null,
      },
    ];
    searchSuggestions.mockResolvedValue(suggestions);

    const response = await GET(request("?q=gum"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ suggestions });
    expect(searchSuggestions).toHaveBeenCalledWith("gum");
  });

  it("passes an empty query when q is missing", async () => {
    searchSuggestions.mockResolvedValue([]);
    await GET(request(""));
    expect(searchSuggestions).toHaveBeenCalledWith("");
  });

  it("caps q at 100 characters", async () => {
    searchSuggestions.mockResolvedValue([]);
    await GET(request(`?q=${"a".repeat(150)}`));
    expect(searchSuggestions).toHaveBeenCalledWith("a".repeat(100));
  });

  it("answers a service failure with a generic 500 and logs it", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    searchSuggestions.mockRejectedValue(
      new Error('relation "products" does not exist'),
    );

    const response = await GET(request("?q=gum"));
    const body: unknown = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: "Something went wrong" });
    expect(JSON.stringify(body)).not.toContain("relation");
    expect(consoleError).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "unexpected_error",
        context: "api.search",
      }),
    );
  });
});
