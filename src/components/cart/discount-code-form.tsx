"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

interface DiscountCodeFormProps {
  className?: string;
}

const EMPTY_CODE_MESSAGE = "Enter a code.";
const INFO_MESSAGE = "Discount codes arrive with checkout in a later phase.";

/**
 * Phase 1 placeholder: accepts a code but never applies one. Checkout (and
 * real discount validation) lands in a later phase.
 */
export function DiscountCodeForm({ className }: DiscountCodeFormProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (code.trim() === "") {
      setError(EMPTY_CODE_MESSAGE);
      setSubmitted(false);
      return;
    }
    setError(null);
    setSubmitted(true);
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className={cn("flex flex-col gap-3", className)}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <Input
          id="discount-code"
          label="Discount code"
          autoComplete="off"
          value={code}
          error={error ?? undefined}
          onChange={(event) => {
            setCode(event.target.value);
            if (error) setError(null);
          }}
          className="flex-1"
        />
        <Button type="submit" variant="secondary" className="sm:mt-7">
          Apply
        </Button>
      </div>
      {submitted ? (
        <p role="status" className="text-sm text-ink-muted">
          {INFO_MESSAGE}
        </p>
      ) : null}
    </form>
  );
}
