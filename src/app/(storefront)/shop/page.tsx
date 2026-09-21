import type { Metadata } from "next";
import { Suspense } from "react";
import { ShopListing } from "@/components/catalog/shop-listing";
import { ShopListingSkeleton } from "@/components/catalog/shop-listing-skeleton";
import { parseShopQuery } from "@/lib/shop-query";

export const metadata: Metadata = { title: "Shop" };

/**
 * The skeleton is an in-page Suspense boundary rather than `loading.tsx`: a
 * `shop/loading.tsx` would also wrap `shop/[category]/layout.tsx` and let the
 * response start streaming before that layout can set a 404 status.
 */
export default async function ShopPage(props: PageProps<"/shop">) {
  const query = parseShopQuery(await props.searchParams);

  return (
    <Suspense fallback={<ShopListingSkeleton />}>
      <ShopListing query={query} basePath="/shop" title="Shop" />
    </Suspense>
  );
}
