import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { AuthHeading } from "../auth-heading";

export const metadata: Metadata = {
  title: "Reset password",
  robots: { index: false },
};

/**
 * Better Auth's emailed link verifies the token, then redirects here with
 * `?token=` or, when the token is invalid or expired, `?error=INVALID_TOKEN`.
 */
export default async function ResetPasswordPage(
  props: PageProps<"/reset-password">,
) {
  const { token, error } = await props.searchParams;
  const validToken =
    typeof token === "string" && token.length > 0 && !error ? token : null;

  return (
    <>
      <AuthHeading
        title="Reset password"
        intro="Choose a new password for your account."
      />
      <ResetPasswordForm token={validToken} />
    </>
  );
}
