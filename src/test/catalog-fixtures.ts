/**
 * Hand-built fixtures for component tests. Tests never import `src/mocks/*`
 * (that module is reserved for services), so build small view objects here.
 */
import type { ProductSummary, ProductVariant } from "@/types/catalog";

const category = { id: "cat_tinctures", name: "Tinctures", slug: "tinctures" };

export function makeVariant(
  overrides: Partial<ProductVariant> = {},
): ProductVariant {
  return {
    id: "var_test-500",
    productId: "prod_test",
    name: "500 mg",
    sku: "TEST-500",
    priceCents: null,
    inventory: 10,
    sortOrder: 1,
    isDefault: true,
    ...overrides,
  };
}

export function makeProduct(
  overrides: Partial<ProductSummary> = {},
): ProductSummary {
  return {
    id: "prod_test",
    name: "Test tincture",
    slug: "test-tincture",
    description: "First paragraph.\n\nSecond paragraph.",
    shortDescription: "A short description.",
    priceCents: 3900,
    compareAtPriceCents: null,
    sku: "TEST",
    categoryId: category.id,
    inventory: 10,
    status: "active",
    featured: false,
    specs: {
      strengthMg: 500,
      spectrum: "broad",
      labTested: true,
      servingSize: "1 mL",
      ingredients: ["MCT oil", "hemp extract"],
    },
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    category,
    images: [
      {
        id: "img_test-1",
        productId: "prod_test",
        url: "/images/products/tinctures/amber-dropper-bottle.jpg",
        alt: "Test tincture, view 1",
        sortOrder: 1,
      },
    ],
    variants: [makeVariant()],
    ratingAverage: 0,
    reviewCount: 0,
    ...overrides,
  };
}
