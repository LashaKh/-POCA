import { getTranslations } from "next-intl/server";

import { AuditExplorer } from "@/components/admin/audit/audit-explorer";
import { getAuditEvents } from "@/features/audit/queries";
import { isAppLocale } from "@/i18n/routing";

export default async function AuditPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  if (!isAppLocale(locale)) return null;
  const [t, data] = await Promise.all([
    getTranslations({ locale, namespace: "admin.security" }),
    getAuditEvents(locale, query),
  ]);
  return (
    <main className="admin-main admin-wide" id="main-content">
      <header className="admin-page-header">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1>{t("auditTitle")}</h1>
        <p>{t("auditIntro")}</p>
      </header>
      <AuditExplorer locale={locale} data={data} />
    </main>
  );
}
