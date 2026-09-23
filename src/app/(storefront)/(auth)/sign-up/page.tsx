import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DEFAULT_AUTH_REDIRECT } from "@/components/auth/auth-links";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { getSession } from "@/lib/auth/guards";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { AuthHeading } from "../auth-heading";

export const metadata: Metadata = {
  title: "Create account",
  robots: { index: false },
};

export default async function SignUpPage(props: PageProps<"/sign-up">) {
  const { next } = await props.searchParams;
  const target = safeRedirectPath(next, DEFAULT_AUTH_REDIRECT);
  if (await getSession()) redirect(target);

  return (
    <>
      <AuthHeading
        title="Create account"
        intro="For adults 21 and over. It takes less than a minute."
      />
      <SignUpForm next={target} />
    </>
  );
}
