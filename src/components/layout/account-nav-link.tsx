"use client";

import Link from "next/link";
import { useSession } from "@/lib/auth/client";

interface AccountNavLinkProps {
  className?: string;
  /** Called on click, for example to close the mobile menu. */
  onNavigate?: () => void;
}

/**
 * Header account link. Reads the session on the client so storefront pages
 * stay static. While the session loads it shows the neutral "Account" link:
 * the proxy sends signed-out visitors from /account to sign-in anyway.
 */
export function AccountNavLink({ className, onNavigate }: AccountNavLinkProps) {
  const { data: session, isPending } = useSession();
  const signedOut = !isPending && !session;

  return (
    <Link
      href={signedOut ? "/sign-in" : "/account"}
      onClick={onNavigate}
      className={className}
    >
      {signedOut ? "Sign in" : "Account"}
    </Link>
  );
}
