export type PaginationItem = number | "ellipsis";

export function paginationWindow(currentPage: number, pageCount: number) {
  if (!Number.isInteger(currentPage) || !Number.isInteger(pageCount)) {
    throw new TypeError("PAGINATION_INTEGER_REQUIRED");
  }
  if (currentPage < 1 || pageCount < 1 || currentPage > pageCount) {
    throw new RangeError("PAGINATION_RANGE_INVALID");
  }
  const visible = new Set([1, pageCount]);
  for (
    let page = Math.max(1, currentPage - 2);
    page <= Math.min(pageCount, currentPage + 2);
    page += 1
  ) {
    visible.add(page);
  }
  const pages = [...visible].sort((left, right) => left - right);
  return pages.flatMap<PaginationItem>((page, index) => {
    const previous = pages[index - 1];
    return previous !== undefined && page - previous > 1
      ? ["ellipsis", page]
      : [page];
  });
}
