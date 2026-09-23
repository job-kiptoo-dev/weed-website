import { describe, expect, it } from "vitest";
import { describeDbHost, selectDbTarget } from "./target";

const NEON_URL =
  "postgres://user:hunter2@ep-example-pooler.us-east-2.aws.neon.tech/neondb";

describe("selectDbTarget", () => {
  it("throws under Vitest even when Neon would otherwise be chosen", () => {
    expect(() =>
      selectDbTarget({ VITEST: "true", VERCEL: "1", DATABASE_URL: NEON_URL }),
    ).toThrow(/disabled under Vitest/);
  });

  it("uses Neon on Vercel", () => {
    expect(selectDbTarget({ VERCEL: "1", DATABASE_URL: NEON_URL })).toEqual({
      kind: "neon",
      url: NEON_URL,
      reason: "vercel",
    });
  });

  it("uses Neon locally only with USE_NEON_LOCALLY=1", () => {
    expect(
      selectDbTarget({ USE_NEON_LOCALLY: "1", DATABASE_URL: NEON_URL }),
    ).toEqual({
      kind: "neon",
      url: NEON_URL,
      reason: "use-neon-locally",
    });
    expect(
      selectDbTarget({ USE_NEON_LOCALLY: "0", DATABASE_URL: NEON_URL }),
    ).toEqual({
      kind: "pglite",
    });
  });

  it("uses PGlite locally and ignores DATABASE_URL", () => {
    expect(selectDbTarget({ DATABASE_URL: NEON_URL })).toEqual({
      kind: "pglite",
    });
    expect(selectDbTarget({})).toEqual({ kind: "pglite" });
  });

  it("requires DATABASE_URL for the Neon target", () => {
    expect(() => selectDbTarget({ VERCEL: "1" })).toThrow(
      /DATABASE_URL is required/,
    );
    expect(() => selectDbTarget({ USE_NEON_LOCALLY: "1" })).toThrow(
      /DATABASE_URL is required/,
    );
  });
});

describe("describeDbHost", () => {
  it("returns only the hostname", () => {
    const host = describeDbHost(NEON_URL);
    expect(host).toBe("ep-example-pooler.us-east-2.aws.neon.tech");
    expect(host).not.toContain("hunter2");
  });

  it("does not echo an unparseable URL", () => {
    expect(describeDbHost("not a url hunter2")).toBe("(invalid database URL)");
  });
});
