"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { signOut } from "@/lib/auth/client";

interface SignOutButtonProps {
  className?: string;
}

const SIGN_OUT_FAILED = "We couldn't sign you out. Please try again.";

export function SignOutButton({ className }: SignOutButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    try {
      const { error } = await signOut();
      if (error) {
        toast({ title: SIGN_OUT_FAILED, tone: "danger" });
        setPending(false);
        return;
      }
    } catch (cause) {
      console.error("Sign-out request failed", cause);
      toast({ title: SIGN_OUT_FAILED, tone: "danger" });
      setPending(false);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <Button
      variant="secondary"
      loading={pending}
      onClick={handleClick}
      className={className}
    >
      {pending ? "Signing out…" : "Sign out"}
    </Button>
  );
}
