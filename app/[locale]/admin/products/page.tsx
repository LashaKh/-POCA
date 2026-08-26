import { randomUUID } from "node:crypto";

import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import {
  ProductTable,
  type CatalogTableRow,
} from "@/components/admin/catalog/product-table";
import {
  getAdminCatalogProducts,
  getCatalogCollections,
  getCatalogExports,
  getCatalogSavedViews,
} from "@/features/catalog/admin-queries";
import {
  requestCatalogExportFormAction,
  saveCatalogAdminViewFormAction,
} from "@/features/catalog/admin-actions";
import {
  getCatalogAdminLabels,
  getCatalogStatusLabel,
} from "@/features/catalog/admin-copy";
import { paginationWindow } from "@/features/catalog/pagination";
import { Link } from "@/i18n/navigation";
import { isAppLocale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  if (!isAppLocale(locale)) return null;
  setRequestLocale(locale);
  const query = await searchParams;
  const [t, publicCatalogT, catalog, rawCollections, exports, savedViews] =
    await Promise.all([
      getTranslations({ locale, namespace: "admin.catalog" }),
      getTranslations({ locale, namespace: "catalog" }),
      getAdminCatalogProducts({
        query: typeof query.query === "string" ? query.query : "",
        status: typeof query.status === "string" ? query.status : "all",
        translation:
          typeof query.translation === "string" ? query.translation : "all",
        stock: typeof query.stock === "string" ? query.stock : "all",
        sort: typeof query.sort === "string" ? query.sort : "updated-desc",
        page: typeof query.page === "string" ? query.page : "1",
      }),
      getCatalogCollections(),
      getCatalogExports(),
      getCatalogSavedViews(),
    ]);
  const labels = getCatalogAdminLabels(locale);
  if (catalog.page > catalog.pageCount) {
    const nextQuery = new URLSearchParams(
      Object.entries(catalog.filters).flatMap(([key, value]) =>
        key === "page" ? [] : [[key, String(value)]],
      ),
    );
    nextQuery.set("page", String(catalog.pageCount));
    redirect(`/${locale}/admin/products?${nextQuery}`);
  }
  const rows: CatalogTableRow[] = catalog.rows.flatMap((row) =>
    row.id && row.sku && row.status && row.updated_at
      ? [
          {
            id: row.id,
            sku: row.sku,
            displayName: row.display_name ?? row.sku,
            status: row.status,
            version: row.version ?? 1,
            gelAmountMinor: row.gel_amount_minor,
            onHand: row.on_hand_quantity ?? 0,
            reserved: row.reserved_quantity ?? 0,
            available: row.available_quantity ?? 0,
            missingLocales: row.missing_locales ?? [],
            updatedAt: row.updated_at,
          },
        ]
      : [],
  );
  const collections = rawCollections.map((collection) => ({
    id: collection.id,
    name:
      collection.collection_translations.find((item) => item.locale === locale)
        ?.name ??
      collection.collection_translations.find((item) => item.locale === "en")
        ?.name ??
      collection.code,
  }));

  return (
    <main className="admin-main admin-wide" id="main-content">
      <header className="admin-page-header split-page-header">
        <div>
          <p className="eyebrow">{t("eyebrow")}</p>
          <h1>{t("title")}</h1>
          <p>{t("intro")}</p>
        </div>
        <div className="button-row">
          <Link
            className="button button-secondary"
            href="/admin/imports/catalog"
            locale={locale}
          >
            {t("import")}
          </Link>
          <Link className="button" href="/admin/products/new" locale={locale}>
            {t("newProduct")}
          </Link>
        </div>
      </header>
      <form className="filter-bar catalog-filter-bar" method="get">
        <label>
          <span>{labels.search}</span>
          <input name="query" defaultValue={catalog.filters.query} />
        </label>
        <label>
          <span>{labels.status}</span>
          <select name="status" defaultValue={catalog.filters.status}>
            {[
              ["all", labels.all],
              ["draft", labels.draft],
              ["in_review", labels.inReview],
              ["scheduled", labels.scheduled],
              ["published", labels.published],
              ["unpublished", labels.unpublished],
              ["archived", labels.archived],
            ].map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{labels.languages}</span>
          <select name="translation" defaultValue={catalog.filters.translation}>
            <option value="all">{labels.all}</option>
            <option value="complete">{labels.complete}</option>
            <option value="missing">{labels.missing}</option>
          </select>
        </label>
        <label>
          <span>{labels.inventory}</span>
          <select name="stock" defaultValue={catalog.filters.stock}>
            <option value="all">{labels.all}</option>
            <option value="available">{labels.available}</option>
            <option value="low">{labels.lowStock}</option>
            <option value="unavailable">{labels.unavailable}</option>
          </select>
        </label>
        <label>
          <span>{labels.sort}</span>
          <select name="sort" defaultValue={catalog.filters.sort}>
            <option value="updated-desc">{labels.recentFirst}</option>
            <option value="updated-asc">{labels.oldestFirst}</option>
            <option value="sku-asc">{labels.skuFirst}</option>
            <option value="stock-asc">{labels.stockFirst}</option>
          </select>
        </label>
        <button className="button" type="submit">
          {labels.filter}
        </button>
      </form>
      <section
        className="admin-panel saved-view-panel"
        aria-labelledby="saved-view-heading"
      >
        <div>
          <h2 id="saved-view-heading">{labels.savedViews}</h2>
          <div className="button-row">
            {savedViews.map((view) => (
              <Link
                key={view.id}
                className="button button-secondary"
                href={{ pathname: "/admin/products", query: view.filters }}
                locale={locale}
              >
                {view.name}
              </Link>
            ))}
          </div>
        </div>
        <form action={saveCatalogAdminViewFormAction} className="compact-form">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="query" value={catalog.filters.query} />
          <input type="hidden" name="status" value={catalog.filters.status} />
          <input
            type="hidden"
            name="translation"
            value={catalog.filters.translation}
          />
          <input type="hidden" name="stock" value={catalog.filters.stock} />
          <input type="hidden" name="sort" value={catalog.filters.sort} />
          <input type="hidden" name="page" value="1" />
          <label>
            <span>{labels.viewName}</span>
            <input name="name" minLength={1} maxLength={100} required />
          </label>
          <button className="button button-secondary" type="submit">
            {labels.saveView}
          </button>
        </form>
      </section>
      <ProductTable
        locale={locale}
        rows={rows}
        collections={collections}
        initialBulkKey={randomUUID()}
        labels={labels}
      />
      {!rows.length ? (
        <p className="admin-panel muted-copy">{t("empty")}</p>
      ) : null}
      <nav className="pagination" aria-label={labels.pagination}>
        <ul>
          {catalog.page > 1 ? (
            <li>
              <Link
                href={{
                  pathname: "/admin/products",
                  query: { ...catalog.filters, page: catalog.page - 1 },
                }}
                locale={locale}
              >
                {publicCatalogT("previous")}
              </Link>
            </li>
          ) : null}
          {paginationWindow(catalog.page, catalog.pageCount).map(
            (item, index) =>
              item === "ellipsis" ? (
                <li aria-hidden="true" key={`ellipsis-${index}`}>
                  …
                </li>
              ) : (
                <li key={item}>
                  <Link
                    href={{
                      pathname: "/admin/products",
                      query: { ...catalog.filters, page: item },
                    }}
                    locale={locale}
                    aria-current={item === catalog.page ? "page" : undefined}
                  >
                    {item}
                  </Link>
                </li>
              ),
          )}
          {catalog.page < catalog.pageCount ? (
            <li>
              <Link
                href={{
                  pathname: "/admin/products",
                  query: { ...catalog.filters, page: catalog.page + 1 },
                }}
                locale={locale}
              >
                {publicCatalogT("next")}
              </Link>
            </li>
          ) : null}
        </ul>
      </nav>
      <section className="admin-panel" aria-labelledby="catalog-export-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{labels.dataPortability}</p>
            <h2 id="catalog-export-heading">{labels.exports}</h2>
          </div>
          <form action={requestCatalogExportFormAction}>
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="status" value={catalog.filters.status} />
            <button className="button button-secondary" type="submit">
              {labels.requestExport}
            </button>
          </form>
        </div>
        <ul className="export-list">
          {exports.map((job) => (
            <li key={job.id}>
              <span className={`status-chip status-${job.status}`}>
                {getCatalogStatusLabel(labels, job.status)}
              </span>
              <span>{job.download_name ?? labels.catalogExport}</span>
              <span>
                {job.row_count ?? 0} {labels.rows}
              </span>
              {job.status === "complete" && job.object_path ? (
                <a href={`/${locale}/admin/exports/${job.id}/download`}>
                  {labels.download}
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
