// @vitest-environment node
import { count, eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { rateLimits } from "@/lib/db/schema";
import { HOUR_MS, MINUTE_MS, type RateLimitBudget } from "@/lib/rate-limit";
import { createTestDb, type TestDb } from "@/test/db";
import { createRateLimitService } from "./rate-limit.service";

let testDb: TestDb;

beforeAll(async () => {
  testDb = await createTestDb();
}, 30_000);

afterAll(async () => {
  await testDb?.close();
});

beforeEach(async () => {
  await testDb.db.delete(rateLimits);
});

/** A clock the tests move by hand, so no test waits on a real window. */
function clock(startMs: number) {
  let nowMs = startMs;
  return {
    now: () => nowMs,
    advance: (ms: number) => {
      nowMs += ms;
    },
  };
}

function service(now: () => number) {
  return createRateLimitService({ getDb: async () => testDb.db, now });
}

const THREE_PER_MINUTE: RateLimitBudget = { limit: 3, windowMs: MINUTE_MS };

/** Mid-window, so a window boundary is never hit by accident. */
const START_MS = Date.UTC(2026, 8, 24, 12, 30, 17);

describe("consume", () => {
  it("passes every hit up to the limit", async () => {
    const { consume } = service(clock(START_MS).now);

    const first = await consume("k1", THREE_PER_MINUTE);
    const second = await consume("k1", THREE_PER_MINUTE);
    const third = await consume("k1", THREE_PER_MINUTE);

    expect([first.ok, second.ok, third.ok]).toEqual([true, true, true]);
    expect([first.count, second.count, third.count]).toEqual([1, 2, 3]);
    expect(first.limit).toBe(3);
  });

  it("blocks once the budget is spent, and keeps blocking", async () => {
    const { consume } = service(clock(START_MS).now);
    for (let hit = 0; hit < 3; hit += 1) {
      await consume("k1", THREE_PER_MINUTE);
    }

    const blocked = await consume("k1", THREE_PER_MINUTE);
    const stillBlocked = await consume("k1", THREE_PER_MINUTE);

    expect(blocked).toMatchObject({ ok: false, count: 4, limit: 3 });
    expect(stillBlocked.ok).toBe(false);
  });

  it("reports how long is left of the window", async () => {
    const time = clock(START_MS);
    const { consume } = service(time.now);

    const first = await consume("k1", THREE_PER_MINUTE);
    time.advance(10_000);
    const later = await consume("k1", THREE_PER_MINUTE);

    expect(first.retryAfterMs).toBeGreaterThan(0);
    expect(first.retryAfterMs).toBeLessThanOrEqual(MINUTE_MS);
    expect(later.retryAfterMs).toBe(first.retryAfterMs - 10_000);
  });

  it("starts a fresh budget when the window expires", async () => {
    const time = clock(START_MS);
    const { consume } = service(time.now);
    for (let hit = 0; hit < 4; hit += 1) {
      await consume("k1", THREE_PER_MINUTE);
    }

    time.advance(MINUTE_MS);
    const afterWindow = await consume("k1", THREE_PER_MINUTE);

    expect(afterWindow).toMatchObject({ ok: true, count: 1 });
  });

  it("counts each key on its own", async () => {
    const { consume } = service(clock(START_MS).now);
    for (let hit = 0; hit < 4; hit += 1) {
      await consume("k1", THREE_PER_MINUTE);
    }

    const other = await consume("k2", THREE_PER_MINUTE);

    expect(other).toMatchObject({ ok: true, count: 1 });
  });

  it("counts a parallel burst in full", async () => {
    const { consume } = service(clock(START_MS).now);

    const decisions = await Promise.all(
      Array.from({ length: 6 }, () => consume("k1", THREE_PER_MINUTE)),
    );

    expect(decisions.filter((decision) => decision.ok)).toHaveLength(3);
    expect(decisions.map((decision) => decision.count).toSorted()).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);
  });

  it("drops counters more than a day old, and keeps live ones", async () => {
    const time = clock(START_MS);
    const { consume } = service(time.now);
    await consume("stale", THREE_PER_MINUTE);

    time.advance(25 * HOUR_MS);
    // A new window for this key, which is what triggers the sweep.
    await consume("fresh", THREE_PER_MINUTE);

    const rows = await testDb.db
      .select({ key: rateLimits.key })
      .from(rateLimits);
    expect(rows.map((row) => row.key)).toEqual(["fresh"]);
  });
});

describe("firstUseInWindow", () => {
  it("is true once per key per window", async () => {
    const time = clock(START_MS);
    const { firstUseInWindow } = service(time.now);

    expect(await firstUseInWindow("code:A", HOUR_MS)).toBe(true);
    expect(await firstUseInWindow("code:A", HOUR_MS)).toBe(false);
    expect(await firstUseInWindow("code:B", HOUR_MS)).toBe(true);

    time.advance(HOUR_MS);
    expect(await firstUseInWindow("code:A", HOUR_MS)).toBe(true);
  });

  it("marks the key without spending a counter for it", async () => {
    const { firstUseInWindow } = service(clock(START_MS).now);

    await firstUseInWindow("code:A", HOUR_MS);
    await firstUseInWindow("code:A", HOUR_MS);

    const [row] = await testDb.db
      .select({ hits: count() })
      .from(rateLimits)
      .where(eq(rateLimits.key, "code:A"));
    expect(row?.hits).toBe(1);
  });
});

describe("seenInWindow", () => {
  it("reads the marker without ever writing one", async () => {
    const { firstUseInWindow, seenInWindow } = service(clock(START_MS).now);

    expect(await seenInWindow("code:A", HOUR_MS)).toBe(false);
    // Still false: reading must not be what marks the key, or a caller could
    // never check before deciding whether to mark.
    expect(await seenInWindow("code:A", HOUR_MS)).toBe(false);

    await firstUseInWindow("code:A", HOUR_MS);

    expect(await seenInWindow("code:A", HOUR_MS)).toBe(true);
    expect(await seenInWindow("code:B", HOUR_MS)).toBe(false);
  });

  it("sees nothing once the window has rolled over", async () => {
    const time = clock(START_MS);
    const { firstUseInWindow, seenInWindow } = service(time.now);
    await firstUseInWindow("code:A", HOUR_MS);

    time.advance(HOUR_MS);

    expect(await seenInWindow("code:A", HOUR_MS)).toBe(false);
  });
});
