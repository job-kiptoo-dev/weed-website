import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { siteConfig } from "@/lib/site-config";
import { ContactForm } from "./contact-form";

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function submit() {
  fireEvent.click(screen.getByRole("button", { name: "Send message" }));
}

describe("ContactForm", () => {
  it("shows per-field errors and an alert summary for an empty submit", () => {
    render(<ContactForm />);
    submit();

    expect(screen.getByRole("alert").textContent).toBe(
      "Please fix the highlighted fields.",
    );
    expect(
      screen.getByText("Enter your name (at least 2 characters)."),
    ).toBeTruthy();
    expect(screen.getByText("Enter a valid email address.")).toBeTruthy();
    expect(
      screen.getByText("Enter a subject (at least 3 characters)."),
    ).toBeTruthy();
    expect(
      screen.getByText("Enter a message of at least 20 characters."),
    ).toBeTruthy();
    expect(screen.getByLabelText("Name").getAttribute("aria-invalid")).toBe(
      "true",
    );
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("only flags the invalid fields and clears an error once edited", () => {
    render(<ContactForm />);
    fill("Name", "Maya");
    fill("Email address", "not-an-email");
    fill("Subject", "Lab report");
    fill("Message", "Could you send the COA for batch 2041, please?");
    submit();

    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText("Enter a valid email address.")).toBeTruthy();
    expect(
      screen.queryByText("Enter your name (at least 2 characters)."),
    ).toBeNull();
    expect(screen.getByLabelText("Name").getAttribute("aria-invalid")).toBe(
      null,
    );

    fill("Email address", "maya@example.com");
    expect(screen.queryByText("Enter a valid email address.")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows the info message instead of a success state on a valid submit", () => {
    render(<ContactForm />);
    fill("Name", "Maya");
    fill("Email address", "maya@example.com");
    fill("Subject", "Lab report");
    fill("Message", "Could you send the COA for batch 2041, please?");
    submit();

    expect(screen.getByRole("status").textContent).toBe(
      `Sending isn't wired up yet. Email us at ${siteConfig.contact.email} in the meantime.`,
    );
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByText(/thanks|sent/i)).toBeNull();
    expect(screen.getByRole("button", { name: "Send message" })).toBeTruthy();
  });
});
