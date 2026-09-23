import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ResetPasswordForm } from "./reset-password-form";

const mocks = vi.hoisted(() => ({
  resetPassword: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("@/lib/auth/client", () => ({
  authClient: { resetPassword: mocks.resetPassword },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace, refresh: vi.fn() }),
}));

function fillPasswords(password: string, confirm = password) {
  fireEvent.change(screen.getByLabelText("New password"), {
    target: { value: password },
  });
  fireEvent.change(screen.getByLabelText("Confirm new password"), {
    target: { value: confirm },
  });
  fireEvent.click(screen.getByRole("button", { name: "Set new password" }));
}

describe("ResetPasswordForm", () => {
  beforeEach(() => {
    mocks.resetPassword.mockReset();
    mocks.replace.mockReset();
  });

  it("shows an error and a new-link path when the token is missing", () => {
    render(<ResetPasswordForm token={null} />);

    expect(screen.getByRole("alert").textContent).toBe(
      "This reset link is invalid or has expired.",
    );
    expect(
      screen
        .getByRole("link", { name: "Request a new reset link" })
        .getAttribute("href"),
    ).toBe("/forgot-password");
    expect(screen.queryByLabelText("New password")).toBeNull();
  });

  it("resets the password and goes to sign-in", async () => {
    mocks.resetPassword.mockResolvedValue({
      data: { status: true },
      error: null,
    });
    render(<ResetPasswordForm token="tok_123" />);
    fillPasswords("a-long-password");

    await waitFor(() =>
      expect(mocks.replace).toHaveBeenCalledWith("/sign-in?reset=1"),
    );
    expect(mocks.resetPassword).toHaveBeenCalledWith({
      newPassword: "a-long-password",
      token: "tok_123",
    });
  });

  it("shows the invalid-link error when the server rejects the token", async () => {
    mocks.resetPassword.mockResolvedValue({
      data: null,
      error: { code: "INVALID_TOKEN", status: 400, message: "Invalid token" },
    });
    render(<ResetPasswordForm token="expired" />);
    fillPasswords("a-long-password");

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain(
      "This reset link is invalid or has expired.",
    );
    expect(
      screen.getByRole("link", { name: "Request a new reset link" }),
    ).toBeTruthy();
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("validates the new password locally", () => {
    render(<ResetPasswordForm token="tok_123" />);
    fillPasswords("short", "other");

    expect(screen.getByText("Use at least 10 characters.")).toBeTruthy();
    expect(screen.getByText("Passwords don't match.")).toBeTruthy();
    expect(mocks.resetPassword).not.toHaveBeenCalled();
  });
});
