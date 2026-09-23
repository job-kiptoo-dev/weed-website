import { customType } from "drizzle-orm/pg-core";

/**
 * Postgres `tsvector`. Only used for generated search columns, which are
 * never selected or written by application code.
 */
export const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});
