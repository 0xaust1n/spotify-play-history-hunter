export type PaginationItem = number | "ellipsis";

export function getPaginationItems(currentPage: number, pageCount: number): PaginationItem[] {
  if (pageCount <= 10) {
    return range(1, pageCount);
  }

  if (currentPage <= 5) {
    return [...range(1, 5), "ellipsis", pageCount];
  }

  if (currentPage >= pageCount - 4) {
    return [1, "ellipsis", ...range(pageCount - 4, pageCount)];
  }

  return [
    1,
    "ellipsis",
    ...range(currentPage - 2, currentPage + 2),
    "ellipsis",
    pageCount,
  ];
}

function range(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}
