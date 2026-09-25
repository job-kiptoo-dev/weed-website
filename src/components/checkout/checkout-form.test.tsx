import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ActionResult } from "@/lib/action-result";
import type { CartLine } from "@/types/cart";
import type { OrderQuote } from "@/types/order";
import { CheckoutForm } from "./checkout-form";

const mocks = vi.hoisted(() => ({
  quoteOrderAction: vi.fn(),
  placeOrderAction: vi.fn(),
  replace: vi.fn(),
  clear: vi.fn(),
  lines: [] as CartLine[],
}));

vi.mock("@/app/(checkout)/checkout/actions", () => ({
  quoteOrderAction: mocks.quoteOrderAction,
  placeOrderAction: mocks.placeOrderAction,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace, refresh: vi.fn() }),
}));

vi.mock("@/hooks/use-cart", () => ({
  useCart: () => ({ lines: mocks.lines, clear: mocks.clear }),
}));

const CART_LINE: CartLine = {
  productId: "prod_1",
  variantId: "var_1",
  quantity: 2,
};

const QUOTE: OrderQuote = {
  lines: [
    {
      productId: "prod_1",
      variantId: "var_1",
      productName: "Calm tincture",
      variantName: "30ml",
      sku: "SKU-1",
      imageUrl: null,
      quantity: 2,
      unitPriceCents: 4900,
      lineTotalCents: 9800,
    },
  ],
  totals: {
    subtotalCents: 9800,
    discountCents: 0,
    shippingCents: 0,
    exciseTaxCents: 0,
    salesTaxCents: 0,
    taxCents: 0,
    totalCents: 9800,
  },
  orderType: "delivery",
  discountCode: null,
  issues: [],
};

function quoteOk(quote: OrderQuote = QUOTE): ActionResult<OrderQuote> {
  return { ok: true, data: quote };
}

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

/** Everything the schema insists on, so only the field under test can fail. */
function fillRequiredFields(overrides: Record<string, string> = {}) {
  const values: Record<string, string> = {
    "First name": "Ada",
    "Last name": "Lovelace",
    "Street address": "12 Meadow Lane",
    "Town / City": "Portland",
    State: "OR",
    "ZIP Code": "97201",
    Phone: "(555) 010-4242",
    "Email address": "ada@example.com",
    ...overrides,
  };
  for (const [label, value] of Object.entries(values)) fill(label, value);
}

function placeOrderButton(): HTMLButtonElement {
  return screen.getByRole("button", { name: /Place order|Placing order/ });
}

/** The button unlocks only once the server has priced the cart. */
async function waitForQuote() {
  await waitFor(() => expect(placeOrderButton().disabled).toBe(false));
}

