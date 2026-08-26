import type { CatalogFacet } from "@/features/catalog/queries";
import {
  serializeCatalogSearchParams,
  type CatalogSearchParams,
} from "@/features/catalog/search-params";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

export type CatalogControlLabels = {
  search: string;
  sort: string;
  relevance: string;
  newest: string;
  priceAsc: string;
  priceDesc: string;
  inStock: string;
  material: string;
  color: string;
  all: string;
  apply: string;
};

export function CatalogControls({
  locale,
  slug,
  parsed,
  facets,
  labels,
}: {
  locale: AppLocale;
  slug: string;
  parsed: CatalogSearchParams;
  facets: CatalogFacet[];
  labels: CatalogControlLabels;
}) {
  return (
    <form
      className="catalog-controls"
      action={`/${locale}/collections/${slug}`}
    >
      <input type="hidden" name="collection" value={slug} />
      <label>
        {labels.search}
        <input
          name="q"
          type="search"
          defaultValue={parsed.query}
          maxLength={100}
        />
      </label>
      <label>
        {labels.sort}
        <select name="sort" defaultValue={parsed.sort}>
          <option value="relevance">{labels.relevance}</option>
          <option value="newest">{labels.newest}</option>
          <option value="price-asc">{labels.priceAsc}</option>
          <option value="price-desc">{labels.priceDesc}</option>
        </select>
      </label>
      <label>
        {labels.material}
        <select name="material" defaultValue={parsed.material[0] ?? ""}>
          <option value="">{labels.all}</option>
          {facets
            .filter((facet) => facet.key === "material")
            .map((facet) => (
              <option key={facet.value} value={facet.value}>
                {facet.value} ({facet.count})
              </option>
            ))}
        </select>
      </label>
      <label>
        {labels.color}
        <select name="color" defaultValue={parsed.color[0] ?? ""}>
          <option value="">{labels.all}</option>
          {facets
            .filter((facet) => facet.key === "color")
            .map((facet) => (
              <option key={facet.value} value={facet.value}>
                {facet.value} ({facet.count})
              </option>
            ))}
        </select>
      </label>
      <label>
        <input
          name="availability"
          type="checkbox"
          value="in-stock"
          defaultChecked={parsed.availability === "in-stock"}
        />
        {labels.inStock}
      </label>
      <button type="submit">{labels.apply}</button>
    </form>
  );
}

export function CatalogPagination({
  locale,
  pathname,
  parsed,
  totalCount,
  label,
  labels,
}: {
  locale: AppLocale;
  pathname: string;
  parsed: CatalogSearchParams;
  totalCount: number;
  label: string;
  labels: { previous: string; next: string };
}) {
  const pages = Math.ceil(totalCount / 24);
  if (pages <= 1) return null;
  const previous = serializeCatalogSearchParams({
    ...parsed,
    page: Math.max(parsed.page - 1, 1),
  });
  const next = serializeCatalogSearchParams({
    ...parsed,
    page: Math.min(parsed.page + 1, pages),
  });

  return (
    <nav className="catalog-pagination" aria-label={label}>
      {parsed.page > 1 ? (
        <Link href={`${pathname}?${previous}`} locale={locale}>
          {labels.previous}
        </Link>
      ) : (
        <span />
      )}
      <span>
        {parsed.page} / {pages}
      </span>
      {parsed.page < pages ? (
        <Link href={`${pathname}?${next}`} locale={locale}>
          {labels.next}
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
