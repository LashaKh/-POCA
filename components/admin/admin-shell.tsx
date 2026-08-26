import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { SessionMenu } from "@/components/auth/session-menu";
import type { StaffActorContext } from "@/features/auth/context";

export async function AdminShell({
  children,
  locale,
  context,
  sessions,
}: {
  children: ReactNode;
  locale: AppLocale;
  context: StaffActorContext;
  sessions: Array<{
    auth_session_id: string;
    device_label: string | null;
    assurance_level: string;
    last_seen_at: string;
    revoked_at: string | null;
  }>;
}) {
  const t = await getTranslations({ locale, namespace: "common" });

  return (
    <div className="admin-frame">
      <header className="admin-header">
        <Link className="brand" href="/" locale={locale}>
          {t("brand")}
        </Link>
        <span>{t("admin")}</span>
        <nav className="admin-navigation" aria-label={t("admin")}>
          <Link href="/admin/products" locale={locale}>
            {await getTranslations({ locale, namespace: "admin.catalog" }).then(
              (translate) => translate("nav"),
            )}
          </Link>
          <Link href="/admin/ingestion" locale={locale}>
            {await getTranslations({
              locale,
              namespace: "admin.ingestion",
            }).then((translate) => translate("nav"))}
          </Link>
          <Link href="/admin/collections" locale={locale}>
            {await getTranslations({ locale, namespace: "admin.catalog" }).then(
              (translate) => translate("collectionsNav"),
            )}
          </Link>
          <Link href="/admin/orders" locale={locale}>
            {await getTranslations({ locale, namespace: "admin.orders" }).then(
              (translate) => translate("nav"),
            )}
          </Link>
          <Link href="/admin/returns" locale={locale}>
            {await getTranslations({
              locale,
              namespace: "admin.returns",
            }).then((translate) => translate("nav"))}
          </Link>
          <Link href="/admin/reports" locale={locale}>
            {await getTranslations({
              locale,
              namespace: "admin.reporting",
            }).then((translate) => translate("nav"))}
          </Link>
          <Link href="/admin/quotes" locale={locale}>
            {await getTranslations({ locale, namespace: "quotes" }).then(
              (translate) => translate("nav"),
            )}
          </Link>
          <Link href="/admin/promotions" locale={locale}>
            {await getTranslations({
              locale,
              namespace: "admin.worldwide",
            }).then((translate) => translate("promotionsNav"))}
          </Link>
          <Link href="/admin/settings/delivery" locale={locale}>
            {await getTranslations({
              locale,
              namespace: "admin.worldwide",
            }).then((translate) => translate("deliveryNav"))}
          </Link>
          <Link href="/admin/settings/currencies" locale={locale}>
            {await getTranslations({
              locale,
              namespace: "admin.worldwide",
            }).then((translate) => translate("currenciesNav"))}
          </Link>
          <Link href="/admin/settings/markets" locale={locale}>
            {await getTranslations({
              locale,
              namespace: "admin.worldwide",
            }).then((translate) => translate("marketsNav"))}
          </Link>
          <Link href="/admin/content" locale={locale}>
            {await getTranslations({
              locale,
              namespace: "admin.content",
            }).then((translate) => translate("nav"))}
          </Link>
          {context.role === "owner" ? (
            <>
              <Link href="/admin/operations" locale={locale}>
                {await getTranslations({
                  locale,
                  namespace: "admin.productionOperations",
                }).then((translate) => translate("nav"))}
              </Link>
              <Link href="/admin/settings/integrations" locale={locale}>
                {await getTranslations({
                  locale,
                  namespace: "admin.security",
                }).then((translate) => translate("settingsNav"))}
              </Link>
              <Link href="/admin/audit" locale={locale}>
                {await getTranslations({
                  locale,
                  namespace: "admin.security",
                }).then((translate) => translate("auditNav"))}
              </Link>
            </>
          ) : null}
        </nav>
        <div className="admin-utilities">
          <Link href="/" locale={locale}>
            {t("home")}
          </Link>
          <SessionMenu locale={locale} context={context} sessions={sessions} />
        </div>
      </header>
      {children}
    </div>
  );
}
