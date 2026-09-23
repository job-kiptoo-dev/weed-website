import { describe, expectTypeOf, it } from "vitest";
import type { z } from "zod";
import type { addressSchema } from "@/lib/validation/address.schema";
import type { categoryInputSchema } from "@/lib/validation/category.schema";
import type { productInputSchema } from "@/lib/validation/product.schema";
import type { addresses, categories, products } from "./schema";

type Generated = "id" | "createdAt" | "updatedAt" | "searchVector";

/*
 * Compile-time checks (run by `pnpm typecheck`): each form schema's output
 * can be inserted into its table, so a renamed or retyped column breaks the
 * build instead of a runtime insert.
 */
describe("validation schemas align with table inserts", () => {
  it("productInputSchema -> products", () => {
    expectTypeOf<z.infer<typeof productInputSchema>>().toExtend<
      Omit<typeof products.$inferInsert, Generated>
    >();
  });

  it("categoryInputSchema -> categories", () => {
    expectTypeOf<z.infer<typeof categoryInputSchema>>().toExtend<
      Omit<typeof categories.$inferInsert, Generated>
    >();
  });

  it("addressSchema -> addresses (userId comes from the session)", () => {
    expectTypeOf<z.infer<typeof addressSchema>>().toExtend<
      Omit<typeof addresses.$inferInsert, Generated | "userId">
    >();
  });
});
