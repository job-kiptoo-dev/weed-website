import { hashPassword } from "better-auth/crypto";
import { getTableName, is, sql } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import { productSpecsSchema } from "@/lib/validation/product.schema";
import { buildSeedCatalog, type SeedCatalog } from "../seed-data/catalog";
import {
  contactMessageSpecs,
  discountCodeSpecs,
  newsletterSubscriberSpecs,
} from "../seed-data/marketing";
import { orderSpecs } from "../seed-data/orders";
import {
  ADMIN_CREATED_AT,
  ADMIN_NAME,
  ADMIN_USER_ID,
  customerProfiles,
  wishlistSpecs,
} from "../seed-data/people";
import * as schema from "../schema";
import {
  accounts,
  addresses,
  categories,
  contactMessages,
  discountCodes,
  newsletterSubscribers,
  orderItems,
  orders,
  productImages,
  products,
  productVariants,
  reviews,
  users,
  wishlistItems,
} from "../schema";
import type { Database } from "../types";
import type { SeedAccounts } from "./accounts";
import { buildOrderRows } from "./orders";

/** Order numbers start here (`order_number_seq` starts at 100001). */
const FIRST_ORDER_NUMBER = 100001;

export type SeedOptions =
  | { accounts: SeedAccounts; catalogOnly?: false }
  /** Only the catalog: no users, reviews, orders or marketing rows. */
  | { catalogOnly: true };

/** Every table in `src/lib/db/schema` (never the drizzle migrations schema). */
function appTables(): PgTable[] {
  const exports: unknown[] = Object.values(schema);
  return exports.filter((value): value is PgTable => is(value, PgTable));
}

/** Empties every app and auth table. */
export async function truncateAll(db: Database): Promise<void> {
  const tables = appTables().map((table) => sql`${table}`);
  await db.execute(
    sql`truncate table ${sql.join(tables, sql`, `)} restart identity cascade`,
  );
}

/**
 * `order_number_seq` is a standalone sequence, so TRUNCATE ... RESTART
 * IDENTITY does not reset it. Point it just past the seeded orders so the
 * next real order continues the sequence.
 */
async function resetOrderNumberSeq(
  db: Database,
  highestSeeded: number | null,
): Promise<void> {
  if (highestSeeded === null) {
    await db.execute(
      sql`select setval('order_number_seq', ${FIRST_ORDER_NUMBER}, false)`,
    );
  } else {
    await db.execute(
      sql`select setval('order_number_seq', ${highestSeeded}, true)`,
    );
  }
}

const toDate = (iso: string) => new Date(iso);

/**
 * `products.specs` is jsonb, so the database can't check its shape. Fail the
 * seed on the first product whose specs don't match `productSpecsSchema`.
 */
export function assertValidSpecs(catalog: SeedCatalog): void {
  for (const product of catalog.products) {
    if (product.specs === null) continue;
    const result = productSpecsSchema.safeParse(product.specs);
    if (!result.success) {
      const problems = result.error.issues
        .map((issue) => `${issue.path.join(".") || "specs"}: ${issue.message}`)
        .join("; ");
      throw new Error(
        `Seed catalog: invalid specs for "${product.slug}": ${problems}`,
      );
    }
  }
}

export async function insertCatalog(
  db: Database,
  catalog: SeedCatalog,
): Promise<void> {
  assertValidSpecs(catalog);
  await db.insert(categories).values(
    catalog.categories.map((c) => ({
      ...c,
      createdAt: toDate(c.createdAt),
      updatedAt: toDate(c.updatedAt),
    })),
  );
  await db.insert(products).values(
    catalog.products.map((p) => ({
      ...p,
      createdAt: toDate(p.createdAt),
      updatedAt: toDate(p.updatedAt),
    })),
  );
  const productCreatedAt = new Map(
    catalog.products.map((p) => [p.id, toDate(p.createdAt)]),
  );
  const createdAtOf = (productId: string) => {
    const date = productCreatedAt.get(productId);
    if (!date) throw new Error(`Seed catalog: unknown product "${productId}"`);
    return { createdAt: date, updatedAt: date };
  };
  await db
    .insert(productImages)
    .values(
      catalog.productImages.map((i) => ({ ...i, ...createdAtOf(i.productId) })),
    );
  await db.insert(productVariants).values(
    catalog.productVariants.map((v) => ({
      ...v,
      ...createdAtOf(v.productId),
    })),
  );
}

