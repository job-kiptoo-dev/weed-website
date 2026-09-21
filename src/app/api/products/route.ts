import type { NextRequest } from "next/server";
import { productService } from "@/services/product.service";

const MAX_IDS = 50;

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("ids");
  const ids =
    raw === null
      ? []
      : Array.from(
          new Set(
            raw
              .split(",")
              .map((id) => id.trim())
              .filter((id) => id.length > 0),
          ),
        ).slice(0, MAX_IDS);

  if (ids.length === 0) {
    return Response.json({ error: "ids is required" }, { status: 400 });
  }

  const products = await productService.getProductsByIds(ids);
  return Response.json({ products });
}
