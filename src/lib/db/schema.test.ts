// @vitest-environment node
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "@/test/db";
import {
  cartItems,
  carts,
  categories,
  orders,
  productImages,
  products,
  productVariants,
  reviews,
} from "./schema";

let testDb: TestDb;

beforeAll(async () => {
  testDb = await createTestDb();
}, 30_000);

afterAll(async () => {
  await testDb?.close();
});

function pgErrorCode(error: unknown): string | undefined {
  let current: unknown = error;
  while (typeof current === "object" && current !== null) {
    if ("code" in current && typeof current.code === "string")
      return current.code;
    current = "cause" in current ? current.cause : undefined;
  }
  return undefined;
}

async function expectPgError(
  query: PromiseLike<unknown>,
  code: string | readonly string[],
): Promise<void> {
  const codes = typeof code === "string" ? [code] : code;
  const error = await Promise.resolve(query).then(
    () => null,
    (reason: unknown) => reason,
  );
  expect(error, `expected Postgres error ${codes.join(" or ")}`).not.toBeNull();
  expect(codes).toContain(pgErrorCode(error));
}

/**
 * `execute()` results differ by driver (PGlite: `{ rows }`, postgres.js: an
 * array), so the shared `Database` type types them as `unknown`.
 */
function rowsOf(result: unknown): Record<string, unknown>[] {
  const rows: unknown =
    typeof result === "object" && result !== null && "rows" in result
      ? result.rows
      : result;
  if (!Array.isArray(rows))
    throw new Error("Unexpected execute() result shape");
  return rows.map((row: unknown) => {
    if (typeof row !== "object" || row === null)
      throw new Error("Unexpected row shape");
    return Object.fromEntries(Object.entries(row));
  });
}

const UNIQUE_VIOLATION = "23505";
const RESTRICT_VIOLATION = "23001";
const FOREIGN_KEY_VIOLATION = "23503";
const CHECK_VIOLATION = "23514";

let seq = 0;
function uid(prefix: string): string {
  seq += 1;
  return `${prefix}_${seq}`;
}

async function insertCategory(name = "Tinctures") {
  const id = uid("cat");
  await testDb.db.insert(categories).values({
    id,
    name,
    slug: id,
    description: `${name} category`,
    sortOrder: seq,
  });
  return id;
}

async function insertProduct(
  categoryId: string,
  overrides: Partial<typeof products.$inferInsert> = {},
) {
  const id = uid("prod");
  await testDb.db.insert(products).values({
    id,
    name: "Calm full-spectrum oil",
    slug: id,
    description: "A full-spectrum hemp extract in MCT oil.",
    shortDescription: "Daily full-spectrum drops.",
    priceCents: 4500,
    sku: id.toUpperCase(),
    categoryId,
    status: "active",
    ...overrides,
  });
  return id;
}

describe("PGlite full-text search support (spike R3)", () => {
  it("has the english Snowball config, websearch_to_tsquery and prefix queries", async () => {
    const result = await testDb.db.execute(
      sql`select to_tsvector('english', 'Gummies')::text as vector,
                 websearch_to_tsquery('english', 'mint -tea')::text as web,
                 to_tsquery('english', 'gum:*')::text as prefix`,
    );
    expect(rowsOf(result)[0]).toEqual({
      vector: "'gummi':1",
      web: "'mint' & !'tea'",
      prefix: "'gum':*",
    });
  });

  it("uses the GIN index for search_vector matches", async () => {
    await testDb.db.execute(sql`set enable_seqscan = off`);
    try {
      const plan = await testDb.db.execute(
        sql`explain select id from products where search_vector @@ websearch_to_tsquery('english', 'mint')`,
      );
      const text = rowsOf(plan)
        .map((row) => String(row["QUERY PLAN"]))
        .join("\n");
      expect(text).toContain("products_search_vector_idx");
    } finally {
      await testDb.db.execute(sql`reset enable_seqscan`);
    }
  });
});

