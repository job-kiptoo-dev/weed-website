import { randomUUID } from "node:crypto";

/** Prefixed text id, e.g. `ord_3f2a…` (32 hex characters after the prefix). */
export function newId(prefix: string): string {
  return `${prefix}_${randomUUID().replaceAll("-", "")}`;
}
