import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DEFAULT_AUTH_REDIRECT } from "@/components/auth/auth-links";
import { SignInForm } from "@/components/auth/sign-in-form";
import { getSession } from "@/lib/auth/guards";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { AuthHeading } from "../auth-heading";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false },
};

export default async function SignInPage(props: PageProps<"/sign-in">) {
  const { next, reset } = await props.searchParams;
  const target = safeRedirectPath(next, DEFAULT_AUTH_REDIRECT);
  if (await getSession()) redirect(target);

  return (
    <>
      <AuthHeading
        title="Sign in"
        intro="Welcome back. Sign in to see your account."
      />
      <SignInForm next={target} passwordReset={reset === "1"} />
    </>
  );
}
