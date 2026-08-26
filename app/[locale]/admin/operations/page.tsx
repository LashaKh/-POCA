import { getTranslations } from "next-intl/server";

import {
  HealthDashboard,
  type OperationsLabels,
} from "@/components/admin/operations/health-dashboard";
import { requireOwnerPage } from "@/features/auth/admin-guard";
import { getOperationsOverview } from "@/features/operations/overview";
import { isAppLocale } from "@/i18n/routing";

export default async function ProductionOperationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isAppLocale(locale)) return null;
  await requireOwnerPage(locale, `/${locale}/admin/operations`);
  const [t, data] = await Promise.all([
    getTranslations({ locale, namespace: "admin.productionOperations" }),
    getOperationsOverview(),
  ]);
  const keys: Array<keyof OperationsLabels> = [
    "status",
    "readiness",
    "blockers",
    "health",
    "queues",
    "alerts",
    "scheduler",
    "notifications",
    "release",
    "noAlerts",
    "noRuns",
    "noRelease",
    "diagnostic",
    "audit",
    "configuration",
    "environment",
    "checked",
    "occurrences",
    "scheduledFor",
    "completed",
  ];
  const labels = Object.fromEntries(
    keys.map((key) => [key, t(key)]),
  ) as OperationsLabels;
  return (
    <main className="admin-main admin-wide" id="main-content">
      <header className="admin-page-header">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1>{t("title")}</h1>
        <p>{t("intro")}</p>
      </header>
      <HealthDashboard locale={locale} data={data} labels={labels} />
    </main>
  );
}