describe("schema", () => {
  it("applies the migrations", async () => {
    const result = await testDb.db.execute(
      sql`select count(*)::int as count from information_schema.tables where table_schema = 'public'`,
    );
    expect(rowsOf(result)[0]?.count).toBe(20);
  });

  it("populates the weighted generated search vectors", async () => {
    const categoryId = await insertCategory("Gummies & Edibles");
    const productId = await insertProduct(categoryId, {
      name: "Mint isolate tincture",
      sku: "HB-TIN-MINT",
      shortDescription: "Zero-THC peppermint drops.",
      description: "CBD isolate in MCT oil with natural peppermint.",
    });

    const result = await testDb.db.execute<{
      product: string;
      category: string;
    }>(
      sql`select p.search_vector::text as product, c.search_vector::text as category
          from products p join categories c on c.id = p.category_id where p.id = ${productId}`,
    );
    const row = rowsOf(result)[0];
    expect(String(row?.product)).toContain("'mint':1A");
    expect(String(row?.product)).toContain("'peppermint'");
    expect(String(row?.category)).toContain("'gummi':1A");
  });

  it("matches websearch_to_tsquery('english', 'mint')", async () => {
    const categoryId = await insertCategory();
    const mintId = await insertProduct(categoryId, {
      name: "Mint isolate tincture",
      slug: "mint-isolate-tincture",
      sku: "HB-TIN-MINT-2",
    });
    const otherId = await insertProduct(categoryId, { name: "Chamomile tea" });

    const matches = await testDb.db
      .select({ id: products.id, slug: products.slug })
      .from(products)
      .where(
        sql`${products.searchVector} @@ websearch_to_tsquery('english', 'mint')`,
      );
    const ids = matches.map((row) => row.id);
    expect(matches.map((row) => row.slug)).toContain("mint-isolate-tincture");
    expect(ids).toContain(mintId);
    expect(ids).not.toContain(otherId);
  });

  it("numbers orders from the sequence starting at BSC-100001", async () => {
    const [first, second] = await testDb.db
      .insert(orders)
      .values(
        [1, 2].map(() => ({
          id: uid("ord"),
          email: "guest@botanicssupply.test",
          subtotalCents: 4000,
          shippingCents: 695,
          totalCents: 4695,
          shippingAddress: {
            fullName: "Guest",
            line1: "1 Main St",
            line2: null,
            city: "Austin",
            state: "TX",
            postalCode: "78701",
            country: "US",
            phone: null,
          },
        })),
      )
      .returning({ orderNumber: orders.orderNumber });
    expect(first?.orderNumber).toBe("BSC-100001");
    expect(second?.orderNumber).toBe("BSC-100002");
  });

  it("rejects an order whose total does not add up", async () => {
    await expectPgError(
      testDb.db.insert(orders).values({
        id: uid("ord"),
        email: "guest@botanicssupply.test",
        subtotalCents: 4000,
        shippingCents: 0,
        totalCents: 3999,
        shippingAddress: {
          fullName: "Guest",
          line1: "1 Main St",
          line2: null,
          city: "Austin",
          state: "TX",
          postalCode: "78701",
          country: "US",
          phone: null,
        },
      }),
      CHECK_VIOLATION,
    );
  });

  it("rejects a rating outside 1..5", async () => {
    const productId = await insertProduct(await insertCategory());
    await expectPgError(
      testDb.db.insert(reviews).values({
        id: uid("rev"),
        productId,
        authorName: "Sam",
        rating: 6,
        title: "Too good",
        body: "Off the scale.",
      }),
      CHECK_VIOLATION,
    );
  });

  it("rejects a duplicate variant-less cart line (NULLS NOT DISTINCT)", async () => {
    const productId = await insertProduct(await insertCategory());
    const cartId = uid("cart");
    await testDb.db.insert(carts).values({ id: cartId, guestToken: cartId });
    await testDb.db.insert(cartItems).values({
      id: uid("ci"),
      cartId,
      productId,
      variantId: null,
      quantity: 1,
    });

    await expectPgError(
      testDb.db.insert(cartItems).values({
        id: uid("ci"),
        cartId,
        productId,
        variantId: null,
        quantity: 2,
      }),
      UNIQUE_VIOLATION,
    );
  });

  it("rejects a cart without a user or guest token", async () => {
    await expectPgError(
      testDb.db.insert(carts).values({ id: uid("cart") }),
      CHECK_VIOLATION,
    );
  });

  it("refuses to delete a category that still has products (RESTRICT)", async () => {
    const categoryId = await insertCategory();
    await insertProduct(categoryId);
    await expectPgError(
      testDb.db.delete(categories).where(eq(categories.id, categoryId)),
      // PGlite reports restrict_violation; server Postgres 17 reports the
      // RESTRICT action as foreign_key_violation.
      [RESTRICT_VIOLATION, FOREIGN_KEY_VIOLATION],
    );
  });

  it("cascades a product delete to its images and variants", async () => {
    const productId = await insertProduct(await insertCategory());
    await testDb.db.insert(productImages).values({
      id: uid("img"),
      productId,
      url: "/images/a.jpg",
      alt: "A bottle",
    });
    await testDb.db.insert(productVariants).values({
      id: uid("var"),
      productId,
      name: "500 mg",
      sku: uid("SKU"),
      isDefault: true,
    });

    await testDb.db.delete(products).where(eq(products.id, productId));

    const images = await testDb.db
      .select()
      .from(productImages)
      .where(eq(productImages.productId, productId));
    const variants = await testDb.db
      .select()
      .from(productVariants)
      .where(eq(productVariants.productId, productId));
    expect(images).toHaveLength(0);
    expect(variants).toHaveLength(0);
  });

  it("rejects a compare-at price that is not above the price", async () => {
    const categoryId = await insertCategory();
    await expectPgError(
      insertProduct(categoryId, {
        priceCents: 4500,
        compareAtPriceCents: 4500,
      }),
      CHECK_VIOLATION,
    );
  });

  it("rejects a second default variant for the same product", async () => {
    const productId = await insertProduct(await insertCategory());
    await testDb.db.insert(productVariants).values({
      id: uid("var"),
      productId,
      name: "500 mg",
      sku: uid("SKU"),
      isDefault: true,
    });
    await expectPgError(
      testDb.db.insert(productVariants).values({
        id: uid("var"),
        productId,
        name: "1000 mg",
        sku: uid("SKU"),
        isDefault: true,
      }),
      UNIQUE_VIOLATION,
    );
  });
});
