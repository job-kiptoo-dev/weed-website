// @vitest-environment node
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { config, proxy } from "./proxy";

function request(path: string, cookie?: string) {
  return new NextRequest(new URL(path, "http://localhost:3001"), {
    headers: cookie ? { cookie } : {},
  });
}

describe("proxy", () => {
  it("redirects signed-out visitors to sign-in with the path and query", () => {
    const response = proxy(request("/account"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3001/sign-in?next=%2Faccount",
    );

    const nested = proxy(request("/admin/orders?page=2"));
    expect(nested.headers.get("location")).toBe(
      "http://localhost:3001/sign-in?next=%2Fadmin%2Forders%3Fpage%3D2",
    );
  });

  it.each([
    "better-auth.session_token=abc.sig",
    "__Secure-better-auth.session_token=abc.sig",
  ])("lets requests with a session cookie through (%s)", (cookie) => {
    const response = proxy(request("/account", cookie));
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("ignores unrelated cookies", () => {
    const response = proxy(request("/account", "theme=dark"));
    expect(response.status).toBe(307);
  });

  it("only matches the account and admin areas", () => {
    expect(config.matcher).toEqual(["/account/:path*", "/admin/:path*"]);
  });
});
