import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  isEmailDeliveryLimited,
  notifyContactMessage,
  notifyNewOrder,
  type NewOrderNotification,
  type NotificationEnv,
} from "./notifications";

const ORDER: NewOrderNotification = {
  orderNumber: "BSC-100011",
  customerEmail: "ada@botanicssupply.example",
  totalCents: 6400,
  itemCount: 3,
  placedAt: new Date("2026-09-22T12:00:00.000Z"),
};

const CONTACT = {
  name: "Ada Park",
  email: "ada@botanicssupply.example",
  subject: "Wholesale question",
  message: "Do you sell tinctures in bulk for a small shop?",
};

const WITH_KEY: NotificationEnv = {
  NODE_ENV: "production",
  RESEND_API_KEY: "re_test_key",
};

function okFetch() {
  return vi.fn<typeof fetch>(
    async () => new Response(JSON.stringify({ id: "msg_1" }), { status: 200 }),
  );
}

function sentBody(fetchMock: ReturnType<typeof okFetch>) {
  return JSON.parse(String(fetchMock.mock.calls[0][1]?.body)) as {
    to: string[];
    subject: string;
    text: string;
  };
}

beforeEach(() => {
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("notifyNewOrder", () => {
  it("is not-configured without ORDER_NOTIFICATION_EMAIL and sends nothing", async () => {
    const fetchMock = okFetch();
    await expect(
      notifyNewOrder(ORDER, { env: WITH_KEY, fetch: fetchMock }),
    ).resolves.toEqual({ sent: false, reason: "not-configured" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("emails the order inbox with the order number and total", async () => {
    const fetchMock = okFetch();
    const result = await notifyNewOrder(ORDER, {
      env: { ...WITH_KEY, ORDER_NOTIFICATION_EMAIL: "owner@example.com" },
      fetch: fetchMock,
    });

    expect(result).toEqual({ sent: true, id: "msg_1" });
    const body = sentBody(fetchMock);
    expect(body.to).toEqual(["owner@example.com"]);
    expect(body.subject).toBe("New order BSC-100011, $64.00");
    expect(body.text).toContain("ada@botanicssupply.example");
    expect(body.text).toContain("3 items");
    expect(body.text).toContain("2026-09-22T12:00:00.000Z");
  });
});

describe("notifyContactMessage", () => {
  it("is not-configured when neither inbox is set", async () => {
    await expect(
      notifyContactMessage(CONTACT, { env: WITH_KEY, fetch: okFetch() }),
    ).resolves.toEqual({ sent: false, reason: "not-configured" });
  });

  it("prefers CONTACT_NOTIFICATION_EMAIL", async () => {
    const fetchMock = okFetch();
    await notifyContactMessage(CONTACT, {
      env: {
        ...WITH_KEY,
        ORDER_NOTIFICATION_EMAIL: "owner@example.com",
        CONTACT_NOTIFICATION_EMAIL: "support@example.com",
      },
      fetch: fetchMock,
    });
    const body = sentBody(fetchMock);
    expect(body.to).toEqual(["support@example.com"]);
    expect(body.subject).toBe("Contact form: Wholesale question");
    expect(body.text).toContain("Ada Park <ada@botanicssupply.example>");
    expect(body.text).toContain(CONTACT.message);
  });

  it("falls back to ORDER_NOTIFICATION_EMAIL", async () => {
    const fetchMock = okFetch();
    await notifyContactMessage(CONTACT, {
      env: { ...WITH_KEY, ORDER_NOTIFICATION_EMAIL: "owner@example.com" },
      fetch: fetchMock,
    });
    expect(sentBody(fetchMock).to).toEqual(["owner@example.com"]);
  });
});

describe("isEmailDeliveryLimited", () => {
  it("is limited without an API key", () => {
    expect(isEmailDeliveryLimited({})).toBe(true);
    expect(
      isEmailDeliveryLimited({ EMAIL_FROM: "Shop <hi@shop.example>" }),
    ).toBe(true);
  });

  it("is limited with the default resend.dev test sender", () => {
    expect(isEmailDeliveryLimited({ RESEND_API_KEY: "re_x" })).toBe(true);
    expect(
      isEmailDeliveryLimited({
        RESEND_API_KEY: "re_x",
        EMAIL_FROM: "Botanics <ONBOARDING@RESEND.DEV>",
      }),
    ).toBe(true);
    expect(
      isEmailDeliveryLimited({
        RESEND_API_KEY: "re_x",
        EMAIL_FROM: "onboarding@resend.dev",
      }),
    ).toBe(true);
  });

  it("is not limited with a key and a verified domain", () => {
    expect(
      isEmailDeliveryLimited({
        RESEND_API_KEY: "re_x",
        EMAIL_FROM: "Botanics Supply Co. <hello@botanicssupply.com>",
      }),
    ).toBe(false);
    expect(
      isEmailDeliveryLimited({
        RESEND_API_KEY: "re_x",
        EMAIL_FROM: "hello@notresend.dev",
      }),
    ).toBe(false);
  });
});
