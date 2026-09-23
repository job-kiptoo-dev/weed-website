import type { EmailMessage } from "./send";

/** Matches `resetPasswordTokenExpiresIn` in the auth config. */
export const RESET_LINK_LIFETIME_SECONDS = 3600;

export function passwordResetEmail(input: {
  to: string;
  name: string;
  url: string;
}): EmailMessage {
  return {
    kind: "password-reset",
    to: input.to,
    subject: "Reset your Botanics Supply Co. password",
    text: [
      `Hi ${input.name},`,
      "",
      "Use this link to choose a new password. It expires in 1 hour.",
      input.url,
      "",
      "If you didn't ask for this, you can ignore this email; your password stays the same.",
    ].join("\n"),
    actionUrl: input.url,
  };
}
