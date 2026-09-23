// @vitest-environment node
import { verifyPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDevDb, seedDevDatabase, type DevDb } from "./dev-db";
import { accounts, users } from "./schema";
import { buildSeedCatalog } from "./seed-data/catalog";
import { DEV_ACCOUNT_PASSWORD } from "./seed-data/dev-accounts";
import { countSeededRows } from "./seed/insert";

const catalog = buildSeedCatalog();

let devDb: DevDb;
let startupMs = 0;

beforeAll(async () => {
  const started = performance.now();
  devDb = await createDevDb({ seed: seedDevDatabase });
  startupMs = performance.now() - started;
}, 30_000);

afterAll(async () => {
  await devDb?.close();
});

describe("createDevDb with the dev seed", () => {
  it("starts in under 5 seconds", () => {
    expect(startupMs).toBeLessThan(5_000);
  });

  it("holds the full demo data", async () => {
    const counts = await countSeededRows(devDb.db);
    expect(counts).toMatchObject({
      users: 5,
      categories: 8,
      products: catalog.products.length,
      product_images: catalog.productImages.length,
      reviews: 42,
      orders: 10,
      discount_codes: 2,
    });
  });

  it("uses the public dev accounts, which pass verifyPassword", async () => {
    const rows = await devDb.db
      .select({ email: users.email, role: users.role, hash: accounts.password })
      .from(users)
      .innerJoin(accounts, eq(accounts.userId, users.id));
    expect(rows.map((row) => row.email).sort()).toEqual([
      "ada@botanicssupply.test",
      "admin@botanicssupply.test",
      "ben@botanicssupply.test",
      "cara@botanicssupply.test",
      "dev@botanicssupply.test",
    ]);

    const admin = rows.find((row) => row.email === "admin@botanicssupply.test");
    expect(admin?.role).toBe("admin");
    expect(
      await verifyPassword({
        hash: admin?.hash ?? "",
        password: DEV_ACCOUNT_PASSWORD,
      }),
    ).toBe(true);
    expect(
      await verifyPassword({
        hash: admin?.hash ?? "",
        password: "wrong-password",
      }),
    ).toBe(false);
  });
});
