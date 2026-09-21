interface ResultRangeParams {
  page: number;
  pageSize: number;
  total: number;
  /** The search term, if any; appended as ` for "<query>"`. */
  query?: string;
}

/** Result summary for the shop toolbar, e.g. "Showing 1–20 of 30 results". */
export function resultRangeLabel({
  page,
  pageSize,
  total,
  query,
}: ResultRangeParams): string {
  let label: string;
  if (total <= 0) {
    label = "No results";
  } else if (total === 1) {
    label = "Showing the single result";
  } else {
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, total);
    label = `Showing ${start}–${end} of ${total} results`;
  }
  return query ? `${label} for "${query}"` : label;
}
