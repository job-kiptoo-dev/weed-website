import "server-only";
import { getServerEnv, type ServerEnv } from "@/lib/env";

export const RESEND_ENDPOINT = "https://api.resend.com/emails";

/** Resend's shared test sender; it only delivers to the account owner. */
export const DEFAULT_EMAIL_FROM = "Botanics Supply Co. <onboarding@resend.dev>";

const REQUEST_TIMEOUT_MS = 10_000;

export type EmailKind =
  "password-reset" | "order-notification" | "contact-notification";

export interface EmailMessage {
  kind: EmailKind;
  to: string;
  subject: string;
  text: string;
  /**
   * A link carrying a secret (reset token). Logged in development so the
   * flow works without a provider; never logged anywhere else.
   */
  actionUrl?: string;
}

export type SendResult =
  | { sent: true; id: string }
  | { sent: false; reason: "not-configured" | "rejected" | "network" };

export type EmailEnv = Pick<
  ServerEnv,
  "RESEND_API_KEY" | "EMAIL_FROM" | "NODE_ENV"
>;

export interface SendEmailDeps {
  env?: EmailEnv;
  fetch?: typeof fetch;
}

function isDevelopment(env: EmailEnv): boolean {
  return env.NODE_ENV === "development";
}

/** Recipient, subject and link, for the local server log only. */
function logForDevelopment(message: EmailMessage, outcome: string): void {
  console.info({
    event: "email_dev_log",
    outcome,
    kind: message.kind,
    to: message.to,
    subject: message.subject,
    actionUrl: message.actionUrl,
  });
}

async function readErrorName(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (typeof body === "object" && body !== null && "name" in body) {
      return String(body.name);
    }
    return "unknown";
  } catch (error) {
    return error instanceof Error
      ? `unreadable body: ${error.name}`
      : "unknown";
  }
}

async function readMessageId(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (typeof body === "object" && body !== null && "id" in body) {
      return String(body.id);
    }
  } catch (error) {
    console.warn({
      event: "email_unreadable_response",
      error: error instanceof Error ? error.name : "unknown",
    });
  }
  return "unknown";
}

/**
 * Sends one email through Resend's HTTP API (no SDK). Never throws: callers
 * run it in the background (`after()`), where an exception would only be an
 * unhandled rejection. Outside development it never logs the message body
 * or `actionUrl`, which may carry a password-reset token.
 */
export async function sendEmail(
  message: EmailMessage,
  deps: SendEmailDeps = {},
): Promise<SendResult> {
  const env = deps.env ?? getServerEnv();
  const doFetch = deps.fetch ?? fetch;
  const dev = isDevelopment(env);

  if (!env.RESEND_API_KEY) {
    if (dev) {
      logForDevelopment(message, "not-configured");
    } else {
      console.warn({
        event: "email_not_configured",
        kind: message.kind,
        subject: message.subject,
      });
    }
    return { sent: false, reason: "not-configured" };
  }

  let response: Response;
  try {
    response = await doFetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM ?? DEFAULT_EMAIL_FROM,
        to: [message.to],
        subject: message.subject,
        text: message.text,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    console.error({
      event: "email_network_error",
      kind: message.kind,
      error: error instanceof Error ? error.name : "unknown",
    });
    if (dev) logForDevelopment(message, "network");
    return { sent: false, reason: "network" };
  }

  if (!response.ok) {
    console.error({
      event: "email_rejected",
      kind: message.kind,
      status: response.status,
      errorName: await readErrorName(response),
    });
    if (dev) logForDevelopment(message, "rejected");
    return { sent: false, reason: "rejected" };
  }

  const id = await readMessageId(response);
  console.info({ event: "email_sent", kind: message.kind, id });
  return { sent: true, id };
}
