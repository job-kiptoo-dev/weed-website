import type { NextRequest } from "next/server";
import { productService } from "@/services/product.service";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const suggestions = await productService.searchSuggestions(q);
  return Response.json({ suggestions });
}
