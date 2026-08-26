import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { isAppLocale } from "@/i18n/routing";
import { OperationsDashboard } from "@/components/admin/operations/dashboard";
import { getOrderOperationsSummary } from "@/features/operations/reconciliation";

export default async function AdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isAppLocale(locale)) return null;
  const [t, operations] = await Promise.all([
    getTranslations({ locale, namespace: "admin" }),
    getOrderOperationsSummary(),
  ]);

  return (
    <main className="admin-main" id="main-content">
      <p className="eyebrow">ÉPOCA</p>
      <h1>{t("title")}</h1>
      <p>{t("empty")}</p>
      <OperationsDashboard locale={locale} summary={operations} />
      <div className="admin-card-grid">
        <Link className="admin-card" href="/admin/products" locale={locale}>
          <span className="eyebrow">01 · CATALOG</span>
          <strong>{t("catalog.nav")}</strong>
          <span>{t("catalog.intro")}</span>
        </Link>
        <Link className="admin-card" href="/admin/ingestion" locale={locale}>
          <span className="eyebrow">02 · MEDIA</span>
          <strong>{t("ingestion.nav")}</strong>
          <span>{t("ingestion.intro")}</span>
        </Link>
        <Link className="admin-card" href="/admin/collections" locale={locale}>
          <span className="eyebrow">03 · MERCHANDISING</span>
          <strong>{t("catalog.collectionsNav")}</strong>
          <span>{t("catalog.collectionsIntro")}</span>
        </Link>
        <Link className="admin-card" href="/admin/orders" locale={locale}>
          <span className="eyebrow">04 · OPERATIONS</span>
          <strong>{t("orders.nav")}</strong>
          <span>{t("orders.intro")}</span>
        </Link>
      </div>
    </main>
  );
}