/** Historical reviews have no account behind them: `user_id` is null. */
export async function insertReviews(
  db: Database,
  catalog: SeedCatalog,
): Promise<void> {
  await db.insert(reviews).values(
    catalog.reviews.map((r) => ({
      id: r.id,
      productId: r.productId,
      userId: null,
      authorName: r.authorName,
      rating: r.rating,
      title: r.title,
      body: r.body,
      status: r.status,
      createdAt: toDate(r.createdAt),
      updatedAt: toDate(r.updatedAt),
    })),
  );
}

export interface HashedAccounts {
  admin: { email: string; passwordHash: string };
  customers: Map<string, { email: string; passwordHash: string }>;
}

/**
 * Hashes each distinct password once (Better Auth scrypt is deliberately
 * slow; the dev accounts share one password, so dev startup hashes once).
 */
export async function hashAccounts(
  accounts: SeedAccounts,
): Promise<HashedAccounts> {
  const cache = new Map<string, Promise<string>>();
  const hash = (password: string) => {
    let pending = cache.get(password);
    if (!pending) {
      pending = hashPassword(password);
      cache.set(password, pending);
    }
    return pending;
  };

  const customers = new Map<string, { email: string; passwordHash: string }>();
  for (const profile of customerProfiles) {
    const credentials = accounts.customers[profile.handle];
    customers.set(profile.id, {
      email: credentials.email.toLowerCase(),
      passwordHash: await hash(credentials.password),
    });
  }
  return {
    admin: {
      email: accounts.admin.email.toLowerCase(),
      passwordHash: await hash(accounts.admin.password),
    },
    customers,
  };
}

export async function insertPeople(
  db: Database,
  hashed: HashedAccounts,
): Promise<void> {
  const adminCreatedAt = toDate(ADMIN_CREATED_AT);
  await db.insert(users).values([
    {
      id: ADMIN_USER_ID,
      name: ADMIN_NAME,
      email: hashed.admin.email,
      emailVerified: true,
      role: "admin",
      createdAt: adminCreatedAt,
      updatedAt: adminCreatedAt,
    },
    ...customerProfiles.map((profile) => {
      const createdAt = toDate(profile.createdAt);
      return {
        id: profile.id,
        name: profile.name,
        email: customerEmail(hashed, profile.id),
        emailVerified: true,
        role: "customer" as const,
        phone: profile.phone,
        createdAt,
        updatedAt: createdAt,
      };
    }),
  ]);

  await db.insert(accounts).values([
    credentialAccount(ADMIN_USER_ID, hashed.admin.passwordHash, adminCreatedAt),
    ...customerProfiles.map((profile) => {
      const entry = hashed.customers.get(profile.id);
      if (!entry) throw new Error(`Seed: no account for "${profile.id}"`);
      return credentialAccount(
        profile.id,
        entry.passwordHash,
        toDate(profile.createdAt),
      );
    }),
  ]);

  await db.insert(addresses).values(
    customerProfiles.map((profile) => {
      const createdAt = toDate(profile.createdAt);
      return {
        id: `addr_${profile.handle}`,
        userId: profile.id,
        label: "Home",
        fullName: profile.address.fullName,
        line1: profile.address.line1,
        line2: profile.address.line2,
        city: profile.address.city,
        state: profile.address.state,
        postalCode: profile.address.postalCode,
        country: profile.address.country,
        phone: profile.address.phone,
        isDefaultShipping: true,
        isDefaultBilling: true,
        createdAt,
        updatedAt: createdAt,
      };
    }),
  );

  await db.insert(wishlistItems).values(
    wishlistSpecs.map((item) => {
      const profile = customerProfiles.find((p) => p.handle === item.customer);
      if (!profile)
        throw new Error(`Seed: unknown customer "${item.customer}"`);
      return {
        userId: profile.id,
        productId: `prod_${item.product}`,
        createdAt: toDate(item.createdAt),
      };
    }),
  );
}

