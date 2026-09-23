import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { isEmailDeliveryLimited } from "@/lib/email/notifications";
import { getServerEnv } from "@/lib/env";
import { AuthHeading } from "../auth-heading";

export const metadata: Metadata = {
  title: "Forgot password",
  robots: { index: false },
};

export default function ForgotPasswordPage() {
  const env = getServerEnv();
  // Without an email key, development logs the reset link instead of
  // sending it (see `sendEmail`).
  const linkInServerLog = env.NODE_ENV === "development" && !env.RESEND_API_KEY;

  return (
    <>
      <AuthHeading
        title="Forgot password"
        intro="Enter the email you signed up with and we'll send you a link to set a new password."
      />
      <ForgotPasswordForm
        deliveryLimited={isEmailDeliveryLimited(env)}
        linkInServerLog={linkInServerLog}
      />
    </>
  );
}
