import { describe, expect, it } from "vitest";
import {
  buildTrustedOrigins,
  resolveBaseUrl,
  shouldUseSecureCookies,
  type AuthUrlEnv,
} from "./trusted-origins";

const PRODUCTION: AuthUrlEnv = {
  VERCEL: "1",
  VERCEL_ENV: "production",
  VERCEL_URL: "haven-botanics-abc123-captain-jobs-projects.vercel.app",
  BETTER_AUTH_URL: "https://haven-botanics.vercel.app",
};

const PREVIEW: AuthUrlEnv = {
  VERCEL: "1",
  VERCEL_ENV: "preview",
  VERCEL_URL: "haven-botanics-def456-captain-jobs-projects.vercel.app",
  VERCEL_BRANCH_URL:
    "haven-botanics-git-feature-captain-jobs-projects.vercel.app",
};

const DEVELOPMENT: AuthUrlEnv = {};

const MATRIX: [string, AuthUrlEnv][] = [
  ["production", PRODUCTION],
  ["preview", PREVIEW],
  ["development", DEVELOPMENT],
  [
    "development with BETTER_AUTH_URL",
    { BETTER_AUTH_URL: "http://localhost:3002" },
  ],
];

describe("resolveBaseUrl", () => {
  it("uses BETTER_AUTH_URL in production, as an origin", () => {
    expect(resolveBaseUrl(PRODUCTION)).toBe(
      "https://haven-botanics.vercel.app",
    );
    expect(
      resolveBaseUrl({ BETTER_AUTH_URL: "https://haven-botanics.vercel.app/" }),
    ).toBe("https://haven-botanics.vercel.app");
  });

  it("prefers the branch URL on previews, then the deployment URL", () => {
    expect(resolveBaseUrl(PREVIEW)).toBe(
      "https://haven-botanics-git-feature-captain-jobs-projects.vercel.app",
    );
    expect(resolveBaseUrl({ ...PREVIEW, VERCEL_BRANCH_URL: undefined })).toBe(
      "https://haven-botanics-def456-captain-jobs-projects.vercel.app",
    );
  });

  it("lets BETTER_AUTH_URL override the preview URL", () => {
    expect(
      resolveBaseUrl({
        ...PREVIEW,
        BETTER_AUTH_URL: "https://preview.example",
      }),
    ).toBe("https://preview.example");
  });

  it("falls back to localhost:3001 in development", () => {
    expect(resolveBaseUrl(DEVELOPMENT)).toBe("http://localhost:3001");
  });
});

describe("buildTrustedOrigins", () => {
  it("production trusts only the production origin", () => {
    expect(buildTrustedOrigins(PRODUCTION)).toEqual([
      "https://haven-botanics.vercel.app",
    ]);
  });

  it("preview trusts the branch and deployment URLs", () => {
    expect(buildTrustedOrigins(PREVIEW)).toEqual([
      "https://haven-botanics-git-feature-captain-jobs-projects.vercel.app",
      "https://haven-botanics-def456-captain-jobs-projects.vercel.app",
    ]);
  });

  it("development trusts localhost 3001 and 3002", () => {
    expect(buildTrustedOrigins(DEVELOPMENT)).toEqual([
      "http://localhost:3001",
      "http://localhost:3002",
    ]);
    expect(
      buildTrustedOrigins({ BETTER_AUTH_URL: "http://localhost:3002" }),
    ).toEqual(["http://localhost:3002", "http://localhost:3001"]);
  });

  it.each(MATRIX)("%s never trusts port 3000 or wildcards", (_name, env) => {
    const origins = buildTrustedOrigins(env);
    expect(origins.some((origin) => origin.includes(":3000"))).toBe(false);
    expect(origins.some((origin) => origin.includes("*"))).toBe(false);
  });

  it("production and preview never trust localhost", () => {
    for (const env of [PRODUCTION, PREVIEW]) {
      expect(
        buildTrustedOrigins(env).some((origin) => origin.includes("localhost")),
      ).toBe(false);
    }
  });
});

describe("shouldUseSecureCookies", () => {
  it("is on for Vercel deployments and https base URLs", () => {
    expect(shouldUseSecureCookies(PRODUCTION)).toBe(true);
    expect(shouldUseSecureCookies(PREVIEW)).toBe(true);
    expect(
      shouldUseSecureCookies({ BETTER_AUTH_URL: "https://local.example" }),
    ).toBe(true);
  });

  it("is off for the plain-http local dev server", () => {
    expect(shouldUseSecureCookies(DEVELOPMENT)).toBe(false);
  });
});
