import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SignInForm } from "./sign-in-form";

const mocks = vi.hoisted(() => ({
  signInEmail: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/lib/auth/client", () => ({
  signIn: { email: mocks.signInEmail },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }),
}));

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function submit() {
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
}

describe("SignInForm", () => {
  beforeEach(() => {
    mocks.signInEmail.mockReset();
    mocks.replace.mockReset();
    mocks.refresh.mockReset();
  });

  it("shows accessible field errors and does not call the server", () => {
    render(<SignInForm next="/account" />);
    submit();

    expect(screen.getByRole("alert").textContent).toBe(
      "Please fix the highlighted fields.",
    );
    const email = screen.getByLabelText("Email address");
    expect(email.getAttribute("aria-invalid")).toBe("true");
    expect(email.getAttribute("aria-describedby")).toBe("sign-in-email-error");
    expect(screen.getByText("Enter a valid email address.")).toBeTruthy();
    expect(screen.getByText("Enter your password.")).toBeTruthy();
    expect(mocks.signInEmail).not.toHaveBeenCalled();
  });

  it("maps a server error to friendly copy", async () => {
    mocks.signInEmail.mockResolvedValue({
      data: null,
      error: {
        code: "INVALID_EMAIL_OR_PASSWORD",
        status: 401,
        message: "Invalid email or password",
      },
    });
    render(<SignInForm next="/account" />);
    fill("Email address", "maya@example.com");
    fill("Password", "wrong-password");
    submit();

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe("Email or password is incorrect.");
    expect(mocks.replace).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeTruthy();
  });

  it("treats a 429 as rate limited", async () => {
    mocks.signInEmail.mockResolvedValue({
      data: null,
      error: { code: undefined, status: 429, message: "Too many requests" },
    });
    render(<SignInForm next="/account" />);
    fill("Email address", "maya@example.com");
    fill("Password", "whatever");
    submit();

    expect((await screen.findByRole("alert")).textContent).toBe(
      "Too many attempts. Wait a minute and try again.",
    );
  });

  it("shows a loading state, then redirects to next on success", async () => {
    let resolve: (value: unknown) => void = () => {};
    mocks.signInEmail.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    render(<SignInForm next="/account/orders?page=2" />);
    fill("Email address", "  Maya@Example.com ");
    fill("Password", "correct-password");
    submit();

    const busy = screen.getByRole("button", { name: "Signing in…" });
    expect(busy.hasAttribute("disabled")).toBe(true);
    expect(busy.getAttribute("aria-busy")).toBe("true");
    expect(mocks.signInEmail).toHaveBeenCalledWith({
      email: "maya@example.com",
      password: "correct-password",
    });

    resolve({ data: { user: {} }, error: null });
    await waitFor(() =>
      expect(mocks.replace).toHaveBeenCalledWith("/account/orders?page=2"),
    );
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("shows the password updated status after a reset", () => {
    render(<SignInForm next="/account" passwordReset />);
    expect(screen.getByRole("status").textContent).toBe(
      "Password updated. Sign in with your new password.",
    );
  });

  it("keeps a custom next on the sign-up link", () => {
    render(<SignInForm next="/checkout" />);
    const link = within(screen.getByText(/New here/)).getByRole("link");
    expect(link.getAttribute("href")).toBe("/sign-up?next=%2Fcheckout");
  });
});
