import { getTranslations, setRequestLocale } from "next-intl/server";

import {
  OperationalReportView,
  type ReportingLabels,
} from "@/components/admin/reporting/operational-report";
import { getOperationalReport } from "@/features/reporting/queries";
import { isAppLocale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ locale }, raw] = await Promise.all([params, searchParams]);
  if (!isAppLocale(locale)) return null;
  setRequestLocale(locale);
  const [t, data] = await Promise.all([
    getTranslations({ locale, namespace: "admin.reporting" }),
    getOperationalReport(raw),
  ]);
  const labelKeys: Array<keyof ReportingLabels> = [
    "filter",
    "from",
    "to",
    "currency",
    "export",
    "exportQueued",
    "exportFailed",
    "sales",
    "payments",
    "stock",
    "ingestion",
    "returns",
    "operations",
    "orders",
    "netSales",
    "discounts",
    "attempts",
    "availableUnits",
    "lowStock",
    "outOfStock",
    "batches",
    "failed",
    "requests",
    "open",
    "openAlerts",
    "dueWork",
    "timezone",
    "recentExports",
    "noExports",
  ];
  const labels = Object.fromEntries(
    labelKeys.map((key) => [key, t(key)]),
  ) as ReportingLabels;
  return (
    <main className="admin-main admin-wide" id="main-content">
      <header className="admin-page-header">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1>{t("title")}</h1>
        <p>{t("intro")}</p>
      </header>
      <OperationalReportView
        locale={locale}
        report={data.report}
        filters={data.filters}
        exports={data.exports}
        labels={labels}
      />
    </main>
  );
}
