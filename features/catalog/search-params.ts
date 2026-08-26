import type { SupportedCurrency } from "@/i18n/preferences";

import { availabilityFilterSchema, catalogSortSchema } from "./schema";

type SearchInput = Record<string, string | string[] | undefined>;
type CatalogSort = "relevance" | "newest" | "price-asc" | "price-desc";
type AvailabilityFilter = "all" | "in-stock";

export type CatalogSearchParams = {
  query: string;
  page: number;
  sort: CatalogSort;
  currency: SupportedCurrency;
  collection?: string;
  material: string[];
  color: string[];
  availability: AvailabilityFilter;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function list(value: string | string[] | undefined) {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return [
    ...new Set(
      values
        .map((item) => item.trim().toLowerCase().slice(0, 60))
        .filter(Boolean),
    ),
  ]
    .sort()
    .slice(0, 20);
}

function normalizeQuery(value: string | undefined) {
  return (value ?? "")
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}-]+/gu, " ")
    .replace(/-{2,}/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}

export function parseCatalogSearchParams(
  input: SearchInput,
): CatalogSearchParams {
  const pageValue = Number(first(input.page));
  const sort = catalogSortSchema.safeParse(first(input.sort));
  const availability = availabilityFilterSchema.safeParse(
    first(input.availability),
  );
  const currencyValue = first(input.currency);
  const currency: SupportedCurrency = ["GEL", "USD", "EUR"].includes(
    currencyValue ?? "",
  )
    ? (currencyValue as SupportedCurrency)
    : "GEL";
  const collection = first(input.collection)?.trim().toLowerCase();

  return {
    query: normalizeQuery(first(input.q)),
    page:
      Number.isSafeInteger(pageValue) && pageValue > 0 && pageValue <= 10_000
        ? pageValue
        : 1,
    sort: sort.success ? sort.data : "relevance",
    currency,
    collection: collection || undefined,
    material: list(input.material),
    color: list(input.color),
    availability: availability.success ? availability.data : "all",
  };
}

export function serializeCatalogSearchParams(value: CatalogSearchParams) {
  const params = new URLSearchParams();
  if (value.query) params.set("q", value.query);
  if (value.sort !== "relevance") params.set("sort", value.sort);
  if (value.currency !== "GEL") params.set("currency", value.currency);
  if (value.collection) params.set("collection", value.collection);
  for (const material of value.material) params.append("material", material);
  for (const color of value.color) params.append("color", color);
  if (value.availability !== "all")
    params.set("availability", value.availability);
  if (value.page !== 1) params.set("page", String(value.page));
  return params.toString();
}
