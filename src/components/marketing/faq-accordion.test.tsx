import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { FaqItem } from "@/types/content";
import { FAQAccordion } from "./faq-accordion";

const items: FaqItem[] = [
  { id: "faq-a", question: "First question?", answer: "First answer." },
  { id: "faq-b", question: "Second question?", answer: "Second answer." },
  { id: "faq-c", question: "Third question?", answer: "Third answer." },
];

describe("FAQAccordion", () => {
  it("opens only the first question with defaultOpenFirst", () => {
    render(<FAQAccordion items={items} defaultOpenFirst />);
    const [first, second] = screen.getAllByRole("button");
    expect(first.getAttribute("aria-expanded")).toBe("true");
    expect(second.getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByText("First answer.")).toBeTruthy();
  });

  it("links to all questions when the list is limited", () => {
    render(<FAQAccordion items={items} limit={2} moreHref="/faq" />);
    expect(screen.getAllByRole("button")).toHaveLength(2);
    const more = screen.getByRole("link", { name: "Read all questions" });
    expect(more.getAttribute("href")).toBe("/faq");
  });
});