function customerEmail(hashed: HashedAccounts, userId: string): string {
  const entry = hashed.customers.get(userId);
  if (!entry) throw new Error(`Seed: no account for "${userId}"`);
  return entry.email;
}

/** Better Auth email/password account: the hash lives on the account row. */
function credentialAccount(userId: string, passwordHash: string, at: Date) {
  return {
    id: `acct_${userId}`,
    accountId: userId,
    providerId: "credential",
    userId,
    password: passwordHash,
    createdAt: at,
    updatedAt: at,
  };
}

export async function insertOrders(
  db: Database,
  catalog: SeedCatalog,
  hashed: HashedAccounts,
): Promise<number | null> {
  const rows = buildOrderRows({
    catalog,
    specs: orderSpecs,
    customers: customerProfiles,
    customerEmails: new Map(
      [...hashed.customers].map(([id, entry]) => [id, entry.email]),
    ),
    discountCodes: discountCodeSpecs,
  });
  if (rows.orders.length === 0) return null;
  await db.insert(orders).values(rows.orders);
  await db.insert(orderItems).values(rows.orderItems);
  return Math.max(...orderSpecs.map((spec) => spec.number));
}

export async function insertMarketing(db: Database): Promise<void> {
  await db.insert(discountCodes).values(
    discountCodeSpecs.map((code) => ({
      id: code.id,
      code: code.code,
      type: code.type,
      value: code.value,
      minSubtotalCents: code.minSubtotalCents,
      active: true,
      expiresAt: code.expiresAt ? toDate(code.expiresAt) : null,
      maxUses: code.maxUses,
      uses: orderSpecs.filter((order) => order.discountCode === code.code)
        .length,
      createdAt: toDate(code.createdAt),
      updatedAt: toDate(code.createdAt),
    })),
  );
  await db.insert(newsletterSubscribers).values(
    newsletterSubscriberSpecs.map((s) => ({
      id: s.id,
      email: s.email,
      createdAt: toDate(s.createdAt),
    })),
  );
  await db.insert(contactMessages).values(
    contactMessageSpecs.map((m) => ({
      ...m,
      createdAt: toDate(m.createdAt),
      handledAt: m.handledAt ? toDate(m.handledAt) : null,
    })),
  );
}

/**
 * Truncates every app and auth table and reseeds it in one transaction, so a
 * failed run leaves the previous data in place and re-running is
 * idempotent. Shared by `pnpm db:seed --target=neon` and the local
 * in-memory database (`createDevDb`). Passwords are hashed before the
 * transaction opens.
 */
export async function seedDatabase(
  db: Database,
  options: SeedOptions,
): Promise<void> {
  const catalog = buildSeedCatalog();
  const hashed = options.catalogOnly
    ? null
    : await hashAccounts(options.accounts);

  await db.transaction(async (tx) => {
    await truncateAll(tx);
    await insertCatalog(tx, catalog);
    let highestOrderNumber: number | null = null;
    if (hashed) {
      await insertPeople(tx, hashed);
      await insertReviews(tx, catalog);
      await insertMarketing(tx);
      highestOrderNumber = await insertOrders(tx, catalog, hashed);
    }
    await resetOrderNumberSeq(tx, highestOrderNumber);
  });
}

/** Row counts per seeded table, for the CLI summary and tests. */
export async function countSeededRows(
  db: Database,
): Promise<Record<string, number>> {
  const counted = {
    users,
    accounts,
    addresses,
    categories,
    products,
    productImages,
    productVariants,
    reviews,
    orders,
    orderItems,
    discountCodes,
    wishlistItems,
    newsletterSubscribers,
    contactMessages,
  };
  const counts: Record<string, number> = {};
  for (const table of Object.values(counted)) {
    counts[getTableName(table)] = await db.$count(table);
  }
  return counts;
}
