import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccountNavLink } from "./account-nav-link";

const mocks = vi.hoisted(() => ({ useSession: vi.fn() }));

vi.mock("@/lib/auth/client", () => ({ useSession: mocks.useSession }));

function sessionState(data: unknown, isPending: boolean) {
  mocks.useSession.mockReturnValue({ data, isPending, error: null });
}

describe("AccountNavLink", () => {
  beforeEach(() => {
    mocks.useSession.mockReset();
  });

  it("shows a neutral Account link while the session loads", () => {
    sessionState(null, true);
    render(<AccountNavLink />);
    const link = screen.getByRole("link");
    expect(link.textContent).toBe("Account");
    expect(link.getAttribute("href")).toBe("/account");
  });

  it("shows Sign in when signed out", () => {
    sessionState(null, false);
    render(<AccountNavLink />);
    const link = screen.getByRole("link");
    expect(link.textContent).toBe("Sign in");
    expect(link.getAttribute("href")).toBe("/sign-in");
  });

  it("shows Account when signed in and calls onNavigate on click", () => {
    const onNavigate = vi.fn();
    sessionState({ user: { name: "Maya" }, session: {} }, false);
    render(<AccountNavLink className="nav" onNavigate={onNavigate} />);
    const link = screen.getByRole("link", { name: "Account" });
    expect(link.getAttribute("href")).toBe("/account");
    expect(link.className).toBe("nav");
    // jsdom can't navigate; stop the browser default after React handles it.
    link.addEventListener("click", (event) => event.preventDefault());
    link.click();
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });
});
