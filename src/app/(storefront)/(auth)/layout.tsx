import type { ReactNode } from "react";
import { Container } from "@/components/layout/container";

/** Centered card for the sign-in, sign-up and password reset pages. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <Container className="py-10 md:py-16">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 rounded-card border border-line bg-surface p-6 sm:p-8">
        {children}
      </div>
    </Container>
  );
}
