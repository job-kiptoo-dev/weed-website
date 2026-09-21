import { notFound } from "next/navigation";

/** Unmatched storefront URLs render the storefront `not-found.tsx` with full chrome. */
export default function CatchAll() {
  notFound();
}