describe("CheckoutForm", () => {
  beforeEach(() => {
    mocks.quoteOrderAction.mockReset();
    mocks.placeOrderAction.mockReset();
    mocks.replace.mockReset();
    mocks.clear.mockReset();
    mocks.lines = [CART_LINE];
    mocks.quoteOrderAction.mockResolvedValue(quoteOk());
  });

  it("prices the cart on the server and never computes money itself", async () => {
    render(<CheckoutForm customer={null} stripePublishableKey={null} />);

    await waitFor(() =>
      expect(mocks.quoteOrderAction).toHaveBeenCalledWith({
        lines: [{ productId: "prod_1", variantId: "var_1", quantity: 2 }],
        orderType: "delivery",
        discountCode: null,
      }),
    );
    const subtotal = await screen.findByText("Subtotal");
    expect(subtotal.nextElementSibling?.textContent).toBe("$98.00");
  });

  it("reports every missing field and a summary, without calling the server", async () => {
    render(<CheckoutForm customer={null} stripePublishableKey={null} />);
    await waitForQuote();

    fireEvent.click(placeOrderButton());

    expect(screen.getByText("Please fix the highlighted fields.")).toBeTruthy();
    expect(screen.getByText("Enter your first name.")).toBeTruthy();
    expect(screen.getByText("Enter your last name.")).toBeTruthy();
    expect(screen.getByText("Enter a street address.")).toBeTruthy();
    expect(screen.getByText("Enter a town or city.")).toBeTruthy();
    expect(
      screen.getByText("Enter a phone number we can reach you on."),
    ).toBeTruthy();
    expect(screen.getByText("Enter a valid email address.")).toBeTruthy();
    expect(mocks.placeOrderAction).not.toHaveBeenCalled();
  });

  it("rejects an invalid email and clears the error when it is edited", async () => {
    render(<CheckoutForm customer={null} stripePublishableKey={null} />);
    await waitForQuote();

    fillRequiredFields({ "Email address": "ada@" });
    fireEvent.click(placeOrderButton());

    expect(screen.getByText("Enter a valid email address.")).toBeTruthy();
    expect(mocks.placeOrderAction).not.toHaveBeenCalled();

    fill("Email address", "ada@example.com");
    expect(screen.queryByText("Enter a valid email address.")).toBeNull();
  });

  it("sends the customer back to the cart once an empty cart is known", async () => {
    mocks.lines = [];
    render(<CheckoutForm customer={null} stripePublishableKey={null} />);

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/cart"));
    expect(mocks.quoteOrderAction).not.toHaveBeenCalled();
  });

  it("disables the submit button while the order is being placed", async () => {
    // Never resolves: the button must stay locked for the whole request.
    mocks.placeOrderAction.mockReturnValue(new Promise(() => {}));
    render(<CheckoutForm customer={null} stripePublishableKey={null} />);
    await waitForQuote();

    fillRequiredFields();
    fireEvent.click(placeOrderButton());

    await waitFor(() => expect(placeOrderButton().disabled).toBe(true));
    expect(mocks.placeOrderAction).toHaveBeenCalledTimes(1);
    expect(mocks.clear).not.toHaveBeenCalled();
  });

  it("clears the cart only after the order exists, then navigates", async () => {
    mocks.placeOrderAction.mockResolvedValue({
      ok: true,
      data: {
        orderNumber: "BSC-100042",
        confirmationPath: "/checkout/confirmation/BSC-100042?t=token",
      },
    });
    render(<CheckoutForm customer={null} stripePublishableKey={null} />);
    await waitForQuote();

    fillRequiredFields();
    fireEvent.click(placeOrderButton());

    await waitFor(() => expect(mocks.clear).toHaveBeenCalledTimes(1));
    expect(mocks.replace).toHaveBeenCalledWith(
      "/checkout/confirmation/BSC-100042?t=token",
    );
  });

  it("keeps the cart and shows server field errors when the order fails", async () => {
    mocks.placeOrderAction.mockResolvedValue({
      ok: false,
      error: {
        code: "VALIDATION",
        message: "We couldn't place your order.",
        fieldErrors: { "billing.phone": ["That number looks wrong."] },
      },
    });
    render(<CheckoutForm customer={null} stripePublishableKey={null} />);
    await waitForQuote();

    fillRequiredFields();
    fireEvent.click(placeOrderButton());

    expect(await screen.findByText("That number looks wrong.")).toBeTruthy();
    expect(screen.getByText("We couldn't place your order.")).toBeTruthy();
    expect(mocks.clear).not.toHaveBeenCalled();
  });

  it("shows the rate limiter's message and keeps the cart and the button", async () => {
    const message =
      "Too many attempts. Please wait a few minutes and try again.";
    mocks.placeOrderAction.mockResolvedValue({
      ok: false,
      error: { code: "CONFLICT", message },
    });
    render(<CheckoutForm customer={null} stripePublishableKey={null} />);
    await waitForQuote();

    fillRequiredFields();
    fireEvent.click(placeOrderButton());

    expect(await screen.findByText(message)).toBeTruthy();
    expect(mocks.clear).not.toHaveBeenCalled();
    expect(mocks.replace).not.toHaveBeenCalled();
    // Not stuck pending: the customer can wait and submit the same cart again.
    expect(placeOrderButton().disabled).toBe(false);
  });

  it("blocks submission while the quote reports an out-of-stock item", async () => {
    mocks.quoteOrderAction.mockResolvedValue(
      quoteOk({
        ...QUOTE,
        issues: [
          {
            kind: "out_of_stock",
            label: "Calm tincture",
            productId: "prod_1",
            variantId: "var_1",
          },
        ],
      }),
    );
    render(<CheckoutForm customer={null} stripePublishableKey={null} />);

    expect(
      await screen.findByText(
        "Calm tincture is out of stock and has been removed.",
      ),
    ).toBeTruthy();
    expect(placeOrderButton().disabled).toBe(true);
  });

  it("re-prices when the order type changes", async () => {
    render(<CheckoutForm customer={null} stripePublishableKey={null} />);
    await waitForQuote();

    fireEvent.click(screen.getByRole("radio", { name: "Curbside Pickup" }));

    await waitFor(() =>
      expect(mocks.quoteOrderAction).toHaveBeenLastCalledWith(
        expect.objectContaining({ orderType: "pickup" }),
      ),
    );
  });

  it("offers all eight methods, card included, with no Stripe configured", async () => {
    render(<CheckoutForm customer={null} stripePublishableKey={null} />);
    await waitForQuote();

    const group = screen.getByRole("group", { name: "Payment method" });
    expect(within(group).getAllByRole("radio")).toHaveLength(8);
    expect(screen.getByLabelText("Pay With Card")).toBeTruthy();
    // The default is still Zelle, the first configured method.
    expect((screen.getByLabelText("Zelle") as HTMLInputElement).checked).toBe(
      true,
    );
  });

  it("describes the card method as a manual arrangement with no Stripe", async () => {
    render(<CheckoutForm customer={null} stripePublishableKey={null} />);
    await waitForQuote();

    fireEvent.click(screen.getByLabelText("Pay With Card"));

    const instructions = document.getElementById(
      "checkout-payment-card-instructions",
    )?.textContent;
    expect(instructions).toContain("No card details are ever entered");
    expect(instructions).not.toContain("Enter your card details on this page");
  });

  it("describes the card method as paid on the page once Stripe is configured", async () => {
    render(
      <CheckoutForm customer={null} stripePublishableKey="pk_test_0000" />,
    );
    await waitForQuote();

    const group = screen.getByRole("group", { name: "Payment method" });
    expect(within(group).getAllByRole("radio")).toHaveLength(8);

    fireEvent.click(screen.getByLabelText("Pay With Card"));

    const instructions = document.getElementById(
      "checkout-payment-card-instructions",
    )?.textContent;
    expect(instructions).toContain("Enter your card details on this page");
    expect(instructions).not.toContain("No card details are ever entered");
  });

  it("submits a card order like any other method", async () => {
    mocks.placeOrderAction.mockResolvedValue({
      ok: true,
      data: {
        orderNumber: "BSC-100042",
        confirmationPath: "/checkout/confirmation/BSC-100042?t=token",
      },
    });
    render(<CheckoutForm customer={null} stripePublishableKey={null} />);
    await waitForQuote();

    fillRequiredFields();
    fireEvent.click(screen.getByLabelText("Pay With Card"));
    fireEvent.click(placeOrderButton());

    await waitFor(() =>
      expect(mocks.placeOrderAction).toHaveBeenCalledWith(
        expect.objectContaining({ paymentMethod: "card" }),
      ),
    );
  });

  it("prefills a signed-in customer's name and email", async () => {
    render(
      <CheckoutForm
        customer={{ name: "Ada Lovelace", email: "ada@example.com" }}
        stripePublishableKey={null}
      />,
    );
    await waitForQuote();

    expect(
      (screen.getByLabelText("First name") as HTMLInputElement).value,
    ).toBe("Ada");
    expect((screen.getByLabelText("Last name") as HTMLInputElement).value).toBe(
      "Lovelace",
    );
    expect(
      (screen.getByLabelText("Email address") as HTMLInputElement).value,
    ).toBe("ada@example.com");
  });

  it("reveals the second address block from the delivery toggle", async () => {
    render(<CheckoutForm customer={null} stripePublishableKey={null} />);
    await waitForQuote();

    const toggle = screen.getByLabelText("Deliver to a different address?");
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(screen.getAllByLabelText("First name")).toHaveLength(1);

    fireEvent.click(toggle);

    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getAllByLabelText("First name")).toHaveLength(2);
  });
});
