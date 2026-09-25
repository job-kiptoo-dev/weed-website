import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { siteConfig } from "@/lib/site-config";
import { ForgotPasswordForm } from "./forgot-password-form";

const mocks = vi.hoisted(() => ({ requestPasswordReset: vi.fn() }));

vi.mock("@/lib/auth/client", () => ({
  authClient: { requestPasswordReset: mocks.requestPasswordReset },
}));

const SUCCESS =
  "If an account exists for that email, we've sent a reset link. It expires in 1 hour.";
// The address comes from the config so updating the client's inbox doesn't
// break this test; the sentence around it is what's pinned here.
const DEMO_NOTICE = `Heads up: while the store is in demo mode, reset emails can only be delivered to the store owner's inbox. If nothing arrives in a few minutes, email ${siteConfig.contact.email} and we'll help you get back in.`;
const DEV_NOTICE = "Dev: the reset link is printed in the server log.";

function requestFor(email: string) {
  fireEvent.change(screen.getByLabelText("Email address"), {
    target: { value: email },
  });
  fireEvent.click(screen.getByRole("button", { name: "Send reset link" }));
}

describe("ForgotPasswordForm", () => {
  beforeEach(() => {
    mocks.requestPasswordReset.mockReset();
    mocks.requestPasswordReset.mockResolvedValue({
      data: { status: true },
      error: null,
    });
  });

  it("shows the demo delivery notice only when delivery is limited", () => {
    const { unmount } = render(<ForgotPasswordForm deliveryLimited />);
    expect(screen.getByText(DEMO_NOTICE)).toBeTruthy();
    expect(screen.queryByText(DEV_NOTICE)).toBeNull();
    unmount();

    render(<ForgotPasswordForm deliveryLimited={false} />);
    expect(screen.queryByText(DEMO_NOTICE)).toBeNull();
  });

  it("shows the dev server-log notice when asked", () => {
    render(<ForgotPasswordForm deliveryLimited linkInServerLog />);
    expect(screen.getByText(DEV_NOTICE)).toBeTruthy();
  });

  it("shows the same success message whether or not the account exists", async () => {
    const { unmount } = render(<ForgotPasswordForm deliveryLimited={false} />);
    requestFor("known@example.com");
    const known = (await screen.findByRole("status")).textContent;
    unmount();

    render(<ForgotPasswordForm deliveryLimited={false} />);
    requestFor("unknown@example.com");
    const unknown = (await screen.findByRole("status")).textContent;

    expect(known).toBe(SUCCESS);
    expect(unknown).toBe(SUCCESS);
    expect(mocks.requestPasswordReset).toHaveBeenLastCalledWith({
      email: "unknown@example.com",
      redirectTo: "/reset-password",
    });
  });

  it("validates the email before calling the server", () => {
    render(<ForgotPasswordForm deliveryLimited={false} />);
    requestFor("nope");

    expect(screen.getByRole("alert").textContent).toBe(
      "Please fix the highlighted fields.",
    );
    expect(
      screen.getByLabelText("Email address").getAttribute("aria-invalid"),
    ).toBe("true");
    expect(mocks.requestPasswordReset).not.toHaveBeenCalled();
  });

  it("shows the rate-limit message on a 429", async () => {
    mocks.requestPasswordReset.mockResolvedValue({
      data: null,
      error: { status: 429, message: "Too many requests" },
    });
    render(<ForgotPasswordForm deliveryLimited={false} />);
    requestFor("maya@example.com");

    expect((await screen.findByRole("alert")).textContent).toBe(
      "Too many attempts. Wait a minute and try again.",
    );
    expect(screen.queryByText(SUCCESS)).toBeNull();
  });
});
