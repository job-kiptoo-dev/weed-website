// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { makeProduct } from "@/test/catalog-fixtures";
import { productService } from "@/services/product.service";
import { GET } from "./route";

vi.mock("@/services/product.service", () => ({
  productService: { getProductsByIds: vi.fn() },
}));

const getProductsByIds = vi.mocked(productService.getProductsByIds);

function request(query: string): NextRequest {
  return new NextRequest(`http://localhost/api/products${query}`);
}

describe("GET /api/products", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    getProductsByIds.mockReset();
  });

  it("returns the products for the requested ids", async () => {
    const products = [makeProduct()];
    getProductsByIds.mockResolvedValue(products);

    const response = await GET(request("?ids=prod_test"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ products });
    expect(getProductsByIds).toHaveBeenCalledWith(["prod_test"]);
  });

  it("trims, de-duplicates and caps the ids at 50", async () => {
    getProductsByIds.mockResolvedValue([]);
    const ids = Array.from({ length: 60 }, (_, i) => `prod_${i}`);
    await GET(request(`?ids=${[" prod_0 ", "prod_0", ...ids].join(",")}`));
    expect(getProductsByIds).toHaveBeenCalledWith(ids.slice(0, 50));
  });

  it("rejects a missing or empty ids list with 400", async () => {
    for (const query of ["", "?ids=", "?ids=,%20,"]) {
      const response = await GET(request(query));
      expect(response.status, query).toBe(400);
    }
    expect(getProductsByIds).not.toHaveBeenCalled();
  });

  it("answers a service failure with a generic 500 and logs it", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    getProductsByIds.mockRejectedValue(
      new Error("connect ECONNREFUSED 10.0.0.1:5432"),
    );

    const response = await GET(request("?ids=prod_test"));
    const body: unknown = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: "Something went wrong" });
    expect(JSON.stringify(body)).not.toContain("ECONNREFUSED");
    expect(consoleError).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "unexpected_error",
        context: "api.products",
      }),
    );
  });
});
