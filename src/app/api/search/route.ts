import type { NextRequest } from "next/server";
import { toErrorResponse } from "@/lib/action-result";
import { MAX_QUERY_LENGTH } from "@/lib/shop-query";
import { productService } from "@/services/product.service";

export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").slice(
    0,
    MAX_QUERY_LENGTH,
  );
  try {
    const suggestions = await productService.searchSuggestions(q);
    return Response.json({ suggestions });
  } catch (error) {
    return toErrorResponse(error, "api.search");
  }
}
