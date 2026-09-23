import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SignUpForm } from "./sign-up-form";

const mocks = vi.hoisted(() => ({
  signUpEmail: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/lib/auth/client", () => ({
  signUp: { email: mocks.signUpEmail },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }),
}));

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function fillValidFields() {
  fill("Name", "  Maya Lin ");
  fill("Email address", "Maya@Example.com");
  fill("Password", "a-long-password");
  fill("Confirm password", "a-long-password");
}

function submit() {
  fireEvent.click(screen.getByRole("button", { name: "Create account" }));
}

describe("SignUpForm", () => {
  beforeEach(() => {
    mocks.signUpEmail.mockReset();
    mocks.replace.mockReset();
    mocks.refresh.mockReset();
  });

  it("requires the 21+ checkbox before calling the server", () => {
    render(<SignUpForm next="/account" />);
    fillValidFields();
    submit();

    const age = screen.getByLabelText("I am 21 or older");
    expect(age.getAttribute("aria-invalid")).toBe("true");
    expect(age.getAttribute("aria-describedby")).toBe("sign-up-age-error");
    expect(
      screen.getByText("You must be 21 or older to create an account."),
    ).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toBe(
      "Please fix the highlighted fields.",
    );
    expect(mocks.signUpEmail).not.toHaveBeenCalled();
  });

  it("flags mismatched passwords and a short password", () => {
    render(<SignUpForm next="/account" />);
    fill("Name", "Maya");
    fill("Email address", "maya@example.com");
    fill("Password", "short");
    fill("Confirm password", "different");
    fireEvent.click(screen.getByLabelText("I am 21 or older"));
    submit();

    expect(screen.getByText("Use at least 10 characters.")).toBeTruthy();
    expect(screen.getByText("Passwords don't match.")).toBeTruthy();
  });

  it("sends only name, email and password, then redirects", async () => {
    mocks.signUpEmail.mockResolvedValue({ data: { user: {} }, error: null });
    render(<SignUpForm next="/account" />);
    fillValidFields();
    fireEvent.click(screen.getByLabelText("I am 21 or older"));
    submit();

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/account"));
    expect(mocks.signUpEmail).toHaveBeenCalledTimes(1);
    expect(mocks.signUpEmail.mock.calls[0]).toEqual([
      {
        name: "Maya Lin",
        email: "maya@example.com",
        password: "a-long-password",
      },
    ]);
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("shows an existing-account error inline", async () => {
    mocks.signUpEmail.mockResolvedValue({
      data: null,
      error: { code: "USER_ALREADY_EXISTS", status: 422, message: "exists" },
    });
    render(<SignUpForm next="/account" />);
    fillValidFields();
    fireEvent.click(screen.getByLabelText("I am 21 or older"));
    submit();

    expect((await screen.findByRole("alert")).textContent).toBe(
      "An account with this email already exists. Sign in instead.",
    );
    expect(mocks.replace).not.toHaveBeenCalled();
  });
});
