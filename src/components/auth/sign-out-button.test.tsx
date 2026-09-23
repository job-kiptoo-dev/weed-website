import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Toaster, ToastProvider } from "@/components/ui/toast";
import { SignOutButton } from "./sign-out-button";

const mocks = vi.hoisted(() => ({
  signOut: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/lib/auth/client", () => ({ signOut: mocks.signOut }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }),
}));

function renderButton() {
  render(
    <ToastProvider>
      <SignOutButton />
      <Toaster />
    </ToastProvider>,
  );
}

describe("SignOutButton", () => {
  beforeEach(() => {
    mocks.signOut.mockReset();
    mocks.replace.mockReset();
    mocks.refresh.mockReset();
  });

  it("signs out, then goes home and refreshes", async () => {
    mocks.signOut.mockResolvedValue({ data: { success: true }, error: null });
    renderButton();
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/"));
    expect(mocks.signOut).toHaveBeenCalledTimes(1);
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("shows a toast and stays put when sign-out fails", async () => {
    mocks.signOut.mockResolvedValue({
      data: null,
      error: { status: 500, message: "boom" },
    });
    renderButton();
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

    expect(
      await screen.findByText("We couldn't sign you out. Please try again."),
    ).toBeTruthy();
    expect(mocks.replace).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeTruthy();
  });
});
