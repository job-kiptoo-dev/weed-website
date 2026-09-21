/**
 * Phase 1 category service backed by `src/mocks/catalog`. Phase 2 swaps the
 * mock reads for Drizzle queries; the signatures and view types stay the same.
 */
import { categories, products } from "@/mocks/catalog";
import type { Category, CategoryWithCount } from "@/types/catalog";

function withCount(category: Category): CategoryWithCount {
  const productCount = products.filter(
    (p) => p.categoryId === category.id && p.status === "active",
  ).length;
  return { ...category, productCount };
}

async function listCategories(): Promise<CategoryWithCount[]> {
  await Promise.resolve();
  return [...categories]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(withCount);
}

async function getCategoryBySlug(
  slug: string,
): Promise<CategoryWithCount | null> {
  await Promise.resolve();
  const category = categories.find((c) => c.slug === slug);
  return category ? withCount(category) : null;
}

export const categoryService = {
  listCategories,
  getCategoryBySlug,
};
