/**
 * Category reads from Postgres. `createCategoryService` takes the database
 * and feature flags so tests can inject both; `categoryService` is bound to
 * the app database and `siteConfig.features`. Categories a flag hides (see
 * `@/lib/catalog-visibility`) are never returned.
 */
import { and, asc, eq, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { categories, products } from "@/lib/db/schema";
import { siteConfig } from "@/lib/site-config";
import type { CategoryWithCount } from "@/types/catalog";
import { toCategoryWithCount } from "./catalog.mappers";
import { visibleCategory, type CatalogServiceDeps } from "./product.queries";

export function createCategoryService({ getDb, features }: CatalogServiceDeps) {
  /** Visible categories with their active product count (zero-inventory included). */
  async function selectCategories(
    extra: SQL | undefined,
  ): Promise<CategoryWithCount[]> {
    const db = await getDb();
    const rows = await db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        description: categories.description,
        imageUrl: categories.imageUrl,
        sortOrder: categories.sortOrder,
        createdAt: categories.createdAt,
        updatedAt: categories.updatedAt,
        productCount: sql<number>`(count(${products.id}) filter (where ${products.status} = 'active'))::int`,
      })
      .from(categories)
      .leftJoin(products, eq(products.categoryId, categories.id))
      .where(and(visibleCategory(features), extra))
      .groupBy(categories.id)
      .orderBy(asc(categories.sortOrder), asc(categories.id));
    return rows.map(({ productCount, ...row }) =>
      toCategoryWithCount(row, Number(productCount)),
    );
  }

  async function listCategories(): Promise<CategoryWithCount[]> {
    return selectCategories(undefined);
  }

  async function getCategoryBySlug(
    slug: string,
  ): Promise<CategoryWithCount | null> {
    const [category] = await selectCategories(eq(categories.slug, slug));
    return category ?? null;
  }

  return { listCategories, getCategoryBySlug };
}

export type CategoryService = ReturnType<typeof createCategoryService>;

export const categoryService: CategoryService = createCategoryService({
  getDb,
  features: siteConfig.features,
});
