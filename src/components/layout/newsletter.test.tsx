import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Newsletter } from "./newsletter";

describe("Newsletter", () => {
  it("shows a field error for an invalid email", () => {
    render(<Newsletter />);
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "not-an-email" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Subscribe" }));
    expect(screen.getByText("Enter a valid email address.")).toBeTruthy();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("shows the success state for a valid email", () => {
    render(<Newsletter />);
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "maya@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Subscribe" }));
    expect(screen.getByRole("status").textContent).toBe(
      "Thanks. You're on the list.",
    );
    expect(screen.queryByRole("button", { name: "Subscribe" })).toBeNull();
  });
});
