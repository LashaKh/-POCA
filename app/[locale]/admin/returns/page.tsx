import { getTranslations } from "next-intl/server";

import { getAdminReturnQueue } from "@/features/returns/queries";
import { Link } from "@/i18n/navigation";
import { isAppLocale } from "@/i18n/routing";

export default async function AdminReturnsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ locale }, raw] = await Promise.all([params, searchParams]);
  if (!isAppLocale(locale)) return null;
  const [t, queue] = await Promise.all([
    getTranslations({ locale, namespace: "admin.returns" }),
    getAdminReturnQueue(raw),
  ]);
  return (
    <main className="admin-main" id="main-content">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{t("nav")}</p>
          <h1>{t("title")}</h1>
          <p>{t("intro")}</p>
        </div>
        <Link href="/admin/settings/returns" locale={locale}>
          {t("policy")}
        </Link>
      </div>
      <form className="filter-bar admin-filters">
        <label>
          <span>{t("search")}</span>
          <input name="query" defaultValue={queue.filters.query} />
        </label>
        <label>
          <span>{t("status")}</span>
          <select name="status" defaultValue={queue.filters.status}>
            {[
              "all",
              "requested",
              "needs_information",
              "approved",
              "received",
              "inspected",
              "refunded",
              "rejected",
              "closed",
              "cancelled",
            ].map((status) => (
              <option key={status} value={status}>
                {t(`statuses.${status}`)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{t("kind")}</span>
          <select name="kind" defaultValue={queue.filters.kind}>
            <option value="all">{t("kinds.all")}</option>
            <option value="return">{t("kinds.return")}</option>
            <option value="cancellation">{t("kinds.cancellation")}</option>
          </select>
        </label>
        <button className="button" type="submit">
          {t("filter")}
        </button>
      </form>
      {queue.rows.length ? (
        <div className="admin-table-scroll" tabIndex={0}>
          <table>
            <caption>{t("caption", { count: queue.count })}</caption>
            <thead>
              <tr>
                <th>{t("reference")}</th>
                <th>{t("order")}</th>
                <th>{t("kind")}</th>
                <th>{t("status")}</th>
                <th>{t("items")}</th>
                <th>{t("created")}</th>
              </tr>
            </thead>
            <tbody>
              {queue.rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <Link href={`/admin/returns/${row.id}`} locale={locale}>
                      {row.reference}
                    </Link>
                  </td>
                  <td>{row.order_reference}</td>
                  <td>{t(`kinds.${row.request_kind}`)}</td>
                  <td>{t(`statuses.${row.status}`)}</td>
                  <td>{row.item_count}</td>
                  <td>
                    {row.created_at ? (
                      <time dateTime={row.created_at}>
                        {new Date(row.created_at).toLocaleDateString(locale)}
                      </time>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="empty-state">{t("empty")}</p>
      )}
      <nav
        className="pagination"
        aria-label={t("caption", { count: queue.count })}
      >
        <ul>
          {Array.from({ length: queue.pageCount }, (_, index) => index + 1).map(
            (page) => (
              <li key={page}>
                <Link
                  href={{
                    pathname: "/admin/returns",
                    query: { ...queue.filters, page },
                  }}
                  locale={locale}
                  aria-current={page === queue.page ? "page" : undefined}
                >
                  {page}
                </Link>
              </li>
            ),
          )}
        </ul>
      </nav>
    </main>
  );
}
