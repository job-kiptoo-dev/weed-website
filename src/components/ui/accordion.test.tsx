import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Accordion } from "./accordion";

const items = [
  {
    id: "shipping",
    title: "How long does shipping take?",
    content: "1 to 2 days.",
  },
  { id: "returns", title: "What is the return policy?", content: "30 days." },
  { id: "lab", title: "Are products lab tested?", content: "Yes." },
];

function expanded(element: HTMLElement): string | null {
  return element.getAttribute("aria-expanded");
}

describe("Accordion", () => {
  it("starts collapsed and expands on click", () => {
    render(<Accordion items={items} />);
    const trigger = screen.getByRole("button", {
      name: "How long does shipping take?",
    });
    const panel = document.getElementById("shipping-panel");

    expect(expanded(trigger)).toBe("false");
    expect(trigger.getAttribute("aria-controls")).toBe("shipping-panel");
    expect(panel).not.toBeNull();
    expect(panel?.hidden).toBe(true);

    fireEvent.click(trigger);

    expect(expanded(trigger)).toBe("true");
    expect(panel?.hidden).toBe(false);
    expect(
      screen.getByRole("region", { name: "How long does shipping take?" }),
    ).toBe(panel);
  });

  it("keeps only one panel open unless allowMultiple is set", () => {
    render(<Accordion items={items} />);
    const [first, second] = screen.getAllByRole("button");
    fireEvent.click(first);
    fireEvent.click(second);
    expect(expanded(first)).toBe("false");
    expect(expanded(second)).toBe("true");
  });

  it("respects defaultOpenIds and allowMultiple", () => {
    render(
      <Accordion items={items} allowMultiple defaultOpenIds={["returns"]} />,
    );
    const [first, second] = screen.getAllByRole("button");
    expect(expanded(second)).toBe("true");
    fireEvent.click(first);
    expect(expanded(first)).toBe("true");
    expect(expanded(second)).toBe("true");
  });

  it("moves focus with arrow keys, Home and End", () => {
    render(<Accordion items={items} />);
    const triggers = screen.getAllByRole("button");
    triggers[0].focus();

    fireEvent.keyDown(triggers[0], { key: "ArrowDown" });
    expect(document.activeElement).toBe(triggers[1]);

    fireEvent.keyDown(triggers[1], { key: "End" });
    expect(document.activeElement).toBe(triggers[2]);

    fireEvent.keyDown(triggers[2], { key: "ArrowDown" });
    expect(document.activeElement).toBe(triggers[0]);

    fireEvent.keyDown(triggers[0], { key: "ArrowUp" });
    expect(document.activeElement).toBe(triggers[2]);

    fireEvent.keyDown(triggers[2], { key: "Home" });
    expect(document.activeElement).toBe(triggers[0]);
  });
});
