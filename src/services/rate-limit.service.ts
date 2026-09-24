/**
 * App-level rate limiting, backed by the `rate_limits` table.
 * `createRateLimitService` takes the database and a clock so tests can inject
 * both; `rateLimitService` is bound to the app database and `Date.now`.
 *
 * Counters are fixed windows aligned to the epoch (see `@/lib/rate-limit`).
 * The storage is the database, not memory, because every serverless instance
 * has its own memory and would each grant the full budget.
 *
 * Callers get a decision, never a thrown error: turning a block into a
 * user-facing message is the caller's job (checkout uses `RateLimitError`).
 */
import { and, eq, lt, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { rateLimits } from "@/lib/db/schema";
import type { Database } from "@/lib/db/types";
import { windowStartMs, type RateLimitBudget } from "@/lib/rate-limit";

export interface RateLimitServiceDeps {
  getDb: () => Promise<Database>;
  /** Defaults to `Date.now`. */
  now?: () => number;
}

export interface RateLimitDecision {
  /** False once the budget is spent; the hit has still been counted. */
  ok: boolean;
  /** Hits in the current window, this one included. */
  count: number;
  limit: number;
  /** Milliseconds until the window rolls over. For server logs only. */
  retryAfterMs: number;
}

/**
 * Spent counters are dropped this long after their window started. Without
 * this the table only grows: a hammered endpoint leaves one row per key per
 * window forever.
 */
const RETENTION_MS = 24 * 60 * 60 * 1000;

export function createRateLimitService({
  getDb,
  now = Date.now,
}: RateLimitServiceDeps) {
  /**
   * Counts one hit against `key`. The insert-or-increment is a single
   * statement, so parallel requests each see their own count and a burst
   * cannot slip through the way a read-then-write check would.
   */
  async function consume(
    key: string,
    budget: RateLimitBudget,
  ): Promise<RateLimitDecision> {
    const nowMs = now();
    const startMs = windowStartMs(nowMs, budget.windowMs);
    const db = await getDb();

    const [row] = await db
      .insert(rateLimits)
      .values({ key, windowStart: new Date(startMs), count: 1 })
      .onConflictDoUpdate({
        target: [rateLimits.key, rateLimits.windowStart],
        set: { count: sql`${rateLimits.count} + 1` },
      })
      .returning({ count: rateLimits.count });
    if (!row) throw new Error("The rate limit counter returned no row.");

    // Only when this key opened a new window, so the sweep runs about as
    // often as windows roll over rather than on every request.
    if (row.count === 1) await prune(db, nowMs);

    return {
      ok: row.count <= budget.limit,
      count: row.count,
      limit: budget.limit,
      retryAfterMs: startMs + budget.windowMs - nowMs,
    };
  }

  /**
   * True the first time `key` is seen in its window, false afterwards. Marks
   * one distinct thing (a coupon code tried by an IP) without counting
   * repeats of it, so a caller can budget distinct values instead of hits.
   */
  async function firstUseInWindow(
    key: string,
    windowMs: number,
  ): Promise<boolean> {
    const windowStart = new Date(windowStartMs(now(), windowMs));
    const db = await getDb();
    const inserted = await db
      .insert(rateLimits)
      .values({ key, windowStart, count: 1 })
      .onConflictDoNothing()
      .returning({ key: rateLimits.key });
    return inserted.length > 0;
  }

  /**
   * Whether `key` has already been marked in its window, without marking it.
   * Lets a caller read the marker before spending a budget on it, so an
   * attempt the budget rejects leaves nothing behind and is charged again on
   * its next try.
   */
  async function seenInWindow(key: string, windowMs: number): Promise<boolean> {
    const windowStart = new Date(windowStartMs(now(), windowMs));
    const db = await getDb();
    const rows = await db
      .select({ key: rateLimits.key })
      .from(rateLimits)
      .where(
        and(eq(rateLimits.key, key), eq(rateLimits.windowStart, windowStart)),
      )
      .limit(1);
    return rows.length > 0;
  }

  async function prune(db: Database, nowMs: number): Promise<void> {
    await db
      .delete(rateLimits)
      .where(lt(rateLimits.windowStart, new Date(nowMs - RETENTION_MS)));
  }

  return { consume, firstUseInWindow, seenInWindow };
}

export type RateLimitService = ReturnType<typeof createRateLimitService>;

export const rateLimitService: RateLimitService = createRateLimitService({
  getDb,
});
