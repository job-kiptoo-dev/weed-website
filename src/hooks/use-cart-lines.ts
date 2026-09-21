"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { computeTotals } from "@/lib/cart";
import { siteConfig } from "@/lib/site-config";
import type { CartLine, CartTotals, PricedCartLine } from "@/types/cart";
import type { ProductSummary } from "@/types/catalog";
import { useCart } from "./use-cart";

export type CartLinesStatus = "idle" | "loading" | "ready" | "error";

export interface UseCartLinesResult {
  status: CartLinesStatus;
  lines: PricedCartLine[];
  totals: CartTotals;
  refetch: () => void;
}

interface FetchResult {
  /** The request key this result answers; compared against the current key. */
  key: string;
  products: Map<string, ProductSummary>;
  error: Error | null;
}

const INITIAL_RESULT: FetchResult = {
  key: "",
  products: new Map(),
  error: null,
};

function subscribeNoop(): () => void {
  return () => {};
}

/** `false` during SSR and hydration, `true` once the client has taken over. */
function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
}

function uniqueSortedIds(lines: CartLine[]): string {
  return Array.from(new Set(lines.map((line) => line.productId)))
    .sort()
    .join(",");
}

function isProductsResponse(
  value: unknown,
): value is { products: ProductSummary[] } {
  return (
    typeof value === "object" &&
    value !== null &&
    "products" in value &&
    Array.isArray(value.products)
  );
}

async function fetchProducts(
  idsKey: string,
  signal: AbortSignal,
): Promise<Map<string, ProductSummary>> {
  const response = await fetch(
    `/api/products?ids=${encodeURIComponent(idsKey)}`,
    { signal },
  );
  if (!response.ok) {
    throw new Error(`Could not load cart products (HTTP ${response.status}).`);
  }
  const data: unknown = await response.json();
  if (!isProductsResponse(data)) {
    throw new Error("Could not load cart products (unexpected response).");
  }
  return new Map(data.products.map((product) => [product.id, product]));
}

function priceLines(
  lines: CartLine[],
  products: Map<string, ProductSummary>,
): PricedCartLine[] {
  return lines.flatMap((line) => {
    const product = products.get(line.productId);
    if (!product) return [];

    const variant =
      line.variantId === null
        ? null
        : product.variants.find((v) => v.id === line.variantId);
    if (variant === undefined) return [];

    const unitPriceCents = variant?.priceCents ?? product.priceCents;
    return [
      {
        ...line,
        product,
        variant,
        name: product.name,
        variantName: variant?.name ?? null,
        imageUrl: product.images[0]?.url ?? null,
        unitPriceCents,
        lineTotalCents: unitPriceCents * line.quantity,
      },
    ];
  });
}

export function useCartLines(): UseCartLinesResult {
  const hydrated = useHydrated();
  const { lines } = useCart();
  const idsKey = uniqueSortedIds(lines);
  const [refetchToken, setRefetchToken] = useState(0);
  const [result, setResult] = useState<FetchResult>(INITIAL_RESULT);

  const requestKey = idsKey === "" ? "" : `${idsKey}#${refetchToken}`;

  useEffect(() => {
    if (requestKey === "") return;

    const controller = new AbortController();
    fetchProducts(idsKey, controller.signal)
      .then((products) => {
        setResult({ key: requestKey, products, error: null });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        const normalized =
          error instanceof Error ? error : new Error(String(error));
        console.error("Cart: failed to load products.", normalized);
        setResult({ key: requestKey, products: new Map(), error: normalized });
      });

    return () => controller.abort();
  }, [idsKey, requestKey]);

  let status: CartLinesStatus;
  if (!hydrated) {
    status = "idle";
  } else if (requestKey === "") {
    status = "ready";
  } else if (result.key !== requestKey) {
    status = "loading";
  } else if (result.error) {
    status = "error";
  } else {
    status = "ready";
  }

  const pricedLines =
    requestKey === "" ? [] : priceLines(lines, result.products);
  const totals = computeTotals(pricedLines, siteConfig.shipping);

  return {
    status,
    lines: pricedLines,
    totals,
    refetch: () => setRefetchToken((token) => token + 1),
  };
}
