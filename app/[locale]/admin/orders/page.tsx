import { getTranslations, setRequestLocale } from "next-intl/server";

import { DataTable } from "@/components/ui/data-table";
import { getAdminOrderQueue } from "@/features/orders/admin-queries";
import { Link } from "@/i18n/navigation";
import { isAppLocale } from "@/i18n/routing";
import { formatMinorMoney } from "@/lib/money/format";
import { minorAmount } from "@/lib/money/minor";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage({
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
  const [t, queue] = await Promise.all([
    getTranslations({ locale, namespace: "admin.orders" }),
    getAdminOrderQueue({
      status: typeof query.status === "string" ? query.status : "all",
      paymentStatus:
        typeof query.paymentStatus === "string" ? query.paymentStatus : "all",
      query: typeof query.query === "string" ? query.query : "",
      page: typeof query.page === "string" ? query.page : "1",
    }),
  ]);
  return (
    <main className="admin-main admin-wide" id="main-content">
      <header className="admin-page-header">
        <p className="eyebrow">OPERATIONS</p>
        <h1>{t("title")}</h1>
        <p>{t("intro")}</p>
      </header>
      <form className="filter-bar" method="get">
        <label>
          {t("search")}
          <input name="query" defaultValue={queue.filters.query} />
        </label>
        <label>
          {t("orderStatus")}
          <select name="status" defaultValue={queue.filters.status}>
            {[
              "all",
              "bank_transfer_pending",
              "payment_pending",
              "confirmed",
              "processing",
              "shipped",
              "delivered",
              "cancelled",
              "expired",
              "partially_refunded",
              "refunded",
            ].map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("paymentStatus")}
          <select
            name="paymentStatus"
            defaultValue={queue.filters.paymentStatus}
          >
            {[
              "all",
              "pending",
              "bank_transfer_review",
              "paid",
              "failed",
              "uncertain",
              "reconciliation_required",
              "partially_refunded",
              "refunded",
            ].map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
        <button className="button" type="submit">
          {t("filter")}
        </button>
        <Link href="/admin/orders/export" locale={locale}>
          {t("export")}
        </Link>
      </form>
      <DataTable caption={t("count", { count: queue.count })}>
        <thead>
          <tr>
            <th>{t("reference")}</th>
            <th>{t("orderStatus")}</th>
            <th>{t("paymentStatus")}</th>
            <th>{t("total")}</th>
            <th>{t("contact")}</th>
            <th>{t("updated")}</th>
          </tr>
        </thead>
        <tbody>
          {queue.rows.map((row) => (
            <tr key={row.id}>
              <td>
                <Link href={`/admin/orders/${row.id}`} locale={locale}>
                  {row.reference}
                </Link>
              </td>
              <td>
                <span className={`status-chip status-${row.status}`}>
                  {row.status}
                </span>
              </td>
              <td>{row.payment_status}</td>
              <td>
                {formatMinorMoney(
                  minorAmount(row.total_minor ?? 0),
                  (row.currency ?? "GEL") as "GEL" | "USD" | "EUR",
                  locale,
                )}
              </td>
              <td>{row.masked_email}</td>
              <td>
                {row.updated_at ? (
                  <time dateTime={row.updated_at}>
                    {new Intl.DateTimeFormat(locale, {
                      dateStyle: "medium",
                    }).format(new Date(row.updated_at))}
                  </time>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </DataTable>
      {!queue.rows.length ? <p className="muted-copy">{t("empty")}</p> : null}
      <nav className="pagination" aria-label={t("pagination")}>
        <ul>
          {Array.from({ length: queue.pageCount }, (_, index) => index + 1).map(
            (page) => (
              <li key={page}>
                <Link
                  href={{
                    pathname: "/admin/orders",
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
