export type PaginationItem = number | "ellipsis";

/** Slots shown when pages must be elided: first, last, and five in between. */
const MAX_SLOTS = 7;
/** Pages kept at either end before the window starts to slide. */
const EDGE_RUN = 5;

/**
 * Page numbers for the pagination bar. Up to seven pages are listed in full;
 * beyond that the first and last pages stay, with an ellipsis for each gap
 * and a three-page window around the current page.
 */
export function paginationItems(
  page: number,
  totalPages: number,
): PaginationItem[] {
  if (totalPages <= 0) return [];
  if (totalPages <= MAX_SLOTS) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const current = Math.min(Math.max(1, Math.floor(page)), totalPages);
  if (current < EDGE_RUN) {
    return [...range(1, EDGE_RUN), "ellipsis", totalPages];
  }
  if (current > totalPages - EDGE_RUN + 1) {
    return [1, "ellipsis", ...range(totalPages - EDGE_RUN + 1, totalPages)];
  }
  return [
    1,
    "ellipsis",
    current - 1,
    current,
    current + 1,
    "ellipsis",
    totalPages,
  ];
}

function range(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}
